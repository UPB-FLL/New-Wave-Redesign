import { executeTool, findKey } from '../composio.js';
import type { SiteScan } from './site.js';

/** A dated, query-specific logged-out Google result. These positions are never Places relevance or review rank. */
export interface GoogleSerp {
  query: string;
  location: string | null;
  captured_at: string;
  source_url: string;
  organic: { position: number | null; title: string; url: string; domain: string | null; snippet: string | null }[];
  local: { position: number | null; title: string; rating: number | null; reviews: number | null; website: string | null; address: string | null; category: string | null; url: string | null }[];
  related_searches: string[];
  error: string | null;
}

export const numeric = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  const n = Number(value.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};
const str = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null;
const rows = (value: unknown): Record<string, unknown>[] => Array.isArray(value) ? value.filter((r): r is Record<string, unknown> => Boolean(r && typeof r === 'object' && !Array.isArray(r))) : [];
const domain = (url: string) => { try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return null; } };
const position = (v: unknown) => { const n = numeric(v); return n !== null && n >= 1 && Number.isInteger(n) ? n : null; };

export function parseGoogleSerp(payload: unknown, query: string, location: string | null): GoogleSerp {
  const organic = findKey<unknown>(payload, 'organic_results');
  const local = findKey<unknown>(payload, 'local_results');
  const localRows = Array.isArray(local) ? local : findKey<unknown>(local, 'places');
  const error = findKey<unknown>(payload, 'error');
  const metadata = findKey<Record<string, unknown>>(payload, 'search_metadata');
  const related = findKey<unknown>(payload, 'related_searches');
  const noResults = findKey<unknown>(payload, 'total_results') === 0;
  return {
    query,
    location,
    captured_at: new Date().toISOString(),
    source_url: str(metadata?.google_url) ?? `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en&gl=us`,
    organic: rows(organic).map((r) => ({ position: position(r.position), title: str(r.title) ?? '', url: str(r.link) ?? '', domain: domain(str(r.link) ?? ''), snippet: str(r.snippet) })).filter((r) => /^https?:\/\//i.test(r.url)).slice(0, 20),
    local: rows(localRows).map((r) => ({ position: position(r.position), title: str(r.title) ?? '', rating: numeric(r.rating), reviews: numeric(r.reviews), website: str(r.website), address: str(r.address), category: str(r.type), url: str(r.link) ?? str(r.place_id_search) })).filter((r) => r.title).slice(0, 20),
    related_searches: rows(related).map((r) => str(r.query) ?? str(r.title)).filter((r): r is string => Boolean(r)).slice(0, 12),
    error: typeof error === 'string' && error ? error : metadata?.status === 'Error' ? 'Google search provider reported an error.' : !Array.isArray(organic) && !Array.isArray(localRows) && !Array.isArray(related) && !noResults ? 'Google search returned no recognizable result fields.' : null,
  };
}

/** Instant public Google search through the same server-side Composio connection as the other Currents. */
export async function readGoogleSerp(query: string, location: string | null = null, timeoutMs = 90_000): Promise<GoogleSerp> {
  try {
    return parseGoogleSerp(await executeTool('SERPAPI_GOOGLE_LIGHT_SEARCH', { q: query, gl: 'us', hl: 'en', num: 20, ...(location ? { location } : {}) }, timeoutMs), query, location);
  } catch (err) {
    return { ...parseGoogleSerp({ organic_results: [] }, query, location), error: err instanceof Error ? err.message : String(err) };
  }
}

/** Listing/schema labels that do not identify a market cannot seed competitor or keyword research. */
export function specificCategory(value: string | null | undefined): string | null {
  const category = value?.replace(/\s+/g, ' ').trim();
  if (!category) return null;
  const normalized = category.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  return /^(?:services?|establishments?|point of interest|local business|business(?:es)?|compan(?:y|ies)|organi[sz]ation|professional services?|business services?|service establishment|store|place|website)$/.test(normalized) ? null : category;
}

/** First-party service wording takes precedence over a broader Google listing category. */
export function categoryFromSite(site: Pick<SiteScan, 'title' | 'meta_description' | 'h1' | 'schema_types' | 'status' | 'error'> | null | undefined): string | null {
  if (!site || site.error || (site.status !== null && (site.status < 200 || site.status >= 400))) return null;
  return categoryFromText([site.title, site.meta_description, ...(site.h1 ?? []), ...(site.schema_types ?? []).map(type => type.replace(/([a-z])([A-Z])/g, '$1 $2'))].filter(Boolean).join(' '));
}

/** Category hints come only from public first-party wording, never from the business name alone. */
export function categoryFromText(text: string): string | null {
  const categories: [RegExp, string][] = [
    [/functional (?:health|medicine)|health coach|health coaching|wellness coach|holistic health/i, 'Health coach'],
    [/personal train(?:er|ing)|fitness coach/i, 'Personal trainer'],
    [/auto repair|car repair|automotive repair/i, 'Auto repair shop'],
    [/brewery|brewing company|craft beer/i, 'Brewery'],
    [/dentist|dental clinic/i, 'Dentist'],
    [/chiropract/i, 'Chiropractor'],
    [/medical spa|med spa/i, 'Medical spa'],
    [/psychotherapist|mental health counsel|therapy practice/i, 'Psychotherapist'],
    [/nutritionist|nutrition coach|dietitian/i, 'Nutritionist'],
    [/restaurant|dining menu/i, 'Restaurant'],
    [/hair salon|hair stylist/i, 'Hair salon'],
    [/landscaping|landscape design/i, 'Landscaper'],
    [/plumbing|plumber/i, 'Plumber'],
    [/roofing|roofer/i, 'Roofing contractor'],
    [/real estate agent|real estate broker/i, 'Real estate agency'],
  ];
  return categories.find(([pattern]) => pattern.test(text.replace(/[-_]/g, ' ').replace(/\s+/g, ' ')))?.[1] ?? null;
}
