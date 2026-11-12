// Placeholder copy from the routing step; the page's author replaces the data object.
import { DollarSign, MapPin } from 'lucide-react';
import { ServiceCategoryPage, type ServiceCategoryPageData } from '../components/brand/ServiceCategoryPage';
import { PUBLISHED_RATES, ratesSentence, usd, type RateKey } from '../lib/publishedRates';
import { IT_PAGE_META } from '../lib/routeMeta';
import { servicePageJsonLd } from '../lib/serviceSchema';
import { usePageMeta } from '../lib/usePageMeta';

// The service-area hub: the three South Florida counties New Wave IT serves
// from its office in Fort Lauderdale. Every statement about the business is
// one the owner has confirmed or the site already makes
// (docs/geo/fact-sheet.md), and every price comes from publishedRates.ts.
const PATH = '/managed-it-services-south-florida';

/** "$105 per computer or device": one published rate with its unit. */
const rate = (key: RateKey) => `${usd(PUBLISHED_RATES[key].dollars)} per ${PUBLISHED_RATES[key].per}`;

const page: ServiceCategoryPageData = {
  icon: MapPin,
  name: 'Managed IT Services in South Florida',
  heroTitle: 'Managed IT services and IT support in South Florida',
  description: 'Managed IT services and IT support across Broward, Miami-Dade and Palm Beach counties from New Wave IT.',
  heroDescription:
    'New Wave IT serves businesses in Broward, Miami-Dade and Palm Beach counties from its office in Fort Lauderdale, by remote support and on-site visits.',
  details:
    'New Wave IT is a managed IT services provider (MSP) that serves South Florida businesses in three counties: Broward, Miami-Dade and Palm Beach. ' +
    'Its staffed office is at 710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311, in Broward County. ' +
    'New Wave IT has no office in Miami-Dade or Palm Beach County; both are served from Fort Lauderdale by remote support and on-site visits. ' +
    'Cities served include Fort Lauderdale, Hollywood and Pompano Beach in Broward County, Miami, Coral Gables and Doral in Miami-Dade County, and Boca Raton, Delray Beach and West Palm Beach in Palm Beach County. ' +
    'New Wave IT was founded in 2022 and is a team of 5 to 10 people. ' +
    'Its services are managed IT services, live IT support, IT repair and upgrades, cybersecurity, cloud solutions including Microsoft 365, and network infrastructure. ' +
    'Office hours are Monday to Friday, 8am to 6pm, and a 24/7 emergency line covers urgent problems outside those hours.',
  highlights: [
    'Broward, Miami-Dade and Palm Beach counties',
    'Staffed office in Fort Lauderdale',
    'Remote support and on-site visits',
    'Office hours Monday to Friday, 8am to 6pm',
    '24/7 emergency line',
    'Published monthly rates, no long-term contract required',
  ],
  seoLink: '/pricing',
  guideLabel: 'See the published rates',
  assessmentLabel: 'Get a free IT assessment',
  sections: [
    {
      title: 'What do managed IT services cost in South Florida?',
      body: [
        `New Wave IT prices managed IT services and IT support per unit, per month, from its published price list. ${ratesSentence()} After a free IT assessment, New Wave IT writes a quote built from these rates, and no long-term contract is required. The full price list and a quote builder are on the pricing page.`,
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
  ctaTitle: 'Need managed IT services in South Florida?',
  ctaDescription: 'Start with a free IT assessment and a written quote built from the published rates.',
  ctaLabel: 'Get a free IT assessment',
};

// The Service node: written into the raw HTML at build time and by usePageMeta at runtime.
const jsonLd = servicePageJsonLd({
  path: PATH,
  name: page.name,
  description:
    "Managed IT services and IT support for businesses in Broward, Miami-Dade and Palm Beach counties from New Wave IT's Fort Lauderdale office, at published monthly rates.",
  serviceType: 'Managed IT Services',
  areaServed: [
    { '@type': 'AdministrativeArea', name: 'Broward County' },
    { '@type': 'AdministrativeArea', name: 'Miami-Dade County' },
    { '@type': 'AdministrativeArea', name: 'Palm Beach County' },
  ],
});

export default function SouthFloridaServiceAreasPage() {
  usePageMeta({ ...IT_PAGE_META[PATH], jsonLd });

  return <ServiceCategoryPage data={page} breadcrumbs={IT_PAGE_META[PATH].breadcrumbs} />;
}
