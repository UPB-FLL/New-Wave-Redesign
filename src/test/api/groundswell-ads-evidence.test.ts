import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ executeTool: vi.fn(), withBrowser: vi.fn() }));
vi.mock('../../../api/_lib/groundswell/composio', async (original) => ({ ...(await original<object>()), executeTool: mocks.executeTool }));
vi.mock('../../../api/_lib/groundswell/browser', () => ({ withBrowser: mocks.withBrowser }));

import { runAdsLibrary } from '../../../api/_lib/groundswell/currents/adsLibrary';

const context = (outputs: Record<string, unknown> = {}) => ({
  audit: { id: 'a1', business_name: 'Wildly Primal', city: 'Jacksonville, FL', website: 'https://wildlyprimal.example', instagram: null, facebook: 'https://www.facebook.com/wildlyprimal', competitors: [], notes: null },
  outputs, deadline: Date.now() + 180_000, attempt: 1,
});
const browserPage = (body: string) => ({ goto: vi.fn(), evaluate: vi.fn().mockResolvedValue(body), close: vi.fn(async () => {}) });
beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout'] }); vi.resetAllMocks(); mocks.withBrowser.mockRejectedValue(new Error('Browser unavailable in tests')); });
afterEach(() => vi.useRealTimers());

describe('ad library source evidence', () => {
  it('starts no history or Google reads after a bare Meta HTTP 402 denial', async () => {
    mocks.executeTool.mockRejectedValue(new Error('Provider request failed (402).'));
    const out = await runAdsLibrary(context());
    expect(mocks.executeTool.mock.calls.map(([slug]) => slug)).toEqual(['SCRAPECREATORS_GET_FACEBOOK_PROFILE']);
    expect(mocks.withBrowser).not.toHaveBeenCalled();
    expect(out.business).toMatchObject({ meta_ad_status: 'unknown', google_ads_status: 'unknown', google_ads_count: null });
  });

  it.each(['throw', 'payload'])('starts no Google reads after a history billing denial (%s)', async (mode) => {
    mocks.executeTool.mockImplementation(async (slug: string) => {
      if (slug === 'AHREFS_RETRIEVE_SITE_EXPLORER_METRICS_HISTORY') {
        if (mode === 'payload') return { error: 'Insufficient credits for history.' };
        throw new Error('Provider request failed (402).');
      }
      throw new Error(`Unexpected later read: ${slug}`);
    });
    const ctx = context();
    ctx.audit.facebook = null as never;
    const out = await runAdsLibrary(ctx);
    expect(mocks.executeTool.mock.calls.map(([slug]) => slug)).toEqual(['AHREFS_RETRIEVE_SITE_EXPLORER_METRICS_HISTORY']);
    expect(mocks.withBrowser).not.toHaveBeenCalled();
    expect(out.business).toMatchObject({ google_ads_status: 'unknown', google_ads_count: null });
  });

  it.each([false, true])('keeps billing-denied evidence unknown and never bypasses it through a browser (prior Page: %s)', async (prior) => {
    mocks.executeTool.mockRejectedValue(new Error('Provider failed (402): out of credits.'));
    const page = browserPage('wildlyprimal.example · Any time · No ads');
    mocks.withBrowser.mockImplementation(async (run) => run({ newPage: async () => page }));
    const pending = runAdsLibrary(context(prior ? { social: { facebook: { page_id: '123', ad_library_status: 'This Page is not currently running ads.' } } } : {}));
    await vi.runAllTimersAsync();
    const out = await pending;
    expect(out.business).toMatchObject({ meta_ad_status: 'unknown', google_ads_status: 'unknown', google_ads_count: null, error: expect.stringContaining('out of credits') });
    expect(mocks.withBrowser).not.toHaveBeenCalled();
    expect(mocks.executeTool.mock.calls.some(([slug]) => slug === 'SERPAPI_SEARCH_PUBLIC_GOOGLE_ADS')).toBe(false);
  });

  it.each([
    ['Shown in the United States · Any time · No ads', 'unknown', null],
    ['Shown in the United States · Any time · 3 ads', 'unknown', null],
    ['Ads for wildlyprimal.example.attacker.test · Any time · No ads', 'unknown', null],
    ['Ads for https://wildlyprimal.example · Any time · No ads', 'none', 0],
    ['Ads for www.wildlyprimal.example · Any time · 3 ads', 'ads_found', 3],
  ])('requires the expected advertiser domain in returned browser text: %s', async (body, status, count) => {
    mocks.executeTool.mockImplementation(async (slug: string) => {
      if (slug === 'AHREFS_RETRIEVE_SITE_EXPLORER_METRICS_HISTORY') return { metrics: [] };
      throw new Error('Temporary provider outage');
    });
    const page = browserPage(String(body));
    mocks.withBrowser.mockImplementation(async (run) => run({ newPage: async () => page }));
    const ctx = context();
    ctx.audit.facebook = null as never;
    const pending = runAdsLibrary(ctx);
    await vi.runAllTimersAsync();
    const out = await pending;
    expect(mocks.withBrowser).toHaveBeenCalledTimes(1);
    expect(out.business).toMatchObject({ google_ads_status: status, google_ads_count: count });
  });
});
