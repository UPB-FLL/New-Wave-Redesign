// Per-URL SEO records and schema.org builders for the division. Pure data —
// shared by the runtime meta hook and the build-time prerenderer so the two can
// never disagree about a page's title, canonical, or structured data.

import { contactContent, contactUsContent, customersContent, divisionCustomers, divisionServices, hubContent } from './content';
import {
  DIVISION_ASSETS,
  DIVISION_BASE_PATH,
  DIVISION_CONTACT_PATH,
  DIVISION_CONTACT_US_PATH,
  DIVISION_CUSTOMERS_PATH,
  DIVISION_NAME,
  DIVISION_ORGANIZATION_ID,
  DIVISION_SHORT_NAME,
  DIVISION_TAGLINE,
  PARENT_NAME,
  PARENT_ORGANIZATION_ID,
  PARENT_WEBSITE_ID,
  SITE_URL,
  absoluteUrl,
  divisionServicePath,
} from './site';
import type { PageMetaOptions } from '../../lib/pageMeta';
import type { DivisionCustomer, DivisionFaq, DivisionPageSeo, DivisionServiceContent } from './types';

type JsonLdNode = Record<string, unknown>;

// Breadcrumbs use the guide's running-copy name; the full name leads every page.
const HUB_CRUMB = { name: DIVISION_SHORT_NAME, path: DIVISION_BASE_PATH };

const AREA_SERVED: JsonLdNode[] = [
  { '@type': 'City', name: 'Fort Lauderdale' },
  { '@type': 'City', name: 'Miami' },
  { '@type': 'City', name: 'Boca Raton' },
  { '@type': 'AdministrativeArea', name: 'South Florida' },
];

/** New Wave IT, by the @id index.html declares: every division reference to the parent company. */
function parentOrganizationRef(): JsonLdNode {
  return { '@type': 'Organization', '@id': PARENT_ORGANIZATION_ID, name: PARENT_NAME, url: SITE_URL };
}

export function divisionOrganizationNode(): JsonLdNode {
  return {
    '@type': 'Organization',
    '@id': DIVISION_ORGANIZATION_ID,
    name: DIVISION_NAME,
    alternateName: DIVISION_SHORT_NAME,
    url: absoluteUrl(DIVISION_BASE_PATH),
    logo: absoluteUrl(DIVISION_ASSETS.logoPng),
    image: absoluteUrl(DIVISION_ASSETS.ogImage),
    slogan: DIVISION_TAGLINE,
    description:
      'The social media, brand development, website design, and marketing division of New Wave IT, serving Fort Lauderdale and South Florida.',
    parentOrganization: parentOrganizationRef(),
    areaServed: AREA_SERVED,
    knowsAbout: [
      'Social media management',
      'Brand development',
      'Website design',
      'Digital marketing',
      'Marketing technology integration',
      'Digital presence management',
      'Local SEO',
    ],
  };
}

function webPageNode(path: string, name: string, description: string, type = 'WebPage'): JsonLdNode {
  const url = absoluteUrl(path);
  return {
    '@type': type,
    '@id': `${url}#webpage`,
    url,
    name,
    description,
    inLanguage: 'en-US',
    isPartOf: { '@type': 'WebSite', '@id': PARENT_WEBSITE_ID, name: PARENT_NAME, url: SITE_URL },
    about: { '@id': DIVISION_ORGANIZATION_ID },
    breadcrumb: { '@id': `${url}#breadcrumb` },
    primaryImageOfPage: absoluteUrl(DIVISION_ASSETS.ogImage),
  };
}

function breadcrumbNode(path: string, crumbs: DivisionPageSeo['breadcrumbs']): JsonLdNode {
  const trail = [{ name: PARENT_NAME, path: '/' }, ...crumbs];
  return {
    '@type': 'BreadcrumbList',
    '@id': `${absoluteUrl(path)}#breadcrumb`,
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path === '/' ? '/' : crumb.path),
    })),
  };
}

function faqNode(path: string, faqs: readonly DivisionFaq[]): JsonLdNode {
  return {
    '@type': 'FAQPage',
    '@id': `${absoluteUrl(path)}#faq`,
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}

function serviceNode(path: string, service: DivisionServiceContent): JsonLdNode {
  const url = absoluteUrl(path);
  return {
    '@type': 'Service',
    '@id': `${url}#service`,
    name: service.navLabel,
    serviceType: service.serviceType,
    description: service.summary,
    url,
    provider: { '@id': DIVISION_ORGANIZATION_ID },
    areaServed: AREA_SERVED,
  };
}

export function hubPageSeo(): DivisionPageSeo {
  const path = DIVISION_BASE_PATH;
  const breadcrumbs = [HUB_CRUMB];
  return {
    path,
    title: hubContent.metaTitle,
    description: hubContent.metaDescription,
    keywords: hubContent.keywords,
    // Matches the rendered H1: kicker + brand line (see DivisionHero kickerInHeading).
    h1: `${hubContent.kicker}: ${hubContent.headline}`,
    breadcrumbs,
    jsonLd: [
      divisionOrganizationNode(),
      webPageNode(path, hubContent.metaTitle, hubContent.metaDescription),
      breadcrumbNode(path, breadcrumbs),
      faqNode(path, hubContent.faqs),
    ],
  };
}

export function servicePageSeo(service: DivisionServiceContent): DivisionPageSeo {
  const path = divisionServicePath(service.slug);
  const breadcrumbs = [HUB_CRUMB, { name: service.navLabel, path }];
  return {
    path,
    title: service.metaTitle,
    description: service.metaDescription,
    keywords: service.keywords,
    h1: service.headline,
    breadcrumbs,
    jsonLd: [
      divisionOrganizationNode(),
      webPageNode(path, service.metaTitle, service.metaDescription),
      serviceNode(path, service),
      breadcrumbNode(path, breadcrumbs),
      faqNode(path, service.faqs),
    ],
  };
}

/**
 * The customers as a plain list of organizations: name and URL only. No
 * review, rating, logo, or sameAs, and nothing that describes work done.
 * New Wave IT (linked in-app as '/') is the parent company, so its item is
 * the parent node itself, by the @id index.html declares, not a second
 * organization of the same name.
 */
function customerListNode(path: string, customers: readonly DivisionCustomer[]): JsonLdNode {
  return {
    '@type': 'ItemList',
    '@id': `${absoluteUrl(path)}#customers`,
    numberOfItems: customers.length,
    itemListElement: customers.map((customer, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item:
        customer.href === '/'
          ? parentOrganizationRef()
          : {
              '@type': 'Organization',
              name: customer.name,
              url: customer.href.startsWith('/') ? absoluteUrl(customer.href) : customer.href,
            },
    })),
  };
}

export function customersPageSeo(): DivisionPageSeo {
  const path = DIVISION_CUSTOMERS_PATH;
  const breadcrumbs = [HUB_CRUMB, { name: customersContent.navLabel, path }];
  const page = webPageNode(path, customersContent.metaTitle, customersContent.metaDescription, 'CollectionPage');
  return {
    path,
    title: customersContent.metaTitle,
    description: customersContent.metaDescription,
    keywords: customersContent.keywords,
    h1: customersContent.headline,
    breadcrumbs,
    jsonLd: [
      divisionOrganizationNode(),
      { ...page, mainEntity: { '@id': `${absoluteUrl(path)}#customers` } },
      customerListNode(path, divisionCustomers),
      breadcrumbNode(path, breadcrumbs),
    ],
  };
}

export function contactUsPageSeo(): DivisionPageSeo {
  const path = DIVISION_CONTACT_US_PATH;
  const breadcrumbs = [HUB_CRUMB, { name: contactUsContent.navLabel, path }];
  return {
    path,
    title: contactUsContent.metaTitle,
    description: contactUsContent.metaDescription,
    keywords: contactUsContent.keywords,
    h1: contactUsContent.headline,
    breadcrumbs,
    jsonLd: [
      divisionOrganizationNode(),
      webPageNode(path, contactUsContent.metaTitle, contactUsContent.metaDescription, 'ContactPage'),
      breadcrumbNode(path, breadcrumbs),
    ],
  };
}

/**
 * The discovery-call page, unchanged by the Contact us page beside it: its
 * crumb stays "Contact". Renaming it (e.g. "Discovery call") is the owner's call.
 */
export function contactPageSeo(): DivisionPageSeo {
  const path = DIVISION_CONTACT_PATH;
  const breadcrumbs = [HUB_CRUMB, { name: 'Contact', path }];
  return {
    path,
    title: contactContent.metaTitle,
    description: contactContent.metaDescription,
    keywords: contactContent.keywords,
    h1: contactContent.headline,
    breadcrumbs,
    jsonLd: [
      divisionOrganizationNode(),
      webPageNode(path, contactContent.metaTitle, contactContent.metaDescription, 'ContactPage'),
      breadcrumbNode(path, breadcrumbs),
    ],
  };
}

/** Every indexable division URL, in sitemap order (the header's order: overview, services, customers, contact us, discovery call). */
export function allDivisionPages(): DivisionPageSeo[] {
  return [hubPageSeo(), ...divisionServices.map(servicePageSeo), customersPageSeo(), contactUsPageSeo(), contactPageSeo()];
}

/** Serialises a page's nodes into one JSON-LD document. */
export function divisionJsonLdDocument(page: DivisionPageSeo): string {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': page.jsonLd });
}

/** usePageMeta options for a division page — shared by the runtime hook and the prerender. */
export function divisionPageMetaOptions(page: DivisionPageSeo): Omit<PageMetaOptions, 'jsonLd'> {
  return {
    title: page.title,
    description: page.description,
    includeSiteName: false,
    canonical: absoluteUrl(page.path),
    ogImage: absoluteUrl(DIVISION_ASSETS.ogImage),
    keywords: page.keywords,
    siteName: DIVISION_NAME,
  };
}
