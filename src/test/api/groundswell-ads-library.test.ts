import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  adLibraryEvidence,
  pixelsOf,
  readCompanyAds,
  readFacebookPage,
  readPaidHistory,
  readTransparency,
  SPEND_NOTE,
  transparencyUrl,
} from '../../../api/_lib/groundswell/currents/adsLibrary';
import type { SiteScan } from '../../../api/_lib/groundswell/currents/site';
import { PermanentStepError, type StepContext } from '../../../api/_lib/groundswell/types';

const FIXTURES = join(__dirname, 'fixtures', 'groundswell-benchmark');
const load = (name: string) => JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));
const text = (name: string) => readFileSync(join(FIXTURES, name), 'utf8');
const expected = load('expected.json');
const tags = load('ads/site-tags.json');

/** A Site current output with only what the Ads library reads: URL, tracking and the Facebook link. */
function siteFor(domain: string, facebook: string | null): SiteScan {
  const t = tags[domain];
  return {
    url: `https://${domain}/`,
    final_url: `https://${domain}/`,
    status: 200,
    https: true,
    fetched_at: '2026-10-21T00:00:00.000Z',
    error: null,
    title: null,
    meta_description: null,
    h1: [],
    canonical: null,
    has_viewport: true,
    word_count: 0,
    theme_color: null,
    brand_colors: [],
    logo: null,
    og_image: null,
    schema_types: [],
    tracking: {
      google_analytics: t.tags.filter((x: string) => x.startsWith('G-')),
      google_tag_manager: t.tags.filter((x: string) => x.startsWith('GTM-')),
      google_ads: t.tags.filter((x: string) => x.startsWith('AW-')),
      meta_pixel: t.pixels.meta,
      tiktok_pixel: t.pixels.tiktok,
    },
    booking: [],
    phones: [],
    social: { instagram: [], facebook: facebook ? [facebook] : [], tiktok: [], youtube: [] },
  };
}

const business = {
  name: 'Harborlight Nutrition',
  domain: 'harborlightnutrition.example',
  facebook: load('ads/harborlightnutrition.facebook.json'),
  transparency: text('ads/harborlightnutrition.example.transparency.txt'),
};
const competitor = {
  name: 'Fern & Field Health Coaching',
  domain: 'fernandfield.example',
  facebook: load('ads/fernandfield.facebook.json'),
  transparency: text('ads/fernandfield.example.transparency.txt'),
};
/** Ahrefs-shaped monthly rows ending October 2026. */
const months = (count: number, fill: (i: number) => { paid_traffic: number; paid_cost: number }) =>
  Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(2026, 9 - (count - 1 - i), 1));
    return { date: d.toISOString(), ...fill(i) };
  });
const zeroHistory = { metrics: months(12, () => ({ paid_traffic: 0, paid_cost: 0 })) };

describe('ads_library: the fixture business', () => {
  const want = expected.ads.harborlightnutrition;
  const e = adLibraryEvidence({
    name: business.name,
    site: siteFor(business.domain, business.facebook.profile.url),
    facebook_profile: business.facebook.profile,
    company_ads: business.facebook.company_ads,
    transparency: business.transparency,
    paid_history: zeroHistory,
  });

  it('reads a verified Meta negative from the page and its empty ads list', () => {
    expect(e.facebook_page_id).toBe('910000000000001');
    expect(e.meta_ad_status).toBe(want.meta_ad_status);
    expect(e.meta_ads).toEqual([]);
    expect(e.meta_ads_inactive_n).toBe(want.meta_ads_inactive_n);
  });

  it('reads a verified Google negative, no pixels and a zero paid history', () => {
    expect(e.google_ads_status).toBe(want.google_ads_status);
    expect(e.google_ads_count).toBe(0);
    expect(e.pixels).toEqual(want.pixels);
    expect(e.paid_search_history).toHaveLength(12);
    expect(e.paid_search_history.every((m) => m.paid_cost_usd === 0 && m.paid_traffic === 0)).toBe(true);
    expect(e.spend_note).toBe(SPEND_NOTE);
    expect(e.notes).toEqual([]);
    expect(e.error).toBeNull();
  });
});

describe('ads_library: the fixture competitor', () => {
  const want = expected.ads.fernandfield;
  const e = adLibraryEvidence({
    name: competitor.name,
    site: siteFor(competitor.domain, competitor.facebook.profile.url),
    facebook_profile: competitor.facebook.profile,
    company_ads: competitor.facebook.company_ads,
    transparency: competitor.transparency,
    paid_history: zeroHistory,
  });

  it('reports the one active ad with its dates, platforms, CTA and landing page, never a spend figure', () => {
    expect(e.meta_ad_status).toBe(want.meta_ad_status);
    expect(e.meta_ads).toHaveLength(1);
    expect(e.meta_ads[0]).toMatchObject({ ...want.meta_ads[0], id: '920000000000001', title: 'Bloating is common, not normal' });
    expect(e.meta_ads[0].landing_url).toMatch(/^https:\/\/fernandfield\.example\/contact/);
    expect(e.meta_ads[0].body_excerpt.length).toBeLessThanOrEqual(240);
    expect(e.meta_ads[0].body_excerpt).toMatch(/^Bloating after every meal/);
    expect(JSON.stringify(e)).not.toMatch(/spend"?:\s*\d/);
    expect(e.meta_ads_inactive_n).toBe(0);
  });

  it('has both pixels, a Google negative and the spend note', () => {
    expect(e.pixels).toEqual(want.pixels);
    expect(e.google_ads_status).toBe(want.google_ads_status);
    expect(e.spend_note).toBe(SPEND_NOTE);
  });
});

describe('ads_library: rules on small inputs', () => {
  it('tells a verified negative from an unknown page lookup', () => {
    expect(readFacebookPage({ adLibrary: { pageId: '1', adStatus: "This Page isn't currently running ads." } })).toEqual({ page_id: '1', status: 'not_running' });
    expect(readFacebookPage({ adLibrary: { pageId: '2', adStatus: null } })).toEqual({ page_id: '2', status: 'unknown' });
    expect(readFacebookPage({})).toEqual({ page_id: null, status: 'unknown' });
  });

  it('counts inactive ads as history and keeps the excerpt short', () => {
    const { ads, inactive_n } = readCompanyAds({
      items: [
        { ad_archive_id: 'a', is_active: false, start_date: 1_700_000_000, publisher_platform: ['FACEBOOK'], snapshot: { body: { text: 'x'.repeat(500) }, cta_text: 'Learn more' } },
        { ad_archive_id: 'b', is_active: true, start_date_string: '2026-10-19T07:00:00.000Z', snapshot: {} },
      ],
    });
    expect(inactive_n).toBe(1);
    expect(ads[0]).toMatchObject({ id: 'a', active: false, started: '2023-11-14', cta: 'Learn more' });
    expect(ads[0].body_excerpt).toHaveLength(240);
    expect(ads[1]).toMatchObject({ id: 'b', active: true, started: '2026-10-19', platforms: [], title: null, cta: null, landing_url: null });
  });

  it('reads the Transparency Center: a count, a negative, and pages that cannot be read', () => {
    expect(readTransparency('Ads Transparency Center ... example.com 14 ads calendar_today Any time')).toEqual({ status: 'ads_found', count: 14 });
    expect(readTransparency('Ads Transparency Center example.com 0 ads No ads found')).toEqual({ status: 'none', count: 0 });
    expect(readTransparency('Ads Transparency Center Before you continue to Google ... I agree')).toEqual({ status: 'unknown', count: null });
    expect(readTransparency('Our systems have detected unusual traffic from your computer network')).toEqual({ status: 'unknown', count: null });
    expect(readTransparency(null)).toEqual({ status: 'unknown', count: null });
    expect(transparencyUrl('a b.example')).toBe('https://adstransparency.google.com/?region=US&domain=a%20b.example');
  });

  it('turns Ahrefs cents into dollars and keeps the last twelve months', () => {
    const rows = readPaidHistory({ metrics: months(14, (i) => ({ paid_traffic: i, paid_cost: 12_345 })) });
    expect(rows).toHaveLength(12);
    expect(rows[0]).toEqual({ month: '2025-11', paid_traffic: 2, paid_cost_usd: 123.45 });
    expect(rows[11].month).toBe('2026-10');
    expect(readPaidHistory(null)).toEqual([]);
  });

  it('reads pixels from the Site current and explains every gap', () => {
    const e = adLibraryEvidence({ name: 'Nobody', site: null, facebook_profile: null, company_ads: null, transparency: null, paid_history: null });
    expect(pixelsOf(null)).toEqual({ meta: false, google_ads: false, tiktok: false });
    expect(e).toMatchObject({ domain: null, facebook_page_id: null, meta_ad_status: 'unknown', google_ads_status: 'unknown', google_ads_count: null, paid_search_history: [] });
    expect(e.notes).toEqual([
      'Meta: no Facebook page link on the site, so the Ad Library was not checked.',
      'Google: no domain, so the Ads Transparency Center was not checked.',
    ]);
  });
});

describe('ads_library: runAdsLibrary', () => {
  const ctx = (site: unknown, deadline = Date.now() + 120_000): StepContext => ({
    audit: { id: 'a1', business_name: business.name, city: null, website: null, instagram: null, competitors: [{ name: competitor.name, website: null, instagram: null }], notes: null },
    outputs: { site },
    deadline,
    attempt: 1,
  });
  const siteOut = {
    business: siteFor(business.domain, business.facebook.profile.url),
    competitors: [{ name: competitor.name, site: siteFor(competitor.domain, competitor.facebook.profile.url) }],
  };
  const fakePage = (bodies: Record<string, string>) => {
    let url = '';
    return {
      goto: vi.fn(async (u: string) => void (url = u)),
      evaluate: vi.fn(async () => bodies[decodeURIComponent(new URL(url).searchParams.get('domain') ?? '')] ?? null),
    };
  };

  async function withMocks(opts: { executeTool: (slug: string, args: Record<string, unknown>) => Promise<unknown>; browserFails?: boolean; bodies?: Record<string, string> }) {
    const page = fakePage(opts.bodies ?? { [business.domain]: business.transparency, [competitor.domain]: competitor.transparency });
    vi.doMock('../../../api/_lib/groundswell/composio', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../../../api/_lib/groundswell/composio')>()),
      executeTool: vi.fn(opts.executeTool),
    }));
    vi.doMock('../../../api/_lib/groundswell/browser', () => ({
      withBrowser: async (fn: (b: unknown) => Promise<unknown>) => {
        if (opts.browserFails) throw new Error('chromium could not launch');
        return fn({ newPage: async () => ({ ...page, setUserAgent: async () => {} }) });
      },
    }));
    vi.resetModules();
    const mod = await import('../../../api/_lib/groundswell/currents/adsLibrary');
    const composio = await import('../../../api/_lib/groundswell/composio');
    return { mod, page, executeTool: composio.executeTool as ReturnType<typeof vi.fn> };
  }

  const liveTools = async (slug: string, args: Record<string, unknown>) => {
    const acct = String(args.url ?? args.page_id ?? args.target).includes('fernandfield') || args.page_id === '910000000000002' ? competitor : business;
    if (slug === 'SCRAPECREATORS_GET_FACEBOOK_PROFILE') return acct.facebook.profile;
    if (slug === 'SCRAPECREATORS_LIST_FACEBOOK_COMPANY_ADS') return acct.facebook.company_ads;
    if (slug === 'AHREFS_RETRIEVE_SITE_EXPLORER_METRICS_HISTORY') return zeroHistory;
    throw new Error(`unexpected tool ${slug}`);
  };

  it('looks up every account once: page, ads by page ID, one render per domain, twelve months of history', async () => {
    const { mod, page, executeTool } = await withMocks({ executeTool: liveTools });
    const out = await mod.runAdsLibrary(ctx(siteOut), { renderWaitMs: 0 });
    expect(executeTool.mock.calls.map((c) => c[0]).sort()).toEqual([
      'AHREFS_RETRIEVE_SITE_EXPLORER_METRICS_HISTORY',
      'AHREFS_RETRIEVE_SITE_EXPLORER_METRICS_HISTORY',
      'SCRAPECREATORS_GET_FACEBOOK_PROFILE',
      'SCRAPECREATORS_GET_FACEBOOK_PROFILE',
      'SCRAPECREATORS_LIST_FACEBOOK_COMPANY_ADS',
      'SCRAPECREATORS_LIST_FACEBOOK_COMPANY_ADS',
    ]);
    expect(executeTool).toHaveBeenCalledWith('SCRAPECREATORS_LIST_FACEBOOK_COMPANY_ADS', { page_id: '910000000000002', status: 'ALL', country: 'ALL', trim: true });
    expect(executeTool.mock.calls.find((c) => c[0] === 'AHREFS_RETRIEVE_SITE_EXPLORER_METRICS_HISTORY')?.[1]).toMatchObject({ select: 'date,paid_traffic,paid_cost', history_grouping: 'monthly', country: 'us' });
    expect(page.goto).toHaveBeenCalledTimes(2);
    expect(out.business).toMatchObject({ meta_ad_status: 'not_running', google_ads_status: 'none', pixels: { meta: false, google_ads: false, tiktok: false } });
    expect(out.competitors[0]).toMatchObject({ name: competitor.name, meta_ad_status: 'running', google_ads_status: 'none', pixels: { meta: true, google_ads: true, tiktok: false } });
    expect(out.competitors[0].meta_ads[0]).toMatchObject({ started: '2026-10-19', active: true, cta: 'Book now' });
    vi.doUnmock('../../../api/_lib/groundswell/composio');
    vi.doUnmock('../../../api/_lib/groundswell/browser');
  });

  it('never searches the Ad Library by name or keyword', async () => {
    const { mod, executeTool } = await withMocks({ executeTool: liveTools });
    await mod.runAdsLibrary(ctx(siteOut), { renderWaitMs: 0 });
    expect(executeTool.mock.calls.some((c) => /SEARCH_FACEBOOK_AD_LIBRARY/.test(String(c[0])) || 'company_name' in (c[1] as object))).toBe(false);
    vi.doUnmock('../../../api/_lib/groundswell/composio');
    vi.doUnmock('../../../api/_lib/groundswell/browser');
  });

  it('keeps going without a browser and says the Google answer could not be determined', async () => {
    const { mod, executeTool } = await withMocks({ executeTool: liveTools, browserFails: true });
    const out = await mod.runAdsLibrary(ctx(siteOut), { renderWaitMs: 0 });
    expect(executeTool).toHaveBeenCalled();
    expect(out.business.google_ads_status).toBe('unknown');
    expect(out.business.notes.join(' ')).toMatch(/browser was not available/);
    expect(out.business.meta_ad_status).toBe('not_running');
    vi.doUnmock('../../../api/_lib/groundswell/composio');
    vi.doUnmock('../../../api/_lib/groundswell/browser');
  });

  it('records a scrape failure on the account and stops on a Composio connection problem', async () => {
    const flaky = await withMocks({
      executeTool: async (slug, args) => {
        if (slug === 'SCRAPECREATORS_GET_FACEBOOK_PROFILE') throw new Error('rate limited');
        return liveTools(slug, args);
      },
    });
    const out = await flaky.mod.runAdsLibrary(ctx(siteOut), { renderWaitMs: 0 });
    expect(out.business.error).toMatch(/^Facebook page: rate limited/);
    expect(out.business.meta_ad_status).toBe('unknown');
    expect(out.business.google_ads_status).toBe('none');
    vi.doUnmock('../../../api/_lib/groundswell/composio');
    vi.doUnmock('../../../api/_lib/groundswell/browser');

    const down = await withMocks({
      executeTool: async () => {
        throw new PermanentStepError('Composio has no active connection for scrapecreators');
      },
    });
    await expect(down.mod.runAdsLibrary(ctx(siteOut), { renderWaitMs: 0 })).rejects.toThrow(/no active connection/);
    vi.doUnmock('../../../api/_lib/groundswell/composio');
    vi.doUnmock('../../../api/_lib/groundswell/browser');
  });

  it('skips the render, not the lookups, when the step is out of time', async () => {
    const { mod, page } = await withMocks({ executeTool: liveTools });
    const out = await mod.runAdsLibrary(ctx(siteOut, Date.now() + 5_000), { renderWaitMs: 0 });
    expect(page.goto).not.toHaveBeenCalled();
    expect(out.business.google_ads_status).toBe('unknown');
    expect(out.business.notes.join(' ')).toMatch(/out of time/);
    expect(out.business.meta_ad_status).toBe('not_running');
    vi.doUnmock('../../../api/_lib/groundswell/composio');
    vi.doUnmock('../../../api/_lib/groundswell/browser');
  });
});
