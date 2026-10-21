import type { AngleInput } from './adplan.js';
import { bestPosition, incrementalityFor, type AuditPlan } from './audit.js';
import type { GroundswellConfig } from './config.js';

/**
 * Review, re-interpret, re-run: when a later pass agrees with an earlier one.
 *
 * A pass is reduced to what a reader acts on (a FigureSet): the figures the
 * reports print and the plan's outcomes, plus the calls the plan makes (fund,
 * test or skip; the top three changes). Two passes agree when every figure
 * both read is within the setup file's `verification.tolerance` and no call
 * changed. A figure one pass read and the other could not is a disagreement,
 * never a pass.
 */

export interface Figure {
  key: string;
  label: string;
  value: number | null;
  /** A count (reviews, posts, clicks) may differ by one and still agree. */
  count?: boolean;
  /**
   * Money is judged against the larger of the two values and this sum (the
   * spend or cost at stake), so a swing around zero on a small row is not a
   * disagreement.
   */
  scale?: number;
  /**
   * Compared only when both passes read it: members of a list that come and
   * go between reads (the other businesses Maps shows, a long-tail keyword).
   */
  optional?: boolean;
}

/** A call the plan makes, compared exactly. */
export interface Call {
  key: string;
  label: string;
  value: string;
}

export interface FigureSet {
  figures: Figure[];
  calls: Call[];
}

export interface Disagreement {
  key: string;
  label: string;
  earlier: number | string | null;
  later: number | string | null;
  /** How far the figure moved, as a share of the larger value (or its scale); null for calls and unread figures. */
  change: number | null;
  kind: 'moved' | 'unread' | 'changed';
}

export const NO_ROW = '(no row)';

/** Every figure or call that differs between two passes beyond the tolerance. */
export function compareFigures(earlier: FigureSet, later: FigureSet, tolerance: number): Disagreement[] {
  const out: Disagreement[] = [];
  const a = new Map(earlier.figures.map((f) => [f.key, f]));
  const b = new Map(later.figures.map((f) => [f.key, f]));
  for (const key of new Set([...a.keys(), ...b.keys()])) {
    const x = a.get(key);
    const y = b.get(key);
    const label = (x ?? y)!.label;
    const xv = x?.value ?? null;
    const yv = y?.value ?? null;
    if (xv === null && yv === null) continue;
    if (xv === null || yv === null) {
      if (!(x ?? y)!.optional) out.push({ key, label, earlier: xv, later: yv, change: null, kind: 'unread' });
      continue;
    }
    const diff = Math.abs(xv - yv);
    if ((x?.count || y?.count) && diff <= 1) continue;
    const scale = Math.max(Math.abs(xv), Math.abs(yv), x?.scale ?? 0, y?.scale ?? 0);
    if (scale === 0 || diff <= tolerance * scale + 1e-9) continue;
    out.push({ key, label, earlier: xv, later: yv, change: Math.round((diff / scale) * 1000) / 1000, kind: 'moved' });
  }
  const c = new Map(earlier.calls.map((x) => [x.key, x]));
  const d = new Map(later.calls.map((x) => [x.key, x]));
  for (const key of new Set([...c.keys(), ...d.keys()])) {
    const x = c.get(key);
    const y = d.get(key);
    if (x?.value === y?.value) continue;
    out.push({ key, label: (x ?? y)!.label, earlier: x?.value ?? NO_ROW, later: y?.value ?? NO_ROW, change: null, kind: 'changed' });
  }
  return out;
}

export interface Agreement {
  /** Index of the earliest pass the latest one agrees with; null when it agrees with none. */
  agreed: number | null;
  /** The latest pass against the first: what moved, for a person to look at. */
  disagreements: Disagreement[];
}

/** True when the pass read every figure the first pass read (optional ones aside). */
function readsAll(first: FigureSet, pass: FigureSet): boolean {
  const read = new Map(pass.figures.map((f) => [f.key, f.value]));
  return first.figures.every((f) => f.optional || f.value === null || (read.get(f.key) ?? null) !== null);
}

/**
 * The latest pass against every earlier one. It counts as accurate when it
 * agrees with any of them, and the earliest agreeing pass is the one
 * delivered (the first pass, whenever it held up, since the write-up was
 * written from it). Two later passes that both missed something the first
 * read do not agree: neither can stand in for it.
 */
export function findAgreement(passes: FigureSet[], tolerance: number): Agreement {
  if (passes.length < 2) throw new Error('Agreement needs at least two passes.');
  const [first] = passes;
  const latest = passes[passes.length - 1];
  for (let i = 0; i < passes.length - 1; i++) {
    if (i > 0 && !(readsAll(first, passes[i]) && readsAll(first, latest))) continue;
    if (compareFigures(passes[i], latest, tolerance).length === 0) return { agreed: i, disagreements: [] };
  }
  return { agreed: null, disagreements: compareFigures(first, latest, tolerance) };
}

/** One keyword as Keyword Planner returns it. */
export interface KeywordRead {
  keyword: string;
  monthly_searches: number | null;
  low_bid_usd: number | null;
  high_bid_usd: number | null;
}

/**
 * The plan's angles priced from another Keyword Planner read: the same
 * keywords (the planner's grouping is kept, like the write-up's estimates),
 * each with the searches and bids of this read, and incrementality from this
 * read's rankings. A keyword this read does not return is left out and
 * listed; an angle left with none is dropped.
 */
export function refreshAngles(
  angles: AngleInput[],
  read: KeywordRead[],
  positions: Record<string, number>,
  config: GroundswellConfig
): { angles: AngleInput[]; missing: string[] } {
  const byKeyword = new Map(read.filter((k) => (k.monthly_searches ?? 0) > 0).map((k) => [k.keyword.toLowerCase(), k]));
  const missing: string[] = [];
  const out: AngleInput[] = [];
  for (const angle of angles) {
    const keywords = angle.keywords.flatMap((k) => {
      const r = byKeyword.get(k.keyword.toLowerCase());
      if (!r) {
        missing.push(k.keyword);
        return [];
      }
      return [{ keyword: k.keyword, monthly_searches: r.monthly_searches ?? 0, low_bid_usd: r.low_bid_usd, high_bid_usd: r.high_bid_usd }];
    });
    if (!keywords.length) continue;
    const next = { ...angle, keywords };
    const inc = incrementalityFor(bestPosition(next, positions), config);
    out.push({ ...next, incrementality: inc.value, incrementality_basis: inc.basis });
  }
  return { angles: out, missing };
}

const round = (x: number, places = 2) => Math.round(x * 10 ** places) / 10 ** places;

/** The figures and calls of a plan a reader acts on, in its medium case. */
export function planFigures(result: AuditPlan, angles: AngleInput[]): FigureSet {
  const figures: Figure[] = [];
  const calls: Call[] = [];
  for (const angle of angles) {
    const demand = angle.keywords.reduce((s, k) => s + k.monthly_searches, 0);
    figures.push({ key: `angle:${angle.id}:demand`, label: `${angle.name}: searches a month`, value: demand, count: true });
    for (const k of angle.keywords) {
      const id = k.keyword.toLowerCase();
      figures.push({ key: `keyword:${id}:searches`, label: `“${k.keyword}”: searches a month`, value: k.monthly_searches, count: true, optional: true });
      figures.push({ key: `keyword:${id}:high_bid`, label: `“${k.keyword}”: top-of-page bid (high)`, value: k.high_bid_usd, optional: true });
    }
  }
  for (const row of result.plan.rows) {
    const key = `row:${row.angle_id}:${row.platform}`;
    const name = `${row.angle} on ${row.platform_label}`;
    const m = row.scenarios.medium;
    figures.push({ key: `${key}:clicks`, label: `${name}: clicks a month`, value: round(m.clicks, 1), count: true });
    figures.push({ key: `${key}:cpc`, label: `${name}: cost per click`, value: round(m.cpc) });
    figures.push({ key: `${key}:year_net`, label: `${name}: net over 12 months`, value: round(m.year_net), scale: m.spend * 12 });
    calls.push({ key, label: `${name}: fund, test or skip`, value: row.recommendation });
    calls.push({ key: `${key}:roi_tier`, label: `${name}: return`, value: row.roi_tier });
  }
  figures.push({ key: 'plan:year_net', label: 'The ad plan: net over 12 months', value: round(result.plan.year_net.medium), scale: result.plan.budget.medium * 12 });
  for (const change of result.ranked) {
    const m = change.scenarios?.medium;
    if (!m) continue;
    figures.push({ key: `change:${change.id}:net_year`, label: `${change.title}: net in the first year`, value: round(m.net_year), scale: m.cost_year });
  }
  const top = result.ranked.slice(0, 3).map((c) => c.title).sort();
  calls.push({ key: 'ranking:top3', label: 'The top three changes', value: top.join('; ') });
  const withPlan = result.comparison.with_plan;
  figures.push({
    key: 'plan:with_plan_net_year',
    label: 'With the plan: net in the first year',
    value: round(withPlan.net_year.medium),
    scale: withPlan.added_monthly_spend.medium * 12,
  });
  return { figures, calls };
}

/** Two figure sets as one (the raw figures and the plan's). */
export const mergeFigures = (...sets: FigureSet[]): FigureSet => ({
  figures: sets.flatMap((s) => s.figures),
  calls: sets.flatMap((s) => s.calls),
});
