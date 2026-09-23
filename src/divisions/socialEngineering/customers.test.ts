// The Customers page lists four businesses and says what each one IS. It must
// never claim work the division did for them (services, results, ratings,
// quotes), and it must not compete with their own sites in search.

import { describe, expect, it } from 'vitest';
import { customersContent, divisionCustomers } from './content';
import { customersPageSeo, divisionJsonLdDocument } from './seo';
import { DIVISION_ORGANIZATION_ID, PARENT_NAME, PARENT_ORGANIZATION_ID, SITE_URL } from './site';

const strings = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : [];

describe('customer list', () => {
  it('lists exactly the four customers, in the owner’s order, with their links', () => {
    expect(divisionCustomers.map(({ name, href, linkLabel }) => ({ name, href, linkLabel }))).toEqual([
      { name: 'Wildly Primal', href: 'https://www.wildlyprimal.com/', linkLabel: 'wildlyprimal.com' },
      // The parent company: an internal link to its home page.
      { name: 'New Wave IT', href: '/', linkLabel: 'newwaveitfl.com' },
      { name: 'Uncommon Path Brewing', href: 'https://www.uncommonpathbrewing.com/', linkLabel: 'uncommonpathbrewing.com' },
      // The verified site's canonical domain (the owner typed luckyshotgolf.com, which was never verified).
      { name: 'Lucky Shot Golf', href: 'https://www.playluckyshot.com/', linkLabel: 'playluckyshot.com' },
    ]);
  });

  it('labels each external link with its bare domain', () => {
    divisionCustomers
      .filter((customer) => customer.href.startsWith('https://'))
      .forEach((customer) => expect(new URL(customer.href).hostname.replace(/^www\./, '')).toBe(customer.linkLabel));
  });

  it('fills every field', () => {
    divisionCustomers.forEach((customer) => {
      Object.entries(customer).forEach(([key, value]) => expect(value.trim(), `${customer.name}.${key}`).not.toBe(''));
    });
  });

  // Claims about work done, results, or ratings, in any customer entry.
  const WORK_CLAIMS =
    /\b(we|our team) (built|launched|designed|grew|increased|manage[ds]?|run|created|delivered|helped)\b|%|\bstars?\b|review|rating|testimonial|case stud|portfolio|our work|success stor|results?\b|clients? include|trusted|partnered|powered by|proud to|chose us/i;
  // Superlatives (theirs or ours) and medical or healing claims.
  const SUPERLATIVES_AND_HEALTH_CLAIMS =
    /\b(best|leading|premium|top|award\w*|favou?rite|heal(s|ed|er|ing)?|cure[sd]?|root cause|treat\w*|revers\w*|fix\w*|restor\w*)\b/i;

  it.each(divisionCustomers.map((customer) => [customer.name, customer] as const))(
    '%s says what the business is, never what was done for it',
    (_name, customer) => {
      strings(customer).forEach((text) => {
        expect(text, text).not.toMatch(WORK_CLAIMS);
        expect(text, text).not.toMatch(SUPERLATIVES_AND_HEALTH_CLAIMS);
      });
    },
  );

  it('makes no work claims anywhere else on the page either', () => {
    strings(customersContent).forEach((text) => {
      expect(text, text).not.toMatch(WORK_CLAIMS);
      // "Every engagement…" after the list would imply each customer had one.
      expect(text, text).not.toMatch(/engagement/i);
    });
  });
});

describe('customers page search record', () => {
  const page = customersPageSeo();

  it('keeps the customers’ names and category terms out of the title, description, and keywords', () => {
    const record = `${page.title} ${page.description} ${page.keywords}`.toLowerCase();
    divisionCustomers.forEach((customer) => {
      if (customer.name !== 'New Wave IT') expect(record).not.toContain(customer.name.toLowerCase());
    });
    ['brewery', 'pizza', 'golf', 'simulator', 'coaching', 'health', 'managed it', 'web design clients'].forEach((term) => {
      expect(record).not.toContain(term);
    });
  });

  it('describes the page as a CollectionPage whose main entity is a plain list of organizations', () => {
    const graph = JSON.parse(divisionJsonLdDocument(page))['@graph'];
    const url = `${SITE_URL}${page.path}`;
    const webPage = graph.find((node: { '@id': string }) => node['@id'] === `${url}#webpage`);
    expect(webPage['@type']).toBe('CollectionPage');
    expect(webPage.mainEntity).toEqual({ '@id': `${url}#customers` });

    const list = graph.find((node: { '@type': string }) => node['@type'] === 'ItemList');
    expect(list['@id']).toBe(`${url}#customers`);
    expect(list.numberOfItems).toBe(divisionCustomers.length);
    // The parent company is the parent node itself (by the @id index.html
    // declares), never a second, anonymous "New Wave IT".
    const parent = { '@type': 'Organization', '@id': PARENT_ORGANIZATION_ID, name: PARENT_NAME, url: SITE_URL };
    expect(list.itemListElement).toEqual(
      divisionCustomers.map((customer, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: customer.href === '/' ? parent : { '@type': 'Organization', name: customer.name, url: customer.href },
      })),
    );
    const division = graph.find((node: { '@id': string }) => node['@id'] === DIVISION_ORGANIZATION_ID);
    expect(division.parentOrganization).toEqual(parent);
    // Every Organization named New Wave IT anywhere in the graph is that one node.
    const organizations = (value: unknown): Record<string, unknown>[] =>
      Array.isArray(value)
        ? value.flatMap(organizations)
        : value && typeof value === 'object'
          ? [
              ...((value as Record<string, unknown>)['@type'] === 'Organization' ? [value as Record<string, unknown>] : []),
              ...Object.values(value).flatMap(organizations),
            ]
          : [];
    const namedParent = organizations(graph).filter((node) => node.name === PARENT_NAME);
    expect(namedParent).toHaveLength(2); // the division's parentOrganization and the customer list item
    namedParent.forEach((node) => expect(node).toEqual(parent));

    // The items above carry name and url only; nothing in the graph reviews,
    // rates, or links out to (sameAs) a customer.
    const json = JSON.stringify(graph);
    expect(json).not.toMatch(/"(review|aggregateRating|ratingValue|sameAs|award)"/);
    expect(json).not.toMatch(/Review|Rating|testimonial/i);
  });
});
