import { engagementProfile, type EngagementProfile, type RawMediaItem } from '../../../../packages/groundswell/src/benchmark/index.js';
import { benchAccounts } from '../benchmarkAccounts.js';
import { executeTool, findKey } from '../composio.js';
import { GATED_POSTS, gatedRefusal, readGatedItems } from './social.js';
import { PermanentStepError, type StepContext } from '../types.js';

/**
 * Social Current, in depth (benchmarks only): one page of posts and one page
 * of reels per account from ScrapeCreators through Composio (2 credits an
 * account; no second pages), read by the package's engagement rules.
 */

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : null);

/** The items in a ScrapeCreators list response, whatever it nests them under. */
export function mediaList(payload: unknown): Record<string, unknown>[] {
  const list = findKey<unknown[]>(payload, 'items') ?? findKey<unknown[]>(payload, 'posts') ?? findKey<unknown[]>(payload, 'reels') ?? findKey<unknown[]>(payload, 'edges') ?? [];
  return list
    .map((i) => {
      const r = (i ?? {}) as Record<string, unknown>;
      return ((r.media as Record<string, unknown>) ?? (r.node as Record<string, unknown>) ?? r) as Record<string, unknown>;
    })
    .filter((r) => r && typeof r === 'object');
}

/** One ScrapeCreators item in Instagram's own fields. */
export function toRawItem(r: Record<string, unknown>, list: 'post' | 'reel'): RawMediaItem {
  const caption = typeof r.caption === 'string' ? r.caption : typeof (r.caption as Record<string, unknown>)?.text === 'string' ? ((r.caption as Record<string, unknown>).text as string) : null;
  const code = typeof r.code === 'string' ? r.code : typeof r.shortcode === 'string' ? r.shortcode : null;
  return {
    list,
    media_type: num(r.media_type),
    product_type: typeof r.product_type === 'string' ? r.product_type : null,
    taken_at: (r.taken_at ?? r.taken_at_timestamp ?? r.timestamp ?? null) as string | number | null,
    like_count: num(r.like_count) ?? num(findKey(r.edge_liked_by, 'count')),
    comment_count: num(r.comment_count) ?? num(findKey(r.edge_media_to_comment, 'count')),
    play_count: num(r.play_count) ?? num(r.ig_play_count) ?? num(r.video_play_count) ?? num(r.view_count),
    carousel_media_count: num(r.carousel_media_count),
    caption,
    url: code ? `https://www.instagram.com/${list === 'reel' ? 'reel' : 'p'}/${code}/` : typeof r.url === 'string' ? r.url : null,
    paid_partnership: typeof r.is_paid_partnership === 'boolean' ? r.is_paid_partnership : null,
  };
}

/** One of the signed-in reader's items (one per post, reels among them) in Instagram's own fields. */
export function gatedRawItem(it: Record<string, unknown>): RawMediaItem {
  const media = Array.isArray(it.media) ? (it.media as Record<string, unknown>[]) : [];
  const kind = String(it.post_type ?? '').toLowerCase();
  const reel = kind === 'reel' || kind === 'video' || media[0]?.media_type === 'video';
  const carousel = kind === 'carousel' || media.length > 1;
  return {
    list: reel ? 'reel' : 'post',
    media_type: reel ? 2 : carousel ? 8 : 1,
    product_type: reel ? 'clips' : 'feed',
    taken_at: (it.taken_at ?? null) as string | number | null,
    like_count: num(it.like_count),
    comment_count: num(it.comment_count),
    play_count: num(it.view_count),
    carousel_media_count: carousel ? media.length : null,
    caption: typeof it.caption === 'string' ? it.caption : null,
    url: typeof it.permalink === 'string' ? it.permalink : typeof it.shortcode === 'string' ? `https://www.instagram.com/${reel ? 'reel' : 'p'}/${it.shortcode}/` : null,
    paid_partnership: typeof it.is_paid_partnership === 'boolean' ? it.is_paid_partnership : null,
  };
}

/** The items in the signed-in reader's answer, whatever wraps them. */
export function gatedList(answer: unknown): Record<string, unknown>[] {
  const list = Array.isArray(answer) ? answer : findKey<unknown[]>(answer, 'items') ?? (Array.isArray(findKey(answer, 'data')) ? findKey<unknown[]>(answer, 'data') : null) ?? [];
  return list.filter((i): i is Record<string, unknown> => Boolean(i) && typeof i === 'object');
}

/**
 * How many posts the signed-in reader is asked for in a benchmark: the social
 * step's count. Asked for 24 on 2026-10-27 the actor answered an empty
 * dataset for a profile it had listed at 12 minutes before (its plan caps a
 * run), so the depth read keeps to the count that answers.
 */
export const GATED_DEPTH_POSTS = GATED_POSTS;

type Depth = { profile: EngagementProfile; read_via: 'scrapecreators' | 'apify' };

async function depth(handle: string, followers: number | null): Promise<Depth> {
  try {
    const [posts, reels] = await Promise.all([
      executeTool('SCRAPECREATORS_LIST_INSTAGRAM_USER_POSTS', { handle, trim: true }),
      executeTool('SCRAPECREATORS_LIST_INSTAGRAM_USER_REELS', { handle, trim: true }),
    ]);
    return {
      profile: engagementProfile(
        handle,
        followers,
        mediaList(posts).map((r) => toRawItem(r, 'post')),
        mediaList(reels).map((r) => toRawItem(r, 'reel'))
      ),
      read_via: 'scrapecreators',
    };
  } catch (err) {
    if (err instanceof PermanentStepError || !gatedRefusal(err)) throw err;
    // A profile shown only to signed-in adults: the signed-in reader lists posts and reels together, newest first.
    const items = gatedList(await readGatedItems(handle, 180_000, GATED_DEPTH_POSTS));
    if (!items.length) throw err;
    const raw = items.map(gatedRawItem);
    const actorFollowers = num(items[0].follower_count);
    return {
      profile: engagementProfile(handle, followers ?? actorFollowers, raw.filter((r) => r.list === 'post'), raw.filter((r) => r.list === 'reel')),
      read_via: 'apify',
    };
  }
}

export async function runSocialDepth(ctx: StepContext) {
  const accounts = benchAccounts(ctx);
  const results = await Promise.all(
    accounts.map(async (a) => {
      if (!a.instagram) return { name: a.name, profile: null, error: 'No Instagram handle.' };
      try {
        const read = await depth(a.instagram, a.ig?.followers ?? null);
        return { name: a.name, profile: read.profile, error: null, read_via: read.read_via };
      } catch (err) {
        if (err instanceof PermanentStepError) throw err;
        return { name: a.name, profile: null, error: err instanceof Error ? err.message : String(err), read_via: null };
      }
    })
  );
  const [business, ...competitors] = results;
  const viaApify = results.some((r) => r.read_via === 'apify');
  return {
    source: `Instagram posts and reels (one page each), via ScrapeCreators through Composio${viaApify ? ' (via Apify’s signed-in reader where Instagram hides a profile from logged-out readers)' : ''}`,
    fetched_at: new Date().toISOString(),
    business: business.profile,
    business_error: business.error,
    business_read_via: business.read_via,
    competitors: competitors.map((c) => ({ name: c.name, profile: c.profile, error: c.error, read_via: c.read_via })),
  };
}
