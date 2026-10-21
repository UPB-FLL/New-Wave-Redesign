import type { GroundswellConfig, IndustryProfile } from '../config.js';
import type { AdLibraryEvidence } from './ads.js';
import type { AuthorityProfile } from './authority.js';
import type { EngagementProfile } from './engagement.js';
import { ladderCounts, type PricingLadder } from './pricing.js';

/**
 * The scorecard: the business (always the first account) against its top
 * competitors on each dimension, with a leader by a fixed rule, and a gap
 * wherever a competitor leads. Code, not a model, so the same data always
 * gives the same scorecard. An account whose value could not be read is left
 * out of the comparison; when the business's own value is unknown, no leader
 * is called.
 */

export const LEVERS = [
  'cadence', 'format', 'hooks', 'cta_automation', 'lead_magnet', 'course', 'entry_bundle', 'price_transparency',
  'ladder_overlap', 'refund_policy', 'recurring', 'retention_tier', 'pixel', 'retargeting', 'press', 'seo_depth',
  'how_to_content', 'owned_channels', 'social_proof', 'credentials', 'email',
] as const;
export type Lever = (typeof LEVERS)[number];

export interface BenchmarkAccount {
  name: string;
  followers: number | null;
  engagement: EngagementProfile | null;
  ladder: PricingLadder | null;
  ads: Pick<AdLibraryEvidence, 'meta_ad_status' | 'pixels'> | null;
  authority: AuthorityProfile | null;
}

type Value = number | boolean | null;
type Rule = 'highest' | 'followers' | 'yes';

interface Dimension {
  key: string;
  label: string;
  lever: Lever;
  rule: Rule;
  read: (a: BenchmarkAccount, config: GroundswellConfig) => Value;
  show: (v: Value) => string;
}

export interface ScoreRow {
  key: string;
  label: string;
  lever: Lever;
  values: Value[];
  shown: string[];
  /** Index of the leading account, "even", or null when the business's own value is unknown. */
  leader: number | 'even' | null;
}

export interface Gap {
  key: string;
  label: string;
  lever: Lever;
  leader: string;
  business: string;
  competitor: string;
}

const UNKNOWN = 'not checked';
const n = (d = 0) => (v: Value) => (typeof v === 'number' ? v.toLocaleString('en-US', { maximumFractionDigits: d }) : UNKNOWN);
const pct = (v: Value) => (typeof v === 'number' ? `${(v * 100).toFixed(2)}%` : UNKNOWN);
const yes = (v: Value) => (v === null ? UNKNOWN : v ? 'Yes' : 'No');
const META_RANK = { running: 1, not_running: 0, unknown: null } as const;
const CREDENTIAL_RANK = { licensed: 2, certified: 1, none: 0 } as const;
const CREDENTIAL_WORDS = ['None stated', 'Certified', 'Licensed'];

export const DIMENSIONS: Dimension[] = [
  { key: 'followers', label: 'Followers', lever: 'format', rule: 'followers', read: (a) => a.followers, show: n() },
  { key: 'engagement_rate', label: 'Engagement rate (median, visible likes)', lever: 'hooks', rule: 'highest', read: (a) => a.engagement?.engagement_rate_median ?? null, show: pct },
  { key: 'comments', label: 'Comments per post (median)', lever: 'cta_automation', rule: 'highest', read: (a) => a.engagement?.comments_median ?? null, show: n(1) },
  { key: 'cadence', label: 'Posts per week', lever: 'cadence', rule: 'highest', read: (a) => a.engagement?.cadence_per_week ?? null, show: n(1) },
  { key: 'reels', label: 'Reels per week', lever: 'format', rule: 'highest', read: (a) => a.engagement?.reels_per_week ?? null, show: n(1) },
  { key: 'dm_automation', label: 'Comment-to-DM prompts', lever: 'cta_automation', rule: 'yes', read: (a) => (a.engagement ? a.engagement.cta_items_n > 0 : null), show: yes },
  { key: 'prices_published', label: 'Prices published', lever: 'price_transparency', rule: 'yes', read: (a) => a.ladder?.prices_published ?? null, show: yes },
  { key: 'core_priced', label: 'Main offer priced', lever: 'price_transparency', rule: 'yes', read: (a) => a.ladder?.core_offer_priced ?? null, show: yes },
  { key: 'entry_products', label: 'Entry products', lever: 'entry_bundle', rule: 'highest', read: (a, c) => (a.ladder ? ladderCounts(a.ladder, c).entry_products : null), show: n() },
  { key: 'recurring', label: 'Monthly product', lever: 'recurring', rule: 'yes', read: (a, c) => (a.ladder ? ladderCounts(a.ladder, c).recurring : null), show: yes },
  { key: 'meta_ads', label: 'Running Meta ads', lever: 'retargeting', rule: 'yes', read: (a) => (a.ads ? (META_RANK[a.ads.meta_ad_status] === null ? null : META_RANK[a.ads.meta_ad_status] === 1) : null), show: yes },
  { key: 'pixels', label: 'Ad pixels on the site', lever: 'pixel', rule: 'highest', read: (a) => (a.ads ? Object.values(a.ads.pixels).filter(Boolean).length : null), show: n() },
  { key: 'domain_rating', label: 'Domain rating (Ahrefs)', lever: 'seo_depth', rule: 'highest', read: (a) => a.authority?.domain_rating ?? null, show: n() },
  { key: 'organic_traffic', label: 'Monthly organic visits (Ahrefs estimate)', lever: 'how_to_content', rule: 'highest', read: (a) => a.authority?.organic_traffic ?? null, show: n() },
  { key: 'press', label: 'Press sites linking', lever: 'press', rule: 'highest', read: (a) => (a.authority ? a.authority.press_domains.length : null), show: n() },
  { key: 'owned_channels', label: 'Owned channels', lever: 'owned_channels', rule: 'highest', read: (a) => (a.authority ? a.authority.owned_channels.length : null), show: n() },
  { key: 'testimonials', label: 'Testimonials page', lever: 'social_proof', rule: 'yes', read: (a) => a.authority?.testimonials_page ?? null, show: yes },
  {
    key: 'credentials',
    label: 'Credentials stated',
    lever: 'credentials',
    rule: 'highest',
    read: (a) => (a.authority?.credentials ? CREDENTIAL_RANK[a.authority.credentials] : null),
    show: (v) => (typeof v === 'number' ? CREDENTIAL_WORDS[v] : UNKNOWN),
  },
];

const FOLLOWERS_EVEN = 0.05;

/** Who leads one dimension; the business is index 0. */
export function leaderOf(values: Value[], rule: Rule): ScoreRow['leader'] {
  if (values[0] === null) return null;
  const known = values.map((v, i) => ({ v, i })).filter((x) => x.v !== null) as { v: number | boolean; i: number }[];
  if (known.length < 2) return null;
  const score = (v: number | boolean) => (typeof v === 'boolean' ? Number(v) : v);
  const top = Math.max(...known.map((x) => score(x.v)));
  const business = score(values[0]);
  if (rule === 'followers' ? business >= top * (1 - FOLLOWERS_EVEN) : business === top) {
    // The business is at (or within 5 in 100 of) the top: even if anyone else is too, else it leads.
    const others = known.filter((x) => x.i !== 0 && (rule === 'followers' ? score(x.v) >= business * (1 - FOLLOWERS_EVEN) : score(x.v) === top));
    return others.length ? 'even' : 0;
  }
  return known.find((x) => score(x.v) === top)!.i;
}

/** The scorecard rows for an industry: credentials only where the industry has licence words to check. */
export function buildScorecard(accounts: BenchmarkAccount[], industry: IndustryProfile, config: GroundswellConfig): ScoreRow[] {
  return DIMENSIONS.filter((d) => d.key !== 'credentials' || (industry.licences?.length ?? 0) > 0).map((d) => {
    const values = accounts.map((a) => d.read(a, config));
    return { key: d.key, label: d.label, lever: d.lever, values, shown: values.map(d.show), leader: leaderOf(values, d.rule) };
  });
}

/** Every dimension a competitor leads, with the business's value and the leader's. */
export function gapsFrom(rows: ScoreRow[], accounts: BenchmarkAccount[]): Gap[] {
  return rows
    .filter((r): r is ScoreRow & { leader: number } => typeof r.leader === 'number' && r.leader !== 0)
    .map((r) => ({ key: r.key, label: r.label, lever: r.lever, leader: accounts[r.leader].name, business: r.shown[0], competitor: r.shown[r.leader] }));
}

export type EngagementBand = 'very low' | 'low' | 'normal for this size' | 'strong';

/** An engagement rate in words, from the setup file's bands. */
export function engagementBand(rate: number | null, config: GroundswellConfig): EngagementBand | null {
  if (rate === null) return null;
  const b = config.benchmark.engagement_bands;
  return rate < b.very_low_below ? 'very low' : rate < b.low_below ? 'low' : rate < b.normal_below ? 'normal for this size' : 'strong';
}

/** The tactics this benchmark must warn against copying: the setup file's defaults and the industry's own. */
export function doNotCopyRules(industry: IndustryProfile, config: GroundswellConfig): string[] {
  return [...new Set([...(industry.do_not_copy ?? []), ...config.benchmark.do_not_copy])];
}
