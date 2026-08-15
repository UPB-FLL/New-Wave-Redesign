import { Cpu, HardDrive, Shield, TrendingUp, Wrench, Zap } from 'lucide-react';
import { ServiceCategoryPage, type ServiceCategoryPageData } from '../components/brand/ServiceCategoryPage';
import { usePageMeta } from '../lib/usePageMeta';

const service: ServiceCategoryPageData = {
  icon: Wrench,
  name: 'IT Repair & Upgrades',
  heroTitle: 'Repair with a plan for what comes next',
  description: 'Expert hardware repair and strategic upgrades to extend equipment lifespan.',
  heroDescription: 'From laptop repair to server upgrades, we diagnose the issue and recommend the most practical path forward.',
  details: 'From laptop repairs to server upgrades, we diagnose issues, replace failed components, and optimize hardware for dependable performance.',
  highlights: ['Comprehensive hardware diagnostics', 'Component replacement & repair', 'Data preservation & recovery', 'Performance testing & validation', 'Warranty & support coverage', 'Environmental assessment', 'Lifecycle management', 'Emergency on-site repair'],
  seoLink: '/l/it-repair-guide',
  eyebrow: 'IT Repair & Upgrades',
  assessmentLabel: 'Request a Hardware Review',
  featureTitle: 'The right time to repair or replace',
  featureCards: [
    { icon: Wrench, title: 'Repair When It Makes Sense', description: 'Repair is often practical when a single component has failed, the cost is contained, or data recovery is the priority.' },
    { icon: TrendingUp, title: 'Replace for Long-Term Value', description: 'Replacement can be the better route when failures compound, repair costs approach new hardware, or performance needs have changed.' },
    { icon: Shield, title: 'Data Safety First', description: 'Device work begins with a plan for data preservation, validation, and careful handling of sensitive information.' },
  ],
  sections: [
    {
      title: 'High-impact upgrades',
      cards: [
        { icon: HardDrive, title: 'SSD Upgrade', description: 'A solid-state drive can improve system responsiveness, startup time, and day-to-day productivity.' },
        { icon: Cpu, title: 'RAM Expansion', description: 'More memory gives modern workloads room to run and can extend the useful life of capable hardware.' },
        { icon: Zap, title: 'Battery Replacement', description: 'For laptop users, a healthy battery improves mobility and supports more reliable work away from a desk.' },
      ],
    },
    {
      title: 'Our repair process',
      items: ['Diagnose the issue and explain the available options.', 'Protect data and document the planned repair or upgrade.', 'Complete the work, validate performance, and return the equipment with clear next steps.'],
      callout: 'Every repair starts with a data-safety plan. We preserve critical files where possible and confirm performance before the device returns to service.',
    },
  ],
  ctaTitle: 'Ready to get your equipment working better?',
  ctaDescription: 'Request a hardware review and get a practical repair or upgrade recommendation from New Wave IT.',
};

export default function ITRepairServicePage() {
  usePageMeta({
    title: 'IT Hardware Repair & Upgrades | New Wave IT',
    description: 'Expert laptop, desktop, and server repair with data protection. Strategic hardware upgrades to extend equipment life and boost performance.',
    keywords: 'hardware repair, computer repair, laptop repair, server repair, hardware upgrades, SSD upgrade',
    canonical: 'https://www.newwaveitfl.com/service-category/it-repair-upgrades',
  });

  return <ServiceCategoryPage data={service} />;
}
