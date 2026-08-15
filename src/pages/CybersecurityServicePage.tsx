import { AlertTriangle, BarChart3, Eye, Lock, Shield, Users } from 'lucide-react';
import { ServiceCategoryPage, type ServiceCategoryPageData } from '../components/brand/ServiceCategoryPage';
import { usePageMeta } from '../lib/usePageMeta';

const service: ServiceCategoryPageData = {
  icon: Shield,
  name: 'Cybersecurity',
  heroTitle: 'Enterprise-grade security defense',
  description: 'Enterprise-grade security solutions to protect your business from evolving cyber threats.',
  heroDescription: 'Protect your organization with around-the-clock monitoring, advanced threat detection, and incident response planning.',
  details: 'Our cybersecurity program provides threat monitoring, advanced detection capabilities, and response protocols designed to protect the way your organization works.',
  highlights: ['24/7 SOC monitoring', 'Zero-trust architecture', 'Advanced threat detection & behavioral analysis', 'Comprehensive vulnerability assessment & penetration testing', 'Regulatory compliance management', 'Incident response & forensic investigation', 'Employee security awareness training', 'Multi-layer endpoint & network protection'],
  seoLink: '/l/cybersecurity-guide',
  eyebrow: 'Cybersecurity Services',
  assessmentLabel: 'Schedule Security Assessment',
  featureTitle: 'Security framework',
  featureCards: [
    { icon: Lock, title: 'Zero-Trust Architecture', description: 'Continuous authentication and authorization help remove implicit trust from users, devices, and systems.' },
    { icon: Eye, title: 'Threat Detection & Response', description: 'Behavioral analysis and monitoring help identify and respond to incidents with a clear containment plan.' },
    { icon: BarChart3, title: 'Compliance & Governance', description: 'Support for HIPAA, PCI-DSS, SOC 2, and other requirements through a managed compliance roadmap.' },
  ],
  sections: [
    {
      title: 'Attack surface management',
      cards: [
        { icon: AlertTriangle, title: 'Vulnerability Assessment & Penetration Testing', description: 'Regular assessments and real-world testing help reveal security gaps before they become incidents.' },
        { icon: Shield, title: 'Endpoint Protection', description: 'Layered endpoint controls support behavior-based detection, sandboxing, and automated response across devices.' },
        { icon: Lock, title: 'Network Segmentation', description: 'Isolation of critical systems and sensitive data can limit lateral movement and contain breaches.' },
      ],
      callout: 'The average breach costs organizations $4.45 million. Proactive security investments can reduce exposure and support long-term resilience.',
    },
    {
      title: 'Incident response & forensics',
      cards: [
        { icon: AlertTriangle, title: 'Rapid Response', description: 'Containment procedures are ready to activate quickly to help limit damage and protect sensitive data.' },
        { icon: Eye, title: 'Digital Forensics', description: 'Evidence preservation and documentation support regulatory response and a full understanding of each incident.' },
        { icon: Users, title: 'Recovery & Hardening', description: 'After recovery, we identify root causes and help implement improvements that reduce the chance of recurrence.' },
      ],
    },
  ],
  ctaTitle: 'Ready to strengthen your security posture?',
  ctaDescription: 'Schedule a confidential security assessment to identify vulnerabilities and develop a practical security roadmap.',
};

export default function CybersecurityServicePage() {
  usePageMeta({
    title: 'Cybersecurity Services Fort Lauderdale — Threat Protection & Compliance',
    description: 'Enterprise cybersecurity for South Florida businesses: 24/7 SOC monitoring, endpoint protection, SIEM, penetration testing, and HIPAA/SOC 2 compliance. Call New Wave IT today.',
    keywords: 'cybersecurity Fort Lauderdale, managed security services South Florida, threat detection Fort Lauderdale, SOC monitoring, SIEM, penetration testing South Florida, endpoint protection, HIPAA compliance IT, cybersecurity company Fort Lauderdale',
    canonical: 'https://www.newwaveitfl.com/service-category/cybersecurity',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      provider: { '@id': 'https://www.newwaveitfl.com/#business' },
      name: 'Cybersecurity Services',
      description: 'Enterprise-grade cybersecurity for South Florida businesses including 24/7 SOC monitoring, endpoint protection, SIEM, penetration testing, and compliance management.',
      areaServed: { '@type': 'City', name: 'Fort Lauderdale' },
      serviceType: 'Cybersecurity',
      url: 'https://www.newwaveitfl.com/service-category/cybersecurity',
    },
  });

  return <ServiceCategoryPage data={service} />;
}
