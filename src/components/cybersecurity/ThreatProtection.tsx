import { CheckCircle, AlertTriangle, Zap, Bug, Mail, Lock } from 'lucide-react';

const threats = [
  { icon: Bug, name: 'Malware & Ransomware', protection: 'Advanced antivirus with behavior analysis' },
  { icon: Mail, name: 'Phishing Attacks', protection: 'Email filtering and user authentication' },
  { icon: AlertTriangle, name: 'DDoS Attacks', protection: 'Multi-layer DDoS mitigation' },
  { icon: Lock, name: 'Data Breaches', protection: 'Encryption and access controls' },
  { icon: Zap, name: 'Zero-Day Exploits', protection: 'Behavioral detection and sandboxing' },
  { icon: CheckCircle, name: 'Compliance Violations', protection: 'Automated compliance monitoring' },
];

export default function ThreatProtection() {
  return (
    <section className="bg-white py-28" style={{ borderTop: '1px solid rgba(21,34,50,0.06)' }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#39CCCC' }}>
            Threat Protection
          </span>
          <h2
            className="text-4xl lg:text-5xl mt-3 mb-5 leading-tight"
            style={{ fontFamily: 'Staatliches, sans-serif', color: '#152232' }}
          >
            We Protect Against{' '}
            <span style={{ color: '#39CCCC' }}>Today's Threats</span>
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: 'rgba(21,34,50,0.6)' }}>
            Stay protected against the most common and emerging cybersecurity threats
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {threats.map((threat) => (
            <div
              key={threat.name}
              className="p-8 rounded-2xl transition-all duration-300 group"
              style={{
                background: 'white',
                border: '1px solid rgba(21,34,50,0.08)',
                boxShadow: '0 2px 12px rgba(21,34,50,0.05)'
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(57,204,204,0.15)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(57,204,204,0.4)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(21,34,50,0.05)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(21,34,50,0.08)';
              }}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(57,204,204,0.15)' }}>
                  <threat.icon size={24} style={{ color: '#39CCCC' }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-2" style={{ color: '#152232' }}>
                    {threat.name}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(21,34,50,0.6)' }}>
                    {threat.protection}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
