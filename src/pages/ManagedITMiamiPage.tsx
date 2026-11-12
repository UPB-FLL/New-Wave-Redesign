import { BarChart3, DollarSign, HardDrive, Headphones, Monitor, RefreshCw, ShieldCheck } from 'lucide-react';
import { ServiceCategoryPage, type FaqItem, type ServiceCategoryPageData } from '../components/brand/ServiceCategoryPage';
import { PUBLISHED_RATES, ratesSentence, usd, type RateKey } from '../lib/publishedRates';
import { IT_PAGE_META } from '../lib/routeMeta';
import { servicePageJsonLd } from '../lib/serviceSchema';
import { usePageMeta } from '../lib/usePageMeta';

// Local landing page for "managed IT services Miami" searches, and for the
// IT support, IT services and IT company searches behind them: Miami has one
// page, so it covers both the managed plan and the help desk. New Wave IT has
// no office in Miami-Dade County, and the page says so in the overview, in
// its own section and in the first question: service comes from the Fort
// Lauderdale office. Every statement about the business is one the owner has
// confirmed or the site already makes (docs/geo/fact-sheet.md), and every
// price comes from publishedRates.ts.
const PATH = '/managed-it-services-miami';

const OFFICE_ADDRESS = '710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311';
const PHONE = '(561) 564-1846';
const EMAIL = 'support@newwaveitfl.com';

/** "$105 per computer or device": one published rate with its unit. */
const rate = (key: RateKey) => `${usd(PUBLISHED_RATES[key].dollars)} per ${PUBLISHED_RATES[key].per}`;

// The questions the page shows. The FAQPage node below is built from this
// same list, so the markup states exactly what a visitor reads.
const faqs: FaqItem[] = [
  {
    question: 'Does New Wave IT have an office in Miami?',
    answer: `No. New Wave IT has no office in Miami or elsewhere in Miami-Dade County. Its office is at ${OFFICE_ADDRESS}, in Broward County, the county next to Miami-Dade. Businesses in Miami are served from that office by remote support and on-site visits.`,
  },
  {
    question: 'Which parts of Miami-Dade County does New Wave IT cover?',
    answer:
      "New Wave IT's service area includes Miami-Dade County, along with Broward and Palm Beach counties. Cities it serves in Miami-Dade County include Miami, Coral Gables, Doral, Hialeah, Miami Beach and Aventura. All of them are served from the office in Fort Lauderdale.",
  },
  {
    question: 'Does New Wave IT come on site in Miami?',
    answer:
      'Yes. New Wave IT makes on-site visits to businesses in Miami and elsewhere in Miami-Dade County, and the visits are made from its Fort Lauderdale office. A visit is for work that has to be done on the hardware itself. Problems that can be fixed remotely are handled by remote support.',
  },
  {
    question: 'How much do managed IT services cost in Miami?',
    answer:
      `New Wave IT's published monthly rates for managed IT services in Miami are ${rate('computer')}, ${rate('user')}, ${rate('server')} and ${rate('location')} for network monitoring. ` +
      'The list has both a per-device rate and a per-user rate. Each figure is the rate for one unit, not a total: a written quote is built from the rates after a free IT assessment.',
  },
  {
    question: 'What is a managed service provider?',
    answer:
      "A managed service provider (MSP) is an outside company that looks after a business's IT month after month for a set fee, rather than being called only when something breaks. It monitors the computers, servers and network, keeps them patched and backed up, and supports the staff. Paying per repair instead is known as break-fix. New Wave IT is a managed service provider that serves Miami from its office in Fort Lauderdale.",
  },
  {
    question: 'Is there a long-term contract?',
    answer:
      'No long-term contract is required for managed IT services or IT support from New Wave IT. Pricing is flat and monthly, built from the published per-unit rates. A Miami business that wants the terms in detail can ask during the free IT assessment, before it accepts a quote.',
  },
  {
    question: 'How does a Miami business reach New Wave IT, and what are its hours?',
    answer: `A Miami business reaches New Wave IT by phone at ${PHONE}, by email at ${EMAIL} or by opening a ticket. Office hours are Monday to Friday, 8am to 6pm. Outside those hours, a 24/7 emergency line covers urgent problems.`,
  },
  {
    question: 'Does New Wave IT manage Microsoft 365 for Miami businesses?',
    answer:
      "Yes. Microsoft 365 management is part of New Wave IT's cloud solutions service, which it provides in Miami-Dade County. New Wave IT is a Microsoft partner, and Microsoft 365 is one of the tools its team runs. " +
      `The published price list has two Office 365 lines: ${rate('microsoft365License')} per month for licensing only and ${rate('microsoft365LicenseWithEmail')} per month for licensing and email.`,
  },
];

const page: ServiceCategoryPageData = {
  icon: Monitor,
  name: 'Managed IT Services in Miami',
  heroTitle: 'Managed IT services and IT support in Miami',
  description: 'Managed IT services and IT support for Miami businesses from New Wave IT.',
  heroDescription:
    'New Wave IT provides managed IT services and IT support to businesses in Miami and Miami-Dade County. Service comes from its office in Fort Lauderdale, by remote support and on-site visits, at published monthly rates.',
  overviewTitle: 'Who provides managed IT services in Miami?',
  details:
    'New Wave IT provides managed IT services and IT support to businesses in Miami and the rest of Miami-Dade County. ' +
    'It is an IT company and managed IT services provider (MSP), founded in 2022, with a team of 5 to 10 people. ' +
    'New Wave IT does not have an office in Miami. ' +
    `Its staffed office is at ${OFFICE_ADDRESS}, in Broward County, the county directly north of Miami-Dade, and service reaches Miami from that office by remote support and on-site visits. ` +
    "Under a managed IT plan, New Wave IT monitors and maintains a company's computers, servers and network, applies patches, manages backups, protects endpoints and runs a help desk for the staff. " +
    `Its monthly rates are published, for example ${rate('computer')}, and no long-term contract is required.`,
  overviewBody: [
    'New Wave IT is a Huntress, Microsoft and Cisco partner. The tools its team runs include Microsoft 365, SentinelOne, Huntress, NinjaOne, ConnectWise and Cloudflare. The work is done by certified engineers, and each client has a dedicated account manager.',
  ],
  highlights: [
    'Managed IT services and IT support',
    'Serves Miami and Miami-Dade County',
    'Office in Fort Lauderdale, none in Miami',
    'Remote support and on-site visits',
    'Published monthly rates, no long-term contract required',
    '24/7 emergency line',
  ],
  // The second header button goes to the price list; the service pages are among the related links.
  seoLink: '/pricing',
  guideLabel: 'See the published rates',
  assessmentLabel: 'Get a free IT assessment',
  featureTitle: 'What do managed IT services in Miami include?',
  featureDescription:
    'Managed IT services from New Wave IT cover six areas of work for a business in Miami. Monitoring and patching are done remotely, and every user has the help desk.',
  featureCards: [
    { icon: Monitor, title: 'Monitoring and maintenance', description: 'New Wave IT watches computers, servers and the network remotely and carries out routine maintenance.' },
    { icon: RefreshCw, title: 'Patching', description: 'Operating system and software updates are applied remotely by New Wave IT, not left to each employee.' },
    { icon: ShieldCheck, title: 'Endpoint protection', description: 'Endpoint protection, software that guards a device against malicious programs, runs on each managed computer and server.' },
    { icon: HardDrive, title: 'Backups and recovery', description: 'Backups are managed by New Wave IT, and a recovery plan sets out how data and systems are brought back.' },
    { icon: Headphones, title: 'Help desk', description: 'One place for every employee to take a password, printer or laptop problem.' },
    { icon: BarChart3, title: 'Reporting and planning', description: 'Reports show support activity, trends and investment needs, and quarterly business reviews turn them into a roadmap.' },
  ],
  sections: [
    {
      title: 'How does New Wave IT serve Miami from Fort Lauderdale?',
      body: [
        'New Wave IT serves Miami from its Fort Lauderdale office by remote support and on-site visits, and it has no office in Miami-Dade County. ' +
          `The office is at ${OFFICE_ADDRESS}. Fort Lauderdale is in Broward County, which borders Miami-Dade County to the north. ` +
          'It is a staffed office, open Monday to Friday, 8am to 6pm, and a 24/7 emergency line covers urgent problems outside those hours. ' +
          `The phone number is ${PHONE} and the email address is ${EMAIL}. ` +
          'Cities served in Miami-Dade County include Miami, Coral Gables, Doral, Hialeah, Miami Beach and Aventura.',
        'Most of the work in a New Wave IT managed plan is done remotely, which is how it reaches a business in Miami. ' +
          'Monitoring and patching run over the internet, whichever county the computers are in. ' +
          'The help desk fixes what it can through remote support, with the employee still at the desk. ' +
          'A visit is needed only when the hardware itself has to be handled: a laptop, desktop or server that must be repaired or replaced. ' +
          'On-site visits to Miami-Dade County are made from the Fort Lauderdale office.',
      ],
    },
    {
      title: 'What do managed IT services cost in Miami?',
      body: [
        `New Wave IT prices managed IT services and IT support for Miami businesses per unit, per month, from its published price list. ${ratesSentence()} After a free IT assessment, New Wave IT writes a quote built from these rates. The full price list and a quote builder are on the pricing page.`,
      ],
      // The price block the local pages share: three cards under the sentence that states every rate.
      cards: [
        { icon: DollarSign, title: `${usd(PUBLISHED_RATES.computer.dollars)} per computer`, description: `Per ${PUBLISHED_RATES.computer.per}, per month.` },
        { icon: DollarSign, title: `${usd(PUBLISHED_RATES.user.dollars)} per user`, description: `Per ${PUBLISHED_RATES.user.per}, per month.` },
        { icon: DollarSign, title: `${usd(PUBLISHED_RATES.server.dollars)} per server`, description: `Per ${PUBLISHED_RATES.server.per}, per month. Network monitoring is ${rate('location')}.` },
      ],
    },
    {
      title: 'What does IT support cover for a Miami business?',
      body: [
        'IT support from New Wave IT covers the day-to-day problems of the people in a Miami business: a forgotten password, an email or Microsoft 365 fault, a printer, a laptop that will not start. ' +
          'Staff contact the help desk by phone, by email or by opening a ticket, and each request is tracked as a ticket until it is resolved. ' +
          'The help desk is included in a managed IT plan. ' +
          "New Wave IT's other IT services are IT repair and upgrades, cybersecurity, cloud solutions including Microsoft 365, and network infrastructure. Each has its own page, linked below.",
      ],
    },
    {
      title: 'IT for healthcare, family offices and luxury properties',
      body: [
        "A healthcare practice, a family office or a luxury property in Miami-Dade County can read New Wave IT's page for its field. " +
          'The healthcare page covers EHR and EMR system integration, telehealth platform support and medical device networking for medical practices. ' +
          'The family offices page covers secure document and asset management and wealth management system integration. ' +
          'The luxury page covers smart home and building automation and guest WiFi for residential properties, resorts and hospitality venues. All three are linked below.',
      ],
    },
    {
      title: 'How does a Miami business get started?',
      body: ['A Miami business moves its IT to New Wave IT in three steps.'],
      ordered: true,
      items: [
        'A free IT assessment of your systems, support history and risks.',
        'A written quote built from the published rates.',
        'Onboarding to a plan with clear owners and dates, followed by managed support with regular reviews.',
      ],
    },
  ],
  faqs,
  faqTitle: 'Questions about managed IT services in Miami',
  relatedLinks: [
    { label: 'Managed IT services', href: '/service-category/managed-it-services', description: 'The managed plan in full, with the transition process and strategic planning.' },
    { label: 'Live IT support', href: '/service-category/live-it-support', description: 'The three support tiers and how a ticket is escalated.' },
    { label: 'Cybersecurity', href: '/service-category/cybersecurity', description: 'Threat detection and response, vulnerability assessment and security awareness training.' },
    { label: 'Cloud solutions and Microsoft 365', href: '/service-category/cloud-solutions', description: 'Microsoft 365, cloud migration planning and hybrid environments.' },
    { label: 'Network infrastructure', href: '/service-category/network-infrastructure', description: 'Network design, WiFi, firewalls, and VPN and remote access.' },
    { label: 'IT repair and upgrades', href: '/service-category/it-repair-upgrades', description: 'Diagnostics, repair and upgrades for business hardware.' },
    { label: 'Pricing', href: '/pricing', description: 'Every published monthly rate, with a quote builder.' },
    { label: 'South Florida service areas', href: '/managed-it-services-south-florida', description: 'Miami-Dade, Broward and Palm Beach counties and the cities served in each.' },
    { label: 'Managed IT services in Fort Lauderdale', href: '/managed-it-services-fort-lauderdale', description: 'The same service in Broward County, where the office is.' },
    { label: 'IT support in Fort Lauderdale', href: '/it-support-fort-lauderdale', description: 'How the help desk handles a request, in more detail.' },
    { label: 'Managed IT services in West Palm Beach', href: '/managed-it-services-west-palm-beach', description: 'Palm Beach County, also served from Fort Lauderdale.' },
    { label: 'Healthcare IT', href: '/service-category/healthcare', description: 'IT for medical practices, including EHR integration and telehealth support.' },
    { label: 'IT for family offices', href: '/service-category/family-offices', description: 'Privacy-first IT for offices that manage family wealth.' },
    { label: 'Technology for luxury properties', href: '/service-category/luxury', description: 'Automation and guest networking for residences, resorts and hospitality venues.' },
  ],
  ctaTitle: 'Need managed IT services or IT support in Miami?',
  ctaDescription: 'Ask for a free IT assessment of your Miami-Dade business and a written quote built from the published rates.',
  ctaLabel: 'Get a free IT assessment',
};

// Built once: the Service for this page and the FAQPage for the questions above.
const jsonLd = servicePageJsonLd({
  path: PATH,
  name: page.name,
  description:
    "Managed IT services and IT support for Miami and Miami-Dade County businesses from New Wave IT's Fort Lauderdale office: monitoring, patching, backup, endpoint protection and a help desk at published monthly rates.",
  serviceType: 'Managed IT Services',
  areaServed: [
    { '@type': 'City', name: 'Miami' },
    { '@type': 'AdministrativeArea', name: 'Miami-Dade County' },
  ],
  faqs,
});

export default function ManagedITMiamiPage() {
  usePageMeta({ ...IT_PAGE_META[PATH], jsonLd });

  return <ServiceCategoryPage data={page} breadcrumbs={IT_PAGE_META[PATH].breadcrumbs} />;
}
