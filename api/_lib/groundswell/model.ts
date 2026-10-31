import { chatJson, GROUNDSWELL_MODEL } from './openai.js';
import { runRoiModel, type RoiInputs, type RoiResult, type RoiScenarioInputs } from './roi.js';
import { PermanentStepError, type AuditRow, type StepContext } from './types.js';
import type { SiteScan } from './currents/site.js';
import type { MapsListing, MapsPlace } from './currents/maps.js';
import type { AhrefsSnapshot, KeywordIdea } from './currents/search.js';
import type { SocialOutput } from './currents/social.js';
import type { AdsEvidence } from './currents/ads.js';
import { isLinkedOutput, type LinkedOutput } from './currents/linked.js';
import { isAiSearchOutput, type AiSearchOutput } from './currents/aiSearch.js';
import type { AdLibraryEvidence } from '../../../packages/groundswell/src/benchmark/index.js';
import type { GoogleSerp } from './currents/serp.js';
import { isSitePagesOutput, type SitePagesOutput } from './currents/sitePages.js';
import type { BusinessProfile } from './businessProfile.js';
import type { CompetitorPick } from './currents/competitors.js';

/**
 * Model step: turns the Currents' data into the audit's write-up (OpenAI) and
 * models the return on one change, Google Search ads (roi.ts).
 *
 * The write-up may only quote numbers that are in the gathered data. Any
 * sentence with another number gets one repair call, and is dropped if the
 * repair still has one (`unsupportedNumbers`). Money in the reports comes from
 * the ROI model, never from the write-up.
 */

/**
 * Search-ad benchmarks: LocaliQ (WordStream) 2025 Google Ads benchmarks,
 * all-industry averages. Update these when LocaliQ publishes newer figures.
 */
export const BENCHMARKS = {
  source: 'LocaliQ 2025 Google Ads benchmarks (all-industry averages)',
  ctr: 0.0666,
  cvr: 0.0752,
  cpc: 5.26,
};

/** Chan, Kumar, Ma and Koehler (Google, 2012): share of ad clicks that are incremental. */
export const INCREMENTALITY = {
  source: 'Chan, Kumar, Ma and Koehler (Google, 2012), 390 search-ad pause studies',
  ranks_first: 0.5,
  otherwise: 0.82,
};

export const AREAS = ['google', 'social', 'website', 'ads', 'competitors', 'keywords'] as const;
export type AreaKey = (typeof AREAS)[number];

export interface AreaWriteup {
  summary: string;
  working: string[];
  costing: string[];
  fixes: string[];
}

export interface Writeup {
  headline: string;
  verdict: string;
  areas: Record<AreaKey, AreaWriteup>;
  plan: { weeks_1_2: string[]; weeks_3_6: string[]; weeks_7_12: string[] };
  next_steps: string[];
  cant_see: string[];
  findings?: ReportFinding[];
  assumptions?: string[];
}

export interface ReportFinding {
  area: AreaKey;
  priority: 'high' | 'medium' | 'low';
  title: string;
  evidence: string;
  source: EvidenceKey | 'client_accounts';
  basis: 'observed' | 'derived' | 'hypothesis';
  implication: string;
  action: string;
  measure: string;
  effort: string;
  dependency: string;
}

export interface Estimates {
  category: string;
  ticket: [number, number, number];
  close: [number, number, number];
  gross_margin: number;
  basis: string;
  has_current_marketer: boolean | null;
  is_nwse_client: boolean | null;
}

type SiteOut = { business: SiteScan | null; competitors: { name: string; site: SiteScan | null }[] };
type MapsOut = { business: MapsPlace | null; nearby: MapsListing[]; note: string | null; source: string; fetched_at: string };
type SearchOut = { business: AhrefsSnapshot | null; competitors: (AhrefsSnapshot & { name: string })[]; source: string; fetched_at: string; serp?: { queries: GoogleSerp[]; note?: string | null } };
type KeywordsOut = { ideas: KeywordIdea[]; seeds?: string[]; source?: string; fetched_at?: string; skipped?: string; error?: string | null; demand_status?: 'measured' | 'unavailable'; note?: string | null };
type SocialOut = SocialOutput;
type AdsOut = { business: AdsEvidence; competitors: AdsEvidence[]; source: string; fetched_at: string };

/** The compact, sourced facts the write-up and reports are built from. */
export interface Facts {
  business: { name: string; city: string | null; website: string | null; instagram: string | null; facebook?: string | null; notes: string | null };
  site: SiteOut | null;
  maps: MapsOut | null;
  search: SearchOut | null;
  keywords: KeywordsOut | null;
  social: SocialOut | null;
  ads: AdsOut | null;
  ad_library: { source: string; fetched_at: string; business: AdLibraryEvidence; competitors: AdLibraryEvidence[] } | null;
  /** The client's own accounts, where a partner linked them and the run read (or tried to read) them; null for a prospect. */
  linked: LinkedOutput | null;
  /** The website's pages beyond the homepage (Firecrawl); null when the step did not run. Missing on audits before 2026-10-24. */
  site_pages?: SitePagesOutput | null;
  /** What the business does, from its own site (the competitors step); null before 2026-10-24. */
  profile?: BusinessProfile | null;
  /** The competitors the engine picked, each with why it competes, and the candidates it left out. */
  competitor_picks?: { picks: CompetitorPick[]; dropped: { name: string; website: string | null; reason: string }[] } | null;
  /** AI search: crawler access, citability and Brand Radar (the ai_search step); null when it did not run. Missing on audits before 2026-10-26. */
  ai_search?: AiSearchOutput | null;
  missing: string[];
}

const slimSite = (s: SiteScan | null) =>
  s && {
    url: s.final_url ?? s.url,
    status: s.status,
    https: s.https,
    error: s.error,
    title: s.title,
    meta_description: s.meta_description,
    h1: s.h1.slice(0, 3),
    has_viewport: s.has_viewport,
    word_count: s.word_count,
    schema_types: s.schema_types,
    canonical: s.canonical,
    technical_seo: s.technical_seo,
    tracking: s.tracking,
    booking: s.booking,
    phones: s.phones.slice(0, 2),
    social: s.social,
  };

export function buildFacts(audit: AuditRow, outputs: Record<string, unknown>): Facts {
  const site = (outputs.site as SiteOut | undefined) ?? null;
  const missing = (['maps', 'search', 'keywords', 'social', 'ads'] as const).filter((k) => outputs[k] === undefined);
  return {
    business: { name: audit.business_name, city: audit.city, website: audit.website, instagram: audit.instagram, facebook: audit.facebook ?? null, notes: audit.notes },
    site,
    maps: (outputs.maps as MapsOut | undefined) ?? null,
    search: (outputs.search as SearchOut | undefined) ?? null,
    keywords: (outputs.keywords as KeywordsOut | undefined) ?? null,
    social: (outputs.social as SocialOut | undefined) ?? null,
    ads: (outputs.ads as AdsOut | undefined) ?? null,
    ad_library: (outputs.ads_library as Facts['ad_library'] | undefined) ?? null,
    linked: isLinkedOutput(outputs.linked) && outputs.linked.services.length ? outputs.linked : null,
    site_pages: isSitePagesOutput(outputs.site_pages) ? outputs.site_pages : null,
    ai_search: isAiSearchOutput(outputs.ai_search) ? outputs.ai_search : null,
    profile: (outputs.competitors as { profile?: BusinessProfile } | undefined)?.profile ?? null,
    competitor_picks: (() => {
      const c = outputs.competitors as { picks?: CompetitorPick[]; dropped?: { name: string; website: string | null; reason: string }[] } | undefined;
      return c && Array.isArray(c.picks) ? { picks: c.picks, dropped: Array.isArray(c.dropped) ? c.dropped : [] } : null;
    })(),
    missing,
  };
}

export type EvidenceKey = 'website' | 'maps' | 'search' | 'keywords' | 'instagram' | 'facebook' | 'ad_tags' | 'ads_library';
export interface EvidenceRecord {
  key: EvidenceKey;
  label: string;
  status: 'checked' | 'unavailable' | 'not_checked' | 'not_found';
  source: string;
  captured_at: string | null;
  scope: string;
  limitation: string;
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Output existence is not evidence of a successful read. Keep absence, failure and a scoped no-match distinct. */
export function evidenceCoverage(f: Facts): EvidenceRecord[] {
  const site = f.site?.business;
  // A link-in-bio page is nobody's website: not a failed read, and nothing of the business's own to check.
  const linkPage = Boolean(site?.link_page);
  const siteOk = Boolean(site && !site.error && site.status && site.status >= 200 && site.status < 400);
  const ig = f.social?.business;
  const fb = f.social?.facebook;
  const search = f.search?.business;
  const searchOk = Boolean(search && ([search.domain_rating, search.organic_keywords, search.organic_traffic].some(finite) || search.top_keywords?.some(k => finite(k.position))));
  const serpOk = f.search?.serp?.queries.some(q => !q.error && q.organic.length) ?? false;
  const ideas = f.keywords?.ideas ?? [];
  const demandOk = f.keywords?.demand_status !== 'unavailable' && ideas.some(k => finite(k.monthly_searches));
  const lib = f.ad_library?.business;
  const libOk = Boolean(lib && (['ads_found', 'none'].includes(lib.google_ads_status) || ['running', 'not_running'].includes(lib.meta_ad_status)));
  const entry = (key: EvidenceKey, label: string, present: boolean, ok: boolean, source: string | undefined, at: string | undefined, scope: string, limitation: string, noMatch = false): EvidenceRecord => ({
    key, label, status: ok ? 'checked' : noMatch ? 'not_found' : present ? 'unavailable' : 'not_checked',
    source: source || label, captured_at: at ?? null, scope, limitation,
  });
  return [
    entry('website', 'Website', Boolean(site), siteOk, site?.final_url ?? site?.url, site?.fetched_at, linkPage ? 'The address given is a link-in-bio page, not a website of the business\'s own; only its headings, links and phones were read.' : 'Initial HTTP response from the supplied website.', linkPage ? 'A link-in-bio page cannot rank, carry tags or measure anything; the business has no website to check.' : 'JavaScript, indexing, complete conversion paths and live account measurement are outside this check.', linkPage),
    entry('maps', 'Google listing', Boolean(f.maps), Boolean(f.maps?.business), f.maps?.source, f.maps?.fetched_at, 'Business-name and location lookup; available rating and review fields only.', f.maps?.business ? 'A listing does not establish search-pack rank or account performance.' : 'A missing listing is not evidence of no customer demand.', Boolean(f.maps && !f.maps.business && /not found/i.test(f.maps.note ?? ''))),
    entry('search', 'Search visibility', Boolean(f.search), searchOk || serpOk, f.search?.source, f.search?.fetched_at, serpOk ? 'Query-specific search results and any available US Ahrefs estimates.' : 'US Ahrefs domain and organic-keyword estimates.', 'A sampled result is specific to its query, location and capture time; estimated traffic is not account analytics.'),
    entry('keywords', 'Keyword demand', Boolean(f.keywords), Boolean(demandOk), f.keywords?.source, f.keywords?.fetched_at, 'Measured searches and bid estimates only for the geography and terms returned.', demandOk ? 'Close variants can overlap; keyword totals are not unique buyers or guaranteed clicks.' : 'Demand could not be verified. Suggestions or an empty response do not establish zero demand; no spend or return should be inferred.'),
    entry('instagram', 'Instagram', Boolean(ig), Boolean(ig?.exists && [ig.followers, ig.posts, ig.posts_last_30_days].some(finite)), f.social?.source, f.social?.fetched_at, ig?.handle ? `Profile @${ig.handle}; available public counts and sampled posts.` : 'No verified business profile was read.', finite(ig?.posts_last_30_days) ? 'Sampled recent activity does not measure reach, leads or conversions.' : 'Recent posting activity was not verified. Missing or restricted profile data does not establish inactivity or the absence of an account.'),
    entry('facebook', 'Facebook', Boolean(fb), Boolean(fb?.exists && (fb.page_id || [fb.followers, fb.likes, fb.rating].some(finite))), f.social?.source, f.social?.fetched_at, fb?.url ? `Public Page ${fb.url}; available fields and sampled posts.` : 'No verified business Page was read.', 'Sampled posts do not measure reach, leads or the complete publishing history.'),
    entry('ad_tags', 'Website ad signals', Boolean(f.ads || site), siteOk && f.ads?.business.website_checked !== false, f.ads?.source ?? 'Website initial HTML', f.ads?.fetched_at ?? site?.fetched_at, linkPage ? 'No website of the business\'s own to carry tags or paid pages.' : 'Tracking tags in fetched HTML and any available Ahrefs paid pages.', 'A tag does not prove active advertising; a missing tag or paid page does not prove no campaigns are running.', linkPage),
    entry('ads_library', 'Public ad libraries', Boolean(lib), libOk, f.ad_library?.source, f.ad_library?.fetched_at, 'Matched advertiser or Page records in the returned libraries.', 'Library records do not reveal spend, conversions or all placements; unknown status is not evidence of no advertising.'),
  ];
}

/** A small technical audit can proceed with explicit gaps; a largely failed research run needs a person before delivery. */
export function criticalEvidenceProblems(f: Facts, planned: readonly string[] = []): string[] {
  const coverage = new Map(evidenceCoverage(f).map(s => [s.key, s]));
  const problems: string[] = [];
  // A link-in-bio page is not a website that failed to read: there is none to read, and the reports say so.
  const ownSite = Boolean(f.business.website) && !f.site?.business?.link_page;
  if (ownSite && coverage.get('website')?.status !== 'checked') problems.push('The supplied website could not be read successfully; confirm its identity and content before delivery.');
  const failed = (key: EvidenceKey, step: string) => coverage.get(key)?.status === 'unavailable' || (planned.includes(step) && coverage.get(key)?.status === 'not_checked');
  const families: string[] = [];
  if (failed('maps', 'maps')) families.push('Google listing');
  if (ownSite && failed('search', 'search')) families.push('search visibility');
  const hasProfile = Boolean(f.business.instagram || f.business.facebook || f.site?.business?.social.instagram.length || f.site?.business?.social.facebook.length || f.social?.business || f.social?.facebook);
  if (hasProfile && failed('instagram', 'social') && coverage.get('facebook')?.status !== 'checked') families.push('social profiles');
  if (failed('ads_library', 'ads_library')) families.push('public ad libraries');
  if (families.length >= 2) problems.push(`Public research remains incomplete across ${families.join(', ')}. Review or recover those reads before delivering a client report.`);
  return problems;
}

/** The linked accounts as the model sees them: each service read, with its figures, and the names of those not read. */
export function linkedForPrompt(l: LinkedOutput | null) {
  if (!l) return null;
  return {
    window: l.window,
    read: l.services.filter((s) => s.ok).map((s) => ({ service: s.label, source: s.source, data: s.data })),
    not_read: l.services.filter((s) => !s.ok).map((s) => s.label),
  };
}

/** The AI search reading as the model sees it: the verdicts and figures, not the rubric's notes or the brief's question list. */
export function aiSearchForPrompt(a: AiSearchOutput | null) {
  if (!a) return null;
  const v = a.visibility;
  return {
    source: a.source,
    crawlers_blocked: a.crawlers.agents.filter((x) => x.verdict === 'blocked').map((x) => x.agent),
    robots_found: a.crawlers.robots_found,
    gptbot_blocked: a.crawlers.gptbot_fetch?.blocked ?? null,
    llms_txt: a.files?.llms_txt.found ?? null,
    sitemap_urls: a.files?.sitemap.urls ?? null,
    entity: a.entity && { types: a.entity.types, has_id: a.entity.has_id, has_address: a.entity.has_address, telephone: a.entity.telephone, has_opening_hours: a.entity.has_opening_hours, same_as: a.entity.same_as.length },
    phone_consistent_with_listing: a.nap.consistent,
    citability: a.pages.map((p) => ({ path: p.path, score: p.score })),
    ai_visibility: v && !v.error ? { assistants: v.assistants, business_mentions: v.business.mentions, business_share_of_voice: v.business.share_of_voice, competitors: v.competitors, site_citations: v.citations.find((c) => c.platform === 'all_platforms')?.citations ?? null, most_cited_domains: v.cited_domains.slice(0, 6).map((d) => d.domain) } : v ? { partly: v.error, business_mentions: v.business.mentions, competitors: v.competitors } : null,
    improvements: a.improvements.map((i) => ({ priority: i.priority, title: i.title })),
  };
}

/** What the model sees: the facts without bulky or brand-only fields. */
export function factsForPrompt(f: Facts) {
  return {
    business: f.business,
    business_profile: f.profile ? { category: f.profile.category, offer: f.profile.offer, services: f.profile.services, audience: f.profile.audience, service_area: f.profile.service_area } : null,
    website: f.site && { business: slimSite(f.site.business), competitors: f.site.competitors.map((c) => ({ name: c.name, site: slimSite(c.site) })) },
    website_pages: f.site_pages
      ? {
          source: f.site_pages.source,
          pages: f.site_pages.pages.filter((p) => !p.error).map((p) => ({ url: p.url, title: p.title, description: p.description, h1: p.h1, headings: p.headings.slice(0, 8), word_count: p.word_count, ctas: p.ctas.map((c) => c.text), prices: p.prices })),
          competitors: f.site_pages.competitors.map((c) => ({ name: c.name, title: c.page?.title ?? null, description: c.page?.description ?? null, headings: c.page?.headings.slice(0, 6) ?? [], ctas: c.page?.ctas.map((x) => x.text) ?? [], prices: c.page?.prices ?? [] })),
        }
      : null,
    competitor_picks: f.competitor_picks ? { picks: f.competitor_picks.picks.map((p) => ({ name: p.name, website: p.website, rating: p.rating, reviews: p.reviews, reason: p.reason ?? null })), left_out: f.competitor_picks.dropped.map((d) => ({ name: d.name, reason: d.reason })) } : null,
    google_maps: f.maps,
    search_ahrefs: f.search,
    keyword_planner: f.keywords && { ...f.keywords, ideas: f.keywords.ideas.slice(0, 25) },
    instagram: f.social,
    ads: f.ads,
    ad_libraries: f.ad_library,
    ai_search: aiSearchForPrompt(f.ai_search ?? null),
    evidence_coverage: evidenceCoverage(f),
    client_accounts: linkedForPrompt(f.linked),
    not_available: f.missing,
  };
}

// ---------------------------------------------------------------------------
// Numbers the write-up may use

const NUMBER = /\d[\d,]*(?:\.\d+)?/g;

function addVariants(allowed: Set<string>, x: number) {
  if (!Number.isFinite(x)) return;
  const forms = [x, Math.round(x), Math.round(x * 10) / 10, Math.round(x * 100) / 100, Math.floor(x), Math.ceil(x)];
  if (Math.abs(x) <= 1) forms.push(Math.round(x * 100), Math.round(x * 1000) / 10);
  for (const v of forms) allowed.add(String(Math.abs(v)));
}

/** Every number in the facts (and simple roundings of it), plus small counts. */
export function allowedNumbers(...sources: unknown[]): Set<string> {
  const allowed = numbersIn(...sources);
  for (let i = 0; i <= 12; i++) allowed.add(String(i));
  // The reports' own time windows ("the last 30 days", "a 90-day plan").
  for (const w of [30, 60, 90]) allowed.add(String(w));
  const year = new Date().getFullYear();
  for (let y = year - 30; y <= year + 1; y++) allowed.add(String(y));
  return allowed;
}

/** Only the numbers in the sources (and simple roundings of them): no small counts, windows or years. */
export function numbersIn(...sources: unknown[]): Set<string> {
  const allowed = new Set<string>();
  const walk = (v: unknown, depth: number) => {
    if (depth > 12 || v === null || v === undefined) return;
    if (typeof v === 'number') addVariants(allowed, v);
    else if (typeof v === 'string') for (const m of v.match(NUMBER) ?? []) addVariants(allowed, Number(m.replace(/,/g, '')));
    else if (Array.isArray(v)) v.forEach((x) => walk(x, depth + 1));
    else if (typeof v === 'object') Object.values(v as Record<string, unknown>).forEach((x) => walk(x, depth + 1));
  };
  sources.forEach((s) => walk(s, 0));
  return allowed;
}

export function unsupportedNumbers(text: string, allowed: Set<string>): string[] {
  return (text.match(NUMBER) ?? []).map((m) => m.replace(/,/g, '')).filter((m) => !allowed.has(String(Number(m))));
}

// A sentence ends at . ! or ?, but not at the point inside a number like 4.6.
export const SENTENCE = /(?:[^.!?]|[.!?](?=\d))+(?:[.!?]+|$)/g;

/** Removes sentences that quote an unsupported number; returns what it removed. */
export function scrubText(text: string, allowed: Set<string>): { text: string; removed: string[] } {
  const removed: string[] = [];
  const kept = (text.match(SENTENCE) ?? [text]).filter((s) => {
    if (unsupportedNumbers(s, allowed).length === 0) return true;
    removed.push(s.trim());
    return false;
  });
  return { text: kept.join('').trim(), removed };
}

/** Applies `fn` to every string in a write-up (empty strings drop out of lists). */
export function mapStrings<T>(value: T, fn: (s: string) => string): T {
  if (typeof value === 'string') return fn(value) as T;
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, fn)).filter((v) => v !== '') as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapStrings(v, fn)])) as T;
  }
  return value;
}

export function writeupProblems(w: Writeup, allowed: Set<string>): string[] {
  const out: string[] = [];
  mapStrings(w, (s) => {
    for (const sentence of s.match(SENTENCE) ?? []) if (unsupportedNumbers(sentence, allowed).length) out.push(sentence.trim());
    return s;
  });
  return out;
}

export function scrubWriteup(w: Writeup, allowed: Set<string>): { writeup: Writeup; removed: string[] } {
  const removed: string[] = [];
  const writeup = mapStrings(w, (s) => {
    const r = scrubText(s, allowed);
    removed.push(...r.removed);
    return r.text;
  });
  return { writeup, removed };
}

/** Negative activity claims need positive evidence of the stated scope, even when they contain no invented number. */
export function scrubUnsupportedClaims(w: Writeup, facts: Facts): { writeup: Writeup; removed: string[] } {
  const coverage = new Map(evidenceCoverage(facts).map(s => [s.key, s.status]));
  const removed: string[] = [];
  const lib = facts.ad_library?.business;
  const unavailableWords = /could not|cannot|can.t|unknown|unavailable|not checked|not verified|not established|does not prove|do not prove|not evidence|no evidence/i;
  const revise = (s: string) => {
    const kept = (s.match(SENTENCE) ?? [s]).filter(part => {
      const boundaries = [...part.matchAll(/;\s*|,(?!\d)\s*|\s+(?:and|but|yet|while|although|however|whereas|because)\s+|[—–]/gi)];
      // A qualifier applies only to the clause containing this claim. Boundaries
      // inside the matched phrase (e.g. "no Meta and Google ads") do not split it.
      const claimScope = (start: number, length: number) => {
        const preceding = boundaries.filter(b => b.index! + b[0].length <= start);
        const before = preceding[preceding.length - 1];
        const after = boundaries.find(b => b.index! >= start + length);
        return part.slice(before ? before.index! + before[0].length : 0, after?.index ?? part.length);
      };
      const unsupportedClaim = (pattern: RegExp, supported: (scope: string) => boolean) => [...part.matchAll(pattern)].some(match => {
        const scope = claimScope(match.index!, match[0].length);
        return !unavailableWords.test(scope) && !supported(scope);
      });
      const adNegative = unsupportedClaim(/\b(?:no|zero)\s+(?:\w+\s+){0,4}(?:ads|advertising|campaigns)\b|\b(?:not|isn.t|aren.t)\s+(?:\w+\s+){0,3}(?:running|advertising)\b|\b(?:ads|campaigns)\s+(?:are\s+)?(?:absent|inactive)\b/gi, scope =>
        (/\b(?:Meta|Facebook)\b.*(?:Ad Library|Page)|Ad Library.*\b(?:Meta|Facebook|Page)\b/i.test(scope) && lib?.meta_ad_status === 'not_running') || (/Transparency Center/i.test(scope) && lib?.google_ads_status === 'none')
      );
      // A readable account cannot substantiate an absent account. The current
      // readers also do not establish global non-existence from failed reads.
      const socialAbsent = unsupportedClaim(/\bno\s+(?:Instagram\s+(?:account|profile|presence)|social\s+presence)\b|\blacks?\s+(?:an?\s+)?Instagram\b/gi, () => false);
      const socialInactive = unsupportedClaim(/\b(?:inactive|not active|(?:no|zero|0) posts|not posting|doesn.t post)\b/gi, scope => {
        if (!/Instagram|social|posts?/i.test(scope)) return true;
        const ig = facts.social?.business;
        return coverage.get('instagram') === 'checked' && (ig?.posts === 0 || (ig?.posts_last_30_days === 0 && /(?:last|past|recent)\s+30\s+days|30.day\s+(?:window|period)/i.test(scope)));
      });
      const demandClaim = unsupportedClaim(/\b(?:no|zero|low|little|limited|weak)\s+(?:\w+\s+){0,3}(?:demand|search volume|searches)\b|\b(?:demand|search volume|searches)\s+(?:\w+\s+){0,3}(?:low|zero|limited|weak|absent)\b/gi, () => coverage.get('keywords') === 'checked');
      const mapsAbsent = unsupportedClaim(/\b(?:no|lacks?(?:\s+a)?)\s+Google\s+(?:listing|profile)\b|\bnot\s+(?:listed|present)\s+on Google\b/gi, scope => coverage.get('maps') === 'not_found' && /lookup|search|query|under (?:its|the|their) name/i.test(scope));
      const reviewsAbsent = unsupportedClaim(/\bno Google reviews\b/gi, () => facts.maps?.business?.reviews === 0);
      const unsupported = adNegative || socialAbsent || socialInactive || demandClaim || mapsAbsent || reviewsAbsent;
      if (unsupported) removed.push(part.trim());
      return !unsupported;
    });
    return kept.join('').trim();
  };
  const writeup = mapStrings(w, revise);
  // A claim attached to an unread source is a hypothesis, never an observed finding.
  if (writeup.findings) writeup.findings = writeup.findings.map(finding => ({ ...finding, basis: finding.source !== 'client_accounts' && coverage.get(finding.source) !== 'checked' ? 'hypothesis' : finding.basis }));
  return { writeup, removed };
}

const str = (v: unknown, max = 400) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const list = (v: unknown, n: number, max = 220) => (Array.isArray(v) ? v.map((x) => str(x, max)).filter(Boolean).slice(0, n) : []);

/** Coerces the model's JSON into the Writeup shape, dropping anything unexpected. */
export function normalizeWriteup(raw: unknown): Writeup {
  const r = (raw ?? {}) as Record<string, unknown>;
  const areas = (r.areas ?? {}) as Record<string, Record<string, unknown>>;
  const plan = (r.plan ?? {}) as Record<string, unknown>;
  return {
    headline: str(r.headline, 140),
    verdict: str(r.verdict, 1200),
    areas: Object.fromEntries(
      AREAS.map((k) => [
        k,
        {
          summary: str(areas[k]?.summary, 1000),
          working: list(areas[k]?.working, 4, 500),
          costing: list(areas[k]?.costing, 4, 500),
          fixes: list(areas[k]?.fixes, 5, 500),
        },
      ])
    ) as Record<AreaKey, AreaWriteup>,
    plan: { weeks_1_2: list(plan.weeks_1_2, 4), weeks_3_6: list(plan.weeks_3_6, 4), weeks_7_12: list(plan.weeks_7_12, 4) },
    next_steps: list(r.next_steps, 3),
    cant_see: list(r.cant_see, 5),
    findings: (Array.isArray(r.findings) ? r.findings : []).filter((v): v is Record<string, unknown> => Boolean(v && typeof v === 'object')).map(v => ({
      area: AREAS.includes(v.area as AreaKey) ? v.area as AreaKey : 'website',
      priority: (['high', 'medium', 'low'].includes(String(v.priority)) ? v.priority : 'medium') as ReportFinding['priority'],
      title: str(v.title, 160), evidence: str(v.evidence, 600),
      source: (['website', 'maps', 'search', 'keywords', 'instagram', 'facebook', 'ad_tags', 'ads_library', 'client_accounts'].includes(String(v.source)) ? v.source : 'website') as ReportFinding['source'],
      basis: (['observed', 'derived', 'hypothesis'].includes(String(v.basis)) ? v.basis : 'hypothesis') as ReportFinding['basis'],
      implication: str(v.implication, 500), action: str(v.action, 600), measure: str(v.measure, 300), effort: str(v.effort, 300), dependency: str(v.dependency, 300),
    })).filter(v => v.title && v.evidence && v.action).slice(0, 8),
    assumptions: list(r.assumptions, 6, 500),
  };
}

const clamp = (x: unknown, lo: number, hi: number, fallback: number) =>
  typeof x === 'number' && Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : fallback;

function triple(v: unknown, lo: number, hi: number, fallback: [number, number, number]): [number, number, number] {
  const xs = Array.isArray(v) ? v.map((x) => clamp(x, lo, hi, NaN)).filter((x) => Number.isFinite(x)) : [];
  if (xs.length !== 3) return fallback;
  return [...xs].sort((a, b) => a - b) as [number, number, number];
}

export function normalizeEstimates(raw: unknown): Estimates {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    category: str(r.category, 80) || 'local business',
    ticket: triple(r.ticket, 20, 50_000, [150, 250, 400]),
    close: triple(r.close, 0.05, 0.9, [0.2, 0.3, 0.4]),
    gross_margin: clamp(r.gross_margin, 0.1, 0.9, 0.5),
    basis: str(r.basis, 600) || 'Category planning assumptions, not verified business economics; confirm order value, close rate and margin before funding.',
    has_current_marketer: typeof r.has_current_marketer === 'boolean' ? r.has_current_marketer : null,
    is_nwse_client: typeof r.is_nwse_client === 'boolean' ? r.is_nwse_client : null,
  };
}

// ---------------------------------------------------------------------------
// ROI inputs

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export interface RoiPlan {
  inputs: RoiInputs;
  sources: string[];
  core_keywords: string[];
}

/** Builds the three scenarios from Keyword Planner demand and bids; null without demand. */
export function roiInputsFrom(f: Facts, est: Estimates): RoiPlan | null {
  if (f.keywords?.demand_status === 'unavailable') return null;
  const ideas = (f.keywords?.ideas ?? []).filter((k) => (k.monthly_searches ?? 0) > 0);
  const core = [...ideas].sort((a, b) => (b.monthly_searches ?? 0) - (a.monthly_searches ?? 0)).slice(0, 10);
  const demand = core.reduce((sum, k) => sum + (k.monthly_searches ?? 0), 0);
  if (!core.length || demand <= 0) return null;

  const low = median(core.map((k) => k.low_bid_usd).filter((x): x is number => x !== null && x > 0));
  const high = median(core.map((k) => k.high_bid_usd).filter((x): x is number => x !== null && x > 0));
  let cpc: [number, number, number];
  let cpcSource: string;
  if (low !== null && high !== null && high >= low) {
    const mid = (low + high) / 2;
    cpc = [high, mid, (low + mid) / 2];
    cpcSource = `Cost per click from Keyword Planner's top-of-page bids for the core keywords (about $${low.toFixed(2)} to $${high.toFixed(2)}).`;
  } else {
    cpc = [BENCHMARKS.cpc * 1.2, BENCHMARKS.cpc, BENCHMARKS.cpc * 0.85];
    cpcSource = `Cost per click from ${BENCHMARKS.source}; Keyword Planner returned no bids.`;
  }

  const coreSet = new Set(core.map((k) => k.keyword.toLowerCase()));
  const ranksFirst = (f.search?.business?.top_keywords ?? []).some((k) => k.position === 1 && coreSet.has(k.keyword.toLowerCase()));
  const incrementality = ranksFirst ? INCREMENTALITY.ranks_first : INCREMENTALITY.otherwise;

  const scenario = (i: 0 | 1 | 2): RoiScenarioInputs => ({
    impression_share: [0.5, 0.65, 0.75][i],
    ctr: BENCHMARKS.ctr * [0.8, 1, 1.1][i],
    cpc: cpc[i],
    cvr: BENCHMARKS.cvr * [0.6, 0.8, 1][i],
    close: est.close[i],
    ticket: est.ticket[i],
    gross_margin: est.gross_margin,
    incrementality,
  });

  return {
    inputs: {
      company: f.business.name,
      lever: `Google Search ads on the core ${est.category} searches in the area`,
      demand_monthly: demand,
      ramp: [0.5, 0.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      scenarios: { conservative: scenario(0), base: scenario(1), optimistic: scenario(2) },
    },
    core_keywords: core.map((k) => k.keyword),
    sources: [
      `Demand: about ${Math.round(demand).toLocaleString('en-US')} searches a month for the ten largest keywords in ${f.keywords?.source ?? 'Google Ads Keyword Planner'}.`,
      cpcSource,
      `Click-through and conversion rates: ${BENCHMARKS.source}, discounted for a new account in the conservative and base cases.`,
      `Share of clicks that are new business: ${Math.round(incrementality * 100)}% (${INCREMENTALITY.source}; ${ranksFirst ? 'a supplied core keyword is recorded at position one' : 'no supplied core keyword was verified at position one; this is an assumption, not proof of absent rankings'}).`,
      `Average job value, close rate and gross margin: ${est.basis}`,
    ],
  };
}

// ---------------------------------------------------------------------------
// The step

const SYSTEM = `You write detailed, decision-ready marketing audits for the business and the preparing agency.
You receive JSON of data gathered from public sources (website scan, Google Maps, Ahrefs, Google Ads Keyword Planner, Instagram and the Facebook Page, ad tags).
- instagram.business.note, when present, says why the Instagram profile could not be read (it is shown only to signed-in adults): say that in the social area, never that the business is inactive on Instagram, and use instagram.facebook for the social figures instead.
Write in plain words for a busy owner. Rules:
- Use ONLY facts in the data. Every number you write must appear in the data. Do not invent statistics, studies, percentages, or prices.
- Never cite sources as links or URLs; name a source in words if needed.
- If a field is null, missing, or in not_available, say it could not be checked; never say the business lacks something you could not see.
- Read evidence_coverage before drawing conclusions. not_checked means no read; unavailable means an attempted source did not establish the facts; not_found is only a scoped no-match. None proves zero activity, no demand, a missing account or no advertising.
- Tracking tags and Ahrefs paid_keywords:0 or empty paid_pages do not establish whether campaigns are active. Use ad_libraries for scoped public ad presence, and only linked client_accounts for spend, conversions and performance. Name the library and observed scope when reporting a negative; never write "no active campaigns detected" as a global conclusion.
- Keyword suggestions with null monthly_searches/bids are unmeasured research ideas. Do not label their demand low or zero, quote a budget or extrapolate returns from them. Query-specific search results show only the supplied query, place and capture time.
- Never describe as active something the data does not show.
- business_profile, website_pages and competitor_picks, when present, come from the business's own website pages and its competitors' homepages (read as main content): use them for what the business sells, what each competitor offers, and why each competitor was chosen; competitor_picks.left_out names candidates that did not compete.
- ai_search, when present, is what AI crawlers and assistants see: crawlers_blocked and gptbot_blocked are read from robots.txt and a fetch as GPTBot; citability is a rubric score per page (0–100), not a ranking; ai_visibility holds Ahrefs Brand Radar mentions and share of voice for the business and its competitors across the named assistants, and site_citations how often they cite the site. Use it in the search and website areas; zero mentions means the assistants did not name the business in Ahrefs’ prompt set, not that nobody asks. Never invent an AI traffic figure.
- website.business.technical_seo contains verified observations and fixes from the initial HTTP response only. Prioritize its high-severity findings in the website area. JavaScript was not rendered: an empty app shell, missing raw-body heading or small raw-body word count does not prove that Google cannot index the page or that it ranks poorly. Preserve the stated verification steps; do not invent SEO scores, traffic effects, or ranking gains. noindex may be intentional on private pages.
- When client_accounts is present, it is data from the business's own accounts (Google Analytics, Search Console, Google Ads, Instagram, Meta Ads). It outranks the public estimates: prefer it in every area it covers, say which figures come from the business's own accounts, and do not list those accounts under cant_see.
- business.notes are the preparer's notes on the business. Prices, an average sale or a close rate they give are the business's own figures: the estimates use them, never a category average in their place.
- Use they/them for people. Do not name people.
- Recommend concrete fixes in priority order.
- Each finding must connect a named observation to a business implication, an implementable action, its dependency and a way to verify the result. Distinguish measured loss from a plausible risk; do not claim lost sales from public data alone. Use actual service names, page paths, relevant search intent and competing businesses when the evidence supplies them. Avoid generic headlines such as "Boost Online Presence" and canned actions such as "post more" or "improve SEO".
- Group keyword opportunities by customer intent, and explain mismatches between the service sold and informational, employment/training, unrelated or out-of-area searches when the observed terms support it. Do not chase the largest volume without fit.
- Explain costs and assumptions: use effort as a labelled estimate without invented prices, disclose what must be measured before spending, and let the subsequent deterministic return model choose funded platforms/budgets. If demand is unverified, say to verify it first; never imply an ad launch has already been approved.
- Do not mention GroundSwell or the engine in the client narrative. Write for the named business and its preparer.
Return JSON only with this shape:
{"headline": string (max 12 words),
 "verdict": string (3-5 substantive sentences: strongest observation, constraint, decision and uncertainty),
 "areas": {"google"|"social"|"website"|"ads"|"competitors"|"keywords": {"summary": string, "working": string[], "costing": string[], "fixes": string[]}},
 "plan": {"weeks_1_2": string[], "weeks_3_6": string[], "weeks_7_12": string[]},
 "next_steps": string[3],
 "cant_see": string[] (what needs owner access, e.g. Google Business Profile performance),
 "findings": [{"area": "google"|"social"|"website"|"ads"|"competitors"|"keywords", "priority": "high"|"medium"|"low", "title": string, "evidence": string (specific observation with date/scope where available), "source": "website"|"maps"|"search"|"keywords"|"instagram"|"facebook"|"ad_tags"|"ads_library"|"client_accounts", "basis": "observed"|"derived"|"hypothesis", "implication": string, "action": string, "measure": string (acceptance check, not invented forecast), "effort": string (label estimate and assumptions), "dependency": string}],
 "assumptions": string[] (material gaps, dependencies and estimates that could change the decision),
 "estimates": {"category": string (the business category in 1-3 words),
   "ticket": [low, typical, high] the business's average job or order value in USD: from its own figures when business.notes or its own website_pages give prices or an average sale (weighted to what it mainly sells), otherwise this category's,
   "close": [low, typical, high] share of leads that become paying jobs (0-1): from business.notes when they give a close rate, otherwise this category's,
   "gross_margin": number (0-1),
   "basis": string (one sentence: what the estimates rest on; name the figures taken from the notes or the business's own prices, and say the rest are estimates),
   "has_current_marketer": boolean or null (true only if the notes say they pay a marketer),
   "is_nwse_client": boolean or null (true only if the notes say they are already a New Wave: Social Engineering client or customer)}}
Write 4-8 substantive findings when the evidence supports them. Fewer supported findings are better than invented completeness. Area summaries should explain the observation and its implication in 2-4 sentences. Keep each list item under 70 words, with at most 4 per list. The 90-day plan must name deliverables, dependencies and verification; use prose, without decorative step numbering.`;

export async function runModel(ctx: StepContext) {
  const facts = buildFacts(ctx.audit, ctx.outputs);
  if (!facts.site?.business && !facts.social?.business && !facts.social?.facebook?.exists && !facts.maps?.business) {
    throw new PermanentStepError('No data was gathered for this business (website, social profiles and Google Maps all came back empty).');
  }
  const promptFacts = factsForPrompt(facts);
  const allowed = allowedNumbers(promptFacts);
  const user = `Data for the audit (JSON):\n${JSON.stringify(promptFacts)}`;

  const raw = await chatJson<Record<string, unknown>>(SYSTEM, user);
  let writeup = normalizeWriteup(raw);
  const estimates = normalizeEstimates(raw.estimates);
  const problems = writeupProblems(writeup, allowed);
  if (problems.length && ctx.deadline - Date.now() > 90_000) {
    const repaired = await chatJson<Record<string, unknown>>(
      SYSTEM,
      `${user}\n\nYour previous answer:\n${JSON.stringify(writeup)}\n\nThese sentences use numbers that are not in the data. Rewrite them without those numbers and return the full JSON again (same shape, estimates included):\n${problems.map((p) => `- ${p}`).join('\n')}`
    );
    const second = normalizeWriteup(repaired);
    // A repair that loses the headline or verdict is worse than scrubbing the first answer.
    if (second.headline && second.verdict) writeup = second;
  }
  const numeric = scrubWriteup(writeup, allowed);
  const evidence = scrubUnsupportedClaims(numeric.writeup, facts);
  const scrubbed = { writeup: evidence.writeup, removed: [...numeric.removed, ...evidence.removed] };
  if (!scrubbed.writeup.headline || !scrubbed.writeup.verdict) throw new Error('The write-up came back without a headline or verdict.');

  const plan = roiInputsFrom(facts, estimates);
  const roi: RoiResult | null = plan ? runRoiModel(plan.inputs) : null;

  return {
    report_schema_version: 2,
    model: GROUNDSWELL_MODEL(),
    generated_at: new Date().toISOString(),
    writeup: scrubbed.writeup,
    removed_sentences: scrubbed.removed,
    estimates,
    roi,
    roi_sources: plan?.sources ?? [],
    core_keywords: plan?.core_keywords ?? [],
    roi_note: plan ? null : 'Keyword demand and bids could not be verified for this run, so ad spend and return were not modeled. This does not establish low or zero demand.',
  };
}
