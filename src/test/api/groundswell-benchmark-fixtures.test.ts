import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { adRows, toMetaAd } from '../../../api/_lib/groundswell/currents/adsLibrary';
import { findKey } from '../../../api/_lib/groundswell/composio';
import { mediaList, toRawItem } from '../../../api/_lib/groundswell/currents/socialDepth';
import { GROUNDSWELL_CONFIG } from '../../../packages/groundswell/groundswell.config';
import {
  buildScorecard,
  checkLadder,
  engagementProfile,
  extractPrices,
  gapsFrom,
  ladderCounts,
  mediaType,
  metaAdStatus,
  transparencyStatus,
  type AuthorityProfile,
  type BenchmarkAccount,
  type EngagementProfile,
  type MetaAdStatus,
  type OwnedChannel,
  type PolicyFlags,
  type PricingLadder,
} from '../../../packages/groundswell/src/benchmark/index';

/**
 * The benchmark rules against a real by-hand benchmark session (2026-10-21),
 * anonymised: two fictional accounts with every date, count and price kept
 * (fixtures/groundswell-benchmark/README.md). `expected.json` is what that
 * session found. Where the rules here give a different answer, DIFFERS says
 * what they give and why; everything else must match.
 */

const DIR = path.resolve(__dirname, 'fixtures/groundswell-benchmark');
const read = (file: string) => readFileSync(path.join(DIR, file), 'utf8');
const json = <T,>(file: string) => JSON.parse(read(file)) as T;

/** The parts of expected.json these tests read. */
interface Expected {
  accounts: Record<string, Record<string, unknown>>;
  ads: Record<string, { meta_ad_status: MetaAdStatus; meta_ads_inactive_n?: number; meta_ads?: unknown[]; google_ads_status: string }>;
  pricing: Record<
    string,
    {
      prices_published: boolean;
      core_offer_priced: boolean;
      offers: unknown[];
      payment_plans: boolean;
      refunds: PolicyFlags['refunds'];
      accepts_insurance: boolean | null;
      hsa_fsa_mentioned: boolean;
      free_consult: boolean;
      lead_magnets: string[];
      dm_automation: boolean;
      contact_email_domain: PricingLadder['contact_email_domain'];
    }
  >;
  authority: Record<
    string,
    {
      domain_rating: number;
      referring_domains_live: number;
      org_traffic_month: number;
      press_domains_n: number;
      content_pages_n?: number;
      owned_channels: OwnedChannel[];
      testimonials_page: boolean;
      licensed: boolean;
    }
  >;
  scorecard_leaders: Record<string, string>;
}
type Profile = { data: { user: { follower_count: number } } };
type Pixels = { meta: boolean; google_ads: boolean; tiktok: boolean };

const expected = json<Expected>('expected.json');
const BUSINESS = 'harborlightnutrition';
const COMPETITOR = 'fernandfield';
const HANDLES = [BUSINESS, COMPETITOR];
// The session's cadence window ends 2026-10-20.
const NOW = Date.parse('2026-10-21T00:00:00Z');

function profileOf(handle: string): EngagementProfile {
  const user = json<Profile>(`${handle}.profile.json`).data.user;
  const reels = json<unknown>(`${handle}.reels.json`);
  return engagementProfile(
    handle,
    user.follower_count,
    mediaList(json<unknown>(`${handle}.posts.json`)).map((r) => toRawItem(r, 'post')),
    mediaList(reels).map((r) => toRawItem(r, 'reel')),
    NOW,
    findKey(reels, 'has_more') === true
  );
}

const round = (v: number | null, d: number) => (v === null ? null : Number(v.toFixed(d)));

/** The session's figures, from a profile. */
function figures(handle: string, p: EngagementProfile) {
  // The session counts a reel's age in calendar days to 21 October; age_days counts whole days elapsed.
  const reels = p.items.filter((i) => i.type === 'reel' && i.plays !== null).map((i) => (NOW - Date.parse(i.date.slice(0, 10))) / 86_400_000);
  const feedMix: Record<string, number> = {};
  for (const r of mediaList(json<unknown>(`${handle}.posts.json`))) {
    const type = mediaType(toRawItem(r, 'post'));
    feedMix[type] = (feedMix[type] ?? 0) + 1;
  }
  const best = p.best_item;
  return {
    handle: p.handle,
    followers: p.followers,
    items_n: p.items_n,
    likes_hidden_n: p.likes_hidden_n,
    likes_median: p.likes_median,
    comments_median: p.comments_median,
    comments_mean: round(p.comments_mean, 1),
    engagement_rate_median_pct: round(p.engagement_rate_median === null ? null : p.engagement_rate_median * 100, 2),
    cta_items_n: p.cta_items_n,
    cta_comments_mean: round(p.cta_comments_mean, 1),
    non_cta_comments_mean: round(p.non_cta_comments_mean, 1),
    reel_plays_median: p.reel_plays_median,
    reel_plays_max: p.reel_plays_max,
    carousel_slides_mean: round(p.carousel_slides_mean, 1),
    cadence_per_week: p.cadence_per_week,
    cadence_items_in_window: p.cadence_per_week * 2,
    reels_per_week: p.reels_per_week,
    pinned_n: p.items.filter((i) => i.pinned).length,
    format_mix_feed: feedMix,
    best_item: best && {
      date: best.date.slice(0, 10),
      likes: best.likes,
      comments: best.comments,
      ...(best.plays !== null ? { plays: best.plays } : {}),
    },
    reel_age_days_range: [Math.min(...reels), Math.max(...reels)],
  };
}

/** Where these rules and the session part ways: our value, and why. */
const DIFFERS: Record<string, Record<string, { ours: unknown; why: string }>> = {
  [COMPETITOR]: {
    cadence_per_week: { ours: 1.5, why: 'The spec counts 14 days ÷ 2 (three posts); the session used 3 weeks for this account (six posts ÷ 3).' },
    cadence_items_in_window: { ours: 3, why: 'As above: 14 days, not 3 weeks.' },
    cadence_window: { ours: undefined, why: 'The session’s note on its 3-week window; there is no such figure here.' },
    reels_per_week: { ours: 0, why: 'No reel is within 28 days (the newest is 41 days old), so nothing in the data gives 0.25.' },
    pinned_n: {
      ours: 3,
      why: 'The fixture’s feed opens with six posts from June to August before October’s; Instagram pins at most three, so the first three are pinned. The session’s 0 does not follow from this order under either rule.',
    },
  },
};

describe('engagement: the real session’s figures', () => {
  for (const handle of HANDLES) {
    it(`reproduces ${handle}`, () => {
      const ours = figures(handle, profileOf(handle)) as Record<string, unknown>;
      for (const [key, theirs] of Object.entries(expected.accounts[handle])) {
        const differs = DIFFERS[handle]?.[key];
        expect(ours[key], `${handle}.${key}${differs ? ` (${differs.why})` : ''}`).toEqual(differs ? differs.ours : theirs);
      }
    });
  }

  it('finds the business’s three pinned posts, which the spec’s 30-day rule called one', () => {
    const p = profileOf(BUSINESS);
    expect(p.items.filter((i) => i.pinned).map((i) => i.date.slice(0, 10))).toEqual(['2026-09-21', '2026-09-10', '2026-06-11']);
  });

  it('divides reels by the two weeks a cut-short page covers, not four', () => {
    expect(profileOf(BUSINESS).reels_per_week).toBe(6); // 12 reels from 7 to 20 October
    const user = json<Profile>(`${BUSINESS}.profile.json`).data.user;
    const reels = mediaList(json<unknown>(`${BUSINESS}.reels.json`)).map((r) => toRawItem(r, 'reel'));
    expect(engagementProfile(BUSINESS, user.follower_count, [], reels, NOW, false).reels_per_week).toBe(3); // the spec's ÷ 4
  });
});

function adEvidence(handle: string) {
  const fb = json<{ profile: unknown; company_ads: unknown }>(`ads/${handle}.facebook.json`);
  const lib = findKey<Record<string, unknown>>(fb.profile, 'adLibrary')!;
  const ads = adRows(fb.company_ads).map(toMetaAd);
  return {
    meta_ad_status: metaAdStatus(typeof lib.adStatus === 'string' ? lib.adStatus : null, ads, lib.pageId ? String(lib.pageId) : null),
    ads,
    google: transparencyStatus(read(`ads/${handle}.example.transparency.txt`)),
    pixels: json<Record<string, { pixels: Pixels }>>('ads/site-tags.json')[`${handle}.example`].pixels,
  };
}

describe('ads: the real session’s statuses', () => {
  it('reads a verified negative for the business and one running ad for the competitor', () => {
    const business = adEvidence(BUSINESS);
    expect(business.meta_ad_status).toBe(expected.ads[BUSINESS].meta_ad_status);
    expect(business.ads.filter((a) => !a.active)).toHaveLength(expected.ads[BUSINESS].meta_ads_inactive_n ?? -1);
    const competitor = adEvidence(COMPETITOR);
    expect(competitor.meta_ad_status).toBe(expected.ads[COMPETITOR].meta_ad_status);
    expect(competitor.ads.map(({ started, active, platforms, cta }) => ({ started, active, platforms, cta }))).toEqual(expected.ads[COMPETITOR].meta_ads);
  });

  it('reads "0 ads, any time" on Google as none for both', () => {
    for (const handle of HANDLES) expect(adEvidence(handle).google.status).toBe(expected.ads[handle].google_ads_status);
  });
});

function ladderOf(handle: string): PricingLadder {
  const pages = json<{ pages: { url: string; dollar_matches: { context: string }[] }[] }>(`pricing/${handle}.prices.json`).pages;
  // The fixture keeps each price's context, not whole pages: every price in those contexts, on its page.
  const mentions = pages.flatMap((p) => p.dollar_matches.flatMap((m) => extractPrices(m.context, p.url)));
  const theirs = expected.pricing[handle];
  return checkLadder(
    { offers: theirs.offers },
    {
      name: handle,
      payment_plans: theirs.payment_plans,
      refunds: theirs.refunds,
      accepts_insurance: theirs.accepts_insurance,
      hsa_fsa_mentioned: theirs.hsa_fsa_mentioned,
      free_consult: theirs.free_consult,
      discovery_call: true,
      lead_magnets: theirs.lead_magnets,
      dm_automation: theirs.dm_automation,
      contact_email_domain: theirs.contact_email_domain,
      pages_read: pages.map((p) => p.url),
      mentions,
      error: null,
    }
  );
}

describe('pricing: the session’s offers held to the prices its pages show', () => {
  it('keeps every published price and drops what no page shows', () => {
    const prices = (handle: string) => ladderOf(handle).offers.map((o) => [o.tier, o.price_low, o.price_high]);
    expect(prices(BUSINESS)).toEqual([
      ['core', null, null],
      // The session's $498 is 2 × $249, a payment plan's total; the page shows $497.
      ['private_small', 497, 497],
      ['low_ticket', 199, 199],
      // A free offer stays unpriced: no page shows "$0", and a model's tier is not a published price.
      ['free', null, null],
    ]);
    expect(prices(COMPETITOR)).toEqual([
      ['core', 2800, 3500],
      ['private_small', 350, 350],
      ['retention', 1500, 1500],
      ['membership', 79, 300],
      ['low_ticket', 28, 28],
      ['free', null, null],
    ]);
  });

  it('agrees on published prices, the priced main offer and a monthly product', () => {
    for (const handle of HANDLES) {
      const l = ladderOf(handle);
      expect(l.prices_published).toBe(expected.pricing[handle].prices_published);
      expect(l.core_offer_priced).toBe(expected.pricing[handle].core_offer_priced);
    }
    expect(ladderCounts(ladderOf(BUSINESS), GROUNDSWELL_CONFIG)).toEqual({ entry_products: 2, recurring: false });
    expect(ladderCounts(ladderOf(COMPETITOR), GROUNDSWELL_CONFIG)).toEqual({ entry_products: 3, recurring: true });
  });
});

function authorityOf(handle: string): AuthorityProfile {
  const a = expected.authority[handle];
  return {
    name: handle,
    domain: `${handle}.example`,
    domain_rating: a.domain_rating,
    referring_domains_live: a.referring_domains_live,
    press_domains: Array.from({ length: a.press_domains_n }, (_, i) => ({ domain: `press${i}.example`, dr: null, first_seen: null })),
    top_pages: [],
    top_keywords: [],
    organic_traffic: a.org_traffic_month,
    content_pages_n: a.content_pages_n ?? null,
    newest_content_date: null,
    owned_channels: a.owned_channels,
    credentials_text: null,
    credentials: a.licensed ? 'licensed' : 'none',
    testimonials_page: a.testimonials_page,
    error: null,
  };
}

describe('scorecard: the session’s leaders', () => {
  const health = GROUNDSWELL_CONFIG.industries.find((i) => i.id === 'health_wellness')!;
  const accounts: BenchmarkAccount[] = HANDLES.map((handle) => {
    const engagement = profileOf(handle);
    return { name: handle, followers: engagement.followers, engagement, ladder: ladderOf(handle), ads: adEvidence(handle), authority: authorityOf(handle) };
  });
  const rows = buildScorecard(accounts, health, GROUNDSWELL_CONFIG);
  const leaderName = (key: string) => {
    const leader = rows.find((r) => r.key === key)?.leader;
    return leader === 'even' ? 'even' : typeof leader === 'number' ? HANDLES[leader] : null;
  };
  // The session's names for our rows.
  const KEYS: Record<string, string> = { published_prices: 'prices_published', core_offer_priced: 'core_priced' };
  const LEADERS_DIFFER: Record<string, { ours: string; why: string }> = {
    published_prices: { ours: 'even', why: 'Both publish prices (the session’s own pricing says so); its leader folds in the priced main offer, a row of its own.' },
    entry_products: { ours: COMPETITOR, why: 'The spec counts offers under $600 that are not free: three for the competitor ($350, $79–$300, $28), two for the business ($497, $199).' },
  };

  it('calls the same leader on every row but two, by the spec’s fixed rules', () => {
    for (const [key, theirs] of Object.entries(expected.scorecard_leaders)) {
      const differs = LEADERS_DIFFER[key];
      expect(leaderName(KEYS[key] ?? key), `${key}${differs ? ` (${differs.why})` : ''}`).toBe(differs ? differs.ours : theirs);
    }
  });

  it('turns every row the competitor leads into a gap with its lever', () => {
    expect(gapsFrom(rows, accounts).map((g) => `${g.key}:${g.lever}`)).toEqual([
      'engagement_rate:hooks',
      'comments:cta_automation',
      'dm_automation:cta_automation',
      'core_priced:price_transparency',
      'entry_products:entry_bundle',
      'recurring:recurring',
      'meta_ads:retargeting',
      'pixels:pixel',
    ]);
  });
});
