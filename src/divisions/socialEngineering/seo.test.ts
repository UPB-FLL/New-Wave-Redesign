import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { contactContent, divisionServices, hubContent } from './content';
import { allDivisionPages, divisionJsonLdDocument } from './seo';
import {
  DIVISION_BASE_PATH,
  DIVISION_NAME,
  DIVISION_SERVICE_SLUGS,
  PARENT_ORGANIZATION_ID,
  SITE_URL,
} from './site';

const pages = allDivisionPages();

/** Every string in the division's customer-facing copy. */
function copyStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(copyStrings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(copyStrings);
  return [];
}
const allCopy = copyStrings([hubContent, divisionServices, contactContent]);

describe('division routes', () => {
  it('registers exactly the services that have content, in display order', () => {
    expect(divisionServices.map((service) => service.slug)).toEqual([...DIVISION_SERVICE_SLUGS]);
  });

  it('keeps every URL under the division folder, unique, without trailing slashes', () => {
    const paths = pages.map((page) => page.path);
    expect(new Set(paths).size).toBe(paths.length);
    paths.forEach((p) => {
      expect(p === DIVISION_BASE_PATH || p.startsWith(`${DIVISION_BASE_PATH}/`)).toBe(true);
      expect(p.endsWith('/')).toBe(false);
    });
  });
});

describe('division metadata', () => {
  it('gives every page a unique, branded title, description, and H1', () => {
    for (const key of ['title', 'description', 'h1'] as const) {
      const values = pages.map((page) => page[key]);
      expect(new Set(values).size, `duplicate ${key}`).toBe(values.length);
    }
    pages.forEach((page) => {
      expect(page.title.endsWith(`| ${DIVISION_NAME}`), page.title).toBe(true);
    });
  });

  it('keeps titles and descriptions within search-snippet lengths', () => {
    pages.forEach((page) => {
      expect(page.title.length, page.title).toBeLessThanOrEqual(66);
      expect(page.description.length, page.description).toBeGreaterThanOrEqual(120);
      expect(page.description.length, page.description).toBeLessThanOrEqual(160);
      expect(page.keywords.length, `${page.path} keywords`).toBeGreaterThan(0);
    });
  });

  it('never cannibalises the parent: no division title reuses an IT page title', () => {
    const shell = readFileSync(path.resolve(__dirname, '../../../index.html'), 'utf8');
    const itTitle = shell.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    pages.forEach((page) => expect(page.title).not.toBe(itTitle));
  });
});

describe('division structured data', () => {
  it('links the division Organization to the parent @id declared in index.html', () => {
    const shell = readFileSync(path.resolve(__dirname, '../../../index.html'), 'utf8');
    expect(shell).toContain(`"@id": "${PARENT_ORGANIZATION_ID}"`);

    pages.forEach((page) => {
      const doc = JSON.parse(divisionJsonLdDocument(page));
      const org = doc['@graph'].find((node: { '@type': string }) => node['@type'] === 'Organization');
      expect(org.name).toBe(DIVISION_NAME);
      expect(org.parentOrganization['@id']).toBe(PARENT_ORGANIZATION_ID);
      // The division never impersonates the parent's LocalBusiness entity.
      expect(JSON.stringify(doc)).not.toContain('LocalBusiness');
    });
  });

  it('points canonical-style ids and breadcrumbs at absolute division URLs', () => {
    pages.forEach((page) => {
      const doc = JSON.parse(divisionJsonLdDocument(page));
      const webPage = doc['@graph'].find((node: { '@id': string }) => node['@id'].endsWith('#webpage'));
      expect(webPage.url).toBe(`${SITE_URL}${page.path}`);
      const crumbs = doc['@graph'].find((node: { '@type': string }) => node['@type'] === 'BreadcrumbList');
      expect(crumbs.itemListElement[0]).toMatchObject({ position: 1, name: 'New Wave IT', item: `${SITE_URL}/` });
      expect(crumbs.itemListElement.at(-1).item).toBe(`${SITE_URL}${page.path}`);
    });
  });

  it('mirrors each page’s visible FAQs in FAQPage markup', () => {
    const faqCount = (p: string) => {
      const doc = JSON.parse(divisionJsonLdDocument(pages.find((page) => page.path === p)!));
      return doc['@graph'].find((node: { '@type': string }) => node['@type'] === 'FAQPage')?.mainEntity.length;
    };
    expect(faqCount(DIVISION_BASE_PATH)).toBe(hubContent.faqs.length);
    divisionServices.forEach((service) => {
      expect(faqCount(`${DIVISION_BASE_PATH}/${service.slug}`)).toBe(service.faqs.length);
    });
  });
});

describe('division copy follows the brand guidelines', () => {
  it('never uses the internal abbreviation or drops the colon from the name', () => {
    allCopy.forEach((text) => {
      expect(text, text).not.toMatch(/\bNWSE\b/i);
      expect(text, text).not.toMatch(/New Wave Social Engineering/);
    });
  });

  it('introduces the division by its full name on first reference in each summary', () => {
    [hubContent.summary, ...divisionServices.map((service) => service.summary)].forEach((summary) => {
      const full = summary.indexOf(DIVISION_NAME);
      const short = summary.indexOf('NW Social Engineering');
      if (short !== -1) expect(full, summary).toBeGreaterThan(-1);
      if (short !== -1) expect(full, summary).toBeLessThan(short);
    });
  });

  it('makes no percentage claims (metric labels only, no invented results)', () => {
    allCopy.forEach((text) => expect(text, text).not.toMatch(/%/));
  });

  it('uses sentence case for headlines', () => {
    [hubContent.headline, ...divisionServices.map((service) => service.headline)].forEach((headline) => {
      const words = headline.split(/\s+/).slice(1);
      const properNouns = /^(New|Wave|IT|Social|Engineering|Fort|Lauderdale|South|Florida|HIPAA|PCI|DSS|SOC|MFA|QR|SMS|USB)\b/;
      words.forEach((word) => {
        if (/^[A-Z]/.test(word) && !properNouns.test(word)) {
          throw new Error(`"${headline}" is not sentence case at "${word}"`);
        }
      });
    });
  });
});
