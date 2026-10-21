import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ANALYTICS_ACTIVE, initAnalytics, resetAnalyticsForTests, trackLead, visitorOptedOut } from './analytics';

const CONFIG = { ga4Id: 'G-TEST123', adsId: 'AW-123456', adsLeadLabel: 'Lead_1' };

function setPrivacySignals(gpc: boolean, dnt: string | null) {
  Object.defineProperty(navigator, 'globalPrivacyControl', { value: gpc, configurable: true });
  Object.defineProperty(navigator, 'doNotTrack', { value: dnt, configurable: true });
}

beforeEach(() => {
  resetAnalyticsForTests();
  delete window.dataLayer;
  delete window.gtag;
  document.head.querySelectorAll('script[src*="googletagmanager"]').forEach((s) => s.remove());
  setPrivacySignals(false, null);
});
afterEach(() => setPrivacySignals(false, null));

const pushed = () => (window.dataLayer ?? []).map((args) => Array.from(args as IArguments));

describe('analytics', () => {
  it('is off in a build without IDs, so nothing loads by default', () => {
    expect(ANALYTICS_ACTIVE).toBe(false);
    expect(initAnalytics()).toBe(false);
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
  });

  it('never loads for a browser that sends Global Privacy Control or Do Not Track', () => {
    setPrivacySignals(true, null);
    expect(visitorOptedOut()).toBe(true);
    expect(initAnalytics(CONFIG)).toBe(false);
    setPrivacySignals(false, '1');
    expect(initAnalytics(CONFIG)).toBe(false);
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
  });

  it('loads gtag.js once and records leads as GA4 events and an Ads conversion', () => {
    expect(initAnalytics(CONFIG)).toBe(true);
    expect(initAnalytics(CONFIG)).toBe(true);
    expect(document.querySelectorAll('script[src="https://www.googletagmanager.com/gtag/js?id=G-TEST123"]')).toHaveLength(1);
    trackLead('contact_form', CONFIG);
    expect(pushed()).toContainEqual(['config', 'G-TEST123']);
    expect(pushed()).toContainEqual(['config', 'AW-123456']);
    expect(pushed()).toContainEqual(['event', 'generate_lead', { lead_source: 'contact_form' }]);
    expect(pushed()).toContainEqual(['event', 'conversion', { send_to: 'AW-123456/Lead_1' }]);
  });

  it('counts a tap on a call link as a lead', () => {
    initAnalytics(CONFIG);
    const link = document.createElement('a');
    link.href = 'tel:+15615641846';
    document.body.appendChild(link);
    link.addEventListener('click', (e) => e.preventDefault());
    link.click();
    expect(pushed()).toContainEqual(['event', 'generate_lead', { lead_source: 'call_link' }]);
    link.remove();
  });

  it('does nothing for leads when it never loaded', () => {
    trackLead('quote_form', CONFIG);
    expect(window.dataLayer).toBeUndefined();
  });
});
