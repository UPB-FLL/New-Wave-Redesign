import { DollarSign, Monitor } from 'lucide-react';
import { ServiceCategoryPage, type FaqItem, type ServiceCategoryPageData } from '../components/brand/ServiceCategoryPage';
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

const OFFICE_ADDRESS = '710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311';
const PHONE = '(561) 564-1846';
const EMAIL = 'support@newwaveitfl.com';

// Shown on the page and handed to the FAQPage node, so the markup states exactly what a visitor reads.
const faqs: FaqItem[] = [
  {
    question: 'Does New Wave IT have an office in West Palm Beach?',
    answer: `No. New Wave IT has no office in West Palm Beach or elsewhere in Palm Beach County. Its office is at ${OFFICE_ADDRESS}, in Broward County. Businesses in West Palm Beach are served from that office by remote support and on-site visits.`,
  },
  {
    question: 'Which parts of Palm Beach County does New Wave IT cover?',
    answer:
      "New Wave IT's service area includes Palm Beach County, along with Broward and Miami-Dade counties. This page covers West Palm Beach, Palm Beach Gardens and Jupiter. A separate page covers IT support in Boca Raton, Delray Beach and Boynton Beach. All of them are served from the office in Fort Lauderdale.",
  },
  {
    question: 'Is there a long-term contract?',
    answer:
      'No long-term contract is required for managed IT services or IT support from New Wave IT. Pricing is flat and monthly, built from the published per-unit rates. The first step is a free IT assessment, followed by a written quote.',
  },
  {
    question: 'How does a West Palm Beach business reach New Wave IT, and what are its hours?',
    answer: `A West Palm Beach business reaches New Wave IT by phone at ${PHONE}, by email at ${EMAIL} or by opening a ticket. Office hours are Monday to Friday, 8am to 6pm. Outside those hours, New Wave IT has a 24/7 emergency line.`,
  },
];

const page: ServiceCategoryPageData = {
  icon: Monitor,
  name: 'Managed IT Services in West Palm Beach',
  heroTitle: 'Managed IT services and IT support in West Palm Beach',
  description: 'Managed IT services and IT support for West Palm Beach businesses from New Wave IT.',
  heroDescription:
    'New Wave IT provides managed IT services and IT support for businesses in West Palm Beach and Palm Beach County. Service comes from its office in Fort Lauderdale, by remote support and on-site visits.',
  overviewTitle: 'Who provides managed IT services in West Palm Beach?',
  details:
    'New Wave IT provides managed IT services and IT support for businesses in West Palm Beach and elsewhere in Palm Beach County, including Palm Beach Gardens and Jupiter. ' +
    'It is a managed IT services provider (MSP) and IT company, founded in 2022, with a team of 5 to 10 people. ' +
    `New Wave IT's staffed office is at ${OFFICE_ADDRESS}, in Broward County. It has no office in Palm Beach County, which it serves from Fort Lauderdale. ` +
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
  faqs,
  faqTitle: 'Questions about managed IT services in West Palm Beach',
  relatedLinks: [
    { label: 'South Florida service areas', href: '/managed-it-services-south-florida', description: 'Every county and city New Wave IT serves, with a page for each area.' },
    { label: 'IT support in Boca Raton', href: '/it-support-boca-raton', description: 'The south of Palm Beach County: Boca Raton, Delray Beach and Boynton Beach.' },
    { label: 'Managed IT services in Fort Lauderdale', href: '/managed-it-services-fort-lauderdale', description: 'The managed plan described in full, from the county where the office is.' },
    { label: 'Managed IT services', href: '/service-category/managed-it-services', description: 'Monitoring, patching, backups, the help desk and planning.' },
    { label: 'Live IT support', href: '/service-category/live-it-support', description: 'How a support request is handled and escalated.' },
    { label: 'Cybersecurity', href: '/service-category/cybersecurity', description: 'Threat monitoring, endpoint protection and incident response.' },
    { label: 'Cloud solutions and Microsoft 365', href: '/service-category/cloud-solutions', description: 'Microsoft 365 and cloud migration.' },
    { label: 'Pricing', href: '/pricing', description: 'The full published price list.' },
  ],
  ctaTitle: 'Need managed IT services in West Palm Beach?',
  ctaDescription: 'Start with a free IT assessment and a written quote built from the published rates.',
  ctaLabel: 'Get a free IT assessment',
};

// The Service and FAQPage nodes: written into the raw HTML at build time and by usePageMeta at runtime.
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
  faqs,
});

export default function ManagedITWestPalmBeachPage() {
  usePageMeta({ ...IT_PAGE_META[PATH], jsonLd });

  return <ServiceCategoryPage data={page} breadcrumbs={IT_PAGE_META[PATH].breadcrumbs} />;
}
