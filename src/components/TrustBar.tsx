import { useCallback, useEffect, useState } from 'react';
import {
  Shield, Award, Star, Users, TrendingUp, CheckCircle, Lock, Cloud, Server, Zap, Globe, Briefcase,
  Sparkles, ChevronLeft, ChevronRight, Mail, Eye, Monitor, Headphones, Network, Wrench, ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useContent } from '../lib/useContent';
import { Marquee } from './ui/marquee';
import { FadeIn } from './ui/fade-in';

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

const partnerLogos = [
  { name: 'Microsoft 365', src: '/logos/microsoft-365.svg' },
  { name: 'SentinelOne', src: '/logos/sentinelone.svg' },
  { name: 'Huntress', src: '/logos/huntress.svg' },
  { name: 'NinjaOne', src: '/logos/ninjaone.svg' },
  { name: 'ConnectWise', src: '/logos/connectwise.svg' },
  { name: 'Cloudflare', src: '/logos/cloudflare.svg' },
];

// Slide 2 — the platforms we manage and harden behind the scenes.
const tools = [
  { icon: Mail, name: 'Microsoft 365', role: 'Email, Teams & Office', accent: '#39CCCC' },
  { icon: Cloud, name: 'Azure & Entra ID', role: 'Identity & cloud infra', accent: '#5EBC67' },
  { icon: Globe, name: 'Google Workspace', role: 'Mail & collaboration', accent: '#39CCCC' },
  { icon: Shield, name: 'SentinelOne', role: 'Managed EDR', accent: '#5EBC67' },
  { icon: Eye, name: 'Huntress', role: 'Managed threat detection', accent: '#39CCCC' },
  { icon: Network, name: 'Cloudflare', role: 'Zero-trust & DNS', accent: '#5EBC67' },
  { icon: Monitor, name: 'NinjaOne', role: 'Remote monitoring (RMM)', accent: '#39CCCC' },
  { icon: Headphones, name: 'ConnectWise', role: 'Service desk & ticketing', accent: '#5EBC67' },
];

// Slide 3 — core service offerings (mirrors the Services bento).
const services = [
  { icon: Shield, title: 'Cybersecurity', blurb: 'Enterprise-grade protection against evolving threats.', slug: 'cybersecurity', accent: '#39CCCC' },
  { icon: Headphones, title: 'Live IT Support', blurb: 'Real humans, 24/7 — for any issue, big or small.', slug: 'live-it-support', accent: '#5EBC67' },
  { icon: Wrench, title: 'IT Repair & Upgrades', blurb: 'Fast hardware repair, upgrades & data recovery.', slug: 'it-repair-upgrades', accent: '#39CCCC' },
  { icon: Monitor, title: 'Managed IT Services', blurb: 'Fully managed IT so you can focus on growth.', slug: 'managed-it-services', accent: '#5EBC67' },
  { icon: Cloud, title: 'Cloud Solutions', blurb: 'Scalable, secure cloud built for your business.', slug: 'cloud-solutions', accent: '#39CCCC' },
  { icon: Network, title: 'Network Infrastructure', blurb: 'High-performance networks engineered for uptime.', slug: 'network-infrastructure', accent: '#5EBC67' },
];

const SLIDE_COUNT = 3;
const AUTO_ADVANCE_MS = 6500;

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 48 : -48 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -48 : 48 }),
};

/* ---------------------------------------------------------------- Slide 1 */
function TrustedSlide({ items }: { items: TrustItem[] }) {
  return (
    <div
      className="rounded-3xl px-5 py-8 sm:px-10 sm:py-10"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,251,0.85) 100%)',
        border: '1.5px solid rgba(57,204,204,0.22)',
        boxShadow: '0 12px 40px rgba(57,204,204,0.1), inset 0 1px 0 rgba(255,255,255,0.9)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="text-center mb-7 sm:mb-8">
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-2" style={{ background: 'rgba(57,204,204,0.1)', border: '1.5px solid rgba(57,204,204,0.3)' }}>
          <Sparkles size={16} style={{ color: '#39CCCC' }} className="animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#39CCCC' }}>Trusted Partner</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4 mb-7 sm:mb-8">
        {items.map((item, idx) => {
          const Icon = iconMap[item.icon] || Shield;
          return (
            <div key={`${item.label}-${idx}`} className="relative group">
              <div
                className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-2xl transition-all duration-300 group-hover:-translate-y-1"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.6) 100%)',
                  border: '1.5px solid rgba(57,204,204,0.25)',
                  boxShadow: '0 4px 20px rgba(57,204,204,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
                }}
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(57,204,204,0.15)' }}>
                  <Icon size={16} className="sm:w-[18px] sm:h-[18px]" style={{ color: '#39CCCC' }} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-bold truncate" style={{ color: '#152232' }}>{item.label}</div>
                  <div className="text-[9px] sm:text-[10px] truncate" style={{ color: 'rgba(21,34,50,0.6)' }}>{item.sub}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Marquee duration={28} pauseOnHover>
        {partnerLogos.map((logo) => (
          <div
            key={logo.name}
            className="flex items-center justify-center px-6 py-3 rounded-xl cursor-default select-none partner-logo-item"
            style={{ minWidth: '140px', filter: 'grayscale(1)', opacity: 0.5 }}
            title={logo.name}
          >
            <img src={logo.src} alt={logo.name} className="h-7 w-auto object-contain" style={{ color: '#152232' }} />
          </div>
        ))}
      </Marquee>
    </div>
  );
}

/* ---------------------------------------------------------------- Slide 2 */
function ToolsSlide() {
  return (
    <div
      className="rounded-3xl px-5 py-8 sm:px-10 sm:py-10 h-full"
      style={{
        background: 'linear-gradient(150deg, #152232 0%, #1A2F3F 60%, #14202b 100%)',
        border: '1.5px solid rgba(57,204,204,0.25)',
        boxShadow: '0 12px 40px rgba(21,34,50,0.35)',
      }}
    >
      <div className="text-center mb-7 sm:mb-8">
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-4" style={{ background: 'rgba(94,188,103,0.12)', border: '1.5px solid rgba(94,188,103,0.3)' }}>
          <Zap size={16} style={{ color: '#5EBC67' }} />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#5EBC67' }}>Your Stack, Managed</span>
        </div>
        <h2
          className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight"
          style={{ color: '#E0F2F1', fontFamily: "'Staatliches', 'Impact', 'Arial Narrow', sans-serif" }}
        >
          Familiar tools,{' '}
          <span style={{ background: 'linear-gradient(135deg, #39CCCC 0%, #5EBC67 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            stronger operations
          </span>
        </h2>
        <p className="text-sm sm:text-base max-w-2xl mx-auto mt-3" style={{ color: 'rgba(224,242,241,0.7)' }}>
          We run the platforms your team already knows — and harden, monitor, and optimize them behind the scenes.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <div
              key={tool.name}
              className="flex items-start gap-3 rounded-2xl p-3 sm:p-4 transition-all duration-300 hover:-translate-y-1"
              style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${tool.accent}33` }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${tool.accent}25` }}>
                <Icon size={18} style={{ color: tool.accent }} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold leading-snug" style={{ color: '#E0F2F1' }}>{tool.name}</div>
                <div className="text-[11px] sm:text-xs leading-snug mt-0.5" style={{ color: 'rgba(224,242,241,0.6)' }}>{tool.role}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Slide 3 */
function ServicesSlide() {
  return (
    <div
      className="rounded-3xl px-5 py-8 sm:px-10 sm:py-10 h-full"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,251,0.85) 100%)',
        border: '1.5px solid rgba(94,188,103,0.22)',
        boxShadow: '0 12px 40px rgba(94,188,103,0.1), inset 0 1px 0 rgba(255,255,255,0.9)',
      }}
    >
      <div className="text-center mb-7 sm:mb-8">
        <span className="text-xs sm:text-sm font-semibold uppercase tracking-widest" style={{ color: '#39CCCC' }}>What We Do</span>
        <h2
          className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight mt-2"
          style={{ color: '#152232', fontFamily: "'Staatliches', 'Impact', 'Arial Narrow', sans-serif" }}
        >
          IT Services Built for{' '}
          <span style={{ background: 'linear-gradient(135deg, #39CCCC 0%, #5EBC67 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Modern Business
          </span>
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {services.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.title}
              to={`/service-category/${s.slug}`}
              className="group flex items-start gap-3 rounded-2xl p-3 sm:p-4 no-underline transition-all duration-300 hover:-translate-y-1"
              style={{ background: 'rgba(26,47,63,0.85)', border: `1px solid ${s.accent}40` }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${s.accent}25` }}>
                <Icon size={18} style={{ color: s.accent }} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold leading-snug" style={{ color: '#E0F2F1' }}>{s.title}</div>
                <div className="text-[11px] sm:text-xs leading-snug mt-0.5" style={{ color: 'rgba(224,242,241,0.65)' }}>{s.blurb}</div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="text-center mt-7 sm:mt-8">
        <Link
          to="/services"
          className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold no-underline transition-all duration-300 hover:gap-3"
          style={{ background: 'linear-gradient(135deg, #39CCCC 0%, #5EBC67 100%)', color: '#0c1620' }}
        >
          View all services
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}

export default function TrustBar() {
  const c = useContent('trustbar');
  const reduced = useReducedMotion();

  let items: TrustItem[] = defaultTrustItems;
  try { if (c.items) items = JSON.parse(c.items); } catch { /* use default */ }

  const [[index, direction], setSlide] = useState<[number, number]>([0, 0]);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback((next: number) => {
    setSlide(([prev]) => {
      const wrapped = (next + SLIDE_COUNT) % SLIDE_COUNT;
      return [wrapped, wrapped > prev || (prev === SLIDE_COUNT - 1 && wrapped === 0) ? 1 : -1];
    });
  }, []);

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  // Auto-advance (paused on hover/focus; disabled for reduced-motion users).
  useEffect(() => {
    if (paused || reduced) return;
    const id = window.setTimeout(() => goTo(index + 1), AUTO_ADVANCE_MS);
    return () => window.clearTimeout(id);
  }, [index, paused, reduced, goTo]);

  const slides = [
    <TrustedSlide key="trusted" items={items} />,
    <ToolsSlide key="tools" />,
    <ServicesSlide key="services" />,
  ];

  return (
    <section
      className="py-10 sm:py-14 relative"
      style={{
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafb 100%)',
        borderTop: '1px solid rgba(21,34,50,0.06)',
        borderBottom: '1px solid rgba(21,34,50,0.06)',
        zIndex: 10,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div
            className="relative"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={() => setPaused(false)}
            role="region"
            aria-roledescription="carousel"
            aria-label="New Wave IT highlights"
          >
            {/* Slide viewport */}
            <div className="relative overflow-hidden">
              {reduced ? (
                <div>{slides[index]}</div>
              ) : (
                <AnimatePresence mode="wait" custom={direction} initial={false}>
                  <motion.div
                    key={index}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                  >
                    {slides[index]}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            {/* Arrow controls */}
            <button
              type="button"
              onClick={prev}
              aria-label="Previous slide"
              className="hidden sm:flex absolute top-1/2 -translate-y-1/2 -left-3 lg:-left-5 w-11 h-11 rounded-full items-center justify-center transition-all duration-300 hover:scale-110"
              style={{ background: 'rgba(255,255,255,0.95)', border: '1.5px solid rgba(57,204,204,0.3)', boxShadow: '0 4px 16px rgba(21,34,50,0.12)', color: '#152232' }}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next slide"
              className="hidden sm:flex absolute top-1/2 -translate-y-1/2 -right-3 lg:-right-5 w-11 h-11 rounded-full items-center justify-center transition-all duration-300 hover:scale-110"
              style={{ background: 'rgba(255,255,255,0.95)', border: '1.5px solid rgba(57,204,204,0.3)', boxShadow: '0 4px 16px rgba(21,34,50,0.12)', color: '#152232' }}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </FadeIn>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-2.5 mt-6">
          {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
              className="rounded-full transition-all duration-300"
              style={{
                height: '8px',
                width: i === index ? '28px' : '8px',
                background: i === index ? 'linear-gradient(135deg, #39CCCC 0%, #5EBC67 100%)' : 'rgba(21,34,50,0.2)',
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        .partner-logo-item:hover {
          filter: grayscale(0) !important;
          opacity: 1 !important;
        }
      `}</style>
    </section>
  );
}
