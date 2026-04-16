import { Shield, Lock, Eye, Gauge, Key, Users } from 'lucide-react';

const services = [
  {
    icon: Shield,
    title: 'Network Security',
    description: 'Firewalls, intrusion detection, and network segmentation to protect your infrastructure.',
    features: ['DDoS Protection', 'Firewall Management', 'Network Segmentation'],
    accent: '#39CCCC',
  },
  {
    icon: Eye,
    title: 'Threat Detection & Response',
    description: 'Advanced monitoring and rapid response to emerging threats 24/7.',
    features: ['SIEM Solutions', 'Incident Response', 'Forensics'],
    accent: '#5EBC67',
  },
  {
    icon: Lock,
    title: 'Endpoint Protection',
    description: 'Comprehensive security for all devices connecting to your network.',
    features: ['EDR Solutions', 'Patch Management', 'Device Control'],
    accent: '#39CCCC',
  },
  {
    icon: Key,
    title: 'Access & Identity',
    description: 'Multi-factor authentication and zero-trust security frameworks.',
    features: ['MFA Implementation', 'Identity Management', 'Password Policies'],
    accent: '#5EBC67',
  },
  {
    icon: Gauge,
    title: 'Compliance & Audit',
    description: 'Stay compliant with HIPAA, PCI-DSS, GDPR, and SOC 2 requirements.',
    features: ['Compliance Mapping', 'Security Audits', 'Remediation'],
    accent: '#39CCCC',
  },
  {
    icon: Users,
    title: 'Security Training',
    description: 'Employee education to strengthen your human firewall against social engineering.',
    features: ['Phishing Training', 'Awareness Programs', 'Certification'],
    accent: '#5EBC67',
  },
];

export default function CybersecurityServices() {
  return (
    <section id="services" className="bg-white py-28" style={{ borderTop: '1px solid rgba(21,34,50,0.06)' }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#39CCCC' }}>
            Our Solutions
          </span>
          <h2
            className="text-4xl lg:text-5xl mt-3 mb-5 leading-tight"
            style={{ fontFamily: 'Staatliches, sans-serif', color: '#152232' }}
          >
            Complete{' '}
            <span style={{ color: '#39CCCC' }}>Security Coverage</span>
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: 'rgba(21,34,50,0.6)' }}>
            From network defense to employee training, we provide comprehensive security solutions tailored to your business needs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div
              key={service.title}
              className="group rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1"
              style={{ background: 'white', border: '1px solid rgba(21,34,50,0.08)', boxShadow: '0 2px 12px rgba(21,34,50,0.05)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(21,34,50,0.12)';
                (e.currentTarget as HTMLElement).style.borderColor = `${service.accent}40`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(21,34,50,0.05)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(21,34,50,0.08)';
              }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: `${service.accent}15` }}>
                <service.icon size={24} style={{ color: service.accent }} />
              </div>
              <h3 className="font-bold text-xl mb-3" style={{ color: '#152232' }}>{service.title}</h3>
              <p className="text-sm leading-relaxed mb-5" style={{ color: 'rgba(21,34,50,0.6)' }}>{service.description}</p>
              <div className="flex flex-wrap gap-2">
                {service.features.map((feature) => (
                  <span key={feature} className="text-xs font-medium px-3 py-1 rounded-full" style={{ background: `${service.accent}12`, color: service.accent }}>
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
