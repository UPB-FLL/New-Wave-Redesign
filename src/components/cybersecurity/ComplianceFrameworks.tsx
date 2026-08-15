import { CheckCircle2, FileCheck } from 'lucide-react';
import { CurrentField } from '../brand/CurrentField';

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
        <div className="mx-auto max-w-3xl text-center">
          <p className="nw-kicker text-[var(--nw-signal-cyan)]"><FileCheck className="mr-2 inline-block" size={14} aria-hidden="true" />Compliance</p>
          <h2 className="nw-display mt-3 text-3xl leading-[1.1] text-[var(--nw-cloud-white)] sm:text-4xl lg:text-5xl">Audit-ready from <span className="text-[var(--nw-signal-cyan)]">day one.</span></h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--nw-mist-gray)] sm:text-lg">We map your environment to the frameworks that matter for your industry, then help maintain the controls that support ongoing readiness.</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {frameworks.map((framework) => (
            <article key={framework.name} className="rounded-lg border p-5" style={{ background: 'var(--nw-deep-current)', borderColor: 'var(--nw-tide-blue)' }}>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="nw-display text-2xl text-[var(--nw-signal-cyan)]">{framework.name}</h3>
                <span className="nw-meta text-[10px] text-[var(--nw-mist-gray)]">FRAMEWORK</span>
              </div>
              <p className="mt-3 text-sm font-semibold text-[var(--nw-cloud-white)]">{framework.description}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--nw-mist-gray)]">{framework.fullName}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {framework.industries.map((industry) => <span key={industry} className="rounded border px-2 py-1 text-xs text-[var(--nw-mist-gray)]" style={{ borderColor: 'var(--nw-tide-blue)' }}>{industry}</span>)}
              </div>
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
