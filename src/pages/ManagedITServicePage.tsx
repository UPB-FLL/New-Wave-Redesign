import { BarChart3, Lock, Monitor, TrendingUp } from 'lucide-react';
import { ServiceCategoryPage, type FaqItem, type ServiceCategoryPageData } from '../components/brand/ServiceCategoryPage';
import { PUBLISHED_RATES, ratesSentence, usd, type RateKey } from '../lib/publishedRates';
import { IT_PAGE_META } from '../lib/routeMeta';
import { servicePageJsonLd } from '../lib/serviceSchema';
import { usePageMeta } from '../lib/usePageMeta';

const PATH = '/service-category/managed-it-services';

// Every price in the copy is read from the published rates, so a price change is one edit there.
const rate = (key: RateKey) => `${usd(PUBLISHED_RATES[key].dollars)} per ${PUBLISHED_RATES[key].per}`;

// One list for the page and for its FAQPage node, so the markup states exactly what is shown.
const faqs: FaqItem[] = [
  {
    question: 'What is a managed service provider (MSP)?',
    answer:
      "A managed service provider (MSP) is a company that takes ongoing responsibility for another organization's IT under an agreement, usually for a fixed monthly fee, instead of billing for each repair. Its work typically covers monitoring, updates, backups, security and user support. New Wave IT is a managed service provider based in Fort Lauderdale, Florida.",
  },
  {
    question: 'What is the difference between managed IT services and break-fix support?',
    answer:
      'Break-fix support means calling an IT company after something fails and paying for that repair, usually by the hour or by the visit, with no ongoing monitoring or maintenance between calls. Managed IT services are ongoing: the provider monitors, patches and maintains systems every month for a set fee, and one team that already knows the systems is responsible for them.',
  },
  {
    question: "What do New Wave IT's managed IT services include?",
    answer:
      "New Wave IT's managed IT services include monitoring, patching, routine maintenance and user support, plus backup management, recovery planning and security controls. Reports show support activity, trends and investment needs. The service also covers strategic planning and roadmapping, cloud integration and management, and quarterly business reviews.",
  },
  {
    question: 'How much do managed IT services cost?',
    answer: `New Wave IT prices managed IT services per unit, per month: ${rate('computer')}, ${rate('user')}, ${rate('server')} and ${rate('location')} for network monitoring. The price list has both a per-device rate and a per-user rate. Each figure is the rate for one unit, not a total. Pricing is flat and monthly, with no long-term contract required.`,
  },
  {
    question: 'Which areas does New Wave IT serve, and is the work remote or on site?',
    answer:
      'New Wave IT serves businesses in Broward, Miami-Dade and Palm Beach counties in South Florida, including Fort Lauderdale, Miami, Boca Raton and West Palm Beach, through remote support and on-site visits. On-site visits come from the office at 710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311. Miami-Dade and Palm Beach counties have no New Wave IT office.',
  },
  {
    question: 'How does a business get started with New Wave IT?',
    answer:
      'The first step is a free IT assessment of current systems, support history, risks and priorities. New Wave IT then provides a written quote built from its published rates and an onboarding plan with clear ownership, and the business moves into steady-state support. To begin, request an assessment on the contact page or call (561) 564-1846.',
  },
];

const service: ServiceCategoryPageData = {
  icon: Monitor,
  name: 'Managed IT Services',
  heroTitle: 'Managed IT with a clear point of view',
  description: 'Proactive monitoring, maintenance, and optimization of your entire IT infrastructure.',
  heroDescription: 'A dependable technology program that helps your organization plan, maintain, and improve the systems it relies on.',
  overviewTitle: 'What are managed IT services?',
  details:
    "Managed IT services are the ongoing management of a business's technology by an outside company, called a managed service provider (MSP), for a recurring fee that is usually a fixed monthly amount. The provider looks after computers, servers, networks and user accounts month after month, rather than being called in only after something fails. The aim is to find and fix problems before they interrupt work and to make routine IT costs predictable. Under its managed IT services, New Wave IT's managed services team monitors systems, applies patches, manages backups, supports users and provides strategic planning for IT growth.",
  overviewBody: [
    'New Wave IT is a managed service provider founded in 2022, with a team of 5 to 10 people and a staffed office at 710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311. From that office New Wave IT provides managed IT services to businesses in Broward, Miami-Dade and Palm Beach counties through remote support and on-site visits. Office hours are Monday to Friday, 8am to 6pm, and there is a 24/7 emergency line. Clients work with certified engineers and a dedicated account manager. New Wave IT is a Huntress, Microsoft and Cisco partner, and the tools the team runs include Microsoft 365, SentinelOne, Huntress, NinjaOne, ConnectWise and Cloudflare.',
  ],
  highlights: ['Continuous infrastructure monitoring', 'Strategic planning & roadmapping', 'Patch management & updates', 'Backup & disaster recovery', 'Cloud integration & management', 'Performance optimization', 'Transparent billing', 'Quarterly business reviews'],
  seoLink: '/l/managed-it-guide',
  assessmentLabel: 'Schedule an IT assessment',
  featureTitle: 'What managed IT services include',
  featureDescription: 'A practical operating model that covers daily maintenance, protection, and long-term technology planning.',
  featureCards: [
    { icon: Monitor, title: 'Daily Operations', description: 'Monitoring, patching, routine maintenance, and user support keep daily technology work organized.' },
    { icon: Lock, title: 'Protection & Recovery', description: 'Backup management, recovery planning, and security controls help support business continuity.' },
    { icon: BarChart3, title: 'Visibility & Reporting', description: 'Useful reports turn support activity, trends, and investment needs into information leaders can act on.' },
  ],
  sections: [
    {
      title: 'The transition process',
      ordered: true,
      items: ['Assess current systems, support history, risks, and priorities.', 'Create a practical onboarding plan with clear ownership and timelines.', 'Move into steady-state support with ongoing improvement and communication.'],
    },
    {
      title: 'Strategic planning & roadmapping',
      cards: [
        { icon: TrendingUp, title: 'Technology Planning', description: 'Plan investment around the business outcomes, users, and risk profile that matter most.' },
        { icon: BarChart3, title: 'Capacity Management', description: 'Understand where systems need room to grow before performance or availability is affected.' },
        { icon: Lock, title: 'Risk Mitigation', description: 'Use recurring reviews to identify gaps and prioritize steps that make the environment more resilient.' },
      ],
    },
    {
      title: 'Transparent, predictable billing',
      // The rates in a sentence, above the two cards the section has always had.
      body: [
        `Managed IT services from New Wave IT are billed as a flat monthly amount, and the rates behind it are published. ${ratesSentence()} A written quote is built from those rates, with no long-term contract required. The pricing page has the same list and a quote builder.`,
      ],
      cards: [
        { icon: Monitor, title: 'Fixed Monthly Fee', description: 'Simple pricing helps teams plan routine technology costs with more confidence.' },
        { icon: BarChart3, title: 'Clear Scope', description: 'We set expectations about what is included, what needs a project plan, and what changes as your organization evolves.' },
      ],
    },
  ],
  faqs,
  relatedLinks: [
    { label: 'Managed IT services in Fort Lauderdale', href: '/managed-it-services-fort-lauderdale', description: 'For businesses in Fort Lauderdale and Broward County, where New Wave IT has its office.' },
    { label: 'Managed IT services in Miami', href: '/managed-it-services-miami', description: 'For Miami and Miami-Dade County businesses, served from the Fort Lauderdale office.' },
    { label: 'Managed IT services in West Palm Beach', href: '/managed-it-services-west-palm-beach', description: 'Managed IT and IT support for West Palm Beach and Palm Beach County businesses.' },
    { label: 'South Florida service areas', href: '/managed-it-services-south-florida', description: 'The three counties New Wave IT serves and the local page for each area.' },
    { label: 'Pricing', href: '/pricing', description: 'Every published monthly rate in one table.' },
    { label: 'Managed IT services strategy guide', href: '/l/managed-it-guide', description: 'A longer read on service scope, the transition to managed services and strategic planning.' },
  ],
  relatedTitle: 'Areas served, pricing and the guide',
  ctaTitle: 'Ready for a more dependable IT operation?',
  ctaDescription: 'Talk to New Wave IT about an operating model that gives your team clearer priorities and a reliable technology partner.',
};

// The Service node keeps the name, description and type this page has always declared.
const jsonLd = servicePageJsonLd({
  path: PATH,
  name: 'Managed IT Services',
  description: 'Fully managed IT services for South Florida businesses with 24/7 monitoring, patch management, backup, and disaster recovery at flat-rate pricing.',
  serviceType: 'Managed IT Services',
  areaServed: [
    { '@type': 'City', name: 'Fort Lauderdale' },
    { '@type': 'AdministrativeArea', name: 'Broward County' },
    { '@type': 'AdministrativeArea', name: 'Miami-Dade County' },
    { '@type': 'AdministrativeArea', name: 'Palm Beach County' },
  ],
  faqs,
});

export default function ManagedITServicePage() {
  usePageMeta({ ...IT_PAGE_META[PATH], jsonLd });

  return <ServiceCategoryPage data={service} breadcrumbs={IT_PAGE_META[PATH].breadcrumbs} />;
}
