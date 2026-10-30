import { executeTool, findKey } from '../composio.js';
import { PermanentStepError, type StepContext } from '../types.js';
import { publicWebsiteUrl } from '../publicFetch.js';
import { ownWebsite } from './serp.js';
import type { SiteScan } from './site.js';

/**
 * Site pages Current: the website beyond its homepage, through Firecrawl via
 * Composio. One `map` call lists the site's URLs; the pages that say what the
 * business sells (home, about, services, programs, pricing, FAQ, contact, the
 * blog's index and a few posts) are read as main-content markdown, one
 * `scrape` each, and summarised: title, description, headings, word count,
 * calls to action, prices seen, and a short excerpt. Each competitor's
 * homepage is read the same way, so "what they offer" comes from their own
 * words and not from a listing label.
 *
 * Optional and best-effort: a page that fails is recorded with its error; a
 * site Firecrawl cannot map falls back to the homepage alone. The output feeds
 * the business profile (competitor relevance), the write-up, and the website
 * optimization plan.
 */

export interface SitePage {
  url: string;
  path: string;
  status: number | null;
  title: string | null;
  description: string | null;
  h1: string | null;
  headings: string[];
  word_count: number;
  /** Links whose words ask the reader to act (book, call, contact, buy, join). */
  ctas: { text: string; url: string }[];
  /** Prices as written on the page ("$350", "$79 a month"), at most ten. */
  prices: string[];
  /** The first part of the main content, for the model and the panels. */
  excerpt: string;
  error: string | null;
}

export interface SitePagesOutput {
  source: string;
  fetched_at: string;
  website: string;
  /** How many URLs the map listed, before the selection. */
  mapped: number;
  pages: SitePage[];
  competitors: { name: string; website: string; page: SitePage | null }[];
  error: string | null;
}

export const PAGE_LIMIT = 10;
export const SCRAPE_TIMEOUT_MS = 35_000;
const SOURCE = 'Website pages read as main-content markdown, via Firecrawl through Composio';
const EXCERPT_CHARS = 1_200;

const str = (v: unknown, max = 300): string | null => (typeof v === 'string' && v.trim() ? v.replace(/\s+/g, ' ').trim().slice(0, max) : null);

/** The same page, written one way: lower-case host, no query, no hash, no trailing slash. */
export function canonicalPage(raw: string, base: string): string | null {
  try {
    const u = new URL(raw, base);
    if (!/^https?:$/.test(u.protocol)) return null;
    u.hash = '';
    u.search = '';
    u.hostname = u.hostname.toLowerCase();
    const path = u.pathname.replace(/\/+$/, '') || '/';
    return `${u.origin}${path === '/' ? '' : path}`;
  } catch {
    return null;
  }
}

const host = (u: string) => { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ''); } catch { return null; } };

/** How much a path says about what the business sells; negative paths are never read. */
export function pageScore(path: string): number {
  const p = path.toLowerCase();
  if (p === '' || p === '/') return 100;
  if (/\.(?:pdf|jpe?g|png|gif|svg|webp|xml|txt|css|js|ico)$/.test(p)) return -100;
  if (/\b(?:privacy|terms|disclaimer|accessibility|security|cookie|legal|consumer-health|refund|sitemap|login|sign-?in|cart|checkout|account|wp-|feed|tag|category|author|page\/\d)/.test(p)) return -100;
  const depth = p.split('/').filter(Boolean).length;
  if (/\b(?:service|services|work-with|programs?|offer|offers|menu|pricing|prices?|plans?|packages?|membership|collective|treatments?|classes|what-we-do|solutions?|products?)\b/.test(p)) return depth === 1 ? 90 : 70;
  if (/\b(?:about|team|story|our-|who-we-are|approach|method|process|why)\b/.test(p)) return 80;
  if (/\b(?:faq|faqs|questions)\b/.test(p)) return 70;
  if (/\b(?:contact|book|booking|schedule|appointment|consult)\b/.test(p)) return 60;
  if (/\b(?:blog|journal|news|articles?|resources?|guides?|insights?|learn)\b/.test(p)) return depth === 1 ? 50 : 25;
  if (/\b(?:shop|store)\b/.test(p)) return 40;
  return depth === 1 ? 35 : 15;
}

/** The pages to read: the homepage first, then the paths that say the most, up to `limit`, same host only. */
export function choosePages(urls: string[], website: string, limit = PAGE_LIMIT): string[] {
  const home = canonicalPage(website, website);
  if (!home) return [];
  const own = host(home);
  const seen = new Set<string>();
  const scored: { url: string; score: number; index: number }[] = [];
  for (const [index, raw] of [home, ...urls].entries()) {
    const url = canonicalPage(raw, home);
    if (!url || seen.has(url) || host(url) !== own) continue;
    seen.add(url);
    const score = url === home ? 100 : pageScore(new URL(url).pathname);
    if (score > 0) scored.push({ url, score, index });
  }
  return scored.sort((a, b) => b.score - a.score || a.index - b.index).slice(0, limit).map((s) => s.url);
}

/** The URLs a FIRECRAWL map answer lists (objects with `url`, or plain strings). */
export function mappedUrls(payload: unknown): string[] {
  const links = findKey<unknown[]>(payload, 'links') ?? [];
  if (!Array.isArray(links)) return [];
  return links.map((l) => (typeof l === 'string' ? l : typeof (l as { url?: unknown })?.url === 'string' ? (l as { url: string }).url : null)).filter((u): u is string => Boolean(u));
}

const CTA_WORDS = /\b(?:book|schedule|consult|consultation|call|contact|get started|start|apply|buy|shop|order|sign up|signup|join|quote|free|reserve|register|enroll|learn more|download|subscribe)\b/i;

/** A page from a FIRECRAWL_SCRAPE answer: its markdown summarised, its metadata read by the usual names. */
export function parseScrapedPage(url: string, payload: unknown): SitePage {
  const markdown = findKey<string>(payload, 'markdown');
  const meta = findKey<Record<string, unknown>>(payload, 'metadata') ?? {};
  const statusRaw = meta.statusCode ?? meta.status_code ?? meta.status;
  const status = typeof statusRaw === 'number' ? statusRaw : typeof statusRaw === 'string' && /^\d+$/.test(statusRaw) ? Number(statusRaw) : null;
  const page: SitePage = {
    url,
    path: (() => { try { return new URL(url).pathname || '/'; } catch { return '/'; } })(),
    status,
    title: str(meta.title ?? meta['og:title'] ?? meta.ogTitle, 200),
    description: str(meta.description ?? meta['og:description'] ?? meta.ogDescription, 400),
    h1: null,
    headings: [],
    word_count: 0,
    ctas: [],
    prices: [],
    excerpt: '',
    error: null,
  };
  if (typeof markdown !== 'string' || !markdown.trim()) {
    page.error = status !== null && (status < 200 || status >= 400) ? `The page returned HTTP ${status}.` : 'The page returned no readable content.';
    return page;
  }
  const lines = markdown.split(/\r?\n/);
  const headings: string[] = [];
  for (const line of lines) {
    const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!m) continue;
    const text = str(m[2].replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, ''), 160);
    if (!text) continue;
    if (m[1].length === 1 && !page.h1) page.h1 = text;
    headings.push(text);
  }
  page.headings = [...new Set(headings)].slice(0, 25);
  const ctas = new Map<string, { text: string; url: string }>();
  for (const m of markdown.matchAll(/\[([^\]]{2,80})\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+|tel:[^)\s]+|\/[^)\s]*)\)/g)) {
    const text = str(m[1].replace(/[*_`]/g, ''), 80);
    if (!text || !CTA_WORDS.test(text) || /^skip to/i.test(text)) continue;
    const target = canonicalPage(m[2], url) ?? m[2];
    if (!ctas.has(text.toLowerCase())) ctas.set(text.toLowerCase(), { text, url: target.slice(0, 300) });
  }
  page.ctas = [...ctas.values()].slice(0, 12);
  page.prices = [...new Set((markdown.match(/\$\s?\d[\d,]*(?:\.\d{2})?(?:\s*(?:\/|a|an|per)\s*(?:month|mo|week|session|visit|hour|year|person|class))?/gi) ?? []).map((p) => p.replace(/\s+/g, ' ').trim()))].slice(0, 10);
  const prose = markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`>|-]{2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  page.word_count = prose ? prose.split(' ').filter((w) => /[a-z0-9]/i.test(w)).length : 0;
  page.excerpt = prose.slice(0, EXCERPT_CHARS);
  if (page.status !== null && (page.status < 200 || page.status >= 400)) page.error = `The page returned HTTP ${page.status}.`;
  return page;
}

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));
const failed = (url: string, error: string): SitePage => ({ ...parseScrapedPage(url, {}), error: error.slice(0, 300) });

/** One page, read as main-content markdown; a failure is a page with its error, never a thrown step. */
export async function scrapePage(url: string, timeoutMs: number): Promise<SitePage> {
  if (timeoutMs <= 1_000) return failed(url, 'No time remained to read the page.');
  try {
    const payload = await executeTool('FIRECRAWL_SCRAPE', { url, formats: ['markdown'], onlyMainContent: true, timeout: Math.min(30_000, timeoutMs - 500) }, timeoutMs);
    const error = findKey<unknown>(payload, 'error');
    if (typeof error === 'string' && error && !findKey(payload, 'markdown')) return failed(url, error);
    return parseScrapedPage(url, payload);
  } catch (err) {
    if (err instanceof PermanentStepError && /API key/i.test(err.message)) throw err;
    return failed(url, message(err));
  }
}

export interface ReadSitePagesOptions {
  limit?: number;
  /** Absolute epoch-ms deadline for every read. */
  deadline: number;
  competitors?: { name: string; website: string | null }[];
  /** Pages already read (the competitors step's), reused instead of read again. */
  known?: SitePage[];
}

/** The site's pages and the competitors' homepages, read in parallel within the deadline. */
export async function readSitePages(website: string, options: ReadSitePagesOptions): Promise<SitePagesOutput> {
  const remaining = () => options.deadline - Date.now();
  const limit = Math.max(1, Math.min(PAGE_LIMIT, options.limit ?? PAGE_LIMIT));
  const out: SitePagesOutput = { source: SOURCE, fetched_at: new Date().toISOString(), website, mapped: 0, pages: [], competitors: [], error: null };
  let urls: string[] = [];
  try {
    const payload = await executeTool('FIRECRAWL_MAP_MULTIPLE_URLS_BASED_ON_OPTIONS', { url: website, limit: 80, includeSubdomains: false, ignoreQueryParameters: true }, Math.max(1_000, Math.min(30_000, remaining() - 1_000)));
    urls = mappedUrls(payload);
    out.mapped = urls.length;
    if (!urls.length) out.error = 'The site map listed no pages, so only the homepage was read.';
  } catch (err) {
    if (err instanceof PermanentStepError && /API key/i.test(err.message)) throw err;
    out.error = `Site map: ${message(err).slice(0, 300)}`;
  }
  const known = new Map((options.known ?? []).filter((p) => !p.error).map((p) => [canonicalPage(p.url, p.url) ?? p.url, p]));
  const chosen = choosePages(urls, website, limit);
  const rivals = (options.competitors ?? []).filter((c): c is { name: string; website: string } => Boolean(c.website)).slice(0, 6);
  const budget = () => Math.max(0, Math.min(SCRAPE_TIMEOUT_MS, remaining() - 1_000));
  const [pages, rivalPages] = await Promise.all([
    Promise.all(chosen.map((url) => known.get(url) ? Promise.resolve(known.get(url)!) : scrapePage(url, budget()))),
    Promise.all(rivals.map(async (c) => {
      let home: string;
      try { home = publicWebsiteUrl(c.website).href; } catch { return { name: c.name, website: c.website, page: null }; }
      return { name: c.name, website: c.website, page: await scrapePage(canonicalPage(home, home) ?? home, budget()) };
    })),
  ]);
  out.pages = pages;
  out.competitors = rivalPages;
  out.fetched_at = new Date().toISOString();
  return out;
}

/** True for a usable site-pages output (an audit started before the step existed has none). */
export function isSitePagesOutput(x: unknown): x is SitePagesOutput {
  const o = x as Partial<SitePagesOutput> | null | undefined;
  return Boolean(o && Array.isArray(o.pages) && typeof o.website === 'string');
}

export async function runSitePages(ctx: StepContext): Promise<SitePagesOutput> {
  const site = ctx.outputs.site as { business?: SiteScan | null } | undefined;
  const given = site?.business?.final_url ?? site?.business?.url ?? ctx.audit.website;
  // A link-in-bio page has no pages of the business's own to read.
  const website = ownWebsite(given);
  if (!website) throw new PermanentStepError(given ? 'The address given is a link-in-bio page, not a website of its own, so there are no pages to read.' : 'The audit has no website, so there are no pages to read.');
  const start = publicWebsiteUrl(website).href;
  const competitors = ctx.outputs.competitors as { pages?: SitePage[] } | undefined;
  return readSitePages(canonicalPage(start, start) ?? start, { deadline: ctx.deadline - 2_000, competitors: ctx.audit.competitors, known: Array.isArray(competitors?.pages) ? competitors!.pages : [] });
}
