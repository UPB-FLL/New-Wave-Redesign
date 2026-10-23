import { executeTool, findKey } from '../composio.js';
import { isConsumerConfigured } from '../composioConsumer.js';
import { resolveKeywordGeography } from '../keywordsGeography.js';
import type { StepContext } from '../types.js';
import type { SiteScan } from './site.js';
import { categoryFromSite, readGoogleSerp, specificCategory, type GoogleSerp } from './serp.js';

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
  const errors: string[] = [];
  const [dr, metrics] = await Promise.allSettled([
    executeTool('AHREFS_DOMAIN_RATING_FOR_SITE_EXPLORER', { target: domain, date: today() }),
    executeTool('AHREFS_RETRIEVE_SITE_EXPLORER_METRICS', base),
  ]);
  if (dr.status === 'fulfilled') {
    const drObj = findKey<unknown>(dr.value, 'domain_rating');
    snap.domain_rating = n(typeof drObj === 'object' ? findKey(drObj, 'domain_rating') : drObj);
  } else errors.push(`Domain rating: ${dr.reason instanceof Error ? dr.reason.message : String(dr.reason)}`);
  if (metrics.status === 'fulfilled') {
    snap.organic_keywords = n(findKey(metrics.value, 'org_keywords'));
    snap.organic_traffic = n(findKey(metrics.value, 'org_traffic'));
    const cost = n(findKey(metrics.value, 'org_cost'));
    snap.traffic_value_usd = cost === null ? null : cost / 100;
    snap.paid_keywords = n(findKey(metrics.value, 'paid_keywords'));
    if ([snap.organic_keywords, snap.organic_traffic, snap.paid_keywords].every((v) => v === null)) errors.push('Ahrefs returned no recognizable site metrics.');
  } else errors.push(`Site metrics: ${metrics.reason instanceof Error ? metrics.reason.message : String(metrics.reason)}`);
  if (deep) {
    try {
      const kw = await executeTool('AHREFS_RETRIEVE_ORGANIC_KEYWORDS', { ...base, select: 'keyword,volume,best_position,sum_traffic,best_position_url', order_by: 'sum_traffic:desc', limit: 30 });
      const raw = findKey<unknown>(kw, 'keywords');
      const rows = Array.isArray(raw) ? raw.filter((r): r is Record<string, unknown> => Boolean(r && typeof r === 'object')) : [];
      snap.top_keywords = rows.map((r) => ({ keyword: String(r.keyword ?? ''), volume: n(r.volume), position: n(r.best_position), traffic: n(r.sum_traffic), url: typeof r.best_position_url === 'string' ? r.best_position_url : null })).filter((r) => r.keyword);
      if (!Array.isArray(raw)) errors.push('Ahrefs returned no recognizable keyword list.');
    } catch (err) { errors.push(`Organic keywords: ${err instanceof Error ? err.message : String(err)}`); }
  }
  snap.error = errors.join(' ') || null;
  return snap;
}

export async function runSearch(ctx: StepContext) {
  const site = ctx.outputs.site as { business: SiteScan | null; competitors: { name: string; site: SiteScan | null }[] } | undefined;
  const domain = domainOf(site?.business?.final_url ?? ctx.audit.website);
  const business = domain ? await ahrefsFor(domain, true) : null;
  const rivals = ctx.audit.competitors
    .map((c) => ({ name: c.name, domain: domainOf(c.website) }))
    .filter((c): c is { name: string; domain: string } => Boolean(c.domain))
    .slice(0, 6);
  const competitors = await Promise.all(rivals.map(async (c) => ({ name: c.name, ...(await ahrefsFor(c.domain, false)) })));
  const category = searchCategory(ctx);
  const listing = ctx.outputs.maps as { business?: { name?: string | null } | null } | undefined;
  const lookupName = listing?.business?.name?.trim() || ctx.audit.business_name;
  const queries = [...new Set([[lookupName, ctx.audit.city].filter(Boolean).join(' '), category ? [category, ctx.audit.city].filter(Boolean).join(' ') : null].filter((q): q is string => Boolean(q)))];
  const observed = await Promise.all(queries.slice(0, 2).map((q) => readGoogleSerp(q, ctx.audit.city)));
  const serp = { queries: observed, note: 'Positions describe the captured Google query, location and date only. Places relevance and review counts are not search rankings.' };
  return { source: 'Ahrefs Site Explorer (US) and query-specific public Google Search observations, via Composio', fetched_at: new Date().toISOString(), business, competitors, serp };
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
  const raw = findKey<unknown>(payload, 'results');
  const rows = Array.isArray(raw) ? raw.filter((r): r is Record<string, unknown> => Boolean(r && typeof r === 'object')) : [];
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
        competition: typeof m.competition === 'string' ? m.competition : null,
        low_bid_usd: micros(m.low_top_of_page_bid_micros ?? m.lowTopOfPageBidMicros),
        high_bid_usd: micros(m.high_top_of_page_bid_micros ?? m.highTopOfPageBidMicros),
      };
    })
    .filter((k) => k.keyword);
}

/** Industry seeds are taken from verified listing or first-party page wording, not inferred from a brand name. */
function searchCategory(ctx: StepContext): string | null {
  const maps = ctx.outputs.maps as { business?: { category?: string | null } | null } | undefined;
  const site = ctx.outputs.site as { business?: SiteScan | null } | undefined;
  const competitor = ctx.outputs.competitors as { business?: { category?: string | null } | null } | undefined;
  return categoryFromSite(site?.business) || specificCategory(competitor?.business?.category) || specificCategory(maps?.business?.category);
}

export async function runKeywords(ctx: StepContext) {
  const remaining = (cap = 90_000) => Math.max(0, Math.min(cap, ctx.deadline - Date.now() - 1_500));
  const budget = () => {
    const ms = remaining();
    if (ms <= 0) throw new Error('Keyword research reached the worker time limit.');
    return ms;
  };
  const site = ctx.outputs.site as { business: SiteScan | null } | undefined;
  const category = searchCategory(ctx);
  const seeds = [...new Set([category, category && ctx.audit.city ? `${category} ${ctx.audit.city.split(',')[0]}` : null, ...(site?.business?.h1 ?? []).slice(0, 2)]
    .filter((s): s is string => Boolean(s && s.length < 80 && specificCategory(s))))].slice(0, 5);
  const url = site?.business?.final_url ?? ctx.audit.website;
  if (!url && seeds.length === 0) return { skipped: 'No website or verified category to seed Keyword Planner with.', source: 'Keyword Planner', fetched_at: new Date().toISOString(), seeds, ideas: [] as KeywordIdea[], demand_status: 'unavailable' as const, error: 'No website or category was available.' };

  const configured = (process.env.GROUNDSWELL_GEO_TARGETS || '').split(',').map(g => g.trim()).filter(g => /^geoTargetConstants\/\d+$/.test(g)).slice(0, 10);
  // A city in keyword seed text does not select the Planner market. Resolve
  // the actual city, and never substitute an unrelated global default.
  const geography = !ctx.audit.city?.trim() && configured.length
    ? { constants: configured, label: `Configured targets: ${configured.join(', ')}`, error: null }
    : remaining(10_000) > 0
      ? await resolveKeywordGeography(ctx.audit.city, remaining(10_000))
      : { constants: [] as string[], label: ctx.audit.city || 'Unresolved location', error: 'Keyword research reached the worker time limit.' };
  const geo = geography.constants;
  const args: Record<string, unknown> = {
    language: 'languageConstants/1000', geo_target_constants: geo, keyword_plan_network: 'GOOGLE_SEARCH', page_size: 60,
    historical_metrics_options: { include_average_cpc: true },
  };
  if (process.env.GOOGLE_ADS_CUSTOMER_ID) args.customer_id = process.env.GOOGLE_ADS_CUSTOMER_ID;
  if (url && seeds.length) args.keyword_and_url_seed = { url, keywords: seeds };
  else if (url) args.url_seed = { url };
  else args.keyword_seed = { keywords: seeds };
  const plannerSource = `Google Ads Keyword Planner (${geography.label || 'unresolved geography'}; ${geo.join(', ') || 'no verified target'}, English, Google Search), via Composio`;
  let error: string | null = null;
  let ideas: KeywordIdea[] = [];
  try {
    if (geography.error || !geo.length) throw new Error(geography.error || 'The business geography could not be verified.');
    let payload: unknown;
    try { payload = await executeTool('GOOGLEADS_GENERATE_KEYWORD_IDEAS', args, budget()); }
    catch (err) {
      // A consumer login may not reach the project's customer; its own default can still plan.
      if (!(args.customer_id && isConsumerConfigured())) throw err;
      const { customer_id: _unused, ...rest } = args;
      void _unused;
      payload = await executeTool('GOOGLEADS_GENERATE_KEYWORD_IDEAS', rest, budget());
    }
    ideas = parseKeywordIdeas(payload).sort((a, b) => (b.monthly_searches ?? -1) - (a.monthly_searches ?? -1)).slice(0, 50);
    if (ideas.some((i) => i.monthly_searches !== null)) return { source: plannerSource, fetched_at: new Date().toISOString(), geography, seeds, ideas, demand_status: 'measured' as const, error: null };
    error = 'Keyword Planner returned no measured monthly search volumes.';
  } catch (err) { error = `Keyword Planner: ${err instanceof Error ? err.message : String(err)}`; }

  // Public related queries are useful research, but cannot fill Planner's volume or CPC fields.
  const search = ctx.outputs.search as { serp?: { queries?: GoogleSerp[] } } | undefined;
  let observations = search?.serp?.queries?.filter((q) => !q.error && q.related_searches.length) ?? [];
  if (!observations.length && remaining() > 0) observations = [await readGoogleSerp([category || seeds[0] || ctx.audit.business_name, ctx.audit.city].filter(Boolean).join(' '), ctx.audit.city, budget())];
  const suggestions = [...new Set(observations.flatMap((q) => q.related_searches))].slice(0, 20);
  const known = new Set(ideas.map((i) => i.keyword.toLowerCase()));
  for (const keyword of suggestions) if (!known.has(keyword.toLowerCase())) ideas.push({ keyword, monthly_searches: null, competition: null, low_bid_usd: null, high_bid_usd: null });
  return {
    source: suggestions.length ? `${plannerSource}; Google Search related queries (US, English), via SerpApi` : plannerSource,
    fetched_at: new Date().toISOString(), geography, seeds, ideas, demand_status: 'unavailable' as const, error,
    note: 'These are query suggestions, not measured search volumes or bid estimates. A demand-based ad plan needs measured Keyword Planner data.',
    suggestion_sources: observations.map((q) => ({ query: q.query, location: q.location, captured_at: q.captured_at, source_url: q.source_url, error: q.error })),
  };
}
