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
    const { trimmed, brokenImages } = await page.evaluate(() => {
      let broken = 0;
      for (const img of [...document.images]) {
        if (!img.complete || img.naturalWidth === 0) {
          img.remove();
          broken++;
        }
      }
      let removed = 0;
      for (const box of [...document.querySelectorAll<HTMLElement>('[data-fit]')]) {
        const items = [...box.querySelectorAll('[data-trim]')];
        while (box.scrollHeight > box.clientHeight + 1 && items.length) {
          items.pop()!.remove();
          removed++;
        }
      }
      return { trimmed: removed, brokenImages: broken };
    });
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
