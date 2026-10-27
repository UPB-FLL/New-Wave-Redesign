import { getSupabaseAdmin } from '../../supabaseAdmin.js';
import { executeTool, executeToolAs, findKey, isComposioConfigured } from '../composio.js';
import { PermanentStepError, type StepContext } from '../types.js';
import { loadLinkedAccounts } from './linked.js';
import type { SiteScan } from './site.js';
import { numeric } from './serp.js';

/**
 * Social Current: public Instagram profiles (followers, posts, recent activity)
 * for the business and its rivals, and the business's public Facebook Page,
 * from ScrapeCreators through Composio. One profile call and one post-list
 * call per Instagram account; one Page call, and one page of posts for the
 * business, on Facebook.
 *
 * Instagram shows some profiles only to signed-in adults: an account with a
 * minimum age set (alcohol brands, among others) answers a logged-out reader
 * with an error page, and ScrapeCreators reports it as blocked. Such a read
 * falls back to Apify's scrapers (which take the same handle); when they
 * cannot read it either, the snapshot records the block in words a report
 * can print (`note`), and the Facebook Page stands in for the social data.
 *
 * A client whose Instagram is linked (groundswell_client_accounts, the Graph
 * API as the account's own token, which no minimum age gates) is read that
 * way first, in every phase: its own followers, posts and images, with
 * `read_via: 'linked'`. The public read is the fallback. Competitors are
 * always public.
 */

export interface InstagramSnapshot {
  handle: string;
  exists: boolean;
  followers: number | null;
  following: number | null;
  posts: number | null;
  biography: string | null;
  is_business: boolean | null;
  last_post_at: string | null;
  posts_last_30_days: number | null;
  avg_likes_recent: number | null;
  avg_comments_recent: number | null;
  /** Links in the bio (link-in-bio pages, stores, podcasts); missing on audits before 2026-10-22. */
  bio_links?: string[];
  /** The business's recent posts with their images (the ad sets' creative); never kept for a competitor. Missing before phases. */
  media?: InstagramMedia[];
  /** The newest captions, text only (a competitor's posts are read for what they say, never kept as creative); missing before 2026-10-24. */
  recent_captions?: string[];
  /** The hashtags its recent posts use, most used first; missing before 2026-10-24. */
  hashtags?: string[];
  /** Which reader answered; missing on audits before 2026-10-23. `linked` is the business's own account (the Graph API). */
  read_via?: 'scrapecreators' | 'apify' | 'linked';
  /** Instagram turned the logged-out reader away (a profile shown only to signed-in adults, usually). */
  restricted?: boolean;
  /** The block in words a report may print; null when the profile was read. */
  note?: string | null;
  error: string | null;
}

/** The business's (or a rival's) public Facebook Page, from ScrapeCreators. Best-effort: a missing field reads as null. */
export interface FacebookSnapshot {
  url: string;
  page_id: string | null;
  /** The Page's own title. */
  page_name: string | null;
  exists: boolean;
  followers: number | null;
  likes: number | null;
  category: string | null;
  intro: string | null;
  rating: number | null;
  rating_count: number | null;
  /** The Page's Ad Library status, in Facebook's words (for the ads library step). */
  ad_library_status: string | null;
  /** Meta shows this Page only to signed-in adults; the fields above are what it still lists. */
  restricted: boolean;
  /** The newest public posts (one page), with their images for the business only; a competitor's keep their words and figures. */
  posts: FacebookPost[];
  /** What the posts read show: how many, the average reactions and comments, and how many in the 30 days before the read. Missing on audits before 2026-10-27. */
  engagement?: FacebookEngagement | null;
  error: string | null;
}

export interface FacebookEngagement {
  posts_read: number;
  avg_reactions: number | null;
  avg_comments: number | null;
  posts_last_30_days: number | null;
}

/** Averages over the posts that carry each figure; a Page's posts without figures give nulls, never zeros. */
export function facebookEngagement(posts: FacebookPost[], now = Date.now()): FacebookEngagement | null {
  if (!posts.length) return null;
  const avg = (xs: (number | null)[]) => {
    const known = xs.filter((x): x is number => x !== null);
    return known.length ? Math.round((known.reduce((a, b) => a + b, 0) / known.length) * 10) / 10 : null;
  };
  const dated = posts.filter((p) => p.posted_at && Number.isFinite(Date.parse(p.posted_at)));
  return {
    posts_read: posts.length,
    avg_reactions: avg(posts.map((p) => p.reactions)),
    avg_comments: avg(posts.map((p) => p.comments)),
    posts_last_30_days: dated.length ? dated.filter((p) => now - Date.parse(p.posted_at!) <= 30 * 86_400_000).length : null,
  };
}

export interface FacebookPost {
  url: string | null;
  text: string | null;
  posted_at: string | null;
  reactions: number | null;
  comments: number | null;
  shares: number | null;
  video_views: number | null;
  image_url: string | null;
}

export interface InstagramMedia {
  code: string | null;
  /** The post on Instagram. */
  permalink: string | null;
  /** The original image (a video's or carousel's cover); Instagram's links expire within days. */
  image_url: string;
  type: 'image' | 'video' | 'carousel';
  likes: number | null;
  comments: number | null;
  plays: number | null;
  taken_at: string | null;
  caption: string | null;
}

/** The largest image of a post: the original candidate first, then the display copy. */
function imageOf(p: Record<string, unknown>): string | null {
  const first = (p.carousel_media as Record<string, unknown>[] | undefined)?.[0];
  for (const item of [p, ...(first ? [first] : [])]) {
    const candidates = (item.image_versions2 as { candidates?: { url?: unknown }[] } | undefined)?.candidates ?? [];
    const original = candidates.find((c) => typeof c?.url === 'string')?.url;
    const url = original ?? item.display_uri ?? item.display_url ?? item.displayUrl ?? item.thumbnail_src ?? item.thumbnail_url ?? (item.images as unknown[] | undefined)?.[0];
    if (typeof url === 'string' && /^https:\/\//.test(url)) return url;
  }
  return null;
}

/** The posts a page lists, with what the ad sets need: image, type, counts, caption. */
export function mediaFrom(posts: unknown): InstagramMedia[] {
  // ScrapeCreators lists `items` (or `posts` / `edges`); Apify's scraper answers with an array of posts.
  const list = Array.isArray(posts)
    ? posts
    : findKey<unknown[]>(posts, 'items') ?? findKey<unknown[]>(posts, 'posts') ?? findKey<unknown[]>(posts, 'edges') ?? (Array.isArray(findKey(posts, 'data')) ? findKey<unknown[]>(posts, 'data') : null) ?? [];
  const items = list.filter((i) => i && typeof i === 'object').map((i) => ((i as Record<string, unknown>).node ?? i) as Record<string, unknown>);
  const out: InstagramMedia[] = [];
  for (const p of items) {
    const image_url = imageOf(p);
    if (!image_url) continue;
    const kind = n(p.media_type) ?? (p.type === 'Video' ? 2 : p.type === 'Sidecar' ? 8 : p.type === 'Image' ? 1 : null);
    const caption = typeof p.caption === 'string' ? p.caption : typeof (p.caption as { text?: unknown })?.text === 'string' ? (p.caption as { text: string }).text : null;
    const time = postTime(p);
    const code = typeof p.code === 'string' ? p.code : typeof p.shortcode === 'string' ? p.shortcode : typeof p.shortCode === 'string' ? p.shortCode : null;
    out.push({
      code,
      permalink: typeof p.url === 'string' ? p.url : code ? `https://www.instagram.com/p/${code}/` : null,
      image_url,
      type: kind === 2 || p.product_type === 'clips' ? 'video' : kind === 8 || (Array.isArray(p.carousel_media) && p.carousel_media.length) ? 'carousel' : 'image',
      likes: n(p.like_count) ?? n(p.likesCount) ?? n(findKey(p.edge_liked_by ?? p.edge_media_preview_like, 'count')),
      comments: n(p.comment_count) ?? n(p.commentsCount) ?? n(findKey(p.edge_media_to_comment, 'count')),
      plays: n(p.play_count) ?? n(p.ig_play_count) ?? n(p.videoPlayCount) ?? n(p.videoViewCount),
      taken_at: time ? new Date(time).toISOString() : null,
      caption: caption ? caption.slice(0, 400) : null,
    });
  }
  return out.slice(0, 12);
}

const n = numeric;

/** The captions of a post list, newest first, trimmed. */
export const captionsOf = (media: InstagramMedia[] | undefined): string[] => (media ?? []).map((m) => (m.caption ?? '').replace(/\s+/g, ' ').trim().slice(0, 220)).filter(Boolean).slice(0, 8);

/** The hashtags in a set of captions, most used first, lower-case, without the sign. */
export function hashtagsOf(captions: string[], limit = 15): string[] {
  const counts = new Map<string, number>();
  for (const c of captions) for (const m of c.matchAll(/#([\p{L}\p{N}_]{2,40})/gu)) counts.set(m[1].toLowerCase(), (counts.get(m[1].toLowerCase()) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([tag]) => tag);
}

/** Post timestamps arrive as epoch seconds, epoch ms, or ISO strings. */
function postTime(p: Record<string, unknown>): number | null {
  const v = p.taken_at_timestamp ?? p.taken_at ?? p.timestamp ?? p.created_at;
  if (typeof v === 'string' && /^\d{10,13}$/.test(v)) { const t = Number(v); return t > 1e12 ? t : t * 1000; }
  if (typeof v === 'number') return v > 1e12 ? v : v * 1000;
  if (typeof v === 'string') {
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

/** URLs in an Instagram bio: the bio_links list and the external link. */
export function bioLinks(profile: unknown): string[] {
  const list = findKey<unknown[]>(profile, 'bio_links') ?? [];
  const urls = list.map((l) => (typeof l === 'string' ? l : (l as Record<string, unknown>)?.url)).filter((u): u is string => typeof u === 'string');
  const apify = (findKey<unknown[]>(profile, 'externalUrls') ?? []).map((l) => (typeof l === 'string' ? l : (l as Record<string, unknown>)?.url)).filter((u): u is string => typeof u === 'string');
  const external = findKey<unknown>(profile, 'external_url') ?? findKey<unknown>(profile, 'externalUrl');
  return [...new Set([...urls, ...apify, ...(typeof external === 'string' && external ? [external] : [])])];
}

/** Apify's profile scraper answers with an array of one profile; ScrapeCreators with the profile itself. */
const profileOf = (profile: unknown): unknown => (Array.isArray(profile) ? profile.find((p) => p && typeof p === 'object') ?? null : profile);

export function summarizeInstagram(handle: string, profile: unknown, posts: unknown, now = Date.now()): InstagramSnapshot {
  profile = profileOf(profile);
  const followers = n(findKey(findKey(profile, 'edge_followed_by'), 'count')) ?? n(findKey(profile, 'follower_count')) ?? n(findKey(profile, 'followersCount'));
  const following = n(findKey(findKey(profile, 'edge_follow'), 'count')) ?? n(findKey(profile, 'following_count')) ?? n(findKey(profile, 'followsCount'));
  const count = n(findKey(findKey(profile, 'edge_owner_to_timeline_media'), 'count')) ?? n(findKey(profile, 'media_count')) ?? n(findKey(profile, 'postsCount'));
  // ScrapeCreators lists `items`; Apify's post scraper answers with an array, and its profile scraper carries `latestPosts`.
  const list = Array.isArray(posts) ? posts : findKey<unknown[]>(posts, 'items') ?? findKey<unknown[]>(posts, 'posts') ?? findKey<unknown[]>(posts, 'edges') ?? findKey<unknown[]>(posts, 'latestPosts') ?? [];
  const items = list.filter((i) => i && typeof i === 'object').map((i) => ((i as Record<string, unknown>).node ?? i) as Record<string, unknown>);
  const times = items.map(postTime).filter((t): t is number => t !== null).sort((a, b) => b - a);
  const recent = items.slice(0, 12);
  const avg = (vals: (number | null)[]) => {
    const xs = vals.filter((x): x is number => x !== null);
    return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
  };
  return {
    handle,
    exists: followers !== null || count !== null,
    followers,
    following,
    posts: count,
    biography: (findKey<string>(profile, 'biography') ?? null) as string | null,
    is_business: (findKey<boolean>(profile, 'is_business_account') ?? findKey<boolean>(profile, 'isBusinessAccount') ?? null) as boolean | null,
    last_post_at: times[0] ? new Date(times[0]).toISOString() : null,
    posts_last_30_days: times.length ? times.filter((t) => t <= now && now - t <= 30 * 86_400_000).length : null,
    avg_likes_recent: avg(recent.map((p) => n(p.like_count) ?? n(p.likesCount) ?? n(findKey(p.edge_liked_by ?? p.edge_media_preview_like, 'count')))),
    avg_comments_recent: avg(recent.map((p) => n(p.comment_count) ?? n(p.commentsCount) ?? n(findKey(p.edge_media_to_comment, 'count')))),
    bio_links: bioLinks(profile),
    media: mediaFrom(posts),
    read_via: 'scrapecreators',
    restricted: false,
    note: null,
    error: null,
  };
}

/** Instagram turns a scraper away now and then; a blocked read is tried once more after this pause. */
export const BLOCKED_RETRY_MS = 3_000;
const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

/**
 * Why Instagram refused a read, from ScrapeCreators' documented wording
 * ("Profile is age restricted" with HTTP 403, "Profile is restricted" and
 * "Profile is private" with 404) and the wording Composio relays
 * ("Instagram blocked access to this public profile"). `age` and `blocked`
 * are hidden from logged-out readers and worth another reader; `private` is
 * the owner's choice and no reader sees it; `null` is any other failure.
 */
export function refusal(err: unknown): 'age' | 'restricted' | 'private' | 'blocked' | null {
  const text = message(err);
  if (/age[ _-]?restricted/i.test(text)) return 'age';
  if (/is private|private profile|private account/i.test(text)) return 'private';
  if (/is restricted|restricted profile/i.test(text)) return 'restricted';
  if (/blocked|rate limit|too many requests|429|forbidden|403/i.test(text)) return 'blocked';
  return null;
}
const blocked = (err: unknown) => refusal(err) !== null && refusal(err) !== 'private';

/** What a report says about a profile Instagram hides from logged-out readers. */
export const RESTRICTED_NOTE =
  'Instagram shows this profile only to people signed in as adults (a minimum age is set on the account, as alcohol brands often do), so its public figures could not be read. Linking the account reads them directly.';
/** What a report says about a private account. */
export const PRIVATE_NOTE = 'This Instagram account is private, so its figures and posts are not public. Linking the account reads them directly.';

/** Apify's runs are paid and slower than ScrapeCreators; the caps keep one account under a few cents. */
const APIFY_TIMEOUT_MS = 300_000;
/** ScrapeCreators answers in seconds; this is the most one read may wait. */
const SCRAPE_TIMEOUT_MS = 90_000;
/** How long a read may still take: never past the worker's deadline (a call cut off by the function's time limit leaves no error and runs out its lease). */
export const timeBudget = (ctx: Pick<StepContext, 'deadline'>, cap: number) => Math.max(5_000, Math.min(cap, ctx.deadline - Date.now() - 5_000));

type ProfilePair = [unknown, unknown, string | null];

/** Profile and post-list failures are independent; the profile survives an unreadable large posts answer. */
async function readPair(profile: Promise<unknown>, posts: Promise<unknown>): Promise<ProfilePair> {
  const [p, list] = await Promise.allSettled([profile, posts]);
  if (p.status === 'rejected') throw p.reason;
  return [p.value, list.status === 'fulfilled' ? list.value : null, list.status === 'rejected' ? `Posts: ${message(list.reason).slice(0, 300)}` : null];
}
async function read(handle: string, timeoutMs = SCRAPE_TIMEOUT_MS): Promise<ProfilePair> {
  return readPair(
    executeTool('SCRAPECREATORS_GET_INSTAGRAM_PROFILE', { handle, trim: true }, timeoutMs),
    executeTool('SCRAPECREATORS_LIST_INSTAGRAM_USER_POSTS', { handle, trim: true }, timeoutMs)
  );
}
/**
 * The reader for profiles Instagram shows only to signed-in adults: the
 * IntroPix actor on Apify (`intropix/instagram-posts-reels-scraper`), which
 * runs sessions of its own, so no login or cookie of the business's is
 * needed. Checked live on 2026-10-27 on an age-gated brewery profile:
 * followers, posts, likes, comments, reel views, captions and full-size
 * image links, where ScrapeCreators and Apify's stock scraper read nothing.
 * Priced per post (about two tenths of a cent each) plus a few tenths of a
 * cent per run; GATED_CHARGE_CAP_USD caps one read.
 */
export const GATED_ACTOR = 'intropix/instagram-posts-reels-scraper';
export const GATED_POSTS = 12;
export const GATED_CHARGE_CAP_USD = 1;
const GATED_TIMEOUT_MS = 180_000;

/** The actor's items, one per post with the profile on each, as a post list `mediaFrom` and `summarizeInstagram` read. */
export function gatedPosts(answer: unknown): Record<string, unknown>[] {
  const list = Array.isArray(answer) ? answer : findKey<unknown[]>(answer, 'items') ?? (Array.isArray(findKey(answer, 'data')) ? findKey<unknown[]>(answer, 'data') : null) ?? [];
  const out: Record<string, unknown>[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue;
    const it = raw as Record<string, unknown>;
    const media = Array.isArray(it.media) ? (it.media as Record<string, unknown>[]) : [];
    const first = media[0] ?? {};
    const kind = String(it.post_type ?? '').toLowerCase();
    const video = kind === 'reel' || kind === 'video' || first.media_type === 'video';
    const image = video ? (first.cover_url ?? first.media_url) : (first.media_url ?? first.cover_url);
    if (typeof image !== 'string') continue;
    out.push({
      code: it.shortcode,
      url: it.permalink,
      display_url: image,
      media_type: video ? 2 : kind === 'carousel' || media.length > 1 ? 8 : 1,
      like_count: it.like_count,
      comment_count: it.comment_count,
      play_count: it.view_count,
      taken_at: it.taken_at,
      caption: it.caption,
    });
  }
  return out;
}

/** The profile fields the actor repeats on every item. */
export function gatedProfile(answer: unknown): Record<string, unknown> | null {
  const list = Array.isArray(answer) ? answer : findKey<unknown[]>(answer, 'items') ?? (Array.isArray(findKey(answer, 'data')) ? findKey<unknown[]>(answer, 'data') : null) ?? [];
  const it = list.find((x) => x && typeof x === 'object' && typeof (x as Record<string, unknown>).username === 'string') as Record<string, unknown> | undefined;
  if (!it) return null;
  return { username: it.username, follower_count: it.follower_count, following_count: it.following_count, biography: it.biography, full_name: it.full_name, is_private: it.is_private };
}

async function readGated(handle: string, timeoutMs = GATED_TIMEOUT_MS): Promise<ProfilePair> {
  const seconds = Math.max(30, Math.min(300, Math.floor(timeoutMs / 1000) - 5));
  const answer = await executeTool(
    'APIFY_RUN_ACTOR_SYNC_GET_DATASET_ITEMS',
    { actorId: GATED_ACTOR, input: { usernames: [handle], maxPosts: GATED_POSTS, includeViews: true }, maxTotalChargeUsd: GATED_CHARGE_CAP_USD, waitForFinish: seconds, timeout: seconds, limit: GATED_POSTS, format: 'json' },
    timeoutMs
  );
  const profile = gatedProfile(answer);
  if (!profile) throw new Error('The signed-in reader answered with no posts for this profile.');
  return [profile, gatedPosts(answer), null];
}

async function readApify(handle: string, timeoutMs = APIFY_TIMEOUT_MS): Promise<ProfilePair> {
  return readPair(
    executeTool('APIFY_SCRAPE_INSTAGRAM_PROFILES', { usernames: [handle], maxTotalChargeUsd: 0.05 }, timeoutMs),
    executeTool('APIFY_SCRAPE_INSTAGRAM_POSTS', { username: [handle], resultsLimit: 12, dataDetailLevel: 'basicData', maxTotalChargeUsd: 0.25 }, timeoutMs)
  );
}

/** The time left for one read, or the whole step's deadline when the caller set none. */
type Budget = (cap: number) => number;
const unbounded: Budget = (cap) => cap;

async function instagram(handle: string, pauseMs = BLOCKED_RETRY_MS, budget: Budget = unbounded): Promise<InstagramSnapshot> {
  let pair: ProfilePair;
  try {
    try { pair = await read(handle, budget(SCRAPE_TIMEOUT_MS)); }
    catch (err) {
      if (!blocked(err)) throw err;
      await new Promise((r) => setTimeout(r, pauseMs));
      pair = await read(handle, budget(SCRAPE_TIMEOUT_MS));
    }
    const snap = summarizeInstagram(handle, pair[0], pair[1]);
    return { ...snap, error: pair[2] ?? (snap.exists ? null : 'The public Instagram profile returned no recognizable profile figures.') };
  } catch (err) {
    if (refusal(err) === 'private') return { ...summarizeInstagram(handle, null, null), restricted: true, note: PRIVATE_NOTE, error: message(err) };
    const restricted = blocked(err);
    // Provider setup/outages may use the other public reader. A wallet or key refusal needs action, not more paid calls.
    if (/API key|wallet|out of credits|insufficient (?:credit|balance)/i.test(message(err))) return { ...summarizeInstagram(handle, null, null), error: message(err) };
    if (!restricted && !/not connected|no active connection|unavailable|502|503|504/i.test(message(err))) return { ...summarizeInstagram(handle, null, null), error: message(err) };
    const first = message(err);
    // The signed-in reader first (it is what reads an age-gated profile), then Apify's stock scraper.
    let gatedFailure = '';
    try {
      pair = await readGated(handle, budget(GATED_TIMEOUT_MS));
      const snap = summarizeInstagram(handle, pair[0], pair[1]);
      if (snap.exists) return { ...snap, read_via: 'apify', restricted, note: null, error: null };
      gatedFailure = 'The signed-in reader answered with no recognizable profile.';
    } catch (gated) {
      gatedFailure = message(gated).slice(0, 200);
    }
    try {
      pair = await readApify(handle, budget(APIFY_TIMEOUT_MS));
      const snap = summarizeInstagram(handle, pair[0], pair[1]);
      if (snap.exists) return { ...snap, read_via: 'apify', restricted, note: null, error: pair[2] };
      return { ...snap, read_via: 'apify', restricted, note: restricted ? RESTRICTED_NOTE : null, error: `${first} Apify (signed-in reader): ${gatedFailure}; Apify answered with no recognizable profile either.` };
    } catch (fallback) {
      return { ...summarizeInstagram(handle, null, null), restricted, note: restricted ? RESTRICTED_NOTE : null, error: `${first} Apify (signed-in reader): ${gatedFailure}; Apify: ${message(fallback).slice(0, 200)}` };
    }
  }
}

// ---------------------------------------------------------------------------
// The business's own Instagram account (a client with Instagram linked)

/** The fields read from the account's media, through Composio's Instagram toolkit (the Graph API). */
export const LINKED_MEDIA_FIELDS = 'id,shortcode,caption,media_type,media_product_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count,view_count';

/** The account's media (Graph API fields) as the ad sets' creative: `media_url` for a photo, `thumbnail_url` for a video. */
export function mediaFromGraph(items: unknown): InstagramMedia[] {
  // Composio wraps the Graph API's `{ data: [...], paging }` in a `data` of its own: unwrap until the list.
  let list: unknown = items;
  for (let i = 0; i < 4 && list && typeof list === 'object' && !Array.isArray(list); i++) list = (list as Record<string, unknown>).data;
  if (!Array.isArray(list)) return [];
  const out: InstagramMedia[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue;
    const m = raw as Record<string, unknown>;
    const type = String(m.media_type ?? '').toUpperCase();
    const image = type === 'VIDEO' ? m.thumbnail_url ?? m.media_url : m.media_url ?? m.thumbnail_url;
    if (typeof image !== 'string' || !/^https:\/\//.test(image)) continue;
    const time = typeof m.timestamp === 'string' ? Date.parse(m.timestamp) : null;
    const code = typeof m.shortcode === 'string' ? m.shortcode : null;
    out.push({
      code,
      permalink: typeof m.permalink === 'string' ? m.permalink : code ? `https://www.instagram.com/p/${code}/` : null,
      image_url: image,
      type: type === 'VIDEO' ? 'video' : type === 'CAROUSEL_ALBUM' ? 'carousel' : 'image',
      likes: n(m.like_count),
      comments: n(m.comments_count),
      plays: type === 'VIDEO' ? n(m.view_count) : null,
      taken_at: time && Number.isFinite(time) ? new Date(time).toISOString() : null,
      caption: typeof m.caption === 'string' ? m.caption.slice(0, 400) : null,
    });
  }
  return out.slice(0, 12);
}

/** The account's own figures as a snapshot: the Graph API's `followers_count`, `follows_count`, `media_count` and its media list. */
export function summarizeLinkedInstagram(handle: string, info: unknown, media: unknown, now = Date.now()): InstagramSnapshot {
  const items = mediaFromGraph(media);
  const times = items.map((m) => (m.taken_at ? Date.parse(m.taken_at) : NaN)).filter((t) => Number.isFinite(t)).sort((a, b) => b - a);
  const avg = (vals: (number | null)[]) => {
    const xs = vals.filter((x): x is number => x !== null);
    return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
  };
  const followers = n(findKey(info, 'followers_count'));
  const count = n(findKey(info, 'media_count'));
  const username = findKey<string>(info, 'username');
  return {
    handle: typeof username === 'string' && username ? username : handle,
    exists: followers !== null || count !== null,
    followers,
    following: n(findKey(info, 'follows_count')),
    posts: count,
    biography: (findKey<string>(info, 'biography') ?? null) as string | null,
    is_business: true,
    last_post_at: times[0] ? new Date(times[0]).toISOString() : null,
    posts_last_30_days: times.length ? times.filter((t) => t <= now && now - t <= 30 * 86_400_000).length : null,
    avg_likes_recent: avg(items.map((m) => m.likes)),
    avg_comments_recent: avg(items.map((m) => m.comments)),
    bio_links: [],
    media: items,
    read_via: 'linked',
    restricted: false,
    note: null,
    error: null,
  };
}

/**
 * The business's own account when it is a client with Instagram linked and
 * the Composio project can be reached; null otherwise (a prospect, nothing
 * linked, the tables not there yet). A read that fails answers null with the
 * reason, so the public read runs; a database error throws (the step
 * retries), never a silent public read of a client whose account was there.
 */
async function linkedInstagram(ctx: StepContext, handle: string | null): Promise<{ snapshot: InstagramSnapshot | null; note: string | null }> {
  if (!isComposioConfigured()) return { snapshot: null, note: null };
  const accounts = await loadLinkedAccounts(getSupabaseAdmin(), ctx.audit.id);
  const row = accounts.rows.find((r) => r.service === 'instagram');
  if (!row) return { snapshot: null, note: null };
  const timeout = Math.max(10_000, Math.min(60_000, ctx.deadline - Date.now() - 10_000));
  const run = (slug: string, args: Record<string, unknown>) => executeToolAs(slug, args, { id: row.composio_account_id, user_id: row.user_id }, timeout);
  try {
    const info = await run('INSTAGRAM_GET_USER_INFO', { ig_user_id: 'me', fields: 'id,username,name,followers_count,follows_count,media_count' });
    let media: unknown = null;
    try {
      media = await run('INSTAGRAM_GET_IG_USER_MEDIA', { ig_user_id: 'me', limit: 25, fields: LINKED_MEDIA_FIELDS });
    } catch {
      // The profile stands on its own; the public read is not worth more than this.
    }
    const snapshot = summarizeLinkedInstagram(handle ?? '', info, media);
    return snapshot.exists ? { snapshot, note: null } : { snapshot: null, note: 'The linked Instagram account answered without figures.' };
  } catch (err) {
    return { snapshot: null, note: `The linked Instagram account could not be read (${message(err).slice(0, 160)}); the public profile was read instead.` };
  }
}

// ---------------------------------------------------------------------------
// Facebook

const str = (v: unknown, max = 600) => (typeof v === 'string' && v.trim() ? v.replace(/\s+/g, ' ').trim().slice(0, max) : null);
const anyKey = <T,>(value: unknown, keys: string[]): T | undefined => {
  for (const k of keys) {
    const hit = findKey<T>(value, k);
    if (hit !== undefined) return hit;
  }
  return undefined;
};

/** The rows of a LIST_FACEBOOK_PROFILE_POSTS page, whatever they nest under. */
export function facebookPostRows(payload: unknown): Record<string, unknown>[] {
  const list = Array.isArray(payload) ? payload : findKey<unknown[]>(payload, 'posts') ?? findKey<unknown[]>(payload, 'items') ?? findKey<unknown[]>(payload, 'results') ?? [];
  return list.filter((r) => r && typeof r === 'object') as Record<string, unknown>[];
}

export function toFacebookPost(r: Record<string, unknown>): FacebookPost {
  const time = postTime(r) ?? (() => {
    const v = r.publish_time ?? r.publishTime ?? r.date ?? r.time;
    if (typeof v === 'number') return v > 1e12 ? v : v * 1000;
    if (typeof v === 'string' && !Number.isNaN(Date.parse(v))) return Date.parse(v);
    return null;
  })();
  const image = anyKey<unknown>(r, ['image', 'full_picture', 'thumbnail', 'photo_image', 'image_url', 'imageUrl', 'thumbnailUrl']);
  const imageUrl = typeof image === 'string' ? image : typeof (image as Record<string, unknown>)?.uri === 'string' ? ((image as Record<string, unknown>).uri as string) : typeof (image as Record<string, unknown>)?.url === 'string' ? ((image as Record<string, unknown>).url as string) : null;
  return {
    url: str(r.url ?? r.permalink ?? r.permalink_url ?? r.post_url ?? r.link, 300),
    text: str(r.text ?? r.message ?? r.content ?? (r.caption as Record<string, unknown>)?.text ?? r.caption, 600),
    posted_at: time ? new Date(time).toISOString() : null,
    reactions: n(r.reactionCount) ?? n(r.reactions_count) ?? n(r.reaction_count) ?? n(r.likes) ?? n(r.like_count) ?? n(findKey(r.reactions, 'count')) ?? n(findKey(r.reactions, 'total')),
    comments: n(r.commentCount) ?? n(r.comments_count) ?? n(r.comment_count) ?? n(findKey(r.comments, 'count')) ?? n(findKey(r.comments, 'total')),
    shares: n(r.shareCount) ?? n(r.shares_count) ?? n(r.share_count) ?? n(r.reshare_count) ?? n(findKey(r.shares, 'count')),
    video_views: n(r.videoViewCount) ?? n(r.video_view_count),
    image_url: imageUrl && /^https:\/\//.test(imageUrl) ? imageUrl : null,
  };
}

/**
 * A Facebook Page's public figures from a GET_FACEBOOK_PROFILE answer. The
 * documented keys (docs.scrapecreators.com, read 2026-10-22) come first:
 * `id`, `name`, `isPrivate`, `adLibrary.{pageId,adStatus}`, `category`,
 * `pageIntro`, `rating`, `ratingCount`, `likeCount`, `followerCount`; the
 * others are the names earlier answers used, in case they return.
 */
export function summarizeFacebook(url: string, profile: unknown, posts: unknown): FacebookSnapshot {
  const lib = findKey<Record<string, unknown>>(profile, 'adLibrary');
  const followers = n(anyKey(profile, ['followerCount', 'followers', 'follower_count', 'followers_count']));
  const likes = n(anyKey(profile, ['likeCount', 'likes', 'like_count', 'likes_count', 'fan_count']));
  const name = str(anyKey(profile, ['name', 'title', 'page_name', 'pageName']), 120);
  const categories = anyKey<unknown>(profile, ['categories', 'category', 'category_list']);
  const category = Array.isArray(categories)
    ? str(categories.map((c) => (typeof c === 'string' ? c : (c as Record<string, unknown>)?.name)).filter(Boolean).join(', '), 120)
    : str(categories, 120);
  const restricted = Boolean(anyKey<unknown>(profile, ['gated', 'is_gated', 'isGated', 'age_restricted', 'ageRestricted', 'restricted', 'isPrivate']));
  return {
    url,
    // The Ad Library's own id for the Page (the ads step reads by it); the profile's `id` differs from it.
    page_id: lib?.pageId ? String(lib.pageId) : str(anyKey(profile, ['pageId', 'page_id', 'id']), 40),
    page_name: name,
    exists: followers !== null || likes !== null || name !== null,
    followers,
    likes,
    category,
    intro: str(anyKey(profile, ['pageIntro', 'intro', 'about', 'description', 'bio']), 400),
    rating: n(anyKey(profile, ['rating', 'overall_star_rating', 'overallStarRating'])),
    rating_count: n(anyKey(profile, ['ratingCount', 'rating_count', 'review_count', 'reviewCount'])),
    ad_library_status: typeof lib?.adStatus === 'string' ? lib.adStatus : null,
    restricted,
    posts: facebookPostRows(posts).map(toFacebookPost).slice(0, 6),
    engagement: facebookEngagement(facebookPostRows(posts).map(toFacebookPost).slice(0, 6)),
    error: null,
  };
}

const empty = (url: string, error: string | null): FacebookSnapshot => ({ ...summarizeFacebook(url, null, null), error });

/** The page URL from what the site scan lists (`uncommonpathbrewing`, a path, or a full link). */
export function facebookPageUrl(ref: string | null | undefined): string | null {
  if (!ref) return null;
  const clean = ref.trim().replace(/^@/, '');
  if (!clean) return null;
  if (/^https?:\/\//i.test(clean)) {
    try { const u = new URL(clean); return /(^|\.)facebook\.com$/i.test(u.hostname) ? clean : null; } catch { return null; }
  }
  return `https://www.facebook.com/${clean.replace(/^\/+/, '')}`;
}

/** How many competitors' Facebook Pages are read with a page of posts (one ScrapeCreators credit each). */
export const FACEBOOK_RIVAL_POSTS = 3;

/** One Page read (gated Pages answer with what they still show), plus one page of posts when asked. */
async function facebook(url: string, withPosts: boolean, budget: Budget = unbounded): Promise<FacebookSnapshot> {
  let profile: unknown;
  try {
    profile = await executeTool('SCRAPECREATORS_GET_FACEBOOK_PROFILE', { url, include_gated_profile: true, cache_max_age: '7d' }, budget(SCRAPE_TIMEOUT_MS));
  } catch (err) {
    if (err instanceof PermanentStepError && /API key/i.test(err.message)) throw err;
    return empty(url, message(err));
  }
  let posts: unknown = null;
  let error: string | null = null;
  if (withPosts) {
    try {
      posts = await executeTool('SCRAPECREATORS_LIST_FACEBOOK_PROFILE_POSTS', { url }, budget(SCRAPE_TIMEOUT_MS));
    } catch (err) {
      if (err instanceof PermanentStepError && /API key/i.test(err.message)) throw err;
      error = `Posts: ${message(err).slice(0, 200)}`;
    }
  }
  return { ...summarizeFacebook(url, profile, posts), error };
}

export interface SocialOutput {
  source: string;
  fetched_at: string;
  handle_source: 'entered by an admin' | 'linked from the website' | null;
  business: InstagramSnapshot | null;
  competitors: (InstagramSnapshot & { name: string })[];
  /** The business's Facebook Page (from the website's link); null when the site links none. Missing on audits before 2026-10-23. */
  facebook?: FacebookSnapshot | null;
  /** The competitors' Pages, where their sites link one. */
  facebook_competitors?: (FacebookSnapshot & { name: string })[];
  /** Why the business's own linked account was not used, when it was there to use (for staff). */
  linked_note?: string | null;
  /** The hashtags seen on the business's and its competitors' recent posts; missing on audits before 2026-10-24. */
  hashtags_seen?: { business: string[]; competitors: string[] };
}

export async function runSocial(ctx: StepContext, pauseMs = BLOCKED_RETRY_MS): Promise<SocialOutput> {
  const site = ctx.outputs.site as { business: SiteScan | null; competitors: { name: string; site: SiteScan | null }[] } | undefined;
  const own = ctx.audit.instagram || site?.business?.social.instagram[0] || null;
  const rivals = ctx.audit.competitors
    .map((c, i) => ({ name: c.name, handle: c.instagram || site?.competitors[i]?.site?.social.instagram[0] || null }))
    .filter((c): c is { name: string; handle: string } => Boolean(c.handle))
    .slice(0, 6);
  const budget: Budget = (cap) => timeBudget(ctx, cap);
  const linked = await linkedInstagram(ctx, own);
  const read = linked.snapshot ?? (own ? await instagram(own, pauseMs, budget) : null);
  if (read?.error && /API key/i.test(read.error)) throw new Error(read.error);
  const business = read ? { ...read, recent_captions: captionsOf(read.media), hashtags: hashtagsOf(captionsOf(read.media)) } : null;
  // A competitor's posts are never anyone's creative: only the business keeps its media; a rival keeps its captions' words.
  const competitors = await Promise.all(rivals.map(async (c) => {
    const snap = await instagram(c.handle, pauseMs, budget);
    const captions = captionsOf(snap.media);
    return { name: c.name, ...snap, recent_captions: captions, hashtags: hashtagsOf(captions), media: [] };
  }));

  const ownPage = facebookPageUrl(ctx.audit.facebook || site?.business?.social.facebook[0]);
  const rivalPages = ctx.audit.competitors
    .map((c, i) => ({ name: c.name, url: facebookPageUrl(c.facebook || site?.competitors.find((s) => s.name === c.name)?.site?.social.facebook[0] || site?.competitors[i]?.site?.social.facebook[0]) }))
    .filter((c): c is { name: string; url: string } => Boolean(c.url))
    .slice(0, 6);
  const [facebookPage, facebookRivals] = await Promise.all([
    ownPage ? facebook(ownPage, true, budget) : Promise.resolve(null),
    // The first three rivals' posts are read for their engagement; their images are never kept (a competitor's posts are no one's creative).
    Promise.all(rivalPages.map(async (c, i) => {
      const page = await facebook(c.url, i < FACEBOOK_RIVAL_POSTS, budget);
      return { name: c.name, ...page, posts: page.posts.map((p) => ({ ...p, image_url: null })) };
    })),
  ]);

  const viaApify = [business, ...competitors].some((s) => s?.read_via === 'apify');
  const viaLinked = business?.read_via === 'linked';
  return {
    source: `${viaLinked ? 'The business’s own Instagram account (Graph API) and its competitors’ public profiles' : 'Instagram public profiles'}${viaApify ? ' (via Apify where Instagram hides a profile from logged-out readers)' : ''} and public Facebook Pages, via ScrapeCreators through Composio`,
    fetched_at: new Date().toISOString(),
    handle_source: ctx.audit.instagram ? 'entered by an admin' : own ? 'linked from the website' : null,
    business,
    competitors,
    facebook: facebookPage,
    facebook_competitors: facebookRivals,
    linked_note: linked.note,
    hashtags_seen: { business: business?.hashtags ?? [], competitors: hashtagsOf(competitors.flatMap((c) => c.recent_captions ?? [])) },
  };
}
