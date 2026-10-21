import { SCENARIOS, type AdPlatformId, type GroundswellConfig, type Scenario, type Triple } from './config.js';

/**
 * The ad plan: every angle the business can win, on every platform its
 * industry allows, in a low, medium and high scenario, sorted by cost per
 * click, estimated clicks and return.
 *
 * An angle is a reason to choose the business that people search for:
 * "event space", "pizza", "happy hour", not "best brewery" when the city's
 * best-of lists already name five other breweries. Angles come from the
 * business's own data (its keyword demand, its menu or price list, what it
 * already ranks for); this module only does the arithmetic, so the same
 * inputs always give the same plan.
 *
 * Search platforms (people already looking):
 *   clicks    = monthly searches × impression share × CTR
 *   spend     = clicks × cost per click
 * Social platforms (nobody types the angle in, so the budget sets the size):
 *   spend     = max(platform minimum test, matched share of the angle's medium search spend)
 *   clicks    = spend ÷ cost per click
 * Then, for both:
 *   leads     = clicks × conversion rate
 *   customers = leads × incrementality × close rate
 *   revenue   = customers × value per customer
 *   net       = revenue × gross margin − spend       (monthly, at full speed)
 *   year net  = the same over 12 months with the ramp-up months scaled down
 *
 * The management fee is not in these numbers: it replaces what the business
 * already pays, so ad spend is the only new money. An angle without a
 * published price has no value per customer; its rows show cost and clicks
 * and say the return is not modeled, rather than guessing.
 */

export interface AngleKeyword {
  keyword: string;
  monthly_searches: number;
  /** Keyword Planner's top-of-page bid range (USD), when it returned one. */
  low_bid_usd: number | null;
  high_bid_usd: number | null;
}

export interface AngleValue {
  /** Value of one new customer (USD): a booking, an order, a job. */
  per_customer: Triple;
  /** Share of leads that become customers, 0-1. */
  close: Triple;
  /** Gross margin on that value, 0-1. */
  gross_margin: Triple;
  /** One sentence: where the value, close rate and margin come from. */
  basis: string;
}

export interface AngleInput {
  id: string;
  name: string;
  /** Why the business can win this angle, in one sentence. */
  why: string;
  keywords: AngleKeyword[];
  /** null when no published price supports a value: the return is then not modeled. */
  value: AngleValue | null;
  /** Share of ad customers who would not have come anyway, 0-1 (lower where the business already ranks). */
  incrementality: number;
  incrementality_basis: string;
  /** Platforms worth testing for this angle; omitted means every platform the industry allows. */
  platforms?: AdPlatformId[];
  /** A restricted ad category the angle falls under (e.g. "alcohol"), matched against each platform's rules. */
  category?: string;
}

export interface ScenarioResult {
  cpc: number;
  clicks: number;
  spend: number;
  leads: number;
  customers: number;
  revenue: number;
  /** Monthly, at full speed. */
  net: number;
  /** Net over the first 12 months, ramp included. */
  year_net: number;
  /** net ÷ spend; null when the return is not modeled or nothing is spent. */
  roi: number | null;
}

export type Tier = 'low' | 'medium' | 'high';
export type RoiTier = 'loses money' | 'pays back' | 'strong' | 'not modeled';
export type Recommendation = 'fund' | 'test' | 'skip';

export interface PlanRow {
  angle_id: string;
  angle: string;
  platform: AdPlatformId;
  platform_label: string;
  buying: 'search' | 'social';
  /** Monthly searches behind the angle (search rows), for context on social rows too. */
  demand: number;
  scenarios: Record<Scenario, ScenarioResult>;
  cpc_tier: Tier;
  clicks_tier: Tier;
  roi_tier: RoiTier;
  recommendation: Recommendation;
  /** One plain sentence: why this row is funded, tested or skipped. */
  reason: string;
  /** Cost per lead above which the medium scenario stops paying back: the stop-loss line. */
  stop_loss_cost_per_lead: number | null;
  /** Where the row's numbers come from. */
  sources: string[];
}

export interface AdPlan {
  rows: PlanRow[];
  /** Monthly spend in each scenario across the funded and tested rows. */
  budget: Record<Scenario, number>;
  /** Net over 12 months in each scenario across the funded and tested rows (modeled rows only). */
  year_net: Record<Scenario, number>;
  /** Angles left out of search because their demand is below the setup file's minimum. */
  too_small: { angle: string; demand: number }[];
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Search cost per click from the angle's own bids: [high, mid, between low and mid]; the benchmark when there are none. */
export function searchCpc(keywords: AngleKeyword[], fallback: Triple): { cpc: Triple; from_bids: boolean } {
  const lows = keywords.map((k) => k.low_bid_usd).filter((x): x is number => x !== null && x > 0);
  const highs = keywords.map((k) => k.high_bid_usd).filter((x): x is number => x !== null && x > 0);
  const low = median(lows);
  const high = median(highs);
  if (low === null || high === null || high < low) return { cpc: fallback, from_bids: false };
  const mid = (low + high) / 2;
  return { cpc: [high, mid, (low + mid) / 2], from_bids: true };
}

function tierOf(x: number, [lower, upper]: readonly [number, number]): Tier {
  return x < lower ? 'low' : x >= upper ? 'high' : 'medium';
}

function yearNet(monthlyNet: number, spend: number, ramp: number[]): number {
  // Spend runs at full speed from month one; results ramp up.
  const gross = monthlyNet + spend;
  let total = 0;
  for (let m = 0; m < 12; m++) total += gross * (m < ramp.length ? ramp[m] : 1) - spend;
  return total;
}

function outcome(
  value: AngleValue | null,
  incrementality: number,
  i: 0 | 1 | 2,
  cpc: number,
  clicks: number,
  cvr: number,
  ramp: number[]
): ScenarioResult {
  const spend = clicks * cpc;
  const leads = clicks * cvr;
  if (!value) return { cpc, clicks, spend, leads, customers: 0, revenue: 0, net: -spend, year_net: -spend * 12, roi: null };
  const customers = leads * incrementality * value.close[i];
  const revenue = customers * value.per_customer[i];
  const net = revenue * value.gross_margin[i] - spend;
  return { cpc, clicks, spend, leads, customers, revenue, net, year_net: yearNet(net, spend, ramp), roi: spend > 0 ? net / spend : null };
}

/** The highest cost per lead at which the medium scenario still breaks even. */
function stopLoss(value: AngleValue | null, incrementality: number): number | null {
  if (!value) return null;
  return value.per_customer[1] * value.close[1] * value.gross_margin[1] * incrementality;
}

export function buildAdPlan(angles: AngleInput[], allowed: AdPlatformId[], config: GroundswellConfig): AdPlan {
  const rows: PlanRow[] = [];
  const too_small: AdPlan['too_small'] = [];
  const { search, tiers } = config;

  for (const angle of angles) {
    const demand = sum(angle.keywords.map((k) => k.monthly_searches));
    const platforms = (angle.platforms ?? allowed).filter((p) => allowed.includes(p));
    const searchPlatforms = platforms.filter((p) => config.platforms[p].buying === 'search');
    const socialPlatforms = platforms.filter((p) => config.platforms[p].buying === 'social');
    const valueSource = angle.value ? angle.value.basis : 'No published price supports a value per customer, so the return is not modeled.';

    // Search first: its medium spend sizes the social tests.
    let searchMediumSpend = 0;
    for (const id of searchPlatforms) {
      const p = config.platforms[id];
      if (demand < config.min_angle_searches) {
        too_small.push({ angle: angle.name, demand });
        continue;
      }
      const { cpc, from_bids } = searchCpc(angle.keywords, p.benchmarks.cpc);
      const scenarios = Object.fromEntries(
        SCENARIOS.map((s, i) => {
          const idx = i as 0 | 1 | 2;
          const clicks = demand * search.impression_share[idx] * p.benchmarks.ctr[idx] * search.ctr_factor[idx];
          return [s, outcome(angle.value, angle.incrementality, idx, cpc[idx], clicks, p.benchmarks.cvr[idx] * search.cvr_factor[idx], search.ramp)];
        })
      ) as Record<Scenario, ScenarioResult>;
      searchMediumSpend += scenarios.medium.spend;
      rows.push(
        finishRow(angle, p.id, p.label, 'search', demand, scenarios, config, [
          `Demand: ${Math.round(demand).toLocaleString('en-US')} searches a month for ${angle.keywords.length} keyword${angle.keywords.length === 1 ? '' : 's'} (Keyword Planner).`,
          from_bids
            ? 'Cost per click: Keyword Planner top-of-page bids for these keywords.'
            : `Cost per click: ${p.benchmarks.source} (${p.benchmarks.as_of}); Keyword Planner returned no bids.`,
          `Click-through and conversion: ${p.benchmarks.source} (${p.benchmarks.as_of}), discounted for a new account.`,
          `Incrementality: ${angle.incrementality_basis}`,
          `Value: ${valueSource}`,
        ])
      );
    }

    for (const id of socialPlatforms) {
      const p = config.platforms[id];
      const tb = p.test_budget!;
      const spend = Math.max(tb.min_monthly, searchMediumSpend * tb.share_of_search_spend);
      const scenarios = Object.fromEntries(
        SCENARIOS.map((s, i) => {
          const idx = i as 0 | 1 | 2;
          const cpc = p.benchmarks.cpc[idx];
          // Social spend is a fixed test; clicks are what it buys.
          return [s, outcome(angle.value, 1, idx, cpc, spend / cpc, p.benchmarks.cvr[idx], search.ramp)];
        })
      ) as Record<Scenario, ScenarioResult>;
      rows.push(
        finishRow(angle, p.id, p.label, 'social', demand, scenarios, config, [
          `Budget: ${tb.basis}`,
          `Cost per click and conversion: ${p.benchmarks.source} (${p.benchmarks.as_of}). Estimates: nobody searches for the angle on ${p.label}, so clicks are what the test budget buys.`,
          `Value: ${valueSource}`,
        ])
      );
    }
  }

  const order: Record<Recommendation, number> = { fund: 0, test: 1, skip: 2 };
  rows.sort(
    (a, b) =>
      order[a.recommendation] - order[b.recommendation] ||
      (b.scenarios.medium.roi ?? -Infinity) - (a.scenarios.medium.roi ?? -Infinity) ||
      b.scenarios.medium.clicks - a.scenarios.medium.clicks ||
      a.scenarios.medium.cpc - b.scenarios.medium.cpc
  );

  const live = rows.filter((r) => r.recommendation !== 'skip');
  const total = (s: Scenario, pick: (r: ScenarioResult) => number, rs: PlanRow[]) => sum(rs.map((r) => pick(r.scenarios[s])));
  const modeled = live.filter((r) => r.roi_tier !== 'not modeled');
  return {
    rows,
    budget: Object.fromEntries(SCENARIOS.map((s) => [s, total(s, (r) => r.spend, live)])) as Record<Scenario, number>,
    year_net: Object.fromEntries(SCENARIOS.map((s) => [s, total(s, (r) => r.year_net, modeled)])) as Record<Scenario, number>,
    too_small,
  };

  function finishRow(
    angle: AngleInput,
    platform: AdPlatformId,
    label: string,
    buying: 'search' | 'social',
    demand: number,
    scenarios: Record<Scenario, ScenarioResult>,
    cfg: GroundswellConfig,
    sources: string[]
  ): PlanRow {
    const m = scenarios.medium;
    const roi_tier: RoiTier = m.roi === null ? 'not modeled' : m.roi < 0 ? 'loses money' : m.roi >= tiers.roi_strong ? 'strong' : 'pays back';
    let recommendation: Recommendation;
    let reason: string;
    if (roi_tier === 'strong' || (roi_tier === 'pays back' && (scenarios.low.roi ?? -1) >= 0)) {
      recommendation = 'fund';
      reason = 'Pays back in the medium scenario, with a stop-loss for the low one.';
    } else if (roi_tier === 'pays back') {
      recommendation = 'test';
      reason = 'Pays back in the medium scenario but not the low one: a small test with a stop-loss.';
    } else if (roi_tier === 'not modeled') {
      recommendation = buying === 'search' && m.cpc < cfg.tiers.cpc[1] ? 'test' : 'skip';
      reason =
        recommendation === 'test'
          ? 'Cheap clicks on real demand, but no published price to model a return: a small test, measured in calls and visits.'
          : 'No published price to model a return, and the clicks are not cheap enough to test blind.';
    } else {
      recommendation = 'skip';
      reason = 'Loses money in the medium scenario.';
    }
    const restriction = cfgRestriction(cfg, platform, angle);
    if (restriction && recommendation !== 'skip') reason += ` ${restriction}`;
    return {
      angle_id: angle.id,
      angle: angle.name,
      platform,
      platform_label: label,
      buying,
      demand,
      scenarios,
      cpc_tier: tierOf(m.cpc, cfg.tiers.cpc),
      clicks_tier: tierOf(m.clicks, cfg.tiers.clicks),
      roi_tier,
      recommendation,
      reason,
      stop_loss_cost_per_lead: stopLoss(angle.value, buying === 'search' ? angle.incrementality : 1),
      sources,
    };
  }
}

/** A platform's restriction note for the angle's category, if the angle declares one (e.g. "alcohol"). */
function cfgRestriction(cfg: GroundswellConfig, platform: AdPlatformId, angle: AngleInput): string | null {
  const notes = cfg.platforms[platform].restricted_categories;
  if (!notes || !angle.category) return null;
  return notes[angle.category] ?? null;
}
