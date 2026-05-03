import { Shield, Lock, Eye, Gauge, Key, Users, ArrowUpRight } from 'lucide-react';

const services = [
  {
    icon: Shield,
    title: 'Network Security',
    description: 'Multi-layered defense architecture protecting your infrastructure from external and internal threats.',
    features: ['Next-gen firewalls', 'Intrusion prevention', 'Network segmentation', 'DDoS mitigation'],
    accent: '#39CCCC',
  },
  {
    icon: Eye,
    title: 'Threat Detection & Response',
    description: '24/7 security operations center monitoring your environment with AI-powered analytics.',
    features: ['SIEM & SOAR', 'Incident response', 'Digital forensics', 'Threat hunting'],
    accent: '#5EBC67',
  },
  {
    icon: Lock,
    title: 'Endpoint Protection',
    description: 'Comprehensive security for every device — laptops, mobile, servers, and IoT.',
    features: ['EDR/XDR platform', 'Patch management', 'Device control', 'Mobile security'],
    accent: '#39CCCC',
  },
  {
    icon: Key,
    title: 'Identity & Access',
    description: 'Zero-trust framework ensuring only the right people access your critical resources.',
    features: ['MFA enforcement', 'SSO integration', 'Privileged access', 'Conditional access'],
    accent: '#5EBC67',
  },
  {
    icon: Gauge,
    title: 'Compliance & Audit',
    description: 'Stay audit-ready with automated compliance mapping and continuous monitoring.',
    features: ['HIPAA & PCI-DSS', 'SOC 2 readiness', 'Risk assessments', 'Audit reporting'],
    accent: '#39CCCC',
  },
  {
    icon: Users,
    title: 'Security Awareness',
    description: 'Build a human firewall through ongoing education and simulated phishing campaigns.',
    features: ['Phishing simulations', 'Interactive training', 'Policy management', 'Reporting'],
    accent: '#5EBC67',
  },
];

export default function CybersecurityServices() {
  return (
    <section
      id="services"
      className="bg-white py-28 relative"
      style={{ borderTop: '1px solid rgba(21,34,50,0.06)', zIndex: 10 }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-3xl mb-16">
          <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#39CCCC' }}>
            Our Solutions
          </span>
          <h2
            className="text-4xl lg:text-5xl mt-3 mb-5 leading-tight"
            style={{ fontFamily: 'Staatliches, sans-serif', color: '#152232' }}
          >
            Complete security stack,{' '}
            <span style={{ color: '#39CCCC' }}>fully managed.</span>
          </h2>
          <p className="text-lg" style={{ color: 'rgba(21,34,50,0.6)' }}>
            Six integrated pillars of defense, deployed and operated by certified security
            engineers — so you get enterprise capability without enterprise complexity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((service) => (
            <div
              key={service.title}
              className="group relative rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden"
              style={{
                background: 'white',
                border: '1px solid rgba(21,34,50,0.08)',
                boxShadow: '0 2px 12px rgba(21,34,50,0.04)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = `0 20px 56px ${service.accent}25`;
                (e.currentTarget as HTMLElement).style.borderColor = `${service.accent}40`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(21,34,50,0.04)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(21,34,50,0.08)';
              }}
            >
              {/* Hover gradient */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at top right, ${service.accent}08 0%, transparent 60%)`,
                }}
              />

              <div className="relative">
                <div className="flex items-start justify-between mb-5">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: `${service.accent}15` }}
                  >
                    <service.icon size={22} style={{ color: service.accent }} />
                  </div>
                  <ArrowUpRight
                    size={18}
                    className="opacity-0 group-hover:opacity-100 group-hover:-translate-y-1 group-hover:translate-x-1 transition-all duration-300"
                    style={{ color: service.accent }}
                  />
                </div>

                <h3 className="font-bold text-xl mb-2.5" style={{ color: '#152232' }}>
                  {service.title}
                </h3>
                <p className="text-sm leading-relaxed mb-5" style={{ color: 'rgba(21,34,50,0.6)' }}>
                  {service.description}
                </p>

                <div className="space-y-2 pt-4" style={{ borderTop: '1px solid rgba(21,34,50,0.06)' }}>
                  {service.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm">
                      <div
                        className="w-1 h-1 rounded-full flex-shrink-0"
                        style={{ background: service.accent }}
                      />
                      <span style={{ color: 'rgba(21,34,50,0.7)' }}>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
