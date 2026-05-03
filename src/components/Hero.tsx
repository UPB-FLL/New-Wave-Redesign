import { ArrowRight, Phone } from 'lucide-react';
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
      className="relative flex items-center overflow-hidden bg-white pt-24 pb-12 sm:pt-28 sm:pb-16"
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

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
        <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-4 sm:mb-5 text-[10px] sm:text-xs font-semibold"
              style={{ background: 'rgba(57,204,204,0.1)', border: '1px solid rgba(57,204,204,0.3)', color: '#39CCCC' }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#39CCCC' }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#39CCCC' }} />
              </span>
              {c.badge || '24/7 IT SUPPORT — ALWAYS ON, ALWAYS READY'}
            </div>

            <h1
              className="text-4xl sm:text-5xl lg:text-7xl leading-[0.95] tracking-tight mb-4 sm:mb-5"
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
              className="text-sm sm:text-base lg:text-lg leading-relaxed mb-5 sm:mb-7 max-w-2xl mx-auto"
              style={{ color: 'rgba(21,34,50,0.65)' }}
            >
              {c.subheadline || 'Industry-certified technicians, full-time project managers, and technology advisors — ready to protect, support, and scale your business IT infrastructure.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 mb-6 sm:mb-7 justify-center">
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5 pt-5 sm:pt-7 max-w-3xl mx-auto" style={{ borderTop: '1px solid rgba(21,34,50,0.08)' }}>
              {stats.map((stat) => (
                <div key={stat.label}>
                  <div
                    className="text-xl sm:text-2xl lg:text-3xl font-bold tabular-nums"
                    style={{ fontFamily: 'Staatliches, sans-serif', color: '#152232' }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-[11px] sm:text-xs mt-0.5" style={{ color: 'rgba(21,34,50,0.55)' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
      </div>
    </section>
  );
}
