// Placeholder copy from the routing step; the page's author replaces the data object.
import { DollarSign, Monitor } from 'lucide-react';
import { ServiceCategoryPage, type ServiceCategoryPageData } from '../components/brand/ServiceCategoryPage';
import { PUBLISHED_RATES, ratesSentence, usd, type RateKey } from '../lib/publishedRates';
import { IT_PAGE_META } from '../lib/routeMeta';
import { servicePageJsonLd } from '../lib/serviceSchema';
import { usePageMeta } from '../lib/usePageMeta';

// Local landing page for "managed IT services West Palm Beach" searches. New
// Wave IT has no office in Palm Beach County, and the page says so: service
// comes from the Fort Lauderdale office. Every statement about the business is
// one the owner has confirmed or the site already makes
// (docs/geo/fact-sheet.md), and every price comes from publishedRates.ts.
const PATH = '/managed-it-services-west-palm-beach';

/** "$105 per computer or device": one published rate with its unit. */
const rate = (key: RateKey) => `${usd(PUBLISHED_RATES[key].dollars)} per ${PUBLISHED_RATES[key].per}`;

const page: ServiceCategoryPageData = {
  icon: Monitor,
  name: 'Managed IT Services in West Palm Beach',
  heroTitle: 'Managed IT services and IT support in West Palm Beach',
  description: 'Managed IT services and IT support for West Palm Beach businesses from New Wave IT.',
  heroDescription:
    'New Wave IT provides managed IT services and IT support for businesses in West Palm Beach and Palm Beach County. Service comes from its office in Fort Lauderdale, by remote support and on-site visits.',
  details:
    'New Wave IT provides managed IT services for businesses in West Palm Beach and across Palm Beach County, including Boca Raton, Delray Beach, Boynton Beach, Palm Beach Gardens and Jupiter. ' +
    'It is a managed IT services provider (MSP) and IT company, founded in 2022, with a team of 5 to 10 people. ' +
    "New Wave IT's staffed office is at 710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311, in Broward County. It has no office in Palm Beach County, which it serves from Fort Lauderdale. " +
    'Monitoring and patching are remote work, the help desk takes requests from every user, and an on-site visit is for a problem that needs hands on the hardware. ' +
    'Office hours are Monday to Friday, 8am to 6pm, and a 24/7 emergency line covers urgent problems outside those hours. ' +
    'Managed IT is priced at a flat monthly amount built from published per-unit rates.',
  highlights: [
    'Managed IT services and IT support',
    'Serves West Palm Beach and Palm Beach County',
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
      title: 'What do managed IT services cost in West Palm Beach?',
      body: [
        `New Wave IT prices managed IT services for West Palm Beach businesses per unit, per month, from its published price list. ${ratesSentence()} After a free IT assessment, New Wave IT writes a quote built from these rates, and no long-term contract is required. The full price list and a quote builder are on the pricing page.`,
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
  ctaTitle: 'Need managed IT services in West Palm Beach?',
  ctaDescription: 'Start with a free IT assessment and a written quote built from the published rates.',
  ctaLabel: 'Get a free IT assessment',
};

// The Service node: written into the raw HTML at build time and by usePageMeta at runtime.
const jsonLd = servicePageJsonLd({
  path: PATH,
  name: page.name,
  description:
    "Managed IT services and IT support for West Palm Beach and Palm Beach County businesses from New Wave IT's Fort Lauderdale office, at published monthly rates.",
  serviceType: 'Managed IT Services',
  areaServed: [
    { '@type': 'City', name: 'West Palm Beach' },
    { '@type': 'AdministrativeArea', name: 'Palm Beach County' },
  ],
});

export default function ManagedITWestPalmBeachPage() {
  usePageMeta({ ...IT_PAGE_META[PATH], jsonLd });

  return <ServiceCategoryPage data={page} breadcrumbs={IT_PAGE_META[PATH].breadcrumbs} />;
}
