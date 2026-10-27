import { CheckCircle2 } from 'lucide-react';
import { CurrentField } from '../brand/CurrentField';
import { SectionHeading } from '../brand/SectionHeading';

const frameworks = [
  { name: 'HIPAA', fullName: 'Health Insurance Portability and Accountability Act', description: 'Healthcare data protection', industries: ['Healthcare', 'Insurance', 'Pharma'], features: ['PHI encryption at rest & in transit', 'Audit logging & access controls', 'Breach notification protocols'] },
  { name: 'PCI-DSS', fullName: 'Payment Card Industry Data Security Standard', description: 'Payment processing security', industries: ['Retail', 'E-commerce', 'Hospitality'], features: ['Card data tokenization', 'Network segmentation', 'Quarterly vulnerability scans'] },
  { name: 'SOC 2', fullName: 'Service Organization Control 2', description: 'Trust services criteria', industries: ['SaaS', 'Cloud Services', 'B2B'], features: ['Type I & Type II audit prep', 'Continuous control monitoring', 'Evidence collection automation'] },
  { name: 'GDPR', fullName: 'General Data Protection Regulation', description: 'EU data privacy compliance', industries: ['EU Operations', 'Global Companies', 'SaaS'], features: ['Data subject request handling', 'Privacy impact assessments', '72-hour breach notification'] },
  { name: 'ISO 27001', fullName: 'Information Security Management System', description: 'International security standard', industries: ['Enterprise', 'Government', 'Finance'], features: ['ISMS implementation', 'Risk treatment plans', 'Annual surveillance audits'] },
  { name: 'NIST CSF', fullName: 'NIST Cybersecurity Framework', description: 'Federal cybersecurity standard', industries: ['Government', 'Defense', 'Critical Infrastructure'], features: ['Identify, Protect, Detect, Respond, Recover', 'Maturity assessments', 'Tier-based implementation'] },
];

export default function ComplianceFrameworks() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-20" style={{ background: 'var(--nw-current-navy)' }}>
      <CurrentField density="subtle" tone="dark" className="pointer-events-none absolute inset-0 h-full w-full opacity-55" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          tone="dark"
          title="Compliance frameworks"
          description="We map your environment to the frameworks that matter for your industry, then help maintain the controls that support ongoing readiness."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {frameworks.map((framework) => (
            <article key={framework.name} className="rounded-lg border p-5" style={{ background: 'var(--nw-deep-current)', borderColor: 'var(--nw-tide-blue)' }}>
              <h3 className="nw-display text-2xl text-[var(--nw-signal-cyan)]">{framework.name}</h3>
              <p className="mt-3 text-sm font-semibold text-[var(--nw-cloud-white)]">{framework.description}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--nw-mist-gray)]">{framework.fullName}</p>
              <p className="mt-4 text-xs leading-relaxed text-[var(--nw-mist-gray)]">Common in: {framework.industries.join(', ')}</p>
              <ul className="mt-5 space-y-2 border-t pt-4 text-sm text-[var(--nw-mist-gray)]" style={{ borderColor: 'var(--nw-tide-blue)' }}>
                {framework.features.map((feature) => <li key={feature} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 shrink-0 text-[var(--nw-continuity-green)]" size={15} aria-hidden="true" />{feature}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
