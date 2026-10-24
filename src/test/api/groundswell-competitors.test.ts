import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ executeTool: vi.fn(), inspectWebsite: vi.fn() }));
vi.mock('../../../api/_lib/groundswell/composio', async (original) => ({ ...(await original<object>()), executeTool: mocks.executeTool }));
vi.mock('../../../api/_lib/groundswell/discoveryWebsite', () => ({ inspectBusinessWebsite: mocks.inspectWebsite }));

import { cityOf, hostOf, persistCompetitors, pickFrom, runCompetitors } from '../../../api/_lib/groundswell/currents/competitors';

/**
 * The Competitors Current picks what was not entered: up to six local rivals from the category near the city, ordered by
 * review count for selection only. Websites are required; these are not SERP ranks.
 */

const place = (id: string, name: string, address: string, reviews: number | null, rating: number | null, website: string | null = `https://${id}.example/`, extra: Record<string, unknown> = {}) => ({
  id,
  displayName: { text: name },
  formattedAddress: address,
  rating,
  userRatingCount: reviews,
  primaryTypeDisplayName: { text: 'Brewery' },
  websiteUri: website ?? undefined,
  googleMapsUri: `https://maps.google.com/?cid=${id}`,
  businessStatus: 'OPERATIONAL',
  ...extra,
});

const self = place('self', 'Uncommon Path Brewing', '2601 N Dixie Hwy, Fort Lauderdale, FL 33334, USA', 283, 4.8, 'https://www.uncommonpathbrewing.com/');
const localRows = [
  place('dup', 'Uncommon Path Brewing Taproom', '2601 N Dixie Hwy, Fort Lauderdale, FL 33334, USA', 900, 4.9, 'https://uncommonpathbrewing.com/taproom'),
  place('gulf', 'Gulf Stream Brewing Company', '1105 NE 13th St, Fort Lauderdale, FL 33304, USA', 1200, 4.7),
  place('tarpon', 'Tarpon River Brewing', '280 SW 6th St, Fort Lauderdale, FL 33301, USA', 1500, 4.6),
  place('nosite', 'No Website Brewing', '1 Main St, Fort Lauderdale, FL 33301, USA', 5000, 5, null),
  place('closed', 'Closed Brewing', '2 Main St, Fort Lauderdale, FL 33301, USA', 9000, 4.9, 'https://closed.example/', { businessStatus: 'CLOSED_PERMANENTLY' }),
];
const nationalRows = [
  place('tarpon', 'Tarpon River Brewing', '280 SW 6th St, Fort Lauderdale, FL 33301, USA', 1500, 4.6),
  place('local2', 'Another Fort Lauderdale Brewery', '9 Las Olas Blvd, Fort Lauderdale, FL 33301, USA', 7000, 4.8),
  place('tree', 'Tree House Brewing Company', '129 Sturbridge Rd, Charlton, MA 01507, USA', 6000, 4.8),
  place('russian', 'Russian River Brewing Company', '725 4th St, Santa Rosa, CA 95404, USA', 5500, 4.7),
];

const audit = (competitors: { name: string; website: string | null; instagram: string | null }[]) => ({
  id: 'a1',
  business_name: 'Uncommon Path Brewing',
  city: 'Fort Lauderdale, FL',
  website: 'https://www.uncommonpathbrewing.com',
  instagram: 'uncommonpathbrewing',
  competitors,
  notes: null,
});
const ctx = (competitors: { name: string; website: string | null; instagram: string | null }[] = []) => ({ audit: audit(competitors), outputs: {}, deadline: Date.now() + 250_000, attempt: 1 });

beforeEach(() => {
  mocks.inspectWebsite.mockReset().mockRejectedValue(new Error('Website unavailable in this test'));
  mocks.executeTool.mockReset().mockImplementation(async (slug: string, args: Record<string, unknown>) => {
    if (slug !== 'GOOGLE_MAPS_TEXT_SEARCH') throw new Error(`${slug} unavailable in this test`);
    const q = String(args.textQuery);
    if (q === 'Uncommon Path Brewing Fort Lauderdale, FL') return { data: { places: [self] } };
    if (q === 'Brewery near Fort Lauderdale, FL') return { data: { places: localRows } };
    if (q === 'Brewery in the United States') return { data: { places: nationalRows } };
    throw new Error(`unexpected query ${q}`);
  });
});

describe('Competitors Current: helpers', () => {
  it('reads hosts and cities', () => {
    expect(hostOf('https://www.Example.com/path')).toBe('example.com');
    expect(hostOf('not a url')).toBeNull();
    expect(cityOf('2601 N Dixie Hwy, Fort Lauderdale, FL 33334, USA')).toBe('fort lauderdale');
    expect(cityOf('Charlton, MA 01507, USA')).toBe('charlton');
    expect(cityOf(null)).toBeNull();
  });

  it('picks the most-reviewed open place with a website, never the business or a closed one', () => {
    const rules = { excludeIds: new Set(['self']), excludeHosts: new Set(['uncommonpathbrewing.com']), excludeNames: new Set(['uncommon path brewing']), excludeCity: null };
    expect(pickFrom(localRows, rules, 'local', 'q')).toMatchObject({ name: 'Tarpon River Brewing', website: 'https://tarpon.example', reviews: 1500, market: 'local' });
    expect(pickFrom([], rules, 'local', 'q')).toBeNull();
  });
});

describe('Competitors Current: runCompetitors', () => {
  it('keeps local category competitors and excludes national businesses from an automatic local benchmark', async () => {
    const out = await runCompetitors(ctx());
    expect(out.business).toMatchObject({ name: 'Uncommon Path Brewing', category: 'Brewery', area: 'Fort Lauderdale, FL', place_id: 'self' });
    expect(out.local).toMatchObject({ name: 'Tarpon River Brewing', query: 'Brewery near Fort Lauderdale, FL' });
    expect(out.national).toBeNull();
    expect(out.competitors).toEqual([
      { name: 'Tarpon River Brewing', website: 'https://tarpon.example', instagram: null },
      { name: 'Gulf Stream Brewing Company', website: 'https://gulf.example', instagram: null },
    ]);
    expect(out.considered).toEqual({ local: 5, national: 0 });
    expect(out.note).toMatch(/Only 2 relevant local competitors/);
    expect(persistCompetitors(out, audit([]))).toEqual({ competitors: out.competitors });
  });

  it('keeps an entered competitor first and fills only the empty slot', async () => {
    const entered = [{ name: 'Gulf Stream Brewing Company', website: 'https://gulf.example', instagram: 'gulfstreambrewingco' }];
    const out = await runCompetitors(ctx(entered));
    expect(out.local).toMatchObject({ name: 'Tarpon River Brewing' });
    expect(out.national).toBeNull();
    expect(out.competitors).toEqual([entered[0], { name: 'Tarpon River Brewing', website: 'https://tarpon.example', instagram: null }]);
    expect(mocks.executeTool.mock.calls.filter(([slug]) => slug === 'GOOGLE_MAPS_TEXT_SEARCH')).toHaveLength(2);
  });

  it('leaves out a listing that does not share the business’s category wording, and says why', async () => {
    const servpro = place('servpro', 'SERVPRO of Arlington / Jacksonville East', '11215 St Johns Industrial Pkwy S, Jacksonville, FL 32246, USA', 2710, 5, 'https://servpro.example/', { primaryTypeDisplayName: { text: 'General Contractor' } });
    const plumber = place('and', 'AND Services', '10550 Deerwood Park Blvd, Jacksonville, FL 32256, USA', 356, 4.7, 'https://andservices.example/', { primaryTypeDisplayName: { text: 'Plumber' } });
    mocks.executeTool.mockImplementation(async (slug: string, args: Record<string, unknown>) => {
      if (slug !== 'GOOGLE_MAPS_TEXT_SEARCH') throw new Error(`${slug} unavailable in this test`);
      const q = String(args.textQuery);
      if (q === 'Uncommon Path Brewing Fort Lauderdale, FL') return { data: { places: [self] } };
      if (q === 'Brewery near Fort Lauderdale, FL') return { data: { places: [servpro, plumber, ...localRows] } };
      throw new Error(`unexpected query ${q}`);
    });
    const out = await runCompetitors(ctx());
    expect(out.competitors.map((c) => c.name)).toEqual(['Tarpon River Brewing', 'Gulf Stream Brewing Company']);
    expect(out.dropped).toEqual([
      { name: 'SERVPRO of Arlington / Jacksonville East', website: 'https://servpro.example', reason: expect.stringContaining('General Contractor') },
      { name: 'AND Services', website: 'https://andservices.example', reason: expect.stringContaining('Plumber') },
    ]);
    expect(out.picks[0]).toMatchObject({ source: 'places', reason: expect.stringContaining('brewery') });
    expect(out.profile).toMatchObject({ category: 'Brewery', source: 'listing' });
  });

  it('adds who a public Google search finds for the category, one candidate per website, and names the search as a source', async () => {
    mocks.executeTool.mockImplementation(async (slug: string, args: Record<string, unknown>) => {
      if (slug === 'SERPAPI_GOOGLE_LIGHT_SEARCH') {
        return {
          search_metadata: { google_url: 'https://www.google.com/search?q=brewery' },
          local_results: [{ position: 1, title: 'Gulf Stream Brewing Company', type: 'Brewery', website: 'https://gulf.example/', rating: 4.7, reviews: 1200 }],
          organic_results: [
            { position: 1, title: 'THE BEST 10 BREWERIES in Fort Lauderdale - Yelp', link: 'https://www.yelp.com/search?x', snippet: 'Top 10' },
            { position: 2, title: 'LauderAle Brewery | Craft brewery in Fort Lauderdale', link: 'https://lauderale.example/beers', snippet: 'A craft brewery and taproom.' },
            { position: 3, title: 'Plumbing Pros - Fort Lauderdale plumbers', link: 'https://plumbers.example/', snippet: 'Drains and leaks.' },
          ],
        };
      }
      if (slug !== 'GOOGLE_MAPS_TEXT_SEARCH') throw new Error(`${slug} unavailable in this test`);
      const q = String(args.textQuery);
      if (q === 'Uncommon Path Brewing Fort Lauderdale, FL') return { data: { places: [self] } };
      if (q === 'Brewery near Fort Lauderdale, FL') return { data: { places: localRows } };
      throw new Error(`unexpected query ${q}`);
    });
    const out = await runCompetitors(ctx());
    expect(out.competitors.map((c) => c.name)).toEqual(['Tarpon River Brewing', 'Gulf Stream Brewing Company', 'LauderAle Brewery']);
    expect(out.picks.find((p) => p.name === 'LauderAle Brewery')).toMatchObject({ source: 'google_search', website: 'https://lauderale.example', query: 'Brewery Fort Lauderdale, FL' });
    expect(out.dropped?.map((d) => d.name)).toEqual(['Plumbing Pros']);
    expect(out.sources.map((s) => s.label)).toEqual(expect.arrayContaining([expect.stringContaining('Public Google search')]));
    expect(mocks.executeTool.mock.calls.filter(([slug]) => slug === 'FIRECRAWL_SEARCH')).toHaveLength(0);
  });

  it('falls back to a web search for the category when the public Google search cannot answer', async () => {
    mocks.executeTool.mockImplementation(async (slug: string, args: Record<string, unknown>) => {
      if (slug === 'FIRECRAWL_SEARCH') return { success: true, data: { web: [{ position: 1, title: 'LauderAle Brewery | Fort Lauderdale', url: 'https://lauderale.example/', description: 'Craft brewery.' }, { position: 2, title: 'Breweries near me - Yelp', url: 'https://m.yelp.com/search', description: '' }] } };
      if (slug !== 'GOOGLE_MAPS_TEXT_SEARCH') throw new Error(`${slug} unavailable in this test`);
      const q = String(args.textQuery);
      if (q === 'Uncommon Path Brewing Fort Lauderdale, FL') return { data: { places: [self] } };
      if (q === 'Brewery near Fort Lauderdale, FL') return { data: { places: [] } };
      throw new Error(`unexpected query ${q}`);
    });
    const out = await runCompetitors(ctx());
    expect(out.competitors).toEqual([{ name: 'LauderAle Brewery', website: 'https://lauderale.example', instagram: null }]);
    expect(out.picks[0]).toMatchObject({ source: 'web_search' });
    expect(out.gaps.join(' ')).toMatch(/Google search "Brewery Fort Lauderdale, FL": SerpApi: SERPAPI_GOOGLE_LIGHT_SEARCH unavailable in this test SearchAPI: .* Serper: /);
  });

  it('preserves all entered competitors when the six suggestion slots are already filled', async () => {
    const entered = [
      { name: 'A', website: 'https://a.example', instagram: null },
      { name: 'B', website: 'https://b.example', instagram: null },
    ];
    while (entered.length < 6) entered.push({ name: `Manual ${entered.length}`, website: `https://manual${entered.length}.example`, instagram: null });
    const out = await runCompetitors(ctx(entered));
    expect(out.competitors).toBe(entered);
    expect(out.note).toMatch(/6 competitors were entered/);
    expect(mocks.executeTool).not.toHaveBeenCalled();
    expect(mocks.inspectWebsite).not.toHaveBeenCalled();
    expect(persistCompetitors(out, audit(entered))).toBeNull();
  });

  it('reports limited verified local suggestions and an unavailable category without guessing rivals', async () => {
    mocks.executeTool.mockImplementation(async (_slug: string, args: Record<string, unknown>) => {
      const q = String(args.textQuery);
      if (q.startsWith('Uncommon Path')) return { data: { places: [self] } };
      if (q.startsWith('Brewery near')) return { data: { places: [localRows[1]] } };
      return { data: { places: [] } };
    });
    const out = await runCompetitors(ctx());
    expect(out.competitors).toHaveLength(1);
    expect(out.note).toMatch(/Only 1 relevant local competitor/);

    mocks.executeTool.mockResolvedValue({ data: { places: [] } });
    const missing = await runCompetitors(ctx());
    expect(missing.competitors).toEqual([]);
    expect(missing.note).toMatch(/category could not be verified/);
  });
});
