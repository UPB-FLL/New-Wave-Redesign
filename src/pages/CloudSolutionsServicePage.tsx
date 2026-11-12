import { Cloud, Database, Globe, Lock, TrendingUp, Zap } from 'lucide-react';
import { ServiceCategoryPage, type FaqItem, type ServiceCategoryPageData } from '../components/brand/ServiceCategoryPage';
import { PUBLISHED_RATES, usd, type RateKey } from '../lib/publishedRates';
import { IT_PAGE_META } from '../lib/routeMeta';
import { servicePageJsonLd } from '../lib/serviceSchema';
import { usePageMeta } from '../lib/usePageMeta';

const PATH = '/service-category/cloud-solutions';

// Prices are read from the published rates, never typed, so a price change is one edit.
const rate = (key: RateKey) => `${usd(PUBLISHED_RATES[key].dollars)} per ${PUBLISHED_RATES[key].per}`;
// The price list names these two rows "Office 365"; the service itself is "Microsoft 365" in prose.
const LICENSING_RATES = `${rate('microsoft365License')} for licensing only, or ${rate('microsoft365LicenseWithEmail')} for licensing and email`;

// The questions the page shows. The same list feeds the FAQPage node, so the markup states what is visible.
const faqs: FaqItem[] = [
  {
    question: 'What is cloud migration?',
    answer:
      "Cloud migration is the move of a company's applications, data and email from servers and computers in its own office to services that run in a cloud provider's data centers. New Wave IT handles a migration in three steps: it assesses the applications, data, dependencies and operational requirements, builds a phased plan with clear ownership, validation and communication, then moves workloads in a controlled sequence and confirms performance after each stage.",
  },
  {
    question: "What do New Wave IT's cloud solutions include?",
    answer:
      "New Wave IT's cloud solutions include cloud migration planning and execution, Microsoft 365 setup and management, multi-cloud architecture design, hybrid environments that connect office systems to cloud services, cloud security and compliance work, backup and disaster recovery, cost optimization, and continuous monitoring. Each engagement has a dedicated project manager.",
  },
  {
    question: 'Does New Wave IT manage Microsoft 365?',
    answer:
      'Yes. New Wave IT is a Microsoft partner, and Microsoft 365 is one of the tools its team runs. Under cloud solutions, New Wave IT sets up and manages Microsoft 365 and supports identity, applications and productivity tools in Microsoft environments. Licensing is on the published price list, where the two rows are named Office 365.',
  },
  {
    question: 'How much do cloud solutions and Microsoft 365 licensing cost?',
    answer: `New Wave IT publishes two monthly licensing rates, listed on its price list as Office 365: ${LICENSING_RATES}. Each is a rate for one account, not a total. Cloud migrations and other cloud work are priced in a written quote after a free IT assessment. The full price list is on the pricing page.`,
  },
  {
    question: 'Is cloud work done remotely or on site?',
    answer:
      "Both. New Wave IT provides remote support and on-site visits. Cloud platforms and Microsoft 365 are administered over the internet, so they can be managed remotely. On-site visits come from New Wave IT's office in Fort Lauderdale and reach businesses in Broward, Miami-Dade and Palm Beach counties.",
  },
  {
    question: 'Which areas does New Wave IT serve with cloud solutions?',
    answer:
      'New Wave IT serves businesses in Broward, Miami-Dade and Palm Beach counties, including Fort Lauderdale, Miami, Boca Raton and West Palm Beach. Its office is at 710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311. New Wave IT has no office in Miami-Dade or Palm Beach County; businesses there are served from Fort Lauderdale by remote support and on-site visits.',
  },
  {
    question: 'How does a business start a cloud project with New Wave IT?',
    answer:
      "Start with a free IT assessment. New Wave IT then prepares a written quote, and onboarding follows. To arrange the assessment, call (561) 564-1846, email support@newwaveitfl.com or use the contact form on this site. New Wave IT's office hours are Monday to Friday, 8am to 6pm.",
  },
];

const service: ServiceCategoryPageData = {
  icon: Cloud,
  name: 'Cloud Solutions',
  heroTitle: 'Cloud decisions with a practical foundation',
  description: 'Strategic cloud adoption with migration, optimization, and multi-cloud management.',
  heroDescription: 'Build a cloud environment that supports real work, clear governance, and the pace of your business.',
  overviewTitle: 'What cloud services does an IT provider manage for a small business?',
  details:
    "For a small business, an IT provider such as New Wave IT in Fort Lauderdale plans, moves and manages the company's cloud services: business email and Microsoft 365, backup and disaster recovery, and the servers and applications hosted on a cloud platform. New Wave IT is a managed IT services provider that works with Microsoft Azure, Amazon Web Services (AWS) and Google Cloud. Those platforms let a business add or remove capacity as it changes, keep spending tied to what it uses, and adopt new tools without buying hardware first. New Wave IT handles the migration planning, the optimization of what is already running, and the ongoing management after the move.",
  overviewBody: [
    "New Wave IT, a Microsoft partner, sets up and manages Microsoft 365 for businesses in South Florida. Microsoft 365 is Microsoft's subscription service for business email, the Office apps and file storage, and it is one of the tools the New Wave IT team runs. In Microsoft environments New Wave IT also supports identity, applications and productivity tools. After a migration, the service continues with backup and disaster recovery, cloud security and compliance work, and continuous monitoring of usage and spend. When some systems stay in the office, New Wave IT connects them to cloud services as a hybrid environment, with a plan for identity, data and operations.",
    `New Wave IT provides cloud solutions from its office at 710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311 to businesses in Broward, Miami-Dade and Palm Beach counties, by remote support and on-site visits. The published price list has two monthly licensing rates, listed there as Office 365: ${LICENSING_RATES}. Each is a rate for one account for one month, not a total. Migration projects and other cloud work are priced in a written quote after a free IT assessment, and the work is done by certified engineers.`,
  ],
  highlights: ['Multi-cloud architecture design', 'Cloud migration planning & execution', 'Microsoft 365 & productivity tools', 'Hybrid cloud environments', 'Cloud security & compliance', 'Cost optimization & FinOps', 'Backup & disaster recovery', 'Continuous monitoring & optimization'],
  seoLink: '/l/cloud-solutions-guide',
  assessmentLabel: 'Plan your cloud roadmap',
  featureTitle: 'Cloud platforms & services',
  featureCards: [
    { icon: Cloud, title: 'Microsoft Azure', description: 'Cloud infrastructure, identity, application, and productivity support designed around Microsoft environments.' },
    { icon: Database, title: 'Amazon Web Services', description: 'Flexible AWS architecture, migration planning, and operational management for evolving workloads.' },
    { icon: Globe, title: 'Google Cloud', description: 'Support for Google Cloud services and data workloads when the platform fits the organization.' },
  ],
  sections: [
    {
      title: 'Migration planning & execution',
      ordered: true,
      items: ['Assess applications, data, dependencies, and operational requirements.', 'Build a phased migration plan with clear ownership, validation, and communication.', 'Move workloads in a controlled sequence and confirm performance after each stage.'],
    },
    {
      title: 'Cost optimization & FinOps',
      cards: [
        { icon: TrendingUp, title: 'Right-Sizing', description: 'Match cloud resources to actual use so spend follows the needs of the workload.' },
        { icon: Database, title: 'Reserved Capacity', description: 'Evaluate committed-use options when stable workloads make them a practical fit.' },
        { icon: Zap, title: 'Continuous Monitoring', description: 'Review usage and spend regularly so changes are visible before they become surprises.' },
      ],
      callout: 'Cloud economics work best when architecture, usage visibility, and business planning are considered together.',
    },
    {
      title: 'Hybrid & multi-cloud strategy',
      cards: [
        { icon: Cloud, title: 'Hybrid Environments', description: 'Connect on-premises systems and cloud services with a deliberate plan for identity, data, and operations.' },
        { icon: Lock, title: 'Multi-Cloud Resilience', description: 'Use more than one platform when it creates meaningful resilience, capability, or vendor flexibility.' },
      ],
    },
  ],
  faqs,
  relatedLinks: [
    {
      label: 'South Florida service areas',
      href: '/managed-it-services-south-florida',
      description: 'The counties and cities New Wave IT serves from its Fort Lauderdale office.',
    },
    {
      label: 'Managed IT services in Fort Lauderdale',
      href: '/managed-it-services-fort-lauderdale',
      description: 'Ongoing monitoring, patching, backup, security and help desk at published monthly rates.',
    },
    {
      label: 'Pricing',
      href: '/pricing',
      description: 'The full published price list, including both Office 365 licensing rates, and a quote builder.',
    },
    {
      label: 'Cloud solutions strategy guide',
      href: '/l/cloud-solutions-guide',
      description: 'A longer read on cloud architecture, migration strategy and cost optimization.',
    },
  ],
  ctaTitle: 'Ready to make your cloud plan clearer?',
  ctaDescription: 'Talk with New Wave IT about a cloud roadmap that balances security, performance, cost, and the way your team works.',
};

// The Service node keeps the name, description and type it had; the area is the office's city and the three counties served.
const jsonLd = servicePageJsonLd({
  path: PATH,
  name: 'Cloud Solutions & Migration',
  description: 'Expert cloud migration to Azure, Microsoft 365, and AWS with cost optimization and hybrid cloud management for South Florida businesses.',
  serviceType: 'Cloud Computing',
  areaServed: [
    { '@type': 'City', name: 'Fort Lauderdale' },
    { '@type': 'AdministrativeArea', name: 'Broward County' },
    { '@type': 'AdministrativeArea', name: 'Miami-Dade County' },
    { '@type': 'AdministrativeArea', name: 'Palm Beach County' },
  ],
  faqs,
});

export default function CloudSolutionsServicePage() {
  usePageMeta({ ...IT_PAGE_META[PATH], jsonLd });

  return <ServiceCategoryPage data={service} breadcrumbs={IT_PAGE_META[PATH].breadcrumbs} />;
}
