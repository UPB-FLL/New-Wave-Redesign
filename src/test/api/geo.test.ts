import { afterEach, describe, expect, it, vi } from 'vitest';
import { allowedCountries, isGeoBlocked, requestCountry } from '../../../api/_lib/geo';

function reqFromCountry(country?: string) {
  return { headers: country ? { 'x-vercel-ip-country': country } : {} };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('allowedCountries', () => {
  it('defaults to the US and its territories', () => {
    expect(allowedCountries()).toEqual(['US', 'PR', 'VI', 'GU', 'AS', 'MP']);
  });

  it('parses the env override case-insensitively', () => {
    vi.stubEnv('GEO_ALLOWED_COUNTRIES', ' us, ca ');
    expect(allowedCountries()).toEqual(['US', 'CA']);
  });

  it('treats * as gate disabled', () => {
    vi.stubEnv('GEO_ALLOWED_COUNTRIES', '*');
    expect(allowedCountries()).toBeNull();
  });
});

describe('isGeoBlocked', () => {
  it('allows US and territory traffic by default', () => {
    expect(isGeoBlocked(reqFromCountry('US'))).toBe(false);
    expect(isGeoBlocked(reqFromCountry('PR'))).toBe(false);
    expect(isGeoBlocked(reqFromCountry('us'))).toBe(false);
  });

  it('blocks countries outside the allowlist', () => {
    expect(isGeoBlocked(reqFromCountry('RU'))).toBe(true);
    expect(isGeoBlocked(reqFromCountry('CN'))).toBe(true);
  });

  it('fails open when the Vercel header is absent (local dev, tests)', () => {
    expect(isGeoBlocked(reqFromCountry())).toBe(false);
    expect(isGeoBlocked({ headers: undefined })).toBe(false);
  });

  it('respects the env override and the * kill switch', () => {
    vi.stubEnv('GEO_ALLOWED_COUNTRIES', 'US,CA');
    expect(isGeoBlocked(reqFromCountry('CA'))).toBe(false);
    expect(isGeoBlocked(reqFromCountry('MX'))).toBe(true);

    vi.stubEnv('GEO_ALLOWED_COUNTRIES', '*');
    expect(isGeoBlocked(reqFromCountry('RU'))).toBe(false);
  });
});

describe('requestCountry', () => {
  it('normalizes the header and tolerates array values', () => {
    expect(requestCountry({ headers: { 'x-vercel-ip-country': 'de' } })).toBe('DE');
    expect(requestCountry({ headers: { 'x-vercel-ip-country': ['FR'] } })).toBe('FR');
    expect(requestCountry({ headers: {} })).toBeNull();
  });
});
