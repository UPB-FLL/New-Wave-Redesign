import { normalizeWebsite } from '../../../../src/lib/groundswellValidation.js';
import { readGoogleSerp, categoryFromSite, categoryFromText, isLinkPageUrl, specificCategory, type GoogleSerp } from './serp.js';
import { googlePlacesSearch, matchBusiness, serpMapsSearch, toMapsPlace } from './maps.js';
import { executeTool, findKey } from '../composio.js';
import { buildBusinessProfile, filterCompetitors, isDirectoryHost, isListPage, judgeCompetitors, profileWords, readInstagramBio, sharesCategory, type BusinessProfile, type Candidate } from '../businessProfile.js';
import { readSitePages, type SitePage } from './sitePages.js';
import { type AuditCompetitor, type AuditRow, type StepContext } from '../types.js';
import type { SiteScan } from './site.js';

/**
 * Competitors Current: the businesses a customer might choose instead, from
 * public sources, when fewer than six were entered. Manual selections stay
 * first.
 *
 * The business's own website says what it does (businessProfile.ts: its
 * category, offer, services and service area, from the pages Firecrawl reads).
 * Candidates come from Google Places (the category near the area), from a
 * public Google search of the profile's own queries (SerpApi; the local pack
 * and the organic results), and from Firecrawl's web search when SerpApi
 * cannot answer. Every candidate then has to compete: share the business's
 * category wording, and pass the model's relevance check with a reason. What
 * was dropped, and why, is kept for staff. Selection order is popularity
 * (reviews), never a search ranking.
 */

export const PICKS_WANTED = 6;
const RESULTS = 20;
const SOURCE = 'Competitor candidates from public Google listings and search results, kept only when they compete with the business; selection by review count, not search ranking';

export interface CompetitorPick {
  market: 'local' | 'national';
  name: string;
  website: string;
  rating: number | null;
  reviews: number | null;
  address: string | null;
  url: string | null;
  /** The Places or search query the pick came from. */
  query: string;
  /** Where the candidate was found; missing on audits before 2026-10-24. */
  source?: 'places' | 'maps_search' | 'google_search' | 'web_search';
  /** Why it competes, in one sentence. */
  reason?: string;
}

export interface CompetitorsOutput {
  source: string;
  fetched_at: string;
  business: { name: string; category: string; area: string; place_id: string | null } | null;
  local: CompetitorPick | null;
  national: CompetitorPick | null;
  /** How many places each query returned before the rules. */
  considered: { local: number; national: number };
  /** The audit's competitors after the picks: entered first, then local, then national. */
  competitors: AuditCompetitor[];
  note: string | null;
  picks: CompetitorPick[];
  sources: CompetitorDiscoverySource[];
  gaps: string[];
  /** The business's profile from its own site; missing on audits before 2026-10-24. */
  profile?: BusinessProfile;
  /** The business's pages read for the profile (the site-pages step reuses them). */
  pages?: SitePage[];
  /** Candidates that did not compete, with the reason (for staff). */
  dropped?: { name: string; website: string | null; reason: string }[];
}

type Row = Record<string, unknown>;

/** "example.com" for any URL, or null. */
export const hostOf = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
};

/** The city in a Places formatted address ("12 Dock St, Fort Lauderdale, FL 33301, USA" → "fort lauderdale"). */
export function cityOf(address: string | null | undefined): string | null {
  if (!address) return null;
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  // Street, City, State ZIP, Country: the city is the second part from the end but two.
  const country = /^(?:USA|United States|US|Canada|UK|United Kingdom)$/i.test(parts[parts.length - 1] ?? '');
  const index = parts.length - (country ? 3 : 2);
  return index >= 0 ? parts[index].toLowerCase() : null;
}

/** The first word of each name, lower-cased, for "is this the same business" checks. */
const key = (name: string | null | undefined) => (name ?? '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim();

export interface PickRules {
  /** Places to leave out: the business and anything already chosen or entered. */
  excludeIds: Set<string>;
  excludeHosts: Set<string>;
  excludeNames: Set<string>;
  /** When set, places in this city are left out (the country-wide pick). */
  excludeCity: string | null;
}

/** The best candidate under the rules: open, with a website, most reviews first, then the higher rating. */
export function pickFrom(rows: Row[], rules: PickRules, market: CompetitorPick['market'], query: string): CompetitorPick | null {
  const candidates = rows
    .filter((r) => !(typeof r.id === 'string' && rules.excludeIds.has(r.id)))
    .filter((r) => !/^CLOSED/i.test(String(r.businessStatus ?? '')))
    .map((r) => ({ r, place: toMapsPlace(r), host: hostOf(toMapsPlace(r).website) }))
    .filter(({ place, host }) => place.name && host && !rules.excludeHosts.has(host) && !rules.excludeNames.has(key(place.name)))
    .filter(({ place }) => !rules.excludeCity || cityOf(place.address) !== rules.excludeCity)
    .sort((a, b) => (b.place.reviews ?? -1) - (a.place.reviews ?? -1) || (b.place.rating ?? -1) - (a.place.rating ?? -1));
  for (const candidate of candidates) {
    let website: string | null = null;
    try { website = normalizeWebsite(candidate.place.website ?? ''); } catch { continue; }
    if (website) return { market, name: candidate.place.name!, website, rating: candidate.place.rating, reviews: candidate.place.reviews, address: candidate.place.address, url: candidate.place.url, query };
  }
  return null;
}

const toCompetitor = (p: CompetitorPick): AuditCompetitor => ({ name: p.name, website: p.website, instagram: null });

export interface CompetitorSeed {
  business_name: string;
  city: string | null;
  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  /** A category derived from the business's own public profile or website. */
  category?: string | null;
  /** The business's profile from its own site, when the caller built one. */
  profile?: BusinessProfile | null;
  /** Absolute epoch-ms deadline for a short intake request. Omitted on worker calls. */
  deadline?: number;
}
export interface CompetitorDiscoverySource {
  label: string;
  url?: string;
  query: string;
  captured_at: string;
  notes?: string;
}
export interface CompetitorDiscovery {
  competitors: AuditCompetitor[];
  picks: CompetitorPick[];
  business: CompetitorsOutput['business'];
  considered: CompetitorsOutput['considered'];
  sources: CompetitorDiscoverySource[];
  gaps: string[];
  dropped: { name: string; website: string | null; reason: string }[];
}

/** A candidate with what the relevance check and the pick need. */
interface Found extends Candidate {
  website: string;
  host: string;
  rating: number | null;
  reviews: number | null;
  url: string | null;
  query: string;
  source: NonNullable<CompetitorPick['source']>;
  placeId: string | null;
  closed: boolean;
}

const normalizedSite = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  try { return normalizeWebsite(raw) || null; } catch { return null; }
};

/** Places rows as candidates (open, with a website). */
function fromPlaces(rows: Row[], query: string, source: Found['source']): Found[] {
  return rows.flatMap((r) => {
    const place = toMapsPlace(r);
    const website = normalizedSite(place.website);
    const host = hostOf(website);
    if (!place.name || !website || !host) return [];
    return [{ name: place.name, website, host, category: place.category, title: null, snippet: null, address: place.address, rating: place.rating, reviews: place.reviews, url: place.url, query, source, placeId: typeof r.id === 'string' ? r.id : null, closed: /^CLOSED/i.test(String(r.businessStatus ?? '')) }];
  });
}

/** A search result's business name: the title before " | ", " - " or " – ". */
const nameFromTitle = (title: string) => title.split(/\s+[|–—]\s+|\s+-\s+/)[0].trim().slice(0, 80);

/** The local pack and the organic results of a public Google search as candidates (directories left out). */
export function fromSerp(serp: GoogleSerp): Found[] {
  const out: Found[] = [];
  for (const l of serp.local) {
    const website = normalizedSite(l.website);
    const host = hostOf(website);
    if (!website || !host || isDirectoryHost(host)) continue;
    out.push({ name: l.title, website, host, category: l.category, title: null, snippet: null, address: l.address, rating: l.rating, reviews: l.reviews, url: l.url, query: serp.query, source: 'google_search', placeId: null, closed: false });
  }
  for (const r of serp.organic) {
    const host = r.domain ?? hostOf(r.url);
    let website: string | null = null;
    try { website = normalizedSite(`${new URL(r.url).protocol}//${new URL(r.url).hostname}`); } catch { website = null; }
    if (!host || !website || isDirectoryHost(host) || !r.title) continue;
    out.push({ name: nameFromTitle(r.title), website, host, category: null, title: r.title, snippet: r.snippet, address: null, rating: null, reviews: null, url: r.url, query: serp.query, source: 'google_search', placeId: null, closed: false });
  }
  return out;
}

/** Firecrawl's web search (`data.web[]`: title, url, description) as candidates, when SerpApi cannot answer. */
export function fromWebSearch(payload: unknown, query: string): Found[] {
  const web = findKey<unknown[]>(payload, 'web') ?? findKey<unknown[]>(payload, 'results') ?? findKey<unknown[]>(payload, 'data') ?? [];
  const rows = (Array.isArray(web) ? web : []).filter((r): r is Row => Boolean(r && typeof r === 'object'));
  const out: Found[] = [];
  for (const r of rows) {
    const url = typeof r.url === 'string' ? r.url : null;
    const title = typeof r.title === 'string' ? r.title : null;
    const host = hostOf(url);
    let website: string | null = null;
    try { website = url ? normalizedSite(`${new URL(url).protocol}//${new URL(url).hostname}`) : null; } catch { website = null; }
    if (!url || !title || !host || !website || isDirectoryHost(host)) continue;
    out.push({ name: nameFromTitle(title), website, host, category: null, title, snippet: typeof r.description === 'string' ? r.description.slice(0, 300) : null, address: null, rating: null, reviews: null, url, query, source: 'web_search', placeId: null, closed: false });
  }
  return out;
}

/** Intake and audit use the same public, read-only candidate lookup. No database or ad accounts are written. */
export async function findCompetitors(seed: CompetitorSeed, limit = PICKS_WANTED): Promise<CompetitorDiscovery> {
  const count = Math.max(1, Math.min(PICKS_WANTED, limit));
  const hasBudget = () => seed.deadline === undefined || seed.deadline - Date.now() > 500;
  const timeoutMs = () => seed.deadline === undefined ? undefined : Math.max(1, Math.min(90_000, seed.deadline - Date.now() - 200));
  const gaps: string[] = [];
  const sources: CompetitorDiscoverySource[] = [];
  const query = [seed.business_name, seed.city].filter(Boolean).join(' ');
  let found: Row | null = null;
  if (hasBudget()) try { found = matchBusiness(await googlePlacesSearch(query, 5, timeoutMs()), seed.business_name, seed.website); }
  catch (err) { gaps.push(`Google Places business lookup: ${err instanceof Error ? err.message : String(err)}`); }
  if (!found && hasBudget()) {
    try { found = matchBusiness(await serpMapsSearch(query, timeoutMs()), seed.business_name, seed.website); }
    catch (err) { gaps.push(`Public Maps business lookup: ${err instanceof Error ? err.message : String(err)}`); }
  }
  const self = found ? toMapsPlace(found) : null;
  const profile: BusinessProfile = seed.profile ?? { category: null, offer: null, services: [], audience: null, service_area: null, competitor_queries: [], content_topics: [], source: 'none', evidence: [] };
  let category = specificCategory(profile.category) || specificCategory(seed.category) || specificCategory(self?.category);
  if (!category && hasBudget()) {
    const web = await readGoogleSerp(query, seed.city, timeoutMs());
    const ownHost = hostOf(seed.website);
    const ownResults = web.organic.filter((r) => ownHost ? r.domain === ownHost : r.title.toLowerCase().includes(seed.business_name.toLowerCase()));
    category = categoryFromText(ownResults.map((r) => `${r.title} ${r.snippet ?? ''}`).join(' '));
    if (web.error) gaps.push(`Google business search: ${web.error}`);
    if (category) sources.push({ label: 'Business category from its own Google-indexed page', query, url: ownResults[0]?.url, captured_at: web.captured_at });
  }
  if (!profile.category && category) { profile.category = category; profile.source = 'listing'; }
  const area = seed.city || cityOf(self?.address) || null;
  const empty: CompetitorDiscovery = { competitors: [], picks: [], business: null, considered: { local: 0, national: 0 }, sources, gaps, dropped: [] };
  if (!category || !area) {
    if (!hasBudget()) gaps.push('Public competitor lookup reached its time limit; review or retry the suggestions.');
    gaps.push(!category ? 'A relevant business category could not be verified, so competitors were not guessed.' : 'A city or service area is needed to verify relevant local competitors.');
    return empty;
  }
  const localQuery = `${category} near ${area}`;
  const candidates: Found[] = [];
  let placesCount = 0;
  let label = 'Google Places API text search (relevance order; selections are not SERP rankings), via Composio';
  if (hasBudget()) try { const rows = await googlePlacesSearch(localQuery, RESULTS, timeoutMs()); placesCount = rows.length; candidates.push(...fromPlaces(rows, localQuery, 'places')); }
  catch (err) { gaps.push(`Google Places competitors: ${err instanceof Error ? err.message : String(err)}`); }
  if (!placesCount && hasBudget()) {
    label = 'Google Maps public search, via SerpApi, SearchAPI or Serper (query-specific listing order)';
    try { const rows = await serpMapsSearch(localQuery, timeoutMs()); placesCount = rows.length; candidates.push(...fromPlaces(rows, localQuery, 'maps_search')); }
    catch (err) { gaps.push(`Public Maps competitors: ${err instanceof Error ? err.message : String(err)}`); }
  }
  sources.push({ label, query: localQuery, url: `https://www.google.com/maps/search/${encodeURIComponent(localQuery)}`, captured_at: new Date().toISOString(), notes: 'Suggestions use the same category and area. Review counts describe popularity, not a Google ranking.' });

  // The searches a customer would make: the local pack and the organic results name who is found online.
  const searches = [...new Set([profile.competitor_queries[0], `${category} ${area}`].filter((q): q is string => Boolean(q)))].slice(0, 2);
  let searchCount = 0;
  for (const q of searches) {
    if (!hasBudget()) break;
    const serp = await readGoogleSerp(q, seed.city, timeoutMs());
    if (!serp.error) {
      const rows = fromSerp(serp);
      searchCount += rows.length;
      candidates.push(...rows);
      sources.push({ label: 'Public Google search (query-specific, dated; the local pack and organic results)', query: q, url: serp.source_url, captured_at: serp.captured_at, notes: 'Who appears for the search; positions describe this query and capture only.' });
      continue;
    }
    gaps.push(`Google search "${q}": ${serp.error}`);
    if (!hasBudget()) break;
    try {
      const payload = await executeTool('FIRECRAWL_SEARCH', { q, limit: 8, country: 'us', lang: 'en' }, timeoutMs());
      const rows = fromWebSearch(payload, q);
      searchCount += rows.length;
      candidates.push(...rows);
      sources.push({ label: 'Web search, via Firecrawl (the top results for the query)', query: q, captured_at: new Date().toISOString(), notes: 'Who appears for the search; not a ranking claim.' });
    } catch (err) { gaps.push(`Web search "${q}": ${err instanceof Error ? err.message : String(err)}`); }
  }

  // One candidate per website: a listing's figures first, a search result's words added to it.
  const ownHosts = new Set([hostOf(self?.website), hostOf(seed.website)].filter((h): h is string => Boolean(h)));
  const ownNames = new Set([key(self?.name), key(seed.business_name)]);
  const byHost = new Map<string, Found>();
  for (const c of candidates) {
    if (c.closed || ownHosts.has(c.host) || ownNames.has(key(c.name)) || (found && typeof found.id === 'string' && c.placeId === found.id)) continue;
    const had = byHost.get(c.host);
    if (!had) { byHost.set(c.host, { ...c }); continue; }
    had.category ??= c.category; had.title ??= c.title; had.snippet ??= c.snippet; had.address ??= c.address; had.rating ??= c.rating; had.reviews ??= c.reviews; had.url ??= c.url;
  }
  const decisions = await filterCompetitors(profile, { name: seed.business_name, city: seed.city }, [...byHost.values()], hasBudget() ? Math.min(45_000, timeoutMs() ?? 45_000) : 0);
  const dropped = decisions.filter((d) => !d.competes).map((d) => ({ name: d.candidate.name, website: d.candidate.website, reason: d.reason }));
  const kept = decisions.filter((d) => d.competes).sort((a, b) => (b.candidate.reviews ?? -1) - (a.candidate.reviews ?? -1) || (b.candidate.rating ?? -1) - (a.candidate.rating ?? -1));
  const picks: CompetitorPick[] = kept.slice(0, count).map(({ candidate: c, reason }) => ({ market: 'local', name: c.name, website: c.website, rating: c.rating, reviews: c.reviews, address: c.address, url: c.url, query: c.query, source: c.source, reason }));
  if (!hasBudget()) gaps.push('Public competitor lookup reached its time limit; review or retry the suggestions.');
  if (picks.length < count) gaps.push(`Only ${picks.length} relevant local competitor${picks.length === 1 ? '' : 's'} with a usable website could be verified.`);
  return { ...empty, business: { name: self?.name ?? seed.business_name, category, area, place_id: typeof found?.id === 'string' ? found.id : null }, considered: { local: placesCount + searchCount, national: 0 }, competitors: picks.map(toCompetitor), picks, dropped };
}

/**
 * The business's profile for the step: its site's pages through Firecrawl
 * (within a budget) and its Instagram bio (its own words on what it does,
 * which a link-in-bio page cannot give), then the model.
 */
async function profileFor(ctx: StepContext, scan: SiteScan | null | undefined, listingCategory: string | null): Promise<{ profile: BusinessProfile; pages: SitePage[]; gaps: string[] }> {
  const gaps: string[] = [];
  let pages: SitePage[] = [];
  const website = scan?.final_url ?? ctx.audit.website;
  const remaining = ctx.deadline - Date.now();
  const [biography, read] = await Promise.all([
    readInstagramBio(ctx.audit.instagram, Math.min(12_000, Math.max(0, remaining - 30_000))),
    website && remaining > 60_000 && !isLinkPageUrl(website)
      ? readSitePages(website, { limit: 6, deadline: Date.now() + Math.min(70_000, remaining - 45_000) }).catch((err: unknown) => ({ pages: [] as SitePage[], error: err instanceof Error ? err.message : String(err) }))
      : Promise.resolve(null),
  ]);
  if (read) {
    pages = read.pages;
    if (read.error) gaps.push(`Website pages: ${read.error}`);
  }
  const profile = await buildBusinessProfile({ name: ctx.audit.business_name, city: ctx.audit.city, scan, pages, social: { biography }, listingCategory, timeoutMs: Math.max(5_000, Math.min(45_000, ctx.deadline - Date.now() - 40_000)) });
  return { profile, pages, gaps };
}

export interface EnteredCheck {
  kept: AuditCompetitor[];
  setAside: { name: string; website: string | null; reason: string }[];
}

/**
 * Entered competitors are checked against the verified profile too: a
 * suggestion accepted in intake can be off-category (six restaurant pages
 * were queued for a dog trainer on 2026-10-30). Each one's homepage title is
 * read for its words; one that fails the word check is set aside only when
 * the model agrees, or, without the model, when its words name a different
 * category outright. A name alone never rules a competitor out.
 */
export async function checkEntered(profile: BusinessProfile, business: { name: string; city: string | null }, entered: AuditCompetitor[], deadline: number): Promise<EnteredCheck> {
  if (!entered.length || !profile.category) return { kept: entered, setAside: [] };
  const budget = () => deadline - Date.now();
  const { inspectBusinessWebsite } = await import('../discoveryWebsite.js');
  const candidates: (Candidate & { competitor: AuditCompetitor })[] = await Promise.all(
    entered.map(async (c) => {
      let title: string | null = null;
      let snippet: string | null = null;
      if (c.website && budget() > 20_000 && !isLinkPageUrl(c.website)) {
        try {
          const found = await inspectBusinessWebsite(c.website, { timeoutMs: Math.min(6_000, budget() - 15_000) });
          title = found.scan.title;
          snippet = [found.scan.meta_description, ...found.scan.h1].filter(Boolean).join(' ') || null;
        } catch { /* The name alone is checked. */ }
      }
      return { competitor: c, name: c.name, website: c.website, category: null, title, snippet, address: null };
    })
  );
  const exclude = [business.name, business.city ?? ''];
  const words = profileWords(profile, exclude);
  const kept: AuditCompetitor[] = [];
  const setAside: EnteredCheck['setAside'] = [];
  const doubtful: (Candidate & { competitor: AuditCompetitor })[] = [];
  for (const c of candidates) {
    const host = hostOf(c.website);
    const ownText = [c.name, c.title, c.snippet].filter(Boolean).join(' ');
    if (isDirectoryHost(host) || isListPage(c.name) || isListPage(c.title)) { setAside.push({ name: c.name, website: c.website, reason: 'Entered, but a directory or list page, not a business.' }); continue; }
    if (sharesCategory(words, ownText, exclude).ok) { kept.push(c.competitor); continue; }
    doubtful.push(c);
  }
  if (doubtful.length) {
    const judged = await judgeCompetitors(profile, business, doubtful, Math.max(0, Math.min(30_000, budget() - 10_000)));
    doubtful.forEach((c, i) => {
      const j = judged[i];
      const other = categoryFromText([c.name, c.title, c.snippet].filter(Boolean).join(' '));
      const differs = Boolean(other && profile.category && other.toLowerCase() !== profile.category.toLowerCase());
      if (j ? j.competes : !differs) { kept.push(c.competitor); return; }
      setAside.push({ name: c.name, website: c.website, reason: `Entered, but ${j?.reason ? j.reason.replace(/\.$/, '') : `its own words say ${other!.toLowerCase()}, not ${profile.category!.toLowerCase()}`}.` });
    });
  }
  // The entered order is kept.
  const keptSet = new Set(kept);
  return { kept: entered.filter((c) => keptSet.has(c)), setAside };
}

export async function runCompetitors(ctx: StepContext): Promise<CompetitorsOutput> {
  const entered = ctx.audit.competitors ?? [];
  const site = ctx.outputs.site as { business?: SiteScan | null } | undefined;
  let scan = site?.business;
  let category = categoryFromSite(scan);
  const websiteGaps: string[] = [];
  const remaining = ctx.deadline - Date.now();
  // This step runs before Site Current on a fresh audit. Reserve the inspector's
  // bounded CSS reads and leave time for listing research under the same deadline.
  if (!scan && ctx.audit.website && !isLinkPageUrl(ctx.audit.website) && remaining > 4_000) {
    try {
      const { inspectBusinessWebsite } = await import('../discoveryWebsite.js');
      const inspected = await inspectBusinessWebsite(ctx.audit.website, { timeoutMs: Math.min(8_000, remaining - 3_500) });
      scan = inspected.scan;
      category = categoryFromSite(scan) || specificCategory(inspected.business.category);
      if (!category && scan.error) websiteGaps.push(`First-party website category: ${scan.error}`);
    } catch (err) { websiteGaps.push(`First-party website category: ${err instanceof Error ? err.message : String(err)}`); }
  }
  const { profile, pages, gaps: profileGaps } = await profileFor(ctx, scan, category);
  const profileSource = profile.category
    ? [{ label: profile.source === 'model' ? 'Business category and offer from its own words (website pages, Instagram bio)' : profile.source === 'social' ? 'Business category from its own Instagram bio' : 'Business category from its first-party website', query: profile.category, url: scan?.final_url || ctx.audit.website || undefined, captured_at: scan?.fetched_at || new Date().toISOString(), notes: profile.source === 'model' ? `Read from ${profile.evidence.length} source${profile.evidence.length === 1 ? '' : 's'}; held to the business’s own words.` : 'Specific service wording in the business’s own words takes precedence over a generic listing label.' }]
    : [];
  const checked = await checkEntered(profile, { name: ctx.audit.business_name, city: ctx.audit.city }, entered, ctx.deadline);
  const setAsideNote = checked.setAside.length ? `${checked.setAside.length} entered competitor${checked.setAside.length === 1 ? ' was' : 's were'} set aside as not competing: ${checked.setAside.map((d) => d.name).join(', ')}.` : null;
  const kept = checked.kept;
  if (kept.length >= PICKS_WANTED) {
    return { source: SOURCE, fetched_at: new Date().toISOString(), business: null, local: null, national: null, considered: { local: 0, national: 0 }, competitors: kept, picks: [], sources: profileSource, gaps: [...websiteGaps, ...profileGaps], note: [`${kept.length} competitors were entered, so none were added.`, setAsideNote].filter(Boolean).join(' '), profile, pages, dropped: checked.setAside };
  }
  const found = await findCompetitors({ ...ctx.audit, category: profile.category ?? category, profile, deadline: ctx.deadline });
  found.sources.unshift(...profileSource);
  found.gaps.unshift(...websiteGaps, ...profileGaps);
  const hosts = new Set(kept.map((c) => hostOf(c.website)).filter(Boolean));
  const names = new Set(kept.map((c) => key(c.name)));
  const picks = found.picks.filter((p) => !hosts.has(hostOf(p.website)) && !names.has(key(p.name))).slice(0, PICKS_WANTED - kept.length);
  const competitors = [...kept, ...picks.map(toCompetitor)];
  return {
    source: SOURCE,
    fetched_at: new Date().toISOString(),
    business: found.business,
    local: picks[0] ?? null,
    national: null,
    considered: found.considered,
    competitors,
    picks,
    sources: found.sources,
    gaps: found.gaps,
    note: [...found.gaps, setAsideNote].filter(Boolean).join(' ') || null,
    profile,
    pages,
    dropped: [...checked.setAside, ...found.dropped],
  };
}

/** What the engine writes back to the audit row: the competitors, only when the step changed the list (added, or set an entered one aside). */
export function persistCompetitors(output: unknown, audit: AuditRow): Partial<Pick<AuditRow, 'competitors'>> | null {
  const out = output as CompetitorsOutput | null;
  if (!out || !Array.isArray(out.competitors)) return null;
  const was = (audit.competitors ?? []).map((c) => `${key(c.name)}|${hostOf(c.website) ?? ''}`).join(';');
  const now = out.competitors.map((c) => `${key(c.name)}|${hostOf(c.website) ?? ''}`).join(';');
  return was === now ? null : { competitors: out.competitors };
}
