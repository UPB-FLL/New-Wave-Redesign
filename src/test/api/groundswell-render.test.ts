import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * fitBoxes (render.ts) keeps each data-fit box's text inside it. Seen on
 * APK9 Academy's slide deck (2026-10-31): the Keywords slide overflowed by
 * 86px and the old loop removed the fix and the only "Holding you back"
 * item first, leaving both headings over nothing.
 */

const chromium = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const hasChromium = existsSync(chromium);

const page = (body: string) =>
  `<!doctype html><html><head><style>body{margin:0;font:20px/1 Arial}.box{height:100px;overflow:hidden}h3,ul,li{margin:0;padding:0}li{list-style:none;height:20px}h3{height:20px}</style></head><body>${body}</body></html>`;

interface Shape {
  removed: number;
  fits: boolean;
  left: string[];
}

async function fit(html: string): Promise<Shape> {
  process.env.CHROMIUM_PATH = chromium;
  const { withBrowser } = await import('../../../api/_lib/groundswell/browser');
  const { fitBoxes } = await import('../../../api/_lib/groundswell/render');
  return withBrowser(async (browser) => {
    const p = await browser.newPage();
    await p.setContent(html, { waitUntil: 'load' });
    const removed = await p.evaluate(fitBoxes);
    const rest = await p.evaluate(() => {
      const box = document.querySelector<HTMLElement>('[data-fit]')!;
      return { fits: box.scrollHeight <= box.clientHeight + 1, left: [...box.querySelectorAll('h3,li')].map((e) => e.textContent ?? '') };
    });
    return { removed, ...rest };
  });
}

describe.skipIf(!hasChromium)('fitBoxes (headless Chromium)', () => {
  it('removes bare data-trim items first, last in the document first; numbered ones survive longer', async () => {
    // 100px box holding 120px: one item must go. Last-first alone would take b1 (the
    // "recommended action" on a slide); the priorities take a3 instead.
    const r = await fit(
      page(
        `<div class="box" data-fit><h3>A</h3><ul><li data-trim="1">a1</li><li data-trim>a2</li><li data-trim>a3</li></ul><h3>B</h3><ul><li data-trim="2">b1</li></ul></div>`
      )
    );
    expect(r.fits).toBe(true);
    expect(r.removed).toBe(1);
    expect(r.left).toEqual(['A', 'a1', 'a2', 'B', 'b1']);
  }, 60_000);

  it('a list emptied by trimming takes its heading with it, so no heading stands over nothing', async () => {
    // 100px box: a 40px lead, then two headed lists; only one item can stay.
    const r = await fit(
      page(
        `<div class="box" data-fit><p style="height:40px;margin:0">lead</p><h3>A</h3><ul><li data-trim="1">a1</li></ul><h3>B</h3><ul><li data-trim>b1</li><li data-trim>b2</li></ul></div>`
      )
    );
    expect(r.fits).toBe(true);
    expect(r.removed).toBe(2);
    expect(r.left).toEqual(['A', 'a1']);
  }, 60_000);

  it('removes nothing from a box that fits', async () => {
    const r = await fit(page(`<div class="box" data-fit><h3>A</h3><ul><li data-trim>a1</li><li data-trim>a2</li></ul></div>`));
    expect(r.removed).toBe(0);
    expect(r.left).toEqual(['A', 'a1', 'a2']);
  }, 60_000);
});

/**
 * paginate (render.ts) splits a Letter section taller than one sheet into
 * framed sheets. Seen on Baraguz's full audit (2026-11-17): four sections
 * ran over, so four sheets had no band, a footer bar half way down and white
 * below it (one held a single bullet), and the footers read "n / 20" on a
 * 24-sheet file.
 */
describe.skipIf(!hasChromium)('paginate (headless Chromium)', () => {
  async function printFramed(sections: { title: string; body: string }[]) {
    process.env.CHROMIUM_PATH = chromium;
    const { withBrowser } = await import('../../../api/_lib/groundswell/browser');
    const { renderPdf } = await import('../../../api/_lib/groundswell/render');
    const { framePage, houseCss, numberPages, NEW_WAVE_PREPARER } = await import('../../../api/_lib/groundswell/reportFrame');
    const { brandFrom } = await import('../../../api/_lib/groundswell/brand');
    const brand = brandFrom(null);
    const frame = { who: NEW_WAVE_PREPARER, client: { name: 'Sample Teas', brand }, report: 'Marketing audit', site: 'example.com', date: 'November 17, 2026' };
    const html = numberPages(`<!doctype html><html><head><style>${houseCss(brand)}</style></head><body>${sections.map((s, i) => framePage(frame, `${i + 1} · Part`, s.title, s.body)).join('')}</body></html>`);
    return withBrowser(async (browser) => {
      const pdf = await renderPdf(browser, html);
      // The same document as printed, to read the sheets back.
      const p = await browser.newPage();
      await p.setContent(html, { waitUntil: 'load' });
      await p.emulateMediaType('print');
      const { paginate } = await import('../../../api/_lib/groundswell/render');
      const added = await p.evaluate(paginate);
      const sheets = await p.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('section.page')].map((s) => ({
          height: s.getBoundingClientRect().height,
          head: !!s.querySelector(':scope > .page-head'),
          foot: s.querySelector(':scope > .page-foot .pn')?.textContent ?? null,
          kicker: s.querySelector('.kicker')?.textContent ?? '',
          rows: s.querySelectorAll('tbody tr').length,
          heads: s.querySelectorAll('thead').length,
          lastIsHeading: /^H[1-6]$/.test(s.querySelector('.body')?.lastElementChild?.tagName ?? ''),
        }))
      );
      await p.close();
      return { pdfPages: pdf.pages, added, sheets };
    });
  }

  const rows = (n: number) => `<table><thead><tr><th>Page</th><th>Words</th></tr></thead><tbody>${Array.from({ length: n }, (_, i) => `<tr><td>/products/item-${i}</td><td>${i}</td></tr>`).join('')}</tbody></table>`;
  const items = (n: number) => `<ul>${Array.from({ length: n }, (_, i) => `<li>Item ${i}</li>`).join('')}</ul>`;

  it('splits an overflowing section into framed sheets: the band, the footer bar and "n / N" on every one', async () => {
    const r = await printFramed([
      { title: 'Short', body: '<p>Fits on one sheet.</p>' },
      { title: 'Website', body: `<p>Intro.</p>${rows(70)}<h3>Fixes</h3>${items(30)}` },
      { title: 'Sources', body: items(5) },
    ]);
    expect(r.added).toBeGreaterThan(0);
    expect(r.pdfPages).toBe(r.sheets.length);
    const n = r.sheets.length;
    r.sheets.forEach((s, i) => {
      expect(s.height).toBeLessThanOrEqual(1056.5);
      expect(s.head).toBe(true);
      expect(s.foot).toBe(`${i + 1} / ${n}`);
      expect(s.lastIsHeading).toBe(false);
    });
    // The table is split between rows, each part under its own header row; no row is lost.
    const tabled = r.sheets.filter((s) => s.rows > 0);
    expect(tabled.length).toBeGreaterThan(1);
    expect(tabled.every((s) => s.heads === 1)).toBe(true);
    expect(tabled.reduce((a, s) => a + s.rows, 0)).toBe(70);
    expect(r.sheets.filter((s) => s.kicker.endsWith('· continued')).length).toBe(r.added);
  }, 60_000);

  it('splits a table inside a wrapper (the brief’s fixes table, styled by its div) between rows, the wrapper kept on each part (Baraguz, 2026-11-17)', async () => {
    const r = await printFramed([{ title: 'Fixes', body: `<div class="fixes">${rows(90)}</div>` }]);
    expect(r.pdfPages).toBe(r.sheets.length);
    expect(r.sheets.length).toBeGreaterThan(1);
    r.sheets.forEach((s, i) => {
      expect(s.height).toBeLessThanOrEqual(1056.5);
      expect(s.foot).toBe(`${i + 1} / ${r.sheets.length}`);
      expect(s.heads).toBe(1);
    });
    expect(r.sheets.reduce((a, s) => a + s.rows, 0)).toBe(90);
  }, 60_000);

  it('leaves a document whose sections fit as it was', async () => {
    const r = await printFramed([{ title: 'One', body: items(5) }, { title: 'Two', body: rows(5) }]);
    expect(r.added).toBe(0);
    expect(r.pdfPages).toBe(2);
    expect(r.sheets.map((s) => s.foot)).toEqual(['1 / 2', '2 / 2']);
  }, 60_000);
});
