import { SCENARIOS, benchmarksFor, type AdPlatformId, type GroundswellConfig, type IndustryProfile, type Scenario, type Triple } from './config.js';

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
  /** Platform rules the row runs under (e.g. an age limit for alcohol), one sentence each. */
  conditions: string[];
  /** Cost per lead above which the medium scenario stops paying back: the stop-loss line. */
  stop_loss_cost_per_lead: number | null;
  /**
   * The value per customer (the average sale) at which the medium scenario breaks even, all else as modeled; null
   * when the return is not modeled. Absent on plans stored before it existed.
   */
  break_even_sale?: number | null;
  /** Where the row's numbers come from. */
  sources: string[];
}

/** Competitors on record advertising, by platform: names from the public ad libraries and Ahrefs paid pages. */
export type RivalAds = Partial<Record<AdPlatformId, string[]>>;

export interface PlanContext {
  /** Who advertises where, from the Ads Current and the ad libraries; a platform with none listed has no evidence either way. */
  rival_ads?: RivalAds;
}

export interface AdPlan {
  rows: PlanRow[];
  /** Competitors on record advertising on each platform, as the plan was told them (empty when none, or not read). */
  rival_ads: RivalAds;
  /** Monthly spend in each scenario across the funded and tested rows. */
  budget: Record<Scenario, number>;
  /** Net over 12 months in each scenario across the funded and tested rows (modeled rows only). */
  year_net: Record<Scenario, number>;
  /** Angles left out of search because their demand is below the setup file's minimum. */
  too_small: { angle: string; demand: number }[];
  /** Angle-platform pairs with no row, and why (no published benchmark for the platform). */
  unmodeled: { angle: string; platform: AdPlatformId; reason: string }[];
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
  cvr: number | null,
  ramp: number[],
  cpl: number | null = null
): ScenarioResult {
  const spend = clicks * cpc;
  // A published cost per lead beats clicks × a lead-form conversion rate.
  const leads = cpl ? spend / cpl : cvr === null ? 0 : clicks * cvr;
  if (!value || (cvr === null && !cpl)) return { cpc, clicks, spend, leads, customers: 0, revenue: 0, net: -spend, year_net: -spend * 12, roi: null };
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

export function buildAdPlan(angles: AngleInput[], industry: IndustryProfile, config: GroundswellConfig, context: PlanContext = {}): AdPlan {
  const rows: PlanRow[] = [];
  const rivalAds: RivalAds = Object.fromEntries(Object.entries(context.rival_ads ?? {}).filter(([, names]) => Array.isArray(names) && names.length).map(([p, names]) => [p, [...new Set(names as string[])]]));
  const too_small: AdPlan['too_small'] = [];
  const unmodeled: AdPlan['unmodeled'] = [];
  const { search, tiers } = config;
  const allowed = industry.ad_platforms;
  const noValue = 'No published price supports a value per customer, so the return is not modeled.';

  for (const angle of angles) {
    const demand = sum(angle.keywords.map((k) => k.monthly_searches));
    const platforms = (angle.platforms ?? allowed).filter((p) => allowed.includes(p));
    const categories = [...new Set([...(industry.restricted ?? []), ...(angle.category ? [angle.category] : [])])];
    const valueSource = angle.value ? angle.value.basis : noValue;

    // Search first: its medium spend sizes the social tests.
    let searchMediumSpend = 0;
    for (const id of platforms.filter((p) => config.platforms[p].buying === 'search')) {
      const p = config.platforms[id];
      const b = benchmarksFor(p, industry);
      if (!b || !b.ctr) {
        unmodeled.push({ angle: angle.name, platform: id, reason: p.benchmarks_missing ?? `No published ${p.label} click-through rate.` });
        continue;
      }
      if (demand < config.min_angle_searches) {
        too_small.push({ angle: angle.name, demand });
        continue;
      }
      const ctr = b.ctr;
      const { cpc, from_bids } = searchCpc(angle.keywords, b.cpc);
      const scenarios = Object.fromEntries(
        SCENARIOS.map((s, i) => {
          const idx = i as 0 | 1 | 2;
          const clicks = demand * search.impression_share[idx] * ctr[idx] * search.ctr_factor[idx];
          const cvr = b.cvr ? b.cvr[idx] * search.cvr_factor[idx] : null;
          return [s, outcome(angle.value, angle.incrementality, idx, cpc[idx], clicks, cvr, search.ramp)];
        })
      ) as Record<Scenario, ScenarioResult>;
      searchMediumSpend += scenarios.medium.spend;
      rows.push(
        finishRow(angle, p.id, p.label, 'search', demand, scenarios, categories, [
          `Demand: ${Math.round(demand).toLocaleString('en-US')} searches a month for ${angle.keywords.length} keyword${angle.keywords.length === 1 ? '' : 's'} (Keyword Planner).`,
          from_bids
            ? 'Cost per click: Keyword Planner top-of-page bids for these keywords.'
            : `Cost per click: ${b.source} (${b.as_of}); Keyword Planner returned no bids.`,
          `Click-through and conversion: ${b.source} (${b.as_of}), discounted for a new account.`,
          `Incrementality: ${angle.incrementality_basis}`,
          `Value: ${valueSource}`,
        ])
      );
    }

    for (const id of platforms.filter((p) => config.platforms[p].buying === 'social')) {
      const p = config.platforms[id];
      const b = benchmarksFor(p, industry);
      if (!b) {
        unmodeled.push({ angle: angle.name, platform: id, reason: p.benchmarks_missing ?? `No published ${p.label} cost per click.` });
        continue;
      }
      const tb = p.test_budget!;
      const spend = Math.max(tb.min_monthly, searchMediumSpend * tb.share_of_search_spend);
      const scenarios = Object.fromEntries(
        SCENARIOS.map((s, i) => {
          const idx = i as 0 | 1 | 2;
          // Social spend is a fixed test; clicks are what it buys.
          return [s, outcome(angle.value, 1, idx, b.cpc[idx], spend / b.cpc[idx], b.cvr ? b.cvr[idx] : null, search.ramp, b.cpl ? b.cpl[idx] : null)];
        })
      ) as Record<Scenario, ScenarioResult>;
      rows.push(
        finishRow(angle, p.id, p.label, 'social', demand, scenarios, categories, [
          `Budget: ${tb.basis}`,
          `Cost per click${b.cpl ? ' and per lead' : b.cvr ? ' and conversion' : ''}: ${b.source} (${b.as_of})${b.note ? `; ${b.note}` : ''}. Estimates: nobody searches for the angle on ${p.label}, so clicks and leads are what the test budget buys.`,
          b.cvr || b.cpl ? `Value: ${valueSource}` : `Value: no published ${p.label} conversion rate, so the return is not modeled.`,
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
    rival_ads: rivalAds,
    budget: Object.fromEntries(SCENARIOS.map((s) => [s, total(s, (r) => r.spend, live)])) as Record<Scenario, number>,
    year_net: Object.fromEntries(SCENARIOS.map((s) => [s, total(s, (r) => r.year_net, modeled)])) as Record<Scenario, number>,
    too_small,
    unmodeled,
  };

  function finishRow(
    angle: AngleInput,
    platform: AdPlatformId,
    label: string,
    buying: 'search' | 'social',
    demand: number,
    scenarios: Record<Scenario, ScenarioResult>,
    categories: string[],
    sources: string[]
  ): PlanRow {
    const cfg = config;
    const m = scenarios.medium;
    const roi_tier: RoiTier = m.roi === null ? 'not modeled' : m.roi < 0 ? 'loses money' : m.roi >= tiers.roi_strong ? 'strong' : 'pays back';
    let recommendation: Recommendation;
    let reason: string;
    const lowPays = (scenarios.low.roi ?? -1) >= 0;
    if (roi_tier === 'strong' || (roi_tier === 'pays back' && lowPays)) {
      recommendation = 'fund';
      reason =
        roi_tier === 'strong'
          ? lowPays
            ? 'Strong in the medium case, and pays back even in the low one.'
            : 'Strong in the medium case; the low case loses money, so it runs with a stop-loss.'
          : 'Pays back in every case.';
    } else if (roi_tier === 'pays back') {
      recommendation = 'test';
      reason = 'Pays back in the medium case but not the low one: a small test with a stop-loss.';
    } else if (roi_tier === 'not modeled') {
      recommendation = buying === 'search' && m.cpc < cfg.tiers.cpc[1] ? 'test' : 'skip';
      reason =
        recommendation === 'test'
          ? 'Cheap clicks on real demand, but no published price to model a return: a small test, measured in calls and visits.'
          : 'No published price to model a return, and the clicks are not cheap enough to test blind.';
    } else {
      const rivals = rivalAds[platform] ?? [];
      if (cfg.rival_ads_test.enabled && rivals.length) {
        // The benchmarks say no; the rivals paying for the channel say the benchmarks may not fit this market.
        recommendation = 'test';
        const named = rivals.length <= 3 ? rivals.join(', ').replace(/, ([^,]*)$/, ' and $1') : `${rivals.slice(0, 2).join(', ')} and ${rivals.length - 2} more`;
        reason = `Loses money at the estimated ticket and close rate, but ${named} ${rivals.length === 1 ? 'is' : 'are'} on record advertising on ${label}: a small test with a stop-loss, to measure the real cost per lead before deciding.`;
        sources = [...sources, `Test despite the benchmarks: ${cfg.rival_ads_test.basis}`];
      } else {
        recommendation = 'skip';
        reason = 'Loses money in the medium case.';
      }
    }
    // A platform rule for one of the business's categories either adds a condition or rules self-serve out.
    const conditions: string[] = [];
    for (const category of categories) {
      const rule = cfg.platforms[platform].restricted_categories?.[category];
      if (!rule) continue;
      if (rule.blocks_self_serve) {
        recommendation = 'skip';
        reason = rule.rule;
      } else {
        conditions.push(rule.rule);
      }
    }
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
      conditions,
      stop_loss_cost_per_lead: stopLoss(angle.value, buying === 'search' ? angle.incrementality : 1),
      // Revenue is customers × the average sale, so the medium case breaks even where that, at its margin, meets the spend.
      break_even_sale: angle.value && m.roi !== null && m.customers > 0 && angle.value.gross_margin[1] > 0 ? m.spend / (m.customers * angle.value.gross_margin[1]) : null,
      sources,
    };
  }
}
