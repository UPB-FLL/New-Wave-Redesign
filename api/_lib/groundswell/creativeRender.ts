import type { Browser } from 'puppeteer-core';
import { escapeHtml as esc } from '../http.js';
import type { Brand } from './brand.js';
import { baseCss } from './reports.js';

/**
 * The ad images and the carousel, as HTML printed to images in headless
 * Chromium: 1080 × 1350 (Meta's 4:5 feed size), like the hand-made sets New
 * Wave runs. An ad image is the business's own photo above a band of its
 * colour carrying the ad's words and its Instagram handle: a business's
 * posts often have words of their own baked in, so the ad's words never sit
 * on the photo. Without a photo, the colour carries the words alone. A
 * carousel slide is type on the business's tint.
 */

export const IMAGE_WIDTH = 1080;
export const IMAGE_HEIGHT = 1350;

const page = (b: Brand, body: string, extra: string) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
${baseCss(b)}
html,body{width:${IMAGE_WIDTH}px;height:${IMAGE_HEIGHT}px;overflow:hidden}
${extra}
</style></head><body>${body}</body></html>`;

/** An image as a data URI, for a page that loads nothing from the network. */
export const dataUri = (bytes: Uint8Array, type: string) => `data:${type};base64,${Buffer.from(bytes).toString('base64')}`;

/** Font size that keeps a headline on about three lines at this width (the band's is smaller: it holds two or three). */
export function headlineSize(text: string, band = false): number {
  const n = text.length;
  if (band) return n <= 28 ? 76 : n <= 44 ? 64 : n <= 60 ? 56 : 48;
  return n <= 28 ? 104 : n <= 44 ? 88 : n <= 60 ? 74 : 62;
}

export function adImageHtml(b: Brand, opts: { headline: string; handle: string | null; photo: string | null }): string {
  const size = headlineSize(opts.headline);
  const handle = opts.handle ? `<div class="handle">@${esc(opts.handle.toUpperCase())}</div>` : '';
  if (!opts.photo) {
    return page(
      b,
      `<main class="plain"><h1>${esc(opts.headline)}</h1>${handle}</main>`,
      `.plain{width:100%;height:100%;background:${b.primary};color:${b.onPrimary};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:120px;text-align:center}
.plain h1{color:${b.onPrimary};font-size:${size}px;font-weight:800;letter-spacing:-0.02em;line-height:1.08}
.handle{margin-top:48px;font-size:34px;letter-spacing:0.12em;opacity:.9}`
    );
  }
  const band = headlineSize(opts.headline, true);
  return page(
    b,
    `<main class="photo"><div class="frame"><img src="${opts.photo}" alt=""></div><div class="band"><h1>${esc(opts.headline)}</h1>${handle}</div></main>`,
    `.photo{width:100%;height:100%;display:flex;flex-direction:column;background:${b.primary}}
.frame{position:relative;height:70%;overflow:hidden;background:#111}
.frame img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.band{flex:1;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding:44px 80px;color:${b.onPrimary}}
.band h1{color:${b.onPrimary};font-size:${band}px;font-weight:800;letter-spacing:-0.02em;line-height:1.08}
.handle{margin-top:22px;font-size:28px;letter-spacing:0.12em;opacity:.9}`
  );
}

export function slideHtml(
  b: Brand,
  opts: { kicker: string; headline: string; body: string; business: string; index: number; total: number; photo?: string | null }
): string {
  const last = opts.index === opts.total;
  const size = opts.headline.length <= 40 ? 96 : opts.headline.length <= 70 ? 78 : 64;
  const photo = opts.photo && opts.index === 1 ? `<img class="hero" src="${opts.photo}" alt="">` : '';
  return page(
    b,
    `<main class="slide">${photo}<div class="kicker">${esc(opts.kicker)}</div><h1>${esc(opts.headline)}</h1><div class="rule"></div>${
      opts.body ? `<p>${esc(opts.body)}</p>` : ''
    }<footer><span>${esc(opts.business)}</span><span>${last ? `${opts.index} / ${opts.total}` : 'Swipe →'}</span></footer></main>`,
    `.slide{position:relative;width:100%;height:100%;background:${b.tint};padding:150px 90px 180px;display:flex;flex-direction:column;justify-content:center}
.hero{position:absolute;top:0;left:0;width:100%;height:42%;object-fit:cover}
.hero ~ .kicker{margin-top:420px}
.kicker{font-size:30px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${b.heading};opacity:.85}
.slide h1{margin-top:28px;font-size:${size}px;font-weight:800;letter-spacing:-0.02em;line-height:1.06;color:${b.heading}}
.rule{margin:44px 0 36px;width:180px;height:6px;border-radius:3px;background:${b.primary}}
.slide p{font-size:40px;line-height:1.4;color:#1f2937}
footer{position:absolute;left:90px;right:90px;bottom:80px;display:flex;justify-content:space-between;font-size:30px;color:#374151}`
  );
}

/** Prints a page to a JPEG (ad images) or PNG (carousel slides) at 1080 × 1350. */
export async function renderImage(browser: Browser, html: string, type: 'jpeg' | 'png'): Promise<Uint8Array> {
  const tab = await browser.newPage();
  try {
    await tab.setViewport({ width: IMAGE_WIDTH, height: IMAGE_HEIGHT, deviceScaleFactor: 1 });
    await tab.setContent(html, { waitUntil: 'load', timeout: 30_000 });
    await tab.evaluate(async () => {
      await document.fonts.ready;
    });
    const shot = await tab.screenshot({ type, ...(type === 'jpeg' ? { quality: 88 } : {}), clip: { x: 0, y: 0, width: IMAGE_WIDTH, height: IMAGE_HEIGHT } });
    return new Uint8Array(shot);
  } finally {
    await tab.close().catch(() => {});
  }
}
