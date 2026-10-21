import { executeTool, findKey } from '../composio.js';
import type { StepContext } from '../types.js';
import { domainOf } from './search.js';
import type { SiteScan } from './site.js';

/**
 * Ads Current: evidence of paid advertising. Tracking tags come from the Site
 * Current (Google Ads AW- tags, Meta and TikTok pixels); paid search pages and
 * keywords from Ahrefs through Composio.
 */

export interface AdsEvidence {
  name: string;
  domain: string | null;
  google_ads_tag: boolean;
  meta_pixel: boolean;
  tiktok_pixel: boolean;
  paid_pages: { url: string; keywords: number | null; traffic: number | null }[];
  error: string | null;
}

const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

async function paidPages(domain: string) {
  const data = await executeTool('AHREFS_RETRIEVE_PAID_PAGES_DATA', {
    target: domain,
    date: new Date().toISOString().slice(0, 10),
    country: 'us',
    select: 'url,keywords,sum_traffic',
    order_by: 'sum_traffic:desc',
    limit: 10,
  });
  const rows = findKey<Record<string, unknown>[]>(data, 'pages') ?? [];
  return rows.map((r) => ({ url: String(r.url ?? ''), keywords: n(r.keywords), traffic: n(r.sum_traffic) })).filter((r) => r.url);
}

async function evidence(name: string, site: SiteScan | null): Promise<AdsEvidence> {
  const domain = domainOf(site?.final_url ?? site?.url);
  const out: AdsEvidence = {
    name,
    domain,
    google_ads_tag: Boolean(site?.tracking.google_ads.length),
    meta_pixel: Boolean(site?.tracking.meta_pixel),
    tiktok_pixel: Boolean(site?.tracking.tiktok_pixel),
    paid_pages: [],
    error: null,
  };
  if (!domain) return out;
  try {
    out.paid_pages = await paidPages(domain);
  } catch (err) {
    out.error = err instanceof Error ? err.message : String(err);
  }
  return out;
}

export async function runAds(ctx: StepContext) {
  const site = ctx.outputs.site as { business: SiteScan | null; competitors: { name: string; site: SiteScan | null }[] } | undefined;
  const business = await evidence(ctx.audit.business_name, site?.business ?? null);
  const competitors = await Promise.all((site?.competitors ?? []).slice(0, 6).map((c) => evidence(c.name, c.site)));
  return {
    source: 'Website tags (Site Current) and Ahrefs paid pages (US), via Composio',
    fetched_at: new Date().toISOString(),
    business,
    competitors,
  };
}
