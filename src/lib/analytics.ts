// Google Analytics 4 and Google Ads conversion tags, off until configured.
//
// Nothing loads unless VITE_GA4_ID (G-…) or VITE_GADS_ID (AW-…) is set at build
// time, and nothing loads for a visitor whose browser sends Global Privacy
// Control or Do Not Track. The Cookie and Privacy Policies read
// ANALYTICS_CONFIG too, so their wording always matches what the build loads.
// These IDs are public by design (they appear in every page that loads the tag).

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

function clean(value: string | undefined, pattern: RegExp): string {
  const v = (value ?? '').trim();
  return pattern.test(v) ? v : '';
}

export const ANALYTICS_CONFIG = {
  ga4Id: clean(import.meta.env.VITE_GA4_ID, /^G-[A-Z0-9]+$/),
  adsId: clean(import.meta.env.VITE_GADS_ID, /^AW-\d+$/),
  /** Conversion label for a lead (form sent or call link tapped), e.g. "AbC-D_efG". */
  adsLeadLabel: clean(import.meta.env.VITE_GADS_LEAD_LABEL, /^[A-Za-z0-9_-]+$/),
};

export const ANALYTICS_ACTIVE = Boolean(ANALYTICS_CONFIG.ga4Id || ANALYTICS_CONFIG.adsId);
export const ADS_ACTIVE = Boolean(ANALYTICS_CONFIG.adsId);

/** True when the browser asks not to be tracked (Global Privacy Control or Do Not Track). */
export function visitorOptedOut(nav: Navigator = navigator): boolean {
  const gpc = (nav as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
  const dnt = nav.doNotTrack === '1' || (window as Window & { doNotTrack?: string }).doNotTrack === '1';
  return gpc || dnt;
}

let started = false;

/** Loads gtag.js once, if configured and the visitor has not opted out. Returns whether it loaded. */
export function initAnalytics(config = ANALYTICS_CONFIG): boolean {
  if (started || typeof window === 'undefined') return started;
  const firstId = config.ga4Id || config.adsId;
  if (!firstId || visitorOptedOut()) return false;
  started = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag.js reads the arguments object itself, so it must be pushed as-is.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag('js', new Date());
  if (config.ga4Id) window.gtag('config', config.ga4Id);
  if (config.adsId) window.gtag('config', config.adsId);

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(firstId)}`;
  document.head.appendChild(script);

  // A tap on any call link counts as a lead.
  document.addEventListener('click', (event) => {
    const link = (event.target as Element | null)?.closest?.('a[href^="tel:"]');
    if (link) trackLead('call_link');
  });
  return true;
}

/** Records a lead: a contact, quote, or support form sent, or a call link tapped. */
export function trackLead(source: 'contact_form' | 'quote_form' | 'pricing_form' | 'call_link', config = ANALYTICS_CONFIG) {
  if (!started || !window.gtag) return;
  window.gtag('event', 'generate_lead', { lead_source: source });
  if (config.adsId && config.adsLeadLabel) {
    window.gtag('event', 'conversion', { send_to: `${config.adsId}/${config.adsLeadLabel}` });
  }
}

/** For tests only. */
export function resetAnalyticsForTests() {
  started = false;
}
