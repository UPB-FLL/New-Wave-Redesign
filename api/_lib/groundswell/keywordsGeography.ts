import { executeTool } from './composio.js';
import { isConsumerConfigured } from './composioConsumer.js';

export interface KeywordGeography {
  constants: string[];
  label: string;
  error: string | null;
}

const STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky',
  LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island',
  SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
};
const fold = (value: string) => value.trim().replace(/\s+/g, ' ').replace(/’/g, "'").toLowerCase();
const stateNames = new Map(Object.entries(STATES).flatMap(([code, name]) => [[code.toLowerCase(), name], [name.toLowerCase(), name]]));
const stateOf = (value: string) => stateNames.get(fold(value).replace(/\./g, '')) ?? null;
const text = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

function parseCity(value: string | null): { city: string; state: string | null } | null {
  if (typeof value !== 'string' || !value.trim() || value.length > 160 || /[\r\n\\;%=_]/.test(value)) return null;
  const parts = value.trim().replace(/\s+/g, ' ').split(',').map(part => part.trim());
  let city = parts[0];
  let state: string | null = null;
  if (parts.length === 2) {
    state = stateOf(parts[1]);
    if (!state) return null;
  } else if (parts.length > 2) return null;
  else {
    // Longest suffix first so "West Virginia" cannot become "Virginia".
    for (const suffix of [...stateNames.keys()].sort((a, b) => b.length - a.length)) {
      if (fold(city).endsWith(` ${suffix}`)) {
        city = city.slice(0, -(suffix.length + 1)).trim();
        state = stateNames.get(suffix)!;
        break;
      }
    }
    if (!state && /\s[A-Z]{2}$/.test(city)) return null;
  }
  if (!city || !/\p{L}/u.test(city) || !/^[\p{L}\p{M}\p{N} .’'-]+$/u.test(city) || /^(?:US|USA|United States)$/i.test(city)) return null;
  return { city: city.replace(/’/g, "'"), state };
}

interface GeoRow {
  resource: string;
  name: string;
  canonical: string;
  country: string;
  type: string;
  status: string;
}

function geographyRows(payload: unknown): GeoRow[] {
  const rows: GeoRow[] = [];
  const visit = (value: unknown, depth = 0) => {
    if (!value || typeof value !== 'object' || depth > 8) return;
    if (Array.isArray(value)) { value.forEach(item => visit(item, depth + 1)); return; }
    const record = value as Record<string, unknown>;
    const raw = record.geoTargetConstant ?? record.geo_target_constant;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const geo = raw as Record<string, unknown>;
      rows.push({ resource: text(geo.resourceName ?? geo.resource_name), name: text(geo.name), canonical: text(geo.canonicalName ?? geo.canonical_name), country: text(geo.countryCode ?? geo.country_code), type: text(geo.targetType ?? geo.target_type), status: text(geo.status) });
      return;
    }
    Object.values(record).forEach(child => visit(child, depth + 1));
  };
  visit(payload);
  return rows;
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error) || 'Unknown provider error').slice(0, 300);

/** A county name as Google lists it ("Broward County"); null for anything that is not one. */
export function parseCounty(value: string | null | undefined): string | null {
  if (typeof value !== 'string' || !value.trim() || value.length > 80 || /[\r\n\\;%=_,]/.test(value)) return null;
  const name = value.trim().replace(/\s+/g, ' ');
  if (!/^[\p{L}\p{M}\p{N} .’'-]+$/u.test(name) || !/\b(?:county|parish|borough)$/i.test(name)) return null;
  return name.replace(/’/g, "'");
}

/**
 * The county Google's geocoder places a city in ("Broward County"), read only from an answer about that city in that
 * state in the US; null for anything else. Takes the Geocoding API's v4 fields (`addressComponents`, `longText`,
 * `shortText`) and the older ones (`address_components`, `long_name`, `short_name`), wherever they are nested.
 */
export function countyFromGeocode(payload: unknown, city: string, state: string): string | null {
  const results: Record<string, unknown>[] = [];
  const visit = (value: unknown, depth = 0) => {
    if (!value || typeof value !== 'object' || depth > 8) return;
    if (Array.isArray(value)) { value.forEach(item => visit(item, depth + 1)); return; }
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.addressComponents) || Array.isArray(record.address_components)) { results.push(record); return; }
    Object.values(record).forEach(child => visit(child, depth + 1));
  };
  visit(payload);
  for (const result of results) {
    const components = ((result.addressComponents ?? result.address_components) as unknown[]).filter((c): c is Record<string, unknown> => Boolean(c) && typeof c === 'object');
    const part = (type: string) => components.find(c => Array.isArray(c.types) && c.types.includes(type));
    const long = (c: Record<string, unknown> | undefined) => text(c?.longText ?? c?.long_name);
    const short = (c: Record<string, unknown> | undefined) => text(c?.shortText ?? c?.short_name);
    const region = part('administrative_area_level_1');
    const country = part('country');
    if (fold(long(part('locality'))) !== fold(city)) continue;
    if ((stateOf(long(region)) ?? stateOf(short(region))) !== state) continue;
    if (!/^(?:US|USA|United States)$/i.test(short(country) || long(country))) continue;
    const county = parseCounty(long(part('administrative_area_level_2')));
    if (county) return county;
  }
  return null;
}

export interface GeographyOptions {
  /** When no county is given, ask Google's geocoder which county the resolved city sits in: one more read. */
  geocodeCounty?: boolean;
}

const gaql = (name: string, type: 'City' | 'County') => {
  const escaped = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  // LIKE is case-insensitive in GAQL. Wildcards are rejected before this exact
  // literal is built, so this handles intake casing without widening the place.
  return `SELECT geo_target_constant.resource_name, geo_target_constant.name, geo_target_constant.canonical_name, geo_target_constant.country_code, geo_target_constant.target_type, geo_target_constant.status FROM geo_target_constant WHERE geo_target_constant.name LIKE '${escaped}' AND geo_target_constant.country_code = 'US' AND geo_target_constant.target_type = '${type}' AND geo_target_constant.status = 'ENABLED' LIMIT 100`;
};

/**
 * Resolve the Keyword Planner market from Google's read-only constants: the county the business sits in when the
 * Google listing names one (a local service's customers come from the county, not one city; Pembroke Pines alone
 * gave a dog trainer 90 searches a month), else the exact US city. With `geocodeCounty` and no county given (Places
 * over its daily quota, or a listing without an address), Google's geocoder names the resolved city's county, which
 * is the market when its constant is the one in the city's own state. An unresolved place never becomes an
 * all-location query, and a county that cannot be matched falls back to the city.
 */
export async function resolveKeywordGeography(city: string | null, timeoutMs = 10_000, county: string | null = null, options: GeographyOptions = {}): Promise<KeywordGeography> {
  const parsed = parseCity(city);
  const unresolved = (error: string): KeywordGeography => ({ constants: [], label: city?.trim() || 'Unresolved location', error });
  if (!parsed) return unresolved('A valid US city and, when ambiguous, its state are required to resolve Keyword Planner geography.');
  const budget = Math.min(15_000, Number.isFinite(timeoutMs) ? Math.floor(timeoutMs) : 10_000);
  if (budget <= 0) return unresolved('The Keyword Planner geography lookup has no time remaining.');
  const deadline = Date.now() + budget;
  const countyName = parseCounty(county);
  const customer = process.env.GOOGLE_ADS_CUSTOMER_ID?.trim() || null;
  const run = async (slug: string, input: Record<string, unknown>) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('The Keyword Planner geography lookup timed out.');
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const payload = await Promise.race([
        executeTool(slug, input, remaining),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('The Keyword Planner geography lookup timed out.')), remaining); }),
      ]);
      if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        const result = payload as Record<string, unknown>;
        if (result.successful === false || result.error) throw new Error(errorText(result.error || 'The geography provider did not complete the lookup.'));
      }
      return payload;
    } finally { clearTimeout(timer); }
  };
  const read = (input: Record<string, unknown>) => run('GOOGLEADS_SEARCH_STREAM_GAQL', input);
  /** Runs one lookup, retrying once without the customer for a consumer login; the retry shares the deadline. */
  const lookup = async (query: string) => {
    const args: Record<string, unknown> = customer ? { query, customer_id: customer } : { query };
    try { return await read(args); }
    catch (error) {
      // Consumer credentials may not reach the project's configured customer.
      // The retry shares the original deadline and still queries the exact place.
      if (!(args.customer_id && isConsumerConfigured() && Date.now() < deadline)) throw error;
      return read({ query });
    }
  };
  /** The enabled US constants of the wanted type whose name and canonical name match (in the wanted state, when one is known), keyed by resource. */
  const matches = (payload: unknown, name: string, type: 'city' | 'county', wantState = parsed.state) => new Map(geographyRows(payload).filter(row => {
    if (!/^geoTargetConstants\/[1-9]\d*$/.test(row.resource) || fold(row.name) !== fold(name) || row.country.toUpperCase() !== 'US' || fold(row.type) !== type || row.status.toUpperCase() !== 'ENABLED') return false;
    const canonical = row.canonical.split(',').map(part => part.trim());
    const state = stateOf(canonical[canonical.length - 2] ?? '');
    return fold(canonical[0] ?? '') === fold(name) && Boolean(state) && /^(?:United States|US|USA)$/i.test(canonical[canonical.length - 1] ?? '') && (!wantState || state === wantState);
  }).map(row => [row.resource, row]));
  try {
    if (countyName) {
      // The county first; anything but exactly one match (including a lookup that fails) falls back to the city.
      try {
        const found = matches(await lookup(gaql(countyName, 'County')), countyName, 'county');
        if (found.size === 1) {
          const match = [...found.values()][0];
          return { constants: [match.resource], label: `${match.canonical} (the county around ${parsed.city})`, error: null };
        }
      } catch { /* the city below */ }
    }
    const unique = matches(await lookup(gaql(parsed.city, 'City')), parsed.city, 'city');
    if (!unique.size) return unresolved(`No enabled US city matched ${parsed.city}${parsed.state ? `, ${parsed.state}` : ''}; Keyword Planner geography remains unresolved.`);
    if (unique.size !== 1) return unresolved(`Ambiguous US city ${parsed.city}${parsed.state ? `, ${parsed.state}` : ''}; confirm a unique city and state before measuring demand.`);
    const match = [...unique.values()][0];
    const cityGeography: KeywordGeography = { constants: [match.resource], label: match.canonical, error: null };
    if (countyName || !options.geocodeCounty) return cityGeography;
    // The geocoder's county counts only for this city in its own state, and only when that county's constant is one;
    // anything else (no answer, another place, a failed or ambiguous lookup) keeps the city.
    const parts = match.canonical.split(',').map(part => part.trim());
    const state = stateOf(parts[parts.length - 2] ?? '');
    if (!state) return cityGeography;
    try {
      const found = countyFromGeocode(await run('GOOGLE_MAPS_GEOCODE_ADDRESS_WITH_QUERY', { address_query: `${match.name}, ${state}, USA`, region_code: 'US', language_code: 'en' }), match.name, state);
      if (!found) return cityGeography;
      const counties = matches(await lookup(gaql(found, 'County')), found, 'county', state);
      if (counties.size !== 1) return cityGeography;
      const countyMatch = [...counties.values()][0];
      return { constants: [countyMatch.resource], label: `${countyMatch.canonical} (the county around ${match.name})`, error: null };
    } catch {
      return cityGeography;
    }
  } catch (error) {
    return unresolved(`Keyword Planner geography could not be resolved: ${errorText(error)}`);
  }
}
