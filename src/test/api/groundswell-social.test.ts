import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ executeTool: vi.fn() }));
vi.mock('../../../api/_lib/groundswell/composio', async (original) => ({ ...(await original<object>()), executeTool: mocks.executeTool }));

import { facebookPageUrl, RESTRICTED_NOTE, runSocial, summarizeFacebook, summarizeInstagram } from '../../../api/_lib/groundswell/currents/social';

/** The Social Current when Instagram turns the scraper away: one more try, then the gap is recorded, never a failed audit. */

const profile = (followers: number) => ({ data: { follower_count: followers, biography: 'Beer', media_count: 10 } });
const posts = { items: [{ like_count: 10, comment_count: 1, taken_at: 1_760_000_000 }] };
const audit = { id: 'a1', business_name: 'Harbor Auto Care', city: 'Fort Lauderdale, FL', website: null, instagram: 'harborautocare', competitors: [{ name: 'Bayside', website: null, instagram: 'bayside' }], notes: null };
const ctx = { audit, outputs: {}, deadline: Date.now() + 250_000, attempt: 1 };
const blockedProfile = 'SCRAPECREATORS_GET_INSTAGRAM_PROFILE failed (200): Instagram blocked access to this public profile.';
/** Apify's profile scraper answers with an array of one profile; its post scraper with an array of posts. */
const apifyProfile = [{ username: 'harborautocare', followersCount: 2200, followsCount: 310, postsCount: 480, biography: 'Brakes & tires', isBusinessAccount: true, externalUrls: [{ url: 'https://harbor-auto.example/book' }] }];
const apifyPosts = [
  { shortCode: 'C1', type: 'Image', likesCount: 40, commentsCount: 3, timestamp: '2026-10-20T15:00:00.000Z', caption: 'Brakes done same day.', displayUrl: 'https://cdn.example/C1.jpg' },
  { shortCode: 'C2', type: 'Video', likesCount: 20, commentsCount: 1, timestamp: '2026-10-18T15:00:00.000Z', caption: 'Shop tour', displayUrl: 'https://cdn.example/C2.jpg', videoViewCount: 900 },
];

// A function returned from beforeEach is a cleanup hook to vitest, so the reset stays inside braces.
beforeEach(() => {
  mocks.executeTool.mockReset();
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

  it('a profile Instagram hides from logged-out readers (the two reads turned away) is read through Apify instead', async () => {
    mocks.executeTool.mockImplementation(async (slug: string, args: Record<string, unknown>) => {
      if (slug.startsWith('SCRAPECREATORS_') && args.handle === 'harborautocare') throw new Error(blockedProfile);
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
    expect(apify.map(([slug, a]) => [slug, (a as { usernames?: string[]; username?: string[] }).usernames ?? (a as { username?: string[] }).username])).toEqual([
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
    expect(out.business?.error).toMatch(/blocked access.*Apify: The paid Actor/);
    expect(out.competitors[0]).toMatchObject({ followers: 500, restricted: false, note: null });
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
  const fbProfile = { name: 'Harbor Auto Care', followers: 1900, likes: 1750, categories: ['Auto Repair Shop'], intro: 'Family-run since the start.', rating: 4.8, ratingCount: 120, adLibrary: { pageId: '100063669491743', adStatus: 'This Page is currently running ads' } };
  const fbPosts = { posts: [{ url: 'https://www.facebook.com/harborauto/posts/1', text: 'New lift installed.', publish_time: 1792512391, reactions_count: 44, comments_count: 5, shares_count: 2, image: { uri: 'https://scontent.example/p1.jpg' } }] };

  it('reads the business\'s Page (gated Pages included) with one page of posts, and each competitor\'s Page without posts', async () => {
    mocks.executeTool.mockImplementation(async (slug: string, args: Record<string, unknown>) => {
      if (slug === 'SCRAPECREATORS_GET_FACEBOOK_PROFILE') return args.url === 'https://www.facebook.com/harborauto' ? fbProfile : { name: 'Bayside Auto', followers: 300 };
      if (slug === 'SCRAPECREATORS_LIST_FACEBOOK_PROFILE_POSTS') return fbPosts;
      return slug === 'SCRAPECREATORS_GET_INSTAGRAM_PROFILE' ? profile(500) : posts;
    });
    const out = await runSocial({ ...ctx, outputs: { site } }, 0);
    expect(out.facebook).toMatchObject({ url: 'https://www.facebook.com/harborauto', page_id: '100063669491743', page_name: 'Harbor Auto Care', exists: true, followers: 1900, likes: 1750, category: 'Auto Repair Shop', rating: 4.8, rating_count: 120, ad_library_status: 'This Page is currently running ads', restricted: false, error: null });
    expect(out.facebook?.posts).toEqual([{ url: 'https://www.facebook.com/harborauto/posts/1', text: 'New lift installed.', posted_at: '2026-10-20T16:06:31.000Z', reactions: 44, comments: 5, shares: 2, image_url: 'https://scontent.example/p1.jpg' }]);
    expect(out.facebook_competitors).toEqual([expect.objectContaining({ name: 'Bayside', url: 'https://www.facebook.com/baysideauto', page_name: 'Bayside Auto', followers: 300, posts: [] })]);
    const fb = mocks.executeTool.mock.calls.filter(([slug]) => slug.startsWith('SCRAPECREATORS_') && slug.includes('FACEBOOK'));
    expect(fb.map(([slug, a]) => [slug, (a as { url: string }).url, (a as { include_gated_profile?: boolean }).include_gated_profile])).toEqual([
      ['SCRAPECREATORS_GET_FACEBOOK_PROFILE', 'https://www.facebook.com/harborauto', true],
      ['SCRAPECREATORS_GET_FACEBOOK_PROFILE', 'https://www.facebook.com/baysideauto', true],
      ['SCRAPECREATORS_LIST_FACEBOOK_PROFILE_POSTS', 'https://www.facebook.com/harborauto', undefined],
    ]);
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
    expect(summarizeFacebook('https://www.facebook.com/x', { gated: true, followers: 10 }, null)).toMatchObject({ restricted: true, followers: 10, exists: true });
    expect(summarizeInstagram('x', null, null)).toMatchObject({ exists: false, read_via: 'scrapecreators', restricted: false, note: null });
  });
});
