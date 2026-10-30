import { GROUNDSWELL_CONFIG } from '../../../packages/groundswell/groundswell.config.js';
import { planAudit, type AuditPlan } from '../../../packages/groundswell/src/audit.js';
import type { AngleInput } from '../../../packages/groundswell/src/adplan.js';
import type { Baseline } from '../../../packages/groundswell/src/changes.js';
import type { GroundswellConfig } from '../../../packages/groundswell/src/config.js';
import { findAgreement, mergeFigures, planFigures, refreshAngles, type Disagreement, type Figure, type FigureSet } from '../../../packages/groundswell/src/verify.js';
import { isAdcopyOutput, type AdcopyOutput } from './adcopy.js';
import { baselineFrom, isAdplanOutput, positionsFrom, type AdplanOutput, rivalAdsFrom } from './adplan.js';
import { benchmarkAccountsFrom, benchmarkFacts, isBenchmarkOutput, scoreTables, type BenchmarkOutput } from './benchmark.js';
import { runMaps } from './currents/maps.js';
import { runKeywords, runSearch } from './currents/search.js';
import { runSocial } from './currents/social.js';
import { MAX_ATTEMPTS } from './engine.js';
import { allowedNumbers, buildFacts, criticalEvidenceProblems, evidenceCoverage, factsForPrompt, roiInputsFrom, scrubUnsupportedClaims, SENTENCE, unsupportedNumbers, type Facts, type runModel } from './model.js';
import { chatJson } from './openai.js';
import { runRoiModel } from './roi.js';
import { PermanentStepError, type AuditRow, type StepContext, type StepDefinition } from './types.js';

/**
 * Review, re-interpret, re-run (packages/groundswell/src/verify.ts), as steps.
 *
 * After the write-up, the plan and its copy (and a benchmark's scorecard),
 * each round reads again the sources the plan rests on (`verify_read_N`:
 * Google Maps, Ahrefs, Keyword Planner, Instagram, in parallel; only those the
 * first pass read), then `verify_check_N` re-runs the plan and the search-ad
 * model on that read with the first pass's estimates and angles held fixed,
 * and compares every pass so far (`findAgreement`, within
 * `verification.tolerance`).
 *
 * - Agreed: the reviewer (one model call) checks every sentence of the
 *   write-up, and a benchmark's, against the data delivered; a sentence that
 *   misstates it is corrected (held to the data's numbers) or dropped. The
 *   check's `outputs` replace the first pass's for delivery: the reviewed
 *   write-up, and, when a later read is the one that held up, that read with
 *   the plan, model, ad copy and scorecard re-run on it.
 * - Not yet: the next round reads again.
 * - Still not after `verification.max_rounds`, a headline or verdict the
 *   reviewer could not keep, more than `max_review_drops` of the sentences
 *   dropped, or a reviewer that never answered: `hold` is set and the engine
 *   stops the audit before any PDF is built, for a person to deliver or re-run
 *   (the first pass, reviewed, is what "Deliver anyway" sends).
 *
 * Later rounds' steps skip themselves once a round has settled.
 */

type ModelOut = Awaited<ReturnType<typeof runModel>>;

export const READ_SOURCES = ['maps', 'search', 'keywords', 'social'] as const;
export type ReadSource = (typeof READ_SOURCES)[number];
const SOURCE_LABEL: Record<ReadSource, string> = { maps: 'Google Maps', search: 'Ahrefs', keywords: 'Keyword Planner', social: 'Instagram and Facebook' };
const READERS: Record<ReadSource, (ctx: StepContext) => Promise<unknown>> = { maps: runMaps, search: runSearch, keywords: runKeywords, social: runSocial };

/** Rounds the worker knows, whatever the setup file asks for. */
export const SUPPORTED_ROUNDS = 5;
export const readStep = (round: number) => `verify_read_${round}`;
export const checkStep = (round: number) => `verify_check_${round}`;
export const isVerifyStep = (name: string) => /^verify_(read|check)_\d+$/.test(name);

export interface VerifyReadOutput {
  round: number;
  fetched_at: string;
  /** The sources read again, by step name; one missing here could not be read. */
  reads: Partial<Record<ReadSource, unknown>>;
  errors: Partial<Record<ReadSource, string>>;
  skipped?: string;
}

export interface ReviewRecord {
  /** Sentences the reviewer was given. */
  checked: number;
  corrected: { from: string; to: string; problem: string }[];
  dropped: { from: string; problem: string }[];
}

export interface VerifyCheckOutput {
  round: number;
  status: 'agreed' | 'again' | 'held' | 'skipped';
  /** The pass delivered (1 is the first); null when none agreed. */
  agreed_with: number | null;
  /** The latest read against the first, when they did not agree. */
  disagreements: Disagreement[];
  /** Keywords in the plan that a later read did not return. */
  missing_keywords: string[];
  review: ReviewRecord | null;
  /** Step outputs that replace the first pass's for delivery. */
  outputs: Record<string, unknown> | null;
  /** Why a person must look before delivery; the engine holds the audit when set. */
  hold: string | null;
  reason: string | null;
  checked_at: string;
  /** Set when an admin delivers a held audit anyway. */
  released_at?: string;
}

export const isCheckOutput = (x: unknown): x is VerifyCheckOutput => {
  const o = x as Partial<VerifyCheckOutput> | null | undefined;
  return Boolean(o && typeof o.round === 'number' && typeof o.status === 'string' && Array.isArray(o.disagreements));
};

const message = (err: unknown) => (err instanceof Error ? err.message : String(err)).slice(0, 300);

/** The round an earlier check settled in (agreed or held), so later rounds skip; null while still open. */
export function settledRound(outputs: Record<string, unknown>, round: number): number | null {
  for (let r = 2; r < round; r++) {
    const c = outputs[checkStep(r)];
    if (isCheckOutput(c) && (c.status === 'agreed' || c.status === 'held')) return r;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Reading again

export const runVerifyRead =
  (round: number) =>
  async (ctx: StepContext): Promise<VerifyReadOutput> => {
    const out: VerifyReadOutput = { round, fetched_at: new Date().toISOString(), reads: {}, errors: {} };
    const settled = settledRound(ctx.outputs, round);
    if (settled) return { ...out, skipped: `Settled in round ${settled}.` };
    const sources = READ_SOURCES.filter((s) => ctx.outputs[s] !== undefined);
    // A source still reading when the step's time runs out counts as not read, rather than the call being cut off.
    const ms = Math.max(1_000, ctx.deadline - Date.now() - 5_000);
    const results = await Promise.allSettled(sources.map((s) => withinTime(READERS[s](ctx), ms, SOURCE_LABEL[s])));
    sources.forEach((s, i) => {
      const r = results[i];
      if (r.status === 'fulfilled') out.reads[s] = r.value;
      else out.errors[s] = message(r.reason);
    });
    return out;
  };

function withinTime<T>(work: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} did not answer within ${Math.round(ms / 1000)} seconds.`)), ms);
  });
  return Promise.race([work, late]).finally(() => clearTimeout(timer));
}

/** A pass's step outputs: the first pass's, with this round's reads in place (a source it could not read is left out). */
export function passOutputs(outputs: Record<string, unknown>, read: VerifyReadOutput | undefined): Record<string, unknown> {
  const next = { ...outputs };
  for (const s of READ_SOURCES) {
    if (outputs[s] === undefined) continue;
    if (read && s in read.reads) next[s] = read.reads[s];
    else delete next[s];
  }
  return next;
}

// ---------------------------------------------------------------------------
// What a pass is judged on

const lower = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();
const f = (key: string, label: string, value: number | null | undefined, extra: Partial<Figure> = {}): Figure => ({ key, label, value: value ?? null, ...extra });

/** The figures the reports print from the sources read again, for the business and each competitor. */
export function rawFigures(facts: Facts, data: Record<string, unknown>): FigureSet {
  const coverage = new Map(evidenceCoverage(facts).map(s => [s.key, s.status]));
  const usable = (s: ReadSource) => s === 'social' ? coverage.get('instagram') === 'checked' || coverage.get('facebook') === 'checked' : coverage.get(s) === 'checked';
  const figures: Figure[] = READ_SOURCES.filter((s) => data[s] !== undefined).map((s) => f(`source:${s}`, `${SOURCE_LABEL[s]} was read`, usable(s) ? 1 : null));
  const place = facts.maps?.business;
  if (place) {
    figures.push(f('maps:rating', 'Google rating', place.rating), f('maps:reviews', 'Google reviews', place.reviews, { count: true }));
  }
  for (const l of facts.maps?.nearby ?? []) {
    if (!l.name) continue;
    figures.push(
      f(`maps:nearby:${lower(l.name)}:rating`, `${l.name}: Google rating`, l.rating, { optional: true }),
      f(`maps:nearby:${lower(l.name)}:reviews`, `${l.name}: Google reviews`, l.reviews, { optional: true, count: true })
    );
  }
  const ig = facts.social?.business;
  if (ig?.exists) {
    figures.push(
      f('ig:followers', 'Instagram followers', ig.followers, { count: true }),
      f('ig:posts', 'Instagram posts', ig.posts, { count: true }),
      // Not the likes on recent posts: they keep growing for hours after a post, so honest reads minutes apart differ.
      f('ig:posts_30', 'Instagram posts in the last 30 days', ig.posts_last_30_days, { count: true })
    );
  }
  for (const c of facts.social?.competitors ?? []) {
    if (!c.exists) continue;
    figures.push(
      f(`ig:${lower(c.name)}:followers`, `${c.name}: Instagram followers`, c.followers, { count: true }),
      f(`ig:${lower(c.name)}:posts`, `${c.name}: Instagram posts`, c.posts, { count: true })
    );
  }
  const site = facts.search?.business;
  if (site) {
    figures.push(
      f('ahrefs:dr', 'Ahrefs Domain Rating', site.domain_rating),
      f('ahrefs:traffic', 'Organic visits a month (Ahrefs)', site.organic_traffic, { count: true }),
      f('ahrefs:keywords', 'Organic keywords (Ahrefs)', site.organic_keywords, { count: true })
    );
  }
  for (const c of facts.search?.competitors ?? []) {
    figures.push(
      f(`ahrefs:${lower(c.name)}:dr`, `${c.name}: Ahrefs Domain Rating`, c.domain_rating),
      f(`ahrefs:${lower(c.name)}:traffic`, `${c.name}: organic visits a month (Ahrefs)`, c.organic_traffic, { count: true })
    );
  }
  return { figures, calls: [] };
}

export interface Rerun {
  angles: AngleInput[];
  missing: string[];
  baseline: Baseline;
  result: AuditPlan;
  figures: FigureSet;
}

/** The ad plan and ranking on a pass's data, with the first pass's angles, industry, fixes and estimates. */
export function rerunPlan(facts: Facts, adplan: AdplanOutput, config: GroundswellConfig): Rerun {
  const general = config.industries.find((i) => i.id === 'general')!;
  const industry = config.industries.find((i) => i.id === adplan.industry.id) ?? general;
  const positions = positionsFrom(facts);
  const { angles, missing } = refreshAngles(adplan.angles, facts.keywords?.ideas ?? [], positions, config);
  const baseline = baselineFrom(facts);
  const result = planAudit({ angles, industry, positions, fixes: adplan.fixes ?? [], baseline, rival_ads: rivalAdsFrom(facts) }, config);
  return { angles, missing, baseline, result, figures: planFigures(result, angles) };
}

/** The search-ad model (shown when there is no ad plan) on a pass's data, with the first pass's estimates. */
export function rerunRoi(facts: Facts, model: ModelOut) {
  const plan = roiInputsFrom(facts, model.estimates);
  const roi = plan ? runRoiModel(plan.inputs) : null;
  const base = roi?.scenarios.base;
  const figures: Figure[] = [
    f('roi:demand', 'Searches a month behind the search-ad model', plan?.inputs.demand_monthly ?? null, { count: true }),
    f('roi:year_net', 'Search ads: net over 12 months (base case)', base ? Math.round(base.year.net) : null, { scale: base?.year.spend ?? 0 }),
  ];
  return { plan, roi, figures: { figures, calls: [] } as FigureSet };
}

export interface Pass {
  data: Record<string, unknown>;
  facts: Facts;
  rerun: Rerun | null;
  roi: ReturnType<typeof rerunRoi>;
  figures: FigureSet;
}

export function judgePass(audit: AuditRow, data: Record<string, unknown>, model: ModelOut, adplan: AdplanOutput | null, config: GroundswellConfig): Pass {
  const facts = buildFacts(audit, data);
  const rerun = adplan ? rerunPlan(facts, adplan, config) : null;
  const roi = rerunRoi(facts, model);
  return { data, facts, rerun, roi, figures: mergeFigures(rawFigures(facts, data), rerun?.figures ?? { figures: [], calls: [] }, roi.figures) };
}

// ---------------------------------------------------------------------------
// What a later read changes for delivery

const rowKey = (angle: string, platform: string) => `${angle}\u0000${platform}`;

/** The ad copy fitted to a re-run plan: ads for rows it still runs, and the rows it now runs without one. */
export function refitCopy(copy: AdcopyOutput, plan: AuditPlan['plan']): AdcopyOutput {
  const runs = new Map(plan.rows.filter((r) => r.recommendation !== 'skip').map((r) => [rowKey(r.angle, r.platform_label), r]));
  const ads = copy.ads
    .filter((a) => runs.has(rowKey(a.angle, a.platform_label)))
    .map((a) => ({ ...a, recommendation: runs.get(rowKey(a.angle, a.platform_label))!.recommendation as 'fund' | 'test' }));
  const covered = new Set([...ads.map((a) => rowKey(a.angle, a.platform_label)), ...copy.not_written.map((n) => rowKey(n.angle, n.platform_label))]);
  const not_written = [
    ...copy.not_written.filter((n) => runs.has(rowKey(n.angle, n.platform_label))),
    ...[...runs.values()]
      .filter((r) => !covered.has(rowKey(r.angle, r.platform_label)))
      .map((r) => ({ angle: r.angle, platform_label: r.platform_label, reason: 'The plan took this row on when its figures were read again, after the ads were written.' })),
  ];
  const gone = copy.ads.filter((a) => !runs.has(rowKey(a.angle, a.platform_label))).map((a) => `${a.angle} on ${a.platform_label}: no longer in the plan after its figures were read again.`);
  return { ...copy, ads, not_written, dropped: [...copy.dropped, ...gone] };
}

/** Outputs that replace the first pass's when a later read is the one that held up. */
export function laterPassOutputs(ctx: StepContext, pass: Pass, model: ModelOut, adplan: AdplanOutput | null): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const s of READ_SOURCES) if (ctx.outputs[s] !== undefined) out[s] = pass.data[s];
  const { plan, roi } = pass.roi;
  out.model = {
    ...model,
    roi,
    roi_sources: plan?.sources ?? [],
    core_keywords: plan?.core_keywords ?? [],
    roi_note: plan ? null : 'Keyword demand and bids could not be verified for this run, so ad spend and return were not modeled. This does not establish low or zero demand.',
  };
  if (adplan && pass.rerun) out.adplan = { ...adplan, angles: pass.rerun.angles, baseline: pass.rerun.baseline, ...pass.rerun.result };
  const copy = ctx.outputs.adcopy;
  if (isAdcopyOutput(copy) && pass.rerun) out.adcopy = refitCopy(copy, pass.rerun.result.plan);
  const bench = ctx.outputs.benchmark;
  if (isBenchmarkOutput(bench)) {
    const later = { ...ctx, outputs: { ...pass.data, ...out } };
    const { accounts, ads } = benchmarkAccountsFrom(later);
    const { scorecard, gaps, bands } = scoreTables(later, accounts);
    out.benchmark = { ...bench, accounts, ads, scorecard, gaps, bands };
  }
  return out;
}

// ---------------------------------------------------------------------------
// The reviewer

export const REVIEW_SYSTEM = `You check a small business's marketing audit before it goes to the client.
You get the data it was written from (JSON) and its sentences, each with an id.
Report a sentence only when the data shows it is wrong:
- a number given for the wrong business, competitor, place or measure (for example a competitor's followers given as the business's);
- a claim the data contradicts (for example "no booking link" when the data shows one);
- saying the business lacks something the data could not check (a null, missing or not_available field means it was not checked);
- treating failed/unavailable evidence as zero activity, low demand, absent social presence or no active campaigns; website tags and Ahrefs zero paid keywords do not establish campaign status;
- claiming measured loss, spend, leads or bookings from public proxies; a hypothesis or risk must remain labelled as such;
- a number that is not in the data.
Do not report style, tone, advice, plans, or estimates labelled as estimates.
For each problem give a corrected sentence that uses only the data, or "" to drop the sentence.
Return JSON only: {"problems": [{"id": string, "problem": string (one short sentence), "fix": string}]}`;

/** Fields that are labels or fixed rules, not sentences to review. */
const SKIP_KEYS = new Set(['lever', 'area', 'name', 'metric', 'rank', 'do_not_copy', 'source', 'priority', 'basis']);

/**
 * Walks every sentence of a write-up in a fixed order, giving each an id
 * (`prefix` and its position) and replacing it with `revise`'s answer; an
 * empty answer drops it, and a list item left empty drops out.
 */
export function reviseSentences<T>(value: T, prefix: string, revise: (sentence: string, id: string) => string): T {
  let n = 0;
  const walk = (v: unknown, key?: string): unknown => {
    if (key && SKIP_KEYS.has(key)) return v;
    if (typeof v === 'string') {
      const parts = v.match(SENTENCE) ?? [];
      return parts
        .map((part) => {
          const text = part.trim();
          if (!text) return part;
          const next = revise(text, `${prefix}${++n}`).trim();
          return next ? part.slice(0, part.length - part.trimStart().length) + next : '';
        })
        .join('')
        .trim();
    }
    if (Array.isArray(v)) return v.map((x) => walk(x)).filter((x) => x !== '');
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, k)]));
    return v;
  };
  return walk(value) as T;
}

export function sentencesOf<T>(value: T, prefix: string): { id: string; text: string }[] {
  const out: { id: string; text: string }[] = [];
  reviseSentences(value, prefix, (text, id) => {
    out.push({ id, text });
    return text;
  });
  return out;
}

interface Reviewed {
  model: ModelOut;
  benchmark: BenchmarkOutput | null;
  record: ReviewRecord;
}

/** Applies the reviewer's answer: a fix that keeps to the data's numbers replaces the sentence; anything else drops it. */
export function applyReview(model: ModelOut, benchmark: BenchmarkOutput | null, raw: unknown, allowed: Set<string>, checked: number): Reviewed {
  const problems = new Map<string, { problem: string; fix: string }>();
  for (const p of (Array.isArray((raw as { problems?: unknown })?.problems) ? (raw as { problems: unknown[] }).problems : []) as Record<string, unknown>[]) {
    if (typeof p?.id !== 'string') continue;
    problems.set(p.id, { problem: typeof p.problem === 'string' ? p.problem.slice(0, 300) : '', fix: typeof p.fix === 'string' ? p.fix.trim().slice(0, 400) : '' });
  }
  const record: ReviewRecord = { checked, corrected: [], dropped: [] };
  const revise = (text: string, id: string) => {
    const p = problems.get(id);
    if (!p) return text;
    if (p.fix && unsupportedNumbers(p.fix, allowed).length === 0) {
      record.corrected.push({ from: text, to: p.fix, problem: p.problem });
      return p.fix;
    }
    record.dropped.push({ from: text, problem: p.problem });
    return '';
  };
  const writeup = reviseSentences(model.writeup, 'w', revise);
  const benchWriteup = benchmark ? reviseSentences(benchmark.writeup, 'b', revise) : null;
  return {
    model: { ...model, writeup, removed_sentences: [...model.removed_sentences, ...record.dropped.map((d) => d.from)] },
    benchmark: benchmark && benchWriteup ? { ...benchmark, writeup: benchWriteup, removed_sentences: [...benchmark.removed_sentences, ...record.dropped.map((d) => d.from)] } : null,
    record,
  };
}

/** The data the reviewer judges against: what the write-up saw, its labelled estimates, and a benchmark's tables. */
export function reviewData(facts: Facts, model: ModelOut, benchmark: BenchmarkOutput | null) {
  return {
    ...factsForPrompt(facts),
    estimates: model.estimates,
    ...(benchmark ? { benchmark: benchmarkFacts(benchmark.accounts, benchmark.ads, benchmark.scorecard, benchmark.gaps, benchmark.bands) } : {}),
  };
}

// ---------------------------------------------------------------------------
// The check

const summarize = (d: Disagreement[]) =>
  d
    .slice(0, 3)
    .map((x) => (x.kind === 'unread' ? `${x.label} (could not be read again)` : `${x.label} (${x.earlier} then ${x.later})`))
    .join('; ') + (d.length > 3 ? `; and ${d.length - 3} more` : '');

export const runVerifyCheck =
  (round: number, config: GroundswellConfig = GROUNDSWELL_CONFIG) =>
  async (ctx: StepContext): Promise<VerifyCheckOutput> => {
    const out: VerifyCheckOutput = {
      round,
      status: 'skipped',
      agreed_with: null,
      disagreements: [],
      missing_keywords: [],
      review: null,
      outputs: null,
      hold: null,
      reason: null,
      checked_at: new Date().toISOString(),
    };
    const settled = settledRound(ctx.outputs, round);
    if (settled) return { ...out, reason: `Settled in round ${settled}.` };
    const model = ctx.outputs.model as ModelOut | undefined;
    if (!model?.writeup) throw new PermanentStepError('The write-up is missing, so there is nothing to check.');
    const adplan = isAdplanOutput(ctx.outputs.adplan) ? ctx.outputs.adplan : null;

    const passes = [judgePass(ctx.audit, ctx.outputs, model, adplan, config)];
    for (let r = 2; r <= round; r++) {
      passes.push(judgePass(ctx.audit, passOutputs(ctx.outputs, ctx.outputs[readStep(r)] as VerifyReadOutput | undefined), model, adplan, config));
    }
    const { agreed, disagreements } = findAgreement(
      passes.map((p) => p.figures),
      config.verification.tolerance
    );
    out.missing_keywords = [...new Set(passes.slice(1).flatMap((p) => p.rerun?.missing ?? []))];
    out.disagreements = disagreements;
    // The audit's own step list decides the last round, so a setup-file change never strands a running audit.
    const last = ctx.steps ? !ctx.steps.includes(checkStep(round + 1)) : round >= config.verification.max_rounds;
    if (agreed === null && !last) return { ...out, status: 'again', reason: `Round ${round} did not agree: ${summarize(disagreements)}.` };

    // Deliver the agreed pass; when none agreed, the first, held for a person.
    const chosen = agreed ?? 0;
    const later = chosen > 0 ? laterPassOutputs(ctx, passes[chosen], model, adplan) : {};
    const deliveredModel = (later.model as ModelOut | undefined) ?? model;
    const deliveredBench = (later.benchmark as BenchmarkOutput | undefined) ?? (isBenchmarkOutput(ctx.outputs.benchmark) ? ctx.outputs.benchmark : null);
    const data = reviewData(passes[chosen].facts, deliveredModel, deliveredBench);
    const sentences = [...sentencesOf(deliveredModel.writeup, 'w'), ...(deliveredBench ? sentencesOf(deliveredBench.writeup, 'b') : [])];

    let reviewed: Reviewed;
    try {
      const timeout = Math.max(20_000, Math.min(120_000, ctx.deadline - Date.now() - 10_000));
      const raw = await chatJson<unknown>(REVIEW_SYSTEM, `Data (JSON):\n${JSON.stringify(data)}\n\nSentences (JSON):\n${JSON.stringify(sentences)}`, timeout);
      reviewed = applyReview(deliveredModel, deliveredBench, raw, allowedNumbers(data), sentences.length);
    } catch (err) {
      if (err instanceof PermanentStepError || ctx.attempt < MAX_ATTEMPTS) throw err;
      return {
        ...out,
        status: 'held',
        agreed_with: agreed === null ? null : agreed + 1,
        outputs: { ...later },
        hold: `The reviewer could not run (${message(err)}); read the write-up before it goes out.`,
      };
    }

    const guarded = scrubUnsupportedClaims(reviewed.model.writeup, passes[chosen].facts);
    reviewed.model = { ...reviewed.model, writeup: guarded.writeup, removed_sentences: [...reviewed.model.removed_sentences, ...guarded.removed] };
    reviewed.record.dropped.push(...guarded.removed.map(from => ({ from, problem: 'The available source does not establish this absence or activity claim.' })));
    const holds: string[] = criticalEvidenceProblems(passes[chosen].facts, ctx.steps);
    if (reviewed.model.report_schema_version >= 2) {
      const checked = new Set(evidenceCoverage(passes[chosen].facts).filter(s => s.status === 'checked').map(s => s.key));
      const substantive = (reviewed.model.writeup.findings ?? []).filter(finding =>
        finding.basis !== 'hypothesis' &&
        (finding.source === 'client_accounts' ? passes[chosen].facts.linked?.services.some(s => s.ok && s.data) : checked.has(finding.source)) &&
        finding.evidence.length >= 40 && finding.action.length >= 40 && finding.implication.length >= 30 && finding.measure.length >= 30 &&
        !/^(?:boost .*presence|improve seo|post more|increase engagement)[.!]?$/i.test(finding.title.trim())
      );
      if (substantive.length < 3) holds.push(`The report has ${substantive.length} substantive evidence-backed findings. Complete the specific actions, business implications and verification checks before client delivery.`);
    }
    if (agreed === null) holds.push(`The figures did not agree after ${round} reads: ${summarize(disagreements)}.`);
    const w = reviewed.model.writeup;
    if (!w.headline || !w.verdict) {
      holds.push(`The reviewer found the ${!w.headline ? 'headline' : 'verdict'} does not match the data, and no correction held up.`);
      // "Deliver anyway" sends the original wording, which the person has now read.
      reviewed.model = { ...reviewed.model, writeup: { ...w, headline: w.headline || deliveredModel.writeup.headline, verdict: w.verdict || deliveredModel.writeup.verdict } };
    }
    if (reviewed.benchmark && !reviewed.benchmark.writeup.verdict && deliveredBench) {
      holds.push('The reviewer found the benchmark verdict does not match the data, and no correction held up.');
      reviewed.benchmark = { ...reviewed.benchmark, writeup: { ...reviewed.benchmark.writeup, verdict: deliveredBench.writeup.verdict } };
    }
    const drops = reviewed.record.dropped.length;
    if (sentences.length && drops / sentences.length > config.verification.max_review_drops) {
      holds.push(`The reviewer dropped ${drops} of ${sentences.length} sentences; read the write-up before it goes out.`);
    }

    return {
      ...out,
      status: holds.length ? 'held' : 'agreed',
      agreed_with: agreed === null ? null : agreed + 1,
      review: reviewed.record,
      outputs: { ...later, model: reviewed.model, ...(reviewed.benchmark ? { benchmark: reviewed.benchmark } : {}) },
      hold: holds.length ? holds.join(' ') : null,
      reason: agreed === null ? null : agreed === 0 ? `Round ${round} agreed with the first read.` : `Round ${round} agreed with round ${agreed + 1}; the first read did not hold up.`,
    };
  };

/** The step outputs delivery builds from: the first pass's, with the settled check's replacements. */
export function verifiedOutputs(outputs: Record<string, unknown>): Record<string, unknown> {
  let best: VerifyCheckOutput | null = null;
  for (const [key, v] of Object.entries(outputs)) {
    if (!/^verify_check_\d+$/.test(key) || !isCheckOutput(v) || !v.outputs) continue;
    if ((v.status === 'agreed' || v.status === 'held') && (!best || v.round > best.round)) best = v;
  }
  return best ? { ...outputs, ...best.outputs } : outputs;
}

/**
 * The time a re-read wants from the worker's call: the social step's own
 * (its signed-in reader may wait three minutes), as the sources are read in
 * parallel. With less left, the engine hands the step to the next call.
 */
export const READ_NEEDS_MS = 180_000;

/** A read and a check for each round after the first, up to `rounds`. */
export function verifySteps(rounds: number, config: GroundswellConfig = GROUNDSWELL_CONFIG): StepDefinition[] {
  if (rounds > SUPPORTED_ROUNDS) throw new Error(`verification.max_rounds may be at most ${SUPPORTED_ROUNDS}.`);
  const steps: StepDefinition[] = [];
  for (let r = 2; r <= rounds; r++) {
    steps.push({ name: readStep(r), current: 'Model', label: `Read the figures again (round ${r})`, optional: true, needsMs: READ_NEEDS_MS, run: runVerifyRead(r) });
    steps.push({ name: checkStep(r), current: 'Model', label: `Compare and review (round ${r})`, optional: false, run: runVerifyCheck(r, config) });
  }
  return steps;
}
