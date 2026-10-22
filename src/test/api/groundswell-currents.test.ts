import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseSite, runSite, SITE_ATTEMPTS } from '../../../api/_lib/groundswell/currents/site';
import { assertNotBlocked, mapsSearchUrl } from '../../../api/_lib/groundswell/currents/maps';
import { domainOf, parseKeywordIdeas } from '../../../api/_lib/groundswell/currents/search';
import { summarizeInstagram } from '../../../api/_lib/groundswell/currents/social';
import { PermanentStepError } from '../../../api/_lib/groundswell/types';
import { sampleHtml } from './fixtures/groundswell-report';

describe('Site Current: parseSite', () => {
  const s = parseSite(sampleHtml, 'https://harbor-auto.example', 'https://harbor-auto.example/', 200);

  it('reads the page basics', () => {
    expect(s.title).toBe('Harbor Auto Care | Auto Repair in Fort Lauderdale');
    expect(s.meta_description).toBe('Honest auto repair & maintenance in Fort Lauderdale.');
    expect(s.h1).toEqual(['Auto repair you can trust']);
    expect(s.canonical).toBe('https://harbor-auto.example/');
    expect(s.has_viewport).toBe(true);
    expect(s.https).toBe(true);
    expect(s.schema_types).toEqual(['AutoRepair', 'LocalBusiness']);
  });

  it('reads brand colours (no greys), logo and OG image as absolute URLs', () => {
    expect(s.theme_color).toBe('#0E5A8A');
    expect(s.brand_colors[0]).toBe('#0e5a8a');
    expect(s.brand_colors).not.toContain('#333333');
    expect(s.logo).toBe('https://harbor-auto.example/img/logo.png');
    expect(s.og_image).toBe('https://harbor-auto.example/og.jpg');
  });

  it('finds tracking tags, booking tools, phones and profile handles (not share links)', () => {
    expect(s.tracking.google_analytics).toEqual(['G-ABC1234567']);
    expect(s.tracking.google_ads).toEqual(['AW-123456789']);
    expect(s.tracking.meta_pixel).toBe(false);
    expect(s.booking).toEqual(['Square']);
    expect(s.phones).toEqual(['+19545550199']);
    expect(s.social.instagram).toEqual(['harborautocare']);
    expect(s.social.facebook).toEqual(['harborauto']);
  });

  it('copes with an empty page', () => {
    const empty = parseSite('', 'http://x.example', 'http://x.example', 0);
    expect(empty.title).toBeNull();
    expect(empty.word_count).toBe(0);
    expect(empty.https).toBe(false);
  });
});

describe('Maps Current', () => {
  it('builds a logged-out search URL', () => {
    expect(mapsSearchUrl('Harbor Auto Care Fort Lauderdale')).toBe(
      'https://www.google.com/maps/search/Harbor%20Auto%20Care%20Fort%20Lauderdale?hl=en&gl=us'
    );
  });

  it('stops at consent and traffic-check pages instead of getting past them', () => {
    expect(() => assertNotBlocked('https://consent.google.com/ml?continue=x', 'Before you continue')).toThrow(PermanentStepError);
    expect(() => assertNotBlocked('https://www.google.com/sorry/index', 'Sorry')).toThrow(PermanentStepError);
    expect(() => assertNotBlocked('https://www.google.com/maps/search/x', 'x - Google Maps')).not.toThrow();
  });
});

describe('Search Current', () => {
  it('reduces URLs to a bare domain', () => {
    expect(domainOf('https://www.Example.com/path')).toBe('example.com');
    expect(domainOf('example.com')).toBe('example.com');
    expect(domainOf(null)).toBeNull();
    expect(domainOf('not a url at all')).toBeNull();
  });

  it('reads keyword ideas in snake_case or camelCase, bids in micros', () => {
    const snake = parseKeywordIdeas({
      data: { results: [{ text: 'brake repair', keyword_idea_metrics: { avg_monthly_searches: '880', competition: 'HIGH', low_top_of_page_bid_micros: 4_100_000, high_top_of_page_bid_micros: 12_500_000 } }] },
    });
    const camel = parseKeywordIdeas({
      results: [{ text: 'ac repair', keywordIdeaMetrics: { avgMonthlySearches: 320, lowTopOfPageBidMicros: '2000000' } }, { text: '' }],
    });
    expect(snake).toEqual([{ keyword: 'brake repair', monthly_searches: 880, competition: 'HIGH', low_bid_usd: 4.1, high_bid_usd: 12.5 }]);
    expect(camel).toEqual([{ keyword: 'ac repair', monthly_searches: 320, competition: null, low_bid_usd: 2, high_bid_usd: null }]);
  });
});

describe('Social Current: summarizeInstagram', () => {
  const now = Date.parse('2026-10-21T00:00:00Z');
  it('reads web-style profiles and recent posts', () => {
    const snap = summarizeInstagram(
      'shop',
      { data: { user: { edge_followed_by: { count: 1250 }, edge_follow: { count: 300 }, edge_owner_to_timeline_media: { count: 88 }, biography: 'Hi', is_business_account: true } } },
      {
        items: [
          { taken_at: Math.floor(Date.parse('2026-10-15T00:00:00Z') / 1000), like_count: 10, comment_count: 2 },
          { taken_at: Date.parse('2026-08-01T00:00:00Z'), like_count: 20, comment_count: 0 },
        ],
      },
      now
    );
    expect(snap).toMatchObject({
      handle: 'shop',
      exists: true,
      followers: 1250,
      following: 300,
      posts: 88,
      is_business: true,
      last_post_at: '2026-10-15T00:00:00.000Z',
      posts_last_30_days: 1,
      avg_likes_recent: 15,
      avg_comments_recent: 1,
    });
  });

  it('marks a missing profile as not found, without inventing counts', () => {
    const snap = summarizeInstagram('ghost', null, null, now);
    expect(snap.exists).toBe(false);
    expect(snap.followers).toBeNull();
    expect(snap.posts_last_30_days).toBeNull();
  });
});

describe('Site Current: a website that cannot be reached', () => {
  const audit = { id: 'a1', business_name: 'Harbor Auto Care', city: null, website: 'https://down.example', instagram: null, competitors: [], notes: null };
  const down = vi.fn(async () => {
    throw new Error('fetch failed');
  });

  beforeEach(() => {
    down.mockClear();
    vi.stubGlobal('fetch', down);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is tried again on the first calls, then recorded as a gap so the audit goes on', async () => {
    await expect(runSite({ audit, outputs: {}, deadline: Date.now() + 60_000, attempt: 1 })).rejects.toThrow(/could not be reached: fetch failed/);
    await expect(runSite({ audit, outputs: {}, deadline: Date.now() + 60_000, attempt: SITE_ATTEMPTS - 1 })).rejects.toThrow(/could not be reached/);
    const out = await runSite({ audit, outputs: {}, deadline: Date.now() + 60_000, attempt: SITE_ATTEMPTS });
    expect(out.business).toMatchObject({ status: null, error: 'fetch failed' });
  });

  it('refuses an audit with neither a website nor an Instagram handle for good', async () => {
    await expect(runSite({ audit: { ...audit, website: null }, outputs: {}, deadline: Date.now() + 60_000, attempt: 1 })).rejects.toBeInstanceOf(PermanentStepError);
    expect(down).not.toHaveBeenCalled();
  });
});
