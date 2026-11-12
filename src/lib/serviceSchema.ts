// The JSON-LD a service or local landing page hands to usePageMeta. Pure data,
// no React or DOM, so the build can read a page's nodes as well as the page.

import { SITE_URL } from './pageMeta.js';
import { BUSINESS_ID, faqPageNode, type FaqItem } from './structuredData.js';

/** A place the service is offered: a city, or a county as an AdministrativeArea. */
export type ServiceArea = { '@type': 'City' | 'AdministrativeArea'; name: string };

export type ServicePageSchemaInput = {
  /** Site-relative path of the page, e.g. '/it-support-fort-lauderdale'. */
  path: string;
  name: string;
  description: string;
  serviceType: string;
  areaServed: readonly ServiceArea[];
  /** The questions the page shows: the same list it renders. */
  faqs?: readonly FaqItem[];
};

/**
 * A Service offered by the business the shell declares (#business), and a
 * FAQPage when the page shows questions. The Service keeps the keys the
 * service pages already write by hand, with areaServed as a list.
 */
export function servicePageJsonLd({ path, name, description, serviceType, areaServed, faqs }: ServicePageSchemaInput): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      provider: { '@id': BUSINESS_ID },
      name,
      description,
      areaServed: areaServed.map((area) => ({ '@type': area['@type'], name: area.name })),
      serviceType,
      url: `${SITE_URL}${path}`,
    },
  ];
  if (faqs?.length) nodes.push(faqPageNode(faqs));
  return nodes;
}
