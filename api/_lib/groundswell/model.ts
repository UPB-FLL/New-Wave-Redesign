import { chatJson, GROUNDSWELL_MODEL } from './openai.js';
import { runRoiModel, type RoiInputs, type RoiResult, type RoiScenarioInputs } from './roi.js';
import { PermanentStepError, type AuditRow, type StepContext } from './types.js';
import type { SiteScan } from './currents/site.js';
import type { MapsListing, MapsPlace } from './currents/maps.js';
import type { AhrefsSnapshot, KeywordIdea } from './currents/search.js';
import type { SocialOutput } from './currents/social.js';
import type { AdsEvidence } from './currents/ads.js';
import { isLinkedOutput, type LinkedOutput } from './currents/linked.js';

/**
 * Model step: turns the Currents' data into the audit's write-up (OpenAI) and
 * models the return on one change, Google Search ads (roi.ts).
 *
 * The write-up may only quote numbers that are in the gathered data. Any
 * sentence with another number gets one repair call, and is dropped if the
 * repair still has one (`unsupportedNumbers`). Money in the reports comes from
 * the ROI model, never from the write-up.
 */

/**
 * Search-ad benchmarks: LocaliQ (WordStream) 2025 Google Ads benchmarks,
 * all-industry averages. Update these when LocaliQ publishes newer figures.
 */
export const BENCHMARKS = {
  source: 'LocaliQ 2025 Google Ads benchmarks (all-industry averages)',
  ctr: 0.0666,
  cvr: 0.0752,
  cpc: 5.26,
};

/** Chan, Kumar, Ma and Koehler (Google, 2012): share of ad clicks that are incremental. */
export const INCREMENTALITY = {
  source: 'Chan, Kumar, Ma and Koehler (Google, 2012), 390 search-ad pause studies',
  ranks_first: 0.5,
  otherwise: 0.82,
};

export const AREAS = ['google', 'social', 'website', 'ads', 'competitors', 'keywords'] as const;
export type AreaKey = (typeof AREAS)[number];

export interface AreaWriteup {
  summary: string;
  working: string[];
  costing: string[];
  fixes: string[];
}

export interface Writeup {
  headline: string;
  verdict: string;
  areas: Record<AreaKey, AreaWriteup>;
  plan: { weeks_1_2: string[]; weeks_3_6: string[]; weeks_7_12: string[] };
  next_steps: string[];
  cant_see: string[];
}

export interface Estimates {
  category: string;
  ticket: [number, number, number];
  close: [number, number, number];
  gross_margin: number;
  basis: string;
  has_current_marketer: boolean | null;
  is_nwse_client: boolean | null;
}

type SiteOut = { business: SiteScan | null; competitors: { name: string; site: SiteScan | null }[] };
type MapsOut = { business: MapsPlace | null; nearby: MapsListing[]; note: string | null; source: string; fetched_at: string };
type SearchOut = { business: AhrefsSnapshot | null; competitors: (AhrefsSnapshot & { name: string })[]; source: string; fetched_at: string };
type KeywordsOut = { ideas: KeywordIdea[]; seeds?: string[]; source?: string; fetched_at?: string; skipped?: string };
type SocialOut = SocialOutput;
type AdsOut = { business: AdsEvidence; competitors: AdsEvidence[]; source: string; fetched_at: string };

/** The compact, sourced facts the write-up and reports are built from. */
export interface Facts {
  business: { name: string; city: string | null; website: string | null; instagram: string | null; notes: string | null };
  site: SiteOut | null;
  maps: MapsOut | null;
  search: SearchOut | null;
  keywords: KeywordsOut | null;
  social: SocialOut | null;
  ads: AdsOut | null;
  /** The client's own accounts, where a partner linked them and the run read (or tried to read) them; null for a prospect. */
  linked: LinkedOutput | null;
  missing: string[];
}

const slimSite = (s: SiteScan | null) =>
  s && {
    url: s.final_url ?? s.url,
    status: s.status,
    https: s.https,
    error: s.error,
    title: s.title,
    meta_description: s.meta_description,
    h1: s.h1.slice(0, 3),
    has_viewport: s.has_viewport,
    word_count: s.word_count,
    schema_types: s.schema_types,
    tracking: s.tracking,
    booking: s.booking,
    phones: s.phones.slice(0, 2),
    social: s.social,
  };

export function buildFacts(audit: AuditRow, outputs: Record<string, unknown>): Facts {
  const site = (outputs.site as SiteOut | undefined) ?? null;
  const missing = (['maps', 'search', 'keywords', 'social', 'ads'] as const).filter((k) => outputs[k] === undefined);
  return {
    business: { name: audit.business_name, city: audit.city, website: audit.website, instagram: audit.instagram, notes: audit.notes },
    site,
    maps: (outputs.maps as MapsOut | undefined) ?? null,
    search: (outputs.search as SearchOut | undefined) ?? null,
    keywords: (outputs.keywords as KeywordsOut | undefined) ?? null,
    social: (outputs.social as SocialOut | undefined) ?? null,
    ads: (outputs.ads as AdsOut | undefined) ?? null,
    linked: isLinkedOutput(outputs.linked) && outputs.linked.services.length ? outputs.linked : null,
    missing,
  };
}

/** The linked accounts as the model sees them: each service read, with its figures, and the names of those not read. */
export function linkedForPrompt(l: LinkedOutput | null) {
  if (!l) return null;
  return {
    window: l.window,
    read: l.services.filter((s) => s.ok).map((s) => ({ service: s.label, source: s.source, data: s.data })),
    not_read: l.services.filter((s) => !s.ok).map((s) => s.label),
  };
}

/** What the model sees: the facts without bulky or brand-only fields. */
export function factsForPrompt(f: Facts) {
  return {
    business: f.business,
    website: f.site && { business: slimSite(f.site.business), competitors: f.site.competitors.map((c) => ({ name: c.name, site: slimSite(c.site) })) },
    google_maps: f.maps,
    search_ahrefs: f.search,
    keyword_planner: f.keywords && { ...f.keywords, ideas: f.keywords.ideas.slice(0, 25) },
    instagram: f.social,
    ads: f.ads,
    client_accounts: linkedForPrompt(f.linked),
    not_available: f.missing,
  };
}

// ---------------------------------------------------------------------------
// Numbers the write-up may use

const NUMBER = /\d[\d,]*(?:\.\d+)?/g;

function addVariants(allowed: Set<string>, x: number) {
  if (!Number.isFinite(x)) return;
  const forms = [x, Math.round(x), Math.round(x * 10) / 10, Math.round(x * 100) / 100, Math.floor(x), Math.ceil(x)];
  if (Math.abs(x) <= 1) forms.push(Math.round(x * 100), Math.round(x * 1000) / 10);
  for (const v of forms) allowed.add(String(Math.abs(v)));
}

/** Every number in the facts (and simple roundings of it), plus small counts. */
export function allowedNumbers(...sources: unknown[]): Set<string> {
  const allowed = numbersIn(...sources);
  for (let i = 0; i <= 12; i++) allowed.add(String(i));
  // The reports' own time windows ("the last 30 days", "a 90-day plan").
  for (const w of [30, 60, 90]) allowed.add(String(w));
  const year = new Date().getFullYear();
  for (let y = year - 30; y <= year + 1; y++) allowed.add(String(y));
  return allowed;
}

/** Only the numbers in the sources (and simple roundings of them): no small counts, windows or years. */
export function numbersIn(...sources: unknown[]): Set<string> {
  const allowed = new Set<string>();
  const walk = (v: unknown, depth: number) => {
    if (depth > 12 || v === null || v === undefined) return;
    if (typeof v === 'number') addVariants(allowed, v);
    else if (typeof v === 'string') for (const m of v.match(NUMBER) ?? []) addVariants(allowed, Number(m.replace(/,/g, '')));
    else if (Array.isArray(v)) v.forEach((x) => walk(x, depth + 1));
    else if (typeof v === 'object') Object.values(v as Record<string, unknown>).forEach((x) => walk(x, depth + 1));
  };
  sources.forEach((s) => walk(s, 0));
  return allowed;
}

export function unsupportedNumbers(text: string, allowed: Set<string>): string[] {
  return (text.match(NUMBER) ?? []).map((m) => m.replace(/,/g, '')).filter((m) => !allowed.has(String(Number(m))));
}

// A sentence ends at . ! or ?, but not at the point inside a number like 4.6.
export const SENTENCE = /(?:[^.!?]|[.!?](?=\d))+(?:[.!?]+|$)/g;

/** Removes sentences that quote an unsupported number; returns what it removed. */
export function scrubText(text: string, allowed: Set<string>): { text: string; removed: string[] } {
  const removed: string[] = [];
  const kept = (text.match(SENTENCE) ?? [text]).filter((s) => {
    if (unsupportedNumbers(s, allowed).length === 0) return true;
    removed.push(s.trim());
    return false;
  });
  return { text: kept.join('').trim(), removed };
}

/** Applies `fn` to every string in a write-up (empty strings drop out of lists). */
export function mapStrings<T>(value: T, fn: (s: string) => string): T {
  if (typeof value === 'string') return fn(value) as T;
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, fn)).filter((v) => v !== '') as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapStrings(v, fn)])) as T;
  }
  return value;
}

export function writeupProblems(w: Writeup, allowed: Set<string>): string[] {
  const out: string[] = [];
  mapStrings(w, (s) => {
    for (const sentence of s.match(SENTENCE) ?? []) if (unsupportedNumbers(sentence, allowed).length) out.push(sentence.trim());
    return s;
  });
  return out;
}

export function scrubWriteup(w: Writeup, allowed: Set<string>): { writeup: Writeup; removed: string[] } {
  const removed: string[] = [];
  const writeup = mapStrings(w, (s) => {
    const r = scrubText(s, allowed);
    removed.push(...r.removed);
    return r.text;
  });
  return { writeup, removed };
}

const str = (v: unknown, max = 400) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const list = (v: unknown, n: number, max = 220) => (Array.isArray(v) ? v.map((x) => str(x, max)).filter(Boolean).slice(0, n) : []);

/** Coerces the model's JSON into the Writeup shape, dropping anything unexpected. */
export function normalizeWriteup(raw: unknown): Writeup {
  const r = (raw ?? {}) as Record<string, unknown>;
  const areas = (r.areas ?? {}) as Record<string, Record<string, unknown>>;
  const plan = (r.plan ?? {}) as Record<string, unknown>;
  return {
    headline: str(r.headline, 140),
    verdict: str(r.verdict, 600),
    areas: Object.fromEntries(
      AREAS.map((k) => [
        k,
        {
          summary: str(areas[k]?.summary, 500),
          working: list(areas[k]?.working, 4),
          costing: list(areas[k]?.costing, 4),
          fixes: list(areas[k]?.fixes, 5),
        },
      ])
    ) as Record<AreaKey, AreaWriteup>,
    plan: { weeks_1_2: list(plan.weeks_1_2, 4), weeks_3_6: list(plan.weeks_3_6, 4), weeks_7_12: list(plan.weeks_7_12, 4) },
    next_steps: list(r.next_steps, 3),
    cant_see: list(r.cant_see, 5),
  };
}

const clamp = (x: unknown, lo: number, hi: number, fallback: number) =>
  typeof x === 'number' && Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : fallback;

function triple(v: unknown, lo: number, hi: number, fallback: [number, number, number]): [number, number, number] {
  const xs = Array.isArray(v) ? v.map((x) => clamp(x, lo, hi, NaN)).filter((x) => Number.isFinite(x)) : [];
  if (xs.length !== 3) return fallback;
  return [...xs].sort((a, b) => a - b) as [number, number, number];
}

export function normalizeEstimates(raw: unknown): Estimates {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    category: str(r.category, 80) || 'local business',
    ticket: triple(r.ticket, 20, 50_000, [150, 250, 400]),
    close: triple(r.close, 0.05, 0.9, [0.2, 0.3, 0.4]),
    gross_margin: clamp(r.gross_margin, 0.1, 0.9, 0.5),
    basis: str(r.basis, 600) || 'GroundSwell estimate for the category; no published prices were found.',
    has_current_marketer: typeof r.has_current_marketer === 'boolean' ? r.has_current_marketer : null,
    is_nwse_client: typeof r.is_nwse_client === 'boolean' ? r.is_nwse_client : null,
  };
}

// ---------------------------------------------------------------------------
// ROI inputs

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export interface RoiPlan {
  inputs: RoiInputs;
  sources: string[];
  core_keywords: string[];
}

/** Builds the three scenarios from Keyword Planner demand and bids; null without demand. */
export function roiInputsFrom(f: Facts, est: Estimates): RoiPlan | null {
  const ideas = (f.keywords?.ideas ?? []).filter((k) => (k.monthly_searches ?? 0) > 0);
  const core = [...ideas].sort((a, b) => (b.monthly_searches ?? 0) - (a.monthly_searches ?? 0)).slice(0, 10);
  const demand = core.reduce((sum, k) => sum + (k.monthly_searches ?? 0), 0);
  if (!core.length || demand <= 0) return null;

  const low = median(core.map((k) => k.low_bid_usd).filter((x): x is number => x !== null && x > 0));
  const high = median(core.map((k) => k.high_bid_usd).filter((x): x is number => x !== null && x > 0));
  let cpc: [number, number, number];
  let cpcSource: string;
  if (low !== null && high !== null && high >= low) {
    const mid = (low + high) / 2;
    cpc = [high, mid, (low + mid) / 2];
    cpcSource = `Cost per click from Keyword Planner's top-of-page bids for the core keywords (about $${low.toFixed(2)} to $${high.toFixed(2)}).`;
  } else {
    cpc = [BENCHMARKS.cpc * 1.2, BENCHMARKS.cpc, BENCHMARKS.cpc * 0.85];
    cpcSource = `Cost per click from ${BENCHMARKS.source}; Keyword Planner returned no bids.`;
  }

  const coreSet = new Set(core.map((k) => k.keyword.toLowerCase()));
  const ranksFirst = (f.search?.business?.top_keywords ?? []).some((k) => k.position === 1 && coreSet.has(k.keyword.toLowerCase()));
  const incrementality = ranksFirst ? INCREMENTALITY.ranks_first : INCREMENTALITY.otherwise;

  const scenario = (i: 0 | 1 | 2): RoiScenarioInputs => ({
    impression_share: [0.5, 0.65, 0.75][i],
    ctr: BENCHMARKS.ctr * [0.8, 1, 1.1][i],
    cpc: cpc[i],
    cvr: BENCHMARKS.cvr * [0.6, 0.8, 1][i],
    close: est.close[i],
    ticket: est.ticket[i],
    gross_margin: est.gross_margin,
    incrementality,
  });

  return {
    inputs: {
      company: f.business.name,
      lever: `Google Search ads on the core ${est.category} searches in the area`,
      demand_monthly: demand,
      ramp: [0.5, 0.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      scenarios: { conservative: scenario(0), base: scenario(1), optimistic: scenario(2) },
    },
    core_keywords: core.map((k) => k.keyword),
    sources: [
      `Demand: about ${Math.round(demand).toLocaleString('en-US')} searches a month for the ten largest keywords in ${f.keywords?.source ?? 'Google Ads Keyword Planner'}.`,
      cpcSource,
      `Click-through and conversion rates: ${BENCHMARKS.source}, discounted for a new account in the conservative and base cases.`,
      `Share of clicks that are new business: ${Math.round(incrementality * 100)}% (${INCREMENTALITY.source}; ${ranksFirst ? 'the business already ranks first for a core keyword' : 'the business does not rank first for the core keywords'}).`,
      `Average job value, close rate and gross margin: ${est.basis}`,
    ],
  };
}

// ---------------------------------------------------------------------------
// The step

const SYSTEM = `You write marketing audits for small local businesses for New Wave: Social Engineering.
You receive JSON of data gathered from public sources (website scan, Google Maps, Ahrefs, Google Ads Keyword Planner, Instagram and the Facebook Page, ad tags).
- instagram.business.note, when present, says why the Instagram profile could not be read (it is shown only to signed-in adults): say that in the social area, never that the business is inactive on Instagram, and use instagram.facebook for the social figures instead.
Write in plain words for a busy owner. Rules:
- Use ONLY facts in the data. Every number you write must appear in the data. Do not invent statistics, studies, percentages, or prices.
- Never cite sources as links or URLs; name a source in words if needed.
- If a field is null, missing, or in not_available, say it could not be checked; never say the business lacks something you could not see.
- Never describe as active something the data does not show.
- When client_accounts is present, it is data from the business's own accounts (Google Analytics, Search Console, Google Ads, Instagram, Meta Ads). It outranks the public estimates: prefer it in every area it covers, say which figures come from the business's own accounts, and do not list those accounts under cant_see.
- Use they/them for people. Do not name people.
- Recommend concrete fixes in priority order.
- Do not choose ad platforms, budgets or campaigns in the plan or next steps: the return section, modeled from the data after this write-up, decides which ads to run. Say "start the ads the return section funds" instead.
Return JSON only with this shape:
{"headline": string (max 12 words),
 "verdict": string (2-3 sentences),
 "areas": {"google"|"social"|"website"|"ads"|"competitors"|"keywords": {"summary": string, "working": string[], "costing": string[], "fixes": string[]}},
 "plan": {"weeks_1_2": string[], "weeks_3_6": string[], "weeks_7_12": string[]},
 "next_steps": string[3],
 "cant_see": string[] (what needs owner access, e.g. Google Business Profile performance),
 "estimates": {"category": string (the business category in 1-3 words),
   "ticket": [low, typical, high] average job or order value in USD for this category,
   "close": [low, typical, high] share of leads that become paying jobs (0-1),
   "gross_margin": number (0-1),
   "basis": string (one sentence: what the estimates rest on; say they are estimates),
   "has_current_marketer": boolean or null (true only if the notes say they pay a marketer),
   "is_nwse_client": boolean or null (true only if the notes say they are already a New Wave: Social Engineering client or customer)}}
Keep each list item under 25 words and at most 4 items per list.`;

export async function runModel(ctx: StepContext) {
  const facts = buildFacts(ctx.audit, ctx.outputs);
  if (!facts.site?.business && !facts.social?.business && !facts.maps?.business) {
    throw new PermanentStepError('No data was gathered for this business (website, Instagram and Google Maps all came back empty).');
  }
  const promptFacts = factsForPrompt(facts);
  const allowed = allowedNumbers(promptFacts);
  const user = `Data for the audit (JSON):\n${JSON.stringify(promptFacts)}`;

  const raw = await chatJson<Record<string, unknown>>(SYSTEM, user);
  let writeup = normalizeWriteup(raw);
  const estimates = normalizeEstimates(raw.estimates);
  const problems = writeupProblems(writeup, allowed);
  if (problems.length && ctx.deadline - Date.now() > 90_000) {
    const repaired = await chatJson<Record<string, unknown>>(
      SYSTEM,
      `${user}\n\nYour previous answer:\n${JSON.stringify(writeup)}\n\nThese sentences use numbers that are not in the data. Rewrite them without those numbers and return the full JSON again (same shape, estimates included):\n${problems.map((p) => `- ${p}`).join('\n')}`
    );
    const second = normalizeWriteup(repaired);
    // A repair that loses the headline or verdict is worse than scrubbing the first answer.
    if (second.headline && second.verdict) writeup = second;
  }
  const scrubbed = scrubWriteup(writeup, allowed);
  if (!scrubbed.writeup.headline || !scrubbed.writeup.verdict) throw new Error('The write-up came back without a headline or verdict.');

  const plan = roiInputsFrom(facts, estimates);
  const roi: RoiResult | null = plan ? runRoiModel(plan.inputs) : null;

  return {
    model: GROUNDSWELL_MODEL(),
    generated_at: new Date().toISOString(),
    writeup: scrubbed.writeup,
    removed_sentences: scrubbed.removed,
    estimates,
    roi,
    roi_sources: plan?.sources ?? [],
    core_keywords: plan?.core_keywords ?? [],
    roi_note: plan ? null : 'Keyword Planner returned no search volumes for the area, so no return was modeled.',
  };
}
