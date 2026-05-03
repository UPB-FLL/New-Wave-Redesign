import { ArrowRight, Phone, Sparkles, ShieldCheck, Activity, Zap } from 'lucide-react';
import { useContent } from '../lib/useContent';

type Stat = { value: string; label: string };

const defaultStats: Stat[] = [
  { value: '500+', label: 'Clients Served' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '15+', label: 'Years in Business' },
  { value: '<1hr', label: 'Avg Response' },
];

export default function Hero() {
  const c = useContent('hero');

  const handleScroll = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  let stats: Stat[] = defaultStats;
  try { if (c.stats) stats = JSON.parse(c.stats); } catch { /* use default */ }

  const phone = c.phone || '+19545550100';

  return (
    <section
      id="hero"
      className="relative flex items-center overflow-hidden bg-white pt-28 pb-16"
      style={{ zIndex: 10 }}
    >
      {/* Decorative gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(57,204,204,0.15) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          className="absolute bottom-0 -left-40 w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(94,188,103,0.12) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(21,34,50,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(21,34,50,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          {/* Left: Content */}
          <div className="lg:col-span-7">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-5 text-xs font-semibold"
              style={{ background: 'rgba(57,204,204,0.1)', border: '1px solid rgba(57,204,204,0.3)', color: '#39CCCC' }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#39CCCC' }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#39CCCC' }} />
              </span>
              {c.badge || '24/7 IT SUPPORT — ALWAYS ON, ALWAYS READY'}
            </div>

            <h1
              className="text-5xl lg:text-7xl leading-[0.95] tracking-tight mb-5"
              style={{ fontFamily: 'Staatliches, sans-serif', color: '#152232' }}
            >
              {c.headline_part1 || 'When technology'}{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #39CCCC 0%, #5EBC67 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {c.headline_accent || 'matters most'}
              </span>
              {c.headline_part2 || ", make sure it's in the"}{' '}
              <span style={{ color: '#5EBC67' }}>{c.headline_accent2 || 'right hands.'}</span>
            </h1>

            <p
              className="text-base lg:text-lg leading-relaxed mb-7 max-w-xl"
              style={{ color: 'rgba(21,34,50,0.65)' }}
            >
              {c.subheadline || 'Industry-certified technicians, full-time project managers, and technology advisors — ready to protect, support, and scale your business IT infrastructure.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-7">
              <button
                onClick={() => handleScroll('#contact')}
                className="group flex items-center justify-center gap-2 font-semibold px-6 py-3 rounded-xl transition-all duration-200 hover:-translate-y-0.5 text-white"
                style={{
                  background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)',
                  boxShadow: '0 8px 32px rgba(57,204,204,0.35)',
                }}
              >
                {c.cta_primary || 'Get a Free Assessment'}
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href={`tel:${phone}`}
                className="flex items-center justify-center gap-2 font-semibold px-6 py-3 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  border: '1.5px solid rgba(21,34,50,0.15)',
                  color: '#152232',
                  background: 'rgba(255,255,255,0.6)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <Phone size={16} style={{ color: '#5EBC67' }} />
                {c.cta_secondary || 'Call Us Now'}
              </a>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 pt-5" style={{ borderTop: '1px solid rgba(21,34,50,0.08)' }}>
              {stats.map((stat) => (
                <div key={stat.label}>
                  <div
                    className="text-2xl lg:text-3xl font-bold tabular-nums"
                    style={{ fontFamily: 'Staatliches, sans-serif', color: '#152232' }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'rgba(21,34,50,0.55)' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: SaaS-style dashboard preview */}
          <div className="lg:col-span-5">
            <div
              className="rounded-3xl p-1"
              style={{
                background: 'linear-gradient(135deg, rgba(57,204,204,0.4), rgba(94,188,103,0.4))',
                boxShadow: '0 24px 64px rgba(21,34,50,0.12)',
              }}
            >
              <div className="rounded-3xl p-5 lg:p-6" style={{ background: 'white' }}>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} style={{ color: '#39CCCC' }} />
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#152232' }}>
                      Your IT Health
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: '#5EBC67' }} />
                    <span className="text-[10px] font-bold uppercase" style={{ color: '#5EBC67' }}>Healthy</span>
                  </div>
                </div>

                {/* Health score gauge */}
                <div
                  className="rounded-2xl p-5 mb-3 text-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(57,204,204,0.08) 0%, rgba(94,188,103,0.08) 100%)',
                    border: '1px solid rgba(57,204,204,0.15)',
                  }}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(21,34,50,0.6)' }}>
                    Overall Score
                  </div>
                  <div className="flex items-baseline justify-center gap-1 mb-2">
                    <div
                      className="text-5xl font-bold tabular-nums"
                      style={{
                        fontFamily: 'Staatliches, sans-serif',
                        background: 'linear-gradient(135deg, #39CCCC 0%, #5EBC67 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      98
                    </div>
                    <span className="text-lg font-semibold" style={{ color: 'rgba(21,34,50,0.5)' }}>/100</span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(21,34,50,0.08)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: '98%',
                        background: 'linear-gradient(90deg, #39CCCC 0%, #5EBC67 100%)',
                      }}
                    />
                  </div>
                </div>

                {/* Service indicators */}
                <div className="space-y-2">
                  {[
                    { icon: ShieldCheck, label: 'Security', value: 'Protected', color: '#5EBC67', detail: 'No threats detected' },
                    { icon: Activity, label: 'Network', value: 'Optimal', color: '#39CCCC', detail: '18ms latency' },
                    { icon: Zap, label: 'Backups', value: 'Up to date', color: '#5EBC67', detail: 'Last: 12 min ago' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors"
                      style={{ background: 'rgba(21,34,50,0.02)' }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${item.color}15` }}>
                          <item.icon size={14} style={{ color: item.color }} />
                        </div>
                        <div>
                          <div className="text-xs font-semibold" style={{ color: '#152232' }}>{item.label}</div>
                          <div className="text-[10px]" style={{ color: 'rgba(21,34,50,0.5)' }}>{item.detail}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: item.color }}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
