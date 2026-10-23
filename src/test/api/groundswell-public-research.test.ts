import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ executeTool: vi.fn(), withBrowser: vi.fn(), inspectWebsite: vi.fn(), geography: vi.fn() }));
vi.mock('../../../api/_lib/groundswell/composio', async (original) => ({ ...(await original<object>()), executeTool: mocks.executeTool, isSharedLookupConfigured: () => true }));
vi.mock('../../../api/_lib/groundswell/browser', () => ({ withBrowser: mocks.withBrowser }));
vi.mock('../../../api/_lib/groundswell/discoveryWebsite', () => ({ inspectBusinessWebsite: mocks.inspectWebsite }));
vi.mock('../../../api/_lib/groundswell/keywordsGeography', () => ({ resolveKeywordGeography: mocks.geography }));

import { categoryFromSite, parseGoogleSerp, readGoogleSerp, specificCategory } from '../../../api/_lib/groundswell/currents/serp';
import { runKeywords, runSearch } from '../../../api/_lib/groundswell/currents/search';
import { findCompetitors, runCompetitors } from '../../../api/_lib/groundswell/currents/competitors';
import { matchBusiness, runMaps } from '../../../api/_lib/groundswell/currents/maps';
import { googleAdsFromList, runAdsLibrary } from '../../../api/_lib/groundswell/currents/adsLibrary';
import { runAds } from '../../../api/_lib/groundswell/currents/ads';
import { runSocial } from '../../../api/_lib/groundswell/currents/social';
import { parseSite } from '../../../api/_lib/groundswell/currents/site';

const seed = { business_name: 'Wildly Primal', city: 'Fort Lauderdale, FL', website: 'https://wildlyprimal.example', instagram: 'wildlyprimal', facebook: 'https://www.facebook.com/wildlyprimal' };
const context = (outputs: Record<string, unknown> = {}) => ({ audit: { id: 'a1', ...seed, competitors: [], notes: null }, outputs, deadline: Date.now() + 20_000, attempt: 1 });
const own = { id: 'self', displayName: { text: 'Wildly Primal' }, primaryTypeDisplayName: { text: 'Health food store' }, websiteUri: seed.website, formattedAddress: '1 Main St, Fort Lauderdale, FL 33301, USA' };
const serp = { search_metadata: { status: 'Success', google_url: 'https://www.google.com/search?q=health+food+Fort+Lauderdale' }, organic_results: [{ position: 3, title: 'Wildly Primal', link: seed.website, snippet: 'Grass fed food.' }], related_searches: [{ query: 'grass fed food near me' }] };

beforeEach(() => {
  mocks.executeTool.mockReset().mockRejectedValue(new Error('provider unavailable'));
  mocks.withBrowser.mockReset().mockRejectedValue(new Error('no browser'));
  mocks.inspectWebsite.mockReset().mockRejectedValue(new Error('Website unavailable in this test'));
  mocks.geography.mockReset().mockResolvedValue({ constants: ['geoTargetConstants/12345'], label: 'Jacksonville, Florida, United States', error: null });
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('public Google research fallback', () => {
  it('starts no geography, Planner or fallback reads after the worker deadline expires', async () => {
    const ctx = context();
    ctx.deadline = Date.now() - 1;
    const out = await runKeywords(ctx);
    expect(mocks.geography).not.toHaveBeenCalled();
    expect(mocks.executeTool).not.toHaveBeenCalled();
    expect(out.demand_status).toBe('unavailable');
  });

  it('does not start Planner or related-query reads after geography uses the remaining deadline', async () => {
    let now = 1000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const ctx = context();
    ctx.deadline = 6000;
    mocks.geography.mockImplementation(async () => { now = 7000; return { constants: ['geoTargetConstants/12345'], label: 'Jacksonville, Florida, United States', error: null }; });
    const out = await runKeywords(ctx);
    expect(mocks.executeTool).not.toHaveBeenCalled();
    expect(out.demand_status).toBe('unavailable');
  });
  it('uses the matched business listing name for branded searches when intake omitted its word spacing', async () => {
    const ctx = context({ maps: { business: { name: 'Wildly Primal', category: 'Health coach' } } });
    ctx.audit.business_name = 'WildlyPrimal';
    mocks.executeTool.mockResolvedValue({ organic_results: [] });
    const out = await runSearch(ctx);
    expect(out.serp.queries[0].query).toBe('Wildly Primal Fort Lauderdale, FL');
  });
  it('uses the verified city target for Planner rather than the old default geography', async () => {
    vi.stubEnv('GROUNDSWELL_GEO_TARGETS', 'geoTargetConstants/200528');
    const ctx = context({ maps: { business: { category: 'Health coach' } } });
    ctx.audit.city = 'Jacksonville FL';
    mocks.executeTool.mockResolvedValue({ results: [{ text: 'health coach', keyword_idea_metrics: { avg_monthly_searches: 100 } }] });
    const out = await runKeywords(ctx);
    expect(mocks.geography).toHaveBeenCalledWith('Jacksonville FL', expect.any(Number));
    expect(mocks.executeTool).toHaveBeenCalledWith('GOOGLEADS_GENERATE_KEYWORD_IDEAS', expect.objectContaining({ geo_target_constants: ['geoTargetConstants/12345'] }), expect.any(Number));
    expect(out).toMatchObject({ demand_status: 'measured', source: expect.stringContaining('Jacksonville, Florida'), geography: { constants: ['geoTargetConstants/12345'] } });
  });

  it('uses explicitly configured targets only when no business city was supplied', async () => {
    vi.stubEnv('GROUNDSWELL_GEO_TARGETS', 'geoTargetConstants/2840');
    const ctx = context();
    ctx.audit.city = null as never;
    mocks.executeTool.mockResolvedValue({ results: [{ text: 'health coach', keyword_idea_metrics: { avg_monthly_searches: 100 } }] });
    const out = await runKeywords(ctx);
    expect(mocks.geography).not.toHaveBeenCalled();
    expect(mocks.executeTool).toHaveBeenCalledWith('GOOGLEADS_GENERATE_KEYWORD_IDEAS', expect.objectContaining({ geo_target_constants: ['geoTargetConstants/2840'] }), expect.any(Number));
    expect(out).toMatchObject({ demand_status: 'measured', source: expect.stringContaining('Configured targets') });
  });

  it('keeps demand unavailable and never calls Planner when the business geography cannot be verified', async () => {
    mocks.geography.mockResolvedValue({ constants: [], label: '', error: 'The city matches multiple states.' });
    mocks.executeTool.mockResolvedValue(serp);
    const out = await runKeywords(context({ maps: { business: { category: 'Health coach' } } }));
    expect(out).toMatchObject({ demand_status: 'unavailable', error: expect.stringContaining('multiple states') });
    expect(mocks.executeTool.mock.calls.some(([slug]) => slug === 'GOOGLEADS_GENERATE_KEYWORD_IDEAS')).toBe(false);
    expect(out.ideas.every(idea => idea.monthly_searches === null)).toBe(true);
  });
  it.each(['Services', 'establishment', 'point_of_interest', 'LocalBusiness', 'Professional Service', 'Organization'])('rejects the generic category %s without rejecting specific service categories', (category) => {
    expect(specificCategory(category)).toBeNull();
    expect(specificCategory('Health coach')).toBe('Health coach');
    expect(specificCategory('Auto repair service')).toBe('Auto repair service');
  });

  it('does not derive a category from an unavailable page or a business name alone', () => {
    const site = parseSite('<title>Wildly Primal</title>', seed.website, seed.website, 200);
    expect(categoryFromSite(site)).toBeNull();
    expect(categoryFromSite({ ...site, title: 'Functional health coaching', error: 'Unavailable' })).toBeNull();
  });

  it('keeps observed positions and query scope without creating metrics from result order', async () => {
    mocks.executeTool.mockResolvedValue({ data: serp });
    const out = await readGoogleSerp('health food Fort Lauderdale', seed.city);
    expect(out).toMatchObject({ query: 'health food Fort Lauderdale', location: seed.city, organic: [{ position: 3, domain: 'wildlyprimal.example' }], related_searches: ['grass fed food near me'], error: null });
    expect(out.captured_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(mocks.executeTool).toHaveBeenCalledWith('SERPAPI_GOOGLE_LIGHT_SEARCH', expect.objectContaining({ q: 'health food Fort Lauderdale', gl: 'us', hl: 'en', location: seed.city }), expect.any(Number));
    expect(parseGoogleSerp({ organic_results: [{ title: 'Unknown rank', link: 'https://rival.example' }] }, 'q', null).organic[0].position).toBeNull();
  });

  it('surfaces provider error payloads instead of treating them as empty successful results', () => {
    expect(parseGoogleSerp({ error: 'quota exceeded' }, 'q', null).error).toMatch(/quota exceeded/);
    expect(parseGoogleSerp({ unexpected: true }, 'q', null).error).toMatch(/recognizable|recognized/i);
  });

  it('retains observed Google rankings when Ahrefs is unavailable, with Ahrefs metrics still unknown', async () => {
    mocks.executeTool.mockImplementation(async (slug: string) => { if (slug === 'SERPAPI_GOOGLE_LIGHT_SEARCH') return serp; throw new Error('No active connection for ahrefs'); });
    const out = await runSearch(context({ maps: { business: { category: 'Health food store' } } }));
    expect(out.business).toMatchObject({ organic_traffic: null, organic_keywords: null, error: expect.stringContaining('ahrefs') });
    expect(out.serp.queries.some((q) => q.organic.some((r) => r.position === 3))).toBe(true);
  });

  it('preserves independent Ahrefs metrics when its domain-rating lookup fails', async () => {
    mocks.executeTool.mockImplementation(async (slug: string) => {
      if (slug === 'AHREFS_RETRIEVE_SITE_EXPLORER_METRICS') return { metrics: { org_keywords: 2, org_traffic: 9, org_cost: 100, paid_keywords: 0 } };
      if (slug === 'AHREFS_RETRIEVE_ORGANIC_KEYWORDS') return { keywords: [] };
      if (slug === 'SERPAPI_GOOGLE_LIGHT_SEARCH') return serp;
      throw new Error('domain rating unavailable');
    });
    const out = await runSearch(context());
    expect(out.business).toMatchObject({ domain_rating: null, organic_keywords: 2, organic_traffic: 9, paid_keywords: 0, error: expect.stringContaining('rating') });
  });

  it('keeps public keyword suggestions when Planner fails while volumes and bids remain unknown', async () => {
    mocks.executeTool.mockImplementation(async (slug: string) => { if (slug === 'SERPAPI_GOOGLE_LIGHT_SEARCH') return serp; throw new Error('Planner account unavailable'); });
    const out = await runKeywords(context({ maps: { business: { category: 'Health food store' } } }));
    expect(out).toMatchObject({ demand_status: 'unavailable', error: expect.stringContaining('Planner account unavailable'), ideas: [{ keyword: 'grass fed food near me', monthly_searches: null, low_bid_usd: null, high_bid_usd: null }] });
  });

  it.each(['Services', 'Health food store'])('uses first-party health coaching wording for search and keyword seeds instead of the %s listing category', async (category) => {
    const site = parseSite('<title>Wildly Primal | Functional Health Coaching</title><meta name="description" content="Functional health coaching and personalized support."><h1>Services</h1>', seed.website, seed.website, 200);
    const ctx = context({ site: { business: site }, maps: { business: { category } }, competitors: { business: { category } } });
    ctx.audit.city = 'Jacksonville, FL';
    mocks.executeTool.mockImplementation(async (slug: string) => {
      if (slug === 'GOOGLEADS_GENERATE_KEYWORD_IDEAS') return { results: [{ text: 'health coach', keyword_idea_metrics: { avg_monthly_searches: 100 } }] };
      if (slug === 'SERPAPI_GOOGLE_LIGHT_SEARCH') return { organic_results: [], related_searches: [] };
      throw new Error('Ahrefs unavailable');
    });
    const search = await runSearch(ctx);
    const keywords = await runKeywords(ctx);
    expect(search.serp.queries.map((result) => result.query)).toContain('Health coach Jacksonville, FL');
    expect(search.serp.queries.some((result) => /^services\b/i.test(result.query))).toBe(false);
    expect(keywords.seeds).toEqual(['Health coach', 'Health coach Jacksonville']);
    expect(mocks.inspectWebsite).not.toHaveBeenCalled();
  });

  it('reads a dated public Maps listing when Places fails, preserving ratings without rank claims', async () => {
    mocks.executeTool.mockImplementation(async (slug: string, args: Record<string, unknown>) => {
      if (slug === 'GOOGLE_MAPS_TEXT_SEARCH') throw new Error('Places quota');
      if (slug === 'SERPAPI_GOOGLE_MAPS_SEARCH') return { local_results: String(args.q).includes('Wildly') ? [{ title: 'Wildly Primal', type: 'Health coach', website: seed.website, rating: 4.8, reviews: 45 }] : [{ title: 'Nearby Coach', type: 'Health coach', website: 'https://coach.example' }] };
      throw new Error('unexpected');
    });
    const out = await runMaps(context());
    expect(out).toMatchObject({ source: expect.stringContaining('not organic search rank'), business: { name: 'Wildly Primal', reviews: 45, rating: 4.8 }, nearby: [{ name: 'Nearby Coach' }] });
    expect(mocks.withBrowser).not.toHaveBeenCalled();
  });

  it('does not match a different business only because its first word is The', () => {
    const other = { displayName: { text: 'The Seafood Market' }, websiteUri: 'https://seafood.example' };
    expect(matchBusiness([other], 'The Primal Kitchen')).toBeNull();
  });
});

describe('competitor discovery', () => {
  it.each(['fresh', 'stored'])('uses the %s worker website category before matching rivals when Google labels the business Services', async (websiteRead) => {
    const city = 'Jacksonville, FL';
    const site = parseSite('<title>Wildly Primal | Functional Health Coaching</title><meta name="description" content="Functional health coaching for lasting change.">', seed.website, seed.website, 200);
    mocks.inspectWebsite.mockResolvedValue({ scan: site, business: { category: 'Health coach' }, sources: [{ name: 'Website', status: 'ok', url: seed.website }], warnings: [] });
    const listing = { ...own, primaryTypeDisplayName: { text: 'Services' } };
    const coach = { ...own, id: 'coach', displayName: { text: 'Jacksonville Health Coaching' }, primaryTypeDisplayName: { text: 'Health coach' }, websiteUri: 'https://healthcoach.example' };
    const unrelated = { ...own, id: 'cleaner', displayName: { text: 'Jacksonville Cleaning Services' }, websiteUri: 'https://cleaner.example' };
    mocks.executeTool.mockImplementation(async (slug: string, args: Record<string, unknown>) => {
      if (slug !== 'GOOGLE_MAPS_TEXT_SEARCH') throw new Error('Unexpected provider');
      if (String(args.textQuery).startsWith('Wildly Primal')) return { places: [listing] };
      return { places: String(args.textQuery).startsWith('Health coach') ? [coach] : [unrelated] };
    });
    const ctx = context(websiteRead === 'stored' ? { site: { business: site } } : {});
    ctx.audit.city = city;
    const manual = { name: 'Reviewed direct competitor', website: 'https://reviewed.example', instagram: null };
    ctx.audit.competitors = [manual] as never;
    const result = await runCompetitors(ctx);
    expect(result.business?.category).toBe('Health coach');
    expect(result.competitors).toEqual([manual, { name: 'Jacksonville Health Coaching', website: 'https://healthcoach.example', instagram: null }]);
    if (websiteRead === 'fresh') expect(mocks.inspectWebsite).toHaveBeenCalledWith(seed.website, expect.objectContaining({ timeoutMs: expect.any(Number) }));
    else expect(mocks.inspectWebsite).not.toHaveBeenCalled();
    expect(mocks.executeTool).toHaveBeenCalledWith('GOOGLE_MAPS_TEXT_SEARCH', expect.objectContaining({ textQuery: 'Health coach near Jacksonville, FL' }), expect.any(Number));
  });

  it('does not research generic Services competitors or start website reads after the worker deadline', async () => {
    mocks.executeTool.mockImplementation(async (slug: string) => {
      if (slug === 'GOOGLE_MAPS_TEXT_SEARCH') return { places: [{ ...own, primaryTypeDisplayName: { text: 'Services' } }] };
      if (slug === 'SERPAPI_GOOGLE_LIGHT_SEARCH') return { organic_results: [{ title: 'Wildly Primal', link: seed.website, snippet: 'Welcome to our business.' }] };
      throw new Error('Unavailable');
    });
    const result = await findCompetitors({ ...seed, category: 'Services' });
    expect(result.competitors).toEqual([]);
    expect(result.gaps.join(' ')).toMatch(/category could not be verified/);
    expect(mocks.executeTool.mock.calls.some(([, args]) => /^services\s+near/i.test(String(args.textQuery)))).toBe(false);
    mocks.executeTool.mockClear();
    const expired = await runCompetitors({ ...context(), deadline: Date.now() - 1 });
    expect(expired.competitors).toEqual([]);
    expect(mocks.executeTool).not.toHaveBeenCalled();
    expect(mocks.inspectWebsite).not.toHaveBeenCalled();
  });

  it('suggests up to six relevant locals and preserves entered competitors during an audit', async () => {
    const rivals = Array.from({ length: 8 }, (_, i) => ({ ...own, id: `r${i}`, displayName: { text: `Local Health Foods ${i}` }, websiteUri: `https://local${i}.example`, userRatingCount: 10 + i, rating: 4.5 }));
    mocks.executeTool.mockImplementation(async (slug: string, args: Record<string, unknown>) => { if (slug === 'GOOGLE_MAPS_TEXT_SEARCH') return { places: String(args.textQuery).includes('Wildly') ? [own] : rivals }; throw new Error('unavailable'); });
    const found = await findCompetitors(seed);
    expect(found.competitors).toHaveLength(6);
    expect(found.sources[0]).toMatchObject({ label: expect.stringContaining('Google Places'), query: 'Health food store near Fort Lauderdale, FL' });
    const ctx = context();
    ctx.audit.competitors = [{ name: 'My direct rival', website: 'https://entered.example', instagram: null }] as never;
    const out = await runCompetitors(ctx);
    expect(out.competitors).toHaveLength(6);
    expect(out.competitors[0]).toEqual(ctx.audit.competitors[0]);
    expect(out.picks.every((p) => p.market === 'local')).toBe(true);
  });
  it('passes the intake deadline to providers and makes no new reads once it has expired', async () => {
    const deadline = Date.now() + 5000;
    mocks.executeTool.mockResolvedValue({ places: [] });
    await findCompetitors({ ...seed, deadline });
    expect(mocks.executeTool.mock.calls.every(([, , timeout]) => typeof timeout === 'number' && timeout <= 5000)).toBe(true);
    mocks.executeTool.mockClear();
    const expired = await findCompetitors({ ...seed, deadline: Date.now() - 1 });
    expect(expired.competitors).toEqual([]);
    expect(expired.gaps.join(' ')).toMatch(/time limit/);
    expect(mocks.executeTool).not.toHaveBeenCalled();
  });

});

describe('public ads and social failure semantics', () => {
  it('keeps missing website-tag evidence distinct from observed absence while still reading paid pages by the supplied domain', async () => {
    mocks.executeTool.mockResolvedValue({ pages: [{ url: 'https://wildlyprimal.example/coaching', keywords: 2, sum_traffic: 10 }] });
    const out = await runAds(context());
    expect(out.business).toMatchObject({ domain: 'wildlyprimal.example', website_checked: false, paid_pages: [{ keywords: 2, traffic: 10 }], error: expect.stringContaining('Website tags were not read') });
  });

  it('requires explicit completion before turning an empty Google library list into no ads', () => {
    expect(googleAdsFromList({ items: [] })).toEqual({ status: 'unknown', count: null });
    expect(googleAdsFromList({ success: false, items: [], has_more: false })).toEqual({ status: 'unknown', count: null });
  });

  it('keeps successful Instagram profile figures when only the post-list read fails', async () => {
    mocks.executeTool.mockImplementation(async (slug: string) => { if (slug === 'SCRAPECREATORS_GET_INSTAGRAM_PROFILE') return { follower_count: 450, media_count: 80 }; throw new Error('large answer came back unreadable'); });
    const out = await runSocial(context(), 0);
    expect(out.business).toMatchObject({ exists: true, followers: 450, posts: 80, avg_likes_recent: null, error: expect.stringContaining('Posts') });
  });

  it('reads Facebook supplied directly when Instagram fails and there is no website', async () => {
    mocks.executeTool.mockImplementation(async (slug: string) => { if (slug === 'SCRAPECREATORS_GET_FACEBOOK_PROFILE') return { name: 'Wildly Primal', followerCount: 123 }; if (slug === 'SCRAPECREATORS_LIST_FACEBOOK_PROFILE_POSTS') return { posts: [] }; throw new Error('No active connection for instagram'); });
    const ctx = context();
    ctx.audit.website = null as never;
    const out = await runSocial(ctx, 0);
    expect(out.facebook).toMatchObject({ page_name: 'Wildly Primal', followers: 123 });
    expect(out.business?.followers).toBeNull();
    expect(out.business?.error).toMatch(/instagram/);
  });

  it('reads public Google ads via SerpApi when ScrapeCreators cannot answer, keeping Meta unknown', async () => {
    mocks.executeTool.mockImplementation(async (slug: string) => { if (slug === 'SERPAPI_SEARCH_PUBLIC_GOOGLE_ADS') return { ad_creatives: [{ creative_id: 'CR1', advertiser: 'Wildly Primal' }] }; throw new Error('No active connection for scrapecreators'); });
    const out = await runAdsLibrary(context());
    expect(out.business).toMatchObject({ meta_ad_status: 'unknown', google_ads_status: 'ads_found', google_ads_count: 1, error: expect.stringContaining('Meta') });
  });
});
