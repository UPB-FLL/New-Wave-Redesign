import { BarChart3, DollarSign, HardDrive, Headphones, Monitor, RefreshCw, ShieldCheck } from 'lucide-react';
import { ServiceCategoryPage, type FaqItem, type ServiceCategoryPageData } from '../components/brand/ServiceCategoryPage';
import { PUBLISHED_RATES, ratesSentence, usd, type RateKey } from '../lib/publishedRates';
import { IT_PAGE_META } from '../lib/routeMeta';
import { servicePageJsonLd } from '../lib/serviceSchema';
import { usePageMeta } from '../lib/usePageMeta';

// Local landing page for "managed IT services Fort Lauderdale" and "managed
// service provider" searches. It is the page that defines a managed service
// provider and explains flat monthly pricing; the help desk and day-to-day
// support belong to /it-support-fort-lauderdale, which this page links to.
// Every statement about the business is a row of docs/geo/fact-sheet.md, and
// every price comes from publishedRates.ts.
const PATH = '/managed-it-services-fort-lauderdale';

const OFFICE_ADDRESS = '710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311';
const PHONE = '(561) 564-1846';
const EMAIL = 'support@newwaveitfl.com';

/** "$105 per computer or device": one published rate with its unit. */
const rate = (key: RateKey) => `${usd(PUBLISHED_RATES[key].dollars)} per ${PUBLISHED_RATES[key].per}`;

// The questions the page shows. The FAQPage node below is built from this
// same list, so the markup states exactly what a visitor reads.
const faqs: FaqItem[] = [
  {
    question: 'How much do managed IT services cost in Fort Lauderdale?',
    answer:
      `New Wave IT's published rates for managed IT services in Fort Lauderdale are ${rate('computer')}, ${rate('user')}, ${rate('server')} and ${rate('location')} for network monitoring, each per month. ` +
      'A written quote is built from these rates after a free IT assessment, so the monthly amount depends on how many of each a business has.',
  },
  {
    question: 'What is included in managed IT services in Fort Lauderdale?',
    answer:
      'Managed IT services from New Wave IT in Fort Lauderdale include monitoring and maintenance of computers, servers and the network, patch management, endpoint protection, managed backups with a recovery plan, a help desk for every user, and regular reviews of what to upgrade, replace or budget for next.',
  },
  {
    question: 'What is the difference between managed IT services and IT support?',
    answer:
      'IT support is the help desk: someone to call when a password, a printer or a laptop stops working. Managed IT services include that help desk and add the work done before something breaks, such as monitoring, maintenance, managed backups and planning, for a flat monthly price. New Wave IT offers both, and its page on IT support in Fort Lauderdale covers day-to-day support.',
  },
  {
    question: 'Is there a long-term contract?',
    answer:
      'No long-term contract is required for managed IT services from New Wave IT. The price is flat and monthly, built from the published per-unit rates. The first step is a free IT assessment, followed by a written quote.',
  },
  {
    question: 'Does New Wave IT manage Microsoft 365?',
    answer:
      "Yes. Microsoft 365 management is part of New Wave IT's cloud solutions service, Microsoft 365 is one of the tools its team runs, and New Wave IT is a Microsoft partner. " +
      `The published price list has two Office 365 lines: ${rate('microsoft365License')} per month for licensing only, and ${rate('microsoft365LicenseWithEmail')} per month for licensing and email.`,
  },
  {
    question: 'Does New Wave IT have an office in Fort Lauderdale, and when is it open?',
    answer: `Yes. New Wave IT's office is at ${OFFICE_ADDRESS}. It is a staffed office, open Monday to Friday, 8am to 6pm, and a 24/7 emergency line covers urgent problems outside those hours. The phone number is ${PHONE}.`,
  },
  {
    question: 'Which parts of Broward County does New Wave IT cover, and does it come on site?',
    answer:
      'New Wave IT serves businesses across Broward County from its Fort Lauderdale office, including Fort Lauderdale, Hollywood, Pompano Beach, Coral Springs, Plantation and Pembroke Pines. It does come on site: service is delivered by remote support and by on-site visits to client offices.',
  },
];

const page: ServiceCategoryPageData = {
  icon: Monitor,
  name: 'Managed IT Services in Fort Lauderdale',
  heroTitle: 'Managed IT services in Fort Lauderdale',
  description: 'Managed IT services for Fort Lauderdale businesses at published monthly rates.',
  heroDescription:
    "Monitoring, patching, backup, security and a help desk for businesses in Fort Lauderdale and Broward County, run from New Wave IT's Fort Lauderdale office at published monthly rates.",
  overviewTitle: 'Who provides managed IT services in Fort Lauderdale?',
  details:
    `New Wave IT is a managed IT services provider (MSP) with a staffed office at ${OFFICE_ADDRESS}. ` +
    "Founded in 2022, it is a team of 5 to 10 people that runs IT for other businesses: one provider responsible for keeping a company's computers, servers and network running, secure and planned. " +
    'Service reaches businesses in Fort Lauderdale and the rest of Broward County by remote support and on-site visits, and New Wave IT serves Miami-Dade and Palm Beach counties from the same office. ' +
    `Managed IT is priced at a flat monthly amount built from published per-unit rates, such as ${rate('computer')} per month, and no long-term contract is required.`,
  overviewBody: [
    'New Wave IT is a Microsoft, Cisco and Huntress partner. The tools its team runs include Microsoft 365, SentinelOne, Huntress, NinjaOne, ConnectWise and Cloudflare. The work is done by certified engineers, and each client has a dedicated account manager.',
  ],
  highlights: [
    'Staffed office in Fort Lauderdale',
    'Remote support and on-site visits',
    'Help desk for every user',
    'Flat monthly pricing at published rates',
    'No long-term contract required',
    '24/7 emergency line',
  ],
  // The second header button goes to the price list, the subject of this page; the guide is among the related links.
  seoLink: '/pricing',
  guideLabel: 'See the published rates',
  assessmentLabel: 'Get a free IT assessment',
  featureTitle: 'What managed IT services include',
  featureCards: [
    { icon: Monitor, title: 'Monitoring and maintenance', description: 'Devices, servers and the network are watched and maintained so issues are found early.' },
    { icon: RefreshCw, title: 'Patch management', description: 'Updates and security patches are applied for you instead of waiting on each user.' },
    { icon: ShieldCheck, title: 'Endpoint protection', description: 'Endpoint protection on the computers and servers under management.' },
    { icon: HardDrive, title: 'Backup and recovery', description: 'Managed backups, with a recovery plan for getting data and systems back.' },
    { icon: Headphones, title: 'Help desk', description: 'Every user can turn to the help desk with day-to-day problems.' },
    { icon: BarChart3, title: 'Planning', description: 'Regular reviews of what to upgrade, replace or budget for next.' },
  ],
  sections: [
    {
      title: 'What is a managed service provider?',
      body: [
        "A managed service provider (MSP) is a company that takes ongoing responsibility for another business's IT systems in return for a recurring fee. " +
          'An MSP monitors the computers, servers and network, keeps them updated and backed up, and supports the people who use them, so the work happens before a failure and not only after one. ' +
          'The older arrangement is called break-fix: the business calls a technician when something breaks and pays for that repair, usually by the hour. ' +
          'With break-fix the cost of IT is unknown until the invoice arrives, and no provider is responsible for preventing the next failure. ' +
          'Managed IT services is the name for the first arrangement, and New Wave IT in Fort Lauderdale works this way.',
      ],
    },
    {
      title: 'What do managed IT services cost in Fort Lauderdale?',
      body: [
        `Managed IT services from New Wave IT in Fort Lauderdale are priced per unit, per month. ${ratesSentence()} The full price list and an estimate builder are on the pricing page.`,
        'Flat monthly pricing means the price of managed IT is a set amount each month instead of an hourly bill. ' +
          'New Wave IT sets that amount per unit: one rate for each computer or device, one for each employee or user account, one for each managed server, and one for each location whose network is monitored. ' +
          'After a free IT assessment, a written quote applies those rates to one business, so the monthly figure is known before onboarding starts.',
      ],
      // The price block the local pages share: three cards under the sentence that states every rate.
      cards: [
        { icon: DollarSign, title: `${usd(PUBLISHED_RATES.computer.dollars)} per computer`, description: `Per ${PUBLISHED_RATES.computer.per}, per month.` },
        { icon: DollarSign, title: `${usd(PUBLISHED_RATES.user.dollars)} per user`, description: `Per ${PUBLISHED_RATES.user.per}, per month.` },
        { icon: DollarSign, title: `${usd(PUBLISHED_RATES.server.dollars)} per server`, description: `Per ${PUBLISHED_RATES.server.per}, per month. Network monitoring is ${rate('location')}.` },
      ],
    },
    {
      title: 'Where New Wave IT works',
      body: [
        `New Wave IT's office is at ${OFFICE_ADDRESS}, in Fort Lauderdale's Progresso Village. ` +
          'From this office New Wave IT serves businesses across Broward County, including Fort Lauderdale, Hollywood, Pompano Beach, Coral Springs, Plantation and Pembroke Pines. ' +
          'Monitoring and patching are remote work, and an on-site visit is for a problem that needs hands on the hardware. ' +
          'Office hours are Monday to Friday, 8am to 6pm, and a 24/7 emergency line covers urgent problems outside those hours. ' +
          `The phone number is ${PHONE} and the email address is ${EMAIL}. ` +
          'Miami-Dade and Palm Beach counties are served from the same office.',
      ],
    },
    {
      title: 'IT for healthcare practices and family offices',
      body: [
        'New Wave IT has industry pages for two kinds of office where backup, access and record-keeping carry extra requirements. ' +
          'The healthcare page covers patient data encryption and backup, healthcare-specific disaster recovery, and audit trail and compliance reporting for medical practices. ' +
          'The family offices page covers financial data encryption and backup, multi-generational access controls and privacy-first network architecture. Both are linked below.',
      ],
    },
    {
      title: 'How does a business switch to New Wave IT?',
      body: ['Switching to New Wave IT takes three steps.'],
      ordered: true,
      items: [
        'A free IT assessment of your systems, support history and risks.',
        'A written quote built from the published rates.',
        'Onboarding to a plan with clear owners and dates, followed by managed support with regular reviews.',
      ],
    },
  ],
  faqs,
  relatedLinks: [
    { label: 'IT support in Fort Lauderdale', href: '/it-support-fort-lauderdale', description: 'The help desk and day-to-day support, from the same office.' },
    { label: 'Managed IT services', href: '/service-category/managed-it-services', description: 'The service in full: transition, planning and reporting.' },
    { label: 'Cybersecurity', href: '/service-category/cybersecurity', description: 'Threat detection and response, and security awareness training.' },
    { label: 'Cloud solutions', href: '/service-category/cloud-solutions', description: 'Microsoft 365 management, cloud migration and hybrid environments.' },
    { label: 'Pricing', href: '/pricing', description: 'The full published price list and an estimate builder.' },
    { label: 'South Florida service areas', href: '/managed-it-services-south-florida', description: 'The three counties New Wave IT serves and the cities in each.' },
    { label: 'Managed IT services in Miami', href: '/managed-it-services-miami', description: 'Miami-Dade County, served from the Fort Lauderdale office.' },
    { label: 'Managed IT services in West Palm Beach', href: '/managed-it-services-west-palm-beach', description: 'Palm Beach County, served from the Fort Lauderdale office.' },
    { label: 'Healthcare IT', href: '/service-category/healthcare', description: 'IT for medical practices.' },
    { label: 'Family office IT', href: '/service-category/family-offices', description: 'IT built around privacy for family offices.' },
    { label: 'Managed IT services strategy guide', href: '/l/managed-it-guide', description: 'A longer read on moving from break-fix support to managed services.' },
  ],
  ctaTitle: 'Ready for managed IT in Fort Lauderdale?',
  ctaDescription: 'Start with a free IT assessment and a written quote built from the published rates.',
  ctaLabel: 'Get a free IT assessment',
};

// Built once: the Service for this page and the FAQPage for the questions above.
const jsonLd = servicePageJsonLd({
  path: PATH,
  name: 'Managed IT Services in Fort Lauderdale',
  description:
    "Managed IT services for Fort Lauderdale and Broward County businesses from New Wave IT's Fort Lauderdale office: monitoring, patching, backup, endpoint protection and a help desk at published monthly rates.",
  serviceType: 'Managed IT Services',
  areaServed: [
    { '@type': 'City', name: 'Fort Lauderdale' },
    { '@type': 'AdministrativeArea', name: 'Broward County' },
  ],
  faqs,
});

export default function ManagedITFortLauderdalePage() {
  usePageMeta({ ...IT_PAGE_META[PATH], jsonLd });

  return <ServiceCategoryPage data={page} breadcrumbs={IT_PAGE_META[PATH].breadcrumbs} />;
}
