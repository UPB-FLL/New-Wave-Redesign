import { AlertTriangle, Radio, Signal, Users, Wifi, Zap } from 'lucide-react';
import { ServiceCategoryPage, type ServiceCategoryPageData } from '../components/brand/ServiceCategoryPage';
import { usePageMeta } from '../lib/usePageMeta';

const service: ServiceCategoryPageData = {
  icon: Signal,
  name: 'Cellular DAS & Public Safety',
  heroTitle: 'Critical communications built for coverage',
  description: 'Distributed antenna systems and critical communications infrastructure for emergency services, large venues, and public safety agencies.',
  heroDescription: 'Plan reliable in-building coverage, FirstNet integration, and communications systems that teams can depend on when it matters.',
  details: 'Deploy reliable cellular coverage, FirstNet integration, and communication systems designed around the operational needs of emergency responders, public safety agencies, and large facilities.',
  highlights: ['DAS design & installation', 'FirstNet responder network', 'In-building cellular coverage', 'Large venue connectivity', 'Redundant communication systems', 'Emergency response support', 'Network monitoring & maintenance', 'Compliance & certification'],
  seoLink: '/l/cellular-das-public-safety-guide',
  eyebrow: 'Critical Communications',
  assessmentLabel: 'Plan Your Coverage',
  featureTitle: 'Communications solutions',
  featureCards: [
    { icon: Radio, title: 'Distributed Antenna Systems', description: 'In-building DAS design and installation support stronger, more consistent cellular coverage where it is needed.' },
    { icon: Signal, title: 'FirstNet & Responder Networks', description: 'Support for responder-focused cellular networks and communication planning for public safety operations.' },
    { icon: AlertTriangle, title: 'Emergency Response Ready', description: 'Resilient communication design supports facilities and teams preparing for incidents and critical events.' },
  ],
  sections: [
    {
      title: 'Building reliable coverage',
      items: ['Assess the facility, current coverage, building materials, and operational requirements.', 'Design a coverage and capacity approach that fits the space and its critical users.', 'Install, validate, document, and maintain the system as the facility evolves.'],
    },
    {
      title: 'Applications & use cases',
      cards: [
        { icon: Users, title: 'Public Safety & Government', description: 'Support communication infrastructure for agencies, civic buildings, emergency operations, and critical facilities.' },
        { icon: Wifi, title: 'Large Venues & Facilities', description: 'Improve coverage and capacity for venues, campuses, hospitality environments, and complex buildings.' },
        { icon: Zap, title: 'Critical Operations', description: 'Plan the resilient connectivity required by teams where delayed communication can materially affect operations.' },
      ],
    },
  ],
  ctaTitle: 'Ready to improve critical communications coverage?',
  ctaDescription: 'Talk to New Wave IT about a DAS or public safety communication program built around your facility and the people who rely on it.',
};

export default function CellularDASPublicSafetyServicePage() {
  usePageMeta({
    title: 'Cellular DAS & Public Safety Communications | FirstNet Solutions',
    description: 'Distributed antenna systems for emergency responders, public safety agencies, and large venues. FirstNet integration, in-building coverage, and critical communications.',
    keywords: 'cellular DAS, public safety networks, FirstNet, in-building coverage, emergency communications, responder networks',
    canonical: 'https://www.newwaveitfl.com/service-category/cellular-das-and-public-safety',
  });

  return <ServiceCategoryPage data={service} />;
}
