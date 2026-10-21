import { SCENARIOS, type GroundswellConfig, type Scenario, type Triple } from './config.js';
import type { AngleValue, PlanRow } from './adplan.js';

/**
 * Every change an audit recommends, ranked by return: ads, SEO, the website,
 * the Google Business Profile, reviews, listings. Each change has a cost (team
 * hours at the setup file's hourly cost, plus any spend) and an impact model
 * built on published figures, or it says plainly that its return is not
 * modeled. The list is sorted by return in the medium case, and compared
 * with the business as it is set up today.
 *
 *   benefit = new customers × value × gross margin, over the first year
 *   cost    = team hours × hourly cost + spend over the first year
 *   net     = benefit − cost;   return = net ÷ cost
 *
 * Impact models:
 * - ads: an ad-plan row (its gross profit and spend already modeled).
 * - ranking: organic clicks gained by moving from one position to another,
 *   from a published click-through-by-position curve, × the site's visit-to-
 *   lead rate × close rate.
 * - conversion: a published relative lift in the visit-to-lead rate (e.g. a
 *   faster page, no entry pop-up) applied to the site's monthly visits.
 * - not_modeled: the change is still ranked, after every modeled change,
 *   with its reason and cost.
 */

export type ChangeArea = 'ads' | 'seo' | 'website' | 'google' | 'reviews' | 'listings' | 'social' | 'email';

export interface ChangeCost {
  /** Team hours to make the change: [low case, medium, high case] (the low case takes longest). */
  hours: Triple;
  /** Team hours a month to keep it going (managing ads, weekly posts), if any. */
  monthly_hours?: Triple;
  /** Extra spend a month (tools, ads) in USD, if any. */
  monthly_spend?: Triple;
  basis: string;
}

export type ImpactModel =
  | { kind: 'ads'; row: PlanRow }
  | {
      kind: 'ranking';
      /** Which published curve applies: organic results, or the Google local pack (Maps). */
      curve: 'organic' | 'local_pack';
      /** Monthly searches the change targets. */
      monthly_searches: number;
      /** Where the business ranks now (null: not in the top results). */
      from_position: number | null;
      /** Where the change could take it: [low, medium, high] case. */
      to_position: Triple;
      /** Share of organic visitors who call, book or ask, 0-1, with its basis. */
      visit_to_lead: Triple;
      basis: string;
    }
  | {
      kind: 'conversion';
      /** Site visits a month (organic and paid), with its source. */
      monthly_visits: number;
      /** Current visit-to-lead rate, 0-1. */
      visit_to_lead: Triple;
      /** Relative lift from the change: 0.1 = a tenth more leads from the same visits. */
      lift: Triple;
      basis: string;
    }
  | { kind: 'not_modeled'; reason: string };

export interface ChangeInput {
  id: string;
  area: ChangeArea;
  /** What to do, in a few words. */
  title: string;
  /** What the audit found that calls for it, with its source and date. */
  evidence: string;
  cost: ChangeCost;
  impact: ImpactModel;
  /** Value of a new customer to this business (not needed for ads, which carry their own). */
  value?: AngleValue | null;
}

export interface ChangeScenario {
  customers_month: number;
  benefit_year: number;
  cost_year: number;
  net_year: number;
  /** net ÷ cost; null when the return is not modeled. */
  roi: number | null;
}

export interface RankedChange extends ChangeInput {
  rank: number;
  scenarios: Record<Scenario, ChangeScenario> | null;
  /** Team hours in the first year (medium case): the change itself plus twelve months of upkeep. */
  hours: number;
  modeled: boolean;
}

/** Organic click-through rate at a position (1-based), from the setup file's published curve; 0 below the curve. */
export function ctrAt(curve: readonly number[], position: number | null): number {
  if (position === null || position < 1) return 0;
  return curve[Math.round(position) - 1] ?? 0;
}

const zero = (cost_year: number): ChangeScenario => ({ customers_month: 0, benefit_year: 0, cost_year, net_year: -cost_year, roi: null });

function scenarioFor(change: ChangeInput, i: 0 | 1 | 2, config: GroundswellConfig): ChangeScenario {
  const hourly = config.team.hourly_cost;
  const teamCost = (change.cost.hours[i] + (change.cost.monthly_hours?.[i] ?? 0) * 12) * hourly;
  const spendYear = (change.cost.monthly_spend?.[i] ?? 0) * 12;
  const impact = change.impact;

  if (impact.kind === 'ads') {
    const s = impact.row.scenarios[SCENARIOS[i]];
    if (s.roi === null) return zero(teamCost + s.spend * 12);
    // The row's year net is gross profit less a year of spend.
    const benefit = s.year_net + s.spend * 12;
    const cost = teamCost + s.spend * 12 + spendYear;
    return { customers_month: s.customers, benefit_year: benefit, cost_year: cost, net_year: benefit - cost, roi: cost > 0 ? (benefit - cost) / cost : null };
  }

  const cost = teamCost + spendYear;
  if (impact.kind === 'not_modeled' || !change.value) return zero(cost);
  const v = change.value;
  let leadsMonth: number;
  if (impact.kind === 'ranking') {
    const curve = (impact.curve === 'local_pack' ? config.impact.local_pack_ctr : config.impact.organic_ctr).by_position;
    const gain = Math.max(0, ctrAt(curve, impact.to_position[i]) - ctrAt(curve, impact.from_position));
    leadsMonth = impact.monthly_searches * gain * impact.visit_to_lead[i];
  } else {
    leadsMonth = impact.monthly_visits * impact.visit_to_lead[i] * impact.lift[i];
  }
  const customers = leadsMonth * v.close[i];
  // Results build up over the setup file's ramp for this kind of change.
  const ramp = impact.kind === 'ranking' ? config.impact.seo_ramp : config.search.ramp;
  let months = 0;
  for (let m = 0; m < 12; m++) months += m < ramp.length ? ramp[m] : 1;
  const benefit = customers * v.per_customer[i] * v.gross_margin[i] * months;
  return { customers_month: customers, benefit_year: benefit, cost_year: cost, net_year: benefit - cost, roi: cost > 0 ? (benefit - cost) / cost : null };
}

/**
 * Ranks every change: modeled changes by return in the medium case (then by net),
 * then the changes whose return is not modeled, cheapest first.
 */
export function rankChanges(changes: ChangeInput[], config: GroundswellConfig): RankedChange[] {
  const scored = changes.map((c) => {
    const scenarios = Object.fromEntries(SCENARIOS.map((s, i) => [s, scenarioFor(c, i as 0 | 1 | 2, config)])) as Record<Scenario, ChangeScenario>;
    const modeled = scenarios.medium.roi !== null;
    const hours = c.cost.hours[1] + (c.cost.monthly_hours?.[1] ?? 0) * 12;
    return { ...c, scenarios: modeled ? scenarios : null, hours, modeled, _cost: scenarios.medium.cost_year };
  });
  scored.sort((a, b) => {
    if (a.modeled !== b.modeled) return a.modeled ? -1 : 1;
    if (a.modeled && b.modeled) {
      return (b.scenarios!.medium.roi ?? 0) - (a.scenarios!.medium.roi ?? 0) || b.scenarios!.medium.net_year - a.scenarios!.medium.net_year;
    }
    return a._cost - b._cost;
  });
  return scored.map((c, i) => {
    const { _cost, ...rest } = c;
    void _cost;
    return { ...rest, rank: i + 1 };
  });
}

/** The business as it is set up today, from public data (and the owner, when they share it). */
export interface Baseline {
  /** Monthly ad spend today; null when it is not visible from public data. */
  monthly_ad_spend: number | null;
  ad_spend_basis: string;
}

export interface Comparison {
  today: { monthly_ad_spend: number | null; extra_customers_month: number; net_year: Record<Scenario, number> };
  with_plan: {
    /** Today's spend plus the plan's (null when today's is unknown: then this is the plan's added spend alone). */
    monthly_ad_spend: number | null;
    added_monthly_spend: Record<Scenario, number>;
    team_hours: number;
    extra_customers_month: Record<Scenario, number>;
    net_year: Record<Scenario, number>;
  };
  /** The modeled changes the plan includes: every one that pays back in the medium case. */
  included: string[];
}

/** Today against the plan: the plan takes every modeled change that pays back in the medium case. */
export function compareWithToday(ranked: RankedChange[], baseline: Baseline): Comparison {
  const included = ranked.filter((c) => c.modeled && c.scenarios!.medium.net_year > 0);
  const total = (pick: (s: ChangeScenario, c: RankedChange) => number) =>
    Object.fromEntries(SCENARIOS.map((s) => [s, included.reduce((a, c) => a + pick(c.scenarios![s], c), 0)])) as Record<Scenario, number>;
  const added = Object.fromEntries(
    SCENARIOS.map((s, i) => [
      s,
      included.reduce((a, c) => a + (c.impact.kind === 'ads' ? c.impact.row.scenarios[s].spend : 0) + (c.cost.monthly_spend?.[i] ?? 0), 0),
    ])
  ) as Record<Scenario, number>;
  return {
    today: { monthly_ad_spend: baseline.monthly_ad_spend, extra_customers_month: 0, net_year: { low: 0, medium: 0, high: 0 } },
    with_plan: {
      monthly_ad_spend: baseline.monthly_ad_spend === null ? null : baseline.monthly_ad_spend + added.medium,
      added_monthly_spend: added,
      team_hours: included.reduce((a, c) => a + c.hours, 0),
      extra_customers_month: total((s) => s.customers_month),
      net_year: total((s) => s.net_year),
    },
    included: included.map((c) => c.id),
  };
}
