import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { brandFrom, contrast, FALLBACK_PRIMARY } from '../../../api/_lib/groundswell/brand';
import { AD_PLAN_SLIDE_ID, buildAuditHtml, buildDeckHtml, buildSummaryHtml, feeLine, money, SLIDE_IDS } from '../../../api/_lib/groundswell/reports';
import { assertPortalOnly, countPdfPages, pdfLinks } from '../../../api/_lib/groundswell/render';
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
