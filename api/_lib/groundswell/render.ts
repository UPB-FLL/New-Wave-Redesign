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

/**
 * Splits every Letter page (`section.page`) taller than one sheet into as
 * many framed sheets as its content needs (runs in the page; no closure).
 * A section that overflowed used to run on to an unframed sheet: no band,
 * its footer bar half way down, the rest of the sheet blank, and "n / N"
 * counting sections rather than sheets. Each continuation sheet clones the
 * band and the footer bar and carries the kicker with "continued" and the
 * section's title. Content moves between blocks; a table splits between
 * rows (its header row repeated) and a list between items, also inside a
 * wrapper div of their own (kept on each part); a heading left
 * last on a sheet goes with what follows it. A block taller than a whole
 * sheet stays where it is. Then every page's "n / N" is set from the
 * sheets. Returns how many sheets were added.
 */
export function paginate(): number {
  const SHEET = 1056; // 11in at 96 px/in
  const heading = (el: Element | null) => !!el && /^H[1-6]$/.test(el.tagName);
  // A block's bottom margin still needs room above the footer bar.
  const bottom = (el: Element) => el.getBoundingClientRect().bottom + (parseFloat(getComputedStyle(el).marginBottom) || 0);
  let added = 0;
  let passes = 0;
  const pages = (): HTMLElement[] => Array.from(document.querySelectorAll<HTMLElement>('section.page'));
  for (let i = 0; i < pages().length && passes++ < 400; i++) {
    const page = pages()[i];
    const body = page.querySelector<HTMLElement>(':scope > .body');
    const foot = page.querySelector<HTMLElement>(':scope > .page-foot');
    if (!body || !foot || page.getBoundingClientRect().height <= SHEET + 0.5) continue;
    const pageTop = page.getBoundingClientRect().top;
    const padBottom = parseFloat(getComputedStyle(body).paddingBottom) || 0;
    const limit = pageTop + SHEET - foot.getBoundingClientRect().height - padBottom;
    // The kicker and the title stay; content is everything after them.
    const kids = Array.from(body.children) as HTMLElement[];
    const lead = kids.findIndex((k) => heading(k)) + 1 || 0;
    const content = kids.slice(lead);
    if (content.length === 0) continue;
    const moved: Node[] = [];
    let split: { table?: HTMLTableElement; rows?: HTMLTableRowElement[]; list?: HTMLElement; items?: HTMLElement[] } | null = null;
    let cut = content.findIndex((k) => bottom(k) > limit);
    if (cut < 0) continue;
    // A table or list in a wrapper of its own (a div that styles it) splits the same way, the wrapper kept on each part.
    const block = content[cut];
    const only = block.tagName === 'DIV' && block.children.length === 1 ? (block.children[0] as HTMLElement) : null;
    const wrapper = only && /^(TABLE|UL|OL)$/.test(only.tagName) ? block : null;
    const straddler = wrapper ? only! : block;
    if (straddler.getBoundingClientRect().top < limit) {
      const room = limit - (parseFloat(getComputedStyle(straddler).marginBottom) || 0) - (wrapper ? parseFloat(getComputedStyle(wrapper).marginBottom) || 0 : 0);
      if (straddler.tagName === 'TABLE') {
        const rows = Array.from((straddler as HTMLTableElement).tBodies[0]?.rows ?? []);
        const at = rows.findIndex((r) => r.getBoundingClientRect().bottom > room);
        if (at > 0) split = { table: straddler as HTMLTableElement, rows: rows.slice(at) };
      } else if (straddler.tagName === 'UL' || straddler.tagName === 'OL') {
        const items = Array.from(straddler.children) as HTMLElement[];
        const at = items.findIndex((li) => li.getBoundingClientRect().bottom > room);
        if (at > 0) split = { list: straddler, items: items.slice(at) };
      }
      if (split) cut++;
    }
    // A heading left last on the sheet goes with what follows it.
    while (cut > 0 && heading(content[cut - 1]) && !split) cut--;
    if (cut === 0 && !split) continue; // one block taller than a sheet: nothing to gain
    for (const k of content.slice(cut)) moved.push(k);
    const next = page.cloneNode(false) as HTMLElement;
    next.classList.remove('cover');
    next.setAttribute('data-continued', '');
    const head = page.querySelector(':scope > .page-head');
    if (head) next.appendChild(head.cloneNode(true));
    const nextBody = body.cloneNode(false) as HTMLElement;
    const kicker = body.querySelector(':scope > .kicker');
    const title = kids[lead - 1];
    if (kicker) {
      const k = kicker.cloneNode(true) as HTMLElement;
      k.textContent = `${(kicker.textContent ?? '').trim()} · continued`;
      nextBody.appendChild(k);
    }
    if (title && heading(title) && !page.classList.contains('cover')) nextBody.appendChild(title.cloneNode(true));
    const place = (el: HTMLElement) => {
      if (!wrapper) return nextBody.appendChild(el);
      const w = wrapper.cloneNode(false) as HTMLElement;
      w.appendChild(el);
      return nextBody.appendChild(w);
    };
    if (split?.table && split.rows) {
      const t = split.table.cloneNode(false) as HTMLTableElement;
      if (split.table.tHead) t.appendChild(split.table.tHead.cloneNode(true));
      const tb = document.createElement('tbody');
      for (const r of split.rows) tb.appendChild(r);
      t.appendChild(tb);
      place(t);
    }
    if (split?.list && split.items) {
      const l = split.list.cloneNode(false) as HTMLElement;
      for (const li of split.items) l.appendChild(li);
      place(l);
    }
    for (const n of moved) nextBody.appendChild(n);
    next.appendChild(nextBody);
    next.appendChild(foot.cloneNode(true));
    page.after(next);
    added++;
    i--; // measure this sheet again: what stayed must now fit
  }
  const all = pages();
  all.forEach((p, n) => {
    const pn = p.querySelector(':scope > .page-foot .pn');
    if (pn) pn.textContent = `${n + 1} / ${all.length}`;
  });
  return added;
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
    // Measured as it prints: Letter pages are split into framed sheets before the PDF is made.
    await page.emulateMediaType('print');
    await page.evaluate(paginate);
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
