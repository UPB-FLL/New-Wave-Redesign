import type { Page } from 'puppeteer-core';
import { withBrowser } from '../browser.js';
import { PermanentStepError, type StepContext } from '../types.js';

/**
 * Maps Current: the business's Google Business Profile as Google Maps shows it
 * to a logged-out visitor, and nearby rivals in the same category. Ported from
 * the skill's gbp.cjs / maps.cjs. Only /maps/search/ URLs are loaded (allowed by
 * google.com/robots.txt). If Google shows a consent or "unusual traffic" page,
 * the step stops: it never tries to get past a check. The step is optional,
 * so the audit continues without Maps data.
 */

export interface MapsPlace {
  name: string | null;
  rating: number | null;
  reviews: number | null;
  category: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  hours: string[];
  url: string | null;
}

export interface MapsListing {
  name: string | null;
  rating: number | null;
  reviews: number | null;
  info: string;
  url: string | null;
}

const num = (s: string | null | undefined) => {
  if (!s) return null;
  const m = s.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
};

export const mapsSearchUrl = (query: string) =>
  `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=en&gl=us`;

/** Throws when Google answered with something other than Maps. */
export function assertNotBlocked(url: string, title: string) {
  if (/consent\.google|\/sorry\/|accounts\.google\.com/i.test(url) || /unusual traffic|before you continue/i.test(title)) {
    throw new PermanentStepError('Google Maps showed a consent or traffic check page, so Maps data was skipped.');
  }
}

async function open(page: Page, query: string) {
  await page.goto(mapsSearchUrl(query), { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await new Promise((r) => setTimeout(r, 4_000));
  assertNotBlocked(page.url(), await page.title());
}

async function readPlace(page: Page): Promise<MapsPlace> {
  const raw = await page.evaluate(() => {
    const txt = (el: Element | null) => (el ? (el.textContent || '').trim() : null);
    const attr = (sel: string, a: string) => {
      const el = document.querySelector(sel);
      return el ? (el.getAttribute(a) || '').replace(/^(Address|Phone|Plus code): /, '').trim() : null;
    };
    const reviewLabels = [...document.querySelectorAll('div.F7nice span[aria-label]')].map((x) => x.getAttribute('aria-label') || '');
    return {
      name: txt(document.querySelector('h1.DUwDvf')),
      rating: txt(document.querySelector('div.F7nice span[aria-hidden="true"]')),
      reviews: reviewLabels.find((l) => /review/i.test(l)) ?? null,
      category: txt(document.querySelector('button.DkEaL')),
      address: attr('button[data-item-id="address"]', 'aria-label'),
      phone: attr('button[data-item-id^="phone"]', 'aria-label'),
      website: attr('a[data-item-id="authority"]', 'href'),
      hours: [...document.querySelectorAll('table.eK4R0e tr')].map((r) => (r.textContent || '').trim().replace(/\s+/g, ' ')),
      url: location.href.split('?')[0],
    };
  });
  return { ...raw, rating: num(raw.rating), reviews: num(raw.reviews) };
}

async function readList(page: Page): Promise<MapsListing[]> {
  const raw = await page.evaluate(() => {
    const txt = (el: Element | null) => (el ? (el.textContent || '').trim() : null);
    return [...document.querySelectorAll('div[role="feed"] div.Nv2PK')].slice(0, 12).map((c) => {
      const a = c.querySelector('a.hfpxzc');
      const lines = [...c.querySelectorAll('div.W4Efsd')].map((x) => (x.textContent || '').trim()).filter(Boolean);
      return {
        name: a?.getAttribute('aria-label') ?? null,
        rating: txt(c.querySelector('span.MW4etd')),
        reviews: txt(c.querySelector('span.UY7F9')),
        info: [...new Set(lines)].slice(0, 2).join(' · '),
        url: a?.getAttribute('href')?.split('?')[0] ?? null,
      };
    });
  });
  return raw.map((r) => ({ ...r, rating: num(r.rating), reviews: num(r.reviews) }));
}

/** Finds the business: a direct place page, or the best-matching first result. */
async function findBusiness(page: Page, name: string, city: string | null): Promise<MapsPlace | null> {
  await open(page, [name, city].filter(Boolean).join(' '));
  if (!(await page.$('h1.DUwDvf'))) {
    const links = await page.$$('div[role="feed"] a.hfpxzc');
    const labels = await Promise.all(links.map((l) => l.evaluate((a) => a.getAttribute('aria-label') || '')));
    const wanted = name.toLowerCase().split(/\s+/)[0];
    const idx = labels.findIndex((l) => l.toLowerCase().includes(wanted));
    if (idx < 0) return null;
    await links[idx].click();
    await page.waitForSelector('h1.DUwDvf', { timeout: 15_000 }).catch(() => {});
  }
  return (await page.$('h1.DUwDvf')) ? readPlace(page) : null;
}

export async function runMaps(ctx: StepContext) {
  const { audit } = ctx;
  return withBrowser(async (browser) => {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1000 });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

    const business = await findBusiness(page, audit.business_name, audit.city);
    const area = audit.city || business?.address?.split(',').slice(-2, -1)[0]?.trim() || null;
    let nearby: MapsListing[] = [];
    if (business?.category && area) {
      await open(page, `${business.category} near ${area}`);
      const self = (business.name || '').toLowerCase();
      nearby = (await readList(page)).filter((l) => l.name && l.name.toLowerCase() !== self).slice(0, 8);
    }
    return {
      fetched_at: new Date().toISOString(),
      source: 'Google Maps (logged-out view)',
      business,
      nearby,
      note: business ? null : 'The business was not found on Google Maps under its name and city.',
    };
  });
}
