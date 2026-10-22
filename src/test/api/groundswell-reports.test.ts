import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { brandFrom, contrast, FALLBACK_PRIMARY } from '../../../api/_lib/groundswell/brand';
import { AD_PLAN_SLIDE_ID, buildAuditHtml, buildDeckHtml, buildSummaryHtml, feeLine, linkedLine, money, SLIDE_IDS, type ReportData } from '../../../api/_lib/groundswell/reports';
import type { LinkedOutput } from '../../../api/_lib/groundswell/currents/linked';
import { assertPortalOnly, countPdfPages, pdfLinks } from '../../../api/_lib/groundswell/render';
import { gapsFor, gapsFromMissing } from '../../../api/_lib/groundswell/gaps';
import { PLACES_FALLBACK_NOTE } from '../../../api/_lib/groundswell/currents/maps';
import { sampleReportData, sampleReportDataWithPlan } from './fixtures/groundswell-report';

const AUDIT = 'https://www.newwaveitfl.com/groundswell';
const DECK = 'https://www.newwaveitfl.com/groundswell';
const FOLDER = 'https://www.newwaveitfl.com/groundswell';

const hrefs = (html: string) => [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));

describe('brandFrom', () => {
  it('uses the theme colour and picks text that passes 4.5:1', () => {
    const b = brandFrom(sampleReportData().facts.site?.business);
    expect(b.primary).toBe('#0e5a8a');
    expect(contrast(b.primary, b.onPrimary)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(b.heading, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(b.logo).toBe('https://harbor-auto.example/img/logo.png');
  });

  it('falls back when no colour can carry text', () => {
    const b = brandFrom(null);
    expect(b.primary).toBe(FALLBACK_PRIMARY);
    expect(b.logo).toBeNull();
  });
});

describe('report HTML', () => {
  const data = sampleReportData();

  it('picks the fee sentence: existing client, no marketer, or fee-neutral', () => {
    const withEst = (e: Partial<typeof data.model.estimates>) => ({ ...data.model, estimates: { ...data.model.estimates, ...e } });
    expect(feeLine(withEst({ is_nwse_client: true, has_current_marketer: true }))).toMatch(/already a client of New Wave: Social Engineering/);
    expect(feeLine(withEst({ is_nwse_client: null, has_current_marketer: false }))).toBe('These figures are before any management fee.');
    expect(feeLine(withEst({ is_nwse_client: null, has_current_marketer: null }))).toMatch(/^Management is fee-neutral/);
    expect(buildSummaryHtml({ ...data, model: withEst({ is_nwse_client: true }) }, { deck: DECK, audit: AUDIT, folder: FOLDER })).toContain('already a client of New Wave: Social Engineering');
  });

  it('rounds money to the nearest $10', () => {
    expect(money(1234.5)).toBe('$1,230');
    expect(money(-54)).toBe('-$50');
    expect(money(null)).toBe('–');
  });

  it('the full audit has no links and escapes text', () => {
    const html = buildAuditHtml({ ...data, facts: { ...data.facts, business: { ...data.facts.business, name: 'A <b>&</b> B' } } });
    expect(hrefs(html)).toEqual([]);
    expect(html).toContain('A &lt;b&gt;&amp;&lt;/b&gt; B');
    expect(html).toContain('Prepared by New Wave: Social Engineering');
  });

  it('names a profile Instagram hides from logged-out readers, and lists the Facebook Page, in the social section', () => {
    const d = sampleReportData();
    const f = d.facts as unknown as { social: { business: Record<string, unknown>; facebook?: unknown; facebook_competitors?: unknown[] } };
    f.social.business = { ...f.social.business, exists: false, followers: null, restricted: true, note: 'Instagram shows this profile only to people signed in as adults, so its public figures could not be read.' };
    f.social.facebook = { url: 'https://www.facebook.com/harborauto', page_id: '1', page_name: 'Harbor Auto Care', exists: true, followers: 1900, likes: 1750, category: null, intro: null, rating: 4.8, rating_count: 120, ad_library_status: null, restricted: false, posts: [{ url: null, text: null, posted_at: '2026-10-20T07:26:31.000Z', reactions: 44, comments: 5, shares: 2, image_url: null }], error: null };
    f.social.facebook_competitors = [];
    const html = buildAuditHtml(d);
    expect(html).toContain('only to people signed in as adults');
    expect(html).toContain('Facebook Page');
    expect(html).toContain('4.8 (120)');
    expect(html).toContain('2026-10-20');
  });

  it('the slides link only the audit, and keep the eleven slide ids', () => {
    const html = buildDeckHtml(data, { audit: AUDIT });
    expect(hrefs(html)).toEqual([AUDIT]);
    for (const id of SLIDE_IDS) expect(html).toContain(`id="${id}"`);
  });

  it('the summary links only the slides, the audit and the folder', () => {
    const html = buildSummaryHtml(data, { deck: DECK, audit: AUDIT, folder: FOLDER });
    expect(new Set(hrefs(html))).toEqual(new Set([DECK, AUDIT, FOLDER]));
  });

  it('refuses a link outside the Groundswell portal', () => {
    expect(() => buildDeckHtml(data, { audit: 'https://claude.ai/x' })).toThrow(/Groundswell portal/);
    expect(() => buildSummaryHtml(data, { deck: DECK, audit: AUDIT, folder: 'https://drive.google.com/drive/folders/F' })).toThrow(/Groundswell portal/);
  });
});

describe('report HTML with the ad plan', () => {
  const data = sampleReportDataWithPlan();
  const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  it('the full audit replaces the single search-ad return with the ranking and the ad plan', () => {
    const html = text(buildAuditHtml(data));
    expect(html).toContain('What pays back first');
    expect(html).toContain('The ad plan');
    expect(html).toContain('11 · Sources');
    expect(html).not.toContain('What search ads could return');
    expect(html).toContain('Brake repair: Meta (Facebook and Instagram) ads');
    expect(html).toContain('No published figure measures what this kind of change returns');
    expect(html).toContain('Ad spend is not public');
    expect(html).toContain('12-month net with the plan, medium case');
    // The ad plan's net leaves team time out; the ranking counts it. Both say so.
    expect(html).toContain('12-month net before team time, low to high');
    expect(html).toContain('12-month net after team time, low to high');
  });

  it('without the plan (an older audit, or a skipped step) the reports keep the search-ad model', () => {
    const html = text(buildAuditHtml(sampleReportData()));
    expect(html).toContain('What search ads could return');
    expect(html).toContain('10 · Sources');
    expect(html).not.toContain('What pays back first');
  });

  it('the slides add the ad plan before next steps and still link only the audit', () => {
    const html = buildDeckHtml(data, { audit: AUDIT });
    for (const id of [...SLIDE_IDS, AD_PLAN_SLIDE_ID]) expect(html).toContain(`id="${id}"`);
    expect(html.indexOf(`id="${AD_PLAN_SLIDE_ID}"`)).toBeLessThan(html.indexOf('id="next"'));
    expect(hrefs(html)).toEqual([AUDIT]);
    expect(text(html)).toContain('What pays back first');
  });

  it('when nothing in the plan pays back, no figure from the old search-ad model appears', () => {
    const none = { ...data.adplan!, comparison: { ...data.adplan!.comparison, included: [] } };
    const html = text(buildAuditHtml({ ...data, adplan: none }));
    expect(html).not.toContain('Base case, 12-month net from search ads');
    expect(html).toContain('No change pays back in the medium case');
  });

  it('the summary shows the three highest-returning changes', () => {
    const html = text(buildSummaryHtml(data, { deck: DECK, audit: AUDIT, folder: FOLDER }));
    expect(html).toContain('What pays back first');
    expect(html).toContain('Brake repair: Meta (Facebook and Instagram) ads');
    expect(html).not.toContain('What search ads could return');
  });
});

describe('PDF checks', () => {
  it('reads link targets and pages from PDF text', () => {
    const pdf = new TextEncoder().encode(
      '1 0 obj <</Type /Pages /Count 2>> 2 0 obj <</Type /Page>> 3 0 obj <</Type/Page>> <</S /URI /URI (https://drive.google.com/file/d/a\\(1\\)/view)>>'
    );
    expect(countPdfPages(pdf)).toBe(2);
    expect(pdfLinks(pdf)).toEqual(['https://drive.google.com/file/d/a(1)/view']);
    expect(() => assertPortalOnly('x.pdf', ['https://www.newwaveitfl.com/groundswell', 'https://example.com'])).toThrow(/example\.com/);
    expect(() => assertPortalOnly('x.pdf', ['https://www.newwaveitfl.com/groundswell/customers'])).not.toThrow();
  });
});

const chromium = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const hasChromium = existsSync(chromium);

describe.skipIf(!hasChromium)('printing (headless Chromium)', () => {
  it('prints the three reports with Drive-only links; the summary is one page and the slides eleven', async () => {
    process.env.CHROMIUM_PATH = chromium;
    const { withBrowser } = await import('../../../api/_lib/groundswell/browser');
    const { renderPdf } = await import('../../../api/_lib/groundswell/render');
    const data = sampleReportData();
    const [audit, deck, summary] = await withBrowser(async (browser) => [
      await renderPdf(browser, buildAuditHtml(data)),
      await renderPdf(browser, buildDeckHtml(data, { audit: AUDIT })),
      await renderPdf(browser, buildSummaryHtml(data, { deck: DECK, audit: AUDIT, folder: FOLDER })),
    ]);
    expect(audit.links).toEqual([]);
    expect(audit.pages).toBeGreaterThanOrEqual(10);
    expect(deck.pages).toBe(11);
    expect(deck.links).toEqual([AUDIT]);
    expect(summary.pages).toBe(1);
    expect(new Set(summary.links)).toEqual(new Set([DECK, AUDIT, FOLDER]));
    // The sample's logo host does not exist; the logo's onerror removes it rather than print a broken image.
    expect(audit.bytes.length).toBeLessThan(5 * 1024 * 1024);
  }, 120_000);

  it('with the ad plan, the slides are twelve and the summary still one page', async () => {
    process.env.CHROMIUM_PATH = chromium;
    const { withBrowser } = await import('../../../api/_lib/groundswell/browser');
    const { renderPdf } = await import('../../../api/_lib/groundswell/render');
    const data = sampleReportDataWithPlan();
    const [audit, deck, summary] = await withBrowser(async (browser) => [
      await renderPdf(browser, buildAuditHtml(data)),
      await renderPdf(browser, buildDeckHtml(data, { audit: AUDIT })),
      await renderPdf(browser, buildSummaryHtml(data, { deck: DECK, audit: AUDIT, folder: FOLDER })),
    ]);
    expect(audit.links).toEqual([]);
    expect(audit.pages).toBeGreaterThanOrEqual(11);
    expect(deck.pages).toBe(12);
    expect(summary.pages).toBe(1);
  }, 120_000);
});

describe('what a run could not read', () => {
  const plain = (html: string) => html.replace(/<[^>]+>/g, ' ');
  const benchmarkSteps = ['competitors', 'site', 'maps', 'search', 'keywords', 'social', 'ads', 'model', 'adplan', 'adcopy', 'social_depth', 'ads_library', 'pricing', 'authority', 'benchmark', 'deliver_prepare'];

  it('names each skipped data step in plain words, once, and folds the ad plan into the keywords line', () => {
    const outputs = { site: {}, maps: {}, search: {}, social: {}, ads: {}, model: {}, social_depth: {} };
    expect(gapsFor(outputs, benchmarkSteps)).toEqual([
      'Keyword demand (Google Keyword Planner) was not available for this audit, so the ad plan and the ad copy are not included.',
      'The Meta Ad Library and Google Ads Transparency Center could not be read for this audit.',
      'Offers and prices could not be read from the websites.',
      'Domain authority, press and owned channels could not be read for this audit.',
      'The competitive benchmark could not be built from the data available, so this audit has no benchmark report.',
    ]);
    // Keyword demand was read but no plan came of it: that is its own line.
    expect(gapsFor({ ...outputs, keywords: {}, adplan: undefined }, ['keywords', 'adplan', 'adcopy'])).toEqual([
      'No ad plan was built from the keyword demand found, so the ad plan and the ad copy are not included.',
    ]);
    expect(gapsFor({ ...outputs, keywords: {}, adplan: {}, adcopy: {} }, ['keywords', 'adplan', 'adcopy'])).toEqual([]);
    // Without the step list (older callers), the facts' missing list is the source.
    expect(gapsFromMissing(['maps', 'ads'])).toEqual(['Google Maps could not be read for this audit.', 'Ad tags and paid search pages could not be checked for this audit.']);
  });

  it('the full audit lists the gaps under "Not available this time", and no gap line names a tool, a key or a step', () => {
    const gaps = gapsFor({ site: {}, model: {} }, benchmarkSteps);
    const html = plain(buildAuditHtml({ ...sampleReportData(), gaps }));
    expect(html).toContain('Not available this time');
    for (const g of gaps) expect(html).toContain(g);
    expect(gaps.join(' ')).not.toMatch(/Composio|ScrapeCreators|Ahrefs \(|SCRAPE|GOOGLE_|quota|API key|_/);
  });

  it('the reason Places did not answer never reaches a report, only its plain note', () => {
    const d = sampleReportData();
    const detail = 'GOOGLE_MAPS_TEXT_SEARCH failed (200): {"error":{"code":429,"message":"Quota exceeded for consumer project_number:511566560828"}}';
    const data = { ...d, facts: { ...d.facts, maps: { ...d.facts.maps!, business: null, nearby: [], note: PLACES_FALLBACK_NOTE, detail } } };
    for (const html of [buildAuditHtml(data), buildDeckHtml(data, { audit: AUDIT }), buildSummaryHtml(data, { deck: DECK, audit: AUDIT, folder: FOLDER })]) {
      expect(html).not.toContain('GOOGLE_MAPS');
      expect(html).not.toContain('511566560828');
      expect(html).not.toMatch(/failed \(|RESOURCE_EXHAUSTED/);
    }
    expect(plain(buildAuditHtml(data))).toContain(PLACES_FALLBACK_NOTE);
  });
});

describe('report HTML with the client’s own accounts', () => {
  const plain = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const linked: LinkedOutput = {
    fetched_at: '2026-10-21T12:00:00.000Z',
    linked: true,
    customer_id: 'c1',
    stage: 'client',
    window: { start: '2026-09-21', end: '2026-10-20', days: 30 },
    services: [
      {
        service: 'google_analytics',
        label: 'Google Analytics 4',
        ok: true,
        source: 'Google Analytics 4, the business’s property “Harbor Auto” (2026-09-21 to 2026-10-20)',
        data: { property: 'Harbor Auto', totals: { sessions: 1686, users: 1360, new_users: 1180, conversions: 40, engagement_rate_pct: 58 }, channels: [{ channel: 'Organic Search', sessions: 1284, users: 1010, conversions: 31 }], landing_pages: [{ page: '/brakes', sessions: 240 }] },
        problem: null,
        detail: null,
      },
      {
        service: 'metaads',
        label: 'Meta Ads',
        ok: false,
        source: 'Meta Ads',
        data: null,
        problem: 'The Meta Ads link no longer works, so it was not read. Link the account again.',
        detail: 'METAADS_GET_AD_ACCOUNTS failed (401): connected account ca_77 is EXPIRED; invalid_grant',
      },
    ],
    note: null,
  };
  const withLinked = (d: ReportData): ReportData => ({ ...d, facts: { ...d.facts, linked } });

  it('the full audit adds a section on the accounts before the plan, moves the later sections down one, and names what was not read', () => {
    const d = withLinked(sampleReportDataWithPlan());
    const html = buildAuditHtml(d);
    const text = plain(html);
    expect(html).toContain('8 · Your accounts');
    expect(text).toContain('From the business’s own accounts');
    expect(text).toContain('Google Analytics 4: Harbor Auto');
    expect(text).toMatch(/Sessions.*1,686/);
    expect(text).toContain('58%');
    expect(text).toContain('Organic Search');
    expect(html).toContain('9 · Plan');
    expect(html).toContain('10 · Return');
    expect(html).toContain('11 · Ad plan');
    expect(html).toContain('12 · Sources');
    expect(text).toContain('Not read this time');
    expect(text).toContain('The Meta Ads link no longer works, so it was not read. Link the account again.');
    // The source line, and the problem under "Not available this time" as well.
    expect(text).toContain('Google Analytics 4, the business’s property “Harbor Auto” (2026-09-21 to 2026-10-20) (2026-10-21)');
    expect(text.split('The Meta Ads link no longer works').length - 1).toBe(2);
  });

  it('every cover says which of the business’s own accounts the reports include', () => {
    const d = withLinked(sampleReportData());
    expect(linkedLine(d.facts)).toBe('Includes the business’s own Google Analytics 4');
    expect(plain(buildAuditHtml(d))).toContain('Includes the business’s own Google Analytics 4');
    expect(plain(buildDeckHtml(d, { audit: AUDIT }))).toContain('Includes the business’s own Google Analytics 4');
    expect(plain(buildSummaryHtml(d, { deck: DECK, audit: AUDIT, folder: FOLDER }))).toContain('Includes the business’s own Google Analytics 4');
    // The slides keep their ids and count: no slide is added for the accounts.
    for (const id of SLIDE_IDS) expect(buildDeckHtml(d, { audit: AUDIT })).toContain(`id="${id}"`);
  });

  it('the staff detail of a failed read never reaches a report, and a prospect’s reports are unchanged', () => {
    const d = withLinked(sampleReportData());
    for (const html of [buildAuditHtml(d), buildDeckHtml(d, { audit: AUDIT }), buildSummaryHtml(d, { deck: DECK, audit: AUDIT, folder: FOLDER })]) {
      expect(html).not.toMatch(/METAADS|ca_77|invalid_grant|failed \(/);
    }
    const prospect = sampleReportData();
    expect(prospect.facts.linked).toBeNull();
    for (const html of [buildAuditHtml(prospect), buildDeckHtml(prospect, { audit: AUDIT }), buildSummaryHtml(prospect, { deck: DECK, audit: AUDIT, folder: FOLDER })]) {
      expect(html).not.toMatch(/own accounts|Your accounts|Includes the business/);
    }
    expect(buildAuditHtml(prospect)).toContain('8 · Plan');
  });

  it('a run whose every linked read failed still names the gaps, without a section of figures', () => {
    const failed = { ...linked, linked: false, services: linked.services.filter((s) => !s.ok) };
    const d: ReportData = { ...sampleReportData(), facts: { ...sampleReportData().facts, linked: failed } };
    const text = plain(buildAuditHtml(d));
    expect(linkedLine(d.facts)).toBeNull();
    expect(text).toContain('Not read this time');
    expect(text).toContain('The Meta Ads link no longer works');
    expect(text).not.toContain('Includes the business');
  });
});
