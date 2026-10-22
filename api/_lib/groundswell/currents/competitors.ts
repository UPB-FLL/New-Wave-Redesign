import { normalizeWebsite } from '../../../../src/lib/groundswellValidation.js';
import { executeTool } from '../composio.js';
import { matchBusiness, PLACE_FIELDS, placeRows, toMapsPlace } from './maps.js';
import { PermanentStepError, type AuditCompetitor, type AuditRow, type StepContext } from '../types.js';

/**
 * Competitors Current: when fewer than two competitors were entered, the
 * Google Places API (text search, through Composio) picks the rest: one from
 * the local market (the business's category near its city) and one from the
 * country-wide market (the same category anywhere in the United States,
 * outside the business's city). "Top" means the most reviews on Google, then
 * the higher rating; a pick needs a website, since every later Current
 * starts from one. Entered competitors always come first and are never
 * replaced. The picks are written back to the audit row, so the Site, Social,
 * Search and benchmark steps read them like entered ones.
 */

export const PICKS_WANTED = 2;
const RESULTS = 20;
const SOURCE = 'Google Places API text search (most Google reviews first), via Composio';

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
  return parts.length >= 3 ? parts[parts.length - 3].toLowerCase() : null;
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
    .map((r) => ({ r, place: toMapsPlace(r), host: hostOf(typeof r.websiteUri === 'string' ? r.websiteUri : null) }))
    .filter(({ place, host }) => place.name && host && !rules.excludeHosts.has(host) && !rules.excludeNames.has(key(place.name)))
    .filter(({ place }) => !rules.excludeCity || cityOf(place.address) !== rules.excludeCity)
    .sort((a, b) => (b.place.reviews ?? -1) - (a.place.reviews ?? -1) || (b.place.rating ?? -1) - (a.place.rating ?? -1));
  const best = candidates[0];
  if (!best) return null;
  let website: string | null = null;
  try {
    website = normalizeWebsite(best.place.website ?? '');
  } catch {
    website = null;
  }
  if (!website) return null;
  return { market, name: best.place.name!, website, rating: best.place.rating, reviews: best.place.reviews, address: best.place.address, url: best.place.url, query };
}

const toCompetitor = (p: CompetitorPick): AuditCompetitor => ({ name: p.name, website: p.website, instagram: null });

async function search(textQuery: string, maxResultCount: number): Promise<Row[]> {
  return placeRows(await executeTool('GOOGLE_MAPS_TEXT_SEARCH', { textQuery, maxResultCount, fieldMask: PLACE_FIELDS }));
}

export async function runCompetitors(ctx: StepContext): Promise<CompetitorsOutput> {
  const { audit } = ctx;
  const entered = audit.competitors ?? [];
  const base: CompetitorsOutput = { source: SOURCE, fetched_at: new Date().toISOString(), business: null, local: null, national: null, considered: { local: 0, national: 0 }, competitors: entered, note: null };
  if (entered.length >= PICKS_WANTED) return { ...base, note: `${entered.length} competitors were entered, so none were picked.` };

  const query = [audit.business_name, audit.city].filter(Boolean).join(' ');
  const found = matchBusiness(await search(query, 5), audit.business_name);
  if (!found) throw new PermanentStepError('The business was not found on Google Places under its name and city, so no competitors were picked.');
  const self = toMapsPlace(found);
  const category = self.category;
  const area = audit.city || cityOf(self.address) || null;
  if (!category || !area) throw new PermanentStepError('Google Places gave the business no category or area, so no competitors were picked.');
  const city = cityOf(self.address) ?? (audit.city ? audit.city.split(',')[0].trim().toLowerCase() : null);

  const rules: PickRules = {
    excludeIds: new Set(typeof found.id === 'string' ? [found.id] : []),
    excludeHosts: new Set([hostOf(self.website), hostOf(audit.website), ...entered.map((c) => hostOf(c.website))].filter((h): h is string => Boolean(h))),
    excludeNames: new Set([key(self.name), key(audit.business_name), ...entered.map((c) => key(c.name))]),
    excludeCity: null,
  };
  const picks: CompetitorPick[] = [];
  let considered = { local: 0, national: 0 };

  const localQuery = `${category} near ${area}`;
  const localRows = await search(localQuery, RESULTS);
  considered = { ...considered, local: localRows.length };
  const local = pickFrom(localRows, rules, 'local', localQuery);
  if (local) {
    picks.push(local);
    rules.excludeHosts.add(hostOf(local.website)!);
    rules.excludeNames.add(key(local.name));
  }

  let national: CompetitorPick | null = null;
  if (entered.length + picks.length < PICKS_WANTED) {
    const nationalQuery = `${category} in the United States`;
    const nationalRows = await search(nationalQuery, RESULTS);
    considered = { ...considered, national: nationalRows.length };
    national = pickFrom(nationalRows, { ...rules, excludeCity: city }, 'national', nationalQuery);
    if (national) picks.push(national);
  }

  const competitors = [...entered, ...picks.map(toCompetitor)].slice(0, Math.max(entered.length, PICKS_WANTED));
  const missing = PICKS_WANTED - competitors.length;
  return {
    ...base,
    business: { name: self.name ?? audit.business_name, category, area, place_id: typeof found.id === 'string' ? found.id : null },
    local,
    national,
    considered,
    competitors,
    note: missing > 0 ? `Only ${competitors.length} competitor${competitors.length === 1 ? '' : 's'} could be found with a website; the benchmark compares those.` : null,
  };
}

/** What the engine writes back to the audit row: the competitors, only when the step added any. */
export function persistCompetitors(output: unknown, audit: AuditRow): Partial<Pick<AuditRow, 'competitors'>> | null {
  const out = output as CompetitorsOutput | null;
  if (!out || !Array.isArray(out.competitors) || out.competitors.length <= (audit.competitors ?? []).length) return null;
  return { competitors: out.competitors };
}
