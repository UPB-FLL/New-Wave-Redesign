import { BarChart3, DollarSign, Lock, MapPin, Monitor, RefreshCw } from 'lucide-react';
import { ServiceCategoryPage, type ServiceCategoryPageData } from '../components/brand/ServiceCategoryPage';
import { IT_PAGE_META } from '../lib/routeMeta';
import { usePageMeta } from '../lib/usePageMeta';

// Local landing page for "managed IT services Fort Lauderdale". Claims match
// what the site already states; prices come from the published /pricing list.
const page: ServiceCategoryPageData = {
  icon: Monitor,
  name: 'Managed IT Services in Fort Lauderdale',
  heroTitle: 'Managed IT services for Fort Lauderdale businesses',
  description: 'Fully managed IT for Fort Lauderdale offices at a flat monthly rate per device.',
  heroDescription:
    'Monitoring, patching, backup, security, and a help desk for your whole team, run by a Fort Lauderdale company for one predictable monthly fee.',
  details:
    'Managed IT means New Wave IT looks after your systems before something breaks: we monitor devices and servers, apply updates, manage backups, and plan upgrades with you, so problems are caught early and IT costs are known in advance.',
  highlights: [
    'Proactive monitoring',
    'Patch management',
    'Backup and recovery',
    'Help desk for every user',
    'Flat per-device pricing',
    'No long-term contracts',
  ],
  seoLink: '/l/managed-it-guide',
  guideLabel: 'Read the managed IT guide',
  assessmentLabel: 'Get a free IT assessment',
  featureTitle: 'What managed IT includes',
  featureDescription: 'One provider responsible for keeping your technology running, secure, and planned.',
  featureCards: [
    { icon: Monitor, title: 'Monitoring and Maintenance', description: 'Devices, servers, and your network watched and maintained so issues are found early.' },
    { icon: Lock, title: 'Security and Backup', description: 'Endpoint protection, patching, and managed backups with a recovery plan.' },
    { icon: BarChart3, title: 'Planning', description: 'Regular reviews of what to upgrade, replace, or budget for next.' },
  ],
  sections: [
    {
      title: 'What it costs',
      cards: [
        { icon: DollarSign, title: '$105 per computer', description: 'Per computer or device, per month, from our published price list.' },
        { icon: DollarSign, title: '$5 per user', description: 'Per employee or user account, per month.' },
        { icon: DollarSign, title: '$175 per server', description: 'Per managed server, per month; $50 per location for network monitoring.' },
      ],
    },
    {
      title: 'Switching to New Wave IT',
      ordered: true,
      items: [
        'Free assessment of your systems, support history, and risks.',
        'An onboarding plan with clear owners and dates.',
        'Steady-state managed support with regular reviews.',
      ],
    },
    {
      title: 'Local to Fort Lauderdale',
      cards: [
        { icon: MapPin, title: 'Our office', description: '710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311.' },
        { icon: RefreshCw, title: 'Partners', description: 'New Wave IT is a Microsoft, Cisco, and Huntress partner.' },
      ],
    },
  ],
  ctaTitle: 'Ready for managed IT in Fort Lauderdale?',
  ctaDescription: 'Start with a free assessment and a written quote from our published rates.',
};

export default function ManagedITFortLauderdalePage() {
  usePageMeta({
    ...IT_PAGE_META['/managed-it-services-fort-lauderdale'],
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      provider: { '@id': 'https://www.newwaveitfl.com/#business' },
      name: 'Managed IT Services in Fort Lauderdale',
      description: 'Fully managed IT for Fort Lauderdale businesses: monitoring, patching, backup, security, and help desk at flat per-device pricing.',
      areaServed: { '@type': 'City', name: 'Fort Lauderdale' },
      serviceType: 'Managed IT Services',
      url: 'https://www.newwaveitfl.com/managed-it-services-fort-lauderdale',
    },
  });

  return <ServiceCategoryPage data={page} breadcrumbs={IT_PAGE_META['/managed-it-services-fort-lauderdale'].breadcrumbs} />;
}
