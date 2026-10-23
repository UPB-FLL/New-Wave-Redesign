import { normalizeWebsite } from '../../../../src/lib/groundswellValidation.js';
import { readGoogleSerp, categoryFromText } from './serp.js';
import { googlePlacesSearch, matchBusiness, serpMapsSearch, toMapsPlace } from './maps.js';
import { type AuditCompetitor, type AuditRow, type StepContext } from '../types.js';

/** Relevant local candidates from the same public category and area. Manual selections remain first. */

export const PICKS_WANTED = 6;
const RESULTS = 20;
const SOURCE = 'Local competitor candidates from public Google listings; selection by review count, not search ranking';

export interface CompetitorPick {
  market: 'local' | 'national';
  name: string;
  website: string;
  rating: number | null;
  reviews: number | null;
  address: string | null;
  url: string | null;
  /** The Places query the pick came from. */
  query: string;
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
  let category = seed.category || self?.category || null;
  if (!category && hasBudget()) {
    const web = await readGoogleSerp(query, seed.city, timeoutMs());
    const ownHost = hostOf(seed.website);
    const ownResults = web.organic.filter((r) => ownHost ? r.domain === ownHost : r.title.toLowerCase().includes(seed.business_name.toLowerCase()));
    category = categoryFromText(ownResults.map((r) => `${r.title} ${r.snippet ?? ''}`).join(' '));
    if (web.error) gaps.push(`Google business search: ${web.error}`);
    if (category) sources.push({ label: 'Business category from its own Google-indexed page', query, url: ownResults[0]?.url, captured_at: web.captured_at });
  }
  const area = seed.city || cityOf(self?.address) || null;
  const empty: CompetitorDiscovery = { competitors: [], picks: [], business: null, considered: { local: 0, national: 0 }, sources, gaps };
  if (!category || !area) {
    if (!hasBudget()) gaps.push('Public competitor lookup reached its time limit; review or retry the suggestions.');
    gaps.push(!category ? 'A relevant business category could not be verified, so competitors were not guessed.' : 'A city or service area is needed to verify relevant local competitors.');
    return empty;
  }
  const localQuery = `${category} near ${area}`;
  let candidates: Row[] = [];
  let label = 'Google Places API text search (relevance order; selections are not SERP rankings), via Composio';
  if (hasBudget()) try { candidates = await googlePlacesSearch(localQuery, RESULTS, timeoutMs()); }
  catch (err) { gaps.push(`Google Places competitors: ${err instanceof Error ? err.message : String(err)}`); }
  if (!candidates.length && hasBudget()) {
    label = 'Google Maps public search, via SerpApi (query-specific listing order)';
    try { candidates = await serpMapsSearch(localQuery, timeoutMs()); }
    catch (err) { gaps.push(`Public Maps competitors: ${err instanceof Error ? err.message : String(err)}`); }
  }
  sources.push({ label, query: localQuery, url: `https://www.google.com/maps/search/${encodeURIComponent(localQuery)}`, captured_at: new Date().toISOString(), notes: 'Suggestions use the same category and area. Review counts describe popularity, not a Google ranking.' });
  const rules: PickRules = {
    excludeIds: new Set(typeof found?.id === 'string' ? [found.id] : []),
    excludeHosts: new Set([hostOf(self?.website), hostOf(seed.website)].filter((h): h is string => Boolean(h))),
    excludeNames: new Set([key(self?.name), key(seed.business_name)]),
    excludeCity: null,
  };
  const picks: CompetitorPick[] = [];
  while (picks.length < count) {
    const next = pickFrom(candidates, rules, 'local', localQuery);
    if (!next) break;
    picks.push(next);
    rules.excludeHosts.add(hostOf(next.website)!);
    rules.excludeNames.add(key(next.name));
  }
  if (!hasBudget()) gaps.push('Public competitor lookup reached its time limit; review or retry the suggestions.');
  if (picks.length < count) gaps.push(`Only ${picks.length} relevant local competitor${picks.length === 1 ? '' : 's'} with a usable website could be verified.`);
  return { ...empty, business: { name: self?.name ?? seed.business_name, category, area, place_id: typeof found?.id === 'string' ? found.id : null }, considered: { local: candidates.length, national: 0 }, competitors: picks.map(toCompetitor), picks };
}

export async function runCompetitors(ctx: StepContext): Promise<CompetitorsOutput> {
  const entered = ctx.audit.competitors ?? [];
  if (entered.length >= PICKS_WANTED) return { source: SOURCE, fetched_at: new Date().toISOString(), business: null, local: null, national: null, considered: { local: 0, national: 0 }, competitors: entered, picks: [], sources: [], gaps: [], note: `${entered.length} competitors were entered, so none were added.` };
  const found = await findCompetitors(ctx.audit);
  const hosts = new Set(entered.map((c) => hostOf(c.website)).filter(Boolean));
  const names = new Set(entered.map((c) => key(c.name)));
  const picks = found.picks.filter((p) => !hosts.has(hostOf(p.website)) && !names.has(key(p.name))).slice(0, PICKS_WANTED - entered.length);
  const competitors = [...entered, ...picks.map(toCompetitor)];
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
    note: found.gaps.length ? found.gaps.join(' ') : null,
  };
}

/** What the engine writes back to the audit row: the competitors, only when the step added any. */
export function persistCompetitors(output: unknown, audit: AuditRow): Partial<Pick<AuditRow, 'competitors'>> | null {
  const out = output as CompetitorsOutput | null;
  if (!out || !Array.isArray(out.competitors) || out.competitors.length <= (audit.competitors ?? []).length) return null;
  return { competitors: out.competitors };
}
