import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { brandFrom, contrast, FALLBACK_PRIMARY } from '../../../api/_lib/groundswell/brand';
import { buildAuditHtml, buildDeckHtml, buildSummaryHtml, money, SLIDE_IDS } from '../../../api/_lib/groundswell/reports';
import { assertDriveOnly, countPdfPages, pdfLinks } from '../../../api/_lib/groundswell/render';
import { sampleReportData } from './fixtures/groundswell-report';

const AUDIT = 'https://drive.google.com/file/d/AUDIT_ID/view?usp=sharing';
const DECK = 'https://drive.google.com/file/d/DECK_ID/view?usp=sharing';
const FOLDER = 'https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing';

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

  it('refuses a link outside Google Drive', () => {
    expect(() => buildDeckHtml(data, { audit: 'https://claude.ai/x' })).toThrow(/Google Drive/);
    expect(() => buildSummaryHtml(data, { deck: DECK, audit: AUDIT, folder: 'https://example.com/' })).toThrow(/Google Drive/);
  });
});

describe('PDF checks', () => {
  it('reads link targets and pages from PDF text', () => {
    const pdf = new TextEncoder().encode(
      '1 0 obj <</Type /Pages /Count 2>> 2 0 obj <</Type /Page>> 3 0 obj <</Type/Page>> <</S /URI /URI (https://drive.google.com/file/d/a\\(1\\)/view)>>'
    );
    expect(countPdfPages(pdf)).toBe(2);
    expect(pdfLinks(pdf)).toEqual(['https://drive.google.com/file/d/a(1)/view']);
    expect(() => assertDriveOnly('x.pdf', ['https://drive.google.com/a', 'https://example.com'])).toThrow(/example\.com/);
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
});
