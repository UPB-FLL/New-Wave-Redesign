import { AlertTriangle, GitBranch, Network, Shield, Wifi, Zap } from 'lucide-react';
import { ServiceCategoryPage, type ServiceCategoryPageData } from '../components/brand/ServiceCategoryPage';
import { usePageMeta } from '../lib/usePageMeta';

const service: ServiceCategoryPageData = {
  icon: Network,
  name: 'Network Infrastructure',
  heroTitle: 'Network infrastructure designed for continuity',
  description: 'Modern network design, deployment, and management for enterprise reliability.',
  heroDescription: 'Build fast, secure, and resilient connections from the physical layer through remote access.',
  details: 'From fiber installation to firewall configuration to wireless deployment, we design networks that are fast, secure, and built with appropriate redundancy.',
  highlights: ['Network architecture & design', 'Fiber cabling & installation', 'WiFi 6 mesh deployment', 'Firewall & intrusion prevention', 'Network segmentation & VLANs', 'VPN & remote access', 'Redundancy & failover', 'Network monitoring & analytics'],
  seoLink: '/l/network-infrastructure-guide',
  eyebrow: 'Network Infrastructure',
  assessmentLabel: 'Plan Your Network',
  featureTitle: 'Network architecture principles',
  featureCards: [
    { icon: Network, title: 'Layered Architecture', description: 'Well-defined core, distribution, and access layers make the environment easier to operate and evolve.' },
    { icon: GitBranch, title: 'Redundancy', description: 'Thoughtful redundancy and failover planning reduce the impact of common points of failure.' },
    { icon: Shield, title: 'Security', description: 'Security controls are considered throughout design, not added as an afterthought.' },
  ],
  sections: [
    {
      title: 'Cabling & connectivity',
      cards: [
        { icon: Zap, title: 'Fiber Infrastructure', description: 'High-capacity fiber design and installation for facilities that need performance and room to grow.' },
        { icon: Network, title: 'Copper Cabling', description: 'Structured copper cabling, labeling, and documentation for dependable access-layer connectivity.' },
      ],
    },
    {
      title: 'Wireless & remote access',
      cards: [
        { icon: Wifi, title: 'WiFi 6 Mesh Networks', description: 'Modern wireless coverage planning for buildings, users, and connected devices.' },
        { icon: GitBranch, title: 'VPN & Remote Access', description: 'Secure remote access that gives employees and partners appropriate connectivity from outside the office.' },
      ],
    },
    {
      title: 'Network security',
      cards: [
        { icon: Shield, title: 'Firewall & Intrusion Prevention', description: 'Firewall policy, inspection, and intrusion prevention aligned with the network design.' },
        { icon: Network, title: 'Network Segmentation', description: 'Segmentation and VLAN strategy help separate critical systems, users, and guest traffic.' },
        { icon: AlertTriangle, title: 'Access Control Lists', description: 'Purposeful access rules give the right systems the right connectivity, with less unnecessary exposure.' },
      ],
    },
    {
      title: 'Network monitoring & optimization',
      cards: [
        { icon: Network, title: 'Real-Time Monitoring', description: 'Visibility into network health, availability, and device status helps teams respond with context.' },
        { icon: GitBranch, title: 'Performance Analytics', description: 'Performance trends support capacity planning and prioritize the improvements that matter most.' },
      ],
    },
  ],
  ctaTitle: 'Ready to improve your network foundation?',
  ctaDescription: 'Talk with New Wave IT about a network design that supports secure access, performance, and business continuity.',
};

export default function NetworkInfrastructureServicePage() {
  usePageMeta({
    title: 'Network Infrastructure Fort Lauderdale — WiFi, Cabling & Firewalls',
    description: 'Business network design, structured cabling, WiFi 6, firewall deployment, and VPN for Fort Lauderdale and South Florida. Fast, secure, and redundant — built by New Wave IT.',
    keywords: 'network infrastructure Fort Lauderdale, business WiFi South Florida, structured cabling Fort Lauderdale, firewall installation, VPN setup, network design South Florida, network security Fort Lauderdale',
    canonical: 'https://www.newwaveitfl.com/service-category/network-infrastructure',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      provider: { '@id': 'https://www.newwaveitfl.com/#business' },
      name: 'Network Infrastructure & Design',
      description: 'Business network design, structured cabling, WiFi 6, firewall deployment, and VPN solutions for Fort Lauderdale and South Florida businesses.',
      areaServed: { '@type': 'City', name: 'Fort Lauderdale' },
      serviceType: 'Network Infrastructure',
      url: 'https://www.newwaveitfl.com/service-category/network-infrastructure',
    },
  });

  return <ServiceCategoryPage data={service} />;
}
