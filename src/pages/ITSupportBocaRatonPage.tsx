// Placeholder copy from the routing step; the page's author replaces the data object.
import { DollarSign, Headphones } from 'lucide-react';
import { ServiceCategoryPage, type ServiceCategoryPageData } from '../components/brand/ServiceCategoryPage';
import { PUBLISHED_RATES, ratesSentence, usd, type RateKey } from '../lib/publishedRates';
import { IT_PAGE_META } from '../lib/routeMeta';
import { servicePageJsonLd } from '../lib/serviceSchema';
import { usePageMeta } from '../lib/usePageMeta';

// Local landing page for "IT support Boca Raton" searches. New Wave IT has no
// office in Palm Beach County, and the page says so: service comes from the
// Fort Lauderdale office. Every statement about the business is one the owner
// has confirmed or the site already makes (docs/geo/fact-sheet.md), and every
// price comes from publishedRates.ts.
const PATH = '/it-support-boca-raton';

/** "$105 per computer or device": one published rate with its unit. */
const rate = (key: RateKey) => `${usd(PUBLISHED_RATES[key].dollars)} per ${PUBLISHED_RATES[key].per}`;

const page: ServiceCategoryPageData = {
  icon: Headphones,
  name: 'IT Support in Boca Raton',
  heroTitle: 'IT support and managed IT services in Boca Raton',
  description: 'IT support and managed IT services for Boca Raton businesses from New Wave IT.',
  heroDescription:
    'New Wave IT is an IT company that supports businesses in Boca Raton and south Palm Beach County. Service comes from its office in Fort Lauderdale, by remote support and on-site visits.',
  details:
    'New Wave IT provides IT support for businesses in Boca Raton, a city in Palm Beach County. ' +
    'It is an IT company and managed service provider, founded in 2022, with a team of 5 to 10 people. ' +
    'New Wave IT has no office in Boca Raton. Its staffed office is at 710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311, in Broward County, and Palm Beach County is served from that office. ' +
    'Staff at a client business reach the help desk by phone, by email or by opening a ticket. ' +
    'Problems that can be fixed remotely are handled by remote support, and a technician visits when the hardware itself needs attention. ' +
    'Office hours are Monday to Friday, 8am to 6pm, and a 24/7 emergency line covers urgent problems outside those hours. ' +
    'New Wave IT also provides managed IT services, which add monitoring, patching and backup to the help desk.',
  highlights: [
    'Help desk by phone, email and ticket',
    'Remote support and on-site visits',
    'Serves Boca Raton and Palm Beach County',
    'Staffed office in Fort Lauderdale',
    '24/7 emergency line',
    'Published monthly rates, no long-term contract required',
  ],
  seoLink: '/pricing',
  guideLabel: 'See the published rates',
  assessmentLabel: 'Get a free IT assessment',
  sections: [
    {
      title: 'How much does IT support cost in Boca Raton?',
      body: [
        `New Wave IT prices IT support for Boca Raton businesses per unit, per month, from its published price list. ${ratesSentence()} After a free IT assessment, New Wave IT writes a quote built from these rates, and no long-term contract is required. The full price list and a quote builder are on the pricing page.`,
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
        'A free IT assessment of your devices, accounts, and the problems your staff report most.',
        'A written quote built from the published rates, with no long-term contract required.',
        'Onboarding: New Wave IT takes over support and your staff get one number to call.',
      ],
    },
  ],
  ctaTitle: 'Need IT support in Boca Raton?',
  ctaDescription: "Start with a free IT assessment, or call New Wave IT's office in Fort Lauderdale.",
  ctaLabel: 'Get a free IT assessment',
};

// The Service node: written into the raw HTML at build time and by usePageMeta at runtime.
const jsonLd = servicePageJsonLd({
  path: PATH,
  name: page.name,
  description:
    "Help desk, remote support and on-site visits for businesses in Boca Raton and Palm Beach County from New Wave IT's Fort Lauderdale office, at published monthly rates.",
  serviceType: 'IT Support',
  areaServed: [
    { '@type': 'City', name: 'Boca Raton' },
    { '@type': 'AdministrativeArea', name: 'Palm Beach County' },
  ],
});

export default function ITSupportBocaRatonPage() {
  usePageMeta({ ...IT_PAGE_META[PATH], jsonLd });

  return <ServiceCategoryPage data={page} breadcrumbs={IT_PAGE_META[PATH].breadcrumbs} />;
}
