import { Cloud, Database, Globe, Lock, TrendingUp, Zap } from 'lucide-react';
import { ServiceCategoryPage, type ServiceCategoryPageData } from '../components/brand/ServiceCategoryPage';
import { usePageMeta } from '../lib/usePageMeta';

const service: ServiceCategoryPageData = {
  icon: Cloud,
  name: 'Cloud Solutions',
  heroTitle: 'Cloud decisions with a practical foundation',
  description: 'Strategic cloud adoption with migration, optimization, and multi-cloud management.',
  heroDescription: 'Build a cloud environment that supports real work, clear governance, and the pace of your business.',
  details: 'Leverage Azure, AWS, and Google Cloud for scalability, cost control, and business agility. We handle migration planning, optimization, and ongoing management.',
  highlights: ['Multi-cloud architecture design', 'Cloud migration planning & execution', 'Microsoft 365 & productivity tools', 'Hybrid cloud environments', 'Cloud security & compliance', 'Cost optimization & FinOps', 'Backup & disaster recovery', 'Continuous monitoring & optimization'],
  seoLink: '/l/cloud-solutions-guide',
  eyebrow: 'Cloud Solutions',
  assessmentLabel: 'Plan Your Cloud Roadmap',
  featureTitle: 'Cloud platforms & services',
  featureCards: [
    { icon: Cloud, title: 'Microsoft Azure', description: 'Cloud infrastructure, identity, application, and productivity support designed around Microsoft environments.' },
    { icon: Database, title: 'Amazon Web Services', description: 'Flexible AWS architecture, migration planning, and operational management for evolving workloads.' },
    { icon: Globe, title: 'Google Cloud', description: 'Support for Google Cloud services and data workloads when the platform fits the organization.' },
  ],
  sections: [
    {
      title: 'Migration planning & execution',
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
  ctaTitle: 'Ready to make your cloud plan clearer?',
  ctaDescription: 'Talk with New Wave IT about a cloud roadmap that balances security, performance, cost, and the way your team works.',
};

export default function CloudSolutionsServicePage() {
  usePageMeta({
    title: 'Cloud Solutions & Migration Fort Lauderdale — Azure, Microsoft 365',
    description: 'Cloud migration and management for Fort Lauderdale businesses. Azure, Microsoft 365, AWS, hybrid cloud strategy, and cost optimization from New Wave IT.',
    keywords: 'cloud migration Fort Lauderdale, cloud solutions South Florida, Microsoft 365 setup Fort Lauderdale, Azure migration, cloud consulting Fort Lauderdale, hybrid cloud South Florida, cloud services MSP',
    canonical: 'https://www.newwaveitfl.com/service-category/cloud-solutions',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      provider: { '@id': 'https://www.newwaveitfl.com/#business' },
      name: 'Cloud Solutions & Migration',
      description: 'Expert cloud migration to Azure, Microsoft 365, and AWS with cost optimization and hybrid cloud management for South Florida businesses.',
      areaServed: { '@type': 'City', name: 'Fort Lauderdale' },
      serviceType: 'Cloud Computing',
      url: 'https://www.newwaveitfl.com/service-category/cloud-solutions',
    },
  });

  return <ServiceCategoryPage data={service} />;
}
