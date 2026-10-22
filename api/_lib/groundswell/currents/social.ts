import { executeTool, findKey } from '../composio.js';
import type { StepContext } from '../types.js';
import type { SiteScan } from './site.js';

/**
 * Social Current: public Instagram profiles (followers, posts, recent activity)
 * for the business and its rivals, from ScrapeCreators through Composio.
 * One profile call and one post-list call per account.
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
  error: string | null;
}

const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Post timestamps arrive as epoch seconds, epoch ms, or ISO strings. */
function postTime(p: Record<string, unknown>): number | null {
  const v = p.taken_at_timestamp ?? p.taken_at ?? p.timestamp ?? p.created_at;
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
  const external = findKey<unknown>(profile, 'external_url');
  return [...new Set([...urls, ...(typeof external === 'string' && external ? [external] : [])])];
}

export function summarizeInstagram(handle: string, profile: unknown, posts: unknown, now = Date.now()): InstagramSnapshot {
  const followers = n(findKey(findKey(profile, 'edge_followed_by'), 'count')) ?? n(findKey(profile, 'follower_count'));
  const following = n(findKey(findKey(profile, 'edge_follow'), 'count')) ?? n(findKey(profile, 'following_count'));
  const count = n(findKey(findKey(profile, 'edge_owner_to_timeline_media'), 'count')) ?? n(findKey(profile, 'media_count'));
  const items = (findKey<unknown[]>(posts, 'items') ?? findKey<unknown[]>(posts, 'posts') ?? findKey<unknown[]>(posts, 'edges') ?? []).map(
    (i) => ((i as Record<string, unknown>).node ?? i) as Record<string, unknown>
  );
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
    is_business: (findKey<boolean>(profile, 'is_business_account') ?? null) as boolean | null,
    last_post_at: times[0] ? new Date(times[0]).toISOString() : null,
    posts_last_30_days: items.length ? times.filter((t) => now - t <= 30 * 86_400_000).length : null,
    avg_likes_recent: avg(recent.map((p) => n(p.like_count) ?? n(findKey(p.edge_liked_by ?? p.edge_media_preview_like, 'count')))),
    avg_comments_recent: avg(recent.map((p) => n(p.comment_count) ?? n(findKey(p.edge_media_to_comment, 'count')))),
    bio_links: bioLinks(profile),
    error: null,
  };
}

/** Instagram turns a scraper away now and then; a blocked read is tried once more after this pause. */
export const BLOCKED_RETRY_MS = 3_000;
const blocked = (err: unknown) => /blocked|rate limit|too many requests|429/i.test(err instanceof Error ? err.message : String(err));

async function read(handle: string) {
  return Promise.all([
    executeTool('SCRAPECREATORS_GET_INSTAGRAM_PROFILE', { handle, trim: true }),
    executeTool('SCRAPECREATORS_LIST_INSTAGRAM_USER_POSTS', { handle, trim: true }),
  ]);
}

async function instagram(handle: string, pauseMs = BLOCKED_RETRY_MS): Promise<InstagramSnapshot> {
  try {
    let pair: [unknown, unknown];
    try {
      pair = await read(handle);
    } catch (err) {
      if (!blocked(err)) throw err;
      await new Promise((r) => setTimeout(r, pauseMs));
      pair = await read(handle);
    }
    return summarizeInstagram(handle, pair[0], pair[1]);
  } catch (err) {
    return { ...summarizeInstagram(handle, null, null), error: err instanceof Error ? err.message : String(err) };
  }
}

export async function runSocial(ctx: StepContext, pauseMs = BLOCKED_RETRY_MS) {
  const site = ctx.outputs.site as { business: SiteScan | null; competitors: { name: string; site: SiteScan | null }[] } | undefined;
  const own = ctx.audit.instagram || site?.business?.social.instagram[0] || null;
  const rivals = ctx.audit.competitors
    .map((c, i) => ({ name: c.name, handle: c.instagram || site?.competitors[i]?.site?.social.instagram[0] || null }))
    .filter((c): c is { name: string; handle: string } => Boolean(c.handle))
    .slice(0, 6);
  const business = own ? await instagram(own, pauseMs) : null;
  if (business?.error && /refused|not connected|no active connection|not set up/i.test(business.error)) throw new Error(business.error);
  const competitors = await Promise.all(rivals.map(async (c) => ({ name: c.name, ...(await instagram(c.handle, pauseMs)) })));
  return {
    source: 'Instagram public profiles, via ScrapeCreators through Composio',
    fetched_at: new Date().toISOString(),
    handle_source: ctx.audit.instagram ? 'entered by an admin' : own ? 'linked from the website' : null,
    business,
    competitors,
  };
}
