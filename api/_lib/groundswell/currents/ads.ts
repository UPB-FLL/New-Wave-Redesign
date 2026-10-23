import { executeTool, findKey } from '../composio.js';
import type { StepContext } from '../types.js';
import { domainOf } from './search.js';
import type { SiteScan } from './site.js';
import { numeric } from './serp.js';

/**
 * Ads Current: evidence of paid advertising. Tracking tags come from the Site
 * Current (Google Ads AW- tags, Meta and TikTok pixels); paid search pages and
 * keywords from Ahrefs through Composio.
 */

export interface AdsEvidence {
  name: string;
  domain: string | null;
  /** False means tags were not read; false tag flags then cannot establish absence. */
  website_checked: boolean;
  google_ads_tag: boolean;
  meta_pixel: boolean;
  tiktok_pixel: boolean;
  paid_pages: { url: string; keywords: number | null; traffic: number | null }[];
  error: string | null;
}

const n = numeric;

async function paidPages(domain: string) {
  const data = await executeTool('AHREFS_RETRIEVE_PAID_PAGES_DATA', {
    target: domain,
    date: new Date().toISOString().slice(0, 10),
    country: 'us',
    select: 'url,keywords,sum_traffic',
    order_by: 'sum_traffic:desc',
    limit: 10,
  });
  const raw = findKey<unknown>(data, 'pages');
  if (!Array.isArray(raw)) throw new Error('Ahrefs returned no recognizable paid-pages list.');
  const rows = raw.filter((r): r is Record<string, unknown> => Boolean(r && typeof r === 'object'));
  return rows.map((r) => ({ url: String(r.url ?? ''), keywords: n(r.keywords), traffic: n(r.sum_traffic) })).filter((r) => r.url);
}

async function evidence(name: string, site: SiteScan | null, website?: string | null): Promise<AdsEvidence> {
  const domain = domainOf(site?.final_url ?? site?.url ?? website);
  const websiteChecked = Boolean(site && !site.error && site.status !== null && site.status >= 200 && site.status < 400);
  const out: AdsEvidence = {
    name,
    domain,
    website_checked: websiteChecked,
    google_ads_tag: Boolean(site?.tracking.google_ads.length),
    meta_pixel: Boolean(site?.tracking.meta_pixel),
    tiktok_pixel: Boolean(site?.tracking.tiktok_pixel),
    paid_pages: [],
    error: websiteChecked ? null : 'Website tags were not read successfully; tag absence cannot be established.',
  };
  if (!domain) return out;
  try {
    out.paid_pages = await paidPages(domain);
  } catch (err) {
    out.error = [out.error, err instanceof Error ? err.message : String(err)].filter(Boolean).join(' ');
  }
  return out;
}

export async function runAds(ctx: StepContext) {
  const site = ctx.outputs.site as { business: SiteScan | null; competitors: { name: string; site: SiteScan | null }[] } | undefined;
  const business = await evidence(ctx.audit.business_name, site?.business ?? null, ctx.audit.website);
  const competitors = await Promise.all(ctx.audit.competitors.slice(0, 6).map((c) => evidence(c.name, site?.competitors.find((s) => s.name === c.name)?.site ?? null, c.website)));
  return {
    source: 'Website tags (Site Current) and Ahrefs paid pages (US), via Composio',
    scope: 'Tracking tags show instrumentation; Ahrefs shows estimated paid-search visibility. These sources cannot establish campaign status, spend or a verified absence of advertising.',
    fetched_at: new Date().toISOString(),
    business,
    competitors,
  };
}
