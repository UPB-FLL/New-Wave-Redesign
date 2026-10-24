import { chatJson } from './openai.js';
import { categoryFromText, specificCategory } from './currents/serp.js';
import type { SitePage } from './currents/sitePages.js';
import type { SiteScan } from './currents/site.js';

/**
 * What the business does, in its own words, and whether another business
 * competes with it.
 *
 * The profile comes from the business's website (the homepage scan and the
 * pages Firecrawl read): one OpenAI call names the category, the offer, the
 * services, the audience and the service area, and suggests the searches a
 * customer would make. Every answer is held to the site's text: a category or
 * service whose words do not appear on the site is dropped, and without OpenAI
 * the first-party wording rules in serp.ts stand in.
 *
 * Relevance: a competitor is a business a customer of this one might choose
 * instead. Candidates (Places listings, search results) first pass a word
 * check (the listing's category, title and snippet must share a category word
 * with the profile, so a general contractor never sits next to a health coach),
 * then one OpenAI call decides the rest with a reason each. Without OpenAI the
 * word check alone decides.
 */

export type ServiceArea = 'local' | 'regional' | 'national' | 'online';

export interface BusinessProfile {
  category: string | null;
  offer: string | null;
  services: string[];
  audience: string | null;
  service_area: ServiceArea | null;
  /** Searches a customer would make ("functional health coach jacksonville beach"), for the competitor and search steps. */
  competitor_queries: string[];
  /** Subjects the site writes about, for the content plan. */
  content_topics: string[];
  /** How the profile was made: the model from the site, the site's wording rules, a listing label, or nothing. */
  source: 'model' | 'website' | 'listing' | 'none';
  /** The pages (or scan) the profile rests on. */
  evidence: string[];
}

export const isOpenAiConfigured = () => Boolean(process.env.OPENAI_API_KEY);

const STOP = new Set(['and', 'the', 'of', 'for', 'in', 'on', 'at', 'to', 'a', 'an', 'with', 'by', 'or', 'our', 'your', 'you', 'we', 'us', 'llc', 'inc', 'co', 'company', 'services', 'service', 'local', 'near', 'me', 'best', 'top', 'home', 'page', 'official', 'site', 'website', 'welcome', 'fl', 'florida', 'usa', 'united', 'states', 'area', 'areas', 'from', 'that', 'this', 'all', 'more', 'new']);

/** A word's stem, roughly: coaching → coach, coaches → coach, studios → studio. */
export function stem(word: string): string {
  let w = word.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith('ies')) w = `${w.slice(0, -3)}y`;
  else if (w.length > 4 && w.endsWith('es') && !w.endsWith('ses')) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  return w;
}

/** The content words of a text as stems, without stop words, numbers or the place's own name. */
export function contentWords(text: string | null | undefined, exclude: string[] = []): Set<string> {
  const skip = new Set(exclude.flatMap((e) => (e ?? '').toLowerCase().split(/[^a-z0-9]+/).map(stem)).filter(Boolean));
  const out = new Set<string>();
  for (const raw of (text ?? '').toLowerCase().split(/[^a-z0-9]+/)) {
    if (!raw || raw.length < 3 || /^\d+$/.test(raw) || STOP.has(raw)) continue;
    const s = stem(raw);
    if (s.length >= 3 && !skip.has(s)) out.add(s);
  }
  return out;
}

const text = (v: unknown, max = 200): string | null => (typeof v === 'string' && v.trim() ? v.replace(/\s+/g, ' ').trim().slice(0, max) : null);
const list = (v: unknown, n: number, max = 120): string[] => (Array.isArray(v) ? v.map((x) => text(x, max)).filter((x): x is string => Boolean(x)).slice(0, n) : []);
const AREAS: ServiceArea[] = ['local', 'regional', 'national', 'online'];

/** The words the profile rests on: the scan's title, description and headings, and each page's title, headings and excerpt. */
export function profileText(scan: Pick<SiteScan, 'title' | 'meta_description' | 'h1'> | null | undefined, pages: SitePage[] = []): string {
  const parts = [scan?.title, scan?.meta_description, ...(scan?.h1 ?? [])];
  for (const p of pages) parts.push(p.title, p.description, p.h1, ...p.headings, p.excerpt);
  return parts.filter(Boolean).join('\n');
}

/** Every content word of `phrase` appears in `corpus`. */
const grounded = (phrase: string, corpus: Set<string>) => {
  const words = [...contentWords(phrase)];
  return words.length > 0 && words.every((w) => corpus.has(w));
};

/** The model's answer held to the site's words; `fallback` is the first-party wording rule's category. */
export function checkProfile(raw: unknown, siteText: string, fallback: string | null, evidence: string[]): BusinessProfile {
  const r = (raw ?? {}) as Record<string, unknown>;
  const corpus = contentWords(siteText);
  const category = (() => {
    const c = specificCategory(text(r.category, 60));
    return c && !/\d/.test(c) && grounded(c, corpus) ? c : null;
  })();
  const services = list(r.services, 8, 80).filter((s) => !/\d/.test(s) && grounded(s, corpus));
  const area = text(r.service_area, 20)?.toLowerCase();
  const offer = text(r.offer, 240);
  return {
    category: category ?? fallback,
    offer: offer && !/\d/.test(offer) ? offer : null,
    services,
    audience: text(r.audience, 160),
    service_area: AREAS.includes(area as ServiceArea) ? (area as ServiceArea) : null,
    competitor_queries: list(r.competitor_queries, 4, 80).map((q) => q.toLowerCase()),
    content_topics: list(r.content_topics, 8, 80),
    source: category ? 'model' : fallback ? 'website' : 'none',
    evidence,
  };
}

/** A profile without the model: the first-party wording rules, or a listing label. */
export function fallbackProfile(scan: Pick<SiteScan, 'title' | 'meta_description' | 'h1'> | null | undefined, pages: SitePage[], listingCategory: string | null, evidence: string[]): BusinessProfile {
  const fromSite = categoryFromText(profileText(scan, pages));
  const category = fromSite ?? specificCategory(listingCategory);
  return { category, offer: null, services: [], audience: null, service_area: null, competitor_queries: [], content_topics: [], source: fromSite ? 'website' : category ? 'listing' : 'none', evidence };
}

const PROFILE_SYSTEM = `You describe what a small business does, from its own website's words, for a marketing audit.
Rules:
- Use only the text given. Name the category and services in words that appear on the site. Do not guess what the site does not say.
- category: the kind of business a customer would call it, in 1 to 4 words (for example "functional health coach", "craft brewery", "auto repair shop"). Never a generic word such as "services" or "business".
- offer: one plain sentence on what it sells and how (no numbers).
- services: up to 8 short service or product names from the site.
- audience: who it serves, in a few words.
- service_area: "local" (customers come to a place or it travels to them), "regional", "national" or "online" (it serves anyone remotely).
- competitor_queries: up to 4 searches a customer would type to find a business like this, with the city when the business is local.
- content_topics: up to 8 subjects the site already writes about (the blog, guides, FAQ).
Answer with JSON: {"category":"...","offer":"...","services":[...],"audience":"...","service_area":"local|regional|national|online","competitor_queries":[...],"content_topics":[...]}`;

export interface ProfileInput {
  name: string;
  city: string | null;
  scan: Pick<SiteScan, 'title' | 'meta_description' | 'h1'> | null | undefined;
  pages?: SitePage[];
  listingCategory?: string | null;
  timeoutMs?: number;
}

/** The business's profile: the model from its site, else the wording rules. Never throws. */
export async function buildBusinessProfile(input: ProfileInput): Promise<BusinessProfile> {
  const pages = (input.pages ?? []).filter((p) => !p.error && p.word_count > 0);
  const evidence = pages.length ? pages.map((p) => p.url) : input.scan?.title ? ['homepage scan'] : [];
  const fallback = fallbackProfile(input.scan, pages, input.listingCategory ?? null, evidence);
  const siteText = profileText(input.scan, pages);
  if (!isOpenAiConfigured() || siteText.trim().length < 40) return fallback;
  try {
    const raw = await chatJson<Record<string, unknown>>(
      PROFILE_SYSTEM,
      `Business: ${input.name}${input.city ? `, ${input.city}` : ''}\nWebsite text (JSON):\n${JSON.stringify({ homepage: { title: input.scan?.title ?? null, description: input.scan?.meta_description ?? null, headings: input.scan?.h1 ?? [] }, pages: pages.slice(0, 10).map((p) => ({ url: p.url, title: p.title, description: p.description, headings: p.headings.slice(0, 12), excerpt: p.excerpt.slice(0, 800), prices: p.prices })) })}`,
      input.timeoutMs ?? 45_000
    );
    const profile = checkProfile(raw, siteText, fallback.category, evidence);
    return profile.category ? profile : fallback;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Relevance

export interface Candidate {
  name: string;
  website: string | null;
  /** The listing's category, when a listing supplied the candidate. */
  category: string | null;
  /** A search result's title and snippet, or the listing's address and website title. */
  title: string | null;
  snippet: string | null;
  address: string | null;
}

/** Sites that list businesses rather than being one; never competitors. */
export const DIRECTORY_HOSTS = /(^|\.)(?:yelp|facebook|instagram|tiktok|youtube|linkedin|indeed|ziprecruiter|glassdoor|wikipedia|reddit|nextdoor|thumbtack|angi|angieslist|bbb|mapquest|yellowpages|healthgrades|zocdoc|psychologytoday|tripadvisor|google|apple|amazon|etsy|craigslist|care|houzz|bark|expertise|threebestrated|chamberofcommerce|manta|superpages|foursquare|citysearch|x|twitter|pinterest|medium|substack|eventbrite|meetup|groupon)\.(?:com|org|net|co|io)$/i;
export const isDirectoryHost = (h: string | null | undefined) => Boolean(h && DIRECTORY_HOSTS.test(h.toLowerCase().replace(/^www\./, '')));

/** The words a candidate must share with the profile: its category's, else its services'. */
export function profileWords(profile: Pick<BusinessProfile, 'category' | 'services' | 'offer'>, exclude: string[] = []): { category: Set<string>; all: Set<string> } {
  const category = contentWords(profile.category, exclude);
  const all = new Set([...category, ...contentWords([...profile.services, profile.offer ?? ''].join(' '), exclude)]);
  return { category, all };
}

/** A candidate shares a category word with the profile, or two of its service words. */
export function sharesCategory(words: { category: Set<string>; all: Set<string> }, candidateText: string, exclude: string[] = []): { ok: boolean; shared: string[] } {
  const c = contentWords(candidateText, exclude);
  const shared = [...c].filter((w) => words.all.has(w));
  const ok = shared.some((w) => words.category.has(w)) || shared.length >= 2;
  return { ok, shared };
}

export interface RelevanceDecision<T extends Candidate> {
  candidate: T;
  competes: boolean;
  /** One sentence for the reports and the intake screen. */
  reason: string;
  /** Who decided: the word check, or the model. */
  by: 'words' | 'model';
}

const RELEVANCE_SYSTEM = `You decide which businesses compete with a given small business, for a marketing audit.
A competitor is a business whose customers could have chosen the given business instead: the same kind of service or product, a similar customer, and reachable in the given business's service area (the same city or region for a local business; anywhere for an online or national one).
Never a competitor: directories and review sites, job boards, news or media, hospitals or large systems unless the business is one, suppliers, schools, non-profits, businesses in another trade that merely share a word, and the business itself.
Judge from the words given (the listing category, the page title and snippet, the website); when they do not say what a candidate does, answer false.
Answer with JSON: {"decisions":[{"index":0,"competes":true,"reason":"one short sentence"}]} with one entry per candidate index.`;

/**
 * The candidates that compete: the word check first (never undone by the
 * model), then the model on what passed, with its reason. Without OpenAI, or
 * when it fails, the word check decides and the reason names the shared words.
 */
export async function filterCompetitors<T extends Candidate>(profile: BusinessProfile, business: { name: string; city: string | null }, candidates: T[], timeoutMs = 45_000): Promise<RelevanceDecision<T>[]> {
  const exclude = [business.name, business.city ?? ''];
  const words = profileWords(profile, exclude);
  const decisions: RelevanceDecision<T>[] = candidates.map((candidate) => {
    const h = (() => { try { return candidate.website ? new URL(candidate.website).hostname : null; } catch { return null; } })();
    if (isDirectoryHost(h)) return { candidate, competes: false, reason: 'A directory or platform, not a business.', by: 'words' as const };
    if (!words.all.size) return { candidate, competes: true, reason: 'No verified category to check against; kept for review.', by: 'words' as const };
    const { ok, shared } = sharesCategory(words, [candidate.name, candidate.category, candidate.title, candidate.snippet].filter(Boolean).join(' '), exclude);
    return ok
      ? { candidate, competes: true, reason: `Shares the category wording (${shared.slice(0, 3).join(', ')}).`, by: 'words' as const }
      : { candidate, competes: false, reason: `Its listing (${candidate.category ?? candidate.title ?? 'no category'}) does not share the business's category wording.`, by: 'words' as const };
  });
  const passed = decisions.filter((d) => d.competes);
  if (!passed.length || !isOpenAiConfigured() || timeoutMs <= 2_000) return decisions;
  try {
    const raw = await chatJson<{ decisions?: { index?: unknown; competes?: unknown; reason?: unknown }[] }>(
      RELEVANCE_SYSTEM,
      JSON.stringify({
        business: { name: business.name, city: business.city, category: profile.category, offer: profile.offer, services: profile.services, audience: profile.audience, service_area: profile.service_area },
        candidates: passed.slice(0, 30).map((d, index) => ({ index, name: d.candidate.name, category: d.candidate.category, title: d.candidate.title, snippet: d.candidate.snippet, address: d.candidate.address, website: d.candidate.website })),
      }),
      timeoutMs
    );
    for (const d of raw?.decisions ?? []) {
      const i = typeof d.index === 'number' ? d.index : Number(d.index);
      if (!Number.isInteger(i) || i < 0 || i >= Math.min(passed.length, 30) || typeof d.competes !== 'boolean') continue;
      const reason = text(d.reason, 200);
      passed[i].competes = d.competes;
      passed[i].by = 'model';
      if (reason) passed[i].reason = reason;
    }
  } catch {
    // The word check's decisions stand.
  }
  return decisions;
}
