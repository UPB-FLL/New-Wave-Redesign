import { Shield, Award, Star, Users, TrendingUp, CheckCircle, Lock, Cloud, Server, Zap, Globe, Briefcase, Sparkles } from 'lucide-react';
import { useContent } from '../lib/useContent';

type TrustItem = { icon: string; label: string; sub: string };

const iconMap: Record<string, typeof Shield> = {
  Shield, Award, Star, Users, TrendingUp, CheckCircle, Lock, Cloud, Server, Zap, Globe, Briefcase,
};

const defaultTrustItems: TrustItem[] = [
  { icon: 'Shield', label: 'SOC 2 Type II', sub: 'Audited & Certified' },
  { icon: 'Award', label: 'Microsoft Gold', sub: 'Cloud Solutions Partner' },
  { icon: 'Users', label: 'Cisco Premier', sub: 'Network Solutions' },
  { icon: 'Star', label: 'CompTIA', sub: 'Authorized Partner' },
  { icon: 'TrendingUp', label: 'HIPAA Compliant', sub: 'Healthcare Ready' },
];

export default function TrustBar() {
  const c = useContent('trustbar');

  let items: TrustItem[] = defaultTrustItems;
  try { if (c.items) items = JSON.parse(c.items); } catch { /* use default */ }

  const heading = c.heading || 'Trusted by 500+ businesses across South Florida';

  return (
    <section
      className="py-8 sm:py-10 relative"
      style={{
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafb 100%)',
        borderTop: '1px solid rgba(21,34,50,0.06)',
        borderBottom: '1px solid rgba(21,34,50,0.06)',
        zIndex: 10,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-10 relative">
          {/* Glow background */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl -z-10"
            style={{
              background: 'radial-gradient(circle, rgba(57,204,204,0.2) 0%, transparent 70%)',
            }}
          />

          {/* Badge container */}
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-4 sm:mb-5" style={{ background: 'rgba(57,204,204,0.1)', border: '1.5px solid rgba(57,204,204,0.3)', backdropFilter: 'blur(8px)' }}>
            <Sparkles size={16} style={{ color: '#39CCCC' }} className="animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#39CCCC' }}>
              Trusted Partner
            </span>
          </div>

          {/* Main heading */}
          <h2
            className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight"
            style={{
              background: 'linear-gradient(135deg, #152232 0%, #39CCCC 50%, #5EBC67 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontFamily: "'Staatliches', 'Impact', 'Arial Narrow', sans-serif",
              animation: 'fadeInUp 0.6s ease-out',
            }}
          >
            {heading}
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
          {items.map((item, idx) => {
            const Icon = iconMap[item.icon] || Shield;
            return (
              <div
                key={`${item.label}-${idx}`}
                className="relative group"
                style={{
                  animation: `slideUp 0.6s ease-out ${idx * 0.1}s both`,
                }}
              >
                {/* Glow effect */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(57,204,204,0.3) 0%, rgba(94,188,103,0.2) 100%)',
                  }}
                />

                {/* Card */}
                <div
                  className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-2xl transition-all duration-300 group-hover:-translate-y-1"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.6) 100%)',
                    border: '1.5px solid rgba(57,204,204,0.25)',
                    boxShadow: '0 4px 20px rgba(57,204,204,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <div
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                    style={{ background: 'rgba(57,204,204,0.15)' }}
                  >
                    <Icon size={16} className="sm:w-[18px] sm:h-[18px]" style={{ color: '#39CCCC' }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] sm:text-xs font-bold truncate" style={{ color: '#152232' }}>
                      {item.label}
                    </div>
                    <div className="text-[9px] sm:text-[10px] truncate" style={{ color: 'rgba(21,34,50,0.6)' }}>
                      {item.sub}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <style>{`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </section>
  );
}
