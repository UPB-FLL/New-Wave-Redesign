// @vitest-environment node
// llms.txt and llms-full.txt are built from the pages' own sources. Run under
// Node, as the build runs the module: nothing here may need a DOM.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { allDivisionPages } from '../divisions/socialEngineering/seo';
import { DIVISION_NAME } from '../divisions/socialEngineering/site';
import {
  buildLlmsFullTxt,
  buildLlmsTxt,
  businessFromShell,
  formatPhone,
  hoursInWords,
  htmlToText,
  listInWords,
  LLMS_PARTNERS,
  llmsPage,
  llmsSectionsFor,
  placesOf,
  type LlmsPage,
  type LlmsSources,
} from './llmsTxt';
import { SITE_URL } from './pageMeta';
import { isPrerenderedItPath, renderItBody } from './prerenderBody';
import { PUBLISHED_RATES, usd } from './publishedRates';
import { HOME_PAGE_META, prerenderedItRoutes } from './routeMeta';

const ROOT = path.resolve(__dirname, '../..');

// The wording the site may not use, copied from the copy test so the files
// can be held to it; the first test keeps the two lists identical.
const PROMISES = [/within (?:one|1|a) business day/i, /sub-hour/i, /responding in minutes/i, /respond(?:s|ing)? within/i, /\b\d+[- ]?(?:hour|hr|minute|min)s?\b[^.]{0,20}\bresponse\b/i, /response time/i];

const expectNoPromise = (text: string) => {
  for (const pattern of PROMISES) expect(text, `${pattern}`).not.toMatch(pattern);
};

/** The part of llms.txt under one "## " heading. */
const sectionOf = (text: string, title: string) => text.split(/^## /m).find((part) => part.startsWith(`${title}\n`)) ?? '';
const sectionTitles = (text: string) => [...text.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
const urlsIn = (text: string) => [...text.matchAll(/https?:\/\/[^\s)\]]+/g)].map((match) => match[0]);

describe('the wording rule', () => {
  it('is the copy test\'s own list', () => {
    const source = readFileSync(path.join(ROOT, 'src/test/copy/response-time-claims.test.ts'), 'utf8');
    expect(/const PROMISES = \[(.*)\];/.exec(source)?.[1]).toBe(PROMISES.map(String).join(', '));
  });
});

// A made-up business, so nothing below can be mistaken for a fact about New Wave IT.
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const FIXTURE_GRAPH = [
  {
    '@type': ['LocalBusiness', 'ProfessionalService'],
    '@id': 'https://www.example.com/#business',
    name: 'Harbor IT',
    url: 'https://www.example.com',
    description: 'A tagline, not a sentence.',
    telephone: '+13055550123',
    email: 'help@example.com',
    address: { '@type': 'PostalAddress', streetAddress: '1 Bay St, Suite 2', addressLocality: 'Fort Lauderdale', addressRegion: 'FL', postalCode: '33301', addressCountry: 'US' },
    areaServed: [{ '@type': 'City', name: 'Miami' }, { '@type': 'AdministrativeArea', name: 'Palm Beach County' }, 'South Florida'],
    openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: WEEKDAYS, opens: '09:00', closes: '17:30' }],
    contactPoint: [
      { '@type': 'ContactPoint', contactType: 'customer support', telephone: '+13055550123' },
      {
        '@type': 'ContactPoint',
        contactType: 'emergency',
        telephone: '+13055550199',
        hoursAvailable: { '@type': 'OpeningHoursSpecification', dayOfWeek: [...WEEKDAYS, 'Saturday', 'Sunday'], opens: '00:00', closes: '23:59' },
      },
    ],
  },
  { '@type': 'Organization', '@id': 'https://www.example.com/#organization', name: 'Harbor IT', foundingDate: '2019', description: 'Harbor IT is a managed service provider for offices in South Florida.' },
  { '@type': 'WebSite', '@id': 'https://www.example.com/#website', name: 'Harbor IT' },
];
const shellWith = (graph: unknown) =>
  `<!doctype html><html><head><title>Harbor IT</title>\n<script type="application/ld+json">\n${JSON.stringify(graph, null, 2)}\n</script></head><body><div id="root"></div></body></html>`;
const FIXTURE_SHELL = shellWith(FIXTURE_GRAPH);

const page = (pagePath: string, title: string, bodyHtml?: string): LlmsPage => ({ path: pagePath, title, description: `About ${title.toLowerCase()}.`, bodyHtml });
const LOCAL_BODY =
  '<nav><a href="/">Harbor IT</a><button>Menu</button></nav>' +
  '<header><nav aria-label="Breadcrumb"><a href="/">Home</a></nav><h1>IT support for Fort Lauderdale offices</h1><p>A local help desk.</p><div><a href="/contact">Get an assessment</a></div></header>' +
  '<main><section><h2>Overview</h2><p>Remote and on-site support.</p><ul><li>Help desk</li><li>Repairs</li></ul></section></main>' +
  '<footer><p>Footer words</p></footer>';
const FIXTURE_ROUTES: LlmsPage[] = [
  page('/services', 'IT services'),
  page('/pricing', 'Pricing'),
  page('/contact', 'Contact'),
  page('/why-us', 'Why us'),
  page('/about', 'About'),
  page('/support', 'Support'),
  page('/status', 'Service status'),
  page('/cybersecurity', 'Threat center'),
  page('/codenest', 'CodeNest'),
  page('/blog', 'Blog'),
  page('/service-category/cybersecurity', 'Cybersecurity services'),
  page('/it-support-fort-lauderdale', 'IT support Fort Lauderdale', LOCAL_BODY),
  page('/managed-it-services-fort-lauderdale', 'Managed IT Fort Lauderdale'),
  page('/service-category/managed-it-services', 'Managed IT services'),
  page('/managed-it-services-miami', 'Managed IT Miami'),
  page('/managed-it-services-west-palm-beach', 'Managed IT West Palm Beach'),
  page('/it-support-coral-springs', 'IT support Coral Springs'),
  page('/careers', 'Careers'),
  page('/groundswell', 'Sign in'),
  page('/privacy-policy', 'Privacy policy', '<main><h2>Privacy</h2><p>Legal words.</p></main>'),
  page('/terms-and-conditions', 'Terms'),
  page('/cookie-policy', 'Cookie policy'),
  page('/l/managed-it-guide', 'Managed IT guide', '<main><h2>Guide body</h2><p>General guidance words.</p></main>'),
];
const FIXTURE_DIVISION = {
  name: 'Harbor: Growth',
  pages: [
    { path: '/growth', title: 'Small business growth marketing | Harbor: Growth', description: 'Data, integrations, and advertising for small businesses nationwide.' },
    { path: '/growth/ads', title: 'Paid search & social [ads] | Harbor: Growth', description: 'Advertising judged by cost per sale.' },
  ],
};
const fixtureSources = (extra: Partial<LlmsSources> = {}): LlmsSources => ({
  business: businessFromShell(FIXTURE_SHELL),
  routes: FIXTURE_ROUTES,
  home: page('/', 'Harbor IT home', '<nav><a href="/">Logo</a></nav><section><h1>Harbor IT</h1><p>Home words.</p></section>'),
  division: FIXTURE_DIVISION,
  ...extra,
});
const OMITTED = ['/groundswell', '/codenest'];
const LEGAL = ['/privacy-policy', '/terms-and-conditions', '/cookie-policy'];

describe('businessFromShell', () => {
  it('reads the facts from the entity graph', () => {
    expect(businessFromShell(FIXTURE_SHELL)).toEqual({
      name: 'Harbor IT',
      url: 'https://www.example.com',
      description: 'Harbor IT is a managed service provider for offices in South Florida.',
      telephone: '+13055550123',
      email: 'help@example.com',
      address: { street: '1 Bay St, Suite 2', locality: 'Fort Lauderdale', region: 'FL', postalCode: '33301' },
      hours: [{ days: WEEKDAYS, opens: '09:00', closes: '17:30' }],
      emergency: { telephone: '+13055550199', hours: { days: [...WEEKDAYS, 'Saturday', 'Sunday'], opens: '00:00', closes: '23:59' } },
      areaServed: ['Miami', 'Palm Beach County', 'South Florida'],
      foundingDate: '2019',
    });
  });

  it('reads a graph written as @graph, and does without the optional facts', () => {
    const plain = Object.fromEntries(Object.entries(FIXTURE_GRAPH[0]).filter(([key]) => key !== 'contactPoint' && key !== 'areaServed'));
    const read = businessFromShell(shellWith({ '@context': 'https://schema.org', '@graph': [plain] }));
    expect(read.emergency).toBeNull();
    expect(read.areaServed).toEqual([]);
    expect(read.foundingDate).toBeNull();
    // Without an Organization node the LocalBusiness description stands in.
    expect(read.description).toBe('A tagline, not a sentence.');
  });

  it('names the fact that is missing instead of writing "undefined"', () => {
    const [business, ...rest] = FIXTURE_GRAPH;
    const without = (key: string) => shellWith([Object.fromEntries(Object.entries(business).filter(([name]) => name !== key)), ...rest]);
    expect(() => businessFromShell(without('telephone'))).toThrow(/no telephone/);
    expect(() => businessFromShell(without('address'))).toThrow(/no streetAddress/);
    expect(() => businessFromShell(without('openingHoursSpecification'))).toThrow(/no openingHoursSpecification/);
    expect(() => businessFromShell('<html><head></head></html>')).toThrow(/no LocalBusiness/);
  });
});

describe('wording the facts', () => {
  it('writes a phone number the way the site shows it', () => {
    expect(formatPhone('+15615550100')).toBe('(561) 555-0100');
    expect(formatPhone('561-555-0100')).toBe('(561) 555-0100');
    expect(formatPhone('+44 20 7946 0958')).toBe('+44 20 7946 0958');
  });

  it('writes opening hours in words', () => {
    expect(hoursInWords({ days: WEEKDAYS, opens: '08:00', closes: '18:00' })).toBe('Monday to Friday, 8am to 6pm');
    expect(hoursInWords({ days: ['Saturday', 'Sunday'], opens: '10:30', closes: '12:00' })).toBe('Saturday and Sunday, 10:30am to 12pm');
    expect(hoursInWords({ days: ['Friday', 'Monday', 'Wednesday'], opens: '00:00', closes: '13:15' })).toBe('Monday, Wednesday and Friday, 12am to 1:15pm');
    expect(hoursInWords({ days: [...WEEKDAYS, 'Saturday', 'Sunday'], opens: '09:00', closes: '17:00' })).toBe('every day, 9am to 5pm');
    expect(hoursInWords({ days: [...WEEKDAYS, 'Saturday', 'Sunday'], opens: '00:00', closes: '23:59' })).toBe('24/7');
  });

  it('writes a list without a comma before "and"', () => {
    expect(listInWords([])).toBe('');
    expect(listInWords(['a'])).toBe('a');
    expect(listInWords(['a', 'b'])).toBe('a and b');
    expect(listInWords(LLMS_PARTNERS)).toBe('Huntress, Microsoft and Cisco');
  });
});

describe('llmsSectionsFor', () => {
  const places = placesOf(businessFromShell(FIXTURE_SHELL));
  const sections = llmsSectionsFor(FIXTURE_ROUTES.map((route) => route.path), places);
  const pathsIn = (section: string) => [...sections].filter(([, value]) => value === section).map(([key]) => key);

  it('takes the places from the graph: the office city and the areas served', () => {
    expect(places).toEqual(['Fort Lauderdale', 'Miami', 'Palm Beach County', 'South Florida']);
  });

  it('files a route whose path names a place under Service areas', () => {
    expect(pathsIn('areas')).toEqual([
      '/it-support-fort-lauderdale',
      '/managed-it-services-fort-lauderdale',
      '/managed-it-services-miami',
      // "Palm Beach County" is in the graph; the path names it without "County".
      '/managed-it-services-west-palm-beach',
      // Not a place the graph names, but a sibling of /it-support-fort-lauderdale.
      '/it-support-coral-springs',
    ]);
  });

  it('does not take a company page, or a new page that names no place, for a local one', () => {
    expect(sections.get('/contact')).toBe('company');
    expect(sections.get('/careers')).toBe('company');
    expect(pathsIn('company')).toEqual(['/pricing', '/contact', '/why-us', '/about', '/support', '/blog', '/careers']);
  });

  it('needs whole words: a place inside a longer word is not named', () => {
    const result = llmsSectionsFor(['/miamisburg-office', '/it-support-miami-beach', '/it-supporters'], ['Miami']);
    expect(result.get('/miamisburg-office')).toBe('company');
    expect(result.get('/it-support-miami-beach')).toBe('areas');
    expect(result.get('/it-supporters')).toBe('company');
  });

  it('files the rest by kind and leaves the sign-in and CodeNest pages out', () => {
    expect(pathsIn('services')).toEqual(['/services', '/cybersecurity', '/service-category/cybersecurity', '/service-category/managed-it-services']);
    expect(pathsIn('guides')).toEqual(['/l/managed-it-guide']);
    expect(pathsIn('optional')).toEqual(['/status', ...LEGAL]);
    for (const omitted of OMITTED) expect(sections.has(omitted)).toBe(false);
  });
});

describe('buildLlmsTxt', () => {
  const text = buildLlmsTxt(fixtureSources());

  it('opens with the name, the summary as a block quote and the key facts', () => {
    expect(text.split('\n\n').slice(0, 3)).toEqual([
      '# Harbor IT',
      '> Harbor IT is a managed service provider for offices in South Florida. Its office is at 1 Bay St, Suite 2, Fort Lauderdale, FL 33301. It serves Miami, Palm Beach County and South Florida.',
      'Key facts:',
    ]);
    expect(text.split('\n\n')[3].split('\n')).toEqual([
      '- Website: https://www.example.com',
      '- Address: 1 Bay St, Suite 2, Fort Lauderdale, FL 33301',
      '- Phone: (305) 555-0123',
      '- Email: help@example.com',
      '- Office hours: Monday to Friday, 9am to 5:30pm',
      '- Emergency line: (305) 555-0199, 24/7',
      '- Founded: 2019',
      '- Partners: Huntress, Microsoft and Cisco',
    ]);
    expect(text.endsWith('\n')).toBe(true);
    expect(text).not.toMatch(/undefined|\[object/);
  });

  it('leaves a fact out when the graph does not state it', () => {
    const business = { ...businessFromShell(FIXTURE_SHELL), emergency: null, foundingDate: null, areaServed: [] };
    const bare = buildLlmsTxt(fixtureSources({ business }));
    expect(bare).not.toMatch(/Emergency line|Founded|It serves/);
    expect(bare).toContain('- Partners: Huntress, Microsoft and Cisco');
  });

  it('lists the published rates from the price list it is given, with a link to the pricing page', () => {
    const rates = Object.values(PUBLISHED_RATES);
    // Names as the price list stores them: a stray space is tidied.
    const priceUnits = [...rates.map((rate) => ({ name: `${rate.unitName} `, cost_per_unit: rate.dollars * 100 })), { name: 'Backup storage', cost_per_unit: 2050 }];
    const priced = buildLlmsTxt(fixtureSources({ priceUnits }));
    expect(priced).toContain(
      [
        '- Monthly rates from the [published price list](https://www.example.com/pricing), each for one unit:',
        ...rates.map((rate) => `  - ${rate.unitName}: ${usd(rate.dollars)} per ${rate.per}`),
        // A row the copy has no unit wording for is its name and its price.
        '  - Backup storage: $20.50',
      ].join('\n'),
    );
    for (const without of [undefined, null, []]) expect(buildLlmsTxt(fixtureSources({ priceUnits: without }))).not.toContain('Monthly rates');
  });

  it('follows the price list, not the copy, when a price changed', () => {
    const priced = buildLlmsTxt(fixtureSources({ priceUnits: [{ name: PUBLISHED_RATES.server.unitName, cost_per_unit: 19900 }] }));
    expect(priced).toContain(`  - ${PUBLISHED_RATES.server.unitName}: $199 per ${PUBLISHED_RATES.server.per}`);
  });

  it('orders the sections, the division before Optional', () => {
    expect(sectionTitles(text)).toEqual(['Services', 'Service areas', 'Guides', 'Company', 'Harbor: Growth', 'Optional']);
  });

  it('lists every static route once, in one section, as a link with its description', () => {
    const sections = text.slice(text.indexOf('## '));
    for (const route of FIXTURE_ROUTES) {
      const line = `- [${route.title}](https://www.example.com${route.path}): ${route.description}`;
      const count = sections.split('\n').filter((candidate) => candidate === line).length;
      expect(count, route.path).toBe(OMITTED.includes(route.path) ? 0 : 1);
      expect(sections.split(`(https://www.example.com${route.path})`).length - 1, route.path).toBe(OMITTED.includes(route.path) ? 0 : 1);
    }
  });

  it('puts the local pages under Service areas and the company pages under Company', () => {
    expect(sectionOf(text, 'Service areas')).toContain('(https://www.example.com/managed-it-services-miami)');
    expect(sectionOf(text, 'Service areas')).not.toContain('(https://www.example.com/contact)');
    expect(sectionOf(text, 'Company')).toContain('(https://www.example.com/contact)');
    // The services overview leads its section; the company pages keep the order the copy names them in.
    expect(urlsIn(sectionOf(text, 'Services'))[0]).toBe('https://www.example.com/services');
    expect(urlsIn(sectionOf(text, 'Company')).slice(0, 3)).toEqual(['https://www.example.com/about', 'https://www.example.com/why-us', 'https://www.example.com/pricing']);
  });

  it('puts the legal pages under Optional', () => {
    const optional = sectionOf(text, 'Optional');
    for (const legal of LEGAL) expect(optional, legal).toContain(`(https://www.example.com${legal})`);
    expect(optional).toContain('(https://www.example.com/status)');
  });

  it('passes the division\'s titles and descriptions through unchanged', () => {
    const division = sectionOf(text, 'Harbor: Growth').trim().split('\n').slice(2);
    expect(division).toEqual([
      '- [Small business growth marketing | Harbor: Growth](https://www.example.com/growth): Data, integrations, and advertising for small businesses nationwide.',
      // Only a bracket is escaped, so the link still reads as one.
      '- [Paid search & social \\[ads\\] | Harbor: Growth](https://www.example.com/growth/ads): Advertising judged by cost per sale.',
    ]);
    expect(sectionTitles(buildLlmsTxt(fixtureSources({ division: undefined })))).not.toContain('Harbor: Growth');
  });

  it('uses a route\'s own address when it has one', () => {
    const withUrl = buildLlmsTxt(fixtureSources({ routes: [{ path: '/about', title: 'About', url: 'https://www.example.com/about-us' }] }));
    expect(withUrl).toContain('- [About](https://www.example.com/about-us)\n');
  });

  it('makes no promise the site may not make', () => {
    expectNoPromise(text);
    expectNoPromise(buildLlmsFullTxt(fixtureSources()));
  });
});

describe('buildLlmsFullTxt', () => {
  const full = buildLlmsFullTxt(fixtureSources());
  const blocks = full.split(/^## /m).slice(1);
  const block = (title: string) => blocks.find((candidate) => candidate.startsWith(`${title}\n`));

  it('opens with the same header as llms.txt', () => {
    const header = (text: string) => text.slice(0, text.indexOf('\n## '));
    expect(header(full)).toBe(header(buildLlmsTxt(fixtureSources())));
  });

  it('gives each page a block with its address and the text of its body, its headings below the page\'s', () => {
    expect(block('IT support Fort Lauderdale')?.trim()).toBe(
      [
        'IT support Fort Lauderdale',
        'URL: https://www.example.com/it-support-fort-lauderdale',
        '### IT support for Fort Lauderdale offices',
        'A local help desk.',
        '#### Overview',
        'Remote and on-site support.',
        '- Help desk\n- Repairs',
      ].join('\n\n'),
    );
  });

  it('starts with the homepage and follows llms.txt\'s order', () => {
    expect(blocks[0].trim()).toBe(['Harbor IT home', 'URL: https://www.example.com/', '### Harbor IT', 'Home words.'].join('\n\n'));
    expect(blocks[1]).toMatch(/^IT services\n/);
    expect(blocks[blocks.length - 1]).toMatch(/^Paid search & social \[ads\] \| Harbor: Growth\n/);
  });

  it('falls back to the description for a page without a rendered body', () => {
    expect(block('Pricing')?.trim()).toBe(['Pricing', 'URL: https://www.example.com/pricing', 'About pricing.'].join('\n\n'));
  });

  it('gives a guide its description, never its body', () => {
    expect(block('Managed IT guide')?.trim()).toBe(['Managed IT guide', 'URL: https://www.example.com/l/managed-it-guide', 'About managed it guide.'].join('\n\n'));
    expect(full).not.toContain('General guidance words');
  });

  it('leaves out the legal pages and the pages llms.txt leaves out', () => {
    for (const absent of [...LEGAL, ...OMITTED]) expect(full, absent).not.toContain(`https://www.example.com${absent}\n`);
    expect(full).not.toContain('Legal words');
    expect(block('Service status')).toBeDefined();
  });

  it('gives each division page its own description, unchanged', () => {
    expect(block('Small business growth marketing | Harbor: Growth')?.trim()).toBe(
      ['Small business growth marketing | Harbor: Growth', 'URL: https://www.example.com/growth', 'Data, integrations, and advertising for small businesses nationwide.'].join('\n\n'),
    );
  });
});

describe('htmlToText', () => {
  it('turns headings into Markdown headings, an <h1> at the level asked for', () => {
    expect(htmlToText('<h1>Top</h1><p>One.</p><h2>Next</h2><p>Two.</p>')).toBe('# Top\n\nOne.\n\n## Next\n\nTwo.');
    expect(htmlToText('<h1>Top</h1><h2>Next</h2><h3>Card</h3><p>Body.</p><h6>Small</h6><p>Print.</p>', { headingLevel: 3 })).toBe(
      '### Top\n\n#### Next\n\n##### Card\n\nBody.\n\n###### Small\n\nPrint.',
    );
  });

  it('keeps a button\'s words when the button is the heading', () => {
    expect(htmlToText('<h3><button type="button">What does it cost?</button></h3><p>See the price list.</p>')).toBe('### What does it cost?\n\nSee the price list.');
  });

  it('turns list items into "- " lines, a nested list indented', () => {
    const html = '<ul>\n  <li>One</li>\n  <li><span aria-hidden="true">2</span><span>Two</span></li>\n  <li>Three<ul><li>Nested</li></ul></li>\n</ul><ol><li>First step</li><li>Second step</li></ol>';
    expect(htmlToText(html)).toBe('- One\n- Two\n- Three\n  - Nested\n- First step\n- Second step');
  });

  it('puts a list item on one line, its heading leading into its text', () => {
    expect(htmlToText('<ul><li><h3>Help desk</h3><p>Password resets and printers.</p></li><li><p>Who answers?</p><p>A technician.</p></li></ul>')).toBe(
      '- Help desk: Password resets and printers.\n- Who answers? A technician.',
    );
  });

  it('turns table rows into " | " lines under the caption', () => {
    const html =
      '<table><caption>Monthly rates</caption><thead><tr><th scope="col">Item</th><th scope="col">Covers</th><th scope="col">Price</th></tr></thead>' +
      '<tbody><tr><th scope="row">Server</th><td>Managed server</td><td>$<!-- -->175</td></tr><tr><th scope="row">Email</th><td></td><td>$38</td></tr></tbody></table>';
    expect(htmlToText(html)).toBe('Monthly rates\n\nItem | Covers | Price\nServer | Managed server | $175\nEmail |  | $38');
  });

  it('keeps the text of a link', () => {
    expect(htmlToText('<p>Read the <a href="/pricing">price list</a>, then <a href="tel:+15615550100">call us</a>.</p>')).toBe('Read the price list, then call us.');
    expect(htmlToText('<ul><li><a href="/services">All services</a></li><li><a href="https://status.example.com" target="_blank">Example status</a></li></ul>')).toBe(
      '- All services\n- Example status',
    );
    // A card that is one link around blocks is read as its blocks.
    expect(htmlToText('<a href="/service-category/cloud"><h3>Cloud</h3><p>Migrations and Microsoft 365.</p></a>')).toBe('### Cloud\n\nMigrations and Microsoft 365.');
  });

  it('drops a row of calls to action but keeps the number or address in it', () => {
    const html =
      '<h2>Need help?</h2><p>Tell us what is slow.</p>' +
      '<div><a href="/contact">Request an assessment</a><a href="tel:5615550100">(561) 555-0100</a><a href="tel:5615550100">Call us now</a>' +
      '<a href="mailto:help@example.com">help@example.com</a><a href="mailto:help@example.com">Email us</a><button>Chat</button></div>';
    expect(htmlToText(html)).toBe('## Need help?\n\nTell us what is slow.\n\n(561) 555-0100 help@example.com');
  });

  it('drops site chrome, controls, media and hidden elements', () => {
    const html =
      '<nav><a href="/">Home</a><a href="/services">Services</a></nav>' +
      '<header><a href="/">Logo</a><span>Site bar words</span></header>' +
      '<main><h2>Overview</h2><p>Kept<svg><title>Icon</title><path d="M0 0"/></svg> words.</p>' +
      '<form><label>Name<input type="text" value="x"/></label><button type="submit">Send</button></form>' +
      '<p>Before <button type="button">Open chat</button>after.</p>' +
      '<div aria-hidden="true">Decoration</div><div hidden="">Closed panel</div>' +
      '<script>if (a < b) { document.write("<p>Script words</p>"); }</script><style>p > a { color: red }</style>' +
      '<video aria-label="Clip"><source src="/a.mp4"/></video><noscript>No script words</noscript></main>' +
      '<footer><p>Footer words</p></footer>';
    expect(htmlToText(html)).toBe('## Overview\n\nKept words.\n\nBefore after.');
  });

  it('keeps a page header, which holds the heading, without its breadcrumb and buttons', () => {
    const html = '<header><nav aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li></ol></nav><h1>Managed IT</h1><p>The lede.</p><div><a href="/contact">Get started</a><a href="/pricing">See pricing</a></div></header>';
    expect(htmlToText(html)).toBe('# Managed IT\n\nThe lede.');
  });

  it('drops a heading left with nothing under it', () => {
    expect(htmlToText('<h2>Overview</h2><p>Words.</p><h2>Related</h2><div><a href="/a">A</a><a href="/b">B</a></div><h2>Contact</h2><h3>Call</h3><p>(561) 555-0100</p><h3>Chat</h3>')).toBe(
      '## Overview\n\nWords.\n\n## Contact\n\n### Call\n\n(561) 555-0100',
    );
  });

  it('decodes entities and collapses whitespace', () => {
    expect(htmlToText('<p>Tom &amp; Jerry&#x27;s   &quot;caf&#233;&quot;&nbsp;&mdash;\n   5 &lt; 6, $<!-- -->5.00 &unknown;</p>')).toBe('Tom & Jerry\'s "café" — 5 < 6, $5.00 &unknown;');
    expect(htmlToText('<p>1 Bay St, Suite 2<br/>Fort Lauderdale, FL 33301</p>')).toBe('1 Bay St, Suite 2\nFort Lauderdale, FL 33301');
  });

  it('keeps a line break the element shows as written', () => {
    // The contact block writes the address on two lines this way.
    expect(htmlToText('<p class="mb-1 whitespace-pre-line text-xs">1 Bay St,   Suite 2\nFort Lauderdale, FL 33301</p>')).toBe('1 Bay St, Suite 2\nFort Lauderdale, FL 33301');
    expect(htmlToText('<div style="white-space: pre-line"><span>Line one\nLine two</span></div>')).toBe('Line one\nLine two');
    expect(htmlToText('<p class="text-xs">Line one\nLine two</p>')).toBe('Line one Line two');
  });

  it('reads a class named "hidden" as a class, not as the hidden attribute', () => {
    expect(htmlToText('<p class="text-sm hidden md:block" data-note="aria-hidden=\'true\'">Shown on wide screens.</p><p hidden>Never shown.</p>')).toBe('Shown on wide screens.');
  });

  it('reads two elements side by side as separate words, and an image as its alt text', () => {
    expect(htmlToText('<p><span>Phone</span><span>(561) 555-0100</span></p>')).toBe('Phone (561) 555-0100');
    expect(htmlToText('<p>H<sub>2</sub>O and <strong>bold</strong>, plain.</p>')).toBe('H2O and bold, plain.');
    expect(htmlToText('<p>Tools we run</p><div><img src="/logos/a.svg" alt="Example 365"/></div><div><img src="/photo.jpg" alt=""/></div>')).toBe('Tools we run\n\nExample 365');
  });

  it('reads markup that is not well formed without throwing', () => {
    expect(htmlToText('<div><p>Open paragraph<div>Next</div></span></div>')).toBe('Open paragraph\n\nNext');
    expect(htmlToText('')).toBe('');
    expect(htmlToText('5 < 6 and 7 > 2')).toBe('5 < 6 and 7 > 2');
  });
});

describe('the files built from the real sources', () => {
  const shell = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const graph = JSON.parse(/<script type="application\/ld\+json">\s*(\[[\s\S]*?\])\s*<\/script>/.exec(shell)![1]) as Record<string, unknown>[];
  const local = graph[0] as {
    name: string;
    telephone: string;
    email: string;
    address: Record<string, string>;
    areaServed: { name: string }[];
    openingHoursSpecification: { dayOfWeek: string[]; opens: string; closes: string }[];
    contactPoint: { contactType: string; telephone: string; hoursAvailable: { dayOfWeek: string[]; opens: string; closes: string } }[];
  };
  const business = businessFromShell(shell);
  const routes = prerenderedItRoutes();
  const divisionPages = allDivisionPages();
  const division = { name: DIVISION_NAME, pages: divisionPages.map(({ path: pagePath, title, description }) => ({ path: pagePath, title, description })) };
  // Bodies as the build renders them, here with the code fallbacks in place of the CMS copy.
  const body = (routePath: string) => (isPrerenderedItPath(routePath) ? renderItBody(routePath) : undefined);
  const sources: LlmsSources = {
    business,
    routes: routes.map((route) => llmsPage(route, body(route.path))),
    home: llmsPage({ path: '/', meta: HOME_PAGE_META }, body('/')),
    division,
    priceUnits: Object.values(PUBLISHED_RATES).map((rate) => ({ name: rate.unitName, cost_per_unit: rate.dollars * 100 })),
  };
  const text = buildLlmsTxt(sources);
  const full = buildLlmsFullTxt(sources);
  const sections = llmsSectionsFor(routes.map((route) => route.path), placesOf(business));
  const emergency = local.contactPoint.find((point) => point.contactType === 'emergency')!;

  it('state the phone, the address and the hours of the shell graph', () => {
    expect(business.telephone).toBe(local.telephone);
    expect(formatPhone(local.telephone).replace(/\D/g, '')).toBe(local.telephone.replace(/\D/g, '').slice(-10));
    expect(business.hours).toEqual(local.openingHoursSpecification.map(({ dayOfWeek, opens, closes }) => ({ days: dayOfWeek, opens, closes })));
    expect(business.emergency).toEqual({
      telephone: emergency.telephone,
      hours: { days: emergency.hoursAvailable.dayOfWeek, opens: emergency.hoursAvailable.opens, closes: emergency.hoursAvailable.closes },
    });
    const { streetAddress, addressLocality, addressRegion, postalCode } = local.address;
    for (const file of [text, full]) {
      expect(file.startsWith(`# ${local.name}\n\n> `)).toBe(true);
      expect(file).toContain(`\n- Phone: ${formatPhone(local.telephone)}\n`);
      expect(file).toContain(`\n- Address: ${streetAddress}, ${addressLocality}, ${addressRegion} ${postalCode}\n`);
      expect(file).toContain(`Its office is at ${streetAddress}, ${addressLocality}, ${addressRegion} ${postalCode}.`);
      expect(file).toContain(`\n- Email: ${local.email}\n`);
      expect(file).toContain(`\n- Office hours: ${business.hours.map(hoursInWords).join('; ')}\n`);
      expect(file).toContain(`\n- Emergency line: ${formatPhone(emergency.telephone)}, ${hoursInWords(business.emergency!.hours!)}\n`);
      expect(file).toContain(`\n- Founded: ${(graph[1] as { foundingDate: string }).foundingDate}\n`);
      expect(file).toContain(`It serves ${listInWords(local.areaServed.map((area) => area.name))}.`);
    }
  });

  it('link only to pages the site has', () => {
    const known = new Set([SITE_URL, `${SITE_URL}/`, ...routes.map((route) => route.meta.canonical), ...divisionPages.map((divisionPage) => `${SITE_URL}${divisionPage.path}`)]);
    expect(urlsIn(text).length).toBeGreaterThan(routes.length);
    for (const file of [text, full]) {
      for (const url of urlsIn(file)) expect(known.has(url), url).toBe(true);
    }
  });

  it('list every static route once, in one section', () => {
    const listed = text.slice(text.indexOf('## '));
    for (const route of routes) {
      const count = listed.split(`](${route.meta.canonical})`).length - 1;
      expect(count, route.path).toBe(OMITTED.includes(route.path) ? 0 : 1);
      if (!OMITTED.includes(route.path)) expect(listed, route.path).toContain(`- [${route.meta.title}](${route.meta.canonical}): ${route.meta.description}`);
    }
  });

  it('sort the real routes as intended', () => {
    const pathsIn = (section: string) => [...sections].filter(([, value]) => value === section).map(([key]) => key);
    expect(pathsIn('areas')).toEqual(expect.arrayContaining(['/it-support-fort-lauderdale', '/managed-it-services-fort-lauderdale']));
    // A route that lands here by default names no place the rule knows. Decide
    // where it belongs: add it to COMPANY_PATHS in llmsTxt.ts (and here), or
    // name its place in index.html's areaServed.
    expect(pathsIn('company').sort()).toEqual(['/about', '/blog', '/contact', '/pricing', '/support', '/why-us']);
    expect(pathsIn('optional')).toEqual(expect.arrayContaining(LEGAL));
    expect(pathsIn('guides').every((guide) => guide.startsWith('/l/'))).toBe(true);
    expect(sectionTitles(text)).toEqual(['Services', 'Service areas', 'Guides', 'Company', DIVISION_NAME, 'Optional']);
  });

  it('pass the division\'s pages through unchanged, with nothing local beside them', () => {
    // The division's own rule (pages.test.tsx): it names no home market.
    const LOCAL_POSITIONING = /Fort Lauderdale|South Florida|Broward|Palm Beach|Miami|Boca Raton|South FL\b/i;
    const lines = sectionOf(text, DIVISION_NAME).trim().split('\n').slice(2);
    expect(lines).toEqual(divisionPages.map((divisionPage) => `- [${divisionPage.title}](${SITE_URL}${divisionPage.path}): ${divisionPage.description}`));
    expect(sectionOf(text, DIVISION_NAME)).not.toMatch(LOCAL_POSITIONING);
    const blocks = full.split(/^## /m);
    for (const divisionPage of divisionPages) {
      const block = blocks.find((candidate) => candidate.startsWith(`${divisionPage.title}\n`));
      expect(block?.trim(), divisionPage.path).toBe([divisionPage.title, `URL: ${SITE_URL}${divisionPage.path}`, divisionPage.description].join('\n\n'));
      expect(block).not.toMatch(LOCAL_POSITIONING);
    }
  });

  it('carry every listed page\'s text in llms-full.txt, and no markup', () => {
    const blocks = full.split(/^## /m).slice(1);
    const blockFor = (title: string) => blocks.filter((candidate) => candidate.startsWith(`${title}\n`));
    expect(blocks[0].startsWith(`${HOME_PAGE_META.title}\n\nURL: ${SITE_URL}/\n\n`)).toBe(true);
    expect(blocks[0]).toMatch(/^### \S/m);
    for (const route of routes) {
      const section = sections.get(route.path);
      const expected = section && !LEGAL.includes(route.path) ? 1 : 0;
      expect(blockFor(route.meta.title), route.path).toHaveLength(expected);
      if (!expected) continue;
      const [block] = blockFor(route.meta.title);
      expect(block.startsWith(`${route.meta.title}\n\nURL: ${route.meta.canonical}\n\n`), route.path).toBe(true);
      if (section === 'guides') expect(block.trim().endsWith(route.meta.description!), route.path).toBe(true);
      // Every other page carries its own text, opening on its H1.
      else expect(block, route.path).toMatch(/^### \S.*\n\n\S/m);
    }
    // Page headings sit below the "## " of their block, so a block boundary is never a page's own heading.
    expect(blocks).toHaveLength(1 + [...sections].filter(([key]) => !LEGAL.includes(key)).length + divisionPages.length);
    expect(full).not.toMatch(/<\/?[a-z][^>\n]*>/i);
    expect(full).not.toMatch(/&(?:amp|lt|gt|quot|nbsp|#x?[0-9a-f]+);/i);
    for (const file of [text, full]) expect(file).not.toMatch(/undefined|\[object|\bNaN\b/);
  });

  it('state the published rates', () => {
    for (const rate of Object.values(PUBLISHED_RATES)) {
      for (const file of [text, full]) expect(file).toContain(`  - ${rate.unitName}: ${usd(rate.dollars)} per ${rate.per}\n`);
    }
    expect(text).toContain(`[published price list](${SITE_URL}/pricing)`);
  });

  it('make no promise the site may not make', () => {
    expectNoPromise(text);
    expectNoPromise(full);
  });
});
