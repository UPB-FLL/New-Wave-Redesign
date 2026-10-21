import {
  metaAdStatus,
  transparencyStatus,
  type AdLibraryEvidence,
  type MetaAd,
} from '../../../../packages/groundswell/src/benchmark/index.js';
import { benchAccounts, type BenchAccount } from '../benchmarkAccounts.js';
import { withBrowser } from '../browser.js';
import { executeTool, findKey } from '../composio.js';
import { PermanentStepError, type StepContext } from '../types.js';

/**
 * Ads Current, from the ad libraries (benchmarks only): the Facebook Page's
 * Ad Library status and its ads by Page id (never a name search), Google's
 * Ads Transparency Center read in the headless browser, and Ahrefs' monthly
 * paid-search history. Presence, dates and creative only; no spend.
 */

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : null);
const TRANSPARENCY_WAIT_MS = 8_000;

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
  const rows = findKey<unknown[]>(list, 'results') ?? findKey<unknown[]>(list, 'ads') ?? findKey<unknown[]>(list, 'searchResults') ?? findKey<unknown[]>(list, 'items') ?? [];
  return (Array.isArray(rows) ? rows : []).map((r) => (r ?? {}) as Record<string, unknown>);
}

async function metaFor(a: BenchAccount) {
  if (!a.facebook) return { pageId: null, statusText: null, ads: [] as MetaAd[], note: 'No Facebook Page is linked from the website.' };
  const profile = await executeTool('SCRAPECREATORS_GET_FACEBOOK_PROFILE', { url: a.facebook, cache_max_age: '7d' });
  const lib = findKey<Record<string, unknown>>(profile, 'adLibrary');
  const pageId = lib?.pageId ? String(lib.pageId) : null;
  const statusText = typeof lib?.adStatus === 'string' ? lib.adStatus : null;
  if (!pageId) return { pageId, statusText, ads: [], note: 'The Page has no Ad Library id.' };
  const list = await executeTool('SCRAPECREATORS_LIST_FACEBOOK_COMPANY_ADS', { page_id: pageId, status: 'ALL', country: 'ALL', trim: true });
  return { pageId, statusText, ads: adRows(list).map(toMetaAd), note: null };
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
  const rows = findKey<Record<string, unknown>[]>(data, 'metrics') ?? [];
  return rows.slice(-12).map((r) => ({
    month: String(r.date ?? '').slice(0, 7),
    paid_traffic: Number(r.paid_traffic ?? 0) || 0,
    // Ahrefs money is in US cents.
    paid_traffic_value_usd: (Number(r.paid_cost ?? 0) || 0) / 100,
  }));
}

export async function runAdsLibrary(ctx: StepContext) {
  const accounts = benchAccounts(ctx);
  const evidence: AdLibraryEvidence[] = await Promise.all(
    accounts.map(async (a): Promise<AdLibraryEvidence> => {
      const errors: string[] = [];
      const meta = await metaFor(a).catch((err) => {
        if (err instanceof PermanentStepError) throw err;
        errors.push(`Meta: ${err instanceof Error ? err.message : String(err)}`);
        return { pageId: null, statusText: null, ads: [] as MetaAd[], note: null };
      });
      const history = a.domain
        ? await paidHistory(a.domain).catch((err) => {
            errors.push(`Ahrefs: ${err instanceof Error ? err.message : String(err)}`);
            return [];
          })
        : [];
      return {
        name: a.name,
        domain: a.domain,
        facebook_page_id: meta.pageId,
        meta_ad_status: metaAdStatus(meta.statusText, meta.ads, meta.pageId),
        meta_ads: meta.ads.slice(0, 10),
        meta_ads_inactive_n: meta.ads.filter((x) => !x.active).length,
        google_ads_status: 'unknown',
        google_ads_count: null,
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

  // Google's Transparency Center has no API; one headless read per domain, in one browser.
  const domains = evidence.filter((e) => e.domain);
  if (domains.length && ctx.deadline - Date.now() > 60_000) {
    await withBrowser(async (browser) => {
      for (const e of domains) {
        if (ctx.deadline - Date.now() < 25_000) break;
        const page = await browser.newPage();
        try {
          await page.goto(`https://adstransparency.google.com/?region=US&domain=${encodeURIComponent(e.domain!)}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
          await new Promise((r) => setTimeout(r, TRANSPARENCY_WAIT_MS));
          const read = transparencyStatus(await page.evaluate(() => document.body?.innerText ?? ''));
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
    source: 'Meta Ad Library (by Page id, via ScrapeCreators), Google Ads Transparency Center, Ahrefs paid-search history (US)',
    fetched_at: new Date().toISOString(),
    business,
    competitors,
  };
}
