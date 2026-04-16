import { Shield, Headphones, Wrench, Monitor, Cloud, Network } from 'lucide-react';
import { useContent } from '../lib/useContent';

const iconMap: Record<string, React.ElementType> = {
  Cybersecurity: Shield,
  'Live IT Support': Headphones,
  'IT Repair & Upgrades': Wrench,
  'Managed IT Services': Monitor,
  'Cloud Solutions': Cloud,
  'Network Infrastructure': Network,
};

const defaultCards = [
  { title: 'Cybersecurity', description: 'Protect your business from evolving threats with enterprise-grade security solutions.', highlights: ['Threat detection & response', 'Firewall & endpoint protection', 'Compliance audits'], accent: '#39CCCC' },
  { title: 'Live IT Support', description: 'Real humans, real solutions — available 24/7 for any IT issue, big or small.', highlights: ['24/7 help desk access', 'Remote & on-site support', 'Fast resolution times'], accent: '#5EBC67' },
  { title: 'IT Repair & Upgrades', description: "Hardware failures and slow systems don't wait — neither do we.", highlights: ['Hardware repair & replacement', 'System upgrades & optimization', 'Data recovery services'], accent: '#39CCCC' },
  { title: 'Managed IT Services', description: 'Fully managed IT so you can focus on growing your business, not troubleshooting it.', highlights: ['Proactive monitoring 24/7', 'Patch management', 'IT roadmap & strategy'], accent: '#5EBC67' },
  { title: 'Cloud Solutions', description: 'Modernize your infrastructure with scalable, secure cloud environments built for your needs.', highlights: ['Cloud migration & setup', 'Microsoft 365 management', 'Hybrid environment support'], accent: '#39CCCC' },
  { title: 'Network Infrastructure', description: 'Reliable, high-performance networks engineered for uptime and business continuity.', highlights: ['Network design & installation', 'WiFi solutions & optimization', 'VPN & remote access'], accent: '#5EBC67' },
];

export default function Services() {
  const c = useContent('services');

  let cards = defaultCards;
  try { if (c.cards) cards = JSON.parse(c.cards); } catch { /* use default */ }

  return (
    <section id="services" className="bg-white py-28" style={{ borderTop: '1px solid rgba(21,34,50,0.06)' }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#39CCCC' }}>
            {c.section_label || 'What We Do'}
          </span>
          <h2
            className="text-4xl lg:text-5xl mt-3 mb-5 leading-tight"
            style={{ fontFamily: 'Staatliches, sans-serif', color: '#152232' }}
          >
            {c.headline || 'IT Services Built for'}{' '}
            <span style={{ color: '#39CCCC' }}>Modern Business</span>
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: 'rgba(21,34,50,0.6)' }}>
            {c.subheadline || 'From day-to-day support to long-term IT strategy, we provide everything your business needs to stay secure, efficient, and ahead of the curve.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((service) => {
            const Icon = iconMap[service.title] || Shield;
            const highlights = Array.isArray(service.highlights) ? service.highlights : [];
            return (
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
                  <Icon size={24} style={{ color: service.accent }} />
                </div>
                <h3 className="font-bold text-xl mb-3" style={{ color: '#152232' }}>{service.title}</h3>
                <p className="text-sm leading-relaxed mb-5" style={{ color: 'rgba(21,34,50,0.6)' }}>{service.description}</p>
                <div className="flex flex-wrap gap-2">
                  {highlights.map((h: string) => (
                    <span key={h} className="text-xs font-medium px-3 py-1 rounded-full" style={{ background: `${service.accent}12`, color: service.accent }}>
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
