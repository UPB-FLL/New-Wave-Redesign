import { describe, expect, it } from 'vitest';
import { servicePageJsonLd, type ServiceArea } from './serviceSchema';
import { faqPageNode } from './structuredData';

const areaServed: ServiceArea[] = [
  { '@type': 'City', name: 'Fort Lauderdale' },
  { '@type': 'AdministrativeArea', name: 'Broward County' },
];
const input = {
  path: '/it-support-fort-lauderdale',
  name: 'IT Support in Fort Lauderdale',
  description: 'Help desk, remote, and on-site IT support for Fort Lauderdale businesses with flat per-device pricing.',
  serviceType: 'IT Support',
  areaServed,
};
const faqs = [{ question: 'Is the price list published?', answer: 'Yes. Every monthly rate is on the pricing page.' }];

describe('servicePageJsonLd', () => {
  it('writes the Service the landing pages write by hand, with the areas as a list', () => {
    expect(servicePageJsonLd(input)).toEqual([
      {
        '@context': 'https://schema.org',
        '@type': 'Service',
        provider: { '@id': 'https://www.newwaveitfl.com/#business' },
        name: 'IT Support in Fort Lauderdale',
        description: 'Help desk, remote, and on-site IT support for Fort Lauderdale businesses with flat per-device pricing.',
        areaServed: [
          { '@type': 'City', name: 'Fort Lauderdale' },
          { '@type': 'AdministrativeArea', name: 'Broward County' },
        ],
        serviceType: 'IT Support',
        url: 'https://www.newwaveitfl.com/it-support-fort-lauderdale',
      },
    ]);
  });

  it('keeps the keys of the hand-written node, in its order', () => {
    expect(Object.keys(servicePageJsonLd(input)[0])).toEqual(['@context', '@type', 'provider', 'name', 'description', 'areaServed', 'serviceType', 'url']);
  });

  it('adds the FAQPage for the questions the page shows', () => {
    const nodes = servicePageJsonLd({ ...input, faqs });

    expect(nodes).toHaveLength(2);
    expect(nodes[0]['@type']).toBe('Service');
    expect(nodes[1]).toEqual(faqPageNode(faqs));
  });

  it('adds no FAQPage for a page without questions', () => {
    expect(servicePageJsonLd({ ...input, faqs: [] })).toHaveLength(1);
    expect(servicePageJsonLd({ ...input, faqs: undefined })).toHaveLength(1);
  });

  it('builds the URL from the path and copies the areas', () => {
    const [service] = servicePageJsonLd({ ...input, path: '/service-category/healthcare' });

    expect(service.url).toBe('https://www.newwaveitfl.com/service-category/healthcare');
    expect(service.areaServed).toEqual(areaServed);
    expect(service.areaServed).not.toBe(areaServed);
    expect((service.areaServed as ServiceArea[])[0]).not.toBe(areaServed[0]);
  });

  it('is plain JSON, as usePageMeta serialises it', () => {
    const nodes = servicePageJsonLd({ ...input, faqs });

    expect(JSON.parse(JSON.stringify(nodes))).toEqual(nodes);
  });
});
