import { ArrowUpRight, Eye, Gauge, Key, Lock, Shield, Users, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SectionHeading } from '../brand/SectionHeading';

const services: { icon: LucideIcon; title: string; slug: string; description: string; features: string[] }[] = [
  { icon: Shield, title: 'Network Security', slug: 'network-security', description: 'Multi-layered defense architecture for external and internal infrastructure threats.', features: ['Next-gen firewalls', 'Intrusion prevention', 'Network segmentation', 'DDoS mitigation'] },
  { icon: Eye, title: 'Threat Detection & Response', slug: 'threat-detection-response', description: 'Security operations center monitoring with practical analytics and response support.', features: ['SIEM & SOAR', 'Incident response', 'Digital forensics', 'Threat hunting'] },
  { icon: Lock, title: 'Endpoint Protection', slug: 'endpoint-protection', description: 'Comprehensive security for laptops, mobile devices, servers, and connected equipment.', features: ['EDR/XDR platform', 'Patch management', 'Device control', 'Mobile security'] },
  { icon: Key, title: 'Identity & Access', slug: 'identity-access', description: 'A zero-trust approach that helps the right people reach the right resources.', features: ['MFA enforcement', 'SSO integration', 'Privileged access', 'Conditional access'] },
  { icon: Gauge, title: 'Compliance & Audit', slug: 'compliance-audit', description: 'Audit preparation, compliance mapping, and ongoing monitoring for your environment.', features: ['HIPAA & PCI-DSS', 'SOC 2 readiness', 'Risk assessments', 'Audit reporting'] },
  { icon: Users, title: 'Security Awareness', slug: 'security-awareness', description: 'Ongoing education and simulated phishing programs that build confident teams.', features: ['Phishing simulations', 'Interactive training', 'Policy management', 'Reporting'] },
];

export default function CybersecurityServices() {
  return (
    <section id="services" className="bg-[var(--nw-pure-white)] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Our Solutions"
          title={<>A complete security program, <span className="text-[var(--nw-tide-blue)]">carefully managed.</span></>}
          description="Six connected pillars of defense deployed and operated by experienced security engineers."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <Link key={service.title} to={`/service/${service.slug}`} className="group flex h-full flex-col rounded-lg border p-5 no-underline transition-colors hover:border-[var(--nw-tide-blue)] hover:bg-[var(--nw-cloud-white)]" style={{ background: 'var(--nw-pure-white)', borderColor: 'var(--nw-mist-gray)' }}>
                <div className="flex items-start justify-between">
                  <span className="nw-icon-signal h-10 w-10"><Icon size={19} aria-hidden="true" /></span>
                  <ArrowUpRight size={18} className="text-[var(--nw-slate)] transition-colors group-hover:text-[var(--nw-tide-blue)]" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-[var(--nw-current-navy)]">{service.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--nw-slate)]">{service.description}</p>
                <ul className="mt-5 space-y-2 border-t pt-4 text-sm text-[var(--nw-current-navy)]" style={{ borderColor: 'var(--nw-mist-gray)' }}>
                  {service.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[var(--nw-signal-cyan)]" aria-hidden="true" />{feature}</li>
                  ))}
                </ul>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
