import { AlertTriangle, BarChart3, Eye, Lock, Shield, Users } from 'lucide-react';
import { ServiceCategoryPage, type FaqItem, type ServiceCategoryPageData } from '../components/brand/ServiceCategoryPage';
import { IT_PAGE_META } from '../lib/routeMeta';
import { servicePageJsonLd } from '../lib/serviceSchema';
import { usePageMeta } from '../lib/usePageMeta';

const PATH = '/service-category/cybersecurity';

const OFFICE_ADDRESS = '710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311';
const PHONE = '(561) 564-1846';

// One list for the page and for its FAQPage node, so the markup states exactly what is shown.
// Cybersecurity has no line of its own on the price list, and nothing says which published
// rate covers it, so the cost answer gives no figure and no unit: the price is a written quote.
const faqs: FaqItem[] = [
  {
    question: 'What does a managed service provider (MSP) do for cybersecurity?',
    answer:
      "A managed service provider (MSP) is a company that runs another business's IT for a recurring fee, and security is part of that work. For cybersecurity an MSP typically keeps protection on computers and servers, monitors for threats, responds to incidents, tests for weaknesses and trains employees. New Wave IT is an MSP in Fort Lauderdale, Florida, and cybersecurity is one of the services it provides.",
  },
  {
    question: "What does New Wave IT's cybersecurity service include?",
    answer:
      "New Wave IT's cybersecurity service includes threat monitoring, advanced threat detection with behavioral analysis, multi-layer endpoint and network protection, and a zero-trust architecture. It also includes vulnerability assessment and penetration testing, incident response and forensic investigation, employee security awareness training, and regulatory compliance management.",
  },
  {
    question: 'How much do cybersecurity services cost?',
    answer:
      "New Wave IT does not publish one price for cybersecurity by itself. Cybersecurity is priced in a written quote after a security assessment of the business. New Wave IT's published monthly rates are listed on the pricing page.",
  },
  {
    question: 'Which areas does New Wave IT serve, and is cybersecurity work done remotely or on site?',
    answer:
      `New Wave IT serves businesses in Broward, Miami-Dade and Palm Beach counties from its office at ${OFFICE_ADDRESS}, by remote support and on-site visits. ` +
      'In general, monitoring and endpoint protection run through software installed on each device, so that work is done remotely. New Wave IT has no office in Miami-Dade or Palm Beach County; businesses there are served from Fort Lauderdale.',
  },
  {
    question: 'Does New Wave IT help with HIPAA, PCI-DSS or SOC 2 requirements?',
    answer:
      "Yes. New Wave IT's cybersecurity service offers support for HIPAA, PCI-DSS, SOC 2 and other requirements through a managed compliance roadmap. An IT provider puts technical controls in place and documents them. It does not certify a business as compliant, and responsibility for meeting each requirement stays with the business.",
  },
  {
    question: "How does a business get started with New Wave IT's cybersecurity service?",
    answer: `The first step is a security assessment, which identifies vulnerabilities and leads to a practical security roadmap. New Wave IT then provides a written quote, followed by onboarding. To schedule an assessment, use the contact page or call ${PHONE}.`,
  },
];

const service: ServiceCategoryPageData = {
  icon: Shield,
  name: 'Cybersecurity',
  heroTitle: 'Enterprise-grade security defense',
  description: 'Enterprise-grade security solutions to protect your business from evolving cyber threats.',
  heroDescription: 'Protect your organization with around-the-clock monitoring, advanced threat detection, and incident response planning.',
  overviewTitle: 'What cybersecurity services does a small business need from an IT provider?',
  details:
    'A small business generally needs its IT provider to cover a short list of security work: protection on its computers and servers, threat monitoring with a plan for responding to incidents, regular testing for weaknesses, a network split into separate zones, security awareness training for employees, and help with the regulations and standards that apply to its data. ' +
    'New Wave IT, an IT company in Fort Lauderdale, Florida, covers each item on that list in its cybersecurity program. The program provides threat monitoring, advanced detection capabilities and response protocols designed to protect the way an organization works.',
  overviewBody: [
    `New Wave IT is a managed IT services provider (MSP) founded in 2022, with a staffed office at ${OFFICE_ADDRESS}. ` +
      'From that office it provides cybersecurity services to businesses in Broward, Miami-Dade and Palm Beach counties by remote support and on-site visits. ' +
      'The tools its team runs include SentinelOne and Huntress, and New Wave IT is a Huntress partner. ' +
      'Cybersecurity has no single published price: it is priced in a written quote after a security assessment of the business. ' +
      'Office hours are Monday to Friday, 8am to 6pm, and New Wave IT keeps a 24/7 emergency line.',
  ],
  highlights: ['24/7 SOC monitoring', 'Zero-trust architecture', 'Advanced threat detection & behavioral analysis', 'Comprehensive vulnerability assessment & penetration testing', 'Regulatory compliance management', 'Incident response & forensic investigation', 'Employee security awareness training', 'Multi-layer endpoint & network protection'],
  seoLink: '/l/cybersecurity-guide',
  assessmentLabel: 'Schedule a security assessment',
  featureTitle: 'Security framework',
  featureCards: [
    { icon: Lock, title: 'Zero-Trust Architecture', description: 'Continuous authentication and authorization help remove implicit trust from users, devices, and systems.' },
    { icon: Eye, title: 'Threat Detection & Response', description: 'Behavioral analysis and monitoring help identify and respond to incidents with a clear containment plan.' },
    { icon: BarChart3, title: 'Compliance & Governance', description: 'Support for HIPAA, PCI-DSS, SOC 2, and other requirements through a managed compliance roadmap.' },
  ],
  sections: [
    {
      title: 'Attack surface management',
      // What the term means, above the three cards the section has always had.
      body: [
        "An attack surface is every point where an attacker could get into a business's systems: each computer, server, user account, network connection and service that faces the internet. " +
          'Attack surface management is the ongoing work of finding those points and closing or protecting them. ' +
          'Under this part of its cybersecurity service, New Wave IT uses regular vulnerability assessments and penetration testing to reveal security gaps, applies layered endpoint protection across devices, and segments the network so that critical systems and sensitive data are isolated. ' +
          'Segmentation limits how far an intruder can move after getting into one device.',
      ],
      cards: [
        { icon: AlertTriangle, title: 'Vulnerability Assessment & Penetration Testing', description: 'Regular assessments and real-world testing help reveal security gaps before they become incidents.' },
        { icon: Shield, title: 'Endpoint Protection', description: 'Layered endpoint controls support behavior-based detection, sandboxing, and automated response across devices.' },
        { icon: Lock, title: 'Network Segmentation', description: 'Isolation of critical systems and sensitive data can limit lateral movement and contain breaches.' },
      ],
      callout: 'Proactive security investments can reduce exposure and support long-term resilience.',
    },
    {
      title: 'Incident response & forensics',
      body: [
        'Incident response is the work that follows a detected security incident: containing it, establishing what happened, restoring systems and fixing the weakness that allowed it. ' +
          "New Wave IT's incident response and forensics work covers each of those stages through containment procedures, digital forensics, and recovery and hardening.",
      ],
      cards: [
        { icon: AlertTriangle, title: 'Rapid Response', description: 'Containment procedures are ready to activate quickly to help limit damage and protect sensitive data.' },
        { icon: Eye, title: 'Digital Forensics', description: 'Evidence preservation and documentation support regulatory response and a full understanding of each incident.' },
        { icon: Users, title: 'Recovery & Hardening', description: 'After recovery, we identify root causes and help implement improvements that reduce the chance of recurrence.' },
      ],
    },
  ],
  faqs,
  relatedLinks: [
    { label: 'South Florida service areas', href: '/managed-it-services-south-florida', description: 'The three counties New Wave IT serves and the page for each area.' },
    { label: 'Managed IT services in Fort Lauderdale', href: '/managed-it-services-fort-lauderdale', description: 'Monitoring, patching, backup and endpoint protection for Fort Lauderdale and Broward County businesses.' },
    { label: 'Pricing', href: '/pricing', description: "New Wave IT's published monthly rates and a quote builder." },
    { label: 'Complete cybersecurity guide', href: '/l/cybersecurity-guide', description: 'A longer read on building a layered security program.' },
  ],
  relatedTitle: 'Areas served, pricing and the cybersecurity guide',
  ctaTitle: 'Ready to strengthen your security posture?',
  ctaDescription: 'Schedule a confidential security assessment to identify vulnerabilities and develop a practical security roadmap.',
};

// The Service node keeps the name, description and type this page has always declared.
const jsonLd = servicePageJsonLd({
  path: PATH,
  name: 'Cybersecurity Services',
  description: 'Enterprise-grade cybersecurity for South Florida businesses including 24/7 SOC monitoring, endpoint protection, SIEM, penetration testing, and compliance management.',
  serviceType: 'Cybersecurity',
  areaServed: [
    { '@type': 'City', name: 'Fort Lauderdale' },
    { '@type': 'AdministrativeArea', name: 'Broward County' },
    { '@type': 'AdministrativeArea', name: 'Miami-Dade County' },
    { '@type': 'AdministrativeArea', name: 'Palm Beach County' },
  ],
  faqs,
});

export default function CybersecurityServicePage() {
  usePageMeta({ ...IT_PAGE_META[PATH], jsonLd });

  return <ServiceCategoryPage data={service} breadcrumbs={IT_PAGE_META[PATH].breadcrumbs} />;
}
