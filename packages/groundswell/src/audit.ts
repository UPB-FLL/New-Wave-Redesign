import { benchmarksFor, type GroundswellConfig, type IndustryProfile, type Triple } from './config.js';
import { buildAdPlan, type AdPlan, type AngleInput, type RivalAds } from './adplan.js';
import {
  compareWithToday,
  rankChanges,
  type Baseline,
  type ChangeArea,
  type ChangeCost,
  type ChangeInput,
  type Comparison,
  type RankedChange,
} from './changes.js';

/**
 * One audit's plan from the angles and findings an engine hands in: the ad
 * plan, every change costed and ranked by return, and today against the plan.
 *
 * Whoever runs Groundswell gathers the data, forms the angles and sorts the
 * findings (New Wave's engine does this in api/_lib/groundswell/adplan.ts);
 * this module only applies the setup file, so the same inputs always give the
 * same plan.
 *
 * The changes it ranks:
 * - every ad-plan row that is funded or tested (team time from `effort`);
 * - for each angle with a value, one page that ranks for its searches,
 *   modeled on the organic click-through curve, unless the business already
 *   ranks at or above the best case (`impact.seo_target`);
 * - every finding the engine sorted into an effort type, as "not modeled":
 *   ranked after the modeled changes, cheapest first. Findings of a type the
 *   first two already cover (`COVERED_EFFORT`) are left out, so nothing is
 *   ranked twice.
 */

/** A finding from the audit, sorted into one of the setup file's effort types. */
export interface SortedFix {
  id: string;
  area: ChangeArea;
  /** A key of the setup file's `effort`. */
  effort: string;
  title: string;
  evidence: string;
}

export interface AuditPlanInput {
  angles: AngleInput[];
  industry: IndustryProfile;
  /** The business's organic position for each keyword it is known to rank for, keyed in lower case. */
  positions: Record<string, number>;
  fixes: SortedFix[];
  baseline: Baseline;
  /** Competitors on record advertising, by platform (the Ads Current and the ad libraries). */
  rival_ads?: RivalAds;
}

export interface AuditPlan {
  plan: AdPlan;
  ranked: RankedChange[];
  comparison: Comparison;
}

/** Effort types the ad plan and the ranking-page change already cover. */
export const COVERED_EFFORT: readonly string[] = ['search_campaign', 'social_campaign', 'service_page_seo'];

export const NOT_MODELED_FIX = 'No published figure measures what this kind of change returns, so it is ranked by its cost.';

/** The business's best known organic position for any of an angle's keywords; null when none is known. */
export function bestPosition(angle: AngleInput, positions: Record<string, number>): number | null {
  const known = angle.keywords.map((k) => positions[k.keyword.toLowerCase()]).filter((p): p is number => typeof p === 'number' && p >= 1);
  return known.length ? Math.min(...known) : null;
}

/** Share of ad customers who would not have come anyway, from where the business already ranks (Chan and others). */
export function incrementalityFor(position: number | null, config: GroundswellConfig): { value: number; basis: string } {
  const r = config.incrementality;
  const cite = `(${r.source})`;
  if (position === null) {
    return {
      value: r.ranks_2_to_4,
      basis: `its rank for these searches was not confirmed, so the cautious figure for a business ranking second to fourth applies ${cite}.`,
    };
  }
  if (position <= 1) return { value: r.ranks_first, basis: `it already ranks first for one of these searches, so fewer ad clicks are new ${cite}.` };
  if (position <= 4) return { value: r.ranks_2_to_4, basis: `it already ranks in the top four for one of these searches (best position ${position}) ${cite}.` };
  return { value: r.ranks_5_plus, basis: `its best position for these searches is ${position}, so most ad clicks are new ${cite}.` };
}

function effortCost(config: GroundswellConfig, kind: string): ChangeCost {
  const e = config.effort[kind];
  if (!e) throw new Error(`The setup file has no effort estimate for "${kind}".`);
  return { hours: e.hours, monthly_hours: e.monthly_hours, basis: e.basis };
}

/** One page that ranks for an angle's searches, or null when it cannot be modeled or would not move the business up. */
export function rankingPageChange(
  angle: AngleInput,
  position: number | null,
  industry: IndustryProfile,
  config: GroundswellConfig
): ChangeInput | null {
  const demand = angle.keywords.reduce((a, k) => a + k.monthly_searches, 0);
  const target = config.impact.seo_target.positions;
  if (!angle.value || demand < config.min_angle_searches) return null;
  if (position !== null && position <= target[2]) return null;
  const cvr = benchmarksFor(config.platforms.google_search, industry)?.cvr;
  if (!cvr) return null;
  const visit_to_lead = [0, 1, 2].map((i) => cvr[i] * config.search.cvr_factor[i]) as unknown as Triple;
  const rank = position === null ? 'its rank for them was not confirmed' : `its best position is ${position}`;
  return {
    id: `seo-${angle.id}`,
    area: 'seo',
    title: `${angle.name}: a page that ranks for these searches`,
    evidence: `About ${Math.round(demand).toLocaleString('en-US')} searches a month (Keyword Planner); ${rank}.`,
    cost: effortCost(config, 'service_page_seo'),
    impact: {
      kind: 'ranking',
      curve: 'organic',
      monthly_searches: demand,
      from_position: position,
      to_position: target,
      visit_to_lead,
      basis: `Organic clicks from ${config.impact.organic_ctr.source}; target positions: ${config.impact.seo_target.basis} Visitors inquire at the search-ad conversion rate for the industry, discounted as for a new account, since no organic figure is published.`,
    },
    value: angle.value,
  };
}

export function planAudit(input: AuditPlanInput, config: GroundswellConfig): AuditPlan {
  const plan = buildAdPlan(input.angles, input.industry, config, { rival_ads: input.rival_ads });
  const angles = new Map(input.angles.map((a) => [a.id, a]));
  const ads: ChangeInput[] = plan.rows
    .filter((r) => r.recommendation !== 'skip')
    .map((r) => ({
      id: `ads-${r.angle_id}-${r.platform}`,
      area: 'ads',
      title: `${r.angle}: ${r.platform_label} ads`,
      evidence: `${angles.get(r.angle_id)?.why ?? ''} ${r.sources[0]}`.trim(),
      cost: effortCost(config, r.buying === 'search' ? 'search_campaign' : 'social_campaign'),
      impact: { kind: 'ads', row: r },
    }));
  const pages = input.angles
    .map((a) => rankingPageChange(a, bestPosition(a, input.positions), input.industry, config))
    .filter((c): c is ChangeInput => c !== null);
  const fixes: ChangeInput[] = input.fixes
    .filter((f) => config.effort[f.effort] && !COVERED_EFFORT.includes(f.effort))
    .map((f) => ({
      id: `fix-${f.id}`,
      area: f.area,
      title: f.title,
      evidence: f.evidence,
      cost: effortCost(config, f.effort),
      impact: { kind: 'not_modeled', reason: NOT_MODELED_FIX },
    }));
  const ranked = rankChanges([...ads, ...pages, ...fixes], config);
  return { plan, ranked, comparison: compareWithToday(ranked, input.baseline) };
}
