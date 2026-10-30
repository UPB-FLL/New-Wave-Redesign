import { executeTool, findKey } from '../composio.js';
import { PermanentStepError } from '../types.js';
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
  /** "People also ask" questions on the page; missing on audits before 2026-10-24. */
  questions?: string[];
  /** Which provider answered; missing on audits before 2026-10-24. */
  provider?: SerpProvider;
  error: string | null;
}

/**
 * The public Google search providers, in the order they are asked: SerpApi,
 * then SearchAPI (both linked accounts in Composio), then Serper (Composio's
 * instant account, billed per call). All three answer in SerpApi's shape
 * (`organic_results`, `related_searches`, `related_questions` or
 * `people_also_ask`), so one parser reads them. A provider that fails (a
 * refused key, no account, no credits) hands the query to the next; only a
 * refused Composio key stops the read.
 */
export type SerpProvider = 'serpapi' | 'search_api' | 'serper';
export const SERP_PROVIDERS: readonly SerpProvider[] = ['serpapi', 'search_api', 'serper'];
export const SERP_PROVIDER_NAMES: Record<SerpProvider, string> = { serpapi: 'SerpApi', search_api: 'SearchAPI', serper: 'Serper' };

/** The tool and arguments one provider takes for a Google web search. Only SerpApi takes a free-text location; the others read the city from the query. */
export function serpSearchCall(provider: SerpProvider, query: string, location: string | null): { slug: string; args: Record<string, unknown> } {
  switch (provider) {
    case 'serpapi': return { slug: 'SERPAPI_GOOGLE_LIGHT_SEARCH', args: { q: query, gl: 'us', hl: 'en', num: 20, ...(location ? { location } : {}) } };
    case 'search_api': return { slug: 'SEARCH_API_SEARCH', args: { engine: 'google', q: query, gl: 'us', hl: 'en' } };
    case 'serper': return { slug: 'SERPER_SEARCH_WEB', args: { query, country_code: 'us', language_code: 'en', result_count: 20 } };
  }
}

/** The tool and arguments one provider takes for a Google Maps search. */
export function mapsSearchCall(provider: SerpProvider, query: string): { slug: string; args: Record<string, unknown> } {
  switch (provider) {
    case 'serpapi': return { slug: 'SERPAPI_GOOGLE_MAPS_SEARCH', args: { q: query } };
    case 'search_api': return { slug: 'SEARCH_API_SEARCH', args: { engine: 'google_maps', q: query, gl: 'us', hl: 'en' } };
    case 'serper': return { slug: 'SERPER_SEARCH_MAPS', args: { query, language_code: 'en' } };
  }
}

/** True for the one failure no other provider may paper over: Composio refused its own key. */
export const composioKeyRefused = (err: unknown) => err instanceof PermanentStepError && /Composio refused the (?:consumer )?API key/i.test(err.message);

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
  const asked = findKey<unknown>(payload, 'related_questions') ?? findKey<unknown>(payload, 'people_also_ask');
  const noResults = findKey<unknown>(payload, 'total_results') === 0;
  return {
    query,
    location,
    captured_at: new Date().toISOString(),
    source_url: str(metadata?.google_url) ?? `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en&gl=us`,
    organic: rows(organic).map((r) => ({ position: position(r.position), title: str(r.title) ?? '', url: str(r.link) ?? '', domain: domain(str(r.link) ?? ''), snippet: str(r.snippet) })).filter((r) => /^https?:\/\//i.test(r.url)).slice(0, 20),
    local: rows(localRows).map((r) => ({ position: position(r.position), title: str(r.title) ?? '', rating: numeric(r.rating), reviews: numeric(r.reviews), website: str(r.website), address: str(r.address), category: str(r.type), url: str(r.link) ?? str(r.place_id_search) })).filter((r) => r.title).slice(0, 20),
    related_searches: rows(related).map((r) => str(r.query) ?? str(r.title)).filter((r): r is string => Boolean(r)).slice(0, 12),
    questions: rows(asked).map((r) => str(r.question) ?? str(r.title)).filter((r): r is string => Boolean(r)).slice(0, 10),
    error: typeof error === 'string' && error ? error : metadata?.status === 'Error' ? 'Google search provider reported an error.' : !Array.isArray(organic) && !Array.isArray(localRows) && !Array.isArray(related) && !noResults ? 'Google search returned no recognizable result fields.' : null,
  };
}

/** Public Google search through the Composio connection, one provider after another until one answers. */
export async function readGoogleSerp(query: string, location: string | null = null, timeoutMs = 90_000, providers: readonly SerpProvider[] = SERP_PROVIDERS): Promise<GoogleSerp> {
  const deadline = Date.now() + timeoutMs;
  const errors: string[] = [];
  for (const provider of providers) {
    const remaining = deadline - Date.now();
    if (remaining <= 500) { errors.push(`${SERP_PROVIDER_NAMES[provider]}: no time remained.`); break; }
    const { slug, args } = serpSearchCall(provider, query, location);
    try {
      const parsed = parseGoogleSerp(await executeTool(slug, args, remaining), query, provider === 'serpapi' ? location : null);
      if (parsed.error) { errors.push(`${SERP_PROVIDER_NAMES[provider]}: ${parsed.error}`); continue; }
      return { ...parsed, provider };
    } catch (err) {
      if (composioKeyRefused(err)) throw err;
      errors.push(`${SERP_PROVIDER_NAMES[provider]}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { ...parseGoogleSerp({ organic_results: [] }, query, location), error: errors.join(' ') || 'No public search provider answered.' };
}

/** Listing/schema labels that do not identify a market cannot seed competitor or keyword research. */
export function specificCategory(value: string | null | undefined): string | null {
  const category = value?.replace(/\s+/g, ' ').trim();
  if (!category) return null;
  const normalized = category.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  return /^(?:services?|establishments?|point of interest|local business|business(?:es)?|compan(?:y|ies)|organi[sz]ation|professional services?|business services?|service establishment|store|place|website)$/.test(normalized) ? null : category;
}

/**
 * Link-in-bio pages (Linktree, Beacons, …): a business often enters one as
 * its website. Its words are the platform's, not the business's, so nothing
 * about what the business does is read from it.
 */
const LINK_PAGE_HOSTS = /(^|\.)(?:linktr\.ee|linktree\.com|beacons\.ai|beacons\.page|linkin\.bio|bio\.site|bio\.link|lnk\.bio|taplink\.cc|solo\.to|campsite\.bio|stan\.store|hoo\.be|withkoji\.com|milkshake\.app|carrd\.co|allmylinks\.com|tap\.bio|linkr\.bio|snipfeed\.co)$/i;
export function isLinkPageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try { return LINK_PAGE_HOSTS.test(new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.toLowerCase()); } catch { return false; }
}

/** First-party service wording takes precedence over a broader Google listing category. */
export function categoryFromSite(site: Pick<SiteScan, 'title' | 'meta_description' | 'h1' | 'schema_types' | 'status' | 'error'> & { url?: string; final_url?: string | null } | null | undefined): string | null {
  if (!site || site.error || (site.status !== null && (site.status < 200 || site.status >= 400))) return null;
  if (isLinkPageUrl(site.final_url ?? site.url)) return null;
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
    [/dog train(?:er|ing)|k-?9 train|canine train|puppy train|board (?:and|&) train|obedience train/i, 'Dog trainer'],
    [/dog groom|pet groom/i, 'Pet groomer'],
    [/veterinar|animal hospital/i, 'Veterinarian'],
    [/dog walk|pet sitt|dog daycare|dog boarding|pet boarding/i, 'Pet care'],
    [/yoga studio|yoga class/i, 'Yoga studio'],
    [/pilates/i, 'Pilates studio'],
    [/martial arts|jiu.?jitsu|karate|taekwondo|boxing gym|muay thai/i, 'Martial arts school'],
    [/\bgym\b|fitness center|fitness studio|crossfit/i, 'Gym'],
    [/dance studio|dance class/i, 'Dance studio'],
    [/tutor(?:ing|s)?\b|test prep|learning center/i, 'Tutoring service'],
    [/day ?care|preschool|child care/i, 'Day care'],
    [/photograph(?:er|y studio)/i, 'Photographer'],
    [/cleaning service|house cleaning|maid service|janitorial/i, 'Cleaning service'],
    [/\bhvac\b|air conditioning repair|ac repair/i, 'HVAC contractor'],
    [/electrician|electrical contractor/i, 'Electrician'],
    [/pest control|exterminator/i, 'Pest control service'],
    [/law firm|attorney|lawyer/i, 'Law firm'],
    [/accountant|accounting firm|bookkeep|tax preparation/i, 'Accountant'],
    [/insurance agency|insurance agent/i, 'Insurance agency'],
    [/florist|flower shop/i, 'Florist'],
    [/bakery|pastry shop/i, 'Bakery'],
    [/coffee shop|coffee house|cafe\b|café/i, 'Coffee shop'],
    [/barber/i, 'Barber shop'],
    [/nail salon/i, 'Nail salon'],
    [/tattoo/i, 'Tattoo studio'],
    [/massage|day spa/i, 'Spa'],
    [/pizzeria|pizza/i, 'Pizzeria'],
    [/\bk-?9\b/i, 'Dog trainer'],
  ];
  return categories.find(([pattern]) => pattern.test(text.replace(/[-_]/g, ' ').replace(/\s+/g, ' ')))?.[1] ?? null;
}
