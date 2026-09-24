import { Briefcase, Lock, Shield, TrendingUp, Users, Zap } from 'lucide-react';
import { ServiceCategoryPage, type ServiceCategoryPageData } from '../components/brand/ServiceCategoryPage';
import { IT_PAGE_META } from '../lib/routeMeta';
import { usePageMeta } from '../lib/usePageMeta';

const service: ServiceCategoryPageData = {
  icon: Briefcase,
  name: 'Family Offices',
  heroTitle: 'Technology designed for discretion and continuity',
  description: 'Secure, compliant IT infrastructure and wealth management technology for multi-generational family enterprises.',
  heroDescription: 'Protect sensitive financial data while helping family office teams work with clarity and confidence.',
  details: 'Protect sensitive financial data, support regulatory compliance, and use technology for efficient family office operations with dedicated assistance.',
  highlights: ['Privacy-first network architecture', 'Secure document & asset management', 'Multi-generational access controls', 'Tax compliance & audit readiness', 'Wealth management system integration', 'Confidentiality & discretion protocols', 'Financial data encryption & backup', '24/7 dedicated support & monitoring'],
  seoLink: '/l/family-offices-guide',
  eyebrow: 'Family Office IT',
  assessmentLabel: 'Discuss Your Office Needs',
  featureTitle: 'Family office services',
  featureCards: [
    { icon: Lock, title: 'Data Security & Privacy', description: 'Privacy-first controls, encryption, and access practices protect confidential financial and personal information.' },
    { icon: Shield, title: 'Compliance & Governance', description: 'Technology practices that support audit readiness, policy visibility, and the controls appropriate to the office.' },
    { icon: Users, title: 'Multi-Generational Access', description: 'Thoughtful identity and document access design can support family members, advisors, and evolving roles.' },
  ],
  sections: [
    {
      title: 'Family office operations support',
      cards: [
        { icon: Briefcase, title: 'Secure Document Management', description: 'Organize confidential documents with clear access controls and a dependable approach to backup.' },
        { icon: TrendingUp, title: 'Systems Integration', description: 'Connect wealth management, accounting, communication, and reporting systems with practical oversight.' },
        { icon: Zap, title: 'Dedicated Support', description: 'A consistent support relationship helps protect confidentiality while keeping work moving.' },
      ],
    },
    {
      title: 'Why families choose New Wave IT',
      cards: [
        { icon: Lock, title: 'Discretion & Confidentiality', description: 'Service is designed around careful communication, privacy, and the sensitive nature of family office work.' },
        { icon: Shield, title: 'Industry Expertise', description: 'We understand the need to balance complex technology with clear governance and a measured operational approach.' },
      ],
    },
  ],
  ctaTitle: 'Ready to discuss your family office technology?',
  ctaDescription: 'Talk with New Wave IT about a private, dependable technology program built for your office and its long-term needs.',
};

const SERVICE_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  provider: { '@id': 'https://www.newwaveitfl.com/#business' },
  name: 'Family Office IT Services',
  description: 'Privacy-first, compliant IT infrastructure and wealth management technology for family offices and multi-generational family enterprises in South Florida.',
  areaServed: { '@type': 'City', name: 'Fort Lauderdale' },
  serviceType: 'Family Office IT',
  url: 'https://www.newwaveitfl.com/service-category/family-offices',
};

export default function FamilyOfficesServicePage() {
  usePageMeta({ ...IT_PAGE_META['/service-category/family-offices'], jsonLd: SERVICE_JSON_LD });

  return <ServiceCategoryPage data={service} />;
}
