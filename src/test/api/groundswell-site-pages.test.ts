import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ executeTool: vi.fn() }));
vi.mock('../../../api/_lib/groundswell/composio', async (original) => ({ ...(await original<object>()), executeTool: mocks.executeTool }));

import { canonicalPage, choosePages, mappedUrls, pageScore, parseScrapedPage, readSitePages, runSitePages, scrapePage } from '../../../api/_lib/groundswell/currents/sitePages';
import { PermanentStepError } from '../../../api/_lib/groundswell/types';

/**
 * The site-pages Current reads a website beyond its homepage through Firecrawl:
 * a map of its URLs, the pages that say what it sells, and each competitor's
 * homepage, as main-content markdown. Shapes are the ones Firecrawl answered
 * on 2026-10-24 for wildlyprimal.com.
 */

const SITE = 'https://wildlyprimal.com';
const MAP = {
  id: 'map-1',
  success: true,
  links: [
    { url: 'https://wildlyprimal.com', title: 'Wildly Primal | Functional Health Coach & Lab Testing' },
    { url: 'https://wildlyprimal.com/work-with-us' },
    { url: 'https://wildlyprimal.com/faq', title: 'Health Coaching Cost, Insurance & Labs: FAQ' },
    { url: 'https://wildlyprimal.com/about' },
    { url: 'https://wildlyprimal.com/journal' },
    { url: 'https://wildlyprimal.com/journal/gi-map-test-explained' },
    { url: 'https://wildlyprimal.com/journal/leaky-gut-symptoms' },
    { url: 'https://wildlyprimal.com/privacy' },
    { url: 'https://wildlyprimal.com/terms' },
    { url: 'https://wildlyprimal.com/consumer-health-data' },
    { url: 'https://wildlyprimal.com/collective' },
    { url: 'https://wildlyprimal.com/contact' },
    { url: 'https://cdn.other.example/asset.png' },
    { url: 'https://wildlyprimal.com/work-with-us/' },
    'https://wildlyprimal.com/shop',
  ],
};
const SCRAPE = {
  success: true,
  data: {
    links: ['https://wildlyprimal.com/work-with-us#main', 'https://wildlyprimal.com/contact?interest=consult'],
    markdown: `[Skip to content](https://wildlyprimal.com/work-with-us#main)

[Book a consult](https://wildlyprimal.com/contact?interest=A%20complimentary%20consultation)

# Work with us

Our 4-month functional health program, a $350 one-time consultation, and Wildly Primal Continuum: ongoing one-on-one support at $297 a month.

## The program

We look in six places: lifestyle, health history, gut health, environmental exposures, nutrition and nutrient deficiencies, and we test rather than guess.

## Consultations

A single **consultation** for a second opinion on your labs. [Schedule a call](/contact) or [email us](mailto:hello@wildlyprimal.com).

![photo](https://wildlyprimal.com/img.jpg)
`,
    metadata: {
      statusCode: 200,
      title: 'Functional Health Program & Consultations | Wildly Primal',
      description: 'Our 4-month functional health program, a $350 one-time consultation, and Wildly Primal Continuum: ongoing one-on-one support at $297 a month.',
      'og:title': 'Functional Health Program & Consultations | Wildly Primal',
      sourceURL: 'https://wildlyprimal.com/work-with-us',
      creditsUsed: 1,
    },
  },
};

// A function returned from beforeEach is a cleanup hook to vitest, so the reset stays inside braces.
beforeEach(() => { mocks.executeTool.mockReset(); });

describe('choosing pages', () => {
  it('reads the homepage first, then the pages that say what the business sells, never legal pages or other hosts', () => {
    const chosen = choosePages(mappedUrls(MAP), SITE, 8);
    expect(chosen[0]).toBe('https://wildlyprimal.com');
    expect(chosen).toContain('https://wildlyprimal.com/work-with-us');
    expect(chosen).toContain('https://wildlyprimal.com/collective');
    expect(chosen).toContain('https://wildlyprimal.com/about');
    expect(chosen).toContain('https://wildlyprimal.com/faq');
    expect(chosen).toHaveLength(8);
    expect(chosen.filter((u) => u.endsWith('/work-with-us'))).toHaveLength(1);
    for (const u of chosen) expect(u).not.toMatch(/privacy|terms|consumer-health|cdn\.other/);
    expect(mappedUrls(MAP)).toContain('https://wildlyprimal.com/shop');
  });

  it('scores paths by what they say and drops assets and account pages', () => {
    expect(pageScore('/')).toBe(100);
    expect(pageScore('/services')).toBeGreaterThan(pageScore('/about'));
    expect(pageScore('/journal/post')).toBeLessThan(pageScore('/journal'));
    expect(pageScore('/logo.png')).toBeLessThan(0);
    expect(pageScore('/login')).toBeLessThan(0);
    expect(canonicalPage('https://WildlyPrimal.com/about/?x=1#top', SITE)).toBe('https://wildlyprimal.com/about');
    expect(canonicalPage('mailto:x@y.z', SITE)).toBeNull();
  });
});

describe('parsing a scraped page', () => {
  it('reads the title, headings, word count, calls to action and prices from the markdown and metadata', () => {
    const page = parseScrapedPage('https://wildlyprimal.com/work-with-us', SCRAPE);
    expect(page).toMatchObject({ path: '/work-with-us', status: 200, title: 'Functional Health Program & Consultations | Wildly Primal', h1: 'Work with us', error: null });
    expect(page.headings).toEqual(['Work with us', 'The program', 'Consultations']);
    expect(page.ctas.map((c) => c.text)).toEqual(['Book a consult', 'Schedule a call']);
    expect(page.ctas[1].url).toBe('https://wildlyprimal.com/contact');
    expect(page.prices).toEqual(['$350', '$297 a month']);
    expect(page.word_count).toBeGreaterThan(40);
    expect(page.excerpt).toContain('functional health program');
    expect(page.excerpt).not.toContain('](');
  });

  it('records a page without content or with an error status, never throwing', () => {
    expect(parseScrapedPage('https://x.example/p', { data: { metadata: { statusCode: 404 } } })).toMatchObject({ status: 404, error: 'The page returned HTTP 404.' });
    expect(parseScrapedPage('https://x.example/p', {})).toMatchObject({ error: 'The page returned no readable content.', word_count: 0 });
  });

  it('keeps a provider failure as the page error, and lets a refused key through', async () => {
    mocks.executeTool.mockRejectedValueOnce(new Error('FIRECRAWL_SCRAPE failed: timed out'));
    expect(await scrapePage('https://x.example', 10_000)).toMatchObject({ error: 'FIRECRAWL_SCRAPE failed: timed out' });
    mocks.executeTool.mockRejectedValueOnce(new PermanentStepError('Composio refused the API key (401)'));
    await expect(scrapePage('https://x.example', 10_000)).rejects.toBeInstanceOf(PermanentStepError);
    expect(await scrapePage('https://x.example', 500)).toMatchObject({ error: 'No time remained to read the page.' });
  });
});

describe('reading a site', () => {
  it('maps the site, reads the chosen pages and the competitors’ homepages, reusing pages already read', async () => {
    mocks.executeTool.mockImplementation(async (slug: string, args: Record<string, unknown>) => {
      if (slug === 'FIRECRAWL_MAP_MULTIPLE_URLS_BASED_ON_OPTIONS') return MAP;
      if (slug === 'FIRECRAWL_SCRAPE') return { ...SCRAPE, data: { ...SCRAPE.data, metadata: { ...SCRAPE.data.metadata, sourceURL: args.url, title: `Page ${args.url}` } } };
      throw new Error(`unexpected ${slug}`);
    });
    const known = parseScrapedPage('https://wildlyprimal.com/about', SCRAPE);
    const out = await readSitePages(SITE, { limit: 4, deadline: Date.now() + 120_000, competitors: [{ name: 'Rival', website: 'https://rival.example' }, { name: 'No site', website: null }], known: [known] });
    expect(out.mapped).toBe(15);
    expect(out.pages.map((p) => p.url)).toEqual(['https://wildlyprimal.com', 'https://wildlyprimal.com/work-with-us', 'https://wildlyprimal.com/collective', 'https://wildlyprimal.com/about']);
    expect(out.pages[3]).toBe(known);
    expect(out.competitors).toEqual([{ name: 'Rival', website: 'https://rival.example', page: expect.objectContaining({ url: 'https://rival.example', error: null }) }]);
    expect(mocks.executeTool.mock.calls.filter(([slug]) => slug === 'FIRECRAWL_SCRAPE')).toHaveLength(4);
    expect(out.error).toBeNull();
  });

  it('falls back to the homepage alone when the map fails, with the reason', async () => {
    mocks.executeTool.mockImplementation(async (slug: string) => {
      if (slug === 'FIRECRAWL_MAP_MULTIPLE_URLS_BASED_ON_OPTIONS') throw new Error('map quota');
      return SCRAPE;
    });
    const out = await readSitePages(SITE, { deadline: Date.now() + 60_000 });
    expect(out.error).toBe('Site map: map quota');
    expect(out.pages.map((p) => p.url)).toEqual(['https://wildlyprimal.com']);
  });

  it('the step reads the audit’s website and reuses the competitors step’s pages; no website is a permanent skip', async () => {
    mocks.executeTool.mockImplementation(async (slug: string) => (slug === 'FIRECRAWL_MAP_MULTIPLE_URLS_BASED_ON_OPTIONS' ? MAP : SCRAPE));
    const audit = { id: 'a1', business_name: 'Wildly Primal', city: 'Jacksonville, FL', website: SITE, instagram: null, competitors: [], notes: null };
    const known = parseScrapedPage('https://wildlyprimal.com', SCRAPE);
    const out = await runSitePages({ audit, outputs: { competitors: { pages: [known] } }, deadline: Date.now() + 120_000, attempt: 1 });
    expect(out.pages[0]).toBe(known);
    expect(out.pages.length).toBeGreaterThan(1);
    await expect(runSitePages({ audit: { ...audit, website: null }, outputs: {}, deadline: Date.now() + 120_000, attempt: 1 })).rejects.toBeInstanceOf(PermanentStepError);
  });
});
