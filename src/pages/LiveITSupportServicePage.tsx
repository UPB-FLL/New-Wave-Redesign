import { Award, Clock, Globe, Headphones, MessageSquare, Zap } from 'lucide-react';
import { ServiceCategoryPage, type ServiceCategoryPageData } from '../components/brand/ServiceCategoryPage';
import { usePageMeta } from '../lib/usePageMeta';

const service: ServiceCategoryPageData = {
  icon: Headphones,
  name: 'Live IT Support',
  heroTitle: 'Support that keeps work moving',
  description: 'Around-the-clock technical support with dedicated engineers responding in minutes.',
  heroDescription: 'Reach a practical support team by phone, email, chat, or on-site when the work calls for it.',
  details: 'Our live support team is available 24/7 via phone, email, chat, and on-site. We prioritize critical issues and maintain detailed ticket tracking throughout the process.',
  highlights: ['Dedicated account management & priority routing', 'Sub-hour response times', 'Remote & on-site support', 'Advanced ticket tracking', 'Comprehensive knowledge base', 'Escalation management & executive reporting', 'Phone/email/chat/in-person support', 'Technician training & mentoring'],
  seoLink: '/l/it-support-guide',
  eyebrow: 'Live IT Support',
  assessmentLabel: 'Talk to Support',
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
  ctaTitle: 'Need dependable IT support?',
  ctaDescription: 'Talk to the New Wave IT team about support coverage that matches the way your organization works.',
  ctaLabel: 'Contact Support',
};

export default function LiveITSupportServicePage() {
  usePageMeta({
    title: '24/7 IT Support Fort Lauderdale — Live Help Desk South Florida',
    description: 'Round-the-clock IT support for Fort Lauderdale businesses. Response times under 1 hour — phone, remote, and on-site. Real technicians, real fast. New Wave IT.',
    keywords: 'IT support Fort Lauderdale, 24/7 IT help desk South Florida, technical support Fort Lauderdale, managed help desk, remote IT support, on-site IT support South Florida, IT support company Fort Lauderdale',
    canonical: 'https://www.newwaveitfl.com/service-category/live-it-support',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      provider: { '@id': 'https://www.newwaveitfl.com/#business' },
      name: '24/7 Live IT Support',
      description: 'Round-the-clock technical support for South Florida businesses with response times under 1 hour via phone, remote access, and on-site visits.',
      areaServed: { '@type': 'City', name: 'Fort Lauderdale' },
      serviceType: 'IT Support',
      url: 'https://www.newwaveitfl.com/service-category/live-it-support',
    },
  });

  return <ServiceCategoryPage data={service} />;
}
