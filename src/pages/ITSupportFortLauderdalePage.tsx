import { DollarSign, Globe, Headphones, MapPin, Monitor, Shield } from 'lucide-react';
import { ServiceCategoryPage, type FaqItem, type ServiceCategoryPageData } from '../components/brand/ServiceCategoryPage';
import { PUBLISHED_RATES, ratesSentence, usd, type RateKey } from '../lib/publishedRates';
import { IT_PAGE_META } from '../lib/routeMeta';
import { servicePageJsonLd } from '../lib/serviceSchema';
import { usePageMeta } from '../lib/usePageMeta';

// Local landing page for "IT support Fort Lauderdale": the help desk, devices
// and on-site visits. Monitoring, patching and backup are the subject of
// /managed-it-services-fort-lauderdale, which this page links to. It states
// only what the owner has confirmed or the site already says
// (docs/geo/fact-sheet.md), and every price comes from publishedRates.ts.
const PATH = '/it-support-fort-lauderdale';

/** "$105 per computer or device": a rate with its unit, as the price list states it. */
const rate = (key: RateKey) => `${usd(PUBLISHED_RATES[key].dollars)} per ${PUBLISHED_RATES[key].per}`;

// Rendered by the page and handed to the FAQPage node, so the two cannot differ.
const faqs: FaqItem[] = [
  {
    question: 'Does New Wave IT have an office in Fort Lauderdale?',
    answer:
      "Yes. New Wave IT's office is at 710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311, in Broward County. It is a staffed office, open Monday to Friday from 8am to 6pm. Support for Broward, Miami-Dade and Palm Beach counties is run from this office.",
  },
  {
    question: 'Which parts of Broward County does New Wave IT cover?',
    answer:
      'New Wave IT covers Broward County from its office in Fort Lauderdale. Cities it serves in the county include Fort Lauderdale, Hollywood, Pompano Beach, Coral Springs, Plantation and Pembroke Pines. Support is delivered remotely and by on-site visit. New Wave IT also serves Miami-Dade and Palm Beach counties from the same office.',
  },
  {
    question: 'Does New Wave IT price per user or per device?',
    answer: `Both. New Wave IT's published price list has a per-device rate, ${rate('computer')}, and a per-user rate, ${rate('user')}, each per month. It also lists monthly rates of ${rate('server')} and ${rate('location')} for network monitoring. The full price list is on the pricing page.`,
  },
  {
    question: 'Is there a long-term contract?',
    answer:
      'No long-term contract is required for IT support from New Wave IT. Pricing is flat and monthly, at published rates per computer, user account, server and location. The first step is a free IT assessment, followed by a written quote built from those rates.',
  },
  {
    question: "What are New Wave IT's office hours in Fort Lauderdale, and what happens after hours?",
    answer:
      "New Wave IT's office hours are Monday to Friday, 8am to 6pm. Outside those hours, New Wave IT has a 24/7 emergency line. The help desk is reached by phone at (561) 564-1846, by email at support@newwaveitfl.com or by ticket.",
  },
  {
    question: 'Does New Wave IT come on site in Fort Lauderdale?',
    answer:
      'Yes. New Wave IT makes on-site visits in Fort Lauderdale and across Broward County from its Fort Lauderdale office. A technician comes on site when a problem needs hands on the hardware, such as a laptop, desktop or server that has to be repaired or replaced.',
  },
  {
    question: 'How is IT support different from managed IT services?',
    answer:
      'IT support is the day-to-day help that staff ask for: a help desk, repairs and on-site visits. Managed IT services add work that happens without a request, such as monitoring, routine maintenance and managed backups, so that problems are found early. New Wave IT provides both, and its managed IT services page for Fort Lauderdale describes the second.',
  },
];

const page: ServiceCategoryPageData = {
  icon: Headphones,
  name: 'IT Support in Fort Lauderdale',
  heroTitle: 'IT support and help desk in Fort Lauderdale',
  description: 'Help desk, remote support and on-site visits for Fort Lauderdale businesses from New Wave IT.',
  heroDescription:
    'New Wave IT is an IT company with a staffed office in Fort Lauderdale. Its help desk serves Broward County businesses by phone, email and ticket, with remote support, on-site visits and published monthly rates.',
  overviewTitle: 'Who provides IT support in Fort Lauderdale?',
  details:
    'New Wave IT provides IT support for businesses in Fort Lauderdale from a staffed office at 710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311. It is an IT company and managed service provider, founded in 2022, with a team of 5 to 10 people. Staff at a client business reach the help desk by phone, by email or by opening a ticket. Problems that can be fixed remotely are handled by remote support, and a technician visits when the hardware itself needs attention. Fort Lauderdale is in Broward County, and New Wave IT also serves businesses in Miami-Dade and Palm Beach counties from the same office.',
  overviewBody: [
    "Support is provided by New Wave IT's certified engineers. New Wave IT is a Huntress, Microsoft and Cisco partner, and the tools its team runs include Microsoft 365, SentinelOne, Huntress, NinjaOne, ConnectWise and Cloudflare.",
  ],
  highlights: [
    'Help desk by phone, email and ticket',
    'Remote support and on-site visits',
    'Staffed office in Fort Lauderdale',
    'Office hours Monday to Friday, 8am to 6pm',
    '24/7 emergency line',
    'Published monthly rates, no long-term contract required',
  ],
  seoLink: '/pricing',
  guideLabel: 'See the published rates',
  assessmentLabel: 'Get a free IT assessment',
  featureTitle: 'What does IT support cover?',
  featureDescription: 'IT support from New Wave IT covers the day-to-day problems of the people and devices in an office.',
  featureCards: [
    { icon: Headphones, title: 'Help desk', description: 'Password resets, email and Microsoft 365 problems, printers, and the everyday questions that stop work.' },
    { icon: Globe, title: 'Remote support', description: 'Secure remote assistance for the problems that can be fixed without a visit.' },
    { icon: MapPin, title: 'On-site visits', description: 'A technician comes to the office when a problem needs hands on the hardware.' },
    { icon: Monitor, title: 'Devices and repair', description: 'Laptops, desktops, and servers diagnosed, repaired, upgraded, or replaced.' },
    { icon: Shield, title: 'Security basics', description: 'Endpoint protection, patching and email filtering on the devices New Wave IT supports.' },
  ],
  sections: [
    {
      title: 'How a support request is handled',
      body: [
        "A support request to New Wave IT in Fort Lauderdale starts with a phone call, an email or a ticket from someone on the client's staff, and it is tracked as a ticket until it is resolved. Everyday problems such as password resets, software installation and routine troubleshooting are handled at the first tier. Network issues, server problems and work that needs deeper diagnosis move to a second tier, and critical outages, security incidents and infrastructure changes get senior-level attention. Critical issues are prioritized ahead of routine requests. Each client also has a dedicated account manager.",
      ],
    },
    {
      title: 'How much does IT support cost in Fort Lauderdale?',
      body: [
        `IT support from New Wave IT in Fort Lauderdale is priced at a flat monthly rate per unit. ${ratesSentence()} After a free IT assessment, New Wave IT writes a quote built from these rates, and no long-term contract is required. The full price list and a quote builder are on the pricing page.`,
      ],
      cards: [
        { icon: DollarSign, title: `${usd(PUBLISHED_RATES.computer.dollars)} per computer`, description: `Per ${PUBLISHED_RATES.computer.per}, per month.` },
        { icon: DollarSign, title: `${usd(PUBLISHED_RATES.user.dollars)} per user`, description: `Per ${PUBLISHED_RATES.user.per}, per month.` },
        { icon: DollarSign, title: `${usd(PUBLISHED_RATES.server.dollars)} per server`, description: `Per ${PUBLISHED_RATES.server.per}, per month. Network monitoring is ${rate('location')}.` },
      ],
    },
    {
      title: 'Where New Wave IT works in Broward County',
      body: [
        "New Wave IT's office is at 710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311, in Fort Lauderdale's Progresso Village. It is a staffed office, open Monday to Friday from 8am to 6pm. The phone number is (561) 564-1846, and outside office hours there is a 24/7 emergency line. On-site visits from this office are made across Broward County, including Fort Lauderdale, Hollywood, Pompano Beach, Coral Springs, Plantation and Pembroke Pines.",
      ],
    },
    {
      title: 'IT support by industry',
      body: [
        'New Wave IT has industry pages for two kinds of office whose day-to-day support carries extra requirements: healthcare practices, where the work includes secure patient data management and EHR integration, and family offices, where it centers on protecting sensitive financial data. Both are linked below.',
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
  faqs,
  faqTitle: 'Questions about IT support in Fort Lauderdale',
  relatedLinks: [
    { label: 'Managed IT services in Fort Lauderdale', href: '/managed-it-services-fort-lauderdale', description: 'Monitoring, patching, backup and planning for Fort Lauderdale offices.' },
    { label: 'Live IT support', href: '/service-category/live-it-support', description: 'Support tiers, ticket tracking and escalation in more detail.' },
    { label: 'IT repair and upgrades', href: '/service-category/it-repair-upgrades', description: 'When to repair a computer and when to replace it.' },
    { label: 'Cloud solutions and Microsoft 365', href: '/service-category/cloud-solutions', description: 'Cloud migration, Microsoft 365 and hybrid environments.' },
    { label: 'Network infrastructure', href: '/service-category/network-infrastructure', description: 'Office network design, WiFi, and VPN and remote access.' },
    { label: 'Cybersecurity', href: '/service-category/cybersecurity', description: 'Threat detection and response, beyond the security basics.' },
    { label: 'Pricing', href: '/pricing', description: 'The published price list and a quote builder.' },
    { label: 'South Florida service areas', href: '/managed-it-services-south-florida', description: 'Cities served in Broward, Miami-Dade and Palm Beach counties.' },
    { label: 'IT support in Boca Raton', href: '/it-support-boca-raton', description: 'The same service for south Palm Beach County.' },
    { label: 'Healthcare IT', href: '/service-category/healthcare', description: 'IT for medical practices and their patient data.' },
    { label: 'IT for family offices', href: '/service-category/family-offices', description: 'IT for offices that manage private financial data.' },
  ],
  ctaTitle: 'Need IT support in Fort Lauderdale?',
  ctaDescription: 'Start with a free IT assessment, or call the Fort Lauderdale office.',
  ctaLabel: 'Get a free IT assessment',
};

// The Service and FAQPage nodes: written into the raw HTML at build time and by usePageMeta at runtime.
const jsonLd = servicePageJsonLd({
  path: PATH,
  name: page.name,
  description: 'Help desk, remote support and on-site visits for businesses in Fort Lauderdale and Broward County, at published monthly rates.',
  serviceType: 'IT Support',
  areaServed: [
    { '@type': 'City', name: 'Fort Lauderdale' },
    { '@type': 'AdministrativeArea', name: 'Broward County' },
  ],
  faqs,
});

export default function ITSupportFortLauderdalePage() {
  usePageMeta({ ...IT_PAGE_META[PATH], jsonLd });

  return <ServiceCategoryPage data={page} breadcrumbs={IT_PAGE_META[PATH].breadcrumbs} />;
}
