import { Award, Clock, Globe, Headphones, MessageSquare, Zap } from 'lucide-react';
import { ServiceCategoryPage, type ServiceCategoryPageData } from '../components/brand/ServiceCategoryPage';
import { PUBLISHED_RATES, ratesSentence, usd, type RateKey } from '../lib/publishedRates';
import { IT_PAGE_META } from '../lib/routeMeta';
import { servicePageJsonLd } from '../lib/serviceSchema';
import type { FaqItem } from '../lib/structuredData';
import { usePageMeta } from '../lib/usePageMeta';

// Prices in prose come from the published rates, so a price change is one edit.
const rate = (key: RateKey) => `${usd(PUBLISHED_RATES[key].dollars)} per ${PUBLISHED_RATES[key].per}`;

// Shown on the page and marked up as its FAQPage: one list, so the two cannot differ.
const faqs: FaqItem[] = [
  {
    question: 'What does an IT help desk do?',
    answer:
      'An IT help desk is the single point of contact that staff use when technology stops them from working. It takes a request, records it as a ticket, resolves what it can, and escalates the rest to more senior engineers or an on-site visit.',
  },
  {
    question: 'What is included in New Wave IT\'s live IT support?',
    answer:
      'New Wave IT\'s live IT support includes a help desk reached by phone, email, chat or in person, remote and on-site support, ticket tracking with escalation management, a knowledge base and executive reporting. Clients also have dedicated account management with priority routing, and critical issues get priority handling.',
  },
  {
    question: 'How much does IT support cost?',
    answer: `${ratesSentence()} A written quote for IT support is built from those rates after a free IT assessment, with no long-term contract required.`,
  },
  {
    question: 'Is IT support remote or on site?',
    answer:
      'Both. New Wave IT resolves common issues through secure remote assistance and sends a technician on site when the work needs hands-on attention, such as hardware, facilities or complex changes. On-site visits are made from the Fort Lauderdale office to businesses in Broward, Miami-Dade and Palm Beach counties.',
  },
  {
    question: 'Which areas does New Wave IT serve?',
    answer:
      'New Wave IT serves businesses in Broward, Miami-Dade and Palm Beach counties, including Fort Lauderdale, Miami, Boca Raton and West Palm Beach. Its office is at 710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311. There is no office in Miami-Dade or Palm Beach County, so businesses there are supported remotely and by on-site visits from Fort Lauderdale.',
  },
  {
    question: 'What are New Wave IT\'s support hours?',
    answer:
      'New Wave IT\'s office hours are Monday to Friday, 8am to 6pm, and it runs a 24/7 emergency line. To reach support, call (561) 564-1846 or email support@newwaveitfl.com. Email suits requests that need context or documentation, and a phone call is the right choice for an urgent problem.',
  },
  {
    question: 'How do I get started with IT support from New Wave IT?',
    answer:
      'Start with a free IT assessment. New Wave IT looks at your devices, your accounts and the problems your staff report most, then sends a written quote built from its published rates. Once you accept the quote, onboarding moves your support over to New Wave IT\'s help desk.',
  },
];

const service: ServiceCategoryPageData = {
  icon: Headphones,
  name: 'Live IT Support',
  heroTitle: 'Support that keeps work moving',
  description: 'Around-the-clock technical support from dedicated engineers.',
  heroDescription: 'Reach a practical support team by phone, email, chat, or on-site when the work calls for it.',
  overviewTitle: 'What does business IT support cover?',
  details:
    'Business IT support covers the technical problems that keep a company\'s staff from working, from one person who cannot sign in to an office that has lost its network. New Wave IT, a managed IT services provider with an office in Fort Lauderdale, provides it as a live help desk for South Florida businesses: a team that takes requests, works on them remotely where it can, and comes on site when the job needs hands on the equipment. ' +
    // The overview's two earlier sentences, kept word for word after the new opening.
    'Our live support team is available 24/7 via phone, email, chat, and on-site. We prioritize critical issues and maintain detailed ticket tracking throughout the process.',
  overviewBody: [
    'New Wave IT\'s help desk tracks requests as tickets and handles them at the level they need. Tier 1 covers everyday requests such as password resets, software installation and routine troubleshooting. Tier 2 takes network issues, server problems and other faults that call for advanced diagnostics. Tier 3 gives critical outages, security incidents and infrastructure changes senior-level attention. Tickets have clear ownership and a documented path from request to resolution, and a knowledge base of guidance and common resolutions supports more consistent service. Clients also have dedicated account management, and service reporting shows their leaders the trends, priorities and ongoing work.',
    `New Wave IT was founded in 2022 and works from a staffed office at 710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311. From that office it supports businesses in Broward, Miami-Dade and Palm Beach counties through remote support and on-site visits. Office hours are Monday to Friday, 8am to 6pm, and there is a 24/7 emergency line. New Wave IT publishes its monthly rates, among them ${rate('computer')} and ${rate('user')}, and builds a written quote from those rates after a free IT assessment.`,
  ],
  highlights: ['Dedicated account management & priority routing', 'Priority handling for critical issues', 'Remote & on-site support', 'Advanced ticket tracking', 'Comprehensive knowledge base', 'Escalation management & executive reporting', 'Phone/email/chat/in-person support', 'Technician training & mentoring'],
  seoLink: '/l/it-support-guide',
  assessmentLabel: 'Talk to support',
  featureTitle: 'Support that is always ready',
  featureDescription: 'Clear escalation paths and multiple contact methods give your team a reliable way to get help.',
  featureCards: [
    { icon: Headphones, title: 'Tier 1 Support', description: 'Password resets, software installation, and everyday troubleshooting for fast resolution.' },
    { icon: Zap, title: 'Tier 2 Support', description: 'Network issues, server problems, and advanced diagnostics when work needs deeper investigation.' },
    { icon: Award, title: 'Tier 3 Support', description: 'Critical outages, security incidents, and infrastructure changes with senior-level attention.' },
  ],
  sections: [
    {
      title: 'How to reach us',
      cards: [
        { icon: Headphones, title: 'Phone', description: 'Call 24/7 for immediate assistance and priority handling for urgent problems.' },
        { icon: MessageSquare, title: 'Email', description: 'Send requests that need context or documentation for clear tracking and prioritization.' },
        { icon: Globe, title: 'Live Chat', description: 'Use real-time chat for quick questions, updates, and ticket visibility.' },
      ],
    },
    {
      title: 'Knowledge management',
      cards: [
        { icon: Award, title: 'Comprehensive Knowledge Base', description: 'Documented guidance and common resolutions support faster, more consistent service.' },
        { icon: Clock, title: 'Ticket Tracking & Escalation', description: 'Clear ownership, prioritized escalation, and a documented path from request to resolution.' },
        { icon: Headphones, title: 'Executive Reporting', description: 'Useful service reporting helps leaders understand trends, priorities, and ongoing work.' },
      ],
    },
    {
      title: 'Remote & on-site support',
      cards: [
        { icon: Globe, title: 'Remote Support', description: 'Secure remote assistance resolves common issues efficiently and gives users clear next steps.' },
        { icon: Headphones, title: 'On-Site Support', description: 'When the work needs hands-on attention, local technicians can support hardware, facilities, and complex changes.' },
      ],
    },
  ],
  faqs,
  relatedLinks: [
    { label: 'IT support in Fort Lauderdale', href: '/it-support-fort-lauderdale', description: 'Help desk, remote and on-site support for Fort Lauderdale and Broward County businesses.' },
    { label: 'IT support in Boca Raton', href: '/it-support-boca-raton', description: 'IT support for Boca Raton and south Palm Beach County, delivered from the Fort Lauderdale office.' },
    { label: 'South Florida service areas', href: '/managed-it-services-south-florida', description: 'The three counties New Wave IT serves and the cities in each, with links to the city pages.' },
    { label: 'Pricing and published rates', href: '/pricing', description: 'The published monthly rates in one table, with a quote builder.' },
    { label: 'IT Support Excellence Guide', href: '/l/it-support-guide', description: 'A longer read on support tiers, remote and on-site support, and knowledge management.' },
  ],
  ctaTitle: 'Need dependable IT support?',
  ctaDescription: 'Talk to the New Wave IT team about support coverage that matches the way your organization works.',
  ctaLabel: 'Contact support',
};

// Module-level so the page hands usePageMeta the same value on every render.
const jsonLd = servicePageJsonLd({
  path: '/service-category/live-it-support',
  name: '24/7 Live IT Support',
  description: 'Round-the-clock technical support for South Florida businesses by phone, remote access, and on-site visits.',
  serviceType: 'IT Support',
  areaServed: [
    { '@type': 'City', name: 'Fort Lauderdale' },
    { '@type': 'AdministrativeArea', name: 'Broward County' },
    { '@type': 'AdministrativeArea', name: 'Miami-Dade County' },
    { '@type': 'AdministrativeArea', name: 'Palm Beach County' },
  ],
  faqs,
});

export default function LiveITSupportServicePage() {
  usePageMeta({ ...IT_PAGE_META['/service-category/live-it-support'], jsonLd });

  return <ServiceCategoryPage data={service} breadcrumbs={IT_PAGE_META['/service-category/live-it-support'].breadcrumbs} />;
}
