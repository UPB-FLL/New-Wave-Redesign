import type { PlanRow } from './adplan.js';
import { budgetTiers, type CreativeRef, type TierForecast } from './adsets.js';
import { SCENARIOS, type AdPlatformId, type GroundswellConfig, type IndustryProfile, type Scenario } from './config.js';

/**
 * Reddit and TikTok ad sets, beside the Meta and Google ones (adsets.ts),
 * each ad tied to the data set it was written from (`basis`).
 *
 * - Reddit: one set aimed at the communities the business and its category
 *   are talked about in (the community step), its ads answering the
 *   questions people ask there. Reddit publishes no cost per click the setup
 *   file trusts (`benchmarks: null`), so its spend is shown at three budgets
 *   and its return is "not modeled", never guessed.
 * - TikTok: one set per TikTok row of the ad plan (at most two), priced from
 *   the plan's published rates (Lebesgue) at the same three budgets as every
 *   set; vertical creative.
 * - A category the platform keeps off self-serve (alcohol on both) turns the
 *   set into a plan for the platform's sales team: the same targeting, ads
 *   and budgets, marked `sales_team`, with the platform's rule in words.
 *
 * Budgets: the platform's smallest useful test (`test_budget.min_monthly`)
 * times `adsets.channel_multipliers` (New Wave's rule; 1×, 2× and 4× by
 * default) when the plan has no priced row for the platform.
 */

export type DataSet = 'keywords' | 'ahrefs' | 'own_posts' | 'website' | 'offers' | 'yelp' | 'google_reviews' | 'reddit' | 'ai_answers';

/** Each data set in words, for the reports and the sheets. */
export const DATA_SET_WORDS: Record<DataSet, string> = {
  keywords: 'Keyword Planner searches',
  ahrefs: 'Ahrefs rankings',
  own_posts: 'The business’s own posts',
  website: 'The website',
  offers: 'The business’s own offers',
  yelp: 'Yelp rating',
  google_reviews: 'Google rating',
  reddit: 'Reddit questions and communities',
  ai_answers: 'Google AI Mode answers',
};

export interface AdBasis {
  data: DataSet;
  /** What the ad rests on, in words ("Asked in r/fortlauderdale: …", "4.7★ from 89 reviews on Yelp"). */
  evidence: string;
}

export interface ChannelAd {
  name: string;
  headline: string;
  text: string;
  call_to_action: string;
  /** The words set on the image (at most 60 characters). */
  image_headline: string;
  image: CreativeRef | null;
  /** The image size the ad wants: vertical 1080×1920 (TikTok), feed 1080×1350 (Reddit). */
  format: 'vertical' | 'feed';
  link: string;
  basis: AdBasis;
}

export interface ChannelAdSet {
  id: string;
  platform: Extract<AdPlatformId, 'reddit' | 'tiktok'>;
  platform_label: string;
  campaign: string;
  name: string;
  goal: 'leads' | 'engagement';
  availability: 'self_serve' | 'sales_team';
  /** The platform's rule when self-serve is closed to the industry. */
  availability_note: string | null;
  recommendation: 'fund' | 'test' | 'sales_team';
  why: string;
  mechanism: string;
  kpi: string;
  targeting: { location: string; age_min: number; communities: string[]; interests: string[] };
  spend: Record<Scenario, { monthly: number; daily: number }>;
  /** Clicks, leads and return at each budget; null when the platform has no published rates. */
  tiers: Record<Scenario, TierForecast> | null;
  modeled: boolean;
  not_modeled: string | null;
  ads: ChannelAd[];
  sources: string[];
}

export interface ChannelWriting {
  reddit_ads: { headline: string; text: string; call_to_action: string; image_headline?: string; basis: DataSet }[];
  tiktok_ads: { text: string; call_to_action: string; image_headline?: string; basis: DataSet }[];
}

export interface ChannelInput {
  business: { name: string; code: string; area: string; landing: string };
  industry: IndustryProfile;
  rows: PlanRow[];
  community: { communities: string[]; questions: { community: string | null; question: string }[] } | null;
  creative: CreativeRef[];
  writing: ChannelWriting | null;
  month: string;
  /** Words for each data set an ad can name as its basis, so the evidence line reads the same everywhere. */
  evidence: Partial<Record<DataSet, string>>;
}

const DAYS_PER_MONTH = 30.4;
const round2 = (x: number) => Math.round(x * 100) / 100;
export const DEFAULT_CHANNEL_MULTIPLIERS: [number, number, number] = [1, 2, 4];

/** The platform's rule that closes self-serve to the industry, if one does. */
export function blockingRule(config: GroundswellConfig, industry: IndustryProfile, platform: AdPlatformId): string | null {
  const rules = config.platforms[platform]?.restricted_categories ?? {};
  for (const c of industry.restricted ?? []) if (rules[c]?.blocks_self_serve) return rules[c].rule;
  return null;
}

/** The youngest audience the industry's rules allow on the platform (alcohol: 21 on Reddit, 25 on TikTok). */
function ageMin(config: GroundswellConfig, industry: IndustryProfile, platform: AdPlatformId): number {
  const rules = config.platforms[platform]?.restricted_categories ?? {};
  // Alcohol is never shown under the US drinking age, whatever the platform's own rule says.
  let age = (industry.restricted ?? []).includes('alcohol') ? 21 : 18;
  for (const c of industry.restricted ?? []) {
    const m = rules[c]?.rule.match(/(\d{2}) (?:and|or) older/);
    if (m) age = Math.max(age, Number(m[1]));
  }
  return age;
}

/** Spend at the three budgets from the platform's smallest test. */
export function channelSpend(config: GroundswellConfig, platform: AdPlatformId): Record<Scenario, { monthly: number; daily: number }> | null {
  const min = config.platforms[platform]?.test_budget?.min_monthly;
  if (!min) return null;
  const mult = config.adsets.channel_multipliers ?? DEFAULT_CHANNEL_MULTIPLIERS;
  return Object.fromEntries(SCENARIOS.map((s, i) => [s, { monthly: round2(min * mult[i]), daily: round2((min * mult[i]) / DAYS_PER_MONTH) }])) as Record<Scenario, { monthly: number; daily: number }>;
}

const utm = (url: string, params: Record<string, string>) => {
  try {
    const u = new URL(url);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    return u.toString();
  } catch {
    return url;
  }
};
const cut = (t: string, max: number) => (t.length <= max ? t : `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}…`);
const IMAGE_WORDS = 60;
/** The words on the image: the writer's, else the ad's own line when it is short enough, else the business's name. */
const imageWords = (written: string | undefined, line: string, name: string) => (written?.trim() ? cut(written.trim(), IMAGE_WORDS) : line.length <= IMAGE_WORDS ? line : name);

export function buildChannelSets(input: ChannelInput, config: GroundswellConfig): { reddit: ChannelAdSet[]; tiktok: ChannelAdSet[]; notes: string[] } {
  const notes: string[] = [];
  const { business: b } = input;
  let image = 0;
  const nextImage = () => (input.creative.length ? input.creative[image++ % input.creative.length] : null);
  const evidenceFor = (data: DataSet) => input.evidence[data] ?? '';

  // Reddit: the communities the business and its category are talked about in.
  const reddit: ChannelAdSet[] = [];
  const redditCfg = config.platforms.reddit;
  const communities = input.community?.communities ?? [];
  if (input.industry.ad_platforms.includes('reddit') && redditCfg && communities.length) {
    const blocked = blockingRule(config, input.industry, 'reddit');
    const spend = channelSpend(config, 'reddit');
    const campaign = `${b.code}_REDDIT_COMMUNITY_${input.month}`;
    const written = input.writing?.reddit_ads ?? [];
    const questions = input.community?.questions ?? [];
    const ads: ChannelAd[] = written.slice(0, 3).map((a, i) => {
      const name = `RD_COMMUNITY_V${i + 1}`;
      const q = a.basis === 'reddit' ? questions[i % Math.max(1, questions.length)] : null;
      return {
        name,
        headline: cut(a.headline, redditCfg.template.fields.headline?.max_chars ?? 300),
        text: a.text,
        call_to_action: a.call_to_action || 'Learn More',
        image_headline: imageWords(a.image_headline, a.headline, b.name),
        image: nextImage(),
        format: 'feed',
        link: utm(b.landing, { utm_source: 'reddit', utm_medium: 'paid_social', utm_campaign: campaign.toLowerCase(), utm_content: name.toLowerCase() }),
        basis: { data: a.basis, evidence: q ? `Asked in ${q.community ? `r/${q.community}` : 'Reddit'}: “${q.question}”` : evidenceFor(a.basis) },
      };
    });
    if (!ads.length) notes.push('The Reddit set has its communities and budgets but no ads yet: the writer wrote none that passed the checks.');
    if (spend) {
      reddit.push({
        id: 'reddit-community',
        platform: 'reddit',
        platform_label: redditCfg.label,
        campaign,
        name: `${b.code}_RD_${communities.slice(0, 2).join('_').replace(/[^A-Za-z0-9_]/g, '')}_${input.month}`,
        goal: 'leads',
        availability: blocked ? 'sales_team' : 'self_serve',
        availability_note: blocked,
        recommendation: blocked ? 'sales_team' : 'test',
        why: 'People already ask about the category, and talk about the business, in these communities; an ad there answers the same questions where they are asked.',
        mechanism: 'Promoted posts shown in the named communities, written as answers to the questions asked there, linking to the website.',
        kpi: 'Clicks to the website and comments on the promoted post; cost per click against the Meta sets.',
        targeting: { location: b.area, age_min: ageMin(config, input.industry, 'reddit'), communities: communities.slice(0, 6).map((c) => `r/${c}`), interests: [] },
        spend,
        tiers: null,
        modeled: false,
        not_modeled: redditCfg.benchmarks_missing ?? 'Reddit publishes no cost per click to model a return.',
        ads,
        sources: [
          `Communities and questions: Reddit search (the community step).`,
          `Budgets: ${redditCfg.test_budget?.basis ?? ''} At ${(config.adsets.channel_multipliers ?? DEFAULT_CHANNEL_MULTIPLIERS).join('×, ')}× (${config.adsets.channel_basis ?? 'New Wave’s rule'}).`,
          ...(blocked ? [`${redditCfg.restricted_categories?.alcohol?.source ?? 'Reddit Ads Help'}: ${blocked}`] : []),
        ],
      });
    }
  } else if (input.industry.ad_platforms.includes('reddit') && !communities.length) {
    notes.push('No Reddit community talks about the business or its category in the posts found, so there is no Reddit set this time.');
  }

  // TikTok: the ad plan's TikTok rows, priced at the plan's published rates.
  const tiktok: ChannelAdSet[] = [];
  const tiktokCfg = config.platforms.tiktok;
  const blocked = blockingRule(config, input.industry, 'tiktok');
  // The plan's verdict stands: a row it funds or tests gets a set. A row the sales-team rule skipped becomes the sales team's plan only when
  // it would have been funded or tested without the rule (it pays back at the published rates); one that loses money, or has no price, gets none.
  const rows = input.rows
    .filter((r) => r.platform === 'tiktok' && (r.recommendation !== 'skip' || (blocked !== null && r.reason === blocked && (r.roi_tier === 'strong' || r.roi_tier === 'pays back'))))
    .sort((x, y) => (y.scenarios.medium.roi ?? -9) - (x.scenarios.medium.roi ?? -9))
    .slice(0, 2);
  if (input.industry.ad_platforms.includes('tiktok') && tiktokCfg) {
    const written = input.writing?.tiktok_ads ?? [];
    rows.forEach((row, n) => {
      const tiers = budgetTiers(row, config);
      const campaign = `${b.code}_TIKTOK_${row.angle_id.toUpperCase()}_${input.month}`.replace(/[^A-Z0-9_]/gi, '');
      const ads: ChannelAd[] = (rows.length === 1 ? written.slice(0, 3) : written.slice(n * 2, n * 2 + 2)).map((a, i) => {
        const name = `TT_${row.angle_id.toUpperCase().slice(0, 12)}_V${i + 1}`;
        return {
          name,
          headline: cut(b.name, tiktokCfg.template.fields.display_name?.max_chars ?? 20),
          text: cut(a.text, tiktokCfg.template.fields.ad_text?.max_chars ?? 100),
          call_to_action: a.call_to_action || 'Learn more',
          image_headline: imageWords(a.image_headline, a.text, b.name),
          image: nextImage(),
          format: 'vertical',
          link: utm(b.landing, { utm_source: 'tiktok', utm_medium: 'paid_social', utm_campaign: campaign.toLowerCase(), utm_content: name.toLowerCase() }),
          basis: { data: a.basis, evidence: evidenceFor(a.basis) },
        };
      });
      tiktok.push({
        id: `tiktok-${row.angle_id}`,
        platform: 'tiktok',
        platform_label: tiktokCfg.label,
        campaign,
        name: `${row.angle} (TikTok)`,
        goal: 'leads',
        availability: blocked ? 'sales_team' : 'self_serve',
        availability_note: blocked,
        recommendation: blocked ? 'sales_team' : (row.recommendation as 'fund' | 'test'),
        why: [row.reason, 'Vertical video-style ads from the business’s own photos and clips, for people nearby who have not met it yet.'].filter(Boolean).join(' '),
        mechanism: 'In-feed ads in the For You feed, made from the business’s own photos and clips, sending viewers to the website.',
        kpi: 'Cost per click and visits to the website; three-second views as the early signal.',
        targeting: { location: b.area, age_min: ageMin(config, input.industry, 'tiktok'), communities: [], interests: [] },
        spend: Object.fromEntries(SCENARIOS.map((s) => [s, { monthly: tiers[s].monthly, daily: tiers[s].daily }])) as ChannelAdSet['spend'],
        tiers,
        modeled: row.roi_tier !== 'not modeled',
        not_modeled: row.roi_tier === 'not modeled' ? 'No published TikTok rate fits this angle, so only the spend is shown.' : null,
        ads,
        sources: [...row.sources, ...(blocked ? [`${tiktokCfg.restricted_categories?.alcohol?.source ?? 'TikTok Ads policy'}: ${blocked}`] : [])],
      });
      if (!ads.length) notes.push(`The ${row.angle} TikTok set has its budgets but no ads yet: the writer wrote none that passed the checks.`);
    });
    if (!rows.length) notes.push('The ad plan has no TikTok row it funds or tests, so there is no TikTok set this time.');
  }
  return { reddit, tiktok, notes };
}
