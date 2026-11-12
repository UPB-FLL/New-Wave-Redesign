import { Cpu, HardDrive, Shield, TrendingUp, Wrench, Zap } from 'lucide-react';
import { ServiceCategoryPage, type FaqItem, type ServiceCategoryPageData } from '../components/brand/ServiceCategoryPage';
import { IT_PAGE_META } from '../lib/routeMeta';
import { servicePageJsonLd } from '../lib/serviceSchema';
import { usePageMeta } from '../lib/usePageMeta';

// Repair and upgrades for business equipment. No repair price is published, so
// the page says "a written quote" and quotes none of the monthly rates: nothing
// on the site says what those rates cover for a device that needs repair.
const PATH = '/service-category/it-repair-upgrades';

// Rendered by the page and handed to the FAQPage node, so the two cannot differ.
const faqs: FaqItem[] = [
  {
    question: 'What is a hardware upgrade?',
    answer:
      "A hardware upgrade replaces or adds a part in a computer that still works, so that it runs better or stays in service longer. New Wave IT's high-impact upgrades are a solid-state drive, which can improve responsiveness and startup time, more memory, which gives modern workloads room to run, and a replacement laptop battery, which supports work away from a desk.",
  },
  {
    question: "What does New Wave IT's repair and upgrade service include?",
    answer:
      "New Wave IT's repair and upgrade service covers business laptops, desktops and servers. It includes hardware diagnostics, component replacement and repair, data preservation and recovery, and performance testing and validation before a device returns to service. It also includes lifecycle management, which means planning when a machine should be repaired, upgraded or replaced.",
  },
  {
    question: 'How much does a business computer or server repair cost?',
    answer:
      'New Wave IT does not publish a price for repair or upgrade work. The cost of a job depends on what has failed and which parts it needs, so New Wave IT diagnoses the issue, explains the available options and sets out the cost in a written quote.',
  },
  {
    question: 'Is it better to repair or replace a business computer?',
    answer:
      'Repair is often the practical choice when a single component has failed, the cost is contained, or recovering data is the priority. Replacement can be the better route when failures compound, repair costs approach the price of new hardware, or performance needs have changed. New Wave IT recommends one or the other once it has diagnosed the device.',
  },
  {
    question: 'Is repair work done remotely or on site?',
    answer:
      'Both, depending on the job. Replacing or adding a part needs hands on the device, so hardware work is done in person, and New Wave IT makes on-site visits from its Fort Lauderdale office. Problems that can be diagnosed or fixed without touching the hardware are handled by remote support.',
  },
  {
    question: 'Which areas does New Wave IT cover for repairs and upgrades?',
    answer:
      'New Wave IT carries out repair and upgrade work for businesses in Broward, Miami-Dade and Palm Beach counties, in cities such as Fort Lauderdale, Miami, Boca Raton and West Palm Beach. Its office is at 710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311. New Wave IT has no office in Miami-Dade or Palm Beach County, and on-site visits there are made from Fort Lauderdale.',
  },
  {
    question: 'How do I request a repair or upgrade from New Wave IT?',
    answer:
      "Request a hardware review through New Wave IT's contact page, call (561) 564-1846 or email support@newwaveitfl.com. Office hours are Monday to Friday, 8am to 6pm, and there is a 24/7 emergency line. Work begins with a diagnosis and a plan to protect the data on the device.",
  },
];

const service: ServiceCategoryPageData = {
  icon: Wrench,
  name: 'IT Repair & Upgrades',
  heroTitle: 'Repair with a plan for what comes next',
  description: 'Expert hardware repair and strategic upgrades to extend equipment lifespan.',
  heroDescription: 'From laptop repair to server upgrades, we diagnose the issue and recommend the most practical path forward.',
  overviewTitle: 'What does business computer and server repair cover?',
  // The earlier overview sentence closes the paragraph, with "it" for "we".
  details:
    'Business computer and server repair covers finding out why a laptop, desktop or server has failed or slowed down, replacing the component at fault and testing the machine before it goes back into use. New Wave IT, a managed IT services provider founded in 2022 with an office in Fort Lauderdale, does this work for businesses in South Florida, along with upgrades to hardware that still runs. From laptop repairs to server upgrades, it diagnoses issues, replaces failed components and optimizes hardware for dependable performance, and it recommends the most practical path forward: repair, upgrade or replacement.',
  overviewBody: [
    'Every repair by New Wave IT starts with a data-safety plan, because a failed part can be replaced and the files on a business computer often cannot. Before a component is replaced, New Wave IT works out how the data on the device will be preserved and documents the planned repair or upgrade. Critical files are preserved where possible, and sensitive information is handled with care. When the work is complete, New Wave IT tests the device and confirms its performance before it returns to service, and the equipment is returned with clear next steps.',
    "Repair and upgrade work is run from New Wave IT's staffed office at 710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311, in Broward County. Businesses in Broward, Miami-Dade and Palm Beach counties are served from that office, by remote support and by on-site visit when a job needs hands on the hardware. Office hours are Monday to Friday, 8am to 6pm, and New Wave IT has a 24/7 emergency line. Repair and upgrade work is priced by written quote, and no repair price is published. The monthly rates that New Wave IT does publish are listed on the pricing page.",
  ],
  highlights: ['Comprehensive hardware diagnostics', 'Component replacement & repair', 'Data preservation & recovery', 'Performance testing & validation', 'Warranty & support coverage', 'Environmental assessment', 'Lifecycle management', 'Emergency on-site repair'],
  seoLink: '/l/it-repair-guide',
  assessmentLabel: 'Request a hardware review',
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
      ordered: true,
      items: ['Diagnose the issue and explain the available options.', 'Protect data and document the planned repair or upgrade.', 'Complete the work, validate performance, and return the equipment with clear next steps.'],
      callout: 'Every repair starts with a data-safety plan. We preserve critical files where possible and confirm performance before the device returns to service.',
    },
  ],
  faqs,
  faqTitle: 'Questions about IT repair and upgrades',
  relatedLinks: [
    { label: 'IT support in Fort Lauderdale', href: '/it-support-fort-lauderdale', description: 'Day-to-day IT support for Fort Lauderdale and Broward County offices, including the devices that need repair.' },
    { label: 'South Florida service areas', href: '/managed-it-services-south-florida', description: 'The cities New Wave IT serves in Broward, Miami-Dade and Palm Beach counties.' },
    { label: 'Pricing', href: '/pricing', description: 'The published monthly price list and a quote builder.' },
    { label: 'IT Repair & Upgrade Strategy Guide', href: '/l/it-repair-guide', description: 'A longer read on repair versus replacement, high-impact upgrades and diagnostics.' },
  ],
  ctaTitle: 'Ready to get your equipment working better?',
  ctaDescription: 'Request a hardware review and get a practical repair or upgrade recommendation from New Wave IT.',
};

// The Service node keeps the name, description and serviceType it had when it was written by hand.
const jsonLd = servicePageJsonLd({
  path: PATH,
  name: 'IT Hardware Repair & Upgrades',
  description: 'Laptop, desktop, and server repair with data protection, plus hardware upgrades that extend equipment life and improve performance for South Florida businesses.',
  serviceType: 'IT Repair & Upgrades',
  areaServed: [
    { '@type': 'City', name: 'Fort Lauderdale' },
    { '@type': 'AdministrativeArea', name: 'Broward County' },
    { '@type': 'AdministrativeArea', name: 'Miami-Dade County' },
    { '@type': 'AdministrativeArea', name: 'Palm Beach County' },
  ],
  faqs,
});

export default function ITRepairServicePage() {
  usePageMeta({ ...IT_PAGE_META[PATH], jsonLd });

  return <ServiceCategoryPage data={service} breadcrumbs={IT_PAGE_META[PATH].breadcrumbs} />;
}
