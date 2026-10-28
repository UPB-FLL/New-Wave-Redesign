import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ executeTool: vi.fn(), executeToolAs: vi.fn(), composioConfigured: false, loadLinkedAccounts: vi.fn() }));
vi.mock('../../../api/_lib/groundswell/composio', async (original) => ({
  ...(await original<object>()),
  executeTool: mocks.executeTool,
  executeToolAs: mocks.executeToolAs,
  isComposioConfigured: () => mocks.composioConfigured,
}));
vi.mock('../../../api/_lib/supabaseAdmin', () => ({ getSupabaseAdmin: () => ({}), isSupabaseConfigured: () => true }));
vi.mock('../../../api/_lib/groundswell/currents/linked', async (original) => ({ ...(await original<object>()), loadLinkedAccounts: mocks.loadLinkedAccounts }));

import { facebookEngagement, facebookPageUrl, GATED_ACTOR, gatedPosts, gatedProfile, LINKED_MEDIA_FIELDS, mediaFromGraph, PRIVATE_NOTE, refusal, RESTRICTED_NOTE, runSocial, summarizeFacebook, summarizeInstagram, timeBudget } from '../../../api/_lib/groundswell/currents/social';

/** The Social Current when Instagram turns the scraper away: one more try, then the gap is recorded, never a failed audit. */

const profile = (followers: number) => ({ data: { follower_count: followers, biography: 'Beer', media_count: 10 } });
const posts = { items: [{ like_count: 10, comment_count: 1, taken_at: 1_760_000_000 }] };
const audit = { id: 'a1', business_name: 'Harbor Auto Care', city: 'Fort Lauderdale, FL', website: null, instagram: 'harborautocare', competitors: [{ name: 'Bayside', website: null, instagram: 'bayside' }], notes: null };
const ctx = { audit, outputs: {}, deadline: Date.now() + 250_000, attempt: 1 };
const blockedProfile = 'SCRAPECREATORS_GET_INSTAGRAM_PROFILE failed (403): Profile is age restricted';
/** Apify's profile scraper answers with an array of one profile; its post scraper with an array of posts. */
const apifyProfile = [{ username: 'harborautocare', followersCount: 2200, followsCount: 310, postsCount: 480, biography: 'Brakes & tires', isBusinessAccount: true, externalUrls: [{ url: 'https://harbor-auto.example/book' }] }];
const apifyPosts = [
  { shortCode: 'C1', type: 'Image', likesCount: 40, commentsCount: 3, timestamp: '2026-10-20T15:00:00.000Z', caption: 'Brakes done same day.', displayUrl: 'https://cdn.example/C1.jpg' },
  { shortCode: 'C2', type: 'Video', likesCount: 20, commentsCount: 1, timestamp: '2026-10-18T15:00:00.000Z', caption: 'Shop tour', displayUrl: 'https://cdn.example/C2.jpg', videoViewCount: 900 },
];

/** The signed-in reader's items, one per post with the profile repeated, as the actor answered on 2026-10-27 (figures made up). */
const gatedItem = (post: Record<string, unknown>) => ({ username: 'harborautocare', user_pk: '44', full_name: 'Harbor Auto Care', follower_count: 11990, following_count: 1709, biography: 'Brakes & tires', is_private: false, is_verified: false, coauthors: [], hashtags: [], mentions: [], is_paid_partnership: false, is_off_grid: false, ...post });
const gatedItems = {
  items: [
    gatedItem({ post_pk: '1', shortcode: 'G1', permalink: 'https://www.instagram.com/p/G1/', post_type: 'image', taken_at: '2026-10-26T14:26:47Z', caption: 'Packed house.', like_count: 59, comment_count: 1, view_count: null, media: [{ media_url: 'https://cdn.example/G1.jpg', cover_url: null, media_type: 'image', width: 1328, height: 1760, video_duration: null }] }),
    gatedItem({ post_pk: '2', shortcode: 'G2', permalink: 'https://www.instagram.com/p/G2/', post_type: 'reel', taken_at: '2026-10-22T12:39:59Z', caption: 'Two new stouts.', like_count: 69, comment_count: 2, view_count: 1251, media: [{ media_url: 'https://cdn.example/G2.mp4', cover_url: 'https://cdn.example/G2-cover.jpg', media_type: 'video', width: 1080, height: 1920, video_duration: 19.6 }] }),
    gatedItem({ post_pk: '3', shortcode: 'G3', permalink: 'https://www.instagram.com/p/G3/', post_type: 'carousel', taken_at: '2026-10-13T18:31:17Z', caption: 'Tacos.', like_count: 68, comment_count: 4, view_count: null, media: [{ media_url: 'https://cdn.example/G3a.jpg', cover_url: null, media_type: 'image', width: 1320, height: 1760, video_duration: null }, { media_url: 'https://cdn.example/G3b.jpg', cover_url: null, media_type: 'image', width: 1317, height: 1757, video_duration: null }] }),
  ],
};

// A function returned from beforeEach is a cleanup hook to vitest, so the reset stays inside braces.
beforeEach(() => {
  mocks.executeTool.mockReset();
  mocks.executeToolAs.mockReset();
  mocks.composioConfigured = false;
  mocks.loadLinkedAccounts.mockReset().mockResolvedValue({ customer_id: null, stage: null, rows: [], note: 'not a client' });
});

describe('Social Current: blocked profiles', () => {
  it('tries a blocked profile once more and keeps the second read', async () => {
    let own = 0;
    mocks.executeTool.mockImplementation(async (slug: string, args: { handle: string }) => {
      if (slug === 'SCRAPECREATORS_GET_INSTAGRAM_PROFILE' && args.handle === 'harborautocare' && own++ === 0) {
        throw new Error('SCRAPECREATORS_GET_INSTAGRAM_PROFILE failed (200): Instagram blocked access to this public profile.');
      }
      return slug === 'SCRAPECREATORS_GET_INSTAGRAM_PROFILE' ? profile(args.handle === 'bayside' ? 500 : 1200) : posts;
    });
    const out = await runSocial(ctx, 0);
    expect(out.business).toMatchObject({ handle: 'harborautocare', followers: 1200, error: null });
    expect(out.competitors[0]).toMatchObject({ name: 'Bayside', followers: 500, error: null });
    expect(mocks.executeTool.mock.calls.filter(([slug, a]) => slug === 'SCRAPECREATORS_GET_INSTAGRAM_PROFILE' && a.handle === 'harborautocare')).toHaveLength(2);
  });

  it('records the block when the second read is turned away too, and still reads the competitors', async () => {
    mocks.executeTool.mockImplementation(async (slug: string, args: { handle: string }) => {
      if (args.handle === 'harborautocare') throw new Error('Instagram blocked access to this public profile.');
      return slug === 'SCRAPECREATORS_GET_INSTAGRAM_PROFILE' ? profile(500) : posts;
    });
    const out = await runSocial(ctx, 0);
    expect(out.business).toMatchObject({ exists: false, followers: null });
    expect(out.business?.error).toMatch(/blocked/);
    expect(out.competitors[0]).toMatchObject({ followers: 500 });
  });

  it('a profile Instagram hides from logged-out readers (the two reads turned away) is read through the signed-in reader on Apify', async () => {
    mocks.executeTool.mockImplementation(async (slug: string, args: Record<string, unknown>) => {
      if (slug.startsWith('SCRAPECREATORS_') && args.handle === 'harborautocare') throw new Error(blockedProfile);
      if (slug === 'APIFY_RUN_ACTOR_SYNC_GET_DATASET_ITEMS') return gatedItems;
      return slug === 'SCRAPECREATORS_GET_INSTAGRAM_PROFILE' ? profile(500) : posts;
    });
    const out = await runSocial(ctx, 0);
    expect(out.business).toMatchObject({ handle: 'harborautocare', exists: true, followers: 11990, following: 1709, biography: 'Brakes & tires', read_via: 'apify', restricted: true, note: null, error: null });
    expect(out.business?.avg_likes_recent).toBe(65);
    expect(out.business?.avg_comments_recent).toBe(2);
    expect(out.business?.last_post_at).toBe('2026-10-26T14:26:47.000Z');
    expect(out.business?.media?.map((m) => [m.code, m.type, m.image_url, m.plays, m.permalink])).toEqual([
      ['G1', 'image', 'https://cdn.example/G1.jpg', null, 'https://www.instagram.com/p/G1/'],
      ['G2', 'video', 'https://cdn.example/G2-cover.jpg', 1251, 'https://www.instagram.com/p/G2/'],
      ['G3', 'carousel', 'https://cdn.example/G3a.jpg', null, 'https://www.instagram.com/p/G3/'],
    ]);
    expect(out.source).toMatch(/via Apify where Instagram hides a profile/);
    const apify = mocks.executeTool.mock.calls.filter(([slug]) => slug.startsWith('APIFY_'));
    expect(apify).toHaveLength(1);
    expect(apify[0][1]).toMatchObject({ actorId: GATED_ACTOR, input: { usernames: ['harborautocare'], maxPosts: 12 }, maxTotalChargeUsd: 1 });
    // The competitor's profile was public: no Apify run for it.
    expect(apify.some(([, a]) => JSON.stringify(a).includes('bayside'))).toBe(false);
  });

  it('maps the signed-in reader’s items to a profile and a post list', () => {
    expect(gatedProfile(gatedItems)).toMatchObject({ username: 'harborautocare', follower_count: 11990 });
    expect(gatedProfile({ items: [] })).toBeNull();
    expect(gatedPosts(gatedItems).map((p) => [p.code, p.media_type, p.display_url])).toEqual([['G1', 1, 'https://cdn.example/G1.jpg'], ['G2', 2, 'https://cdn.example/G2-cover.jpg'], ['G3', 8, 'https://cdn.example/G3a.jpg']]);
    expect(gatedPosts(gatedItems.items)).toHaveLength(3);
  });

  it('when the signed-in reader answers with nothing, Apify’s stock scraper is tried next', async () => {
    mocks.executeTool.mockImplementation(async (slug: string, args: Record<string, unknown>) => {
      if (slug.startsWith('SCRAPECREATORS_') && args.handle === 'harborautocare') throw new Error(blockedProfile);
      if (slug === 'APIFY_RUN_ACTOR_SYNC_GET_DATASET_ITEMS') return { items: [] };
      if (slug === 'APIFY_SCRAPE_INSTAGRAM_PROFILES') return apifyProfile;
      if (slug === 'APIFY_SCRAPE_INSTAGRAM_POSTS') return apifyPosts;
      return slug === 'SCRAPECREATORS_GET_INSTAGRAM_PROFILE' ? profile(500) : posts;
    });
    const out = await runSocial(ctx, 0);
    expect(out.business).toMatchObject({ handle: 'harborautocare', exists: true, followers: 2200, following: 310, posts: 480, is_business: true, read_via: 'apify', restricted: true, note: null, error: null });
    expect(out.business?.bio_links).toEqual(['https://harbor-auto.example/book']);
    expect(out.business?.avg_likes_recent).toBe(30);
    expect(out.business?.media?.map((m) => [m.code, m.type, m.plays])).toEqual([
      ['C1', 'image', null],
      ['C2', 'video', 900],
    ]);
    expect(out.source).toMatch(/via Apify where Instagram hides a profile/);
    const apify = mocks.executeTool.mock.calls.filter(([slug]) => slug.startsWith('APIFY_'));
    expect(apify.map(([slug, a]) => [slug, (a as { usernames?: string[]; username?: string[]; input?: { usernames: string[] } }).input?.usernames ?? (a as { usernames?: string[] }).usernames ?? (a as { username?: string[] }).username])).toEqual([
      ['APIFY_RUN_ACTOR_SYNC_GET_DATASET_ITEMS', ['harborautocare']],
      ['APIFY_SCRAPE_INSTAGRAM_PROFILES', ['harborautocare']],
      ['APIFY_SCRAPE_INSTAGRAM_POSTS', ['harborautocare']],
    ]);
    // The competitor's profile was public: no Apify run for it.
    expect(apify.some(([, a]) => JSON.stringify(a).includes('bayside'))).toBe(false);
  });

  it('when Apify cannot read it either, the snapshot carries the note a report prints, and the step still finishes', async () => {
    mocks.executeTool.mockImplementation(async (slug: string, args: Record<string, unknown>) => {
      if (slug.startsWith('SCRAPECREATORS_') && args.handle === 'harborautocare') throw new Error(blockedProfile);
      if (slug.startsWith('APIFY_')) throw new Error('The paid Actor request failed without a definitive provider response.');
      return slug === 'SCRAPECREATORS_GET_INSTAGRAM_PROFILE' ? profile(500) : posts;
    });
    const out = await runSocial(ctx, 0);
    expect(out.business).toMatchObject({ exists: false, followers: null, restricted: true, note: RESTRICTED_NOTE });
    expect(out.business?.error).toMatch(/age restricted.*Apify \(signed-in reader\): The paid Actor.*Apify: The paid Actor/);
    expect(out.competitors[0]).toMatchObject({ followers: 500, restricted: false, note: null });
  });

  it('a private account is recorded with its own note and never sent to Apify', async () => {
    mocks.executeTool.mockImplementation(async (slug: string, args: Record<string, unknown>) => {
      if (slug.startsWith('SCRAPECREATORS_') && args.handle === 'harborautocare') throw new Error('SCRAPECREATORS_GET_INSTAGRAM_PROFILE failed (404): Profile is private');
      return slug === 'SCRAPECREATORS_GET_INSTAGRAM_PROFILE' ? profile(500) : posts;
    });
    const out = await runSocial(ctx, 0);
    expect(out.business).toMatchObject({ exists: false, restricted: true, note: PRIVATE_NOTE });
    expect(mocks.executeTool.mock.calls.some(([slug]) => slug.startsWith('APIFY_'))).toBe(false);
    // One read, no retry: a private account does not change its mind in three seconds.
    expect(mocks.executeTool.mock.calls.filter(([, a]) => a.handle === 'harborautocare')).toHaveLength(2);
  });

  it('tells the refusals apart from the provider wording', () => {
    expect(refusal(new Error('SCRAPECREATORS_GET_INSTAGRAM_PROFILE failed (403): Profile is age restricted'))).toBe('age');
    expect(refusal(new Error('Instagram blocked access to this public profile.'))).toBe('blocked');
    expect(refusal(new Error('Profile is restricted'))).toBe('restricted');
    expect(refusal(new Error('Profile is private'))).toBe('private');
    expect(refusal(new Error('Composio refused the API key (401).'))).toBeNull();
  });

  it('never lets one read wait past the worker deadline: every call is capped by the time left', async () => {
    mocks.executeTool.mockImplementation(async (slug: string) => {
      if (slug === 'SCRAPECREATORS_GET_INSTAGRAM_PROFILE') throw new Error('Instagram blocked access to this public profile');
      if (slug.startsWith('APIFY_')) return { username: 'harborautocare', followersCount: 10 };
      return { data: {} };
    });
    const soon = { ...ctx, deadline: Date.now() + 40_000 };
    await runSocial(soon, 0);
    const timeouts = mocks.executeTool.mock.calls.map(([slug, , t]) => [slug, t] as [string, unknown]);
    expect(timeouts.length).toBeGreaterThan(0);
    for (const [slug, t] of timeouts) {
      expect(typeof t, slug).toBe('number');
      expect(t as number, slug).toBeLessThanOrEqual(35_000);
      expect(t as number, slug).toBeGreaterThanOrEqual(5_000);
    }
    // With time to spare, Apify keeps its own cap and ScrapeCreators its shorter one; past the deadline, the floor.
    expect(timeBudget({ deadline: Date.now() + 1_000_000 }, 300_000)).toBe(300_000);
    expect(timeBudget({ deadline: Date.now() + 1_000_000 }, 90_000)).toBe(90_000);
    expect(timeBudget({ deadline: Date.now() - 1 }, 90_000)).toBe(5_000);
  });

  it('does not retry other failures, and still stops the step for a refused key', async () => {
    mocks.executeTool.mockRejectedValue(new Error('Composio refused the API key (401).'));
    await expect(runSocial(ctx, 0)).rejects.toThrow(/refused/);
    expect(mocks.executeTool.mock.calls.filter(([, a]) => a.handle === 'harborautocare')).toHaveLength(2);
  });
});

describe('Social Current: Facebook Pages', () => {
  const site = {
    business: { social: { instagram: ['harborautocare'], facebook: ['harborauto'], tiktok: [], youtube: [] } },
    competitors: [{ name: 'Bayside', site: { social: { instagram: ['bayside'], facebook: ['https://www.facebook.com/baysideauto'], tiktok: [], youtube: [] } } }],
  };
  /** The shapes docs.scrapecreators.com documents (read 2026-10-22). */
  const fbProfile = { success: true, id: '100088017857524', name: 'Harbor Auto Care', isPrivate: false, url: 'https://www.facebook.com/harborauto', followerCount: 1900, likeCount: 1750, category: 'Auto Repair Shop', pageIntro: 'Family-run since the start.', rating: 4.8, ratingCount: 120, adLibrary: { pageId: '100063669491743', adStatus: 'This Page is currently running ads' } };
  const fbPosts = { success: true, posts: [{ id: '1', text: 'New lift installed.', url: 'https://www.facebook.com/harborauto/posts/1', permalink: 'https://www.facebook.com/harborauto/posts/1', reactionCount: 44, commentCount: 5, videoViewCount: null, publishTime: 1792512391, videoDetails: { sdUrl: null, hdUrl: null, thumbnailUrl: 'https://scontent.example/p1.jpg' } }] };

  it('reads the business\'s Page (gated Pages included) and the first competitors\' with one page of posts, keeping a competitor\'s words and figures but never its images', async () => {
    mocks.executeTool.mockImplementation(async (slug: string, args: Record<string, unknown>) => {
      if (slug === 'SCRAPECREATORS_GET_FACEBOOK_PROFILE') return args.url === 'https://www.facebook.com/harborauto' ? fbProfile : { name: 'Bayside Auto', followerCount: 300 };
      if (slug === 'SCRAPECREATORS_LIST_FACEBOOK_PROFILE_POSTS') return fbPosts;
      return slug === 'SCRAPECREATORS_GET_INSTAGRAM_PROFILE' ? profile(500) : posts;
    });
    const out = await runSocial({ ...ctx, outputs: { site } }, 0);
    expect(out.facebook).toMatchObject({ url: 'https://www.facebook.com/harborauto', page_id: '100063669491743', page_name: 'Harbor Auto Care', exists: true, followers: 1900, likes: 1750, category: 'Auto Repair Shop', intro: 'Family-run since the start.', rating: 4.8, rating_count: 120, ad_library_status: 'This Page is currently running ads', restricted: false, error: null });
    expect(out.facebook?.posts).toEqual([{ url: 'https://www.facebook.com/harborauto/posts/1', text: 'New lift installed.', posted_at: '2026-10-20T16:06:31.000Z', reactions: 44, comments: 5, shares: null, video_views: null, image_url: 'https://scontent.example/p1.jpg' }]);
    expect(out.facebook?.engagement).toMatchObject({ posts_read: 1, avg_reactions: 44, avg_comments: 5 });
    expect(out.facebook_competitors).toEqual([
      expect.objectContaining({ name: 'Bayside', url: 'https://www.facebook.com/baysideauto', page_name: 'Bayside Auto', followers: 300, posts: [expect.objectContaining({ text: 'New lift installed.', reactions: 44, image_url: null })], engagement: expect.objectContaining({ posts_read: 1, avg_reactions: 44, avg_comments: 5 }) }),
    ]);
    const fb = mocks.executeTool.mock.calls.filter(([slug]) => slug.startsWith('SCRAPECREATORS_') && slug.includes('FACEBOOK'));
    expect(fb.map(([slug, a]) => [slug, (a as { url: string }).url, (a as { include_gated_profile?: boolean }).include_gated_profile])).toEqual([
      ['SCRAPECREATORS_GET_FACEBOOK_PROFILE', 'https://www.facebook.com/harborauto', true],
      ['SCRAPECREATORS_GET_FACEBOOK_PROFILE', 'https://www.facebook.com/baysideauto', true],
      ['SCRAPECREATORS_LIST_FACEBOOK_PROFILE_POSTS', 'https://www.facebook.com/harborauto', undefined],
      ['SCRAPECREATORS_LIST_FACEBOOK_PROFILE_POSTS', 'https://www.facebook.com/baysideauto', undefined],
    ]);
  });

  it('sums a Page\'s engagement over the posts read, with nulls where the posts carry no figure', () => {
    const now = Date.parse('2026-10-27T12:00:00Z');
    const post = (at: string | null, reactions: number | null, comments: number | null) => ({ url: null, text: null, posted_at: at, reactions, comments, shares: null, video_views: null, image_url: null });
    expect(facebookEngagement([post('2026-10-20T10:00:00Z', 40, 4), post('2026-09-01T10:00:00Z', 21, null), post(null, null, 2)], now)).toEqual({ posts_read: 3, avg_reactions: 30.5, avg_comments: 3, posts_last_30_days: 1 });
    expect(facebookEngagement([post(null, null, null)], now)).toEqual({ posts_read: 1, avg_reactions: null, avg_comments: null, posts_last_30_days: null });
    expect(facebookEngagement([], now)).toBeNull();
  });

  it('a Page that cannot be read is recorded, never a failed step; no Page linked means null', async () => {
    mocks.executeTool.mockImplementation(async (slug: string) => {
      if (slug === 'SCRAPECREATORS_GET_FACEBOOK_PROFILE') throw new Error('SCRAPECREATORS_GET_FACEBOOK_PROFILE failed (200): Page not found.');
      return slug === 'SCRAPECREATORS_GET_INSTAGRAM_PROFILE' ? profile(500) : posts;
    });
    const out = await runSocial({ ...ctx, outputs: { site } }, 0);
    expect(out.facebook).toMatchObject({ exists: false, followers: null, posts: [] });
    expect(out.facebook?.error).toMatch(/Page not found/);
    const none = await runSocial(ctx, 0);
    expect(none.facebook).toBeNull();
    expect(none.facebook_competitors).toEqual([]);
  });

  it('turns the site scan\'s Facebook reference into a Page URL, and reads a gated Page\'s flag', () => {
    expect(facebookPageUrl('harborauto')).toBe('https://www.facebook.com/harborauto');
    expect(facebookPageUrl('/harborauto/')).toBe('https://www.facebook.com/harborauto/');
    expect(facebookPageUrl('https://www.facebook.com/harborauto')).toBe('https://www.facebook.com/harborauto');
    expect(facebookPageUrl('https://example.com/not-facebook')).toBeNull();
    expect(facebookPageUrl(null)).toBeNull();
    expect(summarizeFacebook('https://www.facebook.com/x', { isPrivate: true, followerCount: 10 }, null)).toMatchObject({ restricted: true, followers: 10, exists: true });
    expect(summarizeInstagram('x', null, null)).toMatchObject({ exists: false, read_via: 'scrapecreators', restricted: false, note: null });
  });
});

describe('Social Current: a client’s own Instagram account', () => {
  const row = { id: 'r1', customer_id: 'c1', service: 'instagram', composio_account_id: 'ca_ig', auth_config_id: 'ac', user_id: 'client:c1', status: 'active', status_reason: null, linked_by: 'staff:josh@newwaveitfl.com', linked_at: '2026-10-22T00:00:00Z', checked_at: null, created_at: '', updated_at: '' };
  /** What Composio's Instagram toolkit (the Graph API) answers. */
  const info = { data: { id: '17841400000000000', username: 'harborautocare', name: 'Harbor Auto Care', followers_count: 2450, follows_count: 180, media_count: 512 } };
  const media = {
    data: {
      data: [
        { id: '1', shortcode: 'G1', caption: 'Brakes done same day.', media_type: 'IMAGE', media_product_type: 'FEED', media_url: 'https://scontent.example/1.jpg', permalink: 'https://www.instagram.com/p/G1/', timestamp: '2026-10-20T15:00:00+0000', like_count: 60, comments_count: 4 },
        { id: '2', shortcode: 'G2', caption: 'Shop tour', media_type: 'VIDEO', media_product_type: 'REELS', media_url: 'https://scontent.example/2.mp4', thumbnail_url: 'https://scontent.example/2.jpg', permalink: 'https://www.instagram.com/reel/G2/', timestamp: '2026-10-18T15:00:00+0000', like_count: 20, comments_count: 2, view_count: 1500 },
        { id: '3', shortcode: 'G3', media_type: 'CAROUSEL_ALBUM', media_url: 'https://scontent.example/3.jpg', permalink: 'https://www.instagram.com/p/G3/', timestamp: '2025-01-01T15:00:00+0000', like_count: 10, comments_count: 0 },
      ],
      paging: { cursors: { after: 'x' } },
    },
  };

  it('reads the linked account first (no public read of the business), with its images, and the competitors from public data', async () => {
    mocks.composioConfigured = true;
    mocks.loadLinkedAccounts.mockResolvedValue({ customer_id: 'c1', stage: 'client', rows: [row], note: null });
    mocks.executeToolAs.mockImplementation(async (slug: string) => (slug === 'INSTAGRAM_GET_USER_INFO' ? info : media));
    mocks.executeTool.mockImplementation(async (slug: string, args: Record<string, unknown>) => {
      if (args.handle === 'harborautocare') throw new Error('Profile is age restricted');
      return slug === 'SCRAPECREATORS_GET_INSTAGRAM_PROFILE' ? profile(500) : posts;
    });
    const out = await runSocial(ctx, 0);
    expect(out.business).toMatchObject({ handle: 'harborautocare', exists: true, followers: 2450, following: 180, posts: 512, is_business: true, read_via: 'linked', restricted: false, note: null, error: null, avg_likes_recent: 30, avg_comments_recent: 2, last_post_at: '2026-10-20T15:00:00.000Z' });
    expect(out.business?.media?.map((m) => [m.code, m.type, m.image_url, m.plays])).toEqual([
      ['G1', 'image', 'https://scontent.example/1.jpg', null],
      ['G2', 'video', 'https://scontent.example/2.jpg', 1500],
      ['G3', 'carousel', 'https://scontent.example/3.jpg', null],
    ]);
    expect(out.competitors[0]).toMatchObject({ name: 'Bayside', followers: 500, read_via: 'scrapecreators' });
    expect(out.source).toMatch(/own Instagram account \(Graph API\)/);
    expect(out.linked_note).toBeNull();
    // The account is read as itself (executeToolAs with its connected account), never through the shared lookup.
    expect(mocks.executeToolAs.mock.calls.map(([slug, args, account]) => [slug, (args as { ig_user_id: string }).ig_user_id, (account as { id: string }).id])).toEqual([
      ['INSTAGRAM_GET_USER_INFO', 'me', 'ca_ig'],
      ['INSTAGRAM_GET_IG_USER_MEDIA', 'me', 'ca_ig'],
    ]);
    expect((mocks.executeToolAs.mock.calls[1][1] as { fields: string }).fields).toBe(LINKED_MEDIA_FIELDS);
    expect(mocks.executeTool.mock.calls.some(([, a]) => (a as { handle?: string }).handle === 'harborautocare')).toBe(false);
  });

  it('falls back to the public read when the linked account cannot be read, saying why for staff', async () => {
    mocks.composioConfigured = true;
    mocks.loadLinkedAccounts.mockResolvedValue({ customer_id: 'c1', stage: 'client', rows: [row], note: null });
    mocks.executeToolAs.mockRejectedValue(new Error('INSTAGRAM_GET_USER_INFO failed (400): Error validating access token'));
    mocks.executeTool.mockImplementation(async (slug: string, args: { handle: string }) => (slug === 'SCRAPECREATORS_GET_INSTAGRAM_PROFILE' ? profile(args.handle === 'bayside' ? 500 : 1200) : posts));
    const out = await runSocial(ctx, 0);
    expect(out.business).toMatchObject({ followers: 1200, read_via: 'scrapecreators' });
    expect(out.linked_note).toMatch(/could not be read .*access token.*public profile was read instead/);
  });

  it('a prospect, or a client with nothing linked, never touches the linked path; a database error stops the step so it retries', async () => {
    mocks.composioConfigured = true;
    mocks.executeTool.mockImplementation(async (slug: string) => (slug === 'SCRAPECREATORS_GET_INSTAGRAM_PROFILE' ? profile(1200) : posts));
    const out = await runSocial(ctx, 0);
    expect(out.business).toMatchObject({ followers: 1200, read_via: 'scrapecreators' });
    expect(mocks.executeToolAs).not.toHaveBeenCalled();
    mocks.loadLinkedAccounts.mockRejectedValue(new Error("Could not read the client's linked accounts: connection reset"));
    await expect(runSocial(ctx, 0)).rejects.toThrow(/linked accounts/);
  });

  it('reads the Graph API media shape on its own', () => {
    expect(mediaFromGraph(null)).toEqual([]);
    expect(mediaFromGraph([{ media_type: 'IMAGE', media_url: 'http://insecure.example/x.jpg' }])).toEqual([]);
    expect(mediaFromGraph([{ media_type: 'VIDEO', media_url: 'https://scontent.example/v.mp4', timestamp: 'not a date' }])).toEqual([
      { code: null, permalink: null, image_url: 'https://scontent.example/v.mp4', type: 'video', likes: null, comments: null, plays: null, taken_at: null, caption: null },
    ]);
  });
});

describe('Social Current: what the posts say', () => {
  it('keeps the business’s captions and hashtags, a competitor’s captions and hashtags without its images, and the hashtags seen', async () => {
    const rich = { items: [
      { code: 'A1', like_count: 10, comment_count: 1, taken_at: 1_760_000_000, caption: { text: 'Brakes done same day #FortLauderdale #brakes' }, image_versions2: { candidates: [{ url: 'https://cdn.example/a1.jpg' }] } },
      { code: 'A2', like_count: 12, comment_count: 0, taken_at: 1_759_900_000, caption: { text: 'Shop tour #fortlauderdale #shoplife' }, image_versions2: { candidates: [{ url: 'https://cdn.example/a2.jpg' }] } },
    ] };
    mocks.executeTool.mockImplementation(async (slug: string, args: { handle: string }) => (slug === 'SCRAPECREATORS_GET_INSTAGRAM_PROFILE' ? profile(args.handle === 'bayside' ? 500 : 1200) : rich));
    const out = await runSocial(ctx, 0);
    expect(out.business).toMatchObject({ recent_captions: ['Brakes done same day #FortLauderdale #brakes', 'Shop tour #fortlauderdale #shoplife'], hashtags: ['fortlauderdale', 'brakes', 'shoplife'] });
    expect(out.business?.media).toHaveLength(2);
    expect(out.competitors[0]).toMatchObject({ name: 'Bayside', media: [], recent_captions: ['Brakes done same day #FortLauderdale #brakes', 'Shop tour #fortlauderdale #shoplife'], hashtags: ['fortlauderdale', 'brakes', 'shoplife'] });
    expect(out.hashtags_seen).toEqual({ business: ['fortlauderdale', 'brakes', 'shoplife'], competitors: ['fortlauderdale', 'brakes', 'shoplife'] });
  });
});
