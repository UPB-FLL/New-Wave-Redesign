import { CheckCircle2, FileCheck } from 'lucide-react';

const frameworks = [
  {
    name: 'HIPAA',
    fullName: 'Health Insurance Portability and Accountability Act',
    description: 'Healthcare data protection',
    industries: ['Healthcare', 'Insurance', 'Pharma'],
    features: ['PHI encryption at rest & in transit', 'Audit logging & access controls', 'Breach notification protocols'],
  },
  {
    name: 'PCI-DSS',
    fullName: 'Payment Card Industry Data Security Standard',
    description: 'Payment processing security',
    industries: ['Retail', 'E-commerce', 'Hospitality'],
    features: ['Card data tokenization', 'Network segmentation', 'Quarterly vulnerability scans'],
  },
  {
    name: 'SOC 2',
    fullName: 'Service Organization Control 2',
    description: 'Trust services criteria',
    industries: ['SaaS', 'Cloud Services', 'B2B'],
    features: ['Type I & Type II audit prep', 'Continuous control monitoring', 'Evidence collection automation'],
  },
  {
    name: 'GDPR',
    fullName: 'General Data Protection Regulation',
    description: 'EU data privacy compliance',
    industries: ['EU Operations', 'Global Companies', 'SaaS'],
    features: ['Data subject request handling', 'Privacy impact assessments', '72-hour breach notification'],
  },
  {
    name: 'ISO 27001',
    fullName: 'Information Security Management System',
    description: 'International security standard',
    industries: ['Enterprise', 'Government', 'Finance'],
    features: ['ISMS implementation', 'Risk treatment plans', 'Annual surveillance audits'],
  },
  {
    name: 'NIST CSF',
    fullName: 'NIST Cybersecurity Framework',
    description: 'Federal cybersecurity standard',
    industries: ['Government', 'Defense', 'Critical Infrastructure'],
    features: ['Identify, Protect, Detect, Respond, Recover', 'Maturity assessments', 'Tier-based implementation'],
  },
];

export default function ComplianceFrameworks() {
  return (
    <section
      className="py-12 sm:py-16 relative"
      style={{
        background: '#152232',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        zIndex: 10,
      }}
    >
      {/* Decorative gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px]"
          style={{
            background: 'radial-gradient(ellipse, rgba(94,188,103,0.15) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-4"
            style={{ background: 'rgba(94,188,103,0.1)', border: '1px solid rgba(94,188,103,0.3)' }}
          >
            <FileCheck size={12} style={{ color: '#5EBC67' }} />
            <span className="text-[11px] font-semibold" style={{ color: '#5EBC67' }}>
              CERTIFIED COMPLIANCE
            </span>
          </div>
          <h2
            className="text-2xl sm:text-3xl lg:text-4xl mt-2 mb-3 leading-tight"
            style={{ fontFamily: 'Staatliches, sans-serif', color: 'white' }}
          >
            Audit-ready from{' '}
            <span style={{ color: '#5EBC67' }}>day one.</span>
          </h2>
          <p className="text-sm sm:text-base max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.6)' }}>
            We map your environment to the frameworks that matter for your industry —
            then keep you continuously compliant with automated controls.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {frameworks.map((framework) => (
            <div
              key={framework.name}
              className="group rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(8px)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(94,188,103,0.4)';
                (e.currentTarget as HTMLElement).style.background = 'rgba(94,188,103,0.05)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
              }}
            >
              <div className="flex items-baseline justify-between mb-2">
                <h3
                  className="text-2xl font-bold"
                  style={{ fontFamily: 'Staatliches, sans-serif', color: '#5EBC67' }}
                >
                  {framework.name}
                </h3>
                <span className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  CERTIFIED
                </span>
              </div>
              <p className="text-[11px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {framework.description}
              </p>
              <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {framework.fullName}
              </p>

              <div className="flex flex-wrap gap-1 mb-3">
                {framework.industries.map((industry) => (
                  <span
                    key={industry}
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                    style={{
                      background: 'rgba(94,188,103,0.1)',
                      color: '#5EBC67',
                      border: '1px solid rgba(94,188,103,0.2)',
                    }}
                  >
                    {industry}
                  </span>
                ))}
              </div>

              <div className="space-y-1.5 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                {framework.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 size={12} style={{ color: '#5EBC67' }} className="flex-shrink-0 mt-0.5" />
                    <span style={{ color: 'rgba(255,255,255,0.75)' }}>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
