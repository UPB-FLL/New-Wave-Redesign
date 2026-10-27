import { executeTool, findKey } from '../composio.js';
import { PermanentStepError, type StepContext } from '../types.js';
import { timeBudget } from './social.js';

/**
 * Community Current (Social): where the business is talked about on Reddit,
 * through ScrapeCreators' Reddit search on Composio (one credit a page).
 * Four reads at most: posts and comments naming the business, posts about its
 * category in its city, and posts naming each competitor (two at most).
 *
 * What is kept, and why:
 * - a mention: a post or comment whose text carries the business's name;
 * - a category question: a post in the category search whose title asks
 *   something (a question mark, or who/what/where/which/best/recommend…) and
 *   names the category;
 * - the communities (subreddits) these come from, ranked: Reddit gives no
 *   flair through this reader, so the communities and the recurring words are
 *   the "tags".
 * Threads about politics, boycotts or lists of places "to avoid" are left out
 * entirely, whatever they mention: nothing in the plan, the ads or the posts
 * builds on them.
 */

export interface RedditItem {
  kind: 'post' | 'comment';
  subreddit: string | null;
  title: string | null;
  excerpt: string;
  score: number | null;
  comments: number | null;
  posted_at: string | null;
  url: string | null;
}

export interface CommunityOutput {
  source: string;
  fetched_at: string;
  queries: { query: string; kind: 'posts' | 'comments'; purpose: 'business' | 'category' | 'competitor'; found: number; error: string | null }[];
  business: { mentions: RedditItem[]; communities: { name: string; count: number }[]; topics: string[] };
  category: { term: string | null; questions: RedditItem[]; communities: { name: string; count: number }[] };
  competitors: { name: string; mentions: number | null; error: string | null }[];
  /** The communities and recurring words, for the plan, the ads' targeting and the posts. */
  tags: string[];
  left_out: number;
  note: string;
}

export const isCommunityOutput = (x: unknown): x is CommunityOutput => Boolean(x && typeof x === 'object' && 'business' in x && 'category' in x && Array.isArray((x as CommunityOutput).queries));

const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const s = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

const fold = (t: string) => t.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Topics nothing should be built on. */
export const OFF_LIMITS = /\b(maga|trump|biden|democrat|republican|politic\w*|election|boycott\w*|to avoid|avoid list|nazi|lawsuit|arrest\w*|shooting|scam)\b/i;

/** ScrapeCreators' Reddit items, in either list shape. */
export function redditItems(payload: unknown, kind: 'post' | 'comment'): RedditItem[] {
  const list = findKey<unknown[]>(payload, 'items') ?? findKey<unknown[]>(payload, 'posts') ?? findKey<unknown[]>(payload, 'comments') ?? [];
  return list
    .map((raw) => {
      const r = (raw ?? {}) as Record<string, unknown>;
      const body = s(r.body) ?? s(r.selftext) ?? '';
      const title = s(r.title);
      if (!title && !body) return null;
      const created = n(r.created_utc) ?? n(r.created);
      const permalink = s(r.permalink);
      const url = permalink ? `https://www.reddit.com${permalink.startsWith('/') ? '' : '/'}${permalink}` : s(r.url);
      return {
        kind,
        subreddit: s(r.subreddit),
        title,
        excerpt: body.replace(/\s+/g, ' ').slice(0, 300),
        score: n(r.score) ?? n(r.ups),
        comments: n(r.num_comments),
        posted_at: created ? new Date(created * 1000).toISOString() : null,
        url,
      } satisfies RedditItem;
    })
    .filter((x): x is RedditItem => Boolean(x));
}

/** Whether an item's text names the business (its name's words in order, folded). */
export function mentions(item: RedditItem, name: string): boolean {
  const want = fold(name);
  return want.length > 2 && fold(`${item.title ?? ''} ${item.excerpt}`).includes(want);
}

const QUESTION = /\?\s*$|^(who|what|where|which|best|any|anyone|looking for|recommend\w*|suggest\w*|favorite|favourite|good)\b/i;

/** A category post that asks something about the category. */
export function isCategoryQuestion(item: RedditItem, category: string): boolean {
  if (!item.title || !QUESTION.test(item.title.trim())) return false;
  const words = fold(category).split(' ').filter((w) => w.length > 3).map((w) => w.replace(/(ies|es|s|y)$/, '')); // brewery, breweries → brewer
  const text = fold(`${item.title} ${item.excerpt}`);
  return words.some((w) => text.includes(w));
}

const STOP = new Set('the and for with that this from have just they them their your you our are was were been will would could about what when where which there here into than then some more most very also only over like get got its it’s im ive dont cant too out all any one two new now how who why not but can has had did does via amp www com https http reddit'.split(' '));

/** The words that recur across the mentions (at least twice), the business's own name aside. */
export function recurringWords(items: RedditItem[], name: string, limit = 8): string[] {
  const own = new Set(fold(name).split(' '));
  const counts = new Map<string, number>();
  for (const i of items) {
    const seen = new Set(fold(`${i.title ?? ''} ${i.excerpt}`).split(' ').filter((w) => w.length > 3 && !STOP.has(w) && !own.has(w) && !/^\d+$/.test(w)));
    for (const w of seen) counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([w]) => w);
}

export function rankCommunities(items: RedditItem[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const i of items) if (i.subreddit) counts.set(i.subreddit, (counts.get(i.subreddit) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name, count]) => ({ name, count }));
}

const READ_MS = 45_000;

/** The category's plain word for a search ("brewery" from "Craft brewery"), from the business profile or the Google listing. */
function categoryTerm(ctx: StepContext): string | null {
  const profile = (ctx.outputs.competitors as { profile?: { category?: string | null } } | undefined)?.profile;
  const listing = (ctx.outputs.maps as { business?: { category?: string | null } | null } | undefined)?.business;
  const raw = profile?.category ?? listing?.category ?? null;
  return raw ? raw.split(/[,/(]/)[0].trim().toLowerCase() : null;
}

export async function runCommunity(ctx: StepContext): Promise<CommunityOutput> {
  const { audit } = ctx;
  const name = audit.business_name;
  const term = categoryTerm(ctx);
  const city = audit.city ? audit.city.split(',')[0].trim() : null;
  const reads: { query: string; kind: 'posts' | 'comments'; purpose: 'business' | 'category' | 'competitor'; competitor?: string }[] = [
    { query: `"${name}"`, kind: 'posts', purpose: 'business' },
    { query: `"${name}"`, kind: 'comments', purpose: 'business' },
    ...(term && city ? [{ query: `${term} ${city}`, kind: 'posts' as const, purpose: 'category' as const }] : []),
    ...audit.competitors.slice(0, 2).map((c) => ({ query: `"${c.name}"`, kind: 'posts' as const, purpose: 'competitor' as const, competitor: c.name })),
  ];
  const results = await Promise.all(
    reads.map(async (r) => {
      try {
        const payload = await executeTool('SCRAPECREATORS_SEARCH_REDDIT', { query: r.query, result_type: r.kind, sort: r.purpose === 'category' ? 'relevance' : 'new', timeframe: r.purpose === 'category' ? 'year' : 'all', trim: true }, timeBudget(ctx, READ_MS));
        return { ...r, items: redditItems(payload, r.kind === 'posts' ? 'post' : 'comment'), error: null as string | null };
      } catch (err) {
        if (err instanceof PermanentStepError) throw err;
        return { ...r, items: [] as RedditItem[], error: message(err).slice(0, 200) };
      }
    })
  );
  if (results.every((r) => r.error)) throw new Error(`Reddit could not be read: ${results[0]?.error ?? 'no reads'}`);

  let leftOut = 0;
  const allowed = (i: RedditItem) => {
    const ok = !OFF_LIMITS.test(`${i.title ?? ''} ${i.excerpt}`);
    if (!ok) leftOut++;
    return ok;
  };
  const seen = new Set<string>();
  const unique = (i: RedditItem) => {
    const key = i.url ?? `${i.subreddit}:${i.title}:${i.excerpt.slice(0, 40)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };
  const businessMentions = results
    .filter((r) => r.purpose === 'business')
    .flatMap((r) => r.items)
    .filter((i) => mentions(i, name))
    .filter(allowed)
    .filter(unique)
    .sort((a, b) => (b.posted_at ?? '').localeCompare(a.posted_at ?? ''))
    .slice(0, 20);
  const categoryItems = results.filter((r) => r.purpose === 'category').flatMap((r) => r.items).filter(allowed);
  const questions = term ? categoryItems.filter((i) => isCategoryQuestion(i, term)).filter(unique).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 10) : [];
  const competitors = results
    .filter((r) => r.purpose === 'competitor')
    .map((r) => ({ name: r.competitor!, mentions: r.error ? null : r.items.filter((i) => mentions(i, r.competitor!)).filter((i) => !OFF_LIMITS.test(`${i.title ?? ''} ${i.excerpt}`)).length, error: r.error }));

  const communities = rankCommunities(businessMentions);
  const categoryCommunities = rankCommunities(questions).slice(0, 6);
  const topics = recurringWords(businessMentions, name);
  const tags = [...new Set([...communities.map((c) => `r/${c.name}`), ...categoryCommunities.map((c) => `r/${c.name}`), ...topics])].slice(0, 14);
  return {
    source: 'Reddit search (posts and comments), via ScrapeCreators through Composio',
    fetched_at: new Date().toISOString(),
    queries: results.map((r) => ({ query: r.query, kind: r.kind, purpose: r.purpose, found: r.items.length, error: r.error })),
    business: { mentions: businessMentions, communities, topics },
    category: { term, questions, communities: categoryCommunities },
    competitors,
    tags,
    left_out: leftOut,
    note: 'Reddit search returns one page per query; counts are of the posts and comments found, not of all conversation. Threads about politics, boycotts or places to avoid are left out and never built on.',
  };
}
