import { Clock, DollarSign, Headphones, MapPin, Monitor, Shield } from 'lucide-react';
import { ServiceCategoryPage, type ServiceCategoryPageData } from '../components/brand/ServiceCategoryPage';
import { IT_PAGE_META } from '../lib/routeMeta';
import { usePageMeta } from '../lib/usePageMeta';

// Local landing page for "IT support Fort Lauderdale". Every claim here is one
// the site already makes elsewhere (prices from /pricing, partners from the
// trust bar); no figures that the business has not confirmed.
const page: ServiceCategoryPageData = {
  icon: Headphones,
  name: 'IT Support in Fort Lauderdale',
  heroTitle: 'IT support for Fort Lauderdale businesses',
  description: 'Help desk, remote, and on-site IT support from a local Fort Lauderdale team.',
  heroDescription:
    'A local team for the help desk tickets, device problems, and network issues that slow your staff down, with flat per-device pricing and no long-term contract.',
  details:
    'New Wave IT supports offices across Fort Lauderdale and Broward County from 710 NW 5th Ave. Your team reaches real technicians by phone, email, or ticket, and we come on site when a problem needs hands on hardware.',
  highlights: [
    '24/7 help desk access',
    'Remote and on-site support',
    'Local Fort Lauderdale team',
    'Flat per-device pricing',
    'No long-term contracts',
    'Microsoft, Cisco, and Huntress partner',
  ],
  seoLink: '/pricing',
  guideLabel: 'See our pricing',
  assessmentLabel: 'Get a free IT assessment',
  featureTitle: 'What IT support covers',
  featureDescription: 'Day-to-day help for the people and devices your business runs on.',
  featureCards: [
    { icon: Headphones, title: 'Help Desk', description: 'Password resets, email and Microsoft 365 problems, printers, and the everyday questions that stop work.' },
    { icon: Monitor, title: 'Devices and Repair', description: 'Laptops, desktops, and servers diagnosed, repaired, upgraded, or replaced.' },
    { icon: Shield, title: 'Security Basics', description: 'Endpoint protection, patching, and email filtering on every device we support.' },
  ],
  sections: [
    {
      title: 'Published, per-device pricing',
      cards: [
        { icon: DollarSign, title: '$105 per computer', description: 'Per computer or device, per month, from our published price list.' },
        { icon: DollarSign, title: '$5 per user', description: 'Per employee or user account, per month.' },
        { icon: DollarSign, title: '$175 per server', description: 'Per managed server, per month. Network monitoring is $50 per location.' },
      ],
    },
    {
      title: 'How getting started works',
      ordered: true,
      items: [
        'A free assessment of your devices, accounts, and the problems your staff report most.',
        'A written quote from the published rates, with no long-term contract.',
        'Onboarding: we take over support and you get one number to call.',
      ],
    },
    {
      title: 'Where we work',
      cards: [
        { icon: MapPin, title: 'Fort Lauderdale', description: 'Our office is at 710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311.' },
        { icon: Clock, title: 'Broward and South Florida', description: 'Remote support anywhere; on-site visits across Broward County and South Florida.' },
      ],
    },
  ],
  ctaTitle: 'Need IT support in Fort Lauderdale?',
  ctaDescription: 'Tell us what is slowing your team down, or call us now.',
};

export default function ITSupportFortLauderdalePage() {
  usePageMeta({
    ...IT_PAGE_META['/it-support-fort-lauderdale'],
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      provider: { '@id': 'https://www.newwaveitfl.com/#business' },
      name: 'IT Support in Fort Lauderdale',
      description: 'Help desk, remote, and on-site IT support for Fort Lauderdale businesses with flat per-device pricing.',
      areaServed: { '@type': 'City', name: 'Fort Lauderdale' },
      serviceType: 'IT Support',
      url: 'https://www.newwaveitfl.com/it-support-fort-lauderdale',
    },
  });

  return <ServiceCategoryPage data={page} breadcrumbs={IT_PAGE_META['/it-support-fort-lauderdale'].breadcrumbs} />;
}
