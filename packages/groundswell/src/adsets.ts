import { buildAdPlan, type AdPlan, type AngleInput, type AngleKeyword, type PlanRow, type ScenarioResult } from './adplan.js';
import type { AdBasis, ChannelAdSet } from './channels.js';
import type { CheckedAd } from './adcopy.js';
import { incrementalityFor } from './audit.js';
import { benchmarksFor, SCENARIOS, type GroundswellConfig, type IndustryProfile, type Scenario } from './config.js';

/**
 * The ad sets: the plan's rows turned into what a person imports and runs,
 * on Meta (campaigns, ad sets, ads with the business's own Instagram images)
 * and Google Search (a campaign, ad groups with match types, shared
 * negatives), each with what it is for, how it works, what to watch, and
 * its spend and return at the plan's low, medium and high budgets.
 *
 * Three goals:
 * - leads: one ad set or ad group per row the plan funds or tests; its
 *   tiers are the row's scenarios, so the return is the plan's arithmetic.
 * - engagement: one Meta ad set putting the business's best posts in front
 *   of nearby people; its budget is the setup file's share of the plan's
 *   spend; its return is not modeled (engagement is not a sale).
 * - rankings: one Google ad group on the searches the site already ranks
 *   close to page one for (Ahrefs), priced by the plan's own model as one
 *   more angle. Paid clicks never move an organic position; the set says so.
 *
 * The arithmetic is the plan's (buildAdPlan); this module only arranges it.
 */

export type AdSetGoal = 'engagement' | 'rankings' | 'leads';

/**
 * One budget's forecast. The three budgets (low, medium, high) are spend
 * levels: the plan's base-case spend times the setup file's multipliers,
 * priced at the base case's own cost per click, lead rate, close rate and
 * value, so the return is the return on that spend.
 */
export interface TierForecast {
  /** Monthly spend at full speed (USD). */
  monthly: number;
  daily: number;
  clicks: number;
  leads: number;
  customers: number;
  revenue: number;
  /** Monthly net at full speed: revenue × margin − spend. */
  net: number;
  /** Net over the first 12 months, ramp included. */
  year_net: number;
  /** net ÷ spend; null when the return is not modeled. */
  roi: number | null;
  /** True when the area's searches cannot supply the clicks this budget would buy: the spend stops there. */
  capped?: boolean;
}

/** The plan's conservative, base and upside cases at the medium budget: how far the return can move. */
export interface OutcomeRange {
  conservative: { net: number; year_net: number; roi: number | null };
  base: { net: number; year_net: number; roi: number | null };
  upside: { net: number; year_net: number; roi: number | null };
}

/** One of the business's own images, stored by the creative step. */
export interface CreativeRef {
  path: string;
  name: string;
  permalink: string | null;
  likes: number | null;
  comments: number | null;
  width?: number | null;
  height?: number | null;
}

export type MetaCallToAction = 'LEARN_MORE' | 'BOOK_NOW' | 'CALL_NOW' | 'CONTACT_US' | 'GET_QUOTE' | 'SHOP_NOW' | 'SIGN_UP';

export interface MetaAd {
  name: string;
  primary_text: string;
  headline: string;
  description: string;
  call_to_action: MetaCallToAction;
  /** The words set on the image. */
  image_headline: string;
  image: CreativeRef | null;
  /** The landing page, with UTM tags. */
  link: string;
  display_link: string;
}

export interface MetaAdSet {
  id: string;
  campaign: string;
  name: string;
  goal: AdSetGoal;
  angle: string | null;
  objective: 'OUTCOME_ENGAGEMENT' | 'OUTCOME_TRAFFIC' | 'OUTCOME_LEADS';
  optimization_goal: 'POST_ENGAGEMENT' | 'LANDING_PAGE_VIEWS' | 'OFFSITE_CONVERSIONS';
  recommendation: 'fund' | 'test';
  why: string;
  /** How the set moves its goal, plainly, with what it cannot do. */
  mechanism: string;
  /** What to watch to know it is working. */
  kpi: string;
  audience: { location: string; radius_miles: number; age_min: number; age_max: number; interests: string[] };
  placements: string[];
  tiers: Record<Scenario, TierForecast>;
  /** The conservative to upside range at the medium budget; null when the return is not modeled. */
  range: OutcomeRange | null;
  modeled: boolean;
  stop_loss: string | null;
  ads: MetaAd[];
  sources: string[];
  /** The data set the set is built on (keywords, own posts, a review rating…) and its evidence; absent on runs before 2026-10-27. */
  basis?: AdBasis;
}

export interface GoogleKeyword {
  text: string;
  match: 'exact' | 'phrase';
  monthly_searches: number | null;
  low_bid_usd: number | null;
  high_bid_usd: number | null;
  /** The site's organic position for it (Ahrefs), when it ranks. */
  position: number | null;
}

export interface GoogleAdGroup {
  id: string;
  name: string;
  goal: 'leads' | 'rankings';
  angle: string;
  recommendation: 'fund' | 'test';
  why: string;
  mechanism: string;
  kpi: string;
  keywords: GoogleKeyword[];
  final_url: string;
  headlines: string[];
  descriptions: string[];
  path1: string;
  path2: string;
  tiers: Record<Scenario, TierForecast>;
  range: OutcomeRange | null;
  modeled: boolean;
  stop_loss: string | null;
  sources: string[];
  basis?: AdBasis;
}

export interface Negative {
  text: string;
  match: 'phrase' | 'exact';
  reason: string;
}

export interface GoogleCampaign {
  name: string;
  bid_strategy: 'Maximize clicks';
  networks: 'Google Search';
  location: string;
  ad_groups: GoogleAdGroup[];
  negatives: Negative[];
}

export interface Carousel {
  title: string;
  slides: { headline: string; body: string }[];
  caption: string;
}

/** The parts a writer (the engine's model call) supplies, already held to the data by the caller. */
export interface AdSetsWriting {
  /** Ads for the engagement set: the words on each image and the post text. */
  engagement_ads: { primary_text: string; headline: string; image_headline: string }[];
  /** The words on the image for each angle's Meta ad, by angle id. */
  image_headlines: Record<string, string>;
  /** A Meta ad for each angle, used where the copy step wrote none (it is optional), by angle id. */
  meta_ads?: Record<string, { primary_text: string; headline: string; description: string; call_to_action: string }>;
  carousel: Carousel | null;
  /** Meta ads that state the business's rating with its platform named (the proof set), when the setup file's proof rule allows. */
  proof_ads?: { primary_text: string; headline: string; image_headline: string }[];
  /** Searches the business does not serve (other services, other places, job seekers). */
  negatives: { text: string; reason: string }[];
  /** Meta interests that fit the business's customers. */
  interests: string[];
}

export interface AdSetsInput {
  business: {
    name: string;
    /** Two to four capitals for names in the ad accounts (TU for Transmissions Unlimited). */
    code: string;
    website: string | null;
    /** A booking or contact page, when the site has one. */
    landing: string | null;
    city: string | null;
    instagram: string | null;
  };
  plan: AdPlan;
  angles: AngleInput[];
  industry: IndustryProfile;
  /** The copy step's ads (Google responsive search ads, Meta feed ads). */
  copy: CheckedAd[];
  /** Searches the site ranks for (Ahrefs), with its best position. */
  ranking: { keyword: string; volume: number | null; position: number | null; url: string | null }[];
  /** Keyword Planner's ideas with bids, to price the rankings keywords. */
  ideas: AngleKeyword[];
  /** The business's own images, best first. */
  creative: CreativeRef[];
  /** Whether the site carries a Meta pixel (the ads step): a leads set needs one to optimise for leads. */
  meta_pixel: boolean;
  writing: AdSetsWriting | null;
  /** YYYY-MM, for names. */
  month: string;
  /** The business's best review rating (Yelp's, else Google's), for the proof set; absent or null leaves the set out. */
  proof?: { platform: 'Yelp' | 'Google'; rating: number; reviews: number } | null;
}

export interface AdSetsPlan {
  meta: MetaAdSet[];
  google: GoogleCampaign | null;
  carousel: Carousel | null;
  /** Spend and return across every set, per scenario. Return over the modeled sets only. */
  totals: Record<Scenario, { monthly: number; daily: number; net: number; year_net: number; roi: number | null; modeled_spend: number }>;
  goals: Record<AdSetGoal, number>;
  notes: string[];
  /** Reddit and TikTok sets (channels.ts), outside the Meta and Google totals; absent on runs before 2026-10-27. */
  reddit?: ChannelAdSet[];
  tiktok?: ChannelAdSet[];
}

const DAYS_PER_MONTH = 30.4;
const round2 = (x: number) => Math.round(x * 100) / 100;
const slug = (s: string) =>
  s
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 28);

const roi2 = (x: number | null) => (x === null ? null : Math.round(x * 100) / 100);

/** Net over the first 12 months at a monthly net: spend runs from month one, results ramp up (the plan's own rule). */
function yearNet(net: number, spend: number, ramp: number[]): number {
  const gross = net + spend;
  let total = 0;
  for (let m = 0; m < 12; m++) total += gross * (m < ramp.length ? ramp[m] : 1) - spend;
  return total;
}

/**
 * A row priced at the setup file's three budgets: the base case's spend times
 * each multiplier, at the base case's own rates. Search buys no more clicks
 * than the plan's upside case finds in the area (its most impression share).
 */
export function budgetTiers(row: PlanRow, config: GroundswellConfig): Record<Scenario, TierForecast> {
  const m = row.scenarios.medium;
  const modeled = row.roi_tier !== 'not modeled';
  const cpc = m.clicks > 0 ? m.spend / m.clicks : m.cpc;
  const leadsPerClick = m.clicks > 0 ? m.leads / m.clicks : 0;
  const customersPerLead = m.leads > 0 ? m.customers / m.leads : 0;
  const valuePerCustomer = m.customers > 0 ? m.revenue / m.customers : 0;
  const margin = m.revenue > 0 ? (m.net + m.spend) / m.revenue : 0;
  const cap = row.buying === 'search' ? Math.max(m.clicks, row.scenarios.high.clicks) : Infinity;
  return Object.fromEntries(
    SCENARIOS.map((s, i) => {
      const wanted = m.spend * config.adsets.budget_multipliers[i];
      const clicks = Math.min(cpc > 0 ? wanted / cpc : 0, cap);
      const spend = clicks * cpc;
      const leads = clicks * leadsPerClick;
      const customers = leads * customersPerLead;
      const revenue = customers * valuePerCustomer;
      const net = modeled ? revenue * margin - spend : -spend;
      return [
        s,
        {
          monthly: round2(spend),
          daily: round2(spend / DAYS_PER_MONTH),
          clicks: Math.round(clicks),
          leads: round2(leads),
          customers: round2(customers),
          revenue: round2(revenue),
          net: round2(net),
          year_net: round2(modeled ? yearNet(net, spend, config.search.ramp) : -spend * 12),
          roi: modeled && spend > 0 ? roi2(net / spend) : null,
          ...(spend < wanted - 0.005 ? { capped: true } : {}),
        },
      ];
    })
  ) as Record<Scenario, TierForecast>;
}

/** The plan's conservative, base and upside cases for a row (at its base-case budget). */
export function outcomeRange(row: PlanRow): OutcomeRange | null {
  if (row.roi_tier === 'not modeled') return null;
  const pick = (r: ScenarioResult) => ({ net: round2(r.net), year_net: round2(r.year_net), roi: roi2(r.roi) });
  return { conservative: pick(row.scenarios.low), base: pick(row.scenarios.medium), upside: pick(row.scenarios.high) };
}

/** Adds UTM tags to a landing page. */
export function withUtm(url: string, tags: Record<string, string>): string {
  try {
    const u = new URL(url);
    for (const [k, v] of Object.entries(tags)) u.searchParams.set(k, v);
    return u.toString();
  } catch {
    return url;
  }
}

const hostOf = (url: string | null) => {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, '') : '';
  } catch {
    return '';
  }
};

const field = (ad: CheckedAd | undefined, name: string): string[] => {
  const v = ad?.fields[name];
  return v === undefined ? [] : Array.isArray(v) ? v : [v];
};

/** Meta's button for an angle's ad, from the copy step's call to action. */
export function metaCta(text: string | undefined): MetaCallToAction {
  const t = (text ?? '').toLowerCase();
  if (/\bcall\b/.test(t)) return 'CALL_NOW';
  if (/\bbook|reserv|appointment|schedule\b/.test(t)) return 'BOOK_NOW';
  if (/\bquote|estimate\b/.test(t)) return 'GET_QUOTE';
  if (/\bshop|order|buy\b/.test(t)) return 'SHOP_NOW';
  if (/\bcontact|message\b/.test(t)) return 'CONTACT_US';
  return 'LEARN_MORE';
}

/** The youngest audience a row's platform rules allow (an alcohol rule names 21). */
const ageMin = (conditions: string[]) => (conditions.some((c) => /\b21\b/.test(c)) ? 21 : 18);

const MECHANISM = {
  leadsMeta:
    'Shows the offer to people near the business who match its customers, and sends them to the page where they book, call or ask. It pays only if those visits turn into customers, so it runs with a stop-loss.',
  leadsGoogle:
    'Puts the business at the top of the page for people already searching for this, with an ad written for the search. Each ad group has its own keywords, so the report shows which searches turn into calls and bookings.',
  engagement:
    'Puts the posts that already earn the most likes and comments in front of nearby people who look like the business’s customers. More saves, shares and follows give the next posts more reach, and everyone who engages can be shown the leads ads afterwards.',
  rankings:
    'Search ads on the searches the site already ranks close to page one for, sent to the page that ranks. Paid clicks do not move an organic position; they hold the top of the page while the page fixes in the plan take effect, and show which of these searches turn into customers, so those pages are worked on first.',
};

const KPI = {
  leadsMeta: 'Cost per lead against the stop-loss; landing-page views to leads.',
  leadsGoogle: 'Cost per call or booking against the stop-loss; search terms that spend without converting become negatives.',
  engagement: 'Saves and shares per 1,000 people reached; profile visits and follows; how much of the leads audience has engaged.',
  rankings: 'Search Console impressions and average position for these searches; calls and bookings from the ad group.',
};

/** The rankings angle: searches the site ranks for between the setup file's positions, with enough demand, not already in a leads group. */
export function rankingsAngle(input: AdSetsInput, taken: Set<string>, config: GroundswellConfig): AngleInput | null {
  const [best, worst] = config.adsets.rankings_positions;
  const bids = new Map(input.ideas.map((k) => [k.keyword.toLowerCase(), k]));
  const keywords = input.ranking
    .filter((k) => k.position !== null && k.position >= best && k.position <= worst && (k.volume ?? 0) >= config.adsets.rankings_min_searches)
    .filter((k) => !taken.has(k.keyword.toLowerCase()))
    .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
    .slice(0, config.adsets.keywords_per_group);
  if (!keywords.length) return null;
  const value = input.angles.find((a) => a.value)?.value ?? null;
  const bestPos = Math.min(...keywords.map((k) => k.position as number));
  const inc = incrementalityFor(bestPos, config);
  return {
    id: 'rankings',
    name: 'Close to page one',
    why: `The site already ranks ${best} to ${worst} for these searches (Ahrefs); they are the pages closest to paying back.`,
    keywords: keywords.map((k) => {
      const idea = bids.get(k.keyword.toLowerCase());
      return { keyword: k.keyword, monthly_searches: k.volume ?? 0, low_bid_usd: idea?.low_bid_usd ?? null, high_bid_usd: idea?.high_bid_usd ?? null };
    }),
    value,
    incrementality: inc.value,
    incrementality_basis: inc.basis,
    platforms: ['google_search'],
  };
}

/** Keywords for an ad group: exact match for each, phrase match for the two with the most searches. */
function keywordsFor(angle: AngleInput, positions: Map<string, number>, limit: number): GoogleKeyword[] {
  const sorted = [...angle.keywords].sort((a, b) => b.monthly_searches - a.monthly_searches).slice(0, limit);
  const base = (k: AngleKeyword) => ({
    monthly_searches: k.monthly_searches,
    low_bid_usd: k.low_bid_usd,
    high_bid_usd: k.high_bid_usd,
    position: positions.get(k.keyword.toLowerCase()) ?? null,
  });
  return [
    ...sorted.map((k) => ({ text: k.keyword, match: 'exact' as const, ...base(k) })),
    ...sorted.slice(0, 2).map((k) => ({ text: k.keyword, match: 'phrase' as const, ...base(k) })),
  ];
}

const stopLossLine = (row: PlanRow) =>
  row.stop_loss_cost_per_lead === null
    ? 'No modeled stop-loss: pause after 60 days unless it brings tracked calls or bookings.'
    : `Pause if leads cost more than $${Math.round(row.stop_loss_cost_per_lead).toLocaleString('en-US')} each after 60 days: above that the medium case stops paying back.`;

export function buildAdSets(input: AdSetsInput, config: GroundswellConfig): AdSetsPlan {
  const notes: string[] = [];
  const { business, plan, angles } = input;
  const angleById = new Map(angles.map((a) => [a.id, a]));
  const live = plan.rows.filter((r) => r.recommendation !== 'skip');
  const copyFor = (row: PlanRow) => input.copy.find((ad) => ad.angle_id === row.angle_id && ad.platform === row.platform);
  const landing = business.landing || business.website || (business.instagram ? `https://www.instagram.com/${business.instagram}/` : '');
  const area = business.city ?? 'the business’s area';
  const code = business.code;
  const images = input.creative;
  let imageAt = 0;
  const nextImage = () => (images.length ? images[imageAt++ % images.length] : null);
  if (!images.length) notes.push('No usable Instagram image was found, so the Meta ads use the business’s colours and words only. Add the business’s own photos before they run.');
  if (!business.website) notes.push('There is no website, so the ads send people to the Instagram profile until a page exists.');

  // Meta: leads sets from the plan's rows, then the engagement set.
  const meta: MetaAdSet[] = [];
  const leadsCampaign = `${code}_LEADS_${input.meta_pixel ? 'LEADS' : 'TRAFFIC'}_${input.month}`;
  for (const row of live.filter((r) => r.platform === 'meta')) {
    const angle = angleById.get(row.angle_id);
    const written = input.writing?.meta_ads?.[row.angle_id];
    // The copy step's ad first (held to each field's limit); the writer's when the copy step wrote none.
    const ad: CheckedAd | undefined =
      copyFor(row) ??
      (written
        ? {
            platform: 'meta',
            angle_id: row.angle_id,
            angle: row.angle,
            platform_label: row.platform_label,
            recommendation: row.recommendation as 'fund' | 'test',
            format: config.platforms.meta.template.format,
            limits_source: config.platforms.meta.template.source,
            fields: { primary_text: written.primary_text, headline: written.headline, description: written.description },
            targeting: '',
            call_to_action: written.call_to_action,
          }
        : undefined);
    const name = `${code}_${slug(row.angle)}_${slug(area.split(',')[0])}_${input.month}`;
    const adName = `IMG_${slug(row.angle)}_V1`;
    meta.push({
      id: `meta-${row.angle_id}`,
      campaign: leadsCampaign,
      name,
      goal: 'leads',
      angle: row.angle,
      objective: input.meta_pixel ? 'OUTCOME_LEADS' : 'OUTCOME_TRAFFIC',
      optimization_goal: input.meta_pixel ? 'OFFSITE_CONVERSIONS' : 'LANDING_PAGE_VIEWS',
      recommendation: row.recommendation as 'fund' | 'test',
      why: [angle?.why, row.reason].filter(Boolean).join(' '),
      mechanism: MECHANISM.leadsMeta,
      kpi: KPI.leadsMeta,
      audience: { location: area, radius_miles: 15, age_min: ageMin(row.conditions), age_max: 65, interests: input.writing?.interests ?? [] },
      placements: ['Facebook feed', 'Instagram feed', 'Instagram stories', 'Instagram reels'],
      tiers: budgetTiers(row, config),
      range: outcomeRange(row),
      modeled: row.roi_tier !== 'not modeled',
      stop_loss: stopLossLine(row),
      ads: ad
        ? [
            {
              name: adName,
              primary_text: field(ad, 'primary_text')[0] ?? '',
              headline: field(ad, 'headline')[0] ?? row.angle,
              description: field(ad, 'description')[0] ?? '',
              call_to_action: metaCta(ad.call_to_action),
              image_headline: input.writing?.image_headlines[row.angle_id] ?? field(ad, 'headline')[0] ?? row.angle,
              image: nextImage(),
              link: withUtm(landing, { utm_source: 'meta', utm_medium: 'paid_social', utm_campaign: leadsCampaign.toLowerCase(), utm_content: adName.toLowerCase() }),
              display_link: hostOf(landing),
            },
          ]
        : [],
      sources: row.sources,
      basis: { data: 'keywords', evidence: `${row.angle}: ${row.demand.toLocaleString('en-US')} searches a month behind the angle (Keyword Planner).` },
    });
    if (!ad) notes.push(`The ${row.angle} set on Meta has no ad yet: the copy step did not write one.`);
  }
  const metaMin = config.platforms.meta.test_budget?.min_monthly ?? 0;
  if (meta.some((m) => m.tiers.low.monthly < metaMin)) {
    notes.push(`On Meta the low budget is under New Wave’s smallest useful test ($${metaMin} a month): it learns slowly, so judge it on cost per lead after 60 days, not 30.`);
  }
  if (!input.meta_pixel && meta.length) {
    notes.push('No Meta pixel was found on the site, so the leads sets start as traffic campaigns. Switch them to Leads once the pixel records Lead events; the forecasts use Meta’s published cost per lead either way.');
  }

  const metaBench = benchmarksFor(config.platforms.meta, input.industry);
  const allowsMeta = input.industry.ad_platforms.includes('meta');
  const engagementAds = input.writing?.engagement_ads ?? [];
  if (allowsMeta && metaBench && config.platforms.meta.test_budget) {
    const min = config.platforms.meta.test_budget.min_monthly;
    const base = Math.max(min, plan.budget.medium * config.adsets.engagement_share[1]);
    const tiers = Object.fromEntries(
      SCENARIOS.map((s, i) => {
        const monthly = Math.max(i === 0 ? min / 2 : min, base * config.adsets.budget_multipliers[i]);
        const clicks = monthly / metaBench.cpc[1];
        return [s, { monthly: round2(monthly), daily: round2(monthly / DAYS_PER_MONTH), clicks: Math.round(clicks), leads: 0, customers: 0, revenue: 0, net: round2(-monthly), year_net: round2(-monthly * 12), roi: null }];
      })
    ) as Record<Scenario, TierForecast>;
    const campaign = `${code}_ENGAGEMENT_${input.month}`;
    const restricted = (input.industry.restricted ?? []).some((c) => c === 'alcohol');
    meta.push({
      id: 'meta-engagement',
      campaign,
      name: `${code}_ENGAGE_${slug(area.split(',')[0])}_${input.month}`,
      goal: 'engagement',
      angle: null,
      objective: 'OUTCOME_ENGAGEMENT',
      optimization_goal: 'POST_ENGAGEMENT',
      recommendation: 'test',
      why: 'The business’s own best posts, shown to people nearby, build the audience the leads sets retarget.',
      mechanism: MECHANISM.engagement,
      kpi: KPI.engagement,
      audience: { location: area, radius_miles: 15, age_min: restricted ? 21 : 18, age_max: 65, interests: input.writing?.interests ?? [] },
      placements: ['Instagram feed', 'Instagram reels', 'Facebook feed'],
      tiers,
      range: null,
      modeled: false,
      stop_loss: 'Pause any ad whose saves and shares stay below the account’s organic posts after two weeks.',
      ads: engagementAds.map((e, i) => {
        const adName = `IMG_ENGAGE_V${i + 1}`;
        return {
          name: adName,
          primary_text: e.primary_text,
          headline: e.headline,
          description: '',
          call_to_action: 'LEARN_MORE',
          image_headline: e.image_headline,
          image: nextImage(),
          link: withUtm(landing, { utm_source: 'meta', utm_medium: 'paid_social', utm_campaign: campaign.toLowerCase(), utm_content: adName.toLowerCase() }),
          display_link: hostOf(landing),
        };
      }),
      sources: [`Budget: ${config.adsets.engagement_basis} The low and high budgets follow the same multipliers as every set.`, `Visits estimated at Meta’s traffic cost per click: ${metaBench.source} (${metaBench.as_of}). Return not modeled: engagement is not a sale.`],
      basis: { data: 'own_posts', evidence: images.length ? `The business’s own posts and photos (${images.length} kept).` : 'The business’s own posts, once its photos are added.' },
    });
    if (!engagementAds.length) notes.push('The engagement set has no ads written yet; use the carousel as its first post.');
  }

  // Meta: the proof set, when the rating clears the setup file's rule (the platform named; no review text).
  const proof = input.proof;
  const rule = config.adsets.proof;
  const proofAds = input.writing?.proof_ads ?? [];
  if (allowsMeta && metaBench && config.platforms.meta.test_budget && proof && rule && proof.rating >= rule.min_rating && proof.reviews >= rule.min_reviews && proofAds.length) {
    const min = config.platforms.meta.test_budget.min_monthly;
    const tiers = Object.fromEntries(
      SCENARIOS.map((s, i) => {
        const monthly = Math.max(i === 0 ? min / 2 : min, min * config.adsets.budget_multipliers[i]);
        const clicks = monthly / metaBench.cpc[1];
        return [s, { monthly: round2(monthly), daily: round2(monthly / DAYS_PER_MONTH), clicks: Math.round(clicks), leads: 0, customers: 0, revenue: 0, net: round2(-monthly), year_net: round2(-monthly * 12), roi: null }];
      })
    ) as Record<Scenario, TierForecast>;
    const campaign = `${code}_PROOF_${input.month}`;
    const restricted = (input.industry.restricted ?? []).some((c) => c === 'alcohol');
    const evidence = `${proof.rating}★ from ${proof.reviews.toLocaleString('en-US')} reviews on ${proof.platform}.`;
    meta.push({
      id: 'meta-proof',
      campaign,
      name: `${code}_PROOF_${slug(area.split(',')[0])}_${input.month}`,
      goal: 'leads',
      angle: null,
      objective: 'OUTCOME_TRAFFIC',
      optimization_goal: 'LANDING_PAGE_VIEWS',
      recommendation: 'test',
      why: `People choosing nearby weigh ratings first; ${evidence}`,
      mechanism: 'Feed ads that state the rating with its platform named, shown to people nearby, sending them to the website.',
      kpi: 'Cost per landing-page view against the leads sets; visits that book or call.',
      audience: { location: area, radius_miles: 15, age_min: restricted ? 21 : 18, age_max: 65, interests: input.writing?.interests ?? [] },
      placements: ['Facebook feed', 'Instagram feed', 'Instagram stories'],
      tiers,
      range: null,
      modeled: false,
      stop_loss: 'Pause an ad whose cost per landing-page view stays above the leads sets’ after two weeks.',
      ads: proofAds.map((e, i) => {
        const adName = `IMG_PROOF_V${i + 1}`;
        return {
          name: adName,
          primary_text: e.primary_text,
          headline: e.headline,
          description: '',
          call_to_action: 'LEARN_MORE',
          image_headline: e.image_headline,
          image: nextImage(),
          link: withUtm(landing, { utm_source: 'meta', utm_medium: 'paid_social', utm_campaign: campaign.toLowerCase(), utm_content: adName.toLowerCase() }),
          display_link: hostOf(landing),
        };
      }),
      sources: [`${rule.basis}`, `Rating: ${proof.platform}, as read in this run.`, `Visits estimated at Meta’s traffic cost per click: ${metaBench.source} (${metaBench.as_of}). Return not modeled.`],
      basis: { data: proof.platform === 'Yelp' ? 'yelp' : 'google_reviews', evidence },
    });
  }

  // Google: a leads ad group per row, then the rankings ad group priced as one more angle.
  const google: GoogleAdGroup[] = [];
  const positions = new Map(input.ranking.filter((k) => k.position !== null).map((k) => [k.keyword.toLowerCase(), k.position as number]));
  const taken = new Set<string>();
  for (const row of live.filter((r) => r.platform === 'google_search')) {
    const angle = angleById.get(row.angle_id);
    if (!angle) continue;
    const ad = copyFor(row);
    const keywords = keywordsFor(angle, positions, config.adsets.keywords_per_group);
    for (const k of keywords) taken.add(k.text.toLowerCase());
    google.push({
      id: `google-${row.angle_id}`,
      name: `${row.angle}`,
      goal: 'leads',
      angle: row.angle,
      recommendation: row.recommendation as 'fund' | 'test',
      why: [angle.why, row.reason].filter(Boolean).join(' '),
      mechanism: MECHANISM.leadsGoogle,
      kpi: KPI.leadsGoogle,
      keywords,
      final_url: landing,
      headlines: field(ad, 'headlines'),
      descriptions: field(ad, 'descriptions'),
      path1: field(ad, 'path1')[0] ?? '',
      path2: field(ad, 'path2')[0] ?? '',
      tiers: budgetTiers(row, config),
      range: outcomeRange(row),
      modeled: row.roi_tier !== 'not modeled',
      stop_loss: stopLossLine(row),
      sources: row.sources,
      basis: { data: 'keywords', evidence: `${keywords.length} Keyword Planner keyword${keywords.length === 1 ? '' : 's'}, ${row.demand.toLocaleString('en-US')} searches a month.` },
    });
    if (!ad) notes.push(`The ${row.angle} ad group has keywords but no ad yet: the copy step did not write one.`);
  }
  const allowsSearch = input.industry.ad_platforms.includes('google_search');
  const rankAngle = allowsSearch ? rankingsAngle(input, taken, config) : null;
  if (rankAngle) {
    const priced = buildAdPlan([rankAngle], input.industry, config).rows.find((r) => r.platform === 'google_search');
    if (priced && priced.recommendation !== 'skip') {
      const page = input.ranking.find((k) => k.keyword.toLowerCase() === rankAngle.keywords[0].keyword.toLowerCase())?.url ?? landing;
      const borrowed = google.find((g) => g.headlines.length);
      google.push({
        id: 'google-rankings',
        name: rankAngle.name,
        goal: 'rankings',
        angle: rankAngle.name,
        recommendation: priced.recommendation as 'fund' | 'test',
        why: `${rankAngle.why} ${priced.reason}`,
        mechanism: MECHANISM.rankings,
        kpi: KPI.rankings,
        keywords: keywordsFor(rankAngle, positions, config.adsets.keywords_per_group),
        final_url: page || landing,
        headlines: borrowed?.headlines ?? [],
        descriptions: borrowed?.descriptions ?? [],
        path1: borrowed?.path1 ?? '',
        path2: borrowed?.path2 ?? '',
        tiers: budgetTiers(priced, config),
        range: outcomeRange(priced),
        modeled: priced.roi_tier !== 'not modeled',
        stop_loss: stopLossLine(priced),
        sources: priced.sources,
        basis: { data: 'ahrefs', evidence: `Searches the site already ranks for at positions ${config.adsets.rankings_positions[0]} to ${config.adsets.rankings_positions[1]} (Ahrefs).` },
      });
      if (!borrowed) notes.push('The rankings ad group has no ad yet: write one from the ranking page before it runs.');
    } else if (priced) {
      notes.push(`No rankings ad group: ${priced.reason}`);
    } else {
      notes.push(`No rankings ad group: the searches the site ranks close to page one for add up to fewer than ${config.min_angle_searches} a month.`);
    }
  }

  const negatives: Negative[] = [];
  const seen = new Set<string>();
  for (const n of [
    ...config.adsets.default_negatives.map((text) => ({ text, reason: config.adsets.negatives_basis })),
    ...(input.writing?.negatives ?? []),
  ]) {
    const text = n.text.trim().toLowerCase();
    // A negative may never block a keyword the plan buys.
    if (!text || seen.has(text) || [...taken].some((k) => k.includes(text))) continue;
    seen.add(text);
    negatives.push({ text, match: 'phrase', reason: n.reason });
  }

  const googleCampaign: GoogleCampaign | null = google.length
    ? { name: `${code}_SEARCH_${input.month}`, bid_strategy: 'Maximize clicks', networks: 'Google Search', location: area, ad_groups: google, negatives }
    : null;

  const sets = [...meta.map((m) => ({ tiers: m.tiers, modeled: m.modeled })), ...google.map((g) => ({ tiers: g.tiers, modeled: g.modeled }))];
  const totals = Object.fromEntries(
    SCENARIOS.map((s) => {
      const monthly = sets.reduce((a, x) => a + x.tiers[s].monthly, 0);
      const modeled = sets.filter((x) => x.modeled);
      const modeledSpend = modeled.reduce((a, x) => a + x.tiers[s].monthly, 0);
      const net = modeled.reduce((a, x) => a + x.tiers[s].net, 0);
      return [
        s,
        {
          monthly: round2(monthly),
          daily: round2(monthly / DAYS_PER_MONTH),
          net: round2(net),
          year_net: round2(modeled.reduce((a, x) => a + x.tiers[s].year_net, 0)),
          roi: modeledSpend > 0 ? Math.round((net / modeledSpend) * 100) / 100 : null,
          modeled_spend: round2(modeledSpend),
        },
      ];
    })
  ) as AdSetsPlan['totals'];

  const goals: Record<AdSetGoal, number> = { leads: 0, engagement: 0, rankings: 0 };
  for (const x of [...meta, ...google]) goals[x.goal] += 1;
  return { meta, google: googleCampaign, carousel: input.writing?.carousel ?? null, totals, goals, notes };
}

/** A short code for names in the ad accounts: the initials of the business's name (two to four letters). */
export function businessCode(name: string): string {
  const words = name
    .replace(/[^A-Za-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !/^(the|and|of|llc|inc|co)$/i.test(w));
  const initials = words.map((w) => w[0].toUpperCase()).join('');
  if (initials.length >= 2) return initials.slice(0, 4);
  return (words[0] ?? 'GS').slice(0, 3).toUpperCase();
}
