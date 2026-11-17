import { executeTool, findKey } from '../composio.js';
import { numeric } from './serp.js';

/**
 * TikTok, read inside the Social Current (owner's ask, 2026-11-17: Baraguz
 * drives its traffic from TikTok, which no step read). Public data only, from
 * ScrapeCreators through Composio: the account's profile (followers, likes,
 * videos, bio and bio link) and one page of its latest videos (plays, likes,
 * comments, shares; whether TikTok marks a video as an ad; a TikTok Shop
 * product link).
 *
 * Finding the account, strongest evidence first: a TikTok link on the
 * website; one in the Instagram bio; the Instagram handle tried on TikTok,
 * kept when its name or bio link fits the brand; a TikTok user search by
 * the business's name, kept only when the bio link points at the business's
 * own website (`links_to_site`). An account matched by name alone is listed
 * for the owner to confirm (`confirmed: false`) and is never called theirs.
 */

export interface TikTokVideo {
  url: string | null;
  posted_at: string | null;
  plays: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  is_ad: boolean;
  shop: boolean;
  caption: string;
}

export interface TikTokAccount {
  handle: string;
  nickname: string | null;
  /** How the account was found. */
  matched_by: 'website' | 'instagram bio' | 'instagram handle' | 'search';
  /** True when the website, the Instagram bio or the account's own bio link ties it to the business. */
  confirmed: boolean;
  followers: number | null;
  likes: number | null;
  videos: number | null;
  bio: string | null;
  bio_link: string | null;
  links_to_site: boolean;
  /** The bio link carries utm_ parameters, so analytics can name TikTok as the source. */
  bio_link_tagged: boolean;
  private: boolean;
  recent: {
    read: number;
    last_post_at: string | null;
    posts_last_30_days: number;
    median_plays: number | null;
    avg_likes: number | null;
    avg_comments: number | null;
    avg_shares: number | null;
    ads: number;
    shop_links: number;
    top: TikTokVideo[];
  } | null;
  error: string | null;
}

export interface TikTokOutput {
  source: string;
  fetched_at: string;
  accounts: TikTokAccount[];
  /** The name searched for on TikTok, when a search ran. */
  searched: string | null;
  note: string | null;
}

export const TIKTOK_ACCOUNTS = 3;
const SEARCH_CANDIDATES = 4;

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};
const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

/** TikTok handles in links ("tiktok.com/@name", "tiktok.com/@name/video/…"), lower case, once each. */
export function tiktokHandles(links: (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  for (const l of links) for (const m of (l ?? '').matchAll(/tiktok\.com\/@([A-Za-z0-9._]{2,24})/gi)) out.add(m[1].toLowerCase());
  return [...out];
}

/** The site's host without www ("baraguz.com"), or null. */
export function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

/** Whether a bio link ("Baraguz.com", "https://baraguz.com/?utm_source=tiktok") points at the business's own site. */
export const linksTo = (bioLink: string | null, host: string | null) => {
  const h = hostOf(bioLink);
  return Boolean(h && host && (h === host || h.endsWith(`.${host}`)));
};

/** The profile answer as an account (no videos yet). */
export function tiktokProfile(handle: string, answer: unknown, host: string | null): Omit<TikTokAccount, 'matched_by' | 'confirmed' | 'recent' | 'error'> {
  const user = (findKey<Record<string, unknown>>(answer, 'user') ?? {}) as Record<string, unknown>;
  const stats = (findKey<Record<string, unknown>>(answer, 'stats') ?? {}) as Record<string, unknown>;
  const bioLinkRaw = user.bioLink as { link?: unknown } | string | null | undefined;
  const bioLink = typeof bioLinkRaw === 'string' ? str(bioLinkRaw) : str(bioLinkRaw?.link);
  return {
    handle: (str(user.uniqueId) ?? handle).toLowerCase(),
    nickname: str(user.nickname),
    followers: numeric(stats.followerCount),
    likes: numeric(stats.heartCount),
    videos: numeric(stats.videoCount),
    bio: str(user.signature),
    bio_link: bioLink,
    links_to_site: linksTo(bioLink, host),
    bio_link_tagged: /[?&]utm_[a-z]+=/i.test(bioLink ?? ''),
    private: user.privateAccount === true,
  };
}

/** One page of videos, summarised: cadence, plays and engagement, ads and Shop links, the five most played. */
export function tiktokRecent(answer: unknown, now = Date.now()): TikTokAccount['recent'] {
  const items = findKey<unknown[]>(answer, 'items');
  if (!Array.isArray(items)) return null;
  const videos: TikTokVideo[] = items.map((raw) => {
    const v = (raw ?? {}) as Record<string, unknown>;
    const s = (v.statistics ?? {}) as Record<string, unknown>;
    const at = str(v.create_time_utc) ?? (numeric(v.create_time) ? new Date(numeric(v.create_time)! * 1000).toISOString() : null);
    return {
      url: str(v.url),
      posted_at: at,
      plays: numeric(s.play_count),
      likes: numeric(s.digg_count),
      comments: numeric(s.comment_count),
      shares: numeric(s.share_count),
      is_ad: v.is_ad === true,
      shop: Boolean(str(v.shop_product_url)),
      caption: (str(v.desc) ?? '').replace(/\s+/g, ' ').slice(0, 160),
    };
  });
  const nums = (k: 'plays' | 'likes' | 'comments' | 'shares') => videos.map((x) => x[k]).filter((n): n is number => n !== null);
  const times = videos.map((x) => (x.posted_at ? Date.parse(x.posted_at) : NaN)).filter((t) => Number.isFinite(t));
  return {
    read: videos.length,
    last_post_at: times.length ? new Date(Math.max(...times)).toISOString() : null,
    posts_last_30_days: times.filter((t) => now - t <= 30 * 86_400_000).length,
    median_plays: median(nums('plays')),
    avg_likes: avg(nums('likes')),
    avg_comments: avg(nums('comments')),
    avg_shares: avg(nums('shares')),
    ads: videos.filter((x) => x.is_ad).length,
    shop_links: videos.filter((x) => x.shop).length,
    top: [...videos].sort((a, b) => (b.plays ?? 0) - (a.plays ?? 0)).slice(0, 5),
  };
}

/** Words of a name that identify it (four letters or more). */
const nameWords = (name: string) => name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4);

export interface TikTokSeed {
  business: string;
  website: string | null;
  siteLinks: string[];
  instagramBioLinks: string[];
  instagramHandle: string | null;
  /** Handles the owner says are not the business's (`rejectedTikTok`): never read, never listed. */
  rejected?: string[];
}

/**
 * The TikTok handles the business's notes say are not its own (owner's call,
 * 2026-11-17, for Baraguz's @karen.finds.tiktok): every @handle on a line (or
 * a part between semicolons) that names TikTok and says "not", e.g.
 * "Not theirs on TikTok: @karen.finds.tiktok".
 */
export function rejectedTikTok(notes: string | null | undefined): string[] {
  const out = new Set<string>();
  for (const part of (notes ?? '').split(/[\n;]+/)) {
    if (!/tik\s*tok/i.test(part) || !/\bnot\b/i.test(part)) continue;
    // A handle may hold dots but never ends with one ("@x.y." at a sentence's end is "x.y").
    for (const m of part.matchAll(/@([a-z0-9._]{2,24})/gi)) out.add(m[1].toLowerCase().replace(/\.+$/, ''));
  }
  return [...out];
}

type Exec = (slug: string, args: Record<string, unknown>, timeoutMs: number) => Promise<unknown>;

/** Finds and reads the business's TikTok accounts. Never throws: a read that fails is named in the account or the note. */
export async function readTikTok(seed: TikTokSeed, budget: (cap: number) => number, exec: Exec = executeTool): Promise<TikTokOutput | null> {
  const host = hostOf(seed.website);
  const words = nameWords(seed.business);
  // Whole parts of the handle or name ("the_baraguz_family" fits Baraguz; "barbaraguzmanf" does not).
  const parts = (s: string | null) => (s ?? '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const fits = (a: { handle: string; nickname: string | null }) => words.some((w) => [...parts(a.handle), ...parts(a.nickname)].some((p) => p === w || p.startsWith(w)));
  const rejected = new Set((seed.rejected ?? []).map((h) => h.toLowerCase().replace(/^@/, '')));
  const left: string[] = [];
  const allowed = (h: string) => {
    if (!rejected.has(h)) return true;
    if (!left.includes(h)) left.push(h);
    return false;
  };
  const found = new Map<string, { matched_by: TikTokAccount['matched_by']; confirmed: boolean }>();
  for (const h of tiktokHandles(seed.siteLinks)) if (allowed(h)) found.set(h, { matched_by: 'website', confirmed: true });
  for (const h of tiktokHandles(seed.instagramBioLinks)) if (!found.has(h) && allowed(h)) found.set(h, { matched_by: 'instagram bio', confirmed: true });
  const notes: string[] = [];
  const profiles = new Map<string, unknown>();
  const profile = async (handle: string) => {
    if (!profiles.has(handle)) profiles.set(handle, await exec('SCRAPECREATORS_GET_TIKTOK_PROFILE', { handle, cache_max_age: '1d' }, budget(60_000)));
    return profiles.get(handle);
  };

  if (seed.instagramHandle && !found.has(seed.instagramHandle.toLowerCase()) && allowed(seed.instagramHandle.toLowerCase())) {
    const h = seed.instagramHandle.toLowerCase();
    try {
      const p = tiktokProfile(h, await profile(h), host);
      if (p.links_to_site || fits(p)) found.set(h, { matched_by: 'instagram handle', confirmed: p.links_to_site || fits(p) });
    } catch {
      /* no such account, or a refusal: the search below may still find it */
    }
  }

  let searched: string | null = null;
  if (seed.business.trim() && found.size < TIKTOK_ACCOUNTS) {
    searched = seed.business.trim();
    try {
      const answer = await exec('SCRAPECREATORS_SEARCH_TIKTOK_USERS', { query: searched, trim: true }, budget(60_000));
      const items = (findKey<unknown[]>(answer, 'items') ?? []) as Record<string, unknown>[];
      const candidates = items
        .map((r) => ({ handle: (str(r.unique_id) ?? '').toLowerCase(), nickname: str(r.nickname), followers: numeric(r.follower_count) ?? 0 }))
        .filter((c) => c.handle && !found.has(c.handle) && fits(c) && allowed(c.handle))
        .sort((a, b) => b.followers - a.followers)
        .slice(0, SEARCH_CANDIDATES);
      for (const c of candidates) {
        if (found.size >= TIKTOK_ACCOUNTS) break;
        try {
          const p = tiktokProfile(c.handle, await profile(c.handle), host);
          // A search hit counts only with its bio link at the business's site; a name alone is for the owner to confirm.
          found.set(c.handle, { matched_by: 'search', confirmed: p.links_to_site });
        } catch (err) {
          notes.push(`@${c.handle} could not be read: ${err instanceof Error ? err.message.slice(0, 120) : 'unknown error'}`);
        }
      }
    } catch (err) {
      notes.push(`The TikTok search did not answer: ${err instanceof Error ? err.message.slice(0, 120) : 'unknown error'}`);
    }
  }
  if (left.length) notes.push(`Left out as not the business’s (its notes say so): ${left.map((h) => `@${h}`).join(', ')}.`);
  if (!found.size) return { source: SOURCE, fetched_at: new Date().toISOString(), accounts: [], searched, note: notes.join(' ') || 'No TikTok account could be tied to the business: the website and Instagram bio link none, and no account found by name links to its website.' };

  const accounts = await Promise.all(
    [...found.entries()].slice(0, TIKTOK_ACCOUNTS).map(async ([handle, how]): Promise<TikTokAccount> => {
      let base: Omit<TikTokAccount, 'matched_by' | 'confirmed' | 'recent' | 'error'>;
      try {
        base = tiktokProfile(handle, await profile(handle), host);
      } catch (err) {
        return { handle, nickname: null, matched_by: how.matched_by, confirmed: how.confirmed, followers: null, likes: null, videos: null, bio: null, bio_link: null, links_to_site: false, bio_link_tagged: false, private: false, recent: null, error: `Profile: ${err instanceof Error ? err.message.slice(0, 160) : 'unknown error'}` };
      }
      let recent: TikTokAccount['recent'] = null;
      let error: string | null = null;
      if (!base.private) {
        try {
          recent = tiktokRecent(await exec('SCRAPECREATORS_LIST_TIKTOK_PROFILE_VIDEOS', { handle, region: 'US', sort_by: 'latest', trim: true }, budget(60_000)));
        } catch (err) {
          error = `Videos: ${err instanceof Error ? err.message.slice(0, 160) : 'unknown error'}`;
        }
      }
      return { ...base, matched_by: how.matched_by, confirmed: how.confirmed || base.links_to_site, recent, error };
    })
  );
  // The business's own accounts first, then the most followed.
  accounts.sort((a, b) => Number(b.confirmed) - Number(a.confirmed) || (b.followers ?? 0) - (a.followers ?? 0));
  return { source: SOURCE, fetched_at: new Date().toISOString(), accounts, searched, note: notes.join(' ') || null };
}

const SOURCE = 'Public TikTok profiles and their latest videos, via ScrapeCreators through Composio';
