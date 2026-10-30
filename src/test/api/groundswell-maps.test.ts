import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ executeTool: vi.fn(), isComposioConfigured: vi.fn(), withBrowser: vi.fn() }));
vi.mock('../../../api/_lib/groundswell/composio', async (original) => ({
  ...(await original<object>()),
  executeTool: mocks.executeTool,
  isSharedLookupConfigured: mocks.isComposioConfigured,
}));
vi.mock('../../../api/_lib/groundswell/browser', () => ({ withBrowser: mocks.withBrowser }));

import { matchBusiness, placeRows, placesLookup, PLACES_FALLBACK_NOTE, runMaps, toMapsListing, toMapsPlace } from '../../../api/_lib/groundswell/currents/maps';
import { PermanentStepError } from '../../../api/_lib/groundswell/types';
import { parseSite } from '../../../api/_lib/groundswell/currents/site';

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
afterEach(() => vi.useRealTimers());

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
      county: null,
    });
    // No display category: the first type, in words. Missing fields stay null, never 0.
    expect(toMapsPlace({ displayName: 'Bare', types: ['car_repair'] })).toMatchObject({ category: 'car repair', rating: null, reviews: null, hours: [], address: null, county: null });
    expect(toMapsListing(rival('x', 'Bayside Garage', 4.2, 51))).toEqual({ name: 'Bayside Garage', rating: 4.2, reviews: 51, info: 'Auto repair shop · Bayside Garage Rd, Fort Lauderdale, FL', url: 'https://maps.google.com/?cid=x' });
  });

  it('reads the county from the address components, for county-wide keyword demand', () => {
    const components = [
      { longText: '12', shortText: '12', types: ['street_number'] },
      { longText: 'Pembroke Pines', shortText: 'Pembroke Pines', types: ['locality', 'political'] },
      { longText: 'Broward County', shortText: 'Broward County', types: ['administrative_area_level_2', 'political'] },
      { longText: 'Florida', shortText: 'FL', types: ['administrative_area_level_1', 'political'] },
    ];
    expect(toMapsPlace({ ...harbor, addressComponents: components }).county).toBe('Broward County');
    expect(toMapsPlace({ ...harbor, addressComponents: components.filter((c) => !c.types.includes('administrative_area_level_2')) }).county).toBeNull();
    expect(toMapsPlace({ ...harbor, addressComponents: 'not a list' }).county).toBeNull();
  });

  it('picks the result that carries the business’s first word, or none', () => {
    expect(matchBusiness([rival('x', 'Bayside Garage', 4, 1), harbor], 'Harbor Auto Care')).toBe(harbor);
    expect(matchBusiness([rival('x', 'Bayside Garage', 4, 1)], 'Harbor Auto Care')).toBeNull();
  });
});

describe('Maps Current: runMaps', () => {
  it.each(['Places', 'SerpApi'])('retains a matched %s listing when the secondary nearby request fails', async (provider) => {
    const listing = { ...harbor, primaryTypeDisplayName: undefined, types: [] };
    mocks.executeTool.mockImplementation(async (slug: string, args: Record<string, unknown>) => {
      if (provider === 'SerpApi' && slug === 'GOOGLE_MAPS_TEXT_SEARCH') throw new Error('Places unavailable');
      if (String(args.textQuery ?? args.q).includes('near')) throw new Error('Nearby query unavailable');
      return slug === 'GOOGLE_MAPS_TEXT_SEARCH' ? { places: [listing] } : { local_results: [listing] };
    });
    const out = await runMaps({ ...ctx, outputs: { competitors: { business: { category: 'Health coach' } } } });
    expect(out.business).toMatchObject({ name: audit.business_name, rating: 4.7, reviews: 183, category: null });
    expect(out.nearby).toEqual([]);
    expect(out.note).toMatch(/nearby.*unavailable/i);
    expect(out.detail).toContain('Nearby query unavailable');
    expect(mocks.withBrowser).not.toHaveBeenCalled();
    // The nearby query is asked of every public provider in turn (SerpApi, SearchAPI, Serper) before the step gives up on it.
    expect(mocks.executeTool).toHaveBeenCalledTimes(provider === 'Places' ? 2 : 5);
  });

  it('retains the matched browser listing when its nearby page is unavailable', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    mocks.isComposioConfigured.mockReturnValue(false);
    const page = {
      setViewport: vi.fn(), setExtraHTTPHeaders: vi.fn(), goto: vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Nearby page unavailable')),
      url: () => 'https://www.google.com/maps/search/business', title: async () => 'Google Maps', $: async () => ({}),
      evaluate: vi.fn().mockResolvedValueOnce({ name: audit.business_name, category: null, rating: '4.7', reviews: '183', address: null, phone: null, website: audit.website, hours: [], url: 'https://maps.google.com/?cid=1' }),
    };
    mocks.withBrowser.mockImplementation(async (run) => run({ newPage: async () => page }));
    const pending = runMaps({ ...ctx, outputs: { competitors: { business: { category: 'Health coach' } } } });
    await vi.runAllTimersAsync();
    const out = await pending;
    expect(out.business).toMatchObject({ name: audit.business_name, rating: 4.7, reviews: 183, category: null });
    expect(out.nearby).toEqual([]);
    expect(out.note).toMatch(/nearby.*unavailable/i);
    expect(out.detail).toContain('Nearby page unavailable');
  });

  it.each([
    ['Places', 'website'], ['Places', 'competitors'], ['SerpApi', 'website'], ['SerpApi', 'competitors'],
  ] as const)('uses the verified %s nearby category from %s while retaining a Services listing label', async (provider, categorySource) => {
    const manual = [{ name: 'Reviewed coach', website: 'https://reviewed.example', instagram: null }];
    const wellness = { ...audit, business_name: 'Wildly Primal', city: 'Jacksonville, FL', website: 'https://wildlyprimal.example', competitors: manual };
    const listing = { ...harbor, displayName: { text: 'Wildly Primal' }, websiteUri: wellness.website, primaryTypeDisplayName: { text: 'Services' } };
    const coach = rival('coach', 'Nearby Health Coach', 4.8, 30);
    mocks.executeTool.mockImplementation(async (slug: string, args: Record<string, unknown>) => {
      if (provider === 'SerpApi' && slug === 'GOOGLE_MAPS_TEXT_SEARCH') throw new Error('Places unavailable');
      const query = String(args.textQuery ?? args.q);
      const rows = query.startsWith('Wildly Primal') ? [listing] : [coach];
      return slug === 'GOOGLE_MAPS_TEXT_SEARCH' ? { places: rows } : { local_results: rows };
    });
    const outputs = categorySource === 'website'
      ? { site: { business: parseSite('<title>Functional Health Coaching</title>', wellness.website, wellness.website, 200) }, competitors: { business: { category: 'Services' } } }
      : { competitors: { business: { category: 'Health coach' } } };
    const out = await runMaps({ ...ctx, audit: wellness, outputs });
    expect(out.business?.category).toBe('Services');
    expect(out.nearby[0].name).toBe('Nearby Health Coach');
    const queries = mocks.executeTool.mock.calls.map(([, args]) => String(args.textQuery ?? args.q));
    expect(queries).toContain('Health coach near Jacksonville, FL');
    expect(queries.some(query => /^Services near/i.test(query))).toBe(false);
    expect(wellness.competitors).toBe(manual);
  });

  it('keeps a generic Services listing without querying irrelevant nearby businesses when no category is verified', async () => {
    mocks.executeTool.mockResolvedValue({ places: [{ ...harbor, primaryTypeDisplayName: { text: 'Services' } }] });
    const out = await runMaps(ctx);
    expect(out.business?.category).toBe('Services');
    expect(out.nearby).toEqual([]);
    expect(mocks.executeTool).toHaveBeenCalledTimes(1);
    expect(out.note).toMatch(/specific.*category.*verified/i);
  });

  it.each([true, false])('uses a verified category in the browser path and skips generic nearby searches (verified: %s)', async (verified) => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    mocks.isComposioConfigured.mockReturnValue(false);
    const page = {
      setViewport: vi.fn(), setExtraHTTPHeaders: vi.fn(), goto: vi.fn(),
      url: () => 'https://www.google.com/maps/search/business', title: async () => 'Google Maps', $: async () => ({}),
      evaluate: vi.fn().mockResolvedValueOnce({ name: audit.business_name, category: 'Services', rating: '4.7', reviews: '183', address: null, phone: null, website: audit.website, hours: [], url: 'https://maps.google.com/?cid=1' })
        .mockResolvedValueOnce([{ name: 'Nearby Health Coach', rating: '4.8', reviews: '30', info: 'Health coach', url: 'https://maps.google.com/?cid=2' }]),
    };
    mocks.withBrowser.mockImplementation(async (run) => run({ newPage: async () => page }));
    const pending = runMaps({ ...ctx, outputs: verified ? { competitors: { business: { category: 'Health coach' } } } : {} });
    await vi.runAllTimersAsync();
    const out = await pending;
    const urls = page.goto.mock.calls.map(([url]) => decodeURIComponent(String(url)));
    expect(out.business?.category).toBe('Services');
    expect(urls.some(url => url.includes('Services near'))).toBe(false);
    expect(urls.some(url => url.includes('Health coach near Fort Lauderdale, FL'))).toBe(verified);
    expect(out.nearby).toHaveLength(verified ? 1 : 0);
  });

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
    expect(out).toMatchObject(fromBrowser);
    // The reason stays with the step for staff; the reports carry only the plain note (reports.test.ts checks no tool name reaches them).
    expect(out.detail).toMatch(/429/);
    expect(PLACES_FALLBACK_NOTE).not.toMatch(/Composio|GOOGLE_MAPS|failed/);
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

describe('Maps Current: who sits in the nearby table', () => {
  it('keeps only listings that share the category wording, so a general contractor never sits beside a health coach', async () => {
    const { relevantNearby } = await import('../../../api/_lib/groundswell/currents/maps');
    const out = {
      fetched_at: '2026-10-23T22:12:09.971Z',
      source: 'Google Places API text search (relevance order, not the Maps pack), via Composio',
      business: { name: 'Wildly Primal', rating: null, reviews: null, category: 'Services', address: '409 18th St N, Jacksonville Beach, FL 32250, USA', phone: null, website: 'https://wildlyprimal.com/', hours: [], url: null },
      nearby: [
        { name: 'Service Experts Jacksonville', rating: 4.9, reviews: 3814, info: 'General Contractor · 8475 Western Way Ste 100, Jacksonville, FL 32256, USA', url: null },
        { name: 'AND Services', rating: 4.7, reviews: 356, info: 'Plumber · 10550 Deerwood Park Blvd Ste 708, Jacksonville, FL 32256, USA', url: null },
        { name: 'SERVPRO of Arlington / Jacksonville East', rating: 5, reviews: 271, info: 'General Contractor · 11215 St Johns Industrial Pkwy S #3, Jacksonville, FL 32246, USA', url: null },
        { name: 'Wellspring Health and Sports Performance', rating: 5, reviews: 624, info: 'Health coach · 710 3rd St N, Jacksonville Beach, FL 32250, USA', url: null },
      ],
      note: null,
    };
    expect(relevantNearby(out, 'Health coach', ['Wildly Primal', 'Jacksonville FL']).nearby.map((l) => l.name)).toEqual(['Wellspring Health and Sports Performance']);
    // With no specific category (the listing says "Services"), nothing can be checked and the table stays as read.
    expect(relevantNearby(out, null).nearby).toHaveLength(4);
  });
});
