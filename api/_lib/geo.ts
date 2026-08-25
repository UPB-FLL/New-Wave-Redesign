/**
 * Country gate for the public lead-capture endpoints, using the
 * `x-vercel-ip-country` header Vercel stamps on every request (clients
 * cannot spoof it — Vercel overwrites x-vercel-* headers at the edge).
 *
 * The header is absent outside Vercel (local dev, tests), and the gate
 * fails open there so the forms keep working.
 */

/** US states plus territories; the business only serves US customers. */
const DEFAULT_ALLOWED_COUNTRIES = ['US', 'PR', 'VI', 'GU', 'AS', 'MP'];

/**
 * Override with a comma-separated env list, e.g. `GEO_ALLOWED_COUNTRIES=US,CA`.
 * `*` (or an empty value) disables the gate entirely.
 */
export function allowedCountries(): string[] | null {
  const raw = process.env.GEO_ALLOWED_COUNTRIES;
  if (raw === undefined) return DEFAULT_ALLOWED_COUNTRIES;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '*') return null;
  return trimmed
    .split(',')
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);
}

export function requestCountry(req: any): string | null {
  const header = req.headers?.['x-vercel-ip-country'];
  const value = Array.isArray(header) ? header[0] : header;
  return typeof value === 'string' && value.length > 0 ? value.toUpperCase() : null;
}

export function isGeoBlocked(req: any): boolean {
  const allowed = allowedCountries();
  if (!allowed) return false;
  const country = requestCountry(req);
  if (!country) return false;
  return !allowed.includes(country);
}
