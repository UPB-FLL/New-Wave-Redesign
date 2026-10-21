/**
 * Who is paying for reach, where, and since when, from public ad libraries.
 *
 * Meta and Google publish whether a business advertises, the dates and the
 * creative, never what it spends on non-political ads, so no figure here is a
 * spend. A verified negative ("This Page isn't currently running ads", "0 ads"
 * over any time) is kept apart from "could not be determined" (a consent wall,
 * a block, a missing page link), and the reports use those words.
 *
 * Only a lookup by the business's own Page id counts: a search by company name
 * or keyword matches other advertisers.
 */

export type MetaAdStatus = 'running' | 'not_running' | 'unknown';
export type GoogleAdsStatus = 'ads_found' | 'none' | 'unknown';

export interface MetaAd {
  id: string;
  started: string | null;
  active: boolean;
  platforms: string[];
  title: string | null;
  body_excerpt: string;
  cta: string | null;
  landing_url: string | null;
}

export interface AdLibraryEvidence {
  name: string;
  domain: string | null;
  facebook_page_id: string | null;
  meta_ad_status: MetaAdStatus;
  meta_ads: MetaAd[];
  /** Ads in the Page's history that are no longer running; 0 with not_running means it never advertised through this Page. */
  meta_ads_inactive_n: number;
  google_ads_status: GoogleAdsStatus;
  google_ads_count: number | null;
  /** Ahrefs' estimate of paid-search traffic and its value; an estimate, not spend. */
  paid_search_history: { month: string; paid_traffic: number; paid_traffic_value_usd: number }[];
  pixels: { meta: boolean; google_ads: boolean; tiktok: boolean };
  error: string | null;
}

export const SPEND_NOTE = 'Meta and Google do not disclose spend for non-political ads; only presence, dates and creative are public.';

const NOT_RUNNING = /isn['’]t currently running ads|is not currently running ads|not running ads/i;

/** The Page's Ad Library status from its own Page id; running only when an active ad is listed. */
export function metaAdStatus(adStatusText: string | null | undefined, ads: Pick<MetaAd, 'active'>[], pageId: string | null): MetaAdStatus {
  if (ads.some((a) => a.active)) return 'running';
  if (pageId && adStatusText && NOT_RUNNING.test(adStatusText)) return 'not_running';
  return 'unknown';
}

const CHALLENGE = /before you continue|unusual traffic|not a robot|captcha|consent\.google|sign in to continue|access denied/i;

/** Reads the Google Ads Transparency Center page text for a domain. */
export function transparencyStatus(bodyText: string | null | undefined): { status: GoogleAdsStatus; count: number | null } {
  const text = (bodyText ?? '').replace(/\s+/g, ' ');
  if (!text || CHALLENGE.test(text)) return { status: 'unknown', count: null };
  const m = text.match(/(\d[\d,]*)\s+ads?\b/i) ?? text.match(/\b(no) ads\b/i);
  if (!m) return { status: 'unknown', count: null };
  const count = m[1].toLowerCase() === 'no' ? 0 : Number(m[1].replace(/,/g, ''));
  if (count > 0) return { status: 'ads_found', count };
  // Zero is a verified negative only over the whole history.
  return /any time/i.test(text) ? { status: 'none', count: 0 } : { status: 'unknown', count: null };
}

/** The words the reports use for each status. */
export const META_STATUS_WORDS: Record<MetaAdStatus, string> = {
  running: 'Running Meta ads',
  not_running: 'Not running Meta ads (Ad Library)',
  unknown: 'Could not be determined',
};
export const GOOGLE_STATUS_WORDS: Record<GoogleAdsStatus, string> = {
  ads_found: 'Google ads on record',
  none: 'No Google ads on record, any time',
  unknown: 'Could not be determined',
};
