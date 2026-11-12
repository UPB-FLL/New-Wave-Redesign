import { Cloud, DollarSign, Headphones, Monitor, Network, Shield, Wrench } from 'lucide-react';
import { ServiceCategoryPage, type FaqItem, type ServiceCategoryPageData } from '../components/brand/ServiceCategoryPage';
import { PUBLISHED_RATES, ratesSentence, usd, type RateKey } from '../lib/publishedRates';
import { IT_PAGE_META } from '../lib/routeMeta';
import { servicePageJsonLd } from '../lib/serviceSchema';
import { usePageMeta } from '../lib/usePageMeta';

// Local landing page for "IT support", "IT services" and "IT company" searches
// in Boca Raton, where those outrank "managed IT services"; managed IT is the
// page's second subject. It covers the south of Palm Beach County (Boca Raton,
// Delray Beach, Boynton Beach) and leaves the rest of the county to
// /managed-it-services-west-palm-beach. New Wave IT has no office in Palm
// Beach County, and the page says so in the overview, the service-area section
// and the FAQ: service comes from the Fort Lauderdale office. Every statement
// about the business is one the owner has confirmed or the site already makes
// (docs/geo/fact-sheet.md), and every price comes from publishedRates.ts.
const PATH = '/it-support-boca-raton';

const OFFICE_ADDRESS = '710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311';
const PHONE = '(561) 564-1846';
const EMAIL = 'support@newwaveitfl.com';

/** "$105 per computer or device": one published rate with its unit. */
const rate = (key: RateKey) => `${usd(PUBLISHED_RATES[key].dollars)} per ${PUBLISHED_RATES[key].per}`;

// Shown on the page and handed to the FAQPage node, so the markup states exactly what a visitor reads.
const faqs: FaqItem[] = [
  {
    question: 'Does New Wave IT have an office in Boca Raton?',
    answer: `No. New Wave IT has no office in Boca Raton or anywhere else in Palm Beach County. Its staffed office is at ${OFFICE_ADDRESS}, in Broward County, the county next to Palm Beach County. Boca Raton businesses are supported from that office by remote support and on-site visits.`,
  },
  {
    question: 'Which parts of Palm Beach County does New Wave IT cover?',
    answer:
      'New Wave IT serves Palm Beach County from its office in Fort Lauderdale. In the south of the county, the places it serves include Boca Raton, Delray Beach and Boynton Beach. West Palm Beach, further north, has its own page on this site. Across the county, service is by remote support and on-site visits.',
  },
  {
    question: 'How much does IT support cost in Boca Raton?',
    answer:
      `IT support for a Boca Raton business is quoted from New Wave IT's published monthly rates. The price list has a rate per device, ${rate('computer')}, and a rate per user, ${rate('user')}, as well as ${rate('server')} and ${rate('location')} for network monitoring. ` +
      'Each figure is the rate for one unit, not a total. The written quote follows a free IT assessment.',
  },
  {
    question: 'Does New Wave IT come on site in Boca Raton?',
    answer:
      'Yes. New Wave IT makes on-site visits to businesses in Boca Raton. Because it has no office in Palm Beach County, each visit is made from its Fort Lauderdale office. A visit is for work that needs hands on the equipment, such as replacing a failed part in a computer or a server. Problems that can be fixed without touching the hardware are handled by remote support.',
  },
  {
    question: 'What is IT support?',
    answer:
      "IT support is the service that keeps a business's computers, accounts and network working and helps its staff when something goes wrong. New Wave IT provides it to Boca Raton businesses through a help desk that handles requests such as password resets, software installation and routine troubleshooting, and escalates network issues, server problems and security incidents to more senior engineers.",
  },
  {
    question: "What are New Wave IT's hours, and what happens after hours?",
    answer: `New Wave IT's office hours are Monday to Friday, 8am to 6pm. Outside those hours, a 24/7 emergency line covers urgent problems. Staff at a Boca Raton business reach the help desk by phone at ${PHONE}, by email at ${EMAIL} or by ticket.`,
  },
  {
    question: 'Is there a long-term contract?',
    answer:
      'No long-term contract is required for IT support or managed IT services from New Wave IT. The price is a flat monthly amount built from the published per-unit rates. A Boca Raton business sees that amount in a written quote, which follows a free IT assessment and comes before onboarding.',
  },
];

const page: ServiceCategoryPageData = {
  icon: Headphones,
  name: 'IT Support in Boca Raton',
  heroTitle: 'IT support and managed IT services in Boca Raton',
  description: 'IT support, IT services and managed IT for Boca Raton businesses from New Wave IT.',
  heroDescription:
    'New Wave IT is an IT company that supports businesses in Boca Raton and the south of Palm Beach County. Its help desk, remote support and on-site visits are run from an office in Fort Lauderdale, at published monthly rates.',
  overviewTitle: 'Who provides IT support in Boca Raton?',
  details:
    'New Wave IT provides IT support for businesses in Boca Raton, a city in the south of Palm Beach County. ' +
    'It is an IT company and managed service provider (MSP), founded in 2022, with a team of 5 to 10 people. ' +
    'New Wave IT has no office in Boca Raton. ' +
    `Its staffed office is at ${OFFICE_ADDRESS}, in Broward County, the county next to Palm Beach County, and Boca Raton is served from that office by remote support and on-site visits. ` +
    'Beyond day-to-day support, New Wave IT provides managed IT services, cybersecurity, cloud solutions including Microsoft 365, network infrastructure, and IT repair and upgrades. ' +
    `IT support is priced from published monthly rates, such as ${rate('computer')}, and no long-term contract is required.`,
  overviewBody: [
    "Support is provided by New Wave IT's certified engineers, and each client has a dedicated account manager. New Wave IT is a Huntress, Microsoft and Cisco partner, and the tools its team runs include Microsoft 365, SentinelOne, Huntress, NinjaOne, ConnectWise and Cloudflare.",
  ],
  highlights: [
    'IT support for Boca Raton, Delray Beach and Boynton Beach',
    'Help desk by phone, email and ticket',
    'Remote support and on-site visits from Fort Lauderdale',
    'Office hours Monday to Friday, 8am to 6pm',
    '24/7 emergency line',
    'Published monthly rates, no long-term contract required',
  ],
  seoLink: '/pricing',
  guideLabel: 'See the published rates',
  assessmentLabel: 'Get a free IT assessment',
  featureTitle: 'What IT services does New Wave IT provide in Boca Raton?',
  featureDescription: 'New Wave IT provides six IT services to businesses in Boca Raton, from day-to-day IT support to network infrastructure.',
  featureCards: [
    { icon: Headphones, title: 'IT support and help desk', description: 'Password resets, software installation and everyday troubleshooting, by remote support or on site.' },
    { icon: Monitor, title: 'Managed IT services', description: 'Monitoring, patching, backup management and user support for a flat monthly amount.' },
    { icon: Shield, title: 'Cybersecurity', description: 'Threat detection and response, endpoint protection and security awareness training for staff.' },
    { icon: Cloud, title: 'Cloud solutions and Microsoft 365', description: 'Cloud migration, Microsoft 365 management and support for hybrid environments.' },
    { icon: Network, title: 'Network infrastructure', description: 'Network design and installation, WiFi, and VPN and remote access.' },
    { icon: Wrench, title: 'IT repair and upgrades', description: 'Hardware diagnostics, component replacement and upgrades for laptops, desktops and servers.' },
  ],
  sections: [
    {
      title: 'What do managed IT services add to IT support?',
      body: [
        'Managed IT services from New Wave IT add ongoing care of the systems themselves to the help desk that IT support provides. ' +
          "Under managed IT, New Wave IT monitors a Boca Raton business's computers, servers and network, applies patches, manages backups and recovery planning, supports the users, and provides strategic planning for IT growth. " +
          'Monitoring and patching are remote work, carried out for a Boca Raton office from Fort Lauderdale. ' +
          'The difference between the two services is who starts the work. With IT support, a member of staff reports a problem and the help desk fixes it. With managed IT services, the provider looks for problems before anyone reports one. ' +
          'New Wave IT provides both to businesses in Boca Raton.',
      ],
    },
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
      title: 'Where New Wave IT works in Palm Beach County',
      body: [
        'New Wave IT serves the south of Palm Beach County, including Boca Raton, Delray Beach and Boynton Beach, from its office in Fort Lauderdale. ' +
          'It has no office in Palm Beach County. ' +
          `The staffed office is at ${OFFICE_ADDRESS}, in Broward County, and is open Monday to Friday from 8am to 6pm. ` +
          `The phone number is ${PHONE}, the email address is ${EMAIL}, and a 24/7 emergency line covers urgent problems outside office hours. ` +
          'West Palm Beach and the rest of Palm Beach County have their own page, and New Wave IT serves Broward and Miami-Dade counties from the same office.',
      ],
    },
    {
      title: 'Industry pages for medical practices and family offices',
      body: [
        'For a Boca Raton medical practice or family office, New Wave IT has an industry page that describes the work in that field. ' +
          'The healthcare page covers support for EHR and EMR systems, telehealth platforms and medical device networking. ' +
          'The family offices page covers secure document management, integration of wealth management and accounting systems, and access controls for family members and advisors. ' +
          'Both pages are linked below.',
      ],
    },
    {
      // The getting-started steps the local pages share.
      title: 'How getting started works',
      ordered: true,
      items: [
        'A free IT assessment of your devices, accounts, and the problems your staff report most.',
        'A written quote built from the published rates, with no long-term contract required.',
        'Onboarding: New Wave IT takes over support and your staff get one number to call.',
      ],
    },
  ],
  faqs,
  faqTitle: 'Questions about IT support in Boca Raton',
  relatedLinks: [
    { label: 'Managed IT services in West Palm Beach', href: '/managed-it-services-west-palm-beach', description: 'The page for West Palm Beach and the rest of Palm Beach County.' },
    { label: 'IT support in Fort Lauderdale', href: '/it-support-fort-lauderdale', description: 'The same help desk, in the city where New Wave IT has its office.' },
    { label: 'South Florida service areas', href: '/managed-it-services-south-florida', description: 'The three counties New Wave IT serves, with the cities named in each.' },
    { label: 'Live IT support', href: '/service-category/live-it-support', description: 'Help desk tiers, ticket tracking and escalation.' },
    { label: 'Managed IT services', href: '/service-category/managed-it-services', description: 'Monitoring, patching, backup and planning as one monthly service.' },
    { label: 'Cybersecurity', href: '/service-category/cybersecurity', description: 'Threat detection and response, endpoint protection and staff training.' },
    { label: 'Cloud solutions and Microsoft 365', href: '/service-category/cloud-solutions', description: 'Cloud migration planning and Microsoft 365 management.' },
    { label: 'Network infrastructure', href: '/service-category/network-infrastructure', description: 'Cabling, WiFi, firewalls, and VPN and remote access for an office.' },
    { label: 'IT repair and upgrades', href: '/service-category/it-repair-upgrades', description: 'Repair, upgrade or replacement of business computers and servers.' },
    { label: 'Pricing', href: '/pricing', description: 'Every published monthly rate in one table, with a quote builder.' },
    { label: 'Healthcare IT', href: '/service-category/healthcare', description: 'EHR support, telehealth and medical device networking.' },
    { label: 'IT for family offices', href: '/service-category/family-offices', description: 'Document security and systems integration for family offices.' },
  ],
  ctaTitle: 'Need IT support in Boca Raton?',
  ctaDescription: "Start with a free IT assessment, or call New Wave IT's office in Fort Lauderdale.",
  ctaLabel: 'Get a free IT assessment',
};

// The Service and FAQPage nodes: written into the raw HTML at build time and by usePageMeta at runtime.
const jsonLd = servicePageJsonLd({
  path: PATH,
  name: page.name,
  description:
    "IT support, help desk and managed IT services for businesses in Boca Raton and the south of Palm Beach County, delivered by remote support and on-site visits from New Wave IT's Fort Lauderdale office at published monthly rates.",
  serviceType: 'IT Support',
  areaServed: [
    { '@type': 'City', name: 'Boca Raton' },
    { '@type': 'City', name: 'Delray Beach' },
    { '@type': 'City', name: 'Boynton Beach' },
    { '@type': 'AdministrativeArea', name: 'Palm Beach County' },
  ],
  faqs,
});

export default function ITSupportBocaRatonPage() {
  usePageMeta({ ...IT_PAGE_META[PATH], jsonLd });

  return <ServiceCategoryPage data={page} breadcrumbs={IT_PAGE_META[PATH].breadcrumbs} />;
}
