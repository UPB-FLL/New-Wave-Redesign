import {
  metaAdStatus,
  transparencyStatus,
  type AdLibraryEvidence,
  type GoogleAdsStatus,
  type MetaAd,
} from '../../../../packages/groundswell/src/benchmark/index.js';
import { benchAccounts, type BenchAccount } from '../benchmarkAccounts.js';
import { withBrowser } from '../browser.js';
import { executeTool, findKey } from '../composio.js';
import { PermanentStepError, type StepContext } from '../types.js';
import { isProviderCreditFailure } from '../providerBudget.js';
import { numeric } from './serp.js';
import type { FacebookSnapshot } from './social.js';

/**
 * Ads Current, from the ad libraries (benchmarks only): the Facebook Page's
 * Ad Library status and its ads by Page id (never a name search), Google's
 * Ads Transparency Center by domain through ScrapeCreators (one credit a
 * domain; the headless render of the Transparency Center is the fallback when
 * that call fails), and Ahrefs' monthly paid-search history. Presence, dates
 * and creative only; no spend.
 */

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : null);
const TRANSPARENCY_WAIT_MS = 8_000;
const errorText = (value: unknown): string => value instanceof Error ? value.message : typeof value === 'string' ? value : JSON.stringify(value ?? '') || '';
const creditDenied = (value: unknown): boolean => isProviderCreditFailure(errorText(value)) || /\b402\b/.test(errorText(value));

/** A query parameter alone does not establish which advertiser the rendered page describes. */
function containsAdvertiserDomain(body: string, domain: string): boolean {
  const escaped = domain.replace(/^www\./i, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^a-z0-9.-])(?:www\\.)?${escaped}(?=$|[^a-z0-9.-])`, 'i').test(body);
}

/** One ad from LIST_FACEBOOK_COMPANY_ADS, in the package's shape. */
export function toMetaAd(r: Record<string, unknown>): MetaAd {
  const snap = (r.snapshot ?? {}) as Record<string, unknown>;
  const body = str((snap.body as Record<string, unknown>)?.text ?? snap.body ?? r.body, 400) ?? '';
  const started = r.start_date_string ?? r.start_date ?? r.startDate;
  return {
    id: String(r.ad_archive_id ?? r.adArchiveID ?? r.id ?? ''),
    // The date only: epoch seconds, or an ISO timestamp cut to its day.
    started: typeof started === 'number' ? new Date(started * 1000).toISOString().slice(0, 10) : (str(started, 30)?.replace(/^(\d{4}-\d{2}-\d{2})T.*$/, '$1') ?? null),
    active: r.is_active === true || r.isActive === true,
    platforms: (Array.isArray(r.publisher_platform) ? r.publisher_platform : Array.isArray(r.publisherPlatform) ? r.publisherPlatform : []).map(String),
    title: str(snap.title ?? r.title, 120),
    body_excerpt: body.slice(0, 120),
    cta: str(snap.cta_text ?? r.cta_text, 40),
    landing_url: str(snap.link_url ?? r.link_url, 300),
  };
}

/** The ads in a LIST_FACEBOOK_COMPANY_ADS response, whatever it nests them under. */
export function adRows(list: unknown): Record<string, unknown>[] {
  const rows = (Array.isArray(list) ? list : null) ?? findKey<unknown[]>(list, 'results') ?? findKey<unknown[]>(list, 'ads') ?? findKey<unknown[]>(list, 'searchResults') ?? findKey<unknown[]>(list, 'items') ?? [];
  return (Array.isArray(rows) ? rows : []).filter((r): r is Record<string, unknown> => Boolean(r && typeof r === 'object' && !Array.isArray(r)));
}

async function metaFor(a: BenchAccount, prior: FacebookSnapshot | null) {
  if (!a.facebook && !prior?.page_id) return { pageId: null, statusText: null, ads: [] as MetaAd[], note: 'Meta: No Facebook Page was provided or discovered.' };
  let pageId = prior?.page_id ?? null;
  let statusText = prior?.ad_library_status ?? null;
  if (!pageId) {
    const profile = await executeTool('SCRAPECREATORS_GET_FACEBOOK_PROFILE', { url: a.facebook, include_gated_profile: true, cache_max_age: '7d' });
    if (creditDenied(findKey(profile, 'error'))) throw new Error(errorText(findKey(profile, 'error')));
    const lib = findKey<Record<string, unknown>>(profile, 'adLibrary');
    pageId = lib?.pageId ? String(lib.pageId) : null;
    statusText = typeof lib?.adStatus === 'string' ? lib.adStatus : null;
  }
  if (!pageId) return { pageId, statusText, ads: [], note: 'Meta: The public Page returned no Ad Library id; advertising could not be determined.' };
  try {
    const list = await executeTool('SCRAPECREATORS_LIST_FACEBOOK_COMPANY_ADS', { page_id: pageId, status: 'ALL', country: 'ALL', trim: true });
    if (creditDenied(findKey(list, 'error'))) throw new Error(errorText(findKey(list, 'error')));
    return { pageId, statusText, ads: adRows(list).map(toMetaAd), note: null };
  } catch (err) {
    if (err instanceof PermanentStepError && /API key/i.test(err.message)) throw err;
    return { pageId, statusText, ads: [], note: `Meta ads: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * The Transparency Center's answer for a domain, from
 * SCRAPECREATORS_LIST_GOOGLE_COMPANY_ADS with no date filter (so the whole
 * history): ads on record, or a verified negative when the first page is
 * empty and complete.
 */
export function googleAdsFromList(list: unknown): { status: GoogleAdsStatus; count: number | null } {
  if (findKey(list, 'success') === false || findKey(list, 'successful') === false || findKey(list, 'error')) return { status: 'unknown', count: null };
  const items = findKey<unknown[]>(list, 'items');
  if (!Array.isArray(items)) return { status: 'unknown', count: null };
  const estimate = findKey<unknown>(list, 'total_estimate');
  const count = typeof estimate === 'number' && Number.isFinite(estimate) && estimate >= items.length ? Math.round(estimate) : items.length;
  if (count > 0) return { status: 'ads_found', count };
  return findKey<unknown>(list, 'has_more') === false ? { status: 'none', count: 0 } : { status: 'unknown', count: null };
}

/** SerpApi reads the public Transparency Center by domain, never a client's private Google Ads account. */
export function googleAdsFromSerp(list: unknown): { status: GoogleAdsStatus; count: number | null } {
  if (findKey(list, 'error') || findKey(list, 'success') === false) return { status: 'unknown', count: null };
  const ads = findKey<unknown>(list, 'ad_creatives');
  if (!Array.isArray(ads)) return { status: 'unknown', count: null };
  if (ads.length) return { status: 'ads_found', count: ads.length };
  // An empty page without an explicit total is inconclusive, even if the HTTP request succeeded.
  const total = numeric(findKey(list, 'total_results'));
  return total === 0 && !findKey(list, 'next_page_token') ? { status: 'none', count: 0 } : { status: 'unknown', count: null };
}

async function googleAdsFor(domain: string, errors: string[]) {
  try {
    const list = await executeTool('SCRAPECREATORS_LIST_GOOGLE_COMPANY_ADS', { domain, get_ad_details: false });
    if (creditDenied(findKey(list, 'error'))) throw new Error(errorText(findKey(list, 'error')));
    const read = googleAdsFromList(list);
    if (read.status !== 'unknown') return read;
    errors.push('Google Ads Transparency: ScrapeCreators returned an incomplete or unrecognized answer.');
  } catch (err) {
    if (err instanceof PermanentStepError && /API key/i.test(err.message)) throw err;
    errors.push(`Google Ads Transparency: ${err instanceof Error ? err.message : String(err)}`);
    if (creditDenied(err)) return { status: 'unknown' as GoogleAdsStatus, count: null };
  }
  try {
    const list = await executeTool('SERPAPI_SEARCH_PUBLIC_GOOGLE_ADS', { text: domain, num: 40 }, 45_000);
    if (creditDenied(findKey(list, 'error'))) throw new Error(errorText(findKey(list, 'error')));
    return googleAdsFromSerp(list);
  } catch (err) {
    if (err instanceof PermanentStepError && /API key/i.test(err.message)) throw err;
    errors.push(`Public Google Ads search: ${err instanceof Error ? err.message : String(err)}`);
    return { status: 'unknown' as GoogleAdsStatus, count: null };
  }
}

async function paidHistory(domain: string) {
  const to = new Date();
  const from = new Date(to);
  from.setUTCMonth(from.getUTCMonth() - 12);
  const data = await executeTool('AHREFS_RETRIEVE_SITE_EXPLORER_METRICS_HISTORY', {
    target: domain,
    date_from: from.toISOString().slice(0, 10),
    date_to: to.toISOString().slice(0, 10),
    select: 'date,paid_traffic,paid_cost',
    history_grouping: 'monthly',
    mode: 'subdomains',
    country: 'us',
  });
  if (creditDenied(findKey(data, 'error'))) throw new Error(errorText(findKey(data, 'error')));
  const raw = findKey<unknown>(data, 'metrics');
  const rows = Array.isArray(raw) ? raw.filter((r): r is Record<string, unknown> => Boolean(r && typeof r === 'object')) : [];
  return rows.filter((r) => numeric(r.paid_traffic) !== null && numeric(r.paid_cost) !== null).slice(-12).map((r) => ({
    month: String(r.date ?? '').slice(0, 7),
    paid_traffic: numeric(r.paid_traffic)!,
    // Ahrefs money is in US cents.
    paid_traffic_value_usd: numeric(r.paid_cost)! / 100,
  }));
}

export async function runAdsLibrary(ctx: StepContext) {
  const accounts = benchAccounts(ctx);
  const social = ctx.outputs.social as { facebook?: FacebookSnapshot | null; facebook_competitors?: (FacebookSnapshot & { name: string })[] } | undefined;
  const billingDeniedAccounts = new Set<number>();
  const evidence: AdLibraryEvidence[] = await Promise.all(
    accounts.map(async (a, i): Promise<AdLibraryEvidence> => {
      const errors: string[] = [];
      const prior = i === 0 ? social?.facebook ?? null : social?.facebook_competitors?.find((f) => f.name === a.name) ?? null;
      const meta = await metaFor(a, prior).catch((err) => {
        if (err instanceof PermanentStepError && /API key/i.test(err.message)) throw err;
        errors.push(`Meta: ${err instanceof Error ? err.message : String(err)}`);
        return { pageId: prior?.page_id ?? null, statusText: prior?.ad_library_status ?? null, ads: [] as MetaAd[], note: null };
      });
      const metaBillingDenied = creditDenied(meta.note) || errors.some(creditDenied);
      let billingDenied = metaBillingDenied;
      const history = a.domain && !billingDenied
        ? await paidHistory(a.domain).catch((err) => {
            errors.push(`Ahrefs: ${err instanceof Error ? err.message : String(err)}`);
            if (creditDenied(err)) billingDenied = true;
            return [];
          })
        : [];
      const googleErrorStart = errors.length;
      const google = a.domain && !billingDenied ? await googleAdsFor(a.domain, errors) : { status: 'unknown' as GoogleAdsStatus, count: null };
      if (billingDenied || errors.slice(googleErrorStart).some(creditDenied)) billingDeniedAccounts.add(i);
      return {
        name: a.name,
        domain: a.domain,
        facebook_page_id: meta.pageId,
        meta_ad_status: metaBillingDenied ? 'unknown' : metaAdStatus(meta.statusText, meta.ads, meta.pageId),
        meta_ads: meta.ads.slice(0, 10),
        meta_ads_inactive_n: meta.ads.filter((x) => !x.active).length,
        google_ads_status: google.status,
        google_ads_count: google.count,
        paid_search_history: history,
        pixels: {
          meta: Boolean(a.site?.tracking.meta_pixel),
          google_ads: Boolean(a.site?.tracking.google_ads.length),
          tiktok: Boolean(a.site?.tracking.tiktok_pixel),
        },
        error: [meta.note, ...errors].filter(Boolean).join(' ') || null,
      };
    })
  );

  // Fallback for the domains ScrapeCreators could not answer: one headless read of the Transparency Center each, in one browser.
  const domains = evidence.filter((e, i) => !billingDeniedAccounts.has(i) && ((e.domain && e.google_ads_status === 'unknown') || (e.facebook_page_id && e.meta_ad_status === 'unknown')));
  if (domains.length && ctx.deadline - Date.now() > 60_000) {
    await withBrowser(async (browser) => {
      for (const e of domains) {
        if (ctx.deadline - Date.now() < 25_000) break;
        const page = await browser.newPage();
        try {
          if (e.facebook_page_id && e.meta_ad_status === 'unknown') {
            await page.goto(`https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&view_all_page_id=${encodeURIComponent(e.facebook_page_id)}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
            const body = await page.evaluate(() => document.body?.innerText ?? '');
            if (!/log in to continue|sign in|captcha|access denied/i.test(body)) e.meta_ad_status = metaAdStatus(body, [], e.facebook_page_id);
          }
          if (!e.domain || e.google_ads_status !== 'unknown' || ctx.deadline - Date.now() < 25_000) continue;
          await page.goto(`https://adstransparency.google.com/?region=US&domain=${encodeURIComponent(e.domain!)}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
          await new Promise((r) => setTimeout(r, TRANSPARENCY_WAIT_MS));
          const body = await page.evaluate(() => document.body?.innerText ?? '');
          if (!containsAdvertiserDomain(body, e.domain)) {
            e.google_ads_status = 'unknown';
            e.google_ads_count = null;
            e.error = [e.error, 'Google Ads browser results did not identify the requested advertiser domain.'].filter(Boolean).join(' ');
            continue;
          }
          const read = transparencyStatus(body);
          e.google_ads_status = read.status;
          e.google_ads_count = read.count;
        } catch {
          // A failed read stays "could not be determined".
        } finally {
          await page.close().catch(() => {});
        }
      }
    }).catch(() => {});
  }

  const [business, ...competitors] = evidence;
  return {
    source: 'Meta Ad Library (by Page id) and Google Ads Transparency Center (by domain), via ScrapeCreators, SerpApi and public browser fallback; Ahrefs paid-search history (US)',
    fetched_at: new Date().toISOString(),
    scope: 'Public ad presence and historical creative only. A missing tag or unavailable library cannot establish that no campaigns are active. Public libraries do not expose account spend or performance.',
    sources: evidence.map((e) => ({ name: e.name, captured_at: new Date().toISOString(), meta_url: e.facebook_page_id ? `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&view_all_page_id=${encodeURIComponent(e.facebook_page_id)}` : null, google_url: e.domain ? `https://adstransparency.google.com/?domain=${encodeURIComponent(e.domain)}` : null, google_query: e.domain })),
    business,
    competitors,
  };
}
