import { Crown, Home, Lock, Users, Wifi, Zap } from 'lucide-react';
import { ServiceCategoryPage, type ServiceCategoryPageData } from '../components/brand/ServiceCategoryPage';
import { usePageMeta } from '../lib/usePageMeta';

const service: ServiceCategoryPageData = {
  icon: Crown,
  name: 'Luxury',
  heroTitle: 'Technology that feels effortless to use',
  description: 'Premium technology solutions for luxury properties, resorts, and high-end hospitality with bespoke automation and security.',
  heroDescription: 'Create a calm, connected guest and resident experience with thoughtful automation, connectivity, and support.',
  details: 'White-glove IT services for luxury residential properties, resorts, and hospitality venues support seamless experiences and focused operations.',
  highlights: ['Smart home & building automation', 'Premium guest WiFi & networking', 'Concierge technology platforms', 'Integrated entertainment systems', 'Luxury brand security solutions', 'Seamless guest connectivity', 'Discreet 24/7 technical support', 'Custom automation & integration'],
  seoLink: '/l/luxury-guide',
  eyebrow: 'Luxury Technology',
  assessmentLabel: 'Discuss Your Property',
  featureTitle: 'Luxury technology solutions',
  featureCards: [
    { icon: Home, title: 'Smart Automation', description: 'Intuitive home and building automation coordinated around comfort, operations, and the property experience.' },
    { icon: Wifi, title: 'Premium Guest Connectivity', description: 'Reliable connectivity and network design that can feel invisible to guests while remaining manageable for staff.' },
    { icon: Lock, title: 'Discrete Security', description: 'Technology security practices designed to protect the property and its guests without unnecessary friction.' },
  ],
  sections: [
    {
      title: 'Elevating the guest experience',
      cards: [
        { icon: Zap, title: 'Connected Environments', description: 'Coordinate lighting, entertainment, access, climate, and connectivity around the expectations of the property.' },
        { icon: Users, title: 'Concierge Enablement', description: 'Give hospitality teams the tools and visibility they need to deliver consistent, responsive service.' },
        { icon: Wifi, title: 'Reliable Coverage', description: 'Plan network coverage and capacity around guests, residences, outdoor areas, and operational needs.' },
      ],
    },
    {
      title: 'Why luxury properties choose us',
      cards: [
        { icon: Crown, title: 'Invisible Excellence', description: 'The best property technology supports the experience without asking guests to think about the underlying systems.' },
        { icon: Home, title: 'Luxury Property Understanding', description: 'We bring a measured approach to the integration, privacy, service, and quality expectations of premium environments.' },
      ],
    },
  ],
  ctaTitle: 'Ready to plan a more connected property?',
  ctaDescription: 'Talk with New Wave IT about technology that supports a refined guest or resident experience and dependable property operations.',
};

export default function LuxuryServicePage() {
  usePageMeta({
    title: 'Luxury Property IT Services | High-End Smart Home & Automation',
    description: 'Premium IT solutions for luxury properties, resorts, and high-end hospitality. Smart home automation, guest WiFi, and white-glove technical support.',
    keywords: 'luxury property IT, smart home automation, high-end WiFi, concierge technology, resort IT services',
    canonical: 'https://www.newwaveitfl.com/service-category/luxury',
  });

  return <ServiceCategoryPage data={service} />;
}
