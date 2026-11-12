import { AlertTriangle, GitBranch, Network, Shield, Wifi, Zap } from 'lucide-react';
import { ServiceCategoryPage, type ServiceCategoryPageData } from '../components/brand/ServiceCategoryPage';
import { PUBLISHED_RATES, usd } from '../lib/publishedRates';
import { IT_PAGE_META } from '../lib/routeMeta';
import { servicePageJsonLd } from '../lib/serviceSchema';
import type { FaqItem } from '../lib/structuredData';
import { usePageMeta } from '../lib/usePageMeta';

const PATH = '/service-category/network-infrastructure';

// Network monitoring is the one part of this service on the price list. The
// figure comes from the price constants, so a price change is one edit.
const monitoringRate = `${usd(PUBLISHED_RATES.location.dollars)} per ${PUBLISHED_RATES.location.per} per month`;

// The questions the page shows; the FAQPage node is built from the same strings.
const faqs: FaqItem[] = [
  {
    question: 'What is network infrastructure?',
    answer:
      "Network infrastructure is the hardware and configuration that connect a business's computers, phones, printers and servers to each other and to the internet. It includes cabling, switches and routers, wireless access points, the firewall between the office and the internet, and the rules that decide which devices can reach which systems. New Wave IT designs, deploys and manages business networks from its office in Fort Lauderdale.",
  },
  {
    question: 'Does New Wave IT install network cabling and WiFi?',
    answer:
      'Yes. New Wave IT installs structured copper cabling with labeling and documentation, and plans and deploys WiFi 6 mesh networks for the building, its users and their connected devices. Structured cabling means a planned, labeled layout in which cables run back to a central patch panel, instead of being added one run at a time.',
  },
  {
    question: 'How much does network infrastructure work cost?',
    answer:
      `Network monitoring costs ${monitoringRate} on New Wave IT's published price list. Design, cabling, WiFi and firewall projects are priced in a written quote after a free IT assessment. No long-term contract is required. The full list of published rates is on the pricing page.`,
  },
  {
    question: 'Is network work done on site or remotely?',
    answer:
      "Both. Cabling, wireless access points and firewalls are installed on site, so New Wave IT visits the client's location for that work. Monitoring and many configuration changes can be done remotely once the network is in place. On-site visits and remote support both come from New Wave IT's Fort Lauderdale office and cover Broward, Miami-Dade and Palm Beach counties.",
  },
  {
    question: 'Which areas does New Wave IT serve for network infrastructure work?',
    answer:
      'New Wave IT serves businesses in Broward, Miami-Dade and Palm Beach counties. Its office is at 710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311, in Broward County. New Wave IT has no office in Miami-Dade or Palm Beach County; network work there is done by on-site visit and remote support from Fort Lauderdale.',
  },
  {
    question: 'How do I start a network project with New Wave IT?',
    answer:
      'Start with a free IT assessment. Call (561) 564-1846 or email support@newwaveitfl.com to arrange one; office hours are Monday to Friday, 8am to 6pm, and there is a 24/7 emergency line. After the assessment New Wave IT sends a written quote, and onboarding follows. Each engagement has a dedicated project manager.',
  },
];

const service: ServiceCategoryPageData = {
  icon: Network,
  name: 'Network Infrastructure',
  heroTitle: 'Network infrastructure designed for continuity',
  description: 'Modern network design, deployment, and management for enterprise reliability.',
  heroDescription: 'Build fast, secure, and resilient connections from the physical layer through remote access.',
  overviewTitle: 'What does business network infrastructure work cover?',
  details:
    'Business network infrastructure work covers the design, deployment and management of an office network: cabling, wireless, firewalls, remote access and monitoring. New Wave IT, a managed IT services provider based in Fort Lauderdale, does this work for businesses in Broward, Miami-Dade and Palm Beach counties. A project can run from fiber installation and structured copper cabling, through WiFi 6 wireless and VPN remote access, to firewall configuration, intrusion prevention and network segmentation with VLANs, with network monitoring once everything is in place. New Wave IT designs networks that are fast, secure and built with appropriate redundancy.',
  overviewBody: [
    'New Wave IT designs networks in layers. The access layer is where computers, phones and wireless access points connect; the distribution layer joins those connections together; and the core is the backbone that carries traffic between them. Keeping the layers well defined makes a network easier to operate and to change later. Redundancy and failover are planned in the design so that a common point of failure has less impact. Security is part of the design too, instead of being added afterward: firewall policy and intrusion prevention aligned with the network, VLANs that separate critical systems, users and guest traffic, and access rules that give the right systems the right connectivity. New Wave IT is a Cisco, Microsoft and Huntress partner.',
    `New Wave IT does network work on site and remotely from its office at 710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311, for businesses in Broward, Miami-Dade and Palm Beach counties. Once a network is running, monitoring gives visibility into its health, availability and device status, and performance trends support capacity planning and show which improvements matter most. Network monitoring is on New Wave IT's published price list at ${monitoringRate}. Design, cabling, WiFi and firewall projects are priced in a written quote after a free IT assessment.`,
  ],
  highlights: ['Network architecture & design', 'Fiber cabling & installation', 'WiFi 6 mesh deployment', 'Firewall & intrusion prevention', 'Network segmentation & VLANs', 'VPN & remote access', 'Redundancy & failover', 'Network monitoring & analytics'],
  seoLink: '/l/network-infrastructure-guide',
  assessmentLabel: 'Plan your network',
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
  faqs,
  relatedLinks: [
    { label: 'Managed IT services in South Florida', href: '/managed-it-services-south-florida', description: 'The three counties New Wave IT serves from Fort Lauderdale, with links to each local page.' },
    { label: 'IT support in Fort Lauderdale', href: '/it-support-fort-lauderdale', description: 'Help desk, remote and on-site support for Fort Lauderdale and Broward County businesses.' },
    { label: 'Pricing', href: '/pricing', description: 'The published monthly rates, including the per-location rate for network monitoring.' },
    { label: 'Network infrastructure design guide', href: '/l/network-infrastructure-guide', description: 'A longer read on network design principles, security architecture and wireless planning.' },
  ],
  ctaTitle: 'Ready to improve your network foundation?',
  ctaDescription: 'Talk with New Wave IT about a network design that supports secure access, performance, and business continuity.',
};

const jsonLd = servicePageJsonLd({
  path: PATH,
  name: 'Network Infrastructure & Design',
  description: 'Business network design, structured cabling, WiFi 6, firewall deployment, and VPN solutions for Fort Lauderdale and South Florida businesses.',
  serviceType: 'Network Infrastructure',
  areaServed: [
    { '@type': 'City', name: 'Fort Lauderdale' },
    { '@type': 'AdministrativeArea', name: 'Broward County' },
    { '@type': 'AdministrativeArea', name: 'Miami-Dade County' },
    { '@type': 'AdministrativeArea', name: 'Palm Beach County' },
  ],
  faqs,
});

export default function NetworkInfrastructureServicePage() {
  usePageMeta({ ...IT_PAGE_META[PATH], jsonLd });

  return <ServiceCategoryPage data={service} breadcrumbs={IT_PAGE_META[PATH].breadcrumbs} />;
}
