import { executeTool, findKey } from '../composio.js';
import { PermanentStepError, type StepContext } from '../types.js';
import { timeBudget } from './social.js';

/**
 * Reviews Current (Maps): the business's Yelp listing and each competitor's,
 * through Composio's Yelp toolkit (no sign-in of its own). The business is
 * found by its phone number first (the Google listing's, else the website's),
 * then by name and city; a competitor by name and city. For the business:
 * the listing's figures, its hours, whether the owner claimed it, and the
 * newest review excerpts (Yelp gives three, cut at about 160 characters);
 * Yelp's review highlights only answer on its premium plan and are read
 * best-effort.
 *
 * Yelp's photos are customers' uploads, so they are counted, never kept: the
 * ads and posts use the business's own images only (the owner's rule).
 */

export interface YelpListing {
  id: string;
  alias: string | null;
  name: string;
  url: string | null;
  rating: number | null;
  reviews: number | null;
  price: string | null;
  categories: string[];
  city: string | null;
  address: string | null;
  phone: string | null;
  claimed: boolean | null;
  closed: boolean | null;
  photo_count: number | null;
  /** Hours as Yelp lists them, one line a day ("Mon 12:00–22:00"). */
  hours: string[];
}

export interface YelpReview {
  rating: number | null;
  text: string;
  posted_at: string | null;
  url: string | null;
}

export interface ReviewsOutput {
  source: string;
  fetched_at: string;
  business: YelpListing | null;
  /** How the business's listing was found: by phone, by name, or not at all. */
  matched_by: 'phone' | 'name' | null;
  business_error: string | null;
  reviews: YelpReview[];
  /** Yelp's summarised themes; null when its plan did not answer. */
  highlights: string[] | null;
  competitors: { name: string; listing: YelpListing | null; error: string | null }[];
  note: string | null;
}

export const isReviewsOutput = (x: unknown): x is ReviewsOutput => Boolean(x && typeof x === 'object' && 'competitors' in x && 'business' in x && 'matched_by' in x);

const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const s = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const hhmm = (v: unknown) => (typeof v === 'string' && /^\d{4}$/.test(v) ? `${v.slice(0, 2)}:${v.slice(2)}` : null);

/** One Yelp business record (search, phone search or details) as a listing; the link without Yelp's tracking query. */
export function toYelpListing(raw: unknown): YelpListing | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const id = s(r.id);
  const name = s(r.name);
  if (!id || !name) return null;
  const loc = (r.location ?? {}) as Record<string, unknown>;
  const display = Array.isArray(loc.display_address) ? (loc.display_address as unknown[]).filter((x) => typeof x === 'string').join(', ') : null;
  const hours: string[] = [];
  const regular = Array.isArray(r.hours) ? ((r.hours as Record<string, unknown>[]).find((h) => h?.hours_type === 'REGULAR') ?? (r.hours as Record<string, unknown>[])[0]) : null;
  for (const o of Array.isArray(regular?.open) ? (regular!.open as Record<string, unknown>[]) : []) {
    const day = typeof o.day === 'number' ? DAYS[o.day] : null;
    const start = hhmm(o.start);
    const end = hhmm(o.end);
    if (day && start && end) hours.push(`${day} ${start}–${end}`);
  }
  const url = s(r.url);
  return {
    id,
    alias: s(r.alias),
    name,
    url: url ? url.split('?')[0] : null,
    rating: n(r.rating),
    reviews: n(r.review_count),
    price: s(r.price),
    categories: Array.isArray(r.categories) ? (r.categories as Record<string, unknown>[]).map((c) => s(c?.title)).filter((x): x is string => Boolean(x)) : [],
    city: s(loc.city),
    address: display || s(loc.address1),
    phone: s(r.phone),
    claimed: typeof r.is_claimed === 'boolean' ? r.is_claimed : null,
    closed: typeof r.is_closed === 'boolean' ? r.is_closed : null,
    photo_count: Array.isArray(r.photos) ? r.photos.length : null,
    hours,
  };
}

const businesses = (payload: unknown): unknown[] => findKey<unknown[]>(payload, 'businesses') ?? [];

const fold = (t: string) => t.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').replace(/\b(the|llc|inc|co|company)\b/g, ' ').replace(/\s+/g, ' ').trim();

/** The result that is the named business: its name's words contained either way, in the city when one is given. */
export function matchYelp(results: unknown[], name: string, city: string | null): YelpListing | null {
  const want = fold(name);
  const wantCity = city ? fold(city.split(',')[0]) : null;
  const listings = results.map(toYelpListing).filter((l): l is YelpListing => Boolean(l));
  const named = listings.filter((l) => {
    const got = fold(l.name);
    return got === want || got.includes(want) || want.includes(got);
  });
  return named.find((l) => !wantCity || (l.city && fold(l.city) === wantCity)) ?? named[0] ?? null;
}

/** Yelp's review excerpts, newest first as asked. */
export function toReviews(payload: unknown): YelpReview[] {
  const list = findKey<unknown[]>(payload, 'reviews') ?? [];
  return list
    .map((raw) => {
      const r = (raw ?? {}) as Record<string, unknown>;
      const text = s(r.text);
      if (!text) return null;
      const url = s(r.url);
      return { rating: n(r.rating), text: text.replace(/\s+/g, ' ').slice(0, 400), posted_at: s(r.time_created), url: url ? url.split('&utm_')[0] : null };
    })
    .filter((x): x is YelpReview => Boolean(x))
    .slice(0, 3);
}

/** Yelp's highlight sentences, from whatever the premium endpoint nests them under. */
export function toHighlights(payload: unknown): string[] {
  const list = findKey<unknown[]>(payload, 'review_highlights') ?? findKey<unknown[]>(payload, 'highlights') ?? [];
  return list
    .map((h) => (typeof h === 'string' ? h : s((h as Record<string, unknown>)?.sentence) ?? s((h as Record<string, unknown>)?.text) ?? s((h as Record<string, unknown>)?.title)))
    .filter((x): x is string => Boolean(x))
    .slice(0, 6);
}

/** E.164 for a US number written any way; null when it is not one. */
export function e164(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

const YELP_TIMEOUT_MS = 30_000;

export async function runReviews(ctx: StepContext): Promise<ReviewsOutput> {
  const { audit } = ctx;
  const budget = () => timeBudget(ctx, YELP_TIMEOUT_MS);
  const maps = ctx.outputs.maps as { business?: { phone?: string | null; address?: string | null } | null } | undefined;
  const site = ctx.outputs.site as { business?: { phones?: string[] } | null } | undefined;
  const phone = e164(maps?.business?.phone) ?? e164(site?.business?.phones?.[0]);
  const city = audit.city;

  let business: YelpListing | null = null;
  let matchedBy: ReviewsOutput['matched_by'] = null;
  let businessError: string | null = null;
  try {
    if (phone) {
      business = toYelpListing(businesses(await executeTool('YELP_SEARCH_BY_PHONE', { phone }, budget()))[0]);
      if (business) matchedBy = 'phone';
    }
    if (!business && city) {
      business = matchYelp(businesses(await executeTool('YELP_SEARCH_BUSINESSES', { term: audit.business_name, location: city, limit: 5 }, budget())), audit.business_name, city);
      if (business) matchedBy = 'name';
    }
    if (!business) businessError = phone || city ? 'Yelp has no listing that matches the business’s phone or name.' : 'There is no phone number or city to look the business up on Yelp.';
  } catch (err) {
    if (err instanceof PermanentStepError) throw err;
    businessError = `Yelp could not be read: ${message(err).slice(0, 200)}`;
  }

  let reviews: YelpReview[] = [];
  let highlights: string[] | null = null;
  if (business) {
    const [details, excerpts, themes] = await Promise.allSettled([
      executeTool('YELP_GET_BUSINESS_DETAILS', { business_id: business.id }, budget()),
      executeTool('YELP_GET_BUSINESS_REVIEWS', { business_id: business.id, sort_by: 'newest' }, budget()),
      executeTool('YELP_GET_REVIEW_HIGHLIGHTS', { business_id: business.id, count: 5 }, budget()),
    ]);
    if (details.status === 'fulfilled') business = toYelpListing(unwrap(details.value)) ?? business;
    if (excerpts.status === 'fulfilled') reviews = toReviews(excerpts.value);
    if (themes.status === 'fulfilled') highlights = toHighlights(themes.value);
  }

  const competitors = await Promise.all(
    audit.competitors.slice(0, 3).map(async (c) => {
      if (!city) return { name: c.name, listing: null, error: 'No city to look the competitor up in.' };
      try {
        const listing = matchYelp(businesses(await executeTool('YELP_SEARCH_BUSINESSES', { term: c.name, location: city, limit: 5 }, budget())), c.name, city);
        return { name: c.name, listing, error: listing ? null : 'No Yelp listing matches this name in the city.' };
      } catch (err) {
        if (err instanceof PermanentStepError) throw err;
        return { name: c.name, listing: null, error: message(err).slice(0, 200) };
      }
    })
  );

  if (!business && competitors.every((c) => !c.listing)) throw new Error(businessError ?? 'Yelp answered with no listing for the business or its competitors.');
  return {
    source: 'Yelp listings (Yelp Fusion, through Composio)',
    fetched_at: new Date().toISOString(),
    business,
    matched_by: matchedBy,
    business_error: businessError,
    reviews,
    highlights: highlights && highlights.length ? highlights : null,
    competitors,
    note: 'Yelp shows three review excerpts, each cut short; ratings and counts are Yelp’s own and change daily. Yelp photos are customers’ uploads and are never used in the ads or posts.',
  };
}

/** The details record itself, wherever Composio nested it. */
function unwrap(payload: unknown): unknown {
  let cur: unknown = payload;
  for (let i = 0; i < 4 && cur && typeof cur === 'object'; i++) {
    const r = cur as Record<string, unknown>;
    if (typeof r.id === 'string' && typeof r.name === 'string') return r;
    cur = r.data ?? r.response_data ?? null;
  }
  return payload;
}
