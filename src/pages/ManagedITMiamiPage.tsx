// Placeholder copy from the routing step; the page's author replaces the data object.
import { DollarSign, Monitor } from 'lucide-react';
import { ServiceCategoryPage, type ServiceCategoryPageData } from '../components/brand/ServiceCategoryPage';
import { PUBLISHED_RATES, ratesSentence, usd, type RateKey } from '../lib/publishedRates';
import { IT_PAGE_META } from '../lib/routeMeta';
import { servicePageJsonLd } from '../lib/serviceSchema';
import { usePageMeta } from '../lib/usePageMeta';

// Local landing page for "managed IT services Miami" searches. New Wave IT has
// no office in Miami-Dade County, and the page says so: service comes from the
// Fort Lauderdale office. Every statement about the business is one the owner
// has confirmed or the site already makes (docs/geo/fact-sheet.md), and every
// price comes from publishedRates.ts.
const PATH = '/managed-it-services-miami';

/** "$105 per computer or device": one published rate with its unit. */
const rate = (key: RateKey) => `${usd(PUBLISHED_RATES[key].dollars)} per ${PUBLISHED_RATES[key].per}`;

const page: ServiceCategoryPageData = {
  icon: Monitor,
  name: 'Managed IT Services in Miami',
  heroTitle: 'Managed IT services and IT support in Miami',
  description: 'Managed IT services and IT support for Miami businesses from New Wave IT.',
  heroDescription:
    'New Wave IT provides managed IT services and IT support for businesses in Miami and Miami-Dade County. Service comes from its office in Fort Lauderdale, by remote support and on-site visits.',
  details:
    'New Wave IT provides managed IT services and IT support for businesses in Miami and the rest of Miami-Dade County, including Coral Gables, Doral, Hialeah, Miami Beach and Aventura. ' +
    'It is a managed IT services provider (MSP), founded in 2022, with a team of 5 to 10 people. ' +
    'New Wave IT has no office in Miami-Dade County. Its staffed office is at 710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311, in Broward County, and service reaches Miami from that office by remote support and on-site visits. ' +
    'Managed IT services cover monitoring and maintenance of computers, servers and the network, patch management, endpoint protection, managed backups and a help desk for every user. ' +
    'Office hours are Monday to Friday, 8am to 6pm, and a 24/7 emergency line covers urgent problems outside those hours.',
  highlights: [
    'Managed IT services and IT support',
    'Serves Miami and Miami-Dade County',
    'Staffed office in Fort Lauderdale',
    'Remote support and on-site visits',
    '24/7 emergency line',
    'Published monthly rates, no long-term contract required',
  ],
  seoLink: '/pricing',
  guideLabel: 'See the published rates',
  assessmentLabel: 'Get a free IT assessment',
  sections: [
    {
      title: 'What do managed IT services cost in Miami?',
      body: [
        `New Wave IT prices managed IT services for Miami businesses per unit, per month, from its published price list. ${ratesSentence()} After a free IT assessment, New Wave IT writes a quote built from these rates, and no long-term contract is required. The full price list and a quote builder are on the pricing page.`,
      ],
      // The price block the local pages share.
      cards: [
        { icon: DollarSign, title: `${usd(PUBLISHED_RATES.computer.dollars)} per computer`, description: `Per ${PUBLISHED_RATES.computer.per}, per month.` },
        { icon: DollarSign, title: `${usd(PUBLISHED_RATES.user.dollars)} per user`, description: `Per ${PUBLISHED_RATES.user.per}, per month.` },
        { icon: DollarSign, title: `${usd(PUBLISHED_RATES.server.dollars)} per server`, description: `Per ${PUBLISHED_RATES.server.per}, per month. Network monitoring is ${rate('location')}.` },
      ],
    },
    {
      title: 'How getting started works',
      ordered: true,
      items: [
        'A free IT assessment of your systems, support history and risks.',
        'A written quote built from the published rates.',
        'Onboarding to a plan with clear owners and dates, followed by managed support with regular reviews.',
      ],
    },
  ],
  ctaTitle: 'Need managed IT services in Miami?',
  ctaDescription: 'Start with a free IT assessment and a written quote built from the published rates.',
  ctaLabel: 'Get a free IT assessment',
};

// The Service node: written into the raw HTML at build time and by usePageMeta at runtime.
const jsonLd = servicePageJsonLd({
  path: PATH,
  name: page.name,
  description:
    "Managed IT services and IT support for Miami and Miami-Dade County businesses from New Wave IT's Fort Lauderdale office, at published monthly rates.",
  serviceType: 'Managed IT Services',
  areaServed: [
    { '@type': 'City', name: 'Miami' },
    { '@type': 'AdministrativeArea', name: 'Miami-Dade County' },
  ],
});

export default function ManagedITMiamiPage() {
  usePageMeta({ ...IT_PAGE_META[PATH], jsonLd });

  return <ServiceCategoryPage data={page} breadcrumbs={IT_PAGE_META[PATH].breadcrumbs} />;
}
