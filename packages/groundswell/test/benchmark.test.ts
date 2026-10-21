import { describe, expect, it } from 'vitest';
import {
  buildScorecard,
  checkLadder,
  contentDepth,
  credentialsFrom,
  ctaKeyword,
  doNotCopyRules,
  engagementBand,
  engagementProfile,
  extractPrices,
  gapsFrom,
  leaderOf,
  mediaType,
  metaAdStatus,
  offerPages,
  ownedChannels,
  policyFlags,
  pressDomains,
  transparencyStatus,
  type BenchmarkAccount,
  type RawMediaItem,
} from '../src/benchmark';
import { config } from './fixture';

const NOW = Date.parse('2026-10-21T12:00:00Z');
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();
const item = (over: Partial<RawMediaItem>): RawMediaItem => ({
  list: 'post',
  media_type: 1,
  product_type: null,
  taken_at: daysAgo(1),
  like_count: 50,
  comment_count: 5,
  play_count: null,
  carousel_media_count: null,
  caption: 'A post',
  url: 'https://www.instagram.com/p/x/',
  paid_partnership: false,
  ...over,
});
const general = config.industries[0];
const health = { ...general, id: 'health', licences: ['RD', 'RDN', 'MD', 'DO'], do_not_copy: ['Medical claims.'] };
const trades = { ...general, id: 'trades', licences: ['licensed', 'insured'] };

describe('engagement', () => {
  it('maps Instagram media types', () => {
    expect(mediaType({ media_type: 8, product_type: null, list: 'post' })).toBe('carousel');
    expect(mediaType({ media_type: 1, product_type: null, list: 'post' })).toBe('image');
    expect(mediaType({ media_type: 2, product_type: 'clips', list: 'post' })).toBe('reel');
    expect(mediaType({ media_type: 2, product_type: 'feed', list: 'post' })).toBe('video');
  });

  it('reads comment-to-DM keywords in capitals, not "comment below"', () => {
    expect(ctaKeyword('Comment “DEEP DIVE” and I will send it')).toBe('DEEP DIVE');
    expect(ctaKeyword('comment LABS for the guide')).toBe('LABS');
    expect(ctaKeyword('Comment below with your questions')).toBeNull();
  });

  const profile = engagementProfile(
    'shop',
    10_000,
    [
      // Pinned: listed first, more than 30 days older than the next post.
      item({ taken_at: daysAgo(90), caption: 'Pinned welcome', like_count: 400, comment_count: 30 }),
      item({ taken_at: daysAgo(2), media_type: 2, product_type: 'clips', caption: 'Reel in the feed', like_count: 120, comment_count: 10 }),
      item({ taken_at: daysAgo(3), media_type: 8, carousel_media_count: 6, caption: 'Comment GUIDE for the PDF', like_count: 3, comment_count: 40 }),
      item({ taken_at: daysAgo(5), caption: 'Plain post', like_count: 80, comment_count: 4 }),
    ],
    [item({ list: 'reel', taken_at: daysAgo(2), media_type: 2, product_type: 'clips', caption: 'Reel in the feed', like_count: 120, comment_count: 10, play_count: 5000 })],
    NOW
  );

  it('dedupes the reels page against the posts page, keeping the copy with plays', () => {
    expect(profile.items_n).toBe(4);
    const reel = profile.items.find((i) => i.type === 'reel')!;
    expect(reel.plays).toBe(5000);
    expect(reel.kind).toBe('reel');
  });

  it('flags the pinned post and leaves it out of cadence', () => {
    expect(profile.items.find((i) => i.hook === 'Pinned welcome')?.pinned).toBe(true);
    expect(profile.cadence_per_week).toBe(1.5); // three unpinned items in 14 days
  });

  it('flags up to three leading posts older than one after them, pinned newest first or not', () => {
    const p = engagementProfile('pins', 10_000, [
      item({ taken_at: daysAgo(20), caption: 'Pin 1' }),
      item({ taken_at: daysAgo(40), caption: 'Pin 2' }),
      item({ taken_at: daysAgo(60), caption: 'Pin 3' }),
      item({ taken_at: daysAgo(80), caption: 'A fourth: Instagram pins three' }),
      item({ taken_at: daysAgo(1), caption: 'Newest' }),
      item({ taken_at: daysAgo(2), caption: 'Next' }),
    ], [], NOW);
    expect(p.items.filter((i) => i.pinned).map((i) => i.hook)).toEqual(['Pin 1', 'Pin 2', 'Pin 3']);
    const plain = engagementProfile('plain', 10_000, [item({ taken_at: daysAgo(1) }), item({ taken_at: daysAgo(40), caption: 'b' })], [], NOW);
    expect(plain.items.some((i) => i.pinned)).toBe(false);
  });

  it('divides reels by the weeks a cut-short reels page covers, else by four', () => {
    const reels = [1, 3, 6, 9, 14].map((d, n) => item({ list: 'reel', media_type: 2, product_type: 'clips', taken_at: daysAgo(d), caption: `r${n}`, play_count: 100 }));
    expect(engagementProfile('r', 1_000, [], reels, NOW, true).reels_per_week).toBe(2.5); // 5 reels over 2 weeks
    expect(engagementProfile('r', 1_000, [], reels, NOW, false).reels_per_week).toBe(1.25); // 5 ÷ 4
  });

  it('treats a placeholder like count with many comments as hidden', () => {
    const cta = profile.items.find((i) => i.cta_keyword === 'GUIDE')!;
    expect(cta.likes_hidden).toBe(true);
    expect(cta.likes).toBeNull();
    expect(profile.likes_hidden_n).toBe(1);
    expect(profile.likes_median).toBe(120); // 80, 120, 400
    expect(profile.engagement_rate_median).toBeCloseTo(130 / 10_000);
    expect(profile.cta_items_n).toBe(1);
    expect(profile.cta_comments_mean).toBe(40);
  });

  it('hides a 3 when the visible median is in the hundreds', () => {
    const p = engagementProfile('big', 50_000, [
      item({ taken_at: daysAgo(1), like_count: 300, comment_count: 2 }),
      item({ taken_at: daysAgo(2), like_count: 3, comment_count: 1, caption: 'b' }),
      item({ taken_at: daysAgo(3), like_count: 500, comment_count: 2, caption: 'c' }),
    ], [], NOW);
    expect(p.likes_hidden_n).toBe(1);
  });
});

describe('ad evidence', () => {
  it('needs the Page id for a verified negative, and an active ad for running', () => {
    expect(metaAdStatus("This Page isn't currently running ads.", [], '123')).toBe('not_running');
    expect(metaAdStatus("This Page isn't currently running ads.", [], null)).toBe('unknown');
    expect(metaAdStatus(null, [{ active: true }], '123')).toBe('running');
  });

  it('reads the Transparency Center: 0 ads over any time is a negative, a consent page is unknown', () => {
    expect(transparencyStatus('Advertiser ads Any time 0 ads')).toEqual({ status: 'none', count: 0 });
    expect(transparencyStatus('Before you continue to Google')).toEqual({ status: 'unknown', count: null });
    expect(transparencyStatus('Shown in the United States · Any time · 12 ads')).toEqual({ status: 'ads_found', count: 12 });
  });
});

describe('pricing', () => {
  const text =
    'Private coaching $2,800–$3,500 for 12 weeks. Single consult $350. Membership: $1,500 then $250 per month. Tiers $79/$180/$300 per month. Guide $28. Course $497 or 2 × $249 payments. Workshop $199. All sales are non-refundable. We do not accept insurance; HSA and FSA cards welcome.';
  const prices = extractPrices(text, 'https://shop.example/work-with-me');

  it('finds every price format in the spec', () => {
    expect(prices.map((p) => p.text)).toEqual(['$2,800–$3,500', '$350', '$1,500', '$250 per month', '$79', '$180', '$300 per month', '$28', '$497', '$249', '$199']);
    expect(prices[0]).toMatchObject({ amount: 2800, amount_high: 3500 });
    expect(prices[3]).toMatchObject({ per: 'month', payment_plan: true });
    expect(prices[0].context.length).toBeLessThanOrEqual(prices[0].text.length + 121);
  });

  it('reads refund, insurance and HSA policies', () => {
    expect(policyFlags([text])).toMatchObject({ refunds: 'none', accepts_insurance: false, hsa_fsa_mentioned: true });
    expect(policyFlags(['Refunds within 14 days.']).refunds).toBe('window');
  });

  it('keeps only prices the pages show, on pages that were read', () => {
    const ladder = checkLadder(
      {
        offers: [
          { tier: 'core', name: 'Private coaching', price_low: 2800, price_high: 3500, url: 'https://shop.example/work-with-me' },
          { tier: 'low_ticket', name: 'Invented', price_low: 99, url: 'https://elsewhere.example/' },
        ],
      },
      {
        name: 'Shop', payment_plans: true, refunds: 'none', accepts_insurance: false, hsa_fsa_mentioned: true, free_consult: false,
        discovery_call: false, lead_magnets: [], dm_automation: false, contact_email_domain: null,
        pages_read: ['https://shop.example/work-with-me'], mentions: prices, error: null,
      }
    );
    expect(ladder.offers[0]).toMatchObject({ price_low: 2800, price_high: 3500, context: '$2,800–$3,500' });
    expect(ladder.offers[1]).toMatchObject({ price_low: null, context: 'not published', url: 'https://shop.example/work-with-me' });
    expect(ladder.core_offer_priced).toBe(true);
    expect(ladder.prices_published).toBe(true);
  });

  it('finds offer pages, skips the blog, and reads link-in-bio stores', () => {
    expect(
      offerPages(
        'https://shop.example/',
        ['/work-with-me', '/blog/pricing-tips', 'https://other.example/services', '/about'],
        ['https://shop.example/membership', 'https://shop.example/2024/01/post'],
        ['https://stan.store/shop', 'https://www.tiktok.com/@shop'],
        10
      )
    ).toEqual(['https://shop.example', 'https://shop.example/work-with-me', 'https://shop.example/membership', 'https://stan.store/shop']);
  });
});

describe('authority', () => {
  it('counts press from the setup file list, never a hosting platform', () => {
    const press = pressDomains(
      [
        { domain: 'edition.cnn.com', domain_rating: 94, first_seen: '2024-01-01' },
        { domain: 'www.vogue.com', domain_rating: 91, first_seen: null },
        { domain: 'someone.blogspot.com', domain_rating: 90, first_seen: null },
      ],
      config
    );
    expect(press.map((p) => p.domain)).toEqual(['edition.cnn.com', 'vogue.com']);
  });

  it('finds owned channels from bio links and page markup', () => {
    expect(ownedChannels(['https://podcasts.apple.com/us/podcast/x', 'https://shop.substack.com', 'https://stan.store/shop'])).toEqual(['podcast', 'substack', 'store']);
    expect(ownedChannels([], '<form action="/x"><input name="email"> Subscribe to our newsletter</form>')).toEqual(['newsletter']);
  });

  it('reads credentials with the industry licence words, in credential position only', () => {
    expect(credentialsFrom('Jane Doe, MS, RD, LDN has 10 years of practice.', health).level).toBe('licensed');
    expect(credentialsFrom('WHAT WE DO for you', health).level).toBe('none');
    expect(credentialsFrom('A certified nutrition coach.', health).level).toBe('certified');
    expect(credentialsFrom('Licensed and insured in Florida.', trades).level).toBe('licensed');
  });

  it('counts content pages and the newest date from the sitemap', () => {
    expect(
      contentDepth([
        { loc: 'https://shop.example/blog/a', lastmod: '2026-09-01' },
        { loc: 'https://shop.example/recipes/b', lastmod: '2026-10-01' },
        { loc: 'https://shop.example/about', lastmod: '2026-10-20' },
      ])
    ).toEqual({ pages: 2, newest: '2026-10-01' });
  });
});

describe('scorecard', () => {
  it('calls followers even within 5 in 100, and needs the business value to call a leader', () => {
    expect(leaderOf([1000, 1040, 500], 'followers')).toBe('even');
    expect(leaderOf([1000, 2000, 500], 'followers')).toBe(1);
    expect(leaderOf([null, 2000, 500], 'highest')).toBeNull();
    expect(leaderOf([true, false, false], 'yes')).toBe(0);
    expect(leaderOf([false, false, true], 'yes')).toBe(2);
    expect(leaderOf([5, null, null], 'highest')).toBeNull();
  });

  const account = (name: string, followers: number, comments: number, rd: 'licensed' | 'none'): BenchmarkAccount => ({
    name,
    followers,
    engagement: { comments_median: comments, cta_items_n: comments > 10 ? 3 : 0 } as BenchmarkAccount['engagement'],
    ladder: null,
    ads: { meta_ad_status: 'not_running', pixels: { meta: false, google_ads: false, tiktok: false } },
    authority: { credentials: rd, press_domains: [], owned_channels: [], testimonials_page: false, domain_rating: 10, organic_traffic: 5 } as unknown as BenchmarkAccount['authority'],
  });
  const accounts = [account('Business', 900, 2, 'licensed'), account('Rival A', 4000, 23, 'none'), account('Rival B', 1200, 5, 'none')];

  it('builds rows with leaders, and gaps where a competitor leads', () => {
    const rows = buildScorecard(accounts, health, config);
    const row = (k: string) => rows.find((r) => r.key === k)!;
    expect(row('comments').leader).toBe(1);
    expect(row('credentials')).toMatchObject({ leader: 0, shown: ['Licensed', 'None stated', 'None stated'] });
    expect(row('prices_published').leader).toBeNull();
    const gaps = gapsFrom(rows, accounts);
    expect(gaps.map((g) => g.lever)).toEqual(expect.arrayContaining(['format', 'cta_automation']));
    expect(gaps.find((g) => g.key === 'comments')).toMatchObject({ leader: 'Rival A', business: '2', competitor: '23' });
  });

  it('leaves credentials out where the industry has no licence words', () => {
    expect(buildScorecard(accounts, general, config).some((r) => r.key === 'credentials')).toBe(false);
  });

  it('names engagement bands and merges the do-not-copy rules', () => {
    expect(engagementBand(0.0004, config)).toBe('very low');
    expect(engagementBand(0.0045, config)).toBe('normal for this size');
    expect(engagementBand(0.02, config)).toBe('strong');
    expect(doNotCopyRules(health, config)).toEqual(['Medical claims.', 'Unproven claims.']);
  });
});
