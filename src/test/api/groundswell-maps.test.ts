import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ executeTool: vi.fn(), isComposioConfigured: vi.fn(), withBrowser: vi.fn() }));
vi.mock('../../../api/_lib/groundswell/composio', async (original) => ({
  ...(await original<object>()),
  executeTool: mocks.executeTool,
  isComposioConfigured: mocks.isComposioConfigured,
}));
vi.mock('../../../api/_lib/groundswell/browser', () => ({ withBrowser: mocks.withBrowser }));

import { matchBusiness, placeRows, placesLookup, runMaps, toMapsListing, toMapsPlace } from '../../../api/_lib/groundswell/currents/maps';
import { PermanentStepError } from '../../../api/_lib/groundswell/types';

/**
 * The Maps Current reads Google Places through Composio first and falls back
 * to the logged-out Maps view in the browser. The Places rows here follow the
 * Places API (New) text-search shape, as Composio returns it under `data`.
 */

const harbor = {
  id: 'ChIJharbor',
  displayName: { text: 'Harbor Auto Care', languageCode: 'en' },
  formattedAddress: '12 Dock St, Fort Lauderdale, FL 33301, USA',
  rating: 4.7,
  userRatingCount: 183,
  primaryTypeDisplayName: { text: 'Auto repair shop', languageCode: 'en' },
  types: ['car_repair', 'point_of_interest'],
  websiteUri: 'https://harbor-auto.example/',
  nationalPhoneNumber: '(954) 555-0100',
  regularOpeningHours: { openNow: true, weekdayDescriptions: ['Monday: 8:00 AM – 6:00 PM', 'Tuesday: 8:00 AM – 6:00 PM'] },
  googleMapsUri: 'https://maps.google.com/?cid=1',
  businessStatus: 'OPERATIONAL',
};
const rival = (id: string, name: string, rating: number, count: number) => ({
  id,
  displayName: { text: name },
  formattedAddress: `${name} Rd, Fort Lauderdale, FL`,
  rating,
  userRatingCount: count,
  primaryTypeDisplayName: { text: 'Auto repair shop' },
  googleMapsUri: `https://maps.google.com/?cid=${id}`,
});

const audit = { id: 'a1', business_name: 'Harbor Auto Care', city: 'Fort Lauderdale, FL', website: 'https://harbor-auto.example', instagram: null, competitors: [], notes: null };
const ctx = { audit, outputs: {}, deadline: Date.now() + 250_000, attempt: 1 };

beforeEach(() => {
  mocks.executeTool.mockReset();
  mocks.isComposioConfigured.mockReset().mockReturnValue(true);
  mocks.withBrowser.mockReset().mockRejectedValue(new Error('no browser in tests'));
});

describe('Maps Current: Places rows', () => {
  it('finds the places wherever Composio nests them', () => {
    expect(placeRows({ data: { places: [harbor] } })).toHaveLength(1);
    expect(placeRows({ places: [] })).toEqual([]);
    expect(placeRows({ data: {} })).toEqual([]);
  });

  it('maps a place into the browser read’s shape', () => {
    expect(toMapsPlace(harbor)).toEqual({
      name: 'Harbor Auto Care',
      rating: 4.7,
      reviews: 183,
      category: 'Auto repair shop',
      address: '12 Dock St, Fort Lauderdale, FL 33301, USA',
      phone: '(954) 555-0100',
      website: 'https://harbor-auto.example/',
      hours: ['Monday: 8:00 AM – 6:00 PM', 'Tuesday: 8:00 AM – 6:00 PM'],
      url: 'https://maps.google.com/?cid=1',
    });
    // No display category: the first type, in words. Missing fields stay null, never 0.
    expect(toMapsPlace({ displayName: 'Bare', types: ['car_repair'] })).toMatchObject({ category: 'car repair', rating: null, reviews: null, hours: [], address: null });
    expect(toMapsListing(rival('x', 'Bayside Garage', 4.2, 51))).toEqual({ name: 'Bayside Garage', rating: 4.2, reviews: 51, info: 'Auto repair shop · Bayside Garage Rd, Fort Lauderdale, FL', url: 'https://maps.google.com/?cid=x' });
  });

  it('picks the result that carries the business’s first word, or none', () => {
    expect(matchBusiness([rival('x', 'Bayside Garage', 4, 1), harbor], 'Harbor Auto Care')).toBe(harbor);
    expect(matchBusiness([rival('x', 'Bayside Garage', 4, 1)], 'Harbor Auto Care')).toBeNull();
  });
});

describe('Maps Current: runMaps', () => {
  it('reads the business and its rivals from Places, leaving the business out of the rivals', async () => {
    mocks.executeTool.mockImplementation(async (slug: string, args: Record<string, unknown>) => {
      expect(slug).toBe('GOOGLE_MAPS_TEXT_SEARCH');
      expect(String(args.fieldMask)).toContain('places.userRatingCount');
      if (args.textQuery === 'Harbor Auto Care Fort Lauderdale, FL') return { data: { places: [rival('b', 'Bayside Garage', 4.2, 51), harbor] } };
      expect(args.textQuery).toBe('Auto repair shop near Fort Lauderdale, FL');
      return { data: { places: [rival('b', 'Bayside Garage', 4.2, 51), harbor, rival('c', 'Coastline Motors', 4.9, 12)] } };
    });
    const out = await runMaps(ctx);
    expect(out.source).toMatch(/Google Places/);
    expect(out.business).toMatchObject({ name: 'Harbor Auto Care', rating: 4.7, reviews: 183, category: 'Auto repair shop' });
    expect(out.nearby.map((l) => l.name)).toEqual(['Bayside Garage', 'Coastline Motors']);
    expect(out.note).toBeNull();
    expect(mocks.withBrowser).not.toHaveBeenCalled();
  });

  it('says so when Places has no match, and asks for no rivals', async () => {
    mocks.executeTool.mockResolvedValue({ data: { places: [rival('b', 'Bayside Garage', 4.2, 51)] } });
    const out = await placesLookup(audit);
    expect(out.business).toBeNull();
    expect(out.nearby).toEqual([]);
    expect(out.note).toMatch(/not found/);
    expect(mocks.executeTool).toHaveBeenCalledTimes(1);
  });

  it('falls back to the logged-out Maps view when Places fails for any reason but the key', async () => {
    mocks.executeTool.mockRejectedValue(new Error('GOOGLE_MAPS_TEXT_SEARCH failed (429): Quota exceeded'));
    const fromBrowser = { fetched_at: 'x', source: 'Google Maps (logged-out view)', business: null, nearby: [], note: null };
    mocks.withBrowser.mockResolvedValue(fromBrowser);
    const out = await runMaps(ctx);
    expect(out).toBe(fromBrowser);
    expect(mocks.withBrowser).toHaveBeenCalledTimes(1);
  });

  it('does not hide a refused Composio key behind the browser', async () => {
    mocks.executeTool.mockRejectedValue(new PermanentStepError('Composio refused the API key (401).'));
    await expect(runMaps(ctx)).rejects.toThrow(/API key/);
    expect(mocks.withBrowser).not.toHaveBeenCalled();
  });

  it('goes straight to the browser when Composio is not set up', async () => {
    mocks.isComposioConfigured.mockReturnValue(false);
    mocks.withBrowser.mockResolvedValue({ fetched_at: 'x', source: 'Google Maps (logged-out view)', business: null, nearby: [], note: null });
    await runMaps(ctx);
    expect(mocks.executeTool).not.toHaveBeenCalled();
    expect(mocks.withBrowser).toHaveBeenCalledTimes(1);
  });
});
