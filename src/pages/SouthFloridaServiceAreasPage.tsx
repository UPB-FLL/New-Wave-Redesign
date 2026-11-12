import { DollarSign, MapPin } from 'lucide-react';
import { ServiceCategoryPage, type FaqItem, type ServiceCategoryPageData } from '../components/brand/ServiceCategoryPage';
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

const OFFICE_ADDRESS = '710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311';

// Shown on the page and handed to the FAQPage node, so the markup states exactly what a visitor reads.
const faqs: FaqItem[] = [
  {
    question: 'Which counties does New Wave IT serve?',
    answer: `New Wave IT serves businesses in three South Florida counties: Broward, Miami-Dade and Palm Beach. All three are served from its office at ${OFFICE_ADDRESS}, by remote support and on-site visits.`,
  },
  {
    question: "Where is New Wave IT's office?",
    answer: `New Wave IT's office is at ${OFFICE_ADDRESS}, in Broward County. It is a staffed office, open Monday to Friday, 8am to 6pm. New Wave IT has no office in Miami-Dade County or Palm Beach County.`,
  },
  {
    question: 'Does New Wave IT make on-site visits outside Broward County?',
    answer:
      'Yes. On-site visits to businesses in Miami-Dade and Palm Beach counties are made from the Fort Lauderdale office. A visit is for work that has to be done on the hardware itself; problems that can be fixed remotely are handled by remote support.',
  },
  {
    question: 'Does New Wave IT price per user or per device?',
    answer: `Both. New Wave IT's published price list has a per-device rate, ${rate('computer')}, and a per-user rate, ${rate('user')}, each per month. It also lists monthly rates of ${rate('server')} and ${rate('location')} for network monitoring. The full price list is on the pricing page.`,
  },
];

const page: ServiceCategoryPageData = {
  icon: MapPin,
  name: 'Managed IT Services in South Florida',
  heroTitle: 'Managed IT services and IT support in South Florida',
  description: 'Managed IT services and IT support across Broward, Miami-Dade and Palm Beach counties from New Wave IT.',
  heroDescription:
    'New Wave IT serves businesses in Broward, Miami-Dade and Palm Beach counties from its office in Fort Lauderdale, by remote support and on-site visits.',
  overviewTitle: 'Which parts of South Florida does New Wave IT serve?',
  details:
    'New Wave IT is a managed IT services provider (MSP) that serves South Florida businesses in three counties: Broward, Miami-Dade and Palm Beach. ' +
    `Its staffed office is at ${OFFICE_ADDRESS}, in Broward County. ` +
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
      title: 'Which cities does New Wave IT serve in Broward County?',
      body: [
        `Broward County is where New Wave IT has its office, at ${OFFICE_ADDRESS}. Cities it serves in the county include Fort Lauderdale, Hollywood, Pompano Beach, Coral Springs, Plantation and Pembroke Pines. Two pages cover Broward County: IT support in Fort Lauderdale, which describes the help desk, remote support and on-site visits, and managed IT services in Fort Lauderdale, which describes monitoring, patching, backup and planning.`,
      ],
    },
    {
      title: 'Which cities does New Wave IT serve in Miami-Dade County?',
      body: [
        'New Wave IT has no office in Miami-Dade County. Businesses there are served from the Fort Lauderdale office by remote support and on-site visits. Cities served include Miami, Coral Gables, Doral, Hialeah, Miami Beach and Aventura. The Miami page covers managed IT services and IT support for the county.',
      ],
    },
    {
      title: 'Which cities does New Wave IT serve in Palm Beach County?',
      body: [
        'New Wave IT has no office in Palm Beach County, which it also serves from Fort Lauderdale by remote support and on-site visits. Two pages cover the county. The Boca Raton page covers IT support in the south of the county, including Delray Beach and Boynton Beach. The West Palm Beach page covers managed IT services for West Palm Beach, Palm Beach Gardens and Jupiter.',
      ],
    },
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
  faqs,
  faqTitle: "Questions about New Wave IT's service area",
  relatedLinks: [
    { label: 'IT support in Fort Lauderdale', href: '/it-support-fort-lauderdale', description: 'The help desk, remote support and on-site visits for Broward County businesses.' },
    { label: 'Managed IT services in Fort Lauderdale', href: '/managed-it-services-fort-lauderdale', description: 'Monitoring, patching, backup and planning for Fort Lauderdale offices.' },
    { label: 'Managed IT services in Miami', href: '/managed-it-services-miami', description: 'Managed IT and IT support for Miami-Dade County, served from Fort Lauderdale.' },
    { label: 'IT support in Boca Raton', href: '/it-support-boca-raton', description: 'IT support for Boca Raton, Delray Beach and Boynton Beach.' },
    { label: 'Managed IT services in West Palm Beach', href: '/managed-it-services-west-palm-beach', description: 'Managed IT for West Palm Beach, Palm Beach Gardens and Jupiter.' },
    { label: 'Managed IT services', href: '/service-category/managed-it-services', description: 'What a managed plan includes and how the transition works.' },
    { label: 'Live IT support', href: '/service-category/live-it-support', description: 'Support tiers, ticket tracking and escalation.' },
    { label: 'Cybersecurity', href: '/service-category/cybersecurity', description: 'Threat detection and response, endpoint protection and security awareness training.' },
    { label: 'Cloud solutions and Microsoft 365', href: '/service-category/cloud-solutions', description: 'Microsoft 365 management, cloud migration and hybrid environments.' },
    { label: 'Network infrastructure', href: '/service-category/network-infrastructure', description: 'Network design, cabling, WiFi, firewalls and remote access.' },
    { label: 'IT repair and upgrades', href: '/service-category/it-repair-upgrades', description: 'Diagnostics, repair and upgrades for laptops, desktops and servers.' },
    { label: 'Pricing', href: '/pricing', description: 'The published monthly rates and a quote builder.' },
  ],
  relatedTitle: 'A page for each area and service',
  ctaTitle: 'Need managed IT services in South Florida?',
  ctaDescription: 'Start with a free IT assessment and a written quote built from the published rates.',
  ctaLabel: 'Get a free IT assessment',
};

// The Service and FAQPage nodes: written into the raw HTML at build time and by usePageMeta at runtime.
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
  faqs,
});

export default function SouthFloridaServiceAreasPage() {
  usePageMeta({ ...IT_PAGE_META[PATH], jsonLd });

  return <ServiceCategoryPage data={page} breadcrumbs={IT_PAGE_META[PATH].breadcrumbs} />;
}
