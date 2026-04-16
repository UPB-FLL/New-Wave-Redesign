import { useState, useEffect } from 'react';
import { ArrowRight, Phone } from 'lucide-react';
import { useContent } from '../lib/useContent';

type Stat = { value: string; label: string };
type FeatureCard = { title: string; desc: string };

const defaultStats: Stat[] = [
  { value: '500+', label: 'Clients Served' },
  { value: '99.9%', label: 'Uptime Guarantee' },
  { value: '15+', label: 'Years Experience' },
  { value: '<1hr', label: 'Avg Response Time' },
];

const defaultCards: FeatureCard[] = [
  { title: 'Cybersecurity', desc: 'Enterprise-grade protection for your business data and systems.' },
  { title: 'Cloud Solutions', desc: 'Seamless migration and management of cloud environments.' },
  { title: 'Managed IT Services', desc: 'Proactive monitoring and full IT management 24/7.' },
  { title: 'Network Infrastructure', desc: 'High-performance networks built for reliability and scale.' },
];

export default function Hero() {
  const c = useContent('hero');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleScroll = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  let stats: Stat[] = defaultStats;
  let cards: FeatureCard[] = defaultCards;
  try { if (c.stats) stats = JSON.parse(c.stats); } catch { /* use default */ }
  try { if (c.feature_cards) cards = JSON.parse(c.feature_cards); } catch { /* use default */ }

  const phone = c.phone || '+19545550100';

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-white">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[700px] h-[700px] rounded-full opacity-[0.04] transition-transform duration-300 ease-out"
          style={{
            background: '#39CCCC',
            top: '-160px',
            right: '-160px',
            transform: `translate(${mousePosition.x * 0.03}px, ${mousePosition.y * 0.03}px)`,
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-[0.03] transition-transform duration-300 ease-out"
          style={{
            background: '#5EBC67',
            bottom: '0px',
            left: '-128px',
            transform: `translate(${-mousePosition.x * 0.02}px, ${-mousePosition.y * 0.02}px)`,
          }}
        />
        <div
          className="absolute w-[900px] h-[900px] rounded-full opacity-[0.015] transition-transform duration-300 ease-out"
          style={{
            background: '#152232',
            top: '50%',
            left: '50%',
            transform: `translate(calc(-50% + ${mousePosition.x * 0.01}px), calc(-50% + ${mousePosition.y * 0.01}px))`,
          }}
        />
      </div>

      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, #152232 1px, transparent 0)',
        backgroundSize: '40px 40px',
        opacity: 0.03,
      }} />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-24 pb-16 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-8 text-sm font-medium"
              style={{ background: 'rgba(57,204,204,0.1)', border: '1px solid rgba(57,204,204,0.3)', color: '#39CCCC' }}
            >
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#39CCCC' }} />
              {c.badge || '24/7 IT Support — Always On, Always Ready'}
            </div>

            <h1
              className="text-6xl lg:text-8xl leading-[0.95] tracking-tight mb-6"
              style={{ fontFamily: 'Staatliches, sans-serif', color: '#152232' }}
            >
              {c.headline_part1 || 'When technology'}{' '}
              <span style={{ color: '#39CCCC' }}>{c.headline_accent || 'matters most'}</span>
              {c.headline_part2 || ", make sure it's in the"}{' '}
              <span style={{ color: '#5EBC67' }}>{c.headline_accent2 || 'right hands.'}</span>
            </h1>

            <p
              className="text-lg lg:text-xl leading-relaxed mb-10 max-w-xl"
              style={{ color: 'rgba(21,34,50,0.65)' }}
            >
              {c.subheadline || 'Industry-certified technicians, full-time project managers, and technology advisors — ready to protect, support, and scale your business IT infrastructure.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => handleScroll('#contact')}
                className="group flex items-center justify-center gap-2.5 font-semibold px-8 py-4 rounded-xl transition-all duration-200 hover:-translate-y-0.5 text-white"
                style={{ background: '#39CCCC', boxShadow: '0 8px 32px rgba(57,204,204,0.35)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#2db8b8')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#39CCCC')}
              >
                {c.cta_primary || 'Get a Free Assessment'}
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href={`tel:${phone}`}
                className="flex items-center justify-center gap-2.5 font-semibold px-8 py-4 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
                style={{ border: '1.5px solid rgba(21,34,50,0.15)', color: '#152232', background: 'transparent' }}
              >
                <Phone size={18} style={{ color: '#5EBC67' }} />
                {c.cta_secondary || 'Call Us Now'}
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-10 mt-14">
              {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col">
                  <span
                    className="text-3xl font-bold"
                    style={{ fontFamily: 'Staatliches, sans-serif', color: '#152232', fontSize: '2.5rem', lineHeight: 1 }}
                  >
                    {stat.value}
                  </span>
                  <span className="text-sm mt-1" style={{ color: 'rgba(21,34,50,0.5)' }}>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden lg:block relative">
            <div
              className="absolute inset-0 rounded-3xl"
              style={{ background: 'linear-gradient(135deg, rgba(57,204,204,0.08) 0%, rgba(94,188,103,0.06) 100%)', border: '1px solid rgba(57,204,204,0.15)' }}
            />
            <div className="relative p-10 space-y-5">
              {cards.map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-4 p-4 rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
                  style={{ background: 'white', boxShadow: '0 2px 16px rgba(21,34,50,0.07)', border: '1px solid rgba(21,34,50,0.06)' }}
                >
                  <div>
                    <div className="font-semibold text-sm" style={{ color: '#152232' }}>{item.title}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'rgba(21,34,50,0.55)' }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(57,204,204,0.3), transparent)' }} />
    </section>
  );
}
