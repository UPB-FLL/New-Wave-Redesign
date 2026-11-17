import { GROUNDSWELL_CONFIG } from '../../../packages/groundswell/groundswell.config.js';
import { forbiddenIn } from '../../../packages/groundswell/src/plans.js';
import { allowedNumbers, buildFacts, unsupportedNumbers, type Facts } from './model.js';
import { chatJson, GROUNDSWELL_MODEL } from './openai.js';
import type { StepContext } from './types.js';
import { isSitePagesOutput, type SitePage } from './currents/sitePages.js';

/**
 * The visibility step (after `plans`, optional) and the staff brief it feeds
 * (`deliver_internal`, reportsInternal.ts). Owner's ask (2026-11-17, from
 * Baraguz's audit): a second report that is not customer facing, with the
 * keywords to use and the searches in them, the copy to add, and the items
 * that improve visibility at once; then those items in the first month of
 * the client's plan.
 *
 * Everything but the copy is computed here from the run's data. The copy is
 * one model call, held to the page limits, the data's numbers, the setup
 * file's unsupported claims and the health claims below; without the model
 * a title from a template stands in.
 */

export type KeywordKind = 'near_miss' | 'gap' | 'protect' | 'idea';

export interface TargetKeyword {
  keyword: string;
  kind: KeywordKind;
  /** Monthly searches: Keyword Planner's for a gap or an idea, Ahrefs' estimate for a ranking; null when not measured. */
  searches: number | null;
  /** Where the site ranks today (Ahrefs, US); null when it does not rank. */
  position: number | null;
  low_bid_usd: number | null;
  high_bid_usd: number | null;
  competition: string | null;
  /** The page to work on: the ranking page, the best matching page read, or null for a new page. */
  page: string | null;
}

export type CopyField = 'title' | 'meta_description' | 'h1' | 'intro' | 'faq';

export interface CopyChange {
  page: string;
  field: CopyField;
  current: string | null;
  proposed: string;
  /** For an FAQ, the question; `proposed` is the answer. */
  question?: string;
  keyword: string | null;
}

export type WinArea = 'website' | 'google' | 'social' | 'ai' | 'tracking' | 'search';

export interface QuickWin {
  id: string;
  week: 1 | 2 | 3 | 4;
  area: WinArea;
  title: string;
  evidence: string;
  action: string;
  /** False for a staff-only note: it stays in the brief and never reaches the client's plan. */
  client: boolean;
}

export interface VisibilityOutput {
  generated_at: string;
  /** The market the keyword demand was read for (the keywords step's geography). */
  market: string | null;
  demand: 'measured' | 'unavailable';
  keywords: TargetKeyword[];
  copy: CopyChange[];
  /** How the copy was written: by the model, from a template, or not at all. */
  copy_source: 'model' | 'template' | 'none';
  quick_wins: QuickWin[];
  month: { week: 1 | 2 | 3 | 4; items: string[] }[];
  dropped: string[];
  model: string | null;
  sources: string[];
  note: string | null;
}

export function isVisibilityOutput(x: unknown): x is VisibilityOutput {
  const v = x as VisibilityOutput | null;
  return !!v && typeof v === 'object' && Array.isArray(v.keywords) && Array.isArray(v.quick_wins) && Array.isArray(v.month);
}

// ---------------------------------------------------------------------------
// Keywords

/** Ranking positions 4 to 20: the searches where a page already shows and a better page moves it up. */
export const NEAR_MISS = { from: 4, to: 20 } as const;
/** The fewest monthly searches a keyword needs to be a target (Ahrefs and Keyword Planner both round small volumes to 10). */
export const MIN_SEARCHES = 10;
export const LIMITS = { near_miss: 10, gap: 12, protect: 6, idea: 6 } as const;
/** Above this many monthly searches a gap is a head term ("green tea", 135,000): listed after the reachable ones. */
export const HEAD_TERM = 10_000;
/** Searches about losing weight: a page answering one must make no weight-loss promise (FTC rules on health claims). */
export const WEIGHT_LOSS = /\b(?:weight|fat|belly|slim(?:ming)?|lose|losing|diet)\b/i;

const STOP = new Set('a an and are as at be best buy by can do does for from how i in is it my near of on or the to what when where which who why with you your vs'.split(' '));
export const fold = (s: string) => s.toLowerCase().replace(/[’']/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
export const contentWords = (s: string) => fold(s).split(' ').filter((w) => w.length > 2 && !STOP.has(w));

/** Words of the business's name (four letters or more): a keyword holding one is a brand search. */
export function brandWords(name: string): string[] {
  return contentWords(name).filter((w) => w.length >= 4);
}

const isBrand = (keyword: string, brand: string[]) => contentWords(keyword).some((w) => brand.some((b) => w.startsWith(b)));

/**
 * The page read whose title, H1 and headings share the most words with the
 * keyword, when they share all of a short keyword's words and three in four
 * of a longer one's (one shared "tea" would send every search to the
 * homepage); null otherwise.
 */
export function bestPage(keyword: string, pages: SitePage[]): string | null {
  const want = new Set(contentWords(keyword));
  // Every word of a short keyword ("green tea supplements" is not the tea homepage), three in four of a longer one.
  const need = want.size <= 3 ? want.size : Math.ceil(want.size * 0.75);
  let best: { url: string; score: number } | null = null;
  for (const p of pages) {
    if (p.error) continue;
    const have = new Set(contentWords([p.title, p.h1, ...p.headings, p.path.replace(/[/-]/g, ' ')].filter(Boolean).join(' ')));
    const score = [...want].filter((w) => have.has(w)).length;
    if (score >= need && score > 0 && (!best || score > best.score)) best = { url: p.url, score };
  }
  return best?.url ?? null;
}

/**
 * The keywords to work on, from the data only: near misses (the site ranks 4
 * to 20 today), gaps (Keyword Planner measured searches the site does not
 * rank for), the rankings to protect (1 to 3), and unmeasured ideas. Brand
 * searches are left out of the gaps (the site wins them already).
 */
export function targetKeywords(f: Facts): TargetKeyword[] {
  const brand = brandWords(f.business.name);
  const pages = f.site_pages?.pages ?? [];
  const ranked = (f.search?.business?.top_keywords ?? []).filter((k) => k.keyword && k.position !== null);
  const rankedSet = new Set(ranked.map((k) => fold(k.keyword)));
  const out: TargetKeyword[] = [];
  const row = (k: (typeof ranked)[number], kind: KeywordKind): TargetKeyword => ({ keyword: k.keyword, kind, searches: k.volume, position: k.position, low_bid_usd: null, high_bid_usd: null, competition: null, page: k.url });
  out.push(
    ...ranked
      .filter((k) => k.position! >= NEAR_MISS.from && k.position! <= NEAR_MISS.to && (k.volume ?? 0) >= MIN_SEARCHES)
      .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0) || a.position! - b.position!)
      .slice(0, LIMITS.near_miss)
      .map((k) => row(k, 'near_miss'))
  );
  const ideas = f.keywords?.ideas ?? [];
  const measured = f.keywords?.demand_status === 'measured';
  if (measured) {
    out.push(
      ...ideas
        .filter((i) => i.monthly_searches !== null && i.monthly_searches >= MIN_SEARCHES && !rankedSet.has(fold(i.keyword)) && !isBrand(i.keyword, brand))
        // The reachable searches first, the largest first; head terms after them.
        .sort((a, b) => Number((a.monthly_searches ?? 0) > HEAD_TERM) - Number((b.monthly_searches ?? 0) > HEAD_TERM) || (b.monthly_searches ?? 0) - (a.monthly_searches ?? 0))
        .slice(0, LIMITS.gap)
        .map((i) => ({ keyword: i.keyword, kind: 'gap' as const, searches: i.monthly_searches, position: null, low_bid_usd: i.low_bid_usd, high_bid_usd: i.high_bid_usd, competition: i.competition, page: bestPage(i.keyword, pages) }))
    );
  }
  out.push(
    ...ranked
      .filter((k) => k.position! <= 3 && (k.volume ?? 0) >= MIN_SEARCHES)
      .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
      .slice(0, LIMITS.protect)
      .map((k) => row(k, 'protect'))
  );
  const seen = new Set(out.map((k) => fold(k.keyword)));
  out.push(
    ...ideas
      .filter((i) => (!measured || i.monthly_searches === null) && !seen.has(fold(i.keyword)) && !isBrand(i.keyword, brand))
      .slice(0, LIMITS.idea)
      .map((i) => ({ keyword: i.keyword, kind: 'idea' as const, searches: i.monthly_searches, position: null, low_bid_usd: i.low_bid_usd, high_bid_usd: i.high_bid_usd, competition: i.competition, page: bestPage(i.keyword, pages) }))
  );
  return out;
}

// ---------------------------------------------------------------------------
// Quick wins

/** Social handles a theme ships with: a link to one is a placeholder nobody replaced. */
const PLACEHOLDER_HANDLES = new Set(['yourbusiness', 'yourpage', 'yourcompany', 'yourbrand', 'yourname', 'username', 'example', 'shopify', 'pages', 'facebook', 'instagram']);
export const isPlaceholderHandle = (h: string) => PLACEHOLDER_HANDLES.has(h.toLowerCase().replace(/[^a-z0-9]/g, ''));

/** A locale copy of a page ("/en-au", "/fr-ca/…"), which belongs to another country's shoppers. */
const LOCALE_PATH = /^\/[a-z]{2}-[a-z]{2}(?:\/|$)/i;

const pct = (x: number) => (x < 0.1 ? x.toFixed(2) : x.toFixed(1));

/**
 * The fixes that improve visibility at once, each with the evidence that calls
 * for it and the week it belongs in. Week 1: broken or missing basics
 * (placeholders, the listing, tracking, Search Console); week 2: the copy;
 * week 3: the near misses and the pages' gaps; week 4: a page for the largest
 * gap and the AI files.
 */
export function quickWins(f: Facts, keywords: TargetKeyword[]): QuickWin[] {
  const out: QuickWin[] = [];
  const add = (w: QuickWin) => out.push(w);
  const site = f.site?.business ?? null;
  const pages = (f.site_pages?.pages ?? []).filter((p) => !p.error);
  const host = (() => { try { return new URL(site?.final_url ?? site?.url ?? f.business.website ?? '').hostname.replace(/^www\./, ''); } catch { return null; } })();

  // Week 1: what is broken or missing.
  for (const h of site?.social.facebook ?? []) if (isPlaceholderHandle(h)) add({ id: `placeholder:facebook:${h}`, week: 1, area: 'website', title: 'Replace the placeholder Facebook link', evidence: `The website links to facebook.com/${h}, the theme’s sample address.`, action: 'Point the site’s Facebook link at the business’s own Page, and remove it from the footer until there is one.', client: true });
  for (const h of site?.social.instagram ?? []) if (isPlaceholderHandle(h)) add({ id: `placeholder:instagram:${h}`, week: 1, area: 'website', title: 'Replace the placeholder Instagram link', evidence: `The website links to instagram.com/${h}, the theme’s sample address.`, action: 'Point the site’s Instagram link at the business’s own profile.', client: true });
  const fb = f.social?.facebook;
  if (fb?.exists && fb.page_name && isPlaceholderHandle(fb.page_name)) add({ id: 'placeholder:facebook-page', week: 1, area: 'social', title: 'Rename the Facebook Page', evidence: `The Facebook Page the site links to is named “${fb.page_name}” (${fb.likes ?? 0} likes).`, action: 'Give the Page the business’s name and profile details, or unpublish it if it is not the business’s.', client: true });
  const listing = f.maps?.business;
  if (listing) {
    const gaps = [!listing.address && 'no address', !listing.category && 'no category', !listing.hours?.length && 'no hours'].filter(Boolean) as string[];
    if (gaps.length) add({ id: 'gbp:basics', week: 1, area: 'google', title: 'Complete the Google Business Profile', evidence: `The Google listing “${listing.name ?? f.business.name}” shows ${gaps.join(', ')}.`, action: `Add the ${gaps.map((g) => g.replace('no ', '')).join(', ')} in the Business Profile, using the same name, address and phone as the website.`, client: true });
    if (listing.phone && site && !site.phones.length) add({ id: 'nap:phone', week: 1, area: 'website', title: 'Show the phone number on the website', evidence: `The Google listing gives ${listing.phone}; the website’s homepage shows no phone number.`, action: 'Put the listing’s phone number in the header or footer, written the same way, so search engines match the two.', client: true });
  }
  if (!f.linked?.services.some((s) => s.ok && /search console/i.test(s.label))) add({ id: 'gsc', week: 1, area: 'search', title: 'Verify Search Console and submit the sitemap', evidence: 'No Search Console property was read for this run.', action: `Verify ${host ?? 'the domain'} as a domain property in Search Console and submit /sitemap.xml, so the changes below can be measured.`, client: true });
  if (site?.tracking && !site.tracking.meta_pixel && (f.social?.business?.exists || fb?.exists)) add({ id: 'pixel:meta', week: 1, area: 'tracking', title: 'Install the Meta pixel', evidence: 'The website carries no Meta pixel, though the business is active on Instagram.', action: 'Install the Meta pixel with purchase or lead events before any Meta ads run, so they can be measured and retargeted.', client: true });
  const ig = f.social?.business;
  if (ig?.exists && ig.is_business === false) add({ id: 'ig:professional', week: 1, area: 'social', title: 'Switch Instagram to a professional account', evidence: `@${ig.handle} is a personal account.`, action: 'Switch to a business (professional) account for insights, contact buttons and shopping tags.', client: true });
  if (ig?.exists && ig.followers && ig.followers >= 5_000 && ig.avg_likes_recent !== null && ig.avg_likes_recent !== undefined) {
    const rate = ((ig.avg_likes_recent + (ig.avg_comments_recent ?? 0)) / ig.followers) * 100;
    if (rate < 0.1) add({ id: 'ig:audience', week: 1, area: 'social', title: 'Check the Instagram audience before quoting it', evidence: `@${ig.handle}: ${ig.followers.toLocaleString('en-US')} followers, about ${ig.avg_likes_recent} likes and ${ig.avg_comments_recent ?? 0} comments a recent post (${pct(rate)}% engagement).`, action: 'Staff only: an engagement this low usually means an inactive or bought audience. Ask the owner how it was built; do not use the follower count as a selling point or a lookalike seed until it is understood.', client: false });
  }
  const localeHits = (f.search?.serp?.queries ?? []).flatMap((q) => q.organic.filter((r) => { try { const u = new URL(r.url); return (!host || u.hostname.replace(/^www\./, '') === host) && LOCALE_PATH.test(u.pathname); } catch { return false; } }).map((r) => ({ q: q.query, r })));
  if (localeHits.length) add({ id: 'hreflang', week: 1, area: 'search', title: 'Keep other countries’ pages out of US results', evidence: `A US search for “${localeHits[0].q}” shows ${new URL(localeHits[0].r.url).pathname} at position ${localeHits[0].r.position}.`, action: 'Check the store’s markets: each locale page needs hreflang tags and its own canonical, so US shoppers land on the US page and prices.', client: true });

  const weightLoss = keywords.filter((k) => (k.kind === 'gap' || k.kind === 'near_miss') && WEIGHT_LOSS.test(k.keyword));
  if (weightLoss.length) add({ id: 'claims:weight-loss', week: 2, area: 'website', title: 'Write the weight-loss pages without health claims', evidence: `${weightLoss.length} of the target searches are about losing weight (${weightLoss.slice(0, 3).map((k) => `“${k.keyword}”`).join(', ')}).`, action: 'Staff only: answer these searches with what the product is and how to use it; no promise of weight or fat loss, no “burns”, “melts” or “detoxes”, and every structure/function statement with the FDA disclaimer. Have the owner approve the wording.', client: false });

  // Week 2: the basics of each page read.
  const noDescription = pages.filter((p) => !p.description);
  if (noDescription.length) add({ id: 'meta:description', week: 2, area: 'website', title: `Write meta descriptions for ${noDescription.length} page${noDescription.length === 1 ? '' : 's'}`, evidence: `No meta description: ${noDescription.slice(0, 4).map((p) => p.path).join(', ')}.`, action: 'Paste the descriptions from the copy section (up to 155 characters, the page’s keyword in the first half).', client: true });
  const noTitle = pages.filter((p) => !p.title);
  if (noTitle.length) add({ id: 'meta:title', week: 2, area: 'website', title: `Give ${noTitle.length} page${noTitle.length === 1 ? '' : 's'} a title tag`, evidence: `No title: ${noTitle.slice(0, 4).map((p) => p.path).join(', ')}.`, action: 'Add a title of up to 60 characters, the keyword first and the brand last.', client: true });
  // No H1 check here: a page read as main content can lose its heading, so a missing H1 is not evidence.
  const soldOut = pages.filter((p) => /sold\s*out/i.test(p.title ?? ''));
  if (soldOut.length) add({ id: 'title:sold-out', week: 2, area: 'website', title: 'Take “SOLD OUT” out of title tags', evidence: `${soldOut[0].path}: “${soldOut[0].title}”.`, action: 'Show stock on the page, not in the title Google shows; restock or redirect pages that stay sold out.', client: true });
  const empty = site?.technical_seo?.images?.empty_alt ?? 0;
  if (empty > 0) add({ id: 'alt', week: 2, area: 'website', title: `Describe ${empty} image${empty === 1 ? '' : 's'} on the homepage`, evidence: `${empty} of ${site?.technical_seo?.images?.total ?? empty} homepage images have empty alt text.`, action: 'Write short alt text naming the product in each picture; leave decorative images empty.', client: true });

  // Week 3: the near misses.
  const near = keywords.filter((k) => k.kind === 'near_miss').slice(0, 5);
  if (near.length) add({ id: 'near-miss', week: 3, area: 'search', title: `Move ${near.length} near-miss search${near.length === 1 ? '' : 'es'} onto page one’s top half`, evidence: near.map((k) => `“${k.keyword}” (${k.searches ?? '?'} a month, position ${k.position})`).join('; ') + '.', action: 'On each ranking page: put the exact question in a heading, answer it in the first two sentences, add an FAQ block, and link to it from the homepage and the related product.', client: true });
  const thin = (f.ai_search?.pages ?? []).filter((p) => p.checks.some((c) => c.key === 'depth' && c.earned === 0));
  if (thin.length) add({ id: 'thin', week: 3, area: 'website', title: `Fill out ${thin.length} thin page${thin.length === 1 ? '' : 's'}`, evidence: `Under 100 words of readable content: ${thin.slice(0, 4).map((p) => p.path).join(', ')}.`, action: 'Put the ingredients, how to use it and the FAQs in the page text (not only in tabs or images), so search engines and assistants can quote it.', client: true });

  // Week 4: new pages and the AI files.
  const gap = keywords.find((k) => k.kind === 'gap' && !k.page);
  if (gap) add({ id: 'new-page', week: 4, area: 'search', title: `Publish a page for “${gap.keyword}”`, evidence: `${gap.searches} searches a month (Keyword Planner); no page read covers it.`, action: 'Write a page answering that search: the answer first, then the product that fits, with an FAQ and links from the homepage.', client: true });
  const ai = f.ai_search;
  if (ai) {
    if (ai.crawlers.agents.some((a) => a.verdict === 'blocked')) add({ id: 'ai:crawlers', week: 4, area: 'ai', title: 'Let the AI search crawlers in', evidence: `robots.txt blocks ${ai.crawlers.agents.filter((a) => a.verdict === 'blocked').map((a) => a.agent).join(', ')}.`, action: 'Allow OAI-SearchBot, PerplexityBot and the other answer engines’ crawlers in robots.txt (training crawlers are the owner’s call).', client: true });
    if (ai.files && !ai.files.llms_txt.found) add({ id: 'ai:llms', week: 4, area: 'ai', title: 'Publish /llms.txt', evidence: 'The site has no /llms.txt.', action: 'Publish a short llms.txt naming the business, what it sells and its key pages.', client: true });
    if (!ai.entity || !(ai.entity.has_organization || ai.entity.has_local_business) || !ai.entity.has_id) add({ id: 'ai:entity', week: 4, area: 'ai', title: 'Give the business one schema entity', evidence: ai.entity ? 'The homepage schema has no business node with a stable @id.' : 'The homepage schema could not be read as a business entity.', action: 'One Organization (or LocalBusiness) node with an @id, the exact name, logo, contact and sameAs links to the profiles the owner confirms.', client: true });
  }
  // Within a week, what moves visibility most comes first: the listing and Search Console before the tidy-ups.
  const rank = (w: QuickWin) => { const i = WEEK_ORDER.findIndex((p) => w.id.startsWith(p)); return i < 0 ? WEEK_ORDER.length : i; };
  return out.map((w, i) => ({ w, i })).sort((a, b) => a.w.week - b.w.week || rank(a.w) - rank(b.w) || a.i - b.i).map((x) => x.w);
}

/** The order within a week, by id prefix (the rest keep the order they were found in). */
export const WEEK_ORDER = ['gbp:', 'gsc', 'placeholder:facebook:', 'placeholder:instagram:', 'hreflang', 'nap:', 'pixel:', 'ig:professional', 'placeholder:facebook-page', 'meta:', 'title:', 'alt', 'near-miss', 'thin', 'new-page', 'ai:'];

// ---------------------------------------------------------------------------
// The first month

/** Four weeks of work: the quick wins in their weeks, the copy in week 2. */
export function firstMonth(wins: QuickWin[], copy: CopyChange[], clientOnly = false): { week: 1 | 2 | 3 | 4; items: string[] }[] {
  const pages = [...new Set(copy.map((c) => c.page))];
  return ([1, 2, 3, 4] as const).map((week) => {
    const items = wins.filter((w) => w.week === week && (!clientOnly || w.client)).map((w) => `${w.title}.`);
    if (week === 2 && pages.length) items.unshift(`Paste the new titles, descriptions and headings on ${pages.length} page${pages.length === 1 ? '' : 's'} (${pages.map(pathOf).slice(0, 3).join(', ')}).`);
    return { week, items };
  });
}

export const pathOf = (url: string) => {
  try { return new URL(url).pathname || '/'; } catch { return url; }
};

/** How many of a week's client items the client's plan carries: the brief has the rest. */
export const PER_WEEK = { 1: 4, 2: 3, 3: 3, 4: 3 } as const;

/**
 * The client's plan with the first month's client items first: weeks 1–2 lead
 * Weeks 1–2, weeks 3–4 lead Weeks 3–6, each week's share capped (PER_WEEK),
 * and the write-up's own items after them; each list keeps at least one of
 * the write-up's items when it had one.
 */
export function planWithFirstMonth<P extends { weeks_1_2: string[]; weeks_3_6: string[]; weeks_7_12: string[] }>(plan: P, v: VisibilityOutput | null, cap = 8): P {
  if (!v) return plan;
  const month = firstMonth(v.quick_wins, v.copy, true);
  const lead = (weeks: (1 | 2 | 3 | 4)[]) => weeks.flatMap((w) => (month.find((m) => m.week === w)?.items ?? []).slice(0, PER_WEEK[w]));
  const merge = (first: string[], rest: string[]) => {
    const seen = new Set<string>();
    const fresh = (s: string) => { const k = fold(s); if (!k || seen.has(k)) return false; seen.add(k); return true; };
    const ours = first.filter(fresh);
    const theirs = rest.filter(fresh);
    return [...ours.slice(0, cap - Math.min(1, theirs.length)), ...theirs].slice(0, cap);
  };
  return { ...plan, weeks_1_2: merge(lead([1, 2]), plan.weeks_1_2), weeks_3_6: merge(lead([3, 4]), plan.weeks_3_6) };
}

// ---------------------------------------------------------------------------
// Copy

/** Character limits, as search results show them. */
export const COPY_LIMITS = { title: 60, meta_description: 155, h1: 70, intro: 650, question: 110, answer: 420 } as const;
export const COPY_PAGES = 5;

/** Claims a health or wellness page may not make without proof (FTC and FDA rules on structure/function claims). */
export const HEALTH_CLAIMS = ['cure', 'cures', 'treat', 'treats', 'treatment', 'heal', 'heals', 'prevent', 'prevents', 'diagnose', 'clinically proven', 'proven', 'miracle', 'melt fat', 'burn fat', 'fat burning', 'detoxify your liver'];

export interface CopyTarget {
  page: string;
  path: string;
  title: string | null;
  description: string | null;
  h1: string | null;
  headings: string[];
  excerpt: string;
  keywords: string[];
}

/** The pages to write for: the homepage, then the pages the targets point at, near misses and gaps first. */
export function copyTargets(f: Facts, keywords: TargetKeyword[]): CopyTarget[] {
  const pages = (f.site_pages?.pages ?? []).filter((p) => !p.error && p.word_count > 0);
  const byUrl = new Map(pages.map((p) => [p.url.replace(/\/$/, ''), p]));
  const out = new Map<string, CopyTarget>();
  const target = (url: string, kw: string | null) => {
    const p = byUrl.get(url.replace(/\/$/, ''));
    if (!p) return;
    const t = out.get(p.url) ?? { page: p.url, path: p.path, title: p.title, description: p.description, h1: p.h1, headings: p.headings.slice(0, 12), excerpt: p.excerpt.slice(0, 900), keywords: [] };
    if (kw && !t.keywords.includes(kw)) t.keywords.push(kw);
    if (out.size < COPY_PAGES || out.has(p.url)) out.set(p.url, t);
  };
  // A keyword carrying a claim the copy may not make ("best green tea") is not one to write to, nor a head term.
  const usable = keywords.filter((k) => (k.kind === 'near_miss' || k.kind === 'gap') && k.page && (k.searches ?? 0) <= HEAD_TERM && !forbiddenIn(k.keyword, [...GROUNDSWELL_CONFIG.unsupported_claims, ...HEALTH_CLAIMS], []).length);
  // The homepage takes the first place when a keyword points at it.
  const home = pages.find((p) => p.path === '/' || p.path === '');
  if (home && usable.some((k) => k.page && k.page.replace(/\/$/, '') === home.url.replace(/\/$/, ''))) target(home.url, null);
  for (const k of usable) target(k.page!, k.keyword);
  // Each page's keywords, those its own title already holds first ("slim tea" on a slim tea homepage).
  for (const t of out.values()) {
    const own = new Set(contentWords(`${t.title ?? ''} ${t.h1 ?? ''}`));
    const held = (kw: string) => contentWords(kw).filter((w) => own.has(w)).length / Math.max(1, contentWords(kw).length);
    t.keywords.sort((a, b) => held(b) - held(a));
    t.keywords.splice(3);
  }
  return [...out.values()].filter((t) => t.keywords.length);
}

const titleCase = (s: string) => s.replace(/\b\p{L}/gu, (c) => c.toUpperCase());

/** Without the model: a title per target page, its first keyword first and the brand last, when it fits. */
export function templateCopy(targets: CopyTarget[], brand: string): CopyChange[] {
  return targets.flatMap((t) => {
    const kw = t.keywords[0];
    if (!kw) return [];
    const proposed = `${titleCase(kw)} | ${brand}`;
    return proposed.length <= COPY_LIMITS.title ? [{ page: t.page, field: 'title' as const, current: t.title, proposed, keyword: kw }] : [];
  });
}

export const COPY_SYSTEM = `You write search copy for a small business's existing web pages, for New Wave: Social Engineering's staff, from the data given.
For each page in "pages", write: title (at most 60 characters, the page's first keyword near the start, the brand last), meta_description (120 to 155 characters, the keyword in the first half, one reason to click), h1 (at most 70 characters), intro (two or three sentences, 40 to 90 words, answering the keyword's search directly) and two or three faqs ({"question","answer"}; questions in the words people search, answers of at most 60 words).
Rules: use only facts that appear in the page's own text, headings or the business data. Never add a number, price, percentage, time or count that is not in the data. Never claim a product cures, treats, prevents or heals anything, or promise weight loss or a result. Never write "best", "#1", "top-rated", "guaranteed" or name a competitor. Keep the brand's own product names as written.
Answer with JSON: {"pages":[{"page":"<the page's url as given>","title":"...","meta_description":"...","h1":"...","intro":"...","faqs":[{"question":"...","answer":"..."}]}]}`;

/** The writer's answer, held to the rules: a field that breaks one is dropped and named; a page not asked for is dropped. */
export function checkCopy(raw: unknown, targets: CopyTarget[], rules: { unsupported: (text: string) => string[]; claims: readonly string[] }): { copy: CopyChange[]; dropped: string[] } {
  const copy: CopyChange[] = [];
  const dropped: string[] = [];
  const pagesIn = Array.isArray((raw as { pages?: unknown })?.pages) ? ((raw as { pages: unknown[] }).pages) : [];
  const byUrl = new Map(targets.map((t) => [t.page.replace(/\/$/, ''), t]));
  const str = (x: unknown) => (typeof x === 'string' ? x.replace(/\s+/g, ' ').trim() : '');
  for (const item of pagesIn) {
    const r = (item ?? {}) as Record<string, unknown>;
    const t = byUrl.get(str(r.page).replace(/\/$/, ''));
    if (!t) { if (str(r.page)) dropped.push(`${str(r.page)}: not a page that was asked for.`); continue; }
    const keyword = t.keywords[0] ?? null;
    const ok = (text: string, what: string, limit: number) => {
      if (!text) return false;
      if (text.length > limit) { dropped.push(`${t.path} ${what}: ${text.length} characters, over ${limit}.`); return false; }
      const nums = rules.unsupported(text);
      if (nums.length) { dropped.push(`${t.path} ${what}: ${nums.join(', ')} is not in the data.`); return false; }
      const bad = forbiddenIn(text, [...rules.claims, ...HEALTH_CLAIMS], []);
      if (bad.length) { dropped.push(`${t.path} ${what}: “${bad[0]}” is a claim the rules do not allow.`); return false; }
      return true;
    };
    const field = (f: Exclude<CopyField, 'faq'>, current: string | null, limit: number) => {
      const text = str(r[f]);
      if (ok(text, f.replace('_', ' '), limit)) copy.push({ page: t.page, field: f, current, proposed: text, keyword });
    };
    field('title', t.title, COPY_LIMITS.title);
    field('meta_description', t.description, COPY_LIMITS.meta_description);
    field('h1', t.h1, COPY_LIMITS.h1);
    field('intro', null, COPY_LIMITS.intro);
    for (const fq of (Array.isArray(r.faqs) ? r.faqs : []).slice(0, 3)) {
      const q = str((fq as Record<string, unknown>)?.question);
      const a = str((fq as Record<string, unknown>)?.answer);
      if (ok(q, 'FAQ question', COPY_LIMITS.question) && ok(a, 'FAQ answer', COPY_LIMITS.answer)) copy.push({ page: t.page, field: 'faq', current: null, question: q, proposed: a, keyword });
    }
  }
  return { copy, dropped };
}

// ---------------------------------------------------------------------------
// The step

/** Everything but the copy, from the data: the delivery step's stand-in when the step did not run. */
export function visibilityFromFacts(f: Facts): VisibilityOutput {
  const keywords = targetKeywords(f);
  const quick = quickWins(f, keywords);
  const targets = copyTargets(f, keywords);
  const copy = templateCopy(targets, f.business.name);
  return {
    generated_at: new Date().toISOString(),
    market: f.keywords?.geography?.label ?? null,
    demand: f.keywords?.demand_status === 'measured' ? 'measured' : 'unavailable',
    keywords,
    copy,
    copy_source: copy.length ? 'template' : 'none',
    quick_wins: quick,
    month: firstMonth(quick, copy),
    dropped: [],
    model: null,
    sources: sourcesFor(f),
    note: null,
  };
}

export function sourcesFor(f: Facts): string[] {
  return [
    f.keywords?.source && f.keywords.demand_status === 'measured' ? `Keyword demand: ${f.keywords.source} (${f.keywords.fetched_at?.slice(0, 10) ?? ''})` : null,
    f.search?.business?.top_keywords.length ? `Rankings: ${f.search.source} (${f.search.fetched_at.slice(0, 10)})` : null,
    f.site_pages?.pages.some((p) => !p.error) ? `${f.site_pages.source} (${f.site_pages.fetched_at.slice(0, 10)})` : null,
    f.site?.business ? `Website scan (${f.site.business.fetched_at.slice(0, 10)})` : null,
    f.maps ? `${f.maps.source} (${f.maps.fetched_at.slice(0, 10)})` : null,
    f.social ? `${f.social.source} (${f.social.fetched_at.slice(0, 10)})` : null,
    f.ai_search ? `${f.ai_search.source} (${f.ai_search.fetched_at.slice(0, 10)})` : null,
  ].filter((s): s is string => Boolean(s));
}

export async function runVisibility(ctx: StepContext): Promise<VisibilityOutput> {
  const f = buildFacts(ctx.audit, ctx.outputs);
  if (!isSitePagesOutput(ctx.outputs.site_pages)) f.site_pages = null;
  const base = visibilityFromFacts(f);
  const targets = copyTargets(f, base.keywords);
  if (!targets.length || !process.env.OPENAI_API_KEY) {
    return { ...base, note: targets.length ? 'The writer was not configured, so the titles come from a template.' : 'No page read had content to write copy for.' };
  }
  const input = { business: { name: f.business.name, offer: f.profile?.offer ?? null, services: f.profile?.services ?? [], audience: f.profile?.audience ?? null }, pages: targets };
  const allowed = allowedNumbers(input);
  try {
    const timeout = Math.max(30_000, Math.min(120_000, ctx.deadline - Date.now() - 5_000));
    const raw = await chatJson<Record<string, unknown>>(COPY_SYSTEM, `Data (JSON):\n${JSON.stringify(input)}`, timeout);
    const { copy, dropped } = checkCopy(raw, targets, { unsupported: (t) => unsupportedNumbers(t, allowed), claims: GROUNDSWELL_CONFIG.unsupported_claims });
    if (!copy.length) return { ...base, dropped, note: 'The writer’s copy broke the rules on every field, so the titles come from a template.' };
    return { ...base, copy, copy_source: 'model', month: firstMonth(base.quick_wins, copy), dropped, model: GROUNDSWELL_MODEL() };
  } catch (err) {
    return { ...base, note: `The writer did not answer (${err instanceof Error ? err.message.slice(0, 120) : 'unknown error'}), so the titles come from a template.` };
  }
}
