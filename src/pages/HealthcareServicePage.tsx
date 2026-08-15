import { Activity, FileText, Lock, Stethoscope, Users, Zap } from 'lucide-react';
import { ServiceCategoryPage, type ServiceCategoryPageData } from '../components/brand/ServiceCategoryPage';
import { usePageMeta } from '../lib/usePageMeta';

const service: ServiceCategoryPageData = {
  icon: Stethoscope,
  name: 'Healthcare',
  heroTitle: 'Healthcare technology built around care delivery',
  description: 'HIPAA-compliant IT infrastructure and healthcare-specific technology solutions for medical practices and health systems.',
  heroDescription: 'Support patient data, connected clinical workflows, and healthcare operations with a dependable technology partner.',
  details: 'Secure patient data management, regulatory compliance, and thoughtful EHR integration support the high standards healthcare teams need from their technology.',
  highlights: ['HIPAA-compliant infrastructure', 'EHR/EMR system integration', 'Patient data encryption & backup', 'Telehealth platform support', 'Medical device networking', 'Secure communication tools', 'Audit trail & compliance reporting', 'Healthcare-specific disaster recovery'],
  seoLink: '/l/healthcare-guide',
  eyebrow: 'Healthcare IT',
  assessmentLabel: 'Plan Your Healthcare IT',
  featureTitle: 'Healthcare IT solutions',
  featureCards: [
    { icon: Lock, title: 'HIPAA Compliance', description: 'Technology practices that support protected health information, audit readiness, and reliable access controls.' },
    { icon: Activity, title: 'EHR Integration & Support', description: 'Careful support for EHR and EMR systems, including connectivity, workflow, and day-to-day operations.' },
    { icon: Users, title: 'Telehealth & Remote Care', description: 'Secure connectivity and platform support for remote care models that extend access beyond the clinic.' },
  ],
  sections: [
    {
      title: 'Clinical & operational excellence',
      cards: [
        { icon: Zap, title: 'Medical Device Networking', description: 'Thoughtful network design supports appropriate connectivity for clinical devices and facility systems.' },
        { icon: FileText, title: 'Secure Communication', description: 'Reliable communication tools can help care teams coordinate while protecting sensitive information.' },
        { icon: Lock, title: 'Recovery Planning', description: 'Backup and recovery planning helps healthcare operations prepare for disruptive technology events.' },
      ],
    },
    {
      title: 'Why healthcare providers choose us',
      cards: [
        { icon: Stethoscope, title: 'Healthcare Industry Knowledge', description: 'A practical understanding of healthcare workflows informs how technology recommendations are prioritized.' },
        { icon: Lock, title: 'Patient-Centric Security', description: 'Security measures are considered alongside the access, availability, and care-delivery needs of the organization.' },
      ],
    },
  ],
  ctaTitle: 'Ready to strengthen your healthcare IT foundation?',
  ctaDescription: 'Talk with New Wave IT about a healthcare technology program that supports care teams, patient data, and day-to-day operations.',
};

export default function HealthcareServicePage() {
  usePageMeta({
    title: 'Healthcare IT Services Fort Lauderdale — HIPAA Compliance & EHR',
    description: 'HIPAA-compliant IT services for medical practices in Fort Lauderdale and South Florida. EHR integration, patient data security, telehealth support, and 24/7 monitoring.',
    keywords: 'healthcare IT Fort Lauderdale, HIPAA compliance South Florida, EHR support Fort Lauderdale, medical practice IT, HIPAA IT services, telehealth technology, healthcare cybersecurity Florida',
    canonical: 'https://www.newwaveitfl.com/service-category/healthcare',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      provider: { '@id': 'https://www.newwaveitfl.com/#business' },
      name: 'Healthcare IT Services',
      description: 'HIPAA-compliant IT services for medical practices in South Florida including EHR integration, patient data security, and 24/7 monitoring.',
      areaServed: { '@type': 'City', name: 'Fort Lauderdale' },
      serviceType: 'Healthcare IT',
      url: 'https://www.newwaveitfl.com/service-category/healthcare',
    },
  });

  return <ServiceCategoryPage data={service} />;
}
