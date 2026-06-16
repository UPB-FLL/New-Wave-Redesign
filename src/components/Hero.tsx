import { useRef } from 'react';
import { ArrowRight, Phone } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useContent } from '../lib/useContent';
import { Spotlight } from './ui/spotlight';
import { ShimmerButton } from './ui/shimmer-button';
import { useHlsVideo } from '../lib/useHlsVideo';
import { FADE_UP, DURATION, EASE } from '../lib/animation';

type Stat = { value: string; label: string };

const defaultStats: Stat[] = [
  { value: '80+', label: 'Clients Served' },
  { value: '99.9%', label: 'Uptime Guarantee' },
  { value: '15+', label: 'Years Experience' },
  { value: '<1hr', label: 'Avg Response Time' },
];

const INK = '#070d14';

function MotionDiv({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: FADE_UP.hidden,
        visible: { ...FADE_UP.visible, transition: { duration: DURATION.base, ease: EASE.out, delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Full-bleed Mux video behind the hero, darkened so the content stays legible. */
function HeroVideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  useHlsVideo(videoRef);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ opacity: 0.5 }}
      />
      {/* Uniform darkening for overall contrast. */}
      <div className="absolute inset-0" style={{ background: 'rgba(7,13,20,0.5)' }} />
      {/* Vertical gradient: darker at the top (navbar seam) and bottom (stats row). */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(7,13,20,0.78) 0%, rgba(7,13,20,0.28) 40%, rgba(7,13,20,0.92) 100%)',
        }}
      />
    </div>
  );
}

export default function Hero() {
  const c = useContent('hero');
  const navigate = useNavigate();

  let stats: Stat[] = defaultStats;
  try { if (c.stats) stats = JSON.parse(c.stats); } catch { /* use default */ }

  const phone = c.phone || '+19545550100';

  return (
    <section
      id="hero"
      className="relative flex items-center overflow-hidden pt-28 pb-16 sm:pt-32 sm:pb-20 min-h-[640px] sm:min-h-[82vh]"
      style={{ zIndex: 20, background: INK }}
    >
      {/* Cinematic video background */}
      <HeroVideoBackground />

      {/* Brand glow over the video */}
      <Spotlight />

      {/* Subtle grid texture */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
        <MotionDiv delay={0}>
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-4 sm:mb-5 text-[10px] sm:text-xs font-semibold"
            style={{ background: 'rgba(57,204,204,0.12)', border: '1px solid rgba(57,204,204,0.35)', color: '#39CCCC' }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#39CCCC' }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#39CCCC' }} />
            </span>
            {c.badge || '24/7 IT Support — Always On, Always Ready'}
          </div>
        </MotionDiv>

        <MotionDiv delay={0.1}>
          <h1
            className="text-4xl sm:text-5xl lg:text-7xl leading-[0.95] tracking-tight mb-4 sm:mb-5"
            style={{ fontFamily: "'Staatliches', 'Impact', 'Arial Narrow', sans-serif", color: '#ffffff' }}
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
        </MotionDiv>

        <MotionDiv delay={0.2}>
          <p
            className="text-sm sm:text-base lg:text-lg leading-relaxed mb-5 sm:mb-7 max-w-2xl mx-auto"
            style={{ color: 'rgba(255,255,255,0.72)' }}
          >
            {c.subheadline || 'Industry-certified technicians, full-time project managers, and technology advisors — ready to protect, support, and scale your business IT infrastructure.'}
          </p>
        </MotionDiv>

        <MotionDiv delay={0.3}>
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 mb-6 sm:mb-7 justify-center">
            <ShimmerButton
              onClick={() => navigate('/contact')}
              className="px-6 py-3 rounded-xl text-base"
            >
              {c.cta_primary || 'Get a Free Assessment'}
              <ArrowRight size={16} />
            </ShimmerButton>
            <a
              href={`tel:${phone}`}
              className="flex items-center justify-center gap-2 font-semibold px-6 py-3 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
              style={{
                border: '1.5px solid rgba(255,255,255,0.25)',
                color: '#ffffff',
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <Phone size={16} style={{ color: '#5EBC67' }} />
              {c.cta_secondary || 'Call Us Now'}
            </a>
          </div>
        </MotionDiv>

        {/* Stats row */}
        <MotionDiv delay={0.4}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-6 sm:pt-8 max-w-3xl mx-auto" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
            {stats.map((stat, idx) => (
              <div
                key={stat.label}
                className={`relative group animate-slide-up-${Math.min(idx + 1, 4)}`}
              >
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"
                  style={{ background: 'linear-gradient(135deg, rgba(57,204,204,0.3) 0%, rgba(94,188,103,0.2) 100%)' }}
                />
                <div
                  className="relative p-4 sm:p-5 rounded-2xl backdrop-blur-md transition-all duration-300 group-hover:-translate-y-1"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
                    border: '1.5px solid rgba(255,255,255,0.14)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)',
                  }}
                >
                  <div
                    className="text-2xl sm:text-3xl lg:text-4xl font-bold tabular-nums"
                    style={{
                      fontFamily: "'Staatliches', 'Impact', 'Arial Narrow', sans-serif",
                      background: 'linear-gradient(135deg, #39CCCC 0%, #5EBC67 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-[10px] sm:text-xs mt-1.5 font-medium" style={{ color: 'rgba(255,255,255,0.62)' }}>
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </MotionDiv>
      </div>
    </section>
  );
}
