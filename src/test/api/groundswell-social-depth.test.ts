import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  CTA_PATTERN,
  engagementItems,
  engagementProfile,
  markHiddenLikes,
  runSocialDepth,
} from '../../../api/_lib/groundswell/currents/socialDepth';
import { PermanentStepError, type StepContext } from '../../../api/_lib/groundswell/types';

const FIXTURES = join(__dirname, 'fixtures', 'groundswell-benchmark');
const load = (name: string) => JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));
const expected = load('expected.json');
/** The fixtures were gathered on 2026-10-21; the rules' windows are measured from then. */
const NOW = Date.parse('2026-10-21T00:00:00Z');

function profileFor(handle: string) {
  const profile = load(`${handle}.profile.json`).data.user;
  return engagementProfile(handle, profile.follower_count, load(`${handle}.posts.json`), load(`${handle}.reels.json`), NOW);
}

const pct = (fraction: number | null) => (fraction === null ? null : Math.round(fraction * 100_000) / 1000);

describe('social_depth: the fixture business (harborlightnutrition)', () => {
  const p = profileFor('harborlightnutrition');
  const want = expected.accounts.harborlightnutrition;

  it('dedupes the reels page against the feed and keeps the copy with plays', () => {
    expect(p.items_n).toBe(want.items_n);
    const lymph = p.items.find((i) => i.hook.startsWith('Your lymphatic system'));
    expect(lymph).toMatchObject({ kind: 'reel', type: 'reel', plays: 10296, likes: 63, comments: 8 });
    expect(p.items.filter((i) => i.hook.startsWith('Your lymphatic system'))).toHaveLength(1);
  });

  it('matches the expected medians, rates and CTA count', () => {
    expect(p.followers).toBe(want.followers);
    expect(p.likes_hidden_n).toBe(want.likes_hidden_n);
    expect(p.likes_median).toBe(want.likes_median);
    expect(p.comments_median).toBe(want.comments_median);
    expect(p.comments_mean).toBe(want.comments_mean);
    expect(pct(p.engagement_rate_median)).toBe(want.engagement_rate_median_pct);
    expect(p.cta_items_n).toBe(0);
    expect(p.cta_comments_mean).toBeNull();
    expect(p.reel_plays_median).toBe(want.reel_plays_median);
    expect(p.reel_plays_max).toBe(want.reel_plays_max);
  });

  it('flags the three pinned intro posts and leaves them out of cadence', () => {
    const pinned = p.items.filter((i) => i.pinned);
    expect(pinned.map((i) => i.date.slice(0, 10))).toEqual(['2026-09-21', '2026-09-10', '2026-06-11']);
    expect(p.cadence_per_week).toBe(want.cadence_per_week);
    expect(p.reels_per_week).toBe(want.reels_per_week);
  });

  it('picks the best post and the format mix', () => {
    expect(p.best_item).toMatchObject({ date: expect.stringMatching(/^2026-10-09/), likes: 132, comments: 35, plays: 13386 });
    expect(p.format_mix).toEqual({ carousel: 8, image: 0, reel: 12, video: 0 });
    expect(p.carousel_slides_mean).toBeNull();
    expect(p.reel_age_days_median).toBe(want.reel_age_days_median);
  });
});

describe('social_depth: the fixture competitor (fernandfield)', () => {
  const p = profileFor('fernandfield');
  const want = expected.accounts.fernandfield;

  it('hides placeholder like counts with both passes of the rule', () => {
    expect(p.likes_hidden_n).toBe(want.likes_hidden_n);
    expect(p.items.filter((i) => i.likes_hidden).every((i) => i.likes === null)).toBe(true);
    expect(p.likes_median).toBe(want.likes_median);
    expect(pct(p.engagement_rate_median)).toBe(want.engagement_rate_median_pct);
  });

  it('reads comment-to-DM CTAs with a case-sensitive keyword', () => {
    expect(p.items.filter((i) => i.cta_keyword).map((i) => i.cta_keyword).sort()).toEqual(['DEEP DIVE', 'DETAILS', 'GUIDE', 'HEAL', 'LABS']);
    expect(p.cta_items_n).toBe(want.cta_items_n);
    expect(p.cta_comments_mean).toBe(want.cta_comments_mean);
    expect(p.non_cta_comments_mean).toBe(want.non_cta_comments_mean);
  });

  it('matches the expected comments, cadence, slides and reel figures', () => {
    expect(p.items_n).toBe(want.items_n);
    expect(p.comments_median).toBe(want.comments_median);
    expect(p.comments_mean).toBe(want.comments_mean);
    expect(p.cadence_per_week).toBe(want.cadence_per_week);
    expect(p.reels_per_week).toBe(want.reels_per_week);
    expect(p.carousel_slides_mean).toBe(want.carousel_slides_mean);
    expect(p.reel_plays_median).toBe(want.reel_plays_median);
    expect(p.format_mix).toEqual({ carousel: 12, image: 0, reel: 12, video: 0 });
    expect(p.best_item).toMatchObject({ date: expect.stringMatching(/^2026-07-29/), likes: 1395, comments: 28 });
    expect(p.items.filter((i) => i.pinned)).toHaveLength(want.pinned_n);
  });
});

describe('social_depth: rules on small inputs', () => {
  const day = (d: string) => Math.floor(Date.parse(`${d}T12:00:00Z`) / 1000);
  const post = (d: string, extra: Record<string, unknown> = {}) => ({ taken_at: day(d), media_type: 8, like_count: 50, comment_count: 4, caption: { text: `Post from ${d}` }, ...extra });

  it('keeps the CTA keyword and not the word after it; "comment below" is not a CTA', () => {
    expect(CTA_PATTERN.exec("Comment HEAL and I'll send you the link")?.[1]).toBe('HEAL');
    expect(CTA_PATTERN.exec('comment DEEP DIVE to learn more')?.[1]).toBe('DEEP DIVE');
    expect(CTA_PATTERN.exec('DM us or comment below if you want support')).toBeNull();
  });

  it('marks feed items that sit ahead of newer ones as pinned', () => {
    const items = engagementItems({ items: [post('2026-06-01'), post('2026-10-20'), post('2026-10-19')] }, { items: [] }, NOW);
    expect(items.map((i) => i.pinned)).toEqual([true, false, false]);
  });

  it('needs the second hidden-likes pass only once the visible median is above 100', () => {
    const small = markHiddenLikes(engagementItems({ items: [post('2026-10-20', { like_count: 3, comment_count: 2 }), post('2026-10-19', { like_count: 40 })] }, { items: [] }, NOW));
    expect(small.map((i) => i.likes_hidden)).toEqual([false, false]);
    const big = markHiddenLikes(
      engagementItems({ items: [post('2026-10-20', { like_count: 3, comment_count: 2 }), post('2026-10-19', { like_count: 400 }), post('2026-10-18', { like_count: 300 }), post('2026-10-17', { like_count: 3, comment_count: 30 })] }, { items: [] }, NOW)
    );
    expect(big.map((i) => i.likes_hidden)).toEqual([true, false, false, true]);
    expect(big[0].likes).toBeNull();
  });

  it('strips emoji from the hook and reads plays only for reels', () => {
    const [reel, image] = engagementItems(
      { items: [post('2026-10-20', { media_type: 2, product_type: 'clips', play_count: 900, caption: { text: '🦠 Histamine isn’t only about food' } }), post('2026-10-19', { media_type: 1, play_count: 5 })] },
      { items: [] },
      NOW
    );
    expect(reel).toMatchObject({ type: 'reel', plays: 900, hook: 'Histamine isn’t only about food', slides: null });
    expect(image).toMatchObject({ type: 'image', plays: null });
  });

  it('gives an account with no followers no rate, and an empty page an empty profile', () => {
    const p = engagementProfile('ghost', 0, { items: [post('2026-10-20')] }, null, NOW);
    expect(p.engagement_rate_median).toBeNull();
    expect(p.best_item).toBeNull();
    const empty = engagementProfile('ghost', 100, null, null, NOW);
    expect(empty).toMatchObject({ items_n: 0, likes_median: null, comments_median: 0, cadence_per_week: 0, reels_per_week: 0, reel_plays_median: null });
  });
});

describe('social_depth: runSocialDepth', () => {
  const ctx = (social: unknown): StepContext => ({
    audit: { id: 'a1', business_name: 'Harborlight', city: null, website: null, instagram: null, competitors: [], notes: null },
    outputs: { social },
    deadline: Date.now() + 60_000,
    attempt: 1,
  });

  it('fetches posts and reels for every account social found, by handle', async () => {
    const executeTool = vi.fn(async (slug: string, args: Record<string, unknown>) =>
      slug.endsWith('POSTS') ? load(`${args.handle}.posts.json`) : load(`${args.handle}.reels.json`)
    );
    vi.doMock('../../../api/_lib/groundswell/composio', () => ({ executeTool, findKey: (v: unknown, k: string) => (v && typeof v === 'object' ? (v as Record<string, unknown>)[k] : undefined) }));
    vi.resetModules();
    const mod = await import('../../../api/_lib/groundswell/currents/socialDepth');
    const out = await mod.runSocialDepth(
      ctx({
        business: { handle: 'harborlightnutrition', exists: true, followers: 83199 },
        competitors: [
          { name: 'Fern & Field', handle: 'fernandfield', exists: true, followers: 82306 },
          { name: 'Ghost', handle: 'ghost', exists: false, followers: null },
        ],
      })
    );
    expect(executeTool).toHaveBeenCalledTimes(4);
    expect(executeTool).toHaveBeenCalledWith('SCRAPECREATORS_LIST_INSTAGRAM_USER_REELS', { handle: 'fernandfield', trim: true });
    expect(out.business?.items_n).toBe(20);
    expect(out.competitors).toHaveLength(1);
    expect(out.competitors[0]).toMatchObject({ name: 'Fern & Field', cta_items_n: 5 });
    vi.doUnmock('../../../api/_lib/groundswell/composio');
  });

  it('returns nothing to fetch when social found no accounts', async () => {
    const out = await runSocialDepth(ctx({ business: null, competitors: [] }));
    expect(out.business).toBeNull();
    expect(out.competitors).toEqual([]);
  });

  it('stops on a Composio connection problem instead of recording it on the account', async () => {
    vi.doMock('../../../api/_lib/groundswell/composio', () => ({
      executeTool: async () => {
        throw new PermanentStepError('Composio has no active connection for scrapecreators');
      },
      findKey: () => undefined,
    }));
    vi.resetModules();
    const mod = await import('../../../api/_lib/groundswell/currents/socialDepth');
    await expect(mod.runSocialDepth(ctx({ business: null, competitors: [{ name: 'Fern & Field', handle: 'fernandfield', exists: true, followers: 1 }] }))).rejects.toThrow(/no active connection/);
    vi.doUnmock('../../../api/_lib/groundswell/composio');
  });
});
