// @vitest-environment node
// /pricing as the build writes it (src/lib/prerenderBody.tsx, under Node, real
// Navbar and Footer): with the price list the build read, the static HTML
// carries the rates as a sentence, a table and Offer nodes, and it never says
// the price list is not configured.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PAGE_JSONLD_ELEMENT_ID } from '../lib/pageMeta';
import { renderItBody, renderItPage } from '../lib/prerenderBody';
import { renderRouteHtml } from '../lib/prerenderHead';
import type { PricingUnit } from '../lib/pricingUnits';
import { ratesSentence } from '../lib/publishedRates';
import { IT_PAGE_META } from '../lib/routeMeta';

// The rows PostgREST returned on 2026-11-12, as stored: "Employees " keeps its stray space.
const row = (id: string, name: string, description: string, cents: number, max = 10000) => ({
  id,
  name,
  description,
  cost_per_unit: cents,
  min_quantity: 1,
  max_quantity: max,
  sort_order: 0,
  active: true,
});
const PRICE_LIST: PricingUnit[] = [
  row('u1', 'Employees ', 'Cost per employee/user account', 500),
  row('u2', 'Server', 'Managed Server', 17500, 1000),
  row('u3', 'Computers', 'Cost per computer/device', 10500),
  row('u4', 'Location Network Monitoring', 'Cost per physical location', 5000, 1000),
  row('u5', 'Office 365 - Licensing Only', 'Cost per email address account', 3200),
  row('u6', 'Office 365 - Licensing and Email', '', 3800, 1000),
];

const NOT_CONFIGURED = 'Pricing units are not configured yet';
const QUESTION = 'How much do managed IT services cost?';

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const decoded = (html: string) => html.replace(/&#x27;/g, "'").replace(/&amp;/g, '&');
const main = (html: string) => html.slice(html.indexOf('<main'), html.indexOf('</main>'));
const cells = (html: string) =>
  [...(html.match(/<tbody>[\s\S]*?<\/tbody>/)?.[0] ?? '').matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(([, tr]) =>
    [...tr.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map(([, cell]) => cell),
  );
const headingLevels = (html: string) => [...html.matchAll(/<h([1-6])\b/g)].map(([, level]) => Number(level));

type Node = Record<string, unknown>;

describe('/pricing in the build-time render, with the price list', () => {
  const page = renderItPage('/pricing', null, PRICE_LIST);
  const html = page.bodyHtml;

  it('lists every unit with its monthly price in a table inside <main>, above the quote builder', () => {
    const body = main(html);
    expect(body.match(/<table\b/g)).toHaveLength(1);
    expect(body).toMatch(/<caption[^>]*>[^<]*monthly rates in US dollars/);
    expect(body.match(/<th scope="col"/g)).toHaveLength(3);
    expect(body.match(/<th scope="row"/g)).toHaveLength(PRICE_LIST.length);
    expect(cells(body)).toEqual([
      ['Employees', 'Cost per employee/user account', '$5'],
      ['Server', 'Managed Server', '$175'],
      ['Computers', 'Cost per computer/device', '$105'],
      ['Location Network Monitoring', 'Cost per physical location', '$50'],
      ['Office 365 - Licensing Only', 'Cost per email address account', '$32'],
      ['Office 365 - Licensing and Email', 'Cost per account', '$38'],
    ]);
    expect(body.indexOf('<table')).toBeLessThan(body.indexOf('Select your options'));
    expect(body.indexOf('Select your options')).toBeGreaterThan(-1);
  });

  it('asks the buyer’s question in an h2 and answers it in the paragraph under it', () => {
    const body = decoded(main(html));
    expect(body).toMatch(new RegExp(`<h2[^>]*>${QUESTION.replace('?', '\\?')}</h2><p[^>]*>`));
    expect(body).toContain(ratesSentence());
    for (const rate of ['$105 per computer or device', '$5 per employee or user account', '$175 per managed server', '$50 per location', '$32 per account', '$38 per account']) {
      expect(body).toContain(rate);
    }
    expect(body).toMatch(/monthly rate for one unit, not a total/);
    expect(body).toMatch(/A written quote is built from these rates/);
  });

  it('never says the price list is not configured', () => {
    expect(html).not.toContain(NOT_CONFIGURED);
  });

  it('keeps what every static page must: one H1, no heading skip, no script, nothing hidden', () => {
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    const levels = headingLevels(html);
    levels.forEach((level, index) => {
      if (index) expect(level, `heading ${index + 1}`).toBeLessThanOrEqual(levels[index - 1] + 1);
    });
    expect(html).not.toContain('<script');
    expect(html).not.toMatch(/opacity:\s*0[;"]/);
    expect(html).not.toMatch(/translateY\(\d+px\)/);
    expect(text(html).split(' ').filter(Boolean).length).toBeGreaterThan(100);
  });

  it('hands the build one Offer per unit, with the table’s prices', () => {
    expect(page.jsonLd).toHaveLength(1);
    const [catalog] = page.jsonLd as Node[];
    expect(catalog['@type']).toBe('OfferCatalog');
    const offers = catalog.itemListElement as Node[];
    expect(offers.map((offer) => [offer['@type'], offer.name, offer.price, offer.priceCurrency])).toEqual([
      ['Offer', 'Employees', 5, 'USD'],
      ['Offer', 'Server', 175, 'USD'],
      ['Offer', 'Computers', 105, 'USD'],
      ['Offer', 'Location Network Monitoring', 50, 'USD'],
      ['Offer', 'Office 365 - Licensing Only', 32, 'USD'],
      ['Offer', 'Office 365 - Licensing and Email', 38, 'USD'],
    ]);
    for (const offer of offers) {
      expect(offer.priceSpecification).toMatchObject({ '@type': 'UnitPriceSpecification', price: offer.price, priceCurrency: 'USD', unitText: 'per month' });
      expect(offer.seller).toEqual({ '@id': 'https://www.newwaveitfl.com/#business' });
    }
    expect(JSON.stringify(page.jsonLd)).not.toMatch(/AggregateRating|Review|"Product"/);
  });

  it('puts those offers in the raw HTML’s #page-jsonld block', () => {
    const shell = readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8');
    const raw = renderRouteHtml(shell, '/pricing', IT_PAGE_META['/pricing'], page);
    const block = raw.match(new RegExp(`<script type="application/ld\\+json" id="${PAGE_JSONLD_ELEMENT_ID}">([\\s\\S]*?)</script>`));
    expect(JSON.parse(block?.[1] ?? 'null')).toEqual(page.jsonLd);
    expect(raw.match(/<script type="application\/ld\+json"/g)).toHaveLength(3); // shell graph, breadcrumbs, the price list
    expect(raw).toContain('<table');
    expect(raw).not.toContain(NOT_CONFIGURED);
  });

  it('drops the prose sentence, and keeps the table and the offers, when a price no longer matches the published rates', () => {
    const changed = PRICE_LIST.map((unit) => (unit.name === 'Computers' ? { ...unit, cost_per_unit: 11000 } : unit));
    const next = renderItPage('/pricing', null, changed);
    const body = decoded(main(next.bodyHtml));
    expect(body).toContain(QUESTION);
    expect(body).not.toContain('published monthly rates are');
    expect(body).not.toContain('$105 per computer');
    expect(cells(body)[2]).toEqual(['Computers', 'Cost per computer/device', '$110']);
    const offers = (next.jsonLd as Node[])[0].itemListElement as Node[];
    expect(offers[2].price).toBe(110);
  });
});

describe('/pricing in the build-time render, without the price list', () => {
  it.each([
    ['no seed (a build without credentials)', null],
    ['a price list with no active rows', [] as PricingUnit[]],
  ])('%s: no table, no prices, and no claim that the list is not configured', (_label, units) => {
    const page = renderItPage('/pricing', null, units);
    expect(page.bodyHtml).not.toContain('<table');
    expect(page.bodyHtml).not.toContain(QUESTION);
    expect(page.bodyHtml).not.toContain(NOT_CONFIGURED);
    expect(page.bodyHtml).not.toMatch(/\$\d/);
    expect(page.jsonLd).toBeNull();
    expect(page.bodyHtml.match(/<h1\b/g)).toHaveLength(1);
    expect(text(page.bodyHtml).split(' ').filter(Boolean).length).toBeGreaterThan(100);
  });
});

describe('the price-list seed', () => {
  it('lasts for one render only', () => {
    expect(renderItBody('/pricing', null, PRICE_LIST)).toContain('<table');
    expect(renderItBody('/pricing')).not.toContain('<table');
    expect(renderItPage('/pricing').jsonLd).toBeNull();
  });

  it('changes no other page', () => {
    for (const routePath of ['/about', '/it-support-fort-lauderdale']) {
      const seeded = renderItPage(routePath, null, PRICE_LIST);
      const plain = renderItPage(routePath);
      expect(seeded.bodyHtml, routePath).toBe(plain.bodyHtml);
      expect(seeded.jsonLd, routePath).toEqual(plain.jsonLd);
    }
  });
});
