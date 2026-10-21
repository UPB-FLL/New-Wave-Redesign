import { executeTool, findKey } from '../composio.js';
import type { StepContext } from '../types.js';
import type { InstagramSnapshot } from './social.js';

/**
 * Social Current, depth: one page of posts and one page of reels per account,
 * reduced to per-item engagement and a per-account profile (engagement rate,
 * cadence, format mix, comment-to-DM CTAs, hidden likes). The rules are the
 * ones in docs/groundswell-competitor-benchmark.md §3.1, and the fixtures in
 * src/test/api/fixtures/groundswell-benchmark pin their results.
 *
 * Costs 2 ScrapeCreators credits per account. Not yet in STEPS: it runs only
 * for benchmark audits, which need the `kind` column from that spec (§2 and §4).
 */

export type ItemType = 'carousel' | 'image' | 'reel' | 'video';

export interface EngagementItem {
  kind: 'post' | 'reel';
  type: ItemType;
  date: string;
  age_days: number;
  likes: number | null;
  likes_hidden: boolean;
  comments: number;
  plays: number | null;
  slides: number | null;
  cta_keyword: string | null;
  paid_partnership: boolean;
  /** Pinned feed items sit at the head of the feed out of date order; they count for engagement, not cadence. */
  pinned: boolean;
  hook: string;
  url: string;
}

export interface EngagementProfile {
  handle: string;
  followers: number;
  items_n: number;
  likes_hidden_n: number;
  likes_median: number | null;
  comments_median: number;
  comments_mean: number;
  engagement_rate_median: number | null;
  engagement_rate_best: number | null;
  best_item: EngagementItem | null;
  cadence_per_week: number;
  reels_per_week: number;
  format_mix: Record<ItemType, number>;
  carousel_slides_mean: number | null;
  reel_plays_median: number | null;
  reel_plays_max: number | null;
  reel_age_days_median: number | null;
  cta_items_n: number;
  cta_comments_mean: number | null;
  non_cta_comments_mean: number | null;
  items: EngagementItem[];
}

/** The verb may be capitalised; the keyword must be, or "and" after it would be captured too. */
export const CTA_PATTERN = /\b[Cc]omment\s+["“]?([A-Z]{3,}(?:\s[A-Z]{3,})?)/;
const DAY_MS = 86_400_000;
const CADENCE_WINDOW_DAYS = 14;

const n = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const round = (x: number, digits = 1) => Math.round(x * 10 ** digits) / 10 ** digits;

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function itemTime(p: Record<string, unknown>): number | null {
  const v = p.taken_at ?? p.taken_at_timestamp ?? p.timestamp ?? p.created_at;
  if (typeof v === 'number') return v > 1e12 ? v : v * 1000;
  if (typeof v === 'string') {
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

function itemType(p: Record<string, unknown>): ItemType {
  const mt = n(p.media_type);
  if (mt === 8) return 'carousel';
  if (mt === 1) return 'image';
  if (mt === 2) return p.product_type === 'clips' ? 'reel' : 'video';
  return typeof p.play_count === 'number' || typeof p.ig_play_count === 'number' ? 'reel' : 'image';
}

const caption = (p: Record<string, unknown>): string => {
  const c = p.caption;
  if (typeof c === 'string') return c;
  if (c && typeof c === 'object' && typeof (c as { text?: unknown }).text === 'string') return (c as { text: string }).text;
  return typeof p.caption_text === 'string' ? p.caption_text : '';
};

/** Letters, digits, punctuation and spaces only: emoji and symbols out. */
export const stripEmoji = (s: string) => s.replace(/[^\p{L}\p{N}\p{P}\p{Zs}]/gu, '').replace(/\s+/g, ' ').trim();

function listItems(list: unknown): Record<string, unknown>[] {
  const raw = findKey<unknown[]>(list, 'items') ?? findKey<unknown[]>(list, 'posts') ?? findKey<unknown[]>(list, 'edges') ?? [];
  return raw.map((i) => ((i as Record<string, unknown>).node ?? i) as Record<string, unknown>);
}

interface RawItem {
  kind: 'post' | 'reel';
  time: number;
  text: string;
  p: Record<string, unknown>;
}

function rawItems(kind: 'post' | 'reel', list: unknown): RawItem[] {
  return listItems(list)
    .map((p) => ({ kind, time: itemTime(p), text: caption(p), p }))
    .filter((r): r is RawItem => r.time !== null);
}

/**
 * Pinned feed items sit before the chronological feed, so a feed item is
 * pinned when something after it is newer. Instagram allows three; more
 * means the API answered with a non-chronological head, which still should
 * not count toward cadence.
 */
function markPinned(feed: RawItem[]): Set<RawItem> {
  const pinned = new Set<RawItem>();
  let newestAfter = -Infinity;
  for (let i = feed.length - 1; i >= 0; i--) {
    if (feed[i].time < newestAfter) pinned.add(feed[i]);
    newestAfter = Math.max(newestAfter, feed[i].time);
  }
  return pinned;
}

const dedupeKey = (r: RawItem) => `${new Date(r.time).toISOString().slice(0, 10)}|${r.text.slice(0, 60)}`;
const plays = (p: Record<string, unknown>) => n(p.play_count) ?? n(p.ig_play_count);

/** Reduces one page of posts and one of reels to unique items, feed order first. */
export function engagementItems(posts: unknown, reels: unknown, now = Date.now()): EngagementItem[] {
  const feed = rawItems('post', posts);
  const pinned = markPinned(feed);
  const byKey = new Map<string, RawItem>();
  const pinnedKeys = new Set(feed.filter((r) => pinned.has(r)).map(dedupeKey));
  for (const r of [...feed, ...rawItems('reel', reels)]) {
    const key = dedupeKey(r);
    const prev = byKey.get(key);
    if (!prev || (plays(r.p) !== null && plays(prev.p) === null)) byKey.set(key, r);
  }
  return [...byKey.entries()].map(([key, r]) => {
    const p = r.p;
    const type = itemType(p);
    const likes = n(p.like_count) ?? n(findKey(p.edge_liked_by ?? p.edge_media_preview_like, 'count')) ?? 0;
    const text = r.text;
    const cta = CTA_PATTERN.exec(text);
    return {
      kind: r.kind,
      type,
      date: new Date(r.time).toISOString(),
      age_days: Math.max(0, Math.floor((now - r.time) / DAY_MS)),
      likes,
      likes_hidden: false,
      comments: n(p.comment_count) ?? n(findKey(p.edge_media_to_comment, 'count')) ?? 0,
      plays: type === 'reel' || type === 'video' ? plays(p) : null,
      slides: type === 'carousel' ? n(p.carousel_media_count) : null,
      cta_keyword: cta ? cta[1] : null,
      paid_partnership: p.is_paid_partnership === true,
      pinned: pinnedKeys.has(key),
      hook: stripEmoji(text).slice(0, 90),
      url: typeof p.url === 'string' ? p.url : typeof p.code === 'string' ? `https://www.instagram.com/${type === 'reel' ? 'reel' : 'p'}/${p.code}/` : '',
    };
  });
}

/**
 * Hidden like counts arrive as a placeholder (seen as 3). Two passes: a
 * placeholder with real comments is hidden; then, once the visible median is
 * above 100, every remaining 3 is hidden too. Either pass alone is wrong.
 */
export function markHiddenLikes(items: EngagementItem[]): EngagementItem[] {
  const first = items.map((i) => ({ ...i, likes_hidden: (i.likes ?? 0) <= 5 && i.comments >= 8 }));
  const visibleMedian = median(first.filter((i) => !i.likes_hidden && (i.likes ?? 0) > 5).map((i) => i.likes as number));
  return first.map((i) => {
    const hidden = i.likes_hidden || (i.likes === 3 && visibleMedian !== null && visibleMedian > 100);
    return { ...i, likes_hidden: hidden, likes: hidden ? null : i.likes };
  });
}

export function engagementProfile(handle: string, followers: number, posts: unknown, reels: unknown, now = Date.now()): EngagementProfile {
  const items = markHiddenLikes(engagementItems(posts, reels, now));
  const visible = items.filter((i) => !i.likes_hidden);
  const rate = (i: EngagementItem) => ((i.likes ?? 0) + i.comments) / followers;
  const rates = followers > 0 ? visible.map(rate) : [];
  const best = followers > 0 ? visible.reduce<EngagementItem | null>((b, i) => (!b || rate(i) > rate(b) ? i : b), null) : null;
  const recent = items.filter((i) => !i.pinned && i.age_days < CADENCE_WINDOW_DAYS);
  const reelItems = items.filter((i) => i.type === 'reel');
  // One page of reels covers from its oldest item to today; a page younger than a week is read as a week.
  const reelSpanDays = reelItems.length ? Math.max(7, Math.max(...reelItems.map((i) => i.age_days)) + 1) : 0;
  const cta = items.filter((i) => i.cta_keyword);
  const nonCta = items.filter((i) => !i.cta_keyword);
  const slides = items.map((i) => i.slides).filter((s): s is number => s !== null);
  const reelPlays = reelItems.map((i) => i.plays).filter((p): p is number => p !== null);
  const mix: Record<ItemType, number> = { carousel: 0, image: 0, reel: 0, video: 0 };
  for (const i of items) mix[i.type]++;
  const r1 = (x: number | null) => (x === null ? null : round(x));
  return {
    handle,
    followers,
    items_n: items.length,
    likes_hidden_n: items.length - visible.length,
    likes_median: median(visible.map((i) => i.likes as number)),
    comments_median: median(items.map((i) => i.comments)) ?? 0,
    comments_mean: r1(mean(items.map((i) => i.comments))) ?? 0,
    engagement_rate_median: median(rates),
    engagement_rate_best: rates.length ? Math.max(...rates) : null,
    best_item: best,
    cadence_per_week: round(recent.length / (CADENCE_WINDOW_DAYS / 7)),
    reels_per_week: reelItems.length ? round((reelItems.length / reelSpanDays) * 7, 2) : 0,
    format_mix: mix,
    carousel_slides_mean: r1(mean(slides)),
    reel_plays_median: median(reelPlays),
    reel_plays_max: reelPlays.length ? Math.max(...reelPlays) : null,
    reel_age_days_median: median(reelItems.map((i) => i.age_days)),
    cta_items_n: cta.length,
    cta_comments_mean: r1(mean(cta.map((i) => i.comments))),
    non_cta_comments_mean: r1(mean(nonCta.map((i) => i.comments))),
    items,
  };
}

async function fetchProfile(handle: string, followers: number, userId: string | null): Promise<EngagementProfile> {
  const [posts, reels] = await Promise.all([
    executeTool('SCRAPECREATORS_LIST_INSTAGRAM_USER_POSTS', { handle, trim: true }),
    executeTool('SCRAPECREATORS_LIST_INSTAGRAM_USER_REELS', userId ? { user_id: userId, trim: true } : { handle, trim: true }),
  ]);
  return engagementProfile(handle, followers, posts, reels);
}

type SocialOut = { business: InstagramSnapshot | null; competitors: (InstagramSnapshot & { name: string })[] };

/**
 * Runs after `social`, which supplies each account's handle and follower
 * count. An account `social` could not find is left out rather than paid for.
 * A Composio connection problem (PermanentStepError from executeTool) stops
 * the step; a scrape failure for one competitor is recorded on that account.
 */
export async function runSocialDepth(ctx: StepContext) {
  const social = ctx.outputs.social as SocialOut | undefined;
  const account = (s: InstagramSnapshot | null) => (s && s.exists && s.followers ? { handle: s.handle, followers: s.followers, userId: (findKey<string>(s, 'id') as string | undefined) ?? null } : null);
  const own = account(social?.business ?? null);
  const business = own ? await fetchProfile(own.handle, own.followers, own.userId) : null;
  const rivals = (social?.competitors ?? []).map((c) => ({ name: c.name, acc: account(c) })).filter((c) => c.acc).slice(0, 6);
  const competitors = await Promise.all(
    rivals.map(async ({ name, acc }) => {
      try {
        return { name, ...(await fetchProfile(acc!.handle, acc!.followers, acc!.userId)), error: null as string | null };
      } catch (err) {
        if ((err as { permanent?: boolean }).permanent) throw err;
        return { name, handle: acc!.handle, error: err instanceof Error ? err.message : String(err) };
      }
    })
  );
  return {
    source: 'Instagram posts and reels, one page each, via ScrapeCreators through Composio',
    fetched_at: new Date().toISOString(),
    business,
    competitors,
  };
}
