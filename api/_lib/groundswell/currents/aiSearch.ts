import { executeTool, findKey } from '../composio.js';
import { publicWebsiteUrl, readPublicText } from '../publicFetch.js';
import type { StepContext } from '../types.js';
import {
  AI_CRAWLERS,
  improvementsFrom,
  ownerQuestions,
  robotsAccess,
  scorePage,
  SECURITY_HEADERS,
  unsupportedClaims,
  type AiSearchEvidence,
  type AiVisibilitySummary,
  type EntityEvidence,
  type Improvement,
  type PageSignals,
} from '../../../../packages/groundswell/src/aiSearch.js';
import type { BusinessProfile } from '../businessProfile.js';
import type { CompetitorPick } from './competitors.js';
import type { MapsOutput } from './maps.js';
import { domainOf } from './search.js';
import type { SiteScan } from './site.js';
import type { SitePagesOutput } from './sitePages.js';

/**
 * AI search Current (step `ai_search`, Current "Search", optional): whether
 * the assistants that answer questions can read, trust and cite the
 * business, and whether they do today.
 *
 * Two reads, both best-effort:
 * - the site as an AI crawler sees it: robots.txt for each crawler
 *   (`AI_CRAWLERS`), /llms.txt, /llms-full.txt and the sitemap, the homepage
 *   fetched as GPTBot (compared with the ordinary scan), its JSON-LD entity
 *   (type, @id, address, telephone, hours, sameAs), the phone against the
 *   Google listing's, the security headers, and a citability score for the
 *   homepage and every page the site-pages step read
 *   (`packages/groundswell/src/aiSearch.ts` holds the rubric);
 * - the assistants themselves, through Ahrefs Brand Radar (Composio toolkit
 *   `ahrefs_mcp`): mentions and share of voice for the business against its
 *   competitors across ChatGPT, Perplexity, Gemini, Google's AI Overviews,
 *   Copilot and Claude, the questions where any of them is named, the domains
 *   those answers cite, and how often each platform cites the business's own
 *   site.
 *
 * The output carries the evidence, the improvements it supports, and the
 * owner's question list; the full audit prints it, the write-up reads it, and
 * `deliver_geo` turns it into the developer brief (geoDelivery.ts).
 */

export interface AiSearchOutput extends AiSearchEvidence {
  source: string;
  fetched_at: string;
  improvements: Improvement[];
  questions: string[];
  /** Profile URLs found on the site, for the owner to confirm. */
  profiles: string[];
  /** What the reads could not do, for staff; never printed as such. */
  errors: string[];
}

export const isAiSearchOutput = (v: unknown): v is AiSearchOutput => Boolean(v && typeof v === 'object' && Array.isArray((v as AiSearchOutput).improvements) && (v as AiSearchOutput).crawlers && typeof (v as AiSearchOutput).crawlers === 'object');

/** The data sources Ahrefs' own prompt set covers (Brand Radar refuses `claude` there: "models do not support Ahrefs dataset", seen 2026-10-27). */
export const ASSISTANTS = ['chatgpt', 'perplexity', 'gemini', 'google_ai_overviews', 'copilot'] as const;
export const ASSISTANT_LABELS: Record<string, string> = { chatgpt: 'ChatGPT', perplexity: 'Perplexity', gemini: 'Gemini', google_ai_overviews: 'Google AI Overviews', google_ai_mode: 'Google AI Mode', copilot: 'Copilot', claude: 'Claude', grok: 'Grok', all_platforms: 'All platforms' };
export const GPTBOT_UA = 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot';
const SOURCE = 'The site as an AI crawler reads it (robots.txt, llms.txt, the sitemap, the homepage as GPTBot) and Ahrefs Brand Radar through Composio';
const FETCH_MS = 12_000;
const FILE_BYTES = 400_000;
/** llms-full.txt carries whole pages; a file past this is still a file that exists. */
const FULL_FILE_BYTES = 1_500_000;
const tooLarge = (f: Fetched | null) => Boolean(f?.error && /too large/i.test(f.error));
const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)) ? Number(v) : null);
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const why = (err: unknown) => (err instanceof Error ? err.message : String(err));

type Fetched = { status: number | null; text: string; headers: Record<string, string>; error: string | null };

/** One public file, read as text; 404 is an answer (absent), anything else that fails is recorded. */
export async function readFile(url: string, extra: { userAgent?: string; contentTypes?: string[]; maxBytes?: number } = {}): Promise<Fetched> {
  try {
    const r = await readPublicText(url, { timeoutMs: FETCH_MS, maxBytes: extra.maxBytes ?? FILE_BYTES, acceptStatuses: [404, 403, 401, 410], contentTypes: extra.contentTypes ?? ['text/plain', 'text/html', 'application/xml', 'text/xml', 'text/markdown', 'application/xhtml+xml'], userAgent: extra.userAgent });
    return { status: r.status, text: r.text, headers: r.headers ?? {}, error: null };
  } catch (err) {
    return { status: null, text: '', headers: {}, error: why(err) };
  }
}

const origin = (website: string) => { try { return publicWebsiteUrl(website).origin; } catch { return null; } };

/** The JSON-LD entity on a page: the business node and what it carries. */
export function readEntity(html: string): EntityEvidence {
  const nodes: Record<string, unknown>[] = [];
  const walk = (v: unknown, depth = 0) => {
    if (depth > 30 || !v || typeof v !== 'object') return;
    if (Array.isArray(v)) { v.forEach((x) => walk(x, depth + 1)); return; }
    const o = v as Record<string, unknown>;
    if (o['@type']) nodes.push(o);
    for (const x of Object.values(o)) walk(x, depth + 1);
  };
  for (const m of html.replace(/<!--[\s\S]*?-->/g, ' ').matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script\s*>/gi)) {
    try { walk(JSON.parse(m[1])); } catch { /* an invalid block is already a technical SEO finding */ }
  }
  const typesOf = (o: Record<string, unknown>) => (Array.isArray(o['@type']) ? o['@type'] : [o['@type']]).filter((t): t is string => typeof t === 'string');
  const types = [...new Set(nodes.flatMap(typesOf))];
  // schema.org has hundreds of LocalBusiness subtypes (AutoRepair, Brewery, Dentist…): the business node is
  // LocalBusiness itself, else the node that carries a place's facts (address, telephone, hours, geo) and is
  // not one of the parts, else a plain Organization.
  const orgType = (t: string) => /^Organization$|Corporation|Company|^Brand$/.test(t);
  const part = (t: string) => /^(?:PostalAddress|Person|WebSite|WebPage|Place|Event|Product|Offer|Review|Rating|AggregateRating|GeoCoordinates|OpeningHoursSpecification|ContactPoint|ImageObject|BreadcrumbList|FAQPage|Question|Answer|Article|BlogPosting)$/.test(t);
  const placeFacts = (o: Record<string, unknown>) => Boolean(o.address || o.telephone || o.geo || o.openingHoursSpecification || o.openingHours);
  const business = nodes.find((o) => typesOf(o).includes('LocalBusiness')) ?? nodes.find((o) => placeFacts(o) && !typesOf(o).some(part)) ?? nodes.find((o) => typesOf(o).some(orgType));
  const businessTypes = business ? typesOf(business) : [];
  const sameAs = business ? ([] as unknown[]).concat((business.sameAs as unknown) ?? []).filter((x): x is string => typeof x === 'string') : [];
  const hours = business ? business.openingHoursSpecification ?? business.openingHours : null;
  return {
    types,
    has_organization: nodes.some((o) => typesOf(o).some(orgType)),
    has_local_business: Boolean(business) && (businessTypes.includes('LocalBusiness') || !businessTypes.some(orgType)),
    has_id: Boolean(business && typeof business['@id'] === 'string' && business['@id']),
    same_as: sameAs,
    has_address: Boolean(business && business.address),
    telephone: business ? str(business.telephone) : null,
    has_opening_hours: Boolean(hours && (Array.isArray(hours) ? hours.length : true)),
    has_faq: types.includes('FAQPage'),
  };
}

const digits = (s: string) => s.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');

/** How many <loc> entries a sitemap (or sitemap index) lists. */
export const sitemapUrls = (xml: string) => (xml.match(/<loc\b[^>]*>/gi) ?? []).length;

/** Profile URLs with one line each: the trailing slash and the case of the host do not make a second profile. */
export function uniqueProfiles(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const url = raw.trim();
    if (!url) continue;
    const key = url.replace(/\/+$/, '').replace(/^https?:\/\/(www\.)?/i, (m) => m.toLowerCase()).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url.replace(/\/+$/, ''));
  }
  return out;
}

/** Which security headers the homepage answered with. */
export function headerReading(headers: Record<string, string>): { present: string[]; missing: string[] } {
  const present = SECURITY_HEADERS.filter((h) => h in headers);
  const csp = present.includes('content-security-policy') || present.includes('content-security-policy-report-only');
  const missing = SECURITY_HEADERS.filter((h) => !present.includes(h) && !(csp && h.startsWith('content-security-policy')));
  return { present: [...present], missing };
}

/** The pages to score: the homepage from the scan and the GPTBot fetch, then every page the site-pages step read. */
export function pageSignals(site: SiteScan | null, home: Fetched | null, pages: SitePagesOutput | null): PageSignals[] {
  const out: PageSignals[] = [];
  const homeUrl = site?.final_url ?? site?.url ?? null;
  const homePage = pages?.pages.find((p) => p.path === '/' || p.path === '') ?? null;
  if (site && homeUrl) {
    const seo = site.technical_seo;
    const readable = home && home.status === 200 ? !/<(div|main)\b[^>]*\bid\s*=\s*["']?(root|app|__next|__nuxt)["']?[^>]*>\s*<\/\1>/i.test(home.text) || (home.text.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length > 80) : seo ? !seo.app_shell : null;
    out.push({
      url: homeUrl,
      path: '/',
      title: site.title,
      description: site.meta_description,
      h1: site.h1[0] ?? null,
      headings: homePage?.headings ?? site.h1,
      word_count: homePage?.word_count ?? site.word_count,
      excerpt: homePage?.excerpt ?? null,
      facts: homePage?.prices ?? [],
      ctas: homePage ? homePage.ctas.length : null,
      json_ld: seo ? seo.json_ld.blocks > 0 : site.schema_types.length > 0,
      readable_without_js: readable,
      canonical: Boolean(site.canonical),
    });
  }
  for (const p of pages?.pages ?? []) {
    if (p.error || p.path === '/' || p.path === '') continue;
    out.push({ url: p.url, path: p.path, title: p.title, description: p.description, h1: p.h1, headings: p.headings, word_count: p.word_count, excerpt: p.excerpt, facts: p.prices, ctas: p.ctas.length, json_ld: null, readable_without_js: null, canonical: null });
  }
  return out;
}

type Brand = { names: string[]; url_groups?: { target: string; scope: 'subdomains' }[] };
const brandOf = (name: string, domain: string | null): Brand => ({ names: [name], ...(domain ? { url_groups: [{ target: domain, scope: 'subdomains' as const }] } : {}) });

/** The Brand Radar reads, each best-effort, in parallel; shapes as the Ahrefs API v3 documents them. */
export async function readAiVisibility(input: { name: string; domain: string | null; competitors: { name: string; domain: string | null }[]; timeoutMs: number }): Promise<AiVisibilitySummary> {
  const brands = [brandOf(input.name, input.domain)];
  const competitors = input.competitors.slice(0, 5).map((c) => brandOf(c.name, c.domain));
  const base = { brands, competitors, data_source: [...ASSISTANTS], country: ['us'], prompts: 'ahrefs' };
  const t = input.timeoutMs;
  const [mentions, sov, responses, cited, count] = await Promise.allSettled([
    executeTool('AHREFS_MCP_BRAND_RADAR_MENTIONS_OVERVIEW_ENTITIES', { ...base, select: ['brand', 'entity_type', 'total'] }, t),
    executeTool('AHREFS_MCP_BRAND_RADAR_SOV_OVERVIEW_ENTITIES', { ...base }, t),
    executeTool('AHREFS_MCP_BRAND_RADAR_AI_RESPONSES_ENTITIES', { ...base, select: ['question', 'data_source', 'volume', 'links', 'brand_sentiment'], limit: 25, order_by: 'volume' }, t),
    executeTool('AHREFS_MCP_BRAND_RADAR_CITED_DOMAINS_ENTITIES', { ...base, select: ['domain', 'responses', 'pages'], limit: 20 }, t),
    input.domain ? executeTool('AHREFS_MCP_SITE_EXPLORER_AI_RESPONSES_COUNT', { target: input.domain, mode: 'subdomains', select: 'all_platforms,chatgpt,perplexity,gemini,copilot,google_ai_overviews,google_ai_mode' }, t) : Promise.reject(new Error('No website to count citations for.')),
  ]);
  const errors: string[] = [];
  const rows = (r: PromiseSettledResult<unknown>, key: string, label: string): Record<string, unknown>[] => {
    if (r.status === 'rejected') { errors.push(`${label}: ${why(r.reason)}`); return []; }
    const raw = findKey<unknown>(r.value, key);
    if (!Array.isArray(raw)) { errors.push(`${label}: no ${key} in the answer.`); return []; }
    return raw.filter((x): x is Record<string, unknown> => Boolean(x && typeof x === 'object'));
  };
  const lower = (s: string) => s.trim().toLowerCase();
  const mentionRows = rows(mentions, 'metrics', 'Mentions');
  const sovRows = rows(sov, 'metrics', 'Share of voice');
  const figure = (name: string, entity: 'target' | 'competitor') => {
    const m = mentionRows.find((r) => r.entity_type === entity && lower(String(r.brand ?? '')) === lower(name)) ?? mentionRows.find((r) => r.entity_type === entity && entity === 'target');
    const s = sovRows.find((r) => r.entity_type === entity && lower(String(r.brand ?? '')) === lower(name)) ?? sovRows.find((r) => r.entity_type === entity && entity === 'target');
    return { mentions: m ? n(m.total) : null, share_of_voice: s ? n(s.share_of_voice) : null };
  };
  const names = new Set([lower(input.name), ...input.competitors.map((c) => lower(c.name))]);
  const prompts = rows(responses, 'ai_responses', 'AI responses').map((r) => {
    const sentiment = Array.isArray(r.brand_sentiment) ? (r.brand_sentiment as Record<string, unknown>[]) : [];
    const named = sentiment.map((s) => lower(String(s.brand ?? ''))).filter((b) => names.has(b));
    const links = Array.isArray(r.links) ? (r.links as Record<string, unknown>[]).map((l) => domainOf(str(l.url))).filter((d): d is string => Boolean(d)) : [];
    return { question: String(r.question ?? '').slice(0, 200), assistant: ASSISTANT_LABELS[String(r.data_source ?? '')] ?? String(r.data_source ?? ''), volume: n(r.volume), names_business: named.includes(lower(input.name)), cited: [...new Set(links)].slice(0, 8) };
  }).filter((p) => p.question);
  const citedDomains = rows(cited, 'domains', 'Cited domains').map((r) => ({ domain: String(r.domain ?? ''), responses: n(r.responses) ?? 0, pages: n(r.pages) ?? 0 })).filter((d) => d.domain).sort((a, b) => b.responses - a.responses);
  const citations: AiVisibilitySummary['citations'] = [];
  if (count.status === 'fulfilled') {
    const c = findKey<Record<string, unknown>>(count.value, 'ai_responses_count');
    if (c && typeof c === 'object') for (const [platform, v] of Object.entries(c)) { const x = v as Record<string, unknown> | null; if (x && typeof x === 'object') citations.push({ platform, citations: n(x.citations) ?? 0, pages: n(x.pages) ?? 0 }); }
    else errors.push('Citations: no ai_responses_count in the answer.');
  } else errors.push(`Citations: ${why(count.reason)}`);
  return {
    source: 'Ahrefs Brand Radar (US; Ahrefs’ own prompt set) and Ahrefs Site Explorer AI citations, via Composio',
    assistants: ASSISTANTS.map((a) => ASSISTANT_LABELS[a]),
    business: { name: input.name, ...figure(input.name, 'target') },
    competitors: input.competitors.slice(0, 5).map((c) => ({ name: c.name, ...figure(c.name, 'competitor') })),
    prompts,
    cited_domains: citedDomains,
    citations,
    error: errors.join(' ') || null,
  };
}

export async function runAiSearch(ctx: StepContext): Promise<AiSearchOutput> {
  const site = (ctx.outputs.site as { business?: SiteScan | null } | undefined)?.business ?? null;
  const maps = (ctx.outputs.maps as MapsOutput | undefined)?.business ?? null;
  const comp = ctx.outputs.competitors as { profile?: BusinessProfile; picks?: CompetitorPick[] } | undefined;
  const pages = (ctx.outputs.site_pages as SitePagesOutput | undefined) ?? null;
  const website = site?.final_url ?? site?.url ?? ctx.audit.website ?? null;
  const root = website ? origin(website) : null;
  const errors: string[] = [];
  const budget = () => Math.max(1_000, Math.min(60_000, ctx.deadline - Date.now() - 2_000));

  // The site as a crawler reads it, and the assistants, in parallel.
  const competitors = [...ctx.audit.competitors.map((c) => ({ name: c.name, domain: domainOf(c.website) })), ...(comp?.picks ?? []).map((p) => ({ name: p.name, domain: domainOf(p.website) }))]
    .filter((c, i, all) => c.name && all.findIndex((x) => x.name.toLowerCase() === c.name.toLowerCase()) === i)
    .slice(0, 5);
  const visibilityRead = readAiVisibility({ name: ctx.audit.business_name, domain: domainOf(website), competitors, timeoutMs: budget() }).catch((err) => { errors.push(`Brand Radar: ${why(err)}`); return null; });

  let robots: Fetched | null = null;
  let llms: Fetched | null = null;
  let llmsFull: Fetched | null = null;
  let sitemap: Fetched | null = null;
  let home: Fetched | null = null;
  if (root) {
    [robots, llms, llmsFull, sitemap, home] = await Promise.all([
      readFile(`${root}/robots.txt`),
      readFile(`${root}/llms.txt`),
      readFile(`${root}/llms-full.txt`, { maxBytes: FULL_FILE_BYTES }),
      readFile(`${root}/sitemap.xml`),
      readFile(website!, { userAgent: GPTBOT_UA, contentTypes: ['text/html', 'application/xhtml+xml'] }),
    ]);
    for (const [label, f] of [['robots.txt', robots], ['llms.txt', llms], ['llms-full.txt', llmsFull], ['sitemap.xml', sitemap], ['homepage as GPTBot', home]] as const) if (f.error && !tooLarge(f)) errors.push(`${label}: ${f.error}`);
  }
  const robotsText = robots && robots.status === 200 ? robots.text : null;
  const gptbotBlocked = Boolean(home && site?.status === 200 && home.status !== null && home.status !== 200);
  const entityHtml = home && home.status === 200 ? home.text : null;
  const entity = entityHtml ? readEntity(entityHtml) : null;
  const sitePhones = [...new Set((site?.phones ?? []).map(digits).filter((p) => p.length >= 10))];
  const listingPhone = maps?.phone ? digits(maps.phone) : null;
  const consistent = listingPhone && sitePhones.length ? sitePhones.includes(listingPhone) : null;
  const claims = [...(pages?.pages ?? []).filter((p) => !p.error).flatMap((p) => unsupportedClaims(p.path, `${p.title ?? ''} ${p.headings.join(' ')} ${p.excerpt}`)), ...(site ? unsupportedClaims('/', `${site.title ?? ''} ${site.meta_description ?? ''} ${site.h1.join(' ')}`) : [])]
    .filter((c, i, all) => all.findIndex((x) => x.path === c.path && x.phrase.toLowerCase() === c.phrase.toLowerCase()) === i);
  const visibility = await visibilityRead;

  const evidence: AiSearchEvidence = {
    website,
    crawlers: {
      robots_found: robotsText !== null,
      agents: AI_CRAWLERS.map((c) => robotsAccess(robotsText, c.agent)),
      gptbot_fetch: home ? { status: home.status, blocked: gptbotBlocked, note: home.error ? `The fetch as GPTBot failed: ${home.error}` : gptbotBlocked ? `The ordinary scan got HTTP ${site?.status}; GPTBot got HTTP ${home.status}.` : home.status === 200 ? 'The same page as the ordinary scan.' : `HTTP ${home.status} for both fetches.` } : null,
    },
    files: root ? {
      llms_txt: { url: `${root}/llms.txt`, found: (llms?.status === 200 && llms.text.trim().length > 0) || tooLarge(llms), bytes: tooLarge(llms) ? null : llms?.status === 200 ? Buffer.byteLength(llms.text) : 0 },
      llms_full_txt: { url: `${root}/llms-full.txt`, found: (llmsFull?.status === 200 && llmsFull.text.trim().length > 0) || tooLarge(llmsFull), bytes: tooLarge(llmsFull) ? null : llmsFull?.status === 200 ? Buffer.byteLength(llmsFull.text) : 0 },
      sitemap: { url: `${root}/sitemap.xml`, found: sitemap?.status === 200 && sitemapUrls(sitemap.text) > 0, urls: sitemap?.status === 200 ? sitemapUrls(sitemap.text) : 0 },
    } : null,
    entity,
    nap: { site_phones: sitePhones, listing_phone: listingPhone, listing_name: maps?.name ?? null, site_name: site?.title?.split(/\s[|–-]\s/)[0]?.trim() ?? null, consistent },
    headers: home && home.status !== null ? headerReading(home.headers) : null,
    pages: pageSignals(site, home, pages).map(scorePage),
    claims,
    visibility,
  };
  // One line per profile: the same profile with and without a trailing slash is one question, and a
  // YouTube path segment ("channel", "c", "user") is not a handle.
  const profiles = uniqueProfiles([
    ...(site?.social.instagram ?? []).map((h) => `https://www.instagram.com/${h}`),
    ...(site?.social.facebook ?? []).map((h) => `https://www.facebook.com/${h}`),
    ...(site?.social.tiktok ?? []).map((h) => `https://www.tiktok.com/@${h}`),
    ...(site?.social.youtube ?? []).filter((h) => !/^(?:channel|c|user|@?)$/i.test(h)).map((h) => `https://www.youtube.com/${h}`),
    ...(entity?.same_as ?? []),
    ...(maps?.url ? [maps.url] : []),
  ]);
  return {
    source: SOURCE,
    fetched_at: new Date().toISOString(),
    ...evidence,
    improvements: improvementsFrom(evidence),
    questions: ownerQuestions(evidence, profiles),
    profiles,
    errors,
  };
}
