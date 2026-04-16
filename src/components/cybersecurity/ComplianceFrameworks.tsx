import { CheckCircle2 } from 'lucide-react';

const frameworks = [
  {
    name: 'HIPAA',
    description: 'Healthcare Compliance',
    features: ['Patient Data Protection', 'Audit Logs', 'Encryption Standards'],
  },
  {
    name: 'PCI-DSS',
    description: 'Payment Card Security',
    features: ['Card Data Protection', 'Network Segmentation', 'Security Testing'],
  },
  {
    name: 'GDPR',
    description: 'Data Privacy Regulation',
    features: ['Data Subject Rights', 'Privacy Impact Assessment', 'Incident Reporting'],
  },
  {
    name: 'SOC 2',
    description: 'Service Organization Control',
    features: ['Security Controls', 'Availability & Performance', 'Third-party Review'],
  },
  {
    name: 'ISO 27001',
    description: 'Information Security Management',
    features: ['Risk Assessment', 'Incident Management', 'Continual Improvement'],
  },
  {
    name: 'NIST',
    description: 'Cybersecurity Framework',
    features: ['Identify & Protect', 'Detect & Respond', 'Recover & Improve'],
  },
];

export default function ComplianceFrameworks() {
  return (
    <section className="bg-gradient-to-b from-slate-50 to-white py-28" style={{ borderTop: '1px solid rgba(21,34,50,0.06)' }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#5EBC67' }}>
            Compliance & Standards
          </span>
          <h2
            className="text-4xl lg:text-5xl mt-3 mb-5 leading-tight"
            style={{ fontFamily: 'Staatliches, sans-serif', color: '#152232' }}
          >
            Certified &{' '}
            <span style={{ color: '#5EBC67' }}>Compliant</span>
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: 'rgba(21,34,50,0.6)' }}>
            We help you meet and exceed industry compliance requirements
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {frameworks.map((framework) => (
            <div
              key={framework.name}
              className="rounded-2xl p-8 transition-all duration-300"
              style={{
                background: 'white',
                border: '1px solid rgba(21,34,50,0.08)',
                boxShadow: '0 2px 12px rgba(21,34,50,0.05)'
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(94,188,103,0.15)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(94,188,103,0.4)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(21,34,50,0.05)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(21,34,50,0.08)';
              }}
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-5" style={{ background: 'rgba(94,188,103,0.15)' }}>
                <span className="text-2xl font-bold" style={{ color: '#5EBC67' }}>
                  {framework.name.substring(0, 2)}
                </span>
              </div>
              <h3 className="text-xl font-bold mb-1" style={{ color: '#152232' }}>
                {framework.name}
              </h3>
              <p className="text-sm mb-5" style={{ color: 'rgba(21,34,50,0.55)' }}>
                {framework.description}
              </p>
              <div className="space-y-2">
                {framework.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 size={16} style={{ color: '#5EBC67' }} className="flex-shrink-0" />
                    <span style={{ color: 'rgba(21,34,50,0.65)' }}>{feature}</span>
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
