import { AlertTriangle, Bug, CheckCircle, Lock, Mail, ShieldOff, Wifi, Zap, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SectionHeading } from '../brand/SectionHeading';

type Threat = {
  icon: LucideIcon;
  name: string;
  slug: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  description: string;
  stat: string;
  statLabel: string;
};

const threats: Threat[] = [
  { icon: Bug, name: 'Ransomware', slug: 'ransomware', severity: 'CRITICAL', description: 'Behavior analysis can identify encryption attempts and isolate affected endpoints quickly.', stat: '99.7%', statLabel: 'detection rate' },
  { icon: Mail, name: 'Phishing', slug: 'phishing', severity: 'HIGH', description: 'Email defenses can combine URL rewriting, attachment sandboxing, and impersonation detection.', stat: '15M+', statLabel: 'emails scanned daily' },
  { icon: AlertTriangle, name: 'DDoS Attacks', slug: 'ddos-attacks', severity: 'HIGH', description: 'Layered mitigation with edge-network filtering and automatic traffic scrubbing.', stat: '10 Tbps', statLabel: 'mitigation capacity' },
  { icon: Lock, name: 'Data Breaches', slug: 'data-breaches', severity: 'CRITICAL', description: 'Encryption, DLP policies, and monitoring for sensitive data flows.', stat: 'AES-256', statLabel: 'encryption standard' },
  { icon: Zap, name: 'Zero-Day Exploits', slug: 'zero-day-exploits', severity: 'CRITICAL', description: 'Behavioral detection can recognize unfamiliar attack patterns before traditional signatures exist.', stat: '<60s', statLabel: 'mean detection time' },
  { icon: ShieldOff, name: 'Insider Threats', slug: 'insider-threats', severity: 'MEDIUM', description: 'User behavior analytics can flag anomalous access patterns and policy violations.', stat: '24/7', statLabel: 'continuous monitoring' },
  { icon: Wifi, name: 'Network Intrusions', slug: 'network-intrusions', severity: 'HIGH', description: 'Next-generation firewalls with deep packet inspection and intrusion prevention.', stat: '5M+', statLabel: 'packets inspected/sec' },
  { icon: CheckCircle, name: 'Compliance Violations', slug: 'compliance-violations', severity: 'MEDIUM', description: 'Automated reviews can map an environment to HIPAA, PCI-DSS, SOC 2, and GDPR requirements.', stat: '100%', statLabel: 'audit readiness' },
];

const severityClasses: Record<Threat['severity'], string> = {
  CRITICAL: 'border-red-200 bg-red-50 text-red-700',
  HIGH: 'border-amber-200 bg-amber-50 text-amber-800',
  MEDIUM: 'border-sky-200 bg-sky-50 text-sky-800',
};

export default function ThreatProtection() {
  return (
    <section className="bg-[var(--nw-cloud-white)] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          align="center"
          eyebrow="Threat Coverage"
          title={<>Defense against every <span className="text-[var(--nw-tide-blue)]">attack vector.</span></>}
          description="A practical view of common risks facing businesses and the safeguards that help address them."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {threats.map((threat) => {
            const Icon = threat.icon;
            return (
              <Link key={threat.name} to={`/threat/${threat.slug}`} className="group flex h-full flex-col rounded-lg border p-5 no-underline transition-colors hover:border-[var(--nw-tide-blue)] hover:bg-[var(--nw-pure-white)]" style={{ background: 'var(--nw-pure-white)', borderColor: 'var(--nw-mist-gray)' }}>
                <div className="flex items-start justify-between gap-3">
                  <span className="nw-icon-signal h-9 w-9"><Icon size={17} aria-hidden="true" /></span>
                  <span className={`rounded border px-2 py-1 text-[10px] font-bold ${severityClasses[threat.severity]}`}>{threat.severity}</span>
                </div>
                <h3 className="mt-5 font-bold text-[var(--nw-current-navy)]">{threat.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--nw-slate)]">{threat.description}</p>
                <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--nw-mist-gray)' }}>
                  <p className="nw-display text-2xl text-[var(--nw-tide-blue)]">{threat.stat}</p>
                  <p className="nw-meta mt-1 text-xs text-[var(--nw-slate)]">{threat.statLabel}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
