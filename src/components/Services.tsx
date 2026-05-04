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
    <section id="services" className="bg-white py-12 sm:py-16 relative" style={{ borderTop: '1px solid rgba(21,34,50,0.06)', zIndex: 10 }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-10">
          <span className="text-xs sm:text-sm font-semibold uppercase tracking-widest" style={{ color: '#39CCCC' }}>
            {c.section_label || 'What We Do'}
          </span>
          <h2
            className="text-4xl sm:text-5xl lg:text-7xl mt-2 mb-4 leading-[0.95] tracking-tight"
            style={{ fontFamily: "'Staatliches', 'Impact', 'Arial Narrow', sans-serif", color: '#152232' }}
          >
            {c.headline && c.headline_accent ? (
              <>
                {c.headline}{' '}
                <span style={{ display: 'inline-block', background: 'linear-gradient(135deg, #39CCCC 0%, #5EBC67 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{c.headline_accent}</span>
              </>
            ) : (
              <>
                IT Services Built for{' '}
                <span style={{ display: 'inline-block', background: 'linear-gradient(135deg, #39CCCC 0%, #5EBC67 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Modern Business</span>
              </>
            )}
          </h2>
          <p className="text-sm sm:text-base max-w-2xl mx-auto" style={{ color: 'rgba(21,34,50,0.6)' }}>
            {c.subheadline || 'From day-to-day support to long-term IT strategy, we provide everything your business needs to stay secure, efficient, and ahead of the curve.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {cards.map((service) => {
            const Icon = iconMap[service.title] || Shield;
            const highlights = Array.isArray(service.highlights) ? service.highlights : [];
            return (
              <div
                key={service.title}
                className="group rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1"
                style={{ background: 'rgba(26, 47, 63, 0.8)', border: `1px solid ${service.accent}40`, boxShadow: `0 2px 12px ${service.accent}10` }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 40px ${service.accent}30`;
                  (e.currentTarget as HTMLElement).style.borderColor = `${service.accent}80`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 2px 12px ${service.accent}10`;
                  (e.currentTarget as HTMLElement).style.borderColor = `${service.accent}40`;
                }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${service.accent}25` }}>
                  <Icon size={20} style={{ color: service.accent }} />
                </div>
                <h3 className="font-bold text-lg mb-2" style={{ color: '#E0F2F1' }}>{service.title}</h3>
                <p className="text-sm leading-relaxed mb-3" style={{ color: 'rgba(224,242,241,0.75)' }}>{service.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {highlights.map((h: string) => (
                    <span key={h} className="text-xs font-medium px-2.5 py-0.5 rounded-full" style={{ background: `${service.accent}35`, color: service.accent, border: `1px solid ${service.accent}60` }}>
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
