import { Link } from 'react-router-dom';
import { Shield, Lock, Eye, Gauge, Key, Users, ArrowUpRight } from 'lucide-react';

const services = [
  {
    icon: Shield,
    title: 'Network Security',
    slug: 'network-security',
    description: 'Multi-layered defense architecture protecting your infrastructure from external and internal threats.',
    features: ['Next-gen firewalls', 'Intrusion prevention', 'Network segmentation', 'DDoS mitigation'],
    accent: '#39CCCC',
  },
  {
    icon: Eye,
    title: 'Threat Detection & Response',
    slug: 'threat-detection-response',
    description: '24/7 security operations center monitoring your environment with AI-powered analytics.',
    features: ['SIEM & SOAR', 'Incident response', 'Digital forensics', 'Threat hunting'],
    accent: '#5EBC67',
  },
  {
    icon: Lock,
    title: 'Endpoint Protection',
    slug: 'endpoint-protection',
    description: 'Comprehensive security for every device — laptops, mobile, servers, and IoT.',
    features: ['EDR/XDR platform', 'Patch management', 'Device control', 'Mobile security'],
    accent: '#39CCCC',
  },
  {
    icon: Key,
    title: 'Identity & Access',
    slug: 'identity-access',
    description: 'Zero-trust framework ensuring only the right people access your critical resources.',
    features: ['MFA enforcement', 'SSO integration', 'Privileged access', 'Conditional access'],
    accent: '#5EBC67',
  },
  {
    icon: Gauge,
    title: 'Compliance & Audit',
    slug: 'compliance-audit',
    description: 'Stay audit-ready with automated compliance mapping and continuous monitoring.',
    features: ['HIPAA & PCI-DSS', 'SOC 2 readiness', 'Risk assessments', 'Audit reporting'],
    accent: '#39CCCC',
  },
  {
    icon: Users,
    title: 'Security Awareness',
    slug: 'security-awareness',
    description: 'Build a human firewall through ongoing education and simulated phishing campaigns.',
    features: ['Phishing simulations', 'Interactive training', 'Policy management', 'Reporting'],
    accent: '#5EBC67',
  },
];

export default function CybersecurityServices() {
  return (
    <section
      id="services"
      className="bg-white py-12 sm:py-16 relative"
      style={{ borderTop: '1px solid rgba(21,34,50,0.06)', zIndex: 10 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-8 sm:mb-10">
          <span className="text-xs sm:text-sm font-semibold uppercase tracking-widest" style={{ color: '#39CCCC' }}>
            Our Solutions
          </span>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl mt-2 mb-4 leading-tight tracking-tight"
            style={{ fontFamily: "'Staatliches', 'Impact', 'Arial Narrow', sans-serif", color: '#152232' }}
          >
            Complete security stack,{' '}
            <span style={{ display: 'inline-block', background: 'linear-gradient(135deg, #39CCCC 0%, #5EBC67 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>fully managed.</span>
          </h2>
          <p className="text-sm sm:text-base" style={{ color: 'rgba(21,34,50,0.6)' }}>
            Six integrated pillars of defense, deployed and operated by certified security
            engineers — enterprise capability without enterprise complexity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {services.map((service) => (
            <Link
              key={service.title}
              to={`/service/${service.slug}`}
              className="group relative rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden no-underline block"
              style={{
                background: 'rgba(26, 47, 63, 0.8)',
                border: `1px solid ${service.accent}40`,
                boxShadow: `0 2px 12px ${service.accent}10`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = `0 16px 48px ${service.accent}30`;
                (e.currentTarget as HTMLElement).style.borderColor = `${service.accent}80`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = `0 2px 12px ${service.accent}10`;
                (e.currentTarget as HTMLElement).style.borderColor = `${service.accent}40`;
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
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${service.accent}30` }}
                  >
                    <service.icon size={18} style={{ color: service.accent }} />
                  </div>
                  <ArrowUpRight
                    size={16}
                    className="opacity-0 group-hover:opacity-100 group-hover:-translate-y-1 group-hover:translate-x-1 transition-all duration-300"
                    style={{ color: service.accent }}
                  />
                </div>

                <h3 className="font-bold text-lg mb-1.5" style={{ color: '#E0F2F1' }}>
                  {service.title}
                </h3>
                <p className="text-sm leading-relaxed mb-3" style={{ color: 'rgba(224,242,241,0.75)' }}>
                  {service.description}
                </p>

                <div className="space-y-1.5 pt-3" style={{ borderTop: `1px solid ${service.accent}30` }}>
                  {service.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-xs">
                      <div
                        className="w-1 h-1 rounded-full flex-shrink-0"
                        style={{ background: service.accent }}
                      />
                      <span style={{ color: 'rgba(224,242,241,0.65)' }}>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
