import { GROUNDSWELL_CONFIG } from '../../../packages/groundswell/groundswell.config.js';
import { PHASE_INFO } from '../../../src/lib/groundswellValidation.js';
import { repriceWithActuals, type AccountActuals, type Repriced } from '../../../packages/groundswell/src/actuals.js';
import { buildAdPlan } from '../../../packages/groundswell/src/adplan.js';
import { claimsIn } from '../../../packages/groundswell/src/templates.js';
import { copyFacts } from './adcopy.js';
import { isAdplanOutput, type AdplanOutput } from './adplan.js';
import { isLinkedOutput, type GaData, type GoogleAdsData, type GscData, type InstagramData, type LinkedOutput, type MetaAdsData, type SearchTerm, type SearchTermsData } from './currents/linked.js';
import { buildFacts, numbersIn, unsupportedNumbers } from './model.js';
import { chatJson, GROUNDSWELL_MODEL } from './openai.js';
import { PermanentStepError, type StepContext } from './types.js';

/**
 * Integrated step (phase 3): the plan once a client's own accounts are
 * linked. In code: the ad plan re-priced on the accounts' own cost per click
 * and Meta's own cost per lead (packages/groundswell/src/actuals.ts), and the
 * search terms sorted into what converts and what spends without converting.
 * One OpenAI call writes the findings, the next steps and the keyword map
 * (each Keyword Planner idea or search term given a verdict), held to the
 * figures in code: a sentence with a number not in the data is dropped, a
 * keyword not copied exactly from the data is dropped.
 */

export const VERDICTS = ['buy', 'test', 'exact only', 'content', 'exclude'] as const;
export type Verdict = (typeof VERDICTS)[number];

export interface Opportunity {
  keyword: string;
  bucket: string;
  verdict: Verdict;
  reason: string;
  monthly_searches: number | null;
  competition: string | null;
  low_bid_usd: number | null;
  high_bid_usd: number | null;
}

export interface IntegratedOutput {
  model: string | null;
  generated_at: string;
  window: LinkedOutput['window'] | null;
  services: { service: string; label: string; ok: boolean; source: string; problem: string | null }[];
  actuals: AccountActuals;
  repricing: { google: Repriced['google']; meta: Repriced['meta']; notes: string[] };
  /** The plan re-priced (the ad-sets step builds phase 3's sets from it); null when phase 1 had no plan. */
  adplan: AdplanOutput | null;
  search_terms: { top: SearchTerm[]; converting: SearchTerm[]; wasted: SearchTerm[]; wasted_cost: number; totals: SearchTermsData['totals'] } | null;
  opportunities: Opportunity[];
  writeup: { headline: string; findings: { title: string; text: string }[]; next_steps: { title: string; text: string }[] };
  dropped: string[];
}

export const isIntegratedOutput = (x: unknown): x is IntegratedOutput => Boolean(x && Array.isArray((x as IntegratedOutput).services) && (x as IntegratedOutput).writeup);

const dataOf = <T>(l: LinkedOutput | null, service: string) => (l?.services.find((s) => s.service === service && s.ok)?.data ?? null) as T | null;

export function actualsFrom(linked: LinkedOutput | null): AccountActuals {
  const g = dataOf<GoogleAdsData>(linked, 'googleads');
  const m = dataOf<MetaAdsData>(linked, 'metaads');
  return {
    google: g ? { clicks: g.totals.clicks, cost: g.totals.cost, conversions: g.totals.conversions } : null,
    meta: m?.totals ? { clicks: m.totals.clicks, spend: m.totals.spend, leads: m.totals.leads } : null,
  };
}

/** The search terms in three lists: what spent most, what converted, and what spent without converting. */
export function sortTerms(data: SearchTermsData | null): IntegratedOutput['search_terms'] {
  if (!data || !data.terms.length) return null;
  const byCost = [...data.terms].sort((a, b) => b.cost - a.cost);
  const wasted = byCost.filter((t) => t.cost > 0 && t.conversions === 0);
  return {
    top: byCost.slice(0, 15),
    converting: [...data.terms].filter((t) => t.conversions > 0).sort((a, b) => b.conversions - a.conversions).slice(0, 10),
    wasted: wasted.slice(0, 15),
    wasted_cost: Math.round(wasted.reduce((a, t) => a + t.cost, 0) * 100) / 100,
    totals: data.totals,
  };
}

export const INTEGRATED_SYSTEM = `You review a small business's own marketing accounts for New Wave: Social Engineering's Groundswell engine, after an audit from public data.
You get its Google Analytics, Search Console, Google Ads, Instagram and Meta figures (whichever are linked), the searches behind its Google ads, Keyword Planner's ideas, and the plan's notes.
Return JSON only:
{"headline": one sentence on what the accounts show,
 "findings": up to 5 of {"title": a short claim, "text": two or three sentences with the figures that support it},
 "next_steps": up to 4 of {"title": a few words, "text": one or two sentences},
 "buckets": up to 6 of {"name": 1-4 words, a group of searches by intent},
 "keywords": up to 30 of {"keyword": copied exactly from keyword_ideas or search_terms, "bucket": one bucket name, "verdict": one of ${VERDICTS.map((v) => `"${v}"`).join(', ')}, "reason": a few words}}
Rules:
- Use only figures in the data. Do not write a number that is not in the data.
- Say plainly when a figure cannot be trusted (conversions that count page views, a tracking gap) and what would confirm it.
- "buy" for searches the business serves and should pay for; "test" for mixed intent; "exact only" where a broad match would buy the wrong searches; "content" for questions better won with an article than an ad; "exclude" for searches the business does not serve.
- Never use these words or claims: ${GROUNDSWELL_CONFIG.unsupported_claims.join(', ')}. No competitor names.`;

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max).trim() : '');

export function integratedInput(ctx: StepContext, linked: LinkedOutput | null, terms: IntegratedOutput['search_terms'], plan: AdplanOutput | null, notes: string[]) {
  const f = buildFacts(ctx.audit, ctx.outputs);
  return {
    business: copyFacts(f),
    window: linked?.window ?? null,
    google_analytics: dataOf<GaData>(linked, 'google_analytics'),
    search_console: dataOf<GscData>(linked, 'google_search_console'),
    google_ads: dataOf<GoogleAdsData>(linked, 'googleads'),
    instagram: dataOf<InstagramData>(linked, 'instagram'),
    meta_ads: dataOf<MetaAdsData>(linked, 'metaads'),
    not_read: (linked?.services ?? []).filter((s) => !s.ok).map((s) => ({ service: s.label, why: s.problem })),
    search_terms: terms ? { top: terms.top, converting: terms.converting, wasted: terms.wasted, wasted_cost: terms.wasted_cost } : null,
    keyword_ideas: (f.keywords?.ideas ?? []).slice(0, 50),
    plan_keywords: plan ? plan.angles.flatMap((a) => a.keywords.map((k) => k.keyword)) : [],
    plan_notes: notes,
  };
}

export function checkIntegrated(raw: Record<string, unknown>, input: ReturnType<typeof integratedInput>): { writeup: IntegratedOutput['writeup']; opportunities: Opportunity[]; dropped: string[] } {
  const allowed = numbersIn(input);
  const dropped: string[] = [];
  const ok = (text: string, where: string) => {
    if (!text) return false;
    const bad = unsupportedNumbers(text, allowed);
    if (bad.length) {
      dropped.push(`${where}: "${text}" (number not in the data: ${bad.join(', ')})`);
      return false;
    }
    const claims = claimsIn(text, GROUNDSWELL_CONFIG.unsupported_claims);
    if (claims.length) {
      dropped.push(`${where}: "${text}" (claim not allowed: ${claims.join(', ')})`);
      return false;
    }
    return true;
  };
  const pairs = (v: unknown, max: number, where: string) =>
    (Array.isArray(v) ? v : [])
      .slice(0, max)
      .map((x) => ({ title: str((x as Record<string, unknown>)?.title, 90), text: str((x as Record<string, unknown>)?.text, 600) }))
      .filter((x, i) => ok(x.title, `${where} ${i + 1}`) && ok(x.text, `${where} ${i + 1}`));
  const headline = str(raw.headline, 160);
  const writeup = {
    headline: ok(headline, 'Headline') ? headline : '',
    findings: pairs(raw.findings, 5, 'Finding'),
    next_steps: pairs(raw.next_steps, 4, 'Next step'),
  };

  const ideas = new Map(input.keyword_ideas.map((k) => [k.keyword.toLowerCase(), k]));
  const termWords = new Set([...(input.search_terms?.top ?? []), ...(input.search_terms?.wasted ?? []), ...(input.search_terms?.converting ?? [])].map((t) => t.term.toLowerCase()));
  const buckets = new Set((Array.isArray(raw.buckets) ? raw.buckets : []).map((b) => str((b as Record<string, unknown>)?.name, 40)).filter(Boolean));
  const seen = new Set<string>();
  const opportunities: Opportunity[] = [];
  for (const k of Array.isArray(raw.keywords) ? raw.keywords.slice(0, 30) : []) {
    const r = k as Record<string, unknown>;
    const keyword = str(r.keyword, 80);
    const key = keyword.toLowerCase();
    const verdict = str(r.verdict, 20).toLowerCase() as Verdict;
    if (!keyword || seen.has(key)) continue;
    if (!ideas.has(key) && !termWords.has(key)) {
      dropped.push(`Keyword "${keyword}": not in Keyword Planner's ideas or the search terms.`);
      continue;
    }
    if (!VERDICTS.includes(verdict)) continue;
    seen.add(key);
    const idea = ideas.get(key);
    const bucket = str(r.bucket, 40);
    opportunities.push({
      keyword: idea?.keyword ?? keyword,
      bucket: buckets.has(bucket) ? bucket : bucket || 'Other',
      verdict,
      reason: ok(str(r.reason, 80), `Reason for ${keyword}`) ? str(r.reason, 80) : '',
      monthly_searches: idea?.monthly_searches ?? null,
      competition: idea?.competition ?? null,
      low_bid_usd: idea?.low_bid_usd ?? null,
      high_bid_usd: idea?.high_bid_usd ?? null,
    });
  }
  return { writeup, opportunities, dropped };
}

export async function runIntegrated(ctx: StepContext): Promise<IntegratedOutput> {
  const linked = isLinkedOutput(ctx.outputs.linked) ? ctx.outputs.linked : null;
  if (!linked || !linked.services.some((s) => s.ok)) {
    throw new PermanentStepError(linked?.note ?? 'None of the client’s linked accounts could be read, so there is nothing to integrate yet.');
  }
  const terms = sortTerms((ctx.outputs.search_terms as SearchTermsData | undefined) ?? null);
  const actuals = actualsFrom(linked);
  const phase1 = isAdplanOutput(ctx.outputs.adplan) ? ctx.outputs.adplan : null;
  const window = linked.window ? `${linked.window.start} – ${linked.window.end}` : 'the last 30 days';

  let adplan: AdplanOutput | null = null;
  let repricing: IntegratedOutput['repricing'] = { google: null, meta: null, notes: [`${PHASE_INFO.audit.title} built no ad plan, so there is nothing to re-price.`] };
  if (phase1) {
    const config = GROUNDSWELL_CONFIG;
    const industry = config.industries.find((i) => i.id === phase1.industry.id) ?? config.industries.find((i) => i.id === 'general')!;
    const r = repriceWithActuals(config, industry, phase1.angles, actuals, window);
    adplan = { ...phase1, generated_at: new Date().toISOString(), angles: r.angles, plan: buildAdPlan(r.angles, industry, r.config) };
    repricing = { google: r.google, meta: r.meta, notes: r.notes };
  }

  const input = integratedInput(ctx, linked, terms, adplan, repricing.notes);
  // A write-up that fails is retried by the engine; the figures are read again with it.
  const timeout = Math.max(20_000, Math.min(120_000, ctx.deadline - Date.now() - 10_000));
  const raw = await chatJson<Record<string, unknown>>(INTEGRATED_SYSTEM, `Data (JSON):\n${JSON.stringify(input)}`, timeout);
  const { writeup, opportunities, dropped } = checkIntegrated(raw, input);
  return {
    model: GROUNDSWELL_MODEL(),
    generated_at: new Date().toISOString(),
    window: linked.window ?? null,
    services: linked.services.map((s) => ({ service: s.service, label: s.label, ok: s.ok, source: s.source, problem: s.problem })),
    actuals,
    repricing,
    adplan,
    search_terms: terms,
    opportunities,
    writeup,
    dropped,
  };
}
