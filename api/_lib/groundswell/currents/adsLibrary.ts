import type { Page } from 'puppeteer-core';
import { withBrowser } from '../browser.js';
import { executeTool, findKey } from '../composio.js';
import type { StepContext } from '../types.js';
import { domainOf } from './search.js';
import type { SiteScan } from './site.js';

/**
 * Ads Current, library: who is paying for reach, where, and since when. For
 * each account: the Facebook page's Ad Library status and its ads by page ID
 * (ScrapeCreators through Composio), Google's Ads Transparency Center for the
 * domain (headless Chromium), twelve months of Ahrefs paid-search history,
 * and the pixels the Site current found. The rules are the ones in
 * docs/groundswell-competitor-benchmark.md §3.2; the fixtures in
 * src/test/api/fixtures/groundswell-benchmark/ads pin their results.
 *
 * Meta and Google publish presence, dates and creative, never spend, so this
 * step never reports a spend figure. Searching the Ad Library by name or
 * keyword matches other advertisers and is never used.
 *
 * Costs up to 2 ScrapeCreators credits and about 12 Ahrefs rows per account.
 * Not yet in STEPS: it runs only for benchmark audits (spec §2 and §4).
 */

export type MetaAdStatus = 'running' | 'not_running' | 'unknown';
export type GoogleAdsStatus = 'ads_found' | 'none' | 'unknown';

export interface MetaAd {
  id: string;
  started: string | null;
  active: boolean;
  platforms: string[];
  title: string | null;
  body_excerpt: string;
  cta: string | null;
  landing_url: string | null;
}

export interface PaidSearchMonth {
  month: string;
  paid_traffic: number;
  paid_cost_usd: number;
}

export interface Pixels {
  meta: boolean;
  google_ads: boolean;
  tiktok: boolean;
}

export const SPEND_NOTE = 'Meta and Google do not disclose spend for non-political ads; only presence, dates and creative are public.';

export interface AdLibraryEvidence {
  name: string;
  domain: string | null;
  facebook_url: string | null;
  facebook_page_id: string | null;
  meta_ad_status: MetaAdStatus;
  meta_ads: MetaAd[];
  meta_ads_inactive_n: number;
  google_ads_status: GoogleAdsStatus;
  google_ads_count: number | null;
  paid_search_history: PaidSearchMonth[];
  pixels: Pixels;
  spend_note: typeof SPEND_NOTE;
  /** What could not be determined and why; never an internal stack. */
  notes: string[];
  error: string | null;
}

const NOT_RUNNING = /isn.t currently running ads/i;
const BODY_EXCERPT = 240;
const TRANSPARENCY_WAIT_MS = 8_000;
const MIN_RENDER_MS = 30_000;

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const n = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** The Ad Library block of a Facebook page lookup: the page ID and whether Meta says it is not advertising. */
export function readFacebookPage(profile: unknown): { page_id: string | null; status: MetaAdStatus } {
  const block = findKey<Record<string, unknown>>(profile, 'adLibrary');
  const page_id = str(block?.pageId ?? findKey(profile, 'pageId'));
  const adStatus = str(block?.adStatus);
  return { page_id, status: adStatus && NOT_RUNNING.test(adStatus) ? 'not_running' : 'unknown' };
}

/** The page's ads by page ID, active and inactive, reduced to what the reports may show. */
export function readCompanyAds(result: unknown): { ads: MetaAd[]; inactive_n: number } {
  const items = (findKey<unknown[]>(result, 'items') ?? []).map((i) => i as Record<string, unknown>);
  const ads = items.map((i): MetaAd => {
    const snap = (i.snapshot ?? {}) as Record<string, unknown>;
    const body = str(findKey(snap.body, 'text') ?? snap.body);
    const started = str(i.start_date_string) ?? (n(i.start_date) !== null ? new Date((i.start_date as number) * 1000).toISOString() : null);
    return {
      id: str(i.ad_archive_id) ?? str(i.id) ?? '',
      started: started ? started.slice(0, 10) : null,
      active: i.is_active === true,
      platforms: Array.isArray(i.publisher_platform) ? i.publisher_platform.filter((p): p is string => typeof p === 'string') : [],
      title: str(snap.title),
      body_excerpt: (body ?? '').replace(/\s+/g, ' ').slice(0, BODY_EXCERPT),
      cta: str(snap.cta_text),
      landing_url: str(snap.link_url),
    };
  });
  return { ads, inactive_n: ads.filter((a) => !a.active).length };
}

/**
 * The Ads Transparency Center page for a domain, as body text. "0 ads" or
 * "No ads found" with the centre's own chrome present is a verified negative;
 * a consent, challenge or sign-in page is "could not be determined".
 */
export function readTransparency(text: string | null): { status: GoogleAdsStatus; count: number | null } {
  if (!text) return { status: 'unknown', count: null };
  const t = text.replace(/\s+/g, ' ');
  if (!/Ads Transparency Center/i.test(t)) return { status: 'unknown', count: null };
  if (/unusual traffic|verify (that )?you.re (not a robot|human)|captcha|before you continue|sign in to continue/i.test(t)) return { status: 'unknown', count: null };
  const m = /(\d[\d,]*)\s+ads?\b/i.exec(t);
  const count = m ? Number(m[1].replace(/,/g, '')) : /No ads found/i.test(t) ? 0 : null;
  if (count === null) return { status: 'unknown', count: null };
  return { status: count > 0 ? 'ads_found' : 'none', count };
}

/** Ahrefs metrics history rows to months; money arrives in USD cents. */
export function readPaidHistory(data: unknown): PaidSearchMonth[] {
  const rows = (findKey<unknown[]>(data, 'metrics') ?? []).map((r) => r as Record<string, unknown>);
  return rows
    .map((r) => ({ month: (str(r.date) ?? '').slice(0, 7), paid_traffic: n(r.paid_traffic) ?? 0, paid_cost_usd: (n(r.paid_cost) ?? 0) / 100 }))
    .filter((r) => /^\d{4}-\d{2}$/.test(r.month))
    .slice(-12);
}

export const pixelsOf = (site: SiteScan | null | undefined): Pixels => ({
  meta: Boolean(site?.tracking.meta_pixel),
  google_ads: Boolean(site?.tracking.google_ads.length),
  tiktok: Boolean(site?.tracking.tiktok_pixel),
});

export const transparencyUrl = (domain: string) => `https://adstransparency.google.com/?region=US&domain=${encodeURIComponent(domain)}`;

export async function transparencyText(page: Page, domain: string, waitMs = TRANSPARENCY_WAIT_MS): Promise<string | null> {
  await page.goto(transparencyUrl(domain), { waitUntil: 'domcontentloaded', timeout: 30_000 });
  if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));
  return page.evaluate(() => document.body?.innerText ?? null);
}

/** Puts one account's lookups together; every input may be missing. */
export function adLibraryEvidence(input: {
  name: string;
  site: SiteScan | null;
  facebook_profile: unknown;
  company_ads: unknown;
  transparency: string | null;
  paid_history: unknown;
  notes?: string[];
  error?: string | null;
}): AdLibraryEvidence {
  const domain = domainOf(input.site?.final_url ?? input.site?.url);
  const fb = input.facebook_profile ? readFacebookPage(input.facebook_profile) : { page_id: null, status: 'unknown' as MetaAdStatus };
  const company = input.company_ads ? readCompanyAds(input.company_ads) : null;
  const notes = [...(input.notes ?? [])];
  let meta_ad_status: MetaAdStatus = fb.status;
  if (company) meta_ad_status = company.ads.some((a) => a.active) ? 'running' : 'not_running';
  else if (!input.facebook_profile) notes.push('Meta: no Facebook page link on the site, so the Ad Library was not checked.');
  else if (fb.status === 'unknown') notes.push('Meta: the page lookup gave no Ad Library status and no page ID, so its ads could not be listed.');
  const google = readTransparency(input.transparency);
  if (!domain) notes.push('Google: no domain, so the Ads Transparency Center was not checked.');
  else if (google.status === 'unknown') notes.push('Google: the Ads Transparency Center answer could not be read (consent or challenge page, or no answer).');
  return {
    name: input.name,
    domain,
    facebook_url: input.site?.social.facebook[0] ?? null,
    facebook_page_id: fb.page_id,
    meta_ad_status,
    meta_ads: company?.ads ?? [],
    meta_ads_inactive_n: company?.inactive_n ?? 0,
    google_ads_status: google.status,
    google_ads_count: google.count,
    paid_search_history: input.paid_history ? readPaidHistory(input.paid_history) : [],
    pixels: pixelsOf(input.site),
    spend_note: SPEND_NOTE,
    notes,
    error: input.error ?? null,
  };
}

type SiteOut = { business: SiteScan | null; competitors: { name: string; site: SiteScan | null }[] };

const monthStart = (d: Date, monthsBack: number) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - monthsBack, 1)).toISOString().slice(0, 10);

export interface AdsLibraryOptions {
  /** How long the Transparency Center page gets to settle before its text is read; tests pass 0. */
  renderWaitMs?: number;
}

async function lookups(name: string, site: SiteScan | null, page: Page | null, deadline: number, renderWaitMs: number) {
  const notes: string[] = [];
  const facebookUrl = site?.social.facebook[0] ?? null;
  const domain = domainOf(site?.final_url ?? site?.url);
  let facebook_profile: unknown = null;
  let company_ads: unknown = null;
  let transparency: string | null = null;
  let paid_history: unknown = null;
  let error: string | null = null;
  const attempt = async (what: string, fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (err) {
      if ((err as { permanent?: boolean }).permanent) throw err;
      error = `${what}: ${err instanceof Error ? err.message : String(err)}`.slice(0, 300);
    }
  };
  if (facebookUrl) {
    await attempt('Facebook page', async () => {
      facebook_profile = await executeTool('SCRAPECREATORS_GET_FACEBOOK_PROFILE', { url: facebookUrl, cache_max_age: '7d' });
      const { page_id } = readFacebookPage(facebook_profile);
      if (page_id) company_ads = await executeTool('SCRAPECREATORS_LIST_FACEBOOK_COMPANY_ADS', { page_id, status: 'ALL', country: 'ALL', trim: true });
    });
  }
  if (domain) {
    if (!page) notes.push('Google: the browser was not available, so the Ads Transparency Center was not checked.');
    else if (deadline - Date.now() < MIN_RENDER_MS) notes.push('Google: out of time for the Ads Transparency Center render; it will not be retried.');
    else await attempt('Ads Transparency Center', async () => void (transparency = await transparencyText(page, domain, renderWaitMs)));
    await attempt('Ahrefs paid history', async () => {
      const now = new Date();
      paid_history = await executeTool('AHREFS_RETRIEVE_SITE_EXPLORER_METRICS_HISTORY', {
        target: domain,
        mode: 'subdomains',
        country: 'us',
        history_grouping: 'monthly',
        select: 'date,paid_traffic,paid_cost',
        date_from: monthStart(now, 11),
        date_to: now.toISOString().slice(0, 10),
      });
    });
  }
  return adLibraryEvidence({ name, site, facebook_profile, company_ads, transparency, paid_history, notes, error });
}

/**
 * Runs after `site`, which supplies each account's domain, Facebook link and
 * pixels. One browser serves every Transparency Center render; if it cannot
 * launch, the Meta and Ahrefs lookups still run and the Google answer is
 * "could not be determined".
 */
export async function runAdsLibrary(ctx: StepContext, options: AdsLibraryOptions = {}) {
  const renderWaitMs = options.renderWaitMs ?? TRANSPARENCY_WAIT_MS;
  const site = ctx.outputs.site as SiteOut | undefined;
  const accounts = [
    { name: ctx.audit.business_name, site: site?.business ?? null },
    ...(site?.competitors ?? []).slice(0, 6).map((c) => ({ name: c.name, site: c.site })),
  ];
  const run = async (page: Page | null) => {
    const out: AdLibraryEvidence[] = [];
    for (const a of accounts) out.push(await lookups(a.name, a.site, page, ctx.deadline, renderWaitMs));
    return out;
  };
  let results: AdLibraryEvidence[];
  try {
    results = await withBrowser(async (browser) => {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36');
      return run(page);
    });
  } catch (err) {
    if ((err as { permanent?: boolean }).permanent) throw err;
    results = await run(null);
  }
  const [business, ...competitors] = results;
  return {
    source: 'Meta Ad Library by page ID (ScrapeCreators through Composio), Google Ads Transparency Center (headless), Ahrefs paid-search history, site pixels',
    fetched_at: new Date().toISOString(),
    business,
    competitors,
  };
}
