// Per-URL SEO records and schema.org builders for the division. Pure data —
// shared by the runtime meta hook and the build-time prerenderer so the two can
// never disagree about a page's title, canonical, or structured data.

import { contactContent, divisionServices, hubContent } from './content';
import {
  DIVISION_ASSETS,
  DIVISION_BASE_PATH,
  DIVISION_CONTACT_PATH,
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
import type { DivisionFaq, DivisionPageSeo, DivisionServiceContent } from './types';

type JsonLdNode = Record<string, unknown>;

const HUB_CRUMB = { name: 'Social Engineering', path: DIVISION_BASE_PATH };

const AREA_SERVED: JsonLdNode[] = [
  { '@type': 'City', name: 'Fort Lauderdale' },
  { '@type': 'City', name: 'Miami' },
  { '@type': 'City', name: 'Boca Raton' },
  { '@type': 'AdministrativeArea', name: 'South Florida' },
];

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
      'The human-risk division of New Wave IT: phishing simulation, vishing and pretext testing, physical social engineering assessments, and security awareness training.',
    parentOrganization: {
      '@type': 'Organization',
      '@id': PARENT_ORGANIZATION_ID,
      name: PARENT_NAME,
      url: SITE_URL,
    },
    areaServed: AREA_SERVED,
    knowsAbout: [
      'Social engineering',
      'Phishing simulation',
      'Vishing',
      'Pretexting',
      'Physical security testing',
      'Security awareness training',
      'Human risk management',
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
    h1: hubContent.headline,
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

/** Every indexable division URL, in sitemap order. */
export function allDivisionPages(): DivisionPageSeo[] {
  return [hubPageSeo(), ...divisionServices.map(servicePageSeo), contactPageSeo()];
}

/** Serialises a page's nodes into one JSON-LD document. */
export function divisionJsonLdDocument(page: DivisionPageSeo): string {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': page.jsonLd });
}
