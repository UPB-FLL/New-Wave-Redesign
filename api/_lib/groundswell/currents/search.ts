import { executeTool, findKey } from '../composio.js';
import type { StepContext } from '../types.js';
import type { SiteScan } from './site.js';

/**
 * Search Current: Ahrefs (through Composio) for the business and its rivals'
 * websites, and Google Ads Keyword Planner volumes and bids for the area.
 * Ahrefs money values are USD cents; Keyword Planner bids are micros.
 */

export const domainOf = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
};

const today = () => new Date().toISOString().slice(0, 10);
const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)) ? Number(v) : null);

export interface AhrefsSnapshot {
  domain: string;
  domain_rating: number | null;
  organic_keywords: number | null;
  organic_traffic: number | null;
  traffic_value_usd: number | null;
  paid_keywords: number | null;
  top_keywords: { keyword: string; volume: number | null; position: number | null; traffic: number | null; url: string | null }[];
  error: string | null;
}

async function ahrefsFor(domain: string, deep: boolean): Promise<AhrefsSnapshot> {
  const base = { target: domain, date: today(), country: 'us', mode: 'subdomains' as const };
  const snap: AhrefsSnapshot = {
    domain,
    domain_rating: null,
    organic_keywords: null,
    organic_traffic: null,
    traffic_value_usd: null,
    paid_keywords: null,
    top_keywords: [],
    error: null,
  };
  try {
    const [dr, metrics] = await Promise.all([
      executeTool('AHREFS_DOMAIN_RATING_FOR_SITE_EXPLORER', { target: domain, date: today() }),
      executeTool('AHREFS_RETRIEVE_SITE_EXPLORER_METRICS', base),
    ]);
    const drObj = findKey<unknown>(dr, 'domain_rating');
    snap.domain_rating = n(typeof drObj === 'object' ? findKey(drObj, 'domain_rating') : drObj);
    snap.organic_keywords = n(findKey(metrics, 'org_keywords'));
    snap.organic_traffic = n(findKey(metrics, 'org_traffic'));
    const cost = n(findKey(metrics, 'org_cost'));
    snap.traffic_value_usd = cost === null ? null : cost / 100;
    snap.paid_keywords = n(findKey(metrics, 'paid_keywords'));
    if (deep) {
      const kw = await executeTool('AHREFS_RETRIEVE_ORGANIC_KEYWORDS', {
        ...base,
        select: 'keyword,volume,best_position,sum_traffic,best_position_url',
        order_by: 'sum_traffic:desc',
        limit: 30,
      });
      const rows = findKey<Record<string, unknown>[]>(kw, 'keywords') ?? [];
      snap.top_keywords = rows.map((r) => ({
        keyword: String(r.keyword ?? ''),
        volume: n(r.volume),
        position: n(r.best_position),
        traffic: n(r.sum_traffic),
        url: typeof r.best_position_url === 'string' ? r.best_position_url : null,
      }));
    }
  } catch (err) {
    snap.error = err instanceof Error ? err.message : String(err);
  }
  return snap;
}

export async function runSearch(ctx: StepContext) {
  const site = ctx.outputs.site as { business: SiteScan | null; competitors: { name: string; site: SiteScan | null }[] } | undefined;
  const domain = domainOf(site?.business?.final_url ?? ctx.audit.website);
  const business = domain ? await ahrefsFor(domain, true) : null;
  if (business?.error && /refused|not connected|no active connection|not set up/i.test(business.error)) {
    throw new Error(business.error);
  }
  const rivals = ctx.audit.competitors
    .map((c) => ({ name: c.name, domain: domainOf(c.website) }))
    .filter((c): c is { name: string; domain: string } => Boolean(c.domain))
    .slice(0, 6);
  const competitors = await Promise.all(rivals.map(async (c) => ({ name: c.name, ...(await ahrefsFor(c.domain, false)) })));
  return { source: 'Ahrefs Site Explorer (US), via Composio', fetched_at: new Date().toISOString(), business, competitors };
}

export interface KeywordIdea {
  keyword: string;
  monthly_searches: number | null;
  competition: string | null;
  low_bid_usd: number | null;
  high_bid_usd: number | null;
}

/** Reads ideas whether the payload uses snake_case or camelCase. */
export function parseKeywordIdeas(payload: unknown): KeywordIdea[] {
  const rows = findKey<Record<string, unknown>[]>(payload, 'results') ?? [];
  return rows
    .map((r) => {
      const m = (r.keyword_idea_metrics ?? r.keywordIdeaMetrics ?? {}) as Record<string, unknown>;
      const micros = (v: unknown) => {
        const x = n(v);
        return x === null ? null : x / 1_000_000;
      };
      return {
        keyword: String(r.text ?? ''),
        monthly_searches: n(m.avg_monthly_searches ?? m.avgMonthlySearches),
        competition: (m.competition as string) ?? null,
        low_bid_usd: micros(m.low_top_of_page_bid_micros ?? m.lowTopOfPageBidMicros),
        high_bid_usd: micros(m.high_top_of_page_bid_micros ?? m.highTopOfPageBidMicros),
      };
    })
    .filter((k) => k.keyword);
}

export async function runKeywords(ctx: StepContext) {
  const maps = ctx.outputs.maps as { business?: { category?: string | null } | null } | undefined;
  const site = ctx.outputs.site as { business: SiteScan | null } | undefined;
  const category = maps?.business?.category || null;
  const seeds = [category, category && ctx.audit.city ? `${category} ${ctx.audit.city.split(',')[0]}` : null, ...(site?.business?.h1 ?? []).slice(0, 2)]
    .filter((s): s is string => Boolean(s && s.length < 80))
    .slice(0, 5);
  const url = site?.business?.final_url ?? ctx.audit.website;
  if (!url && seeds.length === 0) return { skipped: 'No website or category to seed Keyword Planner with.', ideas: [] };

  const geo = (process.env.GROUNDSWELL_GEO_TARGETS || 'geoTargetConstants/200528')
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean);
  const args: Record<string, unknown> = {
    language: 'languageConstants/1000',
    geo_target_constants: geo,
    keyword_plan_network: 'GOOGLE_SEARCH',
    page_size: 60,
    historical_metrics_options: { include_average_cpc: true },
  };
  if (process.env.GOOGLE_ADS_CUSTOMER_ID) args.customer_id = process.env.GOOGLE_ADS_CUSTOMER_ID;
  if (url && seeds.length) args.keyword_and_url_seed = { url, keywords: seeds };
  else if (url) args.url_seed = { url };
  else args.keyword_seed = { keywords: seeds };

  const ideas = parseKeywordIdeas(await executeTool('GOOGLEADS_GENERATE_KEYWORD_IDEAS', args))
    .sort((a, b) => (b.monthly_searches ?? 0) - (a.monthly_searches ?? 0))
    .slice(0, 50);
  return {
    source: `Google Ads Keyword Planner (${geo.join(', ') || 'all locations'}, English, Google Search), via Composio`,
    fetched_at: new Date().toISOString(),
    seeds,
    ideas,
  };
}
