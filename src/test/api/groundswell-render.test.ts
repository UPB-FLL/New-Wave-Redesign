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
