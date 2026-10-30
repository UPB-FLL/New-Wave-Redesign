import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../../api/_lib/groundswell/publicFetch', () => ({ readPublicText: vi.fn() }));

import { readPublicText } from '../../../api/_lib/groundswell/publicFetch';
import { LINK_PAGE_ERROR, linkPageScan, parseSite, runSite, scanSite, SITE_ATTEMPTS } from '../../../api/_lib/groundswell/currents/site';
import { assertNotBlocked, mapsSearchUrl } from '../../../api/_lib/groundswell/currents/maps';
import { domainOf, parseKeywordIdeas } from '../../../api/_lib/groundswell/currents/search';
import { summarizeInstagram } from '../../../api/_lib/groundswell/currents/social';
import { PermanentStepError } from '../../../api/_lib/groundswell/types';
import { sampleHtml } from './fixtures/groundswell-report';

const read = vi.mocked(readPublicText);

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
    read.mockImplementation(down);
  });
  afterEach(() => {
    read.mockReset();
  });

  it('is tried again on the first calls, then recorded as a gap so the audit goes on', async () => {
    await expect(runSite({ audit, outputs: {}, deadline: Date.now() + 60_000, attempt: 1 })).rejects.toThrow(/could not be reached: fetch failed/);
    await expect(runSite({ audit, outputs: {}, deadline: Date.now() + 60_000, attempt: SITE_ATTEMPTS - 1 })).rejects.toThrow(/could not be reached/);
    const out = await runSite({ audit, outputs: {}, deadline: Date.now() + 60_000, attempt: SITE_ATTEMPTS });
    expect(out.business).toMatchObject({ status: null, error: 'fetch failed' });
  });

  it('refuses an audit without a website, Instagram handle, or Facebook Page for good', async () => {
    await expect(runSite({ audit: { ...audit, website: null }, outputs: {}, deadline: Date.now() + 60_000, attempt: 1 })).rejects.toBeInstanceOf(PermanentStepError);
    expect(down).not.toHaveBeenCalled();
  });
});

describe('Site Current: shared website branding', () => {
  beforeEach(() => read.mockReset());
  afterEach(() => read.mockReset());

  it('loads schema logos and external CSS colours for the business and competitor while retaining site evidence', async () => {
    read.mockImplementation(async (url) => {
      const origin = new URL(url).origin;
      const own = origin === 'https://business.example';
      if (url.endsWith('.css')) return { url, status: 200, contentType: 'text/css', text: `:root { --brand-primary: ${own ? '#245c38' : '#8c1f27'}; }` };
      return { url: `${origin}/`, status: 200, contentType: 'text/html', text: `<html><head><title>${own ? 'Business' : 'Competitor'}</title><meta name="theme-color" content="#ffffff"><meta name="description" content="Actual business description"><link rel="canonical" href="/"><link rel="stylesheet" href="/brand.css"><script type="application/ld+json">{"@type":"LocalBusiness","name":"${own ? 'Business' : 'Competitor'}","logo":{"@type":"ImageObject","url":"/brand-logo.svg"}}</script></head><body><h1>Actual service</h1><a href="tel:+19545550199">Call now</a><script>G-ABC1234567</script></body></html>` };
    });
    const audit = { id: 'a1', business_name: 'Business', city: null, website: 'https://business.example', instagram: null, competitors: [{ name: 'Competitor', website: 'https://competitor.example', instagram: null }], notes: null };
    const output = await runSite({ audit, outputs: {}, deadline: Date.now() + 60_000, attempt: 1 });
    expect(output.business).toMatchObject({ logo: 'https://business.example/brand-logo.svg', brand_primary: '#245c38', brand_colors: ['#245c38'], theme_color: '#ffffff', meta_description: 'Actual business description', h1: ['Actual service'], phones: ['+19545550199'], tracking: { google_analytics: ['G-ABC1234567'] }, technical_seo: { scope: 'raw_http', body_h1_count: 1 } });
    expect(output.competitors[0].site).toMatchObject({ logo: 'https://competitor.example/brand-logo.svg', brand_primary: '#8c1f27', brand_colors: ['#8c1f27'] });
    expect(read).toHaveBeenCalledTimes(4);
  });

  it('keeps the scanner timeout contract and canonical numeric Facebook Page references', async () => {
    read.mockResolvedValue({ url: 'https://business.example/', status: 200, contentType: 'text/html', text: '<title>Business</title><script type="application/ld+json">{"@type":"LocalBusiness","sameAs":["https://facebook.com/profile.php?id=123456789"]}</script>' });
    const scan = await scanSite('https://business.example', 4_321);
    expect(read).toHaveBeenCalledWith('https://business.example', expect.objectContaining({ timeoutMs: 4_321 }));
    expect(scan.social.facebook[0]).toBe('profile.php?id=123456789');
  });

  it('keeps a link-in-bio page’s words and links but none of the link service’s tags, data or colours, and does not retry it', async () => {
    read.mockResolvedValue({ url: 'https://linktr.ee/apk9', status: 200, contentType: 'text/html', text: '<html><head><title>APK9 Academy LLC | Linktree</title><meta name="theme-color" content="#43e660"><script type="application/ld+json">{"@type":"Organization","name":"Linktree"}</script></head><body><h1>APK9 Academy LLC</h1><a href="https://www.instagram.com/apk9academy">Instagram</a><a href="tel:+19545550123">Call</a><script>G-LINKTREE12</script><script src="https://connect.facebook.net/en_US/fbevents.js"></script></body></html>' });
    const audit = { id: 'a1', business_name: 'APK9 Academy LLC', city: 'Pembroke Pines, FL', website: 'https://linktr.ee/apk9', instagram: null, competitors: [], notes: null };
    const output = await runSite({ audit, outputs: {}, deadline: Date.now() + 60_000, attempt: 1 });
    expect(output.business).toMatchObject({ link_page: true, error: LINK_PAGE_ERROR, status: 200, h1: ['APK9 Academy LLC'], phones: ['+19545550123'], schema_types: [], logo: null, theme_color: null, brand_colors: [], tracking: { google_analytics: [], meta_pixel: false }, booking: [], word_count: 0 });
    expect(output.business!.social.instagram).toContain('apk9academy');
    expect(output.business!.technical_seo).toBeUndefined();
    // The page answered, so the step does not throw to retry it.
    expect(read).toHaveBeenCalledTimes(1);
    // The pure form, for a scan stored before the flag existed.
    expect(linkPageScan({ ...parseSite('<title>x</title>', 'https://linktr.ee/x', 'https://linktr.ee/x', 200), og_image: 'https://linktr.ee/og.png' })).toMatchObject({ link_page: true, og_image: null, error: LINK_PAGE_ERROR });
  });

  it('lets a Facebook-only seed continue to profile research without fabricating a website scan', async () => {
    const audit = { id: 'a1', business_name: 'Business', city: null, website: null, instagram: null, facebook: 'https://www.facebook.com/business', competitors: [], notes: null };
    const output = await runSite({ audit, outputs: {}, deadline: Date.now() + 60_000, attempt: 1 });
    expect(output).toEqual({ business: null, competitors: [] });
    expect(read).not.toHaveBeenCalled();
  });
});
