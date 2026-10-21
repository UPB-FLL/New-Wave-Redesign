/**
 * The shape of Groundswell's setup file (../groundswell.config.ts).
 *
 * Everything an audit depends on that is not data about the business lives
 * in the setup file: which platforms exist and their published benchmarks,
 * which industries audit and advertise where, how the low / medium / high
 * scenarios are built, how rows are sorted into tiers, and how close the
 * second pass must come to the first before an audit counts as accurate.
 * Code reads these values; it never hard-codes them.
 *
 * This module imports nothing outside the package, so Groundswell can run
 * outside New Wave as-is.
 */

/** The three scenarios every number is modeled in. */
export const SCENARIOS = ['low', 'medium', 'high'] as const;
export type Scenario = (typeof SCENARIOS)[number];
/** One value per scenario, in SCENARIOS order. */
export type Triple = readonly [number, number, number];

/** A published figure, with where it came from and when. */
export interface Sourced {
  source: string;
  url?: string;
  /** The edition or date the figure is from, e.g. "2025". */
  as_of: string;
}

export type AdPlatformId = 'google_search' | 'meta' | 'reddit' | 'tiktok' | 'linkedin';

/**
 * How a platform buys traffic. `search` platforms are sized by search demand
 * (people already looking); `social` platforms are sized by a test budget,
 * since nobody types the angle into them.
 */
export type BuyingModel = 'search' | 'social';

export interface PlatformBenchmarks extends Sourced {
  /** Cost per click in USD: [low, medium, high] scenario values (the low scenario pays the most). */
  cpc: Triple;
  /** Click-through rate, 0-1; search platforms need it to size clicks. null when no credible source publishes one. */
  ctr: Triple | null;
  /** Share of clicks that become a lead or a visit intent (call, directions, form), 0-1. null when unpublished: the return is then not modeled. */
  cvr: Triple | null;
  /**
   * Cost per lead in USD (the low scenario pays the most). Social platforms use it ahead of the conversion rate when
   * it is published, since their lead rate comes from lead-form campaigns that do not convert like ordinary clicks.
   */
  cpl?: Triple | null;
  /** How the figures were read or derived, when not straight from the table (e.g. CPC from CPM ÷ CTR). */
  note?: string;
}

/** Character limits for one ad format, from the platform's own help pages. */
export interface TemplateSpec extends Sourced {
  format: string;
  fields: Record<string, { max_chars: number; min_count?: number; max_count?: number; note?: string }>;
}

export interface PlatformConfig {
  id: AdPlatformId;
  label: string;
  buying: BuyingModel;
  /** All-industry figures; null when no credible source publishes this platform's costs (its rows are then not modeled). */
  benchmarks: PlatformBenchmarks | null;
  /** Why benchmarks is null, in one sentence. */
  benchmarks_missing?: string;
  /** Per-industry figures, keyed by an industry profile's benchmark_industry; preferred over the all-industry set. */
  by_industry?: Record<string, PlatformBenchmarks>;
  template: TemplateSpec;
  /** Social only: the smallest monthly test worth running (USD), and the share of the angle's search spend to match. */
  test_budget?: { min_monthly: number; share_of_search_spend: number; basis: string };
  /**
   * Rules for restricted categories (e.g. alcohol): the rule in one sentence, and whether it rules out a
   * small business buying on its own (e.g. a required sales representative or spend commitment).
   */
  restricted_categories?: Record<string, { rule: string; blocks_self_serve: boolean; source: string; url?: string }>;
}

/** Where to look and where to advertise for one kind of business. */
export interface IndustryProfile {
  id: string;
  label: string;
  /** Words that suggest this profile (the planner agent may still pick another, within the allowlist). */
  match: string[];
  /** Public platforms the audit checks, in priority order (Google is always checked). */
  audit_platforms: string[];
  /** Ad platforms allowed for this industry. */
  ad_platforms: AdPlatformId[];
  /** Restricted categories this industry falls under (e.g. "alcohol"). */
  restricted?: string[];
  /** Benchmark industry to prefer when a platform publishes per-industry figures. */
  benchmark_industry?: string;
  /** Licence and certification words a competitor benchmark looks for in an About page (whole words). */
  licences?: string[];
  /** Tactics a benchmark must never recommend copying in this industry, on top of the setup file's defaults. */
  do_not_copy?: string[];
}

export interface TierRules {
  /** Cost per click (USD, medium scenario): below the first is "low", at or above the second is "high". */
  cpc: readonly [number, number];
  /** Estimated clicks a month (medium scenario): below the first is "low", at or above the second is "high". */
  clicks: readonly [number, number];
  /** Return on ad spend as net ÷ spend (medium scenario): below 0 loses money; at or above this is "strong". */
  roi_strong: number;
}

export interface SearchScenarioRules {
  /** Share of the searches a new, modest account wins. */
  impression_share: Triple;
  /** Multipliers on the platform's benchmark CTR and CVR (new accounts start below average). */
  ctr_factor: Triple;
  cvr_factor: Triple;
  /** Months before full performance: the first months run at these fractions. */
  ramp: number[];
}

export interface VerificationRules {
  /** How far a re-run figure may move from the first pass and still agree (0-1). */
  tolerance: number;
  /** Most rounds of review → re-interpret → re-run before an audit is flagged instead of delivered. */
  max_rounds: number;
}

/** Share of ad customers who would not have come anyway, by where the business already ranks organically. */
export interface IncrementalityRules extends Sourced {
  ranks_first: number;
  ranks_2_to_4: number;
  ranks_5_plus: number;
}

/** The competitor benchmark: the business against its top competitors (src/benchmark/). */
export interface BenchmarkRules {
  /** Accounts in one benchmark: the business and its top competitors. */
  accounts: number;
  /** Offer and price pages read per account. */
  pricing_pages_per_account: number;
  /** An offer priced below this (USD) counts as an entry product. */
  entry_product_max: number;
  /** Engagement-rate bands (a fraction of followers), named in the write-up as words. */
  engagement_bands: Sourced & { very_low_below: number; low_below: number; normal_below: number };
  /** Media and press domains whose links count as press. */
  press_domains: string[];
  /** Hosting platforms whose links never count as press. */
  platform_hosts: string[];
  /** Tactics no benchmark recommends copying, in any industry. */
  do_not_copy: string[];
}

/** Published figures the change ranking uses to put a return on non-ad changes. */
export interface ImpactRules {
  /** Organic click-through rate by position 1 to 10, 0-1. */
  organic_ctr: Sourced & { by_position: readonly number[] };
  /** Google local pack (Maps) click-through rate by position; positions past the curve count as 0. */
  local_pack_ctr: Sourced & { by_position: readonly number[] };
  /** Months for an SEO change to reach full effect: the first months run at these fractions. */
  seo_ramp: number[];
  /** Where one dedicated page can take searches the business does not rank for yet: [low, medium, high] case, 1 = first. */
  seo_target: { positions: Triple; basis: string };
}

export interface GroundswellConfig {
  version: number;
  /** What an hour of the team's time costs: the cost side of every non-ad change. */
  team: { hourly_cost: number; basis: string };
  /** Team hours for each kind of change: to make it, and a month to keep it going. New Wave's estimates. */
  effort: Record<string, { hours: Triple; monthly_hours?: Triple; basis: string }>;
  impact: ImpactRules;
  incrementality: IncrementalityRules;
  platforms: Record<AdPlatformId, PlatformConfig>;
  industries: IndustryProfile[];
  search: SearchScenarioRules;
  tiers: TierRules;
  /** An angle with fewer monthly searches than this is not worth a search campaign of its own. */
  min_angle_searches: number;
  /** Words an ad may not claim without third-party proof shown with it. */
  unsupported_claims: string[];
  verification: VerificationRules;
  benchmark: BenchmarkRules;
}

/** The benchmarks a platform uses for an industry: its per-industry set when there is one, else the all-industry set. */
export function benchmarksFor(p: PlatformConfig, industry?: IndustryProfile): PlatformBenchmarks | null {
  const key = industry?.benchmark_industry;
  return (key && p.by_industry?.[key]) || p.benchmarks;
}

export function scenarioIndex(s: Scenario): 0 | 1 | 2 {
  return SCENARIOS.indexOf(s) as 0 | 1 | 2;
}

/** Throws with every problem at once, so a bad setup file fails before any audit runs. */
export function validateConfig(c: GroundswellConfig): GroundswellConfig {
  const problems: string[] = [];
  const triple = (path: string, t: readonly number[], { unit = false, ascending }: { unit?: boolean; ascending?: boolean } = {}) => {
    if (t.length !== 3 || t.some((x) => !Number.isFinite(x) || x < 0)) problems.push(`${path} must be three non-negative numbers`);
    else if (unit && t.some((x) => x > 1)) problems.push(`${path} must be between 0 and 1`);
    else if (ascending === true && !(t[0] <= t[1] && t[1] <= t[2])) problems.push(`${path} must rise from low to high`);
    else if (ascending === false && !(t[0] >= t[1] && t[1] >= t[2])) problems.push(`${path} must fall from low to high`);
  };
  for (const [id, p] of Object.entries(c.platforms)) {
    if (p.id !== id) problems.push(`platforms.${id}.id must be "${id}"`);
    if (!p.benchmarks && !p.benchmarks_missing) problems.push(`platforms.${id} has no benchmarks and no benchmarks_missing reason`);
    const sets: [string, PlatformBenchmarks][] = [
      ...(p.benchmarks ? ([[`platforms.${id}.benchmarks`, p.benchmarks]] as [string, PlatformBenchmarks][]) : []),
      ...Object.entries(p.by_industry ?? {}).map(([k, b]): [string, PlatformBenchmarks] => [`platforms.${id}.by_industry.${k}`, b]),
    ];
    for (const [path, b] of sets) {
      if (!b.source || !b.as_of) problems.push(`${path} needs a source and as_of`);
      // The low scenario pays the most per click and converts the least.
      triple(`${path}.cpc`, b.cpc, { ascending: false });
      if (b.ctr) triple(`${path}.ctr`, b.ctr, { unit: true, ascending: true });
      if (b.cvr) triple(`${path}.cvr`, b.cvr, { unit: true, ascending: true });
      if (b.cpl) triple(`${path}.cpl`, b.cpl, { ascending: false });
      if (p.buying === 'search' && !b.ctr) problems.push(`${path}.ctr is required for a search platform`);
    }
    if (p.buying === 'social' && !p.test_budget) problems.push(`platforms.${id} is social and needs a test_budget`);
    if (!p.template.source || Object.keys(p.template.fields).length === 0) problems.push(`platforms.${id}.template needs a source and fields`);
  }
  const ids = new Set<string>();
  for (const ind of c.industries) {
    if (ids.has(ind.id)) problems.push(`industries: duplicate id "${ind.id}"`);
    ids.add(ind.id);
    for (const p of ind.ad_platforms) if (!c.platforms[p]) problems.push(`industries.${ind.id} names unknown ad platform "${p}"`);
  }
  if (!ids.has('general')) problems.push('industries needs a "general" profile to fall back on');
  triple('search.impression_share', c.search.impression_share, { unit: true, ascending: true });
  triple('search.ctr_factor', c.search.ctr_factor, { ascending: true });
  triple('search.cvr_factor', c.search.cvr_factor, { ascending: true });
  if (!(c.tiers.cpc[0] < c.tiers.cpc[1])) problems.push('tiers.cpc must be [lower, upper]');
  if (!(c.tiers.clicks[0] < c.tiers.clicks[1])) problems.push('tiers.clicks must be [lower, upper]');
  if (!(c.team.hourly_cost > 0)) problems.push('team.hourly_cost must be above 0');
  for (const [name, set] of [['organic_ctr', c.impact.organic_ctr], ['local_pack_ctr', c.impact.local_pack_ctr]] as const) {
    const xs = set.by_position;
    if (!set.source || !set.as_of) problems.push(`impact.${name} needs a source and as_of`);
    if (xs.length < 3 || xs.some((x, i) => !(x >= 0 && x <= 1) || (i > 0 && x > xs[i - 1]))) {
      problems.push(`impact.${name}.by_position must be rates between 0 and 1 that fall with position`);
    }
  }
  const target = c.impact.seo_target.positions;
  if (target.some((p) => !Number.isInteger(p) || p < 1 || p > c.impact.organic_ctr.by_position.length) || target[0] < target[1] || target[1] < target[2]) {
    problems.push('impact.seo_target.positions must be whole positions on the organic curve, the low case lowest on the page');
  }
  const bands = c.benchmark.engagement_bands;
  if (!(bands.very_low_below > 0 && bands.very_low_below < bands.low_below && bands.low_below < bands.normal_below && bands.normal_below < 1)) {
    problems.push('benchmark.engagement_bands must rise between 0 and 1');
  }
  if (!bands.source || !bands.as_of) problems.push('benchmark.engagement_bands needs a source and as_of');
  if (!(c.benchmark.accounts >= 2)) problems.push('benchmark.accounts must be at least 2 (the business and a competitor)');
  if (!(c.benchmark.pricing_pages_per_account >= 1)) problems.push('benchmark.pricing_pages_per_account must be at least 1');
  if (!c.benchmark.press_domains.length) problems.push('benchmark.press_domains must list at least one domain');
  if (c.benchmark.press_domains.some((d) => c.benchmark.platform_hosts.includes(d))) problems.push('benchmark.press_domains may not list a platform host');
  if (!(c.verification.tolerance > 0 && c.verification.tolerance < 1)) problems.push('verification.tolerance must be between 0 and 1');
  if (!(c.verification.max_rounds >= 2)) problems.push('verification.max_rounds must be at least 2 (a first pass and a re-run)');
  if (problems.length) throw new Error(`Groundswell setup file is invalid:\n- ${problems.join('\n- ')}`);
  return c;
}
