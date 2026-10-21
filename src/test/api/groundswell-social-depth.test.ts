import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mediaList, toRawItem } from '../../../api/_lib/groundswell/currents/socialDepth';
import { CTA, engagementProfile, type RawMediaItem } from '../../../packages/groundswell/src/benchmark/index';

/**
 * The social_depth rules (packages/groundswell/src/benchmark/engagement.ts)
 * on the anonymised fixtures, read through the step's own mapping
 * (`mediaList`, `toRawItem`). Ported from #114, which first pinned these
 * figures; the step itself (`runSocialDepth`) is covered in
 * groundswell-benchmark.test.ts.
 */

const FIXTURES = join(__dirname, 'fixtures', 'groundswell-benchmark');
// Fixture JSON, read loosely: the expectations come from the file itself.
const load = (name: string) => JSON.parse(readFileSync(join(FIXTURES, name), 'utf8')) as Record<string, Record<string, Record<string, unknown>>>;
const expected = load('expected.json');
/** The fixtures were gathered on 2026-10-21; the rules' windows are measured from then. */
const NOW = Date.parse('2026-10-21T00:00:00Z');

const posts = (payload: unknown) => mediaList(payload).map((r) => toRawItem(r, 'post'));
const reels = (payload: unknown) => mediaList(payload).map((r) => toRawItem(r, 'reel'));

function profileFor(handle: string) {
  const user = (load(`${handle}.profile.json`).data.user as { follower_count: number });
  return engagementProfile(handle, user.follower_count, posts(load(`${handle}.posts.json`)), reels(load(`${handle}.reels.json`)), NOW);
}

const pct = (fraction: number | null) => (fraction === null ? null : Math.round(fraction * 100_000) / 1000);
const r1 = (x: number | null) => (x === null ? null : Math.round(x * 10) / 10);
const r2 = (x: number) => Math.round(x * 100) / 100;

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
    expect(r1(p.comments_mean)).toBe(want.comments_mean);
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
    expect(r2(p.reels_per_week)).toBe(want.reels_per_week);
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
    expect(r1(p.cta_comments_mean)).toBe(want.cta_comments_mean);
    expect(r1(p.non_cta_comments_mean)).toBe(want.non_cta_comments_mean);
  });

  it('matches the expected comments, cadence, slides and reel figures', () => {
    expect(p.items_n).toBe(want.items_n);
    expect(p.comments_median).toBe(want.comments_median);
    expect(r1(p.comments_mean)).toBe(want.comments_mean);
    expect(p.cadence_per_week).toBe(want.cadence_per_week);
    expect(r2(p.reels_per_week)).toBe(want.reels_per_week);
    expect(r1(p.carousel_slides_mean)).toBe(want.carousel_slides_mean);
    expect(p.reel_plays_median).toBe(want.reel_plays_median);
    expect(p.format_mix).toEqual({ carousel: 12, image: 0, reel: 12, video: 0 });
    expect(p.best_item).toMatchObject({ date: expect.stringMatching(/^2026-07-29/), likes: 1395, comments: 28 });
    expect(p.items.filter((i) => i.pinned)).toHaveLength(want.pinned_n as number);
  });
});

describe('social_depth: rules on small inputs', () => {
  const day = (d: string) => Math.floor(Date.parse(`${d}T12:00:00Z`) / 1000);
  const post = (d: string, extra: Record<string, unknown> = {}) => ({ taken_at: day(d), media_type: 8, like_count: 50, comment_count: 4, caption: { text: `Post from ${d}` }, ...extra });
  const profileOf = (items: Record<string, unknown>[], followers = 1_000) => engagementProfile('t', followers, posts({ items }), [], NOW);
  const byDate = <T extends { date: string }>(items: T[]) => [...items].sort((a, b) => b.date.localeCompare(a.date));

  it('keeps the CTA keyword and not the word after it; "comment below" is not a CTA', () => {
    expect(CTA.exec("Comment HEAL and I'll send you the link")?.[1]).toBe('HEAL');
    expect(CTA.exec('comment DEEP DIVE to learn more')?.[1]).toBe('DEEP DIVE');
    expect(CTA.exec('DM us or comment below if you want support')).toBeNull();
  });

  it('marks feed items that sit ahead of newer ones as pinned', () => {
    const p = profileOf([post('2026-06-01'), post('2026-10-20'), post('2026-10-19')]);
    expect(p.items.filter((i) => i.pinned).map((i) => i.date.slice(0, 10))).toEqual(['2026-06-01']);
  });

  it('needs the second hidden-likes pass only once the visible median is above 100', () => {
    const small = byDate(profileOf([post('2026-10-20', { like_count: 3, comment_count: 2 }), post('2026-10-19', { like_count: 40 })]).items);
    expect(small.map((i) => i.likes_hidden)).toEqual([false, false]);
    const big = byDate(
      profileOf([post('2026-10-20', { like_count: 3, comment_count: 2 }), post('2026-10-19', { like_count: 400 }), post('2026-10-18', { like_count: 300 }), post('2026-10-17', { like_count: 3, comment_count: 30 })]).items
    );
    expect(big.map((i) => i.likes_hidden)).toEqual([true, false, false, true]);
    expect(big[0].likes).toBeNull();
  });

  it('strips emoji from the hook and reads plays only for reels', () => {
    const [reel, image] = byDate(
      profileOf([post('2026-10-20', { media_type: 2, product_type: 'clips', play_count: 900, caption: { text: '🦠 Histamine isn’t only about food' } }), post('2026-10-19', { media_type: 1, play_count: 5 })]).items
    );
    expect(reel).toMatchObject({ type: 'reel', plays: 900, hook: 'Histamine isn’t only about food', slides: null });
    expect(image).toMatchObject({ type: 'image', plays: null });
  });

  it('gives an account with no followers no rate, and an empty page an empty profile', () => {
    expect(profileOf([post('2026-10-20')], 0).engagement_rate_median).toBeNull();
    const empty = engagementProfile('ghost', 100, [] as RawMediaItem[], [], NOW);
    // An empty page has no medians at all, rather than a median of 0.
    expect(empty).toMatchObject({ items_n: 0, likes_median: null, comments_median: null, cadence_per_week: 0, reels_per_week: 0, reel_plays_median: null });
  });
});
