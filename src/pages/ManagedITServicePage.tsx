import { BarChart3, Lock, Monitor, TrendingUp } from 'lucide-react';
import { ServiceCategoryPage, type ServiceCategoryPageData } from '../components/brand/ServiceCategoryPage';
import { usePageMeta } from '../lib/usePageMeta';

const service: ServiceCategoryPageData = {
  icon: Monitor,
  name: 'Managed IT Services',
  heroTitle: 'Managed IT with a clear point of view',
  description: 'Proactive monitoring, maintenance, and optimization of your entire IT infrastructure.',
  heroDescription: 'A dependable technology program that helps your organization plan, maintain, and improve the systems it relies on.',
  details: 'Our managed services team monitors systems, applies patches, manages backups, and provides strategic planning for IT growth.',
  highlights: ['Continuous infrastructure monitoring', 'Strategic planning & roadmapping', 'Patch management & updates', 'Backup & disaster recovery', 'Cloud integration & management', 'Performance optimization', 'Transparent billing', 'Quarterly business reviews'],
  seoLink: '/l/managed-it-guide',
  eyebrow: 'Managed IT Services',
  assessmentLabel: 'Schedule an IT Assessment',
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
      cards: [
        { icon: Monitor, title: 'Fixed Monthly Fee', description: 'Simple pricing helps teams plan routine technology costs with more confidence.' },
        { icon: BarChart3, title: 'Clear Scope', description: 'We set expectations about what is included, what needs a project plan, and what changes as your organization evolves.' },
      ],
    },
  ],
  ctaTitle: 'Ready for a more dependable IT operation?',
  ctaDescription: 'Talk to New Wave IT about an operating model that gives your team clearer priorities and a reliable technology partner.',
};

export default function ManagedITServicePage() {
  usePageMeta({
    title: 'Managed IT Services Fort Lauderdale — MSP South Florida',
    description: 'Fully managed IT services for Fort Lauderdale and South Florida businesses. Flat-rate pricing, 24/7 monitoring, patch management, backup & disaster recovery. No long-term contracts.',
    keywords: 'managed IT services Fort Lauderdale, MSP South Florida, IT outsourcing Fort Lauderdale, managed services provider Florida, proactive IT monitoring, flat-rate IT support, IT management South Florida, outsourced IT department',
    canonical: 'https://www.newwaveitfl.com/service-category/managed-it-services',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      provider: { '@id': 'https://www.newwaveitfl.com/#business' },
      name: 'Managed IT Services',
      description: 'Fully managed IT services for South Florida businesses with 24/7 monitoring, patch management, backup, and disaster recovery at flat-rate pricing.',
      areaServed: { '@type': 'City', name: 'Fort Lauderdale' },
      serviceType: 'Managed IT Services',
      url: 'https://www.newwaveitfl.com/service-category/managed-it-services',
    },
  });

  return <ServiceCategoryPage data={service} />;
}
