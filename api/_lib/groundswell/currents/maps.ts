import type { Page } from 'puppeteer-core';
import { withBrowser } from '../browser.js';
import { executeTool, findKey, isSharedLookupConfigured } from '../composio.js';
import { PermanentStepError, type StepContext } from '../types.js';
import { categoryFromSite, numeric, specificCategory } from './serp.js';
import type { SiteScan } from './site.js';

/**
 * Maps Current: the business's Google Business Profile and nearby rivals in
 * the same category.
 *
 * First choice: the Google Places API (text search) through Composio, an
 * official read with rating, review count, category, hours, phone and website.
 * Its result order is relevance, not the Maps pack a searcher sees, and the
 * source string says so.
 *
 * Fallback, when Composio is not set up or Places answers with anything but a
 * refused API key (no connection, a daily quota, an outage): the logged-out
 * Google Maps view in headless Chromium, ported from the skill's gbp.cjs /
 * maps.cjs. Only /maps/search/ URLs are loaded (allowed by
 * google.com/robots.txt). If Google shows a consent or "unusual traffic" page,
 * the step stops: it never tries to get past a check. The step is optional,
 * so the audit continues without Maps data.
 */

export interface MapsPlace {
  name: string | null;
  rating: number | null;
  reviews: number | null;
  category: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  hours: string[];
  url: string | null;
}

export interface MapsListing {
  name: string | null;
  rating: number | null;
  reviews: number | null;
  info: string;
  url: string | null;
}

const num = (s: string | null | undefined) => {
  if (!s) return null;
  const m = s.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
};

export const mapsSearchUrl = (query: string) =>
  `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=en&gl=us`;

/** Throws when Google answered with something other than Maps. */
export function assertNotBlocked(url: string, title: string) {
  if (/consent\.google|\/sorry\/|accounts\.google\.com/i.test(url) || /unusual traffic|before you continue/i.test(title)) {
    throw new PermanentStepError('Google Maps showed a consent or traffic check page, so Maps data was skipped.');
  }
}

async function open(page: Page, query: string) {
  await page.goto(mapsSearchUrl(query), { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await new Promise((r) => setTimeout(r, 4_000));
  assertNotBlocked(page.url(), await page.title());
}

async function readPlace(page: Page): Promise<MapsPlace> {
  const raw = await page.evaluate(() => {
    const txt = (el: Element | null) => (el ? (el.textContent || '').trim() : null);
    const attr = (sel: string, a: string) => {
      const el = document.querySelector(sel);
      return el ? (el.getAttribute(a) || '').replace(/^(Address|Phone|Plus code): /, '').trim() : null;
    };
    const reviewLabels = [...document.querySelectorAll('div.F7nice span[aria-label]')].map((x) => x.getAttribute('aria-label') || '');
    return {
      name: txt(document.querySelector('h1.DUwDvf')),
      rating: txt(document.querySelector('div.F7nice span[aria-hidden="true"]')),
      reviews: reviewLabels.find((l) => /review/i.test(l)) ?? null,
      category: txt(document.querySelector('button.DkEaL')),
      address: attr('button[data-item-id="address"]', 'aria-label'),
      phone: attr('button[data-item-id^="phone"]', 'aria-label'),
      website: attr('a[data-item-id="authority"]', 'href'),
      hours: [...document.querySelectorAll('table.eK4R0e tr')].map((r) => (r.textContent || '').trim().replace(/\s+/g, ' ')),
      url: location.href.split('?')[0],
    };
  });
  return { ...raw, rating: num(raw.rating), reviews: num(raw.reviews) };
}

async function readList(page: Page): Promise<MapsListing[]> {
  const raw = await page.evaluate(() => {
    const txt = (el: Element | null) => (el ? (el.textContent || '').trim() : null);
    return [...document.querySelectorAll('div[role="feed"] div.Nv2PK')].slice(0, 12).map((c) => {
      const a = c.querySelector('a.hfpxzc');
      const lines = [...c.querySelectorAll('div.W4Efsd')].map((x) => (x.textContent || '').trim()).filter(Boolean);
      return {
        name: a?.getAttribute('aria-label') ?? null,
        rating: txt(c.querySelector('span.MW4etd')),
        reviews: txt(c.querySelector('span.UY7F9')),
        info: [...new Set(lines)].slice(0, 2).join(' · '),
        url: a?.getAttribute('href')?.split('?')[0] ?? null,
      };
    });
  });
  return raw.map((r) => ({ ...r, rating: num(r.rating), reviews: num(r.reviews) }));
}

/** Finds the business: a direct place page, or the best-matching first result. */
async function findBusiness(page: Page, name: string, city: string | null): Promise<MapsPlace | null> {
  await open(page, [name, city].filter(Boolean).join(' '));
  if (!(await page.$('h1.DUwDvf'))) {
    const links = await page.$$('div[role="feed"] a.hfpxzc');
    const labels = await Promise.all(links.map((l) => l.evaluate((a) => a.getAttribute('aria-label') || '')));
    const wanted = name.toLowerCase().split(/\s+/)[0];
    const idx = labels.findIndex((l) => l.toLowerCase().includes(wanted));
    if (idx < 0) return null;
    await links[idx].click();
    await page.waitForSelector('h1.DUwDvf', { timeout: 15_000 }).catch(() => {});
  }
  return (await page.$('h1.DUwDvf')) ? readPlace(page) : null;
}


export interface MapsOutput {
  fetched_at: string;
  source: string;
  business: MapsPlace | null;
  nearby: MapsListing[];
  /** Shown in the reports when the business or Places was not available. */
  note: string | null;
  /** Why Places did not answer, for staff (the admin screen); never printed. */
  detail?: string;
}

/** The fields one text search asks Places for (each field has a price; nothing more is read). */
export const PLACE_FIELDS =
  'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.primaryTypeDisplayName,places.types,places.websiteUri,places.nationalPhoneNumber,places.regularOpeningHours,places.googleMapsUri,places.businessStatus';

const PLACES_SOURCE = 'Google Places API text search (relevance order, not the Maps pack), via Composio';
const NOT_FOUND = 'The business was not found on Google Maps under its name and city.';
const CATEGORY_UNVERIFIED = 'Nearby businesses were not compared because a specific business category could not be verified.';
const nearbyUnavailable = (category: string) => `The business listing was read, but nearby ${category} results were unavailable.`;
const describeFailure = (err: unknown) => (err instanceof Error ? err.message : String(err)).slice(0, 1000);

export type PlaceRow = Record<string, unknown>;

/** Places wraps display text as `{ text, languageCode }`. */
const localized = (v: unknown): string | null =>
  typeof v === 'string' ? v : v && typeof v === 'object' && typeof (v as { text?: unknown }).text === 'string' ? ((v as { text: string }).text) : null;
const finite = numeric;
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** The places in a GOOGLE_MAPS_TEXT_SEARCH response, whatever it nests them under. */
export function placeRows(payload: unknown): PlaceRow[] {
  const list = findKey<unknown[]>(payload, 'places') ?? [];
  return (Array.isArray(list) ? list : []).filter((p): p is PlaceRow => Boolean(p) && typeof p === 'object');
}

/** One Places result in the shape the browser read produces, so nothing downstream changes. */
export function toMapsPlace(p: PlaceRow): MapsPlace {
  const hours = findKey<unknown[]>(p.regularOpeningHours, 'weekdayDescriptions') ?? [];
  const types = Array.isArray(p.types) ? p.types.filter((t): t is string => typeof t === 'string') : [];
  return {
    name: localized(p.displayName) ?? str(p.title) ?? str(p.name),
    rating: finite(p.rating),
    reviews: finite(p.userRatingCount ?? p.reviews ?? p.user_ratings_total),
    category: localized(p.primaryTypeDisplayName) ?? str(p.type) ?? (types[0] ? types[0].replace(/_/g, ' ') : null),
    address: str(p.formattedAddress) ?? str(p.address),
    phone: str(p.nationalPhoneNumber) ?? str(p.phone),
    website: str(p.websiteUri) ?? str(p.website),
    hours: (Array.isArray(hours) ? hours : []).filter((h): h is string => typeof h === 'string'),
    url: str(p.googleMapsUri) ?? str(p.link) ?? (str(p.place_id) ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(str(p.title) ?? '')}&query_place_id=${encodeURIComponent(str(p.place_id)!)}` : null),
  };
}

export function toMapsListing(p: PlaceRow): MapsListing {
  const place = toMapsPlace(p);
  return {
    name: place.name,
    rating: place.rating,
    reviews: place.reviews,
    info: [place.category, place.address].filter(Boolean).join(' · '),
    url: place.url,
  };
}

/** A branded name or the business's exact domain must match; common first words are not identity evidence. */
export function matchBusiness(rows: PlaceRow[], name: string, website?: string | null): PlaceRow | null {
  const clean = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const host = (value: string | null | undefined) => { try { return value ? new URL(value).hostname.toLowerCase().replace(/^www\./, '') : null; } catch { return null; } };
  const ownHost = host(website);
  if (ownHost) {
    const exact = rows.find((r) => host(toMapsPlace(r).website) === ownHost);
    if (exact) return exact;
  }
  const wanted = clean(name);
  if (!wanted) return null;
  const words = wanted.split(' ').filter((w) => !['the', 'a', 'an', 'and', 'of', 'llc', 'inc', 'company', 'co'].includes(w));
  return rows.find((r) => {
    const got = clean(toMapsPlace(r).name ?? '');
    return got === wanted || (words.length > 0 && words.every((w) => got.split(' ').includes(w)));
  }) ?? null;
}

export async function googlePlacesSearch(textQuery: string, maxResultCount = 20, timeoutMs?: number): Promise<PlaceRow[]> {
  const payload = await executeTool('GOOGLE_MAPS_TEXT_SEARCH', { textQuery, maxResultCount: Math.max(1, Math.min(20, maxResultCount)), fieldMask: PLACE_FIELDS }, timeoutMs);
  const error = findKey<unknown>(payload, 'error');
  if (error || findKey(payload, 'success') === false) throw new Error(`Google Places did not answer: ${typeof error === 'string' ? error : 'provider error'}`);
  return placeRows(payload);
}

/** Public Maps results, preserving Google's order without calling it an organic or local-pack ranking. */
export async function serpMapsSearch(query: string, timeoutMs?: number): Promise<PlaceRow[]> {
  const payload = await executeTool('SERPAPI_GOOGLE_MAPS_SEARCH', { q: query }, timeoutMs);
  const error = findKey<unknown>(payload, 'error');
  if (error) throw new Error(`Google Maps search did not answer: ${String(error).slice(0, 300)}`);
  const list = findKey<unknown>(payload, 'local_results');
  const place = findKey<unknown>(payload, 'place_results');
  if (Array.isArray(list)) return list.filter((r): r is PlaceRow => Boolean(r && typeof r === 'object'));
  if (place && typeof place === 'object') return [place as PlaceRow];
  throw new Error('Google Maps search returned no recognizable listing fields.');
}

/** Google Places through Composio: the business, then rivals in its category near its area. */
export async function placesLookup(audit: StepContext['audit'], categoryHint: string | null = null): Promise<MapsOutput> {
  const query = [audit.business_name, audit.city].filter(Boolean).join(' ');
  const found = matchBusiness(await googlePlacesSearch(query, 5), audit.business_name, audit.website);
  const business = found ? toMapsPlace(found) : null;
  const area = audit.city || business?.address?.split(',').slice(-2, -1)[0]?.trim() || null;
  let nearby: MapsListing[] = [];
  let nearbyError: string | null = null;
  const category = specificCategory(categoryHint) || specificCategory(business?.category);
  if (business && category && area) {
    const self = (business.name || '').toLowerCase();
    const id = typeof found?.id === 'string' ? found.id : null;
    try {
      nearby = (await googlePlacesSearch(`${category} near ${area}`, 10))
        .filter((r) => (id ? r.id !== id : true) && (localized(r.displayName) ?? '').toLowerCase() !== self)
        .map(toMapsListing)
        .filter((l) => l.name)
        .slice(0, 8);
    } catch (err) { nearbyError = describeFailure(err); }
  }
  return { fetched_at: new Date().toISOString(), source: PLACES_SOURCE, business, nearby, note: nearbyError && category ? nearbyUnavailable(category) : business ? category ? null : CATEGORY_UNVERIFIED : NOT_FOUND, ...(nearbyError ? { detail: nearbyError } : {}) };
}

/** True for the one Places failure the browser must not paper over: the Composio key itself. */
const keyRefused = (err: unknown) => err instanceof PermanentStepError && /API key/i.test(err.message);

/** The logged-out Maps view in headless Chromium (the fallback). */
export async function browserLookup(audit: StepContext['audit'], note: string | null = null, categoryHint: string | null = null): Promise<MapsOutput> {
  return withBrowser(async (browser) => {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1000 });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

    const business = await findBusiness(page, audit.business_name, audit.city);
    const area = audit.city || business?.address?.split(',').slice(-2, -1)[0]?.trim() || null;
    let nearby: MapsListing[] = [];
    let nearbyError: string | null = null;
    const category = specificCategory(categoryHint) || specificCategory(business?.category);
    if (business && category && area) {
      try {
        await open(page, `${category} near ${area}`);
        const self = (business.name || '').toLowerCase();
        nearby = (await readList(page)).filter((l) => l.name && l.name.toLowerCase() !== self).slice(0, 8);
      } catch (err) { nearbyError = describeFailure(err); }
    }
    return {
      fetched_at: new Date().toISOString(),
      source: 'Google Maps (logged-out view)',
      business,
      nearby,
      note: [note, nearbyError && category ? nearbyUnavailable(category) : business ? category ? null : CATEGORY_UNVERIFIED : NOT_FOUND].filter(Boolean).join(' ') || null,
      ...(nearbyError ? { detail: nearbyError } : {}),
    };
  });
}

/** The note a report carries when Places did not answer; the reason itself goes in `detail`, for staff. */
export const PLACES_FALLBACK_NOTE = 'Google Places was not available for this audit, so the public Maps view was read instead.';

export async function runMaps(ctx: StepContext): Promise<MapsOutput> {
  const { audit } = ctx;
  const site = ctx.outputs.site as { business?: SiteScan | null } | undefined;
  const competitors = ctx.outputs.competitors as { business?: { category?: string | null } | null } | undefined;
  const categoryHint = categoryFromSite(site?.business) || specificCategory(competitors?.business?.category);
  const errors: string[] = [];
  let places: MapsOutput | null = null;
  if (isSharedLookupConfigured()) {
    try {
      places = await placesLookup(audit, categoryHint);
      if (places.business) return places;
    } catch (err) {
      if (keyRefused(err)) throw err;
      errors.push(err instanceof Error ? err.message : String(err));
    }
    try {
      const query = [audit.business_name, audit.city].filter(Boolean).join(' ');
      const found = matchBusiness(await serpMapsSearch(query), audit.business_name, audit.website);
      const business = found ? toMapsPlace(found) : null;
      const category = specificCategory(categoryHint) || specificCategory(business?.category);
      let nearby: MapsListing[] = [];
      let nearbyError: string | null = null;
      if (business && category && audit.city) {
        try { nearby = (await serpMapsSearch(`${category} near ${audit.city}`)).filter((r) => toMapsPlace(r).name !== business.name).map(toMapsListing).slice(0, 8); }
        catch (err) { nearbyError = describeFailure(err); }
      }
      const detail = [...errors, nearbyError].filter(Boolean).join(' ').slice(0, 1000);
      if (business) return { fetched_at: new Date().toISOString(), source: 'Google Maps public search results (query-specific order, not organic search rank), via SerpApi', business, nearby, note: nearbyError && category ? nearbyUnavailable(category) : category ? null : CATEGORY_UNVERIFIED, ...(detail ? { detail } : {}) };
    } catch (err) {
      if (keyRefused(err)) throw err;
      errors.push(err instanceof Error ? err.message : String(err));
    }
    // A successful public search with no business match is a scoped result, not evidence of no listing anywhere.
    if (places && !errors.length) return places;
  }
  try {
    const out = await browserLookup(audit, errors.length ? PLACES_FALLBACK_NOTE : null, categoryHint);
    return errors.length ? { ...out, detail: [...errors, out.detail].filter(Boolean).join(' ').slice(0, 1000) } : out;
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    if (places) return { ...places, note: `${NOT_FOUND} The additional public Maps lookup was unavailable.`, detail: errors.join(' ').slice(0, 1000) };
    throw new Error(`Google Maps could not be read. ${errors.join(' ').slice(0, 1000)}`);
  }
}
