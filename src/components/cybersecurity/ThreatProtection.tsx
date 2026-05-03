import { CheckCircle, AlertTriangle, Zap, Bug, Mail, Lock, ShieldOff, Wifi } from 'lucide-react';

const threats = [
  {
    icon: Bug,
    name: 'Ransomware',
    severity: 'CRITICAL',
    severityColor: '#ef4444',
    description: 'AI-driven behavior analysis detects encryption attempts and isolates infected endpoints in seconds.',
    stat: '99.7%',
    statLabel: 'detection rate',
  },
  {
    icon: Mail,
    name: 'Phishing',
    severity: 'HIGH',
    severityColor: '#f59e0b',
    description: 'Advanced email security with URL rewriting, attachment sandboxing, and impersonation detection.',
    stat: '15M+',
    statLabel: 'emails scanned daily',
  },
  {
    icon: AlertTriangle,
    name: 'DDoS Attacks',
    severity: 'HIGH',
    severityColor: '#f59e0b',
    description: 'Multi-layer mitigation with edge-network filtering and automatic traffic scrubbing.',
    stat: '10 Tbps',
    statLabel: 'mitigation capacity',
  },
  {
    icon: Lock,
    name: 'Data Breaches',
    severity: 'CRITICAL',
    severityColor: '#ef4444',
    description: 'End-to-end encryption, DLP policies, and continuous monitoring of sensitive data flows.',
    stat: 'AES-256',
    statLabel: 'encryption standard',
  },
  {
    icon: Zap,
    name: 'Zero-Day Exploits',
    severity: 'CRITICAL',
    severityColor: '#ef4444',
    description: 'Behavioral detection engines identify novel attack patterns before signatures exist.',
    stat: '<60s',
    statLabel: 'mean detection time',
  },
  {
    icon: ShieldOff,
    name: 'Insider Threats',
    severity: 'MEDIUM',
    severityColor: '#3b82f6',
    description: 'User behavior analytics flag anomalous access patterns and policy violations.',
    stat: '24/7',
    statLabel: 'continuous monitoring',
  },
  {
    icon: Wifi,
    name: 'Network Intrusions',
    severity: 'HIGH',
    severityColor: '#f59e0b',
    description: 'Next-gen firewalls with deep packet inspection and intrusion prevention systems.',
    stat: '5M+',
    statLabel: 'packets inspected/sec',
  },
  {
    icon: CheckCircle,
    name: 'Compliance Violations',
    severity: 'MEDIUM',
    severityColor: '#3b82f6',
    description: 'Automated audits map your environment to HIPAA, PCI-DSS, SOC 2, and GDPR requirements.',
    stat: '100%',
    statLabel: 'audit readiness',
  },
];

export default function ThreatProtection() {
  return (
    <section
      className="py-12 sm:py-16 relative"
      style={{
        background: 'linear-gradient(180deg, #f8fafb 0%, #ffffff 100%)',
        borderTop: '1px solid rgba(21,34,50,0.06)',
        zIndex: 10,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-10">
          <span className="text-xs sm:text-sm font-semibold uppercase tracking-widest" style={{ color: '#39CCCC' }}>
            Threat Coverage
          </span>
          <h2
            className="text-2xl sm:text-3xl lg:text-4xl mt-2 mb-3 leading-tight"
            style={{ fontFamily: "'Staatliches', 'Impact', 'Arial Narrow', sans-serif", color: '#152232' }}
          >
            Defense against every{' '}
            <span style={{ color: '#39CCCC' }}>attack vector.</span>
          </h2>
          <p className="text-sm sm:text-base max-w-2xl mx-auto" style={{ color: 'rgba(21,34,50,0.6)' }}>
            Here's how we stop the eight most damaging threats facing businesses today.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {threats.map((threat) => (
            <div
              key={threat.name}
              className="group rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1"
              style={{
                background: 'white',
                border: '1px solid rgba(21,34,50,0.08)',
                boxShadow: '0 2px 12px rgba(21,34,50,0.04)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 16px 48px rgba(57,204,204,0.18)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(57,204,204,0.4)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(21,34,50,0.04)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(21,34,50,0.08)';
              }}
            >
              <div className="flex items-start justify-between mb-2.5">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(57,204,204,0.12)' }}
                >
                  <threat.icon size={16} style={{ color: '#39CCCC' }} />
                </div>
                <span
                  className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{
                    background: `${threat.severityColor}15`,
                    color: threat.severityColor,
                  }}
                >
                  {threat.severity}
                </span>
              </div>

              <h3 className="font-bold text-base mb-1.5" style={{ color: '#152232' }}>
                {threat.name}
              </h3>
              <p className="text-xs leading-relaxed mb-3" style={{ color: 'rgba(21,34,50,0.6)' }}>
                {threat.description}
              </p>

              <div
                className="rounded-lg p-2.5"
                style={{ background: 'rgba(57,204,204,0.05)', border: '1px solid rgba(57,204,204,0.1)' }}
              >
                <div
                  className="text-lg font-bold tabular-nums"
                  style={{ fontFamily: "'Staatliches', 'Impact', 'Arial Narrow', sans-serif", color: '#39CCCC' }}
                >
                  {threat.stat}
                </div>
                <div className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: 'rgba(21,34,50,0.5)' }}>
                  {threat.statLabel}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
