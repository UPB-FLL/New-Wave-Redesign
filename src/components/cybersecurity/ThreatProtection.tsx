import { AlertTriangle, Bug, CheckCircle, Lock, Mail, ShieldOff, Wifi, Zap, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDetailSlugs } from '../../lib/useDetailSlugs';
import { SectionHeading } from '../brand/SectionHeading';

type Threat = {
  icon: LucideIcon;
  name: string;
  slug: string;
  severity: 'Critical' | 'High' | 'Medium';
  description: string;
};

// No figures on these cards (detection rates, volumes, timings): the owner's
// rule is that the site states none it cannot back up.
const threats: Threat[] = [
  { icon: Bug, name: 'Ransomware', slug: 'ransomware', severity: 'Critical', description: 'Behavior analysis can identify encryption attempts and isolate affected endpoints quickly.' },
  { icon: Mail, name: 'Phishing', slug: 'phishing', severity: 'High', description: 'Email defenses can combine URL rewriting, attachment sandboxing, and impersonation detection.' },
  { icon: AlertTriangle, name: 'DDoS Attacks', slug: 'ddos-attacks', severity: 'High', description: 'Layered mitigation with edge-network filtering and automatic traffic scrubbing.' },
  { icon: Lock, name: 'Data Breaches', slug: 'data-breaches', severity: 'Critical', description: 'Encryption, DLP policies, and monitoring for sensitive data flows.' },
  { icon: Zap, name: 'Zero-Day Exploits', slug: 'zero-day-exploits', severity: 'Critical', description: 'Behavioral detection can recognize unfamiliar attack patterns before traditional signatures exist.' },
  { icon: ShieldOff, name: 'Insider Threats', slug: 'insider-threats', severity: 'Medium', description: 'User behavior analytics can flag anomalous access patterns and policy violations.' },
  { icon: Wifi, name: 'Network Intrusions', slug: 'network-intrusions', severity: 'High', description: 'Next-generation firewalls with deep packet inspection and intrusion prevention.' },
  { icon: CheckCircle, name: 'Compliance Violations', slug: 'compliance-violations', severity: 'Medium', description: 'Automated reviews can map an environment to HIPAA, PCI-DSS, SOC 2, and GDPR requirements.' },
];

export default function ThreatProtection() {
  // /threat/:slug pages come from the CMS; a card links only to one that exists.
  const detailSlugs = useDetailSlugs('threats-detail', 'threats_list');

  return (
    <section className="relative z-10 border-t py-16 sm:py-20" style={{ borderColor: 'var(--nw-mist-gray)' }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Threats we protect against"
          description="A practical view of common risks facing businesses and the safeguards that help address them."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {threats.map((threat) => {
            const Icon = threat.icon;
            const cardStyle = { background: 'var(--nw-pure-white)', borderColor: 'var(--nw-mist-gray)' };
            const body = (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="nw-icon-signal h-9 w-9"><Icon size={17} aria-hidden="true" /></span>
                  <span className="nw-meta text-xs text-[var(--nw-slate)]">{threat.severity} risk</span>
                </div>
                <h3 className="mt-5 font-bold text-[var(--nw-current-navy)]">{threat.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--nw-slate)]">{threat.description}</p>
              </>
            );
            return detailSlugs.has(threat.slug) ? (
              <Link key={threat.name} to={`/threat/${threat.slug}`} className="group flex h-full flex-col rounded-lg border p-5 no-underline transition-colors hover:border-[var(--nw-tide-blue)] hover:bg-[var(--nw-pure-white)]" style={cardStyle}>
                {body}
              </Link>
            ) : (
              <div key={threat.name} className="flex h-full flex-col rounded-lg border p-5" style={cardStyle}>
                {body}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
