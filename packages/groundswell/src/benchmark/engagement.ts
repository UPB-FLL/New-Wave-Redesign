/**
 * How an Instagram account earns its interaction, per post, not per follower.
 *
 * Input is one page of posts and one page of reels, in Instagram's own fields
 * (whoever fetches them maps their scraper's shape to `RawMediaItem`). The
 * rules:
 * - type: media_type 8 is a carousel, 1 an image, 2 a reel when Instagram
 *   marks it a clip (or it came from the reels list), else a video;
 * - dedupe: the reels page repeats posts; items match on time and the first
 *   60 characters of the caption, and the copy with plays is kept;
 * - pinned: Instagram lists up to three pinned posts first, out of date
 *   order, and every other post newest first; so each of the leading posts
 *   that is more than a day older than a post listed after it is pinned, and
 *   left out of cadence (the spec's "30 days older than the next post" missed
 *   pinned posts listed newest first);
 * - hidden likes: an account that hides likes reads as a small placeholder
 *   (seen as 3). Likes of 5 or fewer with 8 or more comments are hidden, and so
 *   is a 3 when the account's visible median is above 100. Hidden items are
 *   left out of like and engagement-rate medians;
 * - reels per week: reels in the last 28 days ÷ 4, unless the reels page
 *   stops short (more reels exist) inside 28 days, in which case the count is
 *   divided by the weeks that page covers (in whole days), at least one;
 * - comment-to-DM prompts: "comment GUIDE" style calls, keyword in capitals.
 */

export interface RawMediaItem {
  /** Which list the item came from. */
  list: 'post' | 'reel';
  media_type: number | null;
  product_type: string | null;
  /** ISO string, or epoch seconds or milliseconds. */
  taken_at: string | number | null;
  like_count: number | null;
  comment_count: number | null;
  play_count: number | null;
  carousel_media_count: number | null;
  caption: string | null;
  url: string | null;
  paid_partnership: boolean | null;
}

export type MediaType = 'carousel' | 'image' | 'reel' | 'video';

export interface EngagementItem {
  kind: 'post' | 'reel';
  type: MediaType;
  date: string;
  age_days: number;
  likes: number | null;
  likes_hidden: boolean;
  comments: number;
  plays: number | null;
  slides: number | null;
  cta_keyword: string | null;
  paid_partnership: boolean;
  pinned: boolean;
  /** The caption's first 90 characters, emoji stripped. */
  hook: string;
  url: string;
}

export interface EngagementProfile {
  handle: string;
  followers: number | null;
  items_n: number;
  likes_hidden_n: number;
  likes_median: number | null;
  comments_median: number | null;
  comments_mean: number | null;
  /** Median of (likes + comments) ÷ followers over items with visible likes, as a fraction. */
  engagement_rate_median: number | null;
  engagement_rate_best: number | null;
  best_item: EngagementItem | null;
  /** Unpinned items in the last 14 days, per week. */
  cadence_per_week: number;
  /** Reels in the last 28 days, per week, or over the days a page that stops short covers. */
  reels_per_week: number;
  format_mix: Record<MediaType, number>;
  carousel_slides_mean: number | null;
  reel_plays_median: number | null;
  reel_plays_max: number | null;
  /** Reel plays are cumulative, so their age says how comparable they are. */
  reel_age_days_median: number | null;
  cta_items_n: number;
  cta_comments_mean: number | null;
  non_cta_comments_mean: number | null;
  items: EngagementItem[];
}

const DAY = 86_400_000;
/** Instagram's limit on pinned posts. */
const PINNED_MAX = 3;
const PINNED_MARGIN_DAYS = 1;
const REELS_WINDOW_DAYS = 28;
const HOOK_CHARS = 90;
const DEDUPE_CHARS = 60;

/** "comment GUIDE", "Comment “DEEP DIVE”": the word comment in any case, the keyword in capitals. */
export const CTA = /\b[Cc][Oo][Mm][Mm][Ee][Nn][Tt]\s+["“'‘]?([A-Z]{3,}(?:\s[A-Z]{3,})?)\b/;

export function median(xs: number[]): number | null {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function timeOf(v: string | number | null): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v > 1e12 ? v : v * 1000;
  if (typeof v === 'string') {
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

export function mediaType(item: Pick<RawMediaItem, 'media_type' | 'product_type' | 'list'>): MediaType {
  if (item.media_type === 8) return 'carousel';
  if (item.media_type === 1) return 'image';
  if (item.media_type === 2 && (item.product_type === 'clips' || item.list === 'reel')) return 'reel';
  return item.list === 'reel' ? 'reel' : 'video';
}

/** The caption's opening, without emoji, for the appendix. */
export function hookOf(caption: string | null): string {
  return (caption ?? '')
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, HOOK_CHARS);
}

export function ctaKeyword(caption: string | null): string | null {
  const m = (caption ?? '').match(CTA);
  return m ? m[1] : null;
}

interface Timed extends RawMediaItem {
  t: number;
  pinned: boolean;
}

/** Marks pinned posts: in feed order, each of the first three, while each is more than a day older than a post after it. */
function markPinned(posts: Timed[]): Timed[] {
  let leading = true;
  return posts.map((p, i) => {
    const newestAfter = Math.max(-Infinity, ...posts.slice(i + 1).map((q) => q.t));
    leading = leading && i < PINNED_MAX && newestAfter - p.t > PINNED_MARGIN_DAYS * DAY;
    return { ...p, pinned: leading };
  });
}

/** Weeks the reels page covers: four, or fewer when the page stops short inside 28 days. */
function reelWeeks(reels: Timed[], reelsHaveMore: boolean, now: number): number {
  if (!reelsHaveMore || !reels.length) return REELS_WINDOW_DAYS / 7;
  const days = Math.ceil((now - Math.min(...reels.map((r) => r.t))) / DAY);
  return Math.max(1, Math.min(REELS_WINDOW_DAYS, days) / 7);
}

/** One item per post or reel: the copy with plays wins when both lists carry it. */
function dedupe(items: Timed[]): Timed[] {
  const byKey = new Map<string, Timed>();
  for (const it of items) {
    const key = `${new Date(it.t).toISOString()}|${(it.caption ?? '').slice(0, DEDUPE_CHARS)}`;
    const seen = byKey.get(key);
    if (!seen) byKey.set(key, it);
    else if (seen.play_count === null && it.play_count !== null) byKey.set(key, { ...it, pinned: seen.pinned || it.pinned });
  }
  return [...byKey.values()];
}

function isHiddenFirstPass(likes: number | null, comments: number): boolean {
  return likes !== null && likes <= 5 && comments >= 8;
}

export function engagementProfile(
  handle: string,
  followers: number | null,
  posts: RawMediaItem[],
  reels: RawMediaItem[],
  now = Date.now(),
  /** The reels list said more reels exist beyond this page. */
  reelsHaveMore = false
): EngagementProfile {
  const timed = (xs: RawMediaItem[]) =>
    xs.map((x) => ({ ...x, t: timeOf(x.taken_at), pinned: false })).filter((x): x is Timed => x.t !== null);
  const reelPage = timed(reels);
  const unique = dedupe([...markPinned(timed(posts)), ...reelPage]).sort((a, b) => b.t - a.t);

  // Hidden likes, in two passes: the obvious placeholders first, then a 3 among visible likes in the hundreds.
  const firstPassVisible = unique
    .filter((i) => i.like_count !== null && !isHiddenFirstPass(i.like_count, i.comment_count ?? 0))
    .map((i) => i.like_count as number);
  const visibleMedian = median(firstPassVisible);
  const hidden = (i: Timed) =>
    i.like_count === null || isHiddenFirstPass(i.like_count, i.comment_count ?? 0) || (i.like_count === 3 && (visibleMedian ?? 0) > 100);

  const items: EngagementItem[] = unique.map((i) => {
    const likesHidden = hidden(i);
    const type = mediaType(i);
    return {
      kind: i.list,
      type,
      date: new Date(i.t).toISOString(),
      age_days: Math.max(0, Math.floor((now - i.t) / DAY)),
      likes: likesHidden ? null : i.like_count,
      likes_hidden: likesHidden,
      comments: i.comment_count ?? 0,
      plays: i.play_count,
      slides: type === 'carousel' ? i.carousel_media_count : null,
      cta_keyword: ctaKeyword(i.caption),
      paid_partnership: Boolean(i.paid_partnership),
      pinned: i.pinned,
      hook: hookOf(i.caption),
      url: i.url ?? '',
    };
  });

  const visible = items.filter((i) => !i.likes_hidden && i.likes !== null);
  const rate = (i: EngagementItem) => (followers ? ((i.likes ?? 0) + i.comments) / followers : null);
  const rates = visible.map(rate).filter((r): r is number => r !== null);
  const best = [...visible].sort((a, b) => (b.likes ?? 0) + b.comments - ((a.likes ?? 0) + a.comments))[0] ?? null;
  const within = (days: number) => items.filter((i) => now - Date.parse(i.date) <= days * DAY);
  const withPlays = items.filter((i) => i.type === 'reel' && i.plays !== null);
  const cta = items.filter((i) => i.cta_keyword);
  const nonCta = items.filter((i) => !i.cta_keyword);
  const mix: Record<MediaType, number> = { carousel: 0, image: 0, reel: 0, video: 0 };
  for (const i of items) mix[i.type]++;
  const slides = items.map((i) => i.slides).filter((s): s is number => s !== null);

  return {
    handle,
    followers,
    items_n: items.length,
    likes_hidden_n: items.length - visible.length,
    likes_median: median(visible.map((i) => i.likes as number)),
    comments_median: median(items.map((i) => i.comments)),
    comments_mean: mean(items.map((i) => i.comments)),
    engagement_rate_median: median(rates),
    engagement_rate_best: rates.length ? Math.max(...rates) : null,
    best_item: best,
    cadence_per_week: within(14).filter((i) => !i.pinned).length / 2,
    reels_per_week: within(REELS_WINDOW_DAYS).filter((i) => i.type === 'reel').length / reelWeeks(reelPage, reelsHaveMore, now),
    format_mix: mix,
    carousel_slides_mean: mean(slides),
    reel_plays_median: median(withPlays.map((r) => r.plays as number)),
    reel_plays_max: withPlays.length ? Math.max(...withPlays.map((r) => r.plays as number)) : null,
    reel_age_days_median: median(withPlays.map((r) => r.age_days)),
    cta_items_n: cta.length,
    cta_comments_mean: mean(cta.map((i) => i.comments)),
    non_cta_comments_mean: mean(nonCta.map((i) => i.comments)),
    items,
  };
}
