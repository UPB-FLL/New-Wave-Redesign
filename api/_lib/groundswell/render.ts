import type { Browser } from 'puppeteer-core';

/**
 * Prints report HTML to PDF in headless Chromium and reads back what a
 * reviewer would check: page count and every link in the file.
 */

export interface RenderedPdf {
  bytes: Uint8Array;
  pages: number;
  links: string[];
  /** Items removed (data-trim) to keep text inside its box. */
  trimmed: number;
  /** Images that failed to load and were removed (e.g. a logo behind a login). */
  brokenImages: number;
}

const latin1 = (bytes: Uint8Array) => Buffer.from(bytes).toString('latin1');

/** Page objects in the PDF (Chromium writes them uncompressed). */
export function countPdfPages(bytes: Uint8Array): number {
  return (latin1(bytes).match(/\/Type\s*\/Page(?![a-zA-Z])/g) ?? []).length;
}

/** Link targets (`/URI (…)`) in the PDF, with PDF string escapes undone. */
export function pdfLinks(bytes: Uint8Array): string[] {
  const out: string[] = [];
  for (const m of latin1(bytes).matchAll(/\/URI\s*\(((?:\\.|[^\\)])*)\)/g)) {
    out.push(m[1].replace(/\\([()\\])/g, '$1'));
  }
  return [...new Set(out)];
}

/**
 * Keeps every `[data-fit]` box's text inside it (runs in the page; no
 * closure, so puppeteer can send it). While a box overflows, its
 * `[data-trim]` elements are removed one at a time: the lowest `data-trim`
 * number first (a bare `data-trim` is 0; a higher number survives longer),
 * and among equals the last in the document first. A list emptied this way
 * goes with the heading over it, so no heading is left standing over
 * nothing. Returns how many elements were removed.
 */
export function fitBoxes(): number {
  let removed = 0;
  for (const box of Array.from(document.querySelectorAll<HTMLElement>('[data-fit]'))) {
    // Popped from the end: the lowest priority, and within it the last in the document.
    const items = Array.from(box.querySelectorAll<HTMLElement>('[data-trim]'))
      .map((el, index) => ({ el, index, priority: Number(el.getAttribute('data-trim')) || 0 }))
      .sort((a, b) => b.priority - a.priority || a.index - b.index)
      .map((x) => x.el);
    while (box.scrollHeight > box.clientHeight + 1 && items.length) {
      const el = items.pop()!;
      const list = el.parentElement;
      el.remove();
      removed++;
      if (list && (list.tagName === 'UL' || list.tagName === 'OL') && list.children.length === 0) {
        const heading = list.previousElementSibling;
        list.remove();
        if (heading && /^H[2-6]$/.test(heading.tagName)) heading.remove();
      }
    }
  }
  return removed;
}

export async function renderPdf(browser: Browser, html: string): Promise<RenderedPdf> {
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'load', timeout: 45_000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        [...document.images].map((img) =>
          img.complete ? null : new Promise((r) => {
            img.addEventListener('load', r, { once: true });
            img.addEventListener('error', r, { once: true });
            setTimeout(r, 10_000);
          })
        )
      );
    });
    const brokenImages = await page.evaluate(() => {
      let broken = 0;
      for (const img of [...document.images]) {
        if (!img.complete || img.naturalWidth === 0) {
          img.remove();
          broken++;
        }
      }
      return broken;
    });
    const trimmed = await page.evaluate(fitBoxes);
    const bytes = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    return { bytes, pages: countPdfPages(bytes), links: pdfLinks(bytes), trimmed, brokenImages };
  } finally {
    await page.close().catch(() => {});
  }
}

/** Throws unless every link in the PDF points at the Groundswell portal. */
export function assertPortalOnly(name: string, links: string[]) {
  const bad = links.filter((l) => !/^https:\/\/www\.newwaveitfl\.com\/groundswell(\/|$)/.test(l));
  if (bad.length) throw new Error(`${name} links outside the Groundswell portal: ${bad.join(', ')}`);
}
