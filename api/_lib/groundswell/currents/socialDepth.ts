import { engagementProfile, type EngagementProfile, type RawMediaItem } from '../../../../packages/groundswell/src/benchmark/index.js';
import { benchAccounts } from '../benchmarkAccounts.js';
import { executeTool, findKey } from '../composio.js';
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

async function depth(handle: string, followers: number | null): Promise<EngagementProfile> {
  const [posts, reels] = await Promise.all([
    executeTool('SCRAPECREATORS_LIST_INSTAGRAM_USER_POSTS', { handle, trim: true }),
    executeTool('SCRAPECREATORS_LIST_INSTAGRAM_USER_REELS', { handle, trim: true }),
  ]);
  return engagementProfile(
    handle,
    followers,
    mediaList(posts).map((r) => toRawItem(r, 'post')),
    mediaList(reels).map((r) => toRawItem(r, 'reel'))
  );
}

export async function runSocialDepth(ctx: StepContext) {
  const accounts = benchAccounts(ctx);
  const results = await Promise.all(
    accounts.map(async (a) => {
      if (!a.instagram) return { name: a.name, profile: null, error: 'No Instagram handle.' };
      try {
        return { name: a.name, profile: await depth(a.instagram, a.ig?.followers ?? null), error: null };
      } catch (err) {
        if (err instanceof PermanentStepError) throw err;
        return { name: a.name, profile: null, error: err instanceof Error ? err.message : String(err) };
      }
    })
  );
  const [business, ...competitors] = results;
  return {
    source: 'Instagram posts and reels (one page each), via ScrapeCreators through Composio',
    fetched_at: new Date().toISOString(),
    business: business.profile,
    business_error: business.error,
    competitors: competitors.map((c) => ({ name: c.name, profile: c.profile, error: c.error })),
  };
}
