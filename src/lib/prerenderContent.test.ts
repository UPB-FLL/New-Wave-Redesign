import { describe, expect, it, vi } from 'vitest';
import { priceListWarning, readCmsContentForBuild, readPricingUnitsForBuild } from './prerenderContent';

const rows = [
  { section: 'footer', key: 'phone', value: '(561) 564-1846' },
  { section: 'footer', key: 'email', value: 'support@newwaveitfl.com' },
  { section: 'hero', key: 'badge', value: '24/7' },
];

describe('readCmsContentForBuild', () => {
  it('answers null without credentials and never fetches', async () => {
    const fetchImpl = vi.fn();
    expect(await readCmsContentForBuild({ url: '', key: '', fetchImpl })).toBeNull();
    expect(await readCmsContentForBuild({ url: 'https://x.supabase.co', fetchImpl })).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('reads site_content with the anon key and groups rows by section', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => rows }));
    const content = await readCmsContentForBuild({ url: 'https://x.supabase.co/', key: 'anon', fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(content).toEqual({
      footer: { phone: '(561) 564-1846', email: 'support@newwaveitfl.com' },
      hero: { badge: '24/7' },
    });
    const [endpoint, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(endpoint).toBe('https://x.supabase.co/rest/v1/site_content?select=section,key,value');
    expect((init.headers as Record<string, string>).apikey).toBe('anon');
  });

  it('fails loudly when the read is refused, so a build never silently ships stale copy', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) }));
    await expect(readCmsContentForBuild({ url: 'https://x.supabase.co', key: 'bad', fetchImpl: fetchImpl as unknown as typeof fetch })).rejects.toThrow(/HTTP 401/);
  });
});

// The price list as PostgREST returns it: stored names (a stray space
// included), cost_per_unit in cents, and the columns the page does not use.
const units = [
  { id: 'u1', name: 'Employees ', description: 'Cost per employee/user account', cost_per_unit: 500, min_quantity: 1, max_quantity: 10000, sort_order: 1, active: true },
  { id: 'u2', name: 'Server', description: 'Managed Server', cost_per_unit: 17500, min_quantity: 1, max_quantity: 1000, sort_order: 2, active: true },
];

describe('readPricingUnitsForBuild', () => {
  it('answers null without credentials and never fetches', async () => {
    const fetchImpl = vi.fn();
    expect(await readPricingUnitsForBuild({ url: '', key: '', fetchImpl })).toBeNull();
    expect(await readPricingUnitsForBuild({ url: 'https://x.supabase.co', fetchImpl })).toBeNull();
    expect(await readPricingUnitsForBuild({ key: 'anon', fetchImpl })).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('reads the active units in the admin’s order with the anon key, as the browser does', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => units }));
    const read = await readPricingUnitsForBuild({ url: 'https://x.supabase.co/', key: 'anon', fetchImpl: fetchImpl as unknown as typeof fetch });
    // Rows come back as stored; seedPricingUnits tidies the names.
    expect(read).toEqual(units);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [endpoint, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(endpoint).toBe('https://x.supabase.co/rest/v1/pricing_units?select=*&active=eq.true&order=sort_order.asc');
    expect(init.headers).toEqual({ apikey: 'anon', Authorization: 'Bearer anon' });
    expect(init.method).toBeUndefined();
  });

  it('answers an empty list when no unit is active', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => [] }));
    expect(await readPricingUnitsForBuild({ url: 'https://x.supabase.co', key: 'anon', fetchImpl: fetchImpl as unknown as typeof fetch })).toEqual([]);
  });

  it('fails loudly when the read is refused, so a build never drops the prices without saying so', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) }));
    await expect(readPricingUnitsForBuild({ url: 'https://x.supabase.co', key: 'bad', fetchImpl: fetchImpl as unknown as typeof fetch })).rejects.toThrow(/pricing_units read failed with HTTP 401/);
  });

  it('fails when the answer is not a list of rows', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ message: 'no rows' }) }));
    await expect(readPricingUnitsForBuild({ url: 'https://x.supabase.co', key: 'anon', fetchImpl: fetchImpl as unknown as typeof fetch })).rejects.toThrow(/did not return a list/);
  });
});

describe('priceListWarning', () => {
  const priced = (name: string, cents: number) => ({ id: name, name, description: '', cost_per_unit: cents, min_quantity: 1, max_quantity: 1000 });
  // The live price list of 2026-11-12, stray space included.
  const priceList = [
    priced('Employees ', 500),
    priced('Server', 17500),
    priced('Computers', 10500),
    priced('Location Network Monitoring', 5000),
    priced('Office 365 - Licensing Only', 3200),
    priced('Office 365 - Licensing and Email', 3800),
  ];

  it('says nothing while the price list is the published rates', () => {
    expect(priceListWarning(priceList)).toBeNull();
  });

  it('says /pricing has no table when the list was not read or has no rows', () => {
    expect(priceListWarning(null)).toBe('prerender: no Supabase credentials; /pricing carries no price table.');
    expect(priceListWarning([])).toBe('prerender: pricing_units has no active rows; /pricing carries no price table.');
  });

  it('names each difference when a price changed in the admin', () => {
    const changed = [...priceList.map((unit) => (unit.name === 'Computers' ? priced('Computers', 11000) : unit)), priced('Backup storage', 2000)];
    expect(priceListWarning(changed)).toBe(
      [
        'prerender: src/lib/publishedRates.ts differs from the price list (pricing_units), so /pricing shows its table without the prose sentence:',
        '  - "Computers" is $105 in publishedRates.ts and $110 on the price list.',
        '  - "Backup storage" ($20) is on the price list and not in publishedRates.ts.',
      ].join('\n'),
    );
  });
});
