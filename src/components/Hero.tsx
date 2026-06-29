import { useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useContent } from '../lib/useContent';
import { Spotlight } from './ui/spotlight';
import { ShimmerButton } from './ui/shimmer-button';
import { useHlsVideo } from '../lib/useHlsVideo';
import { FADE_UP, DURATION, EASE } from '../lib/animation';

type Stat = { value: string; label: string };

const defaultStats: Stat[] = [
  { value: '24/7', label: 'Service & Monitoring' },
  { value: 'Certified', label: 'Technicians' },
  { value: 'Dedicated', label: 'Project Managers' },
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

  const scrollToServices = () => {
    const el = document.getElementById('services');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    else navigate('/services');
  };

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

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-3xl text-left">
          <MotionDiv delay={0}>
            <div className="flex items-center gap-3 mb-5 sm:mb-6">
              <span className="h-0.5 w-8 rounded-full" style={{ background: 'linear-gradient(90deg, #39CCCC 0%, #5EBC67 100%)' }} />
              <span className="text-xs sm:text-sm font-semibold tracking-wide" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {c.badge || 'Managed IT • Cybersecurity • Cloud'}
              </span>
            </div>
          </MotionDiv>

          <MotionDiv delay={0.1}>
            <h1
              className="text-4xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-tight mb-5 sm:mb-6"
              style={{ fontFamily: "'Staatliches', 'Impact', 'Arial Narrow', sans-serif", color: '#ffffff' }}
            >
              {c.headline_part1 || 'IT support that keeps your business'}{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #39CCCC 0%, #5EBC67 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {c.headline_accent || 'ahead of the current'}
              </span>
              {c.headline_part2 ? <>{' '}{c.headline_part2}</> : null}
              {c.headline_accent2 ? <>{' '}<span style={{ color: '#5EBC67' }}>{c.headline_accent2}</span></> : null}
            </h1>
          </MotionDiv>

          <MotionDiv delay={0.2}>
            <p
              className="text-sm sm:text-base lg:text-lg leading-relaxed mb-6 sm:mb-8 max-w-xl"
              style={{ color: 'rgba(255,255,255,0.72)' }}
            >
              {c.subheadline || 'New Wave IT helps small and mid-sized teams reduce downtime, strengthen security, and simplify day-to-day technology with responsive managed IT support.'}
            </p>
          </MotionDiv>

          <MotionDiv delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 mb-8 sm:mb-10">
              <ShimmerButton
                onClick={() => navigate('/contact')}
                className="px-6 py-3 rounded-xl text-base"
              >
                {c.cta_primary || 'Schedule a Free Assessment'}
                <ArrowRight size={16} />
              </ShimmerButton>
              <button
                type="button"
                onClick={scrollToServices}
                className="flex items-center justify-center gap-2 font-semibold px-6 py-3 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  border: '1.5px solid rgba(255,255,255,0.25)',
                  color: '#ffffff',
                  background: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {c.cta_secondary || 'See How We Help'}
              </button>
            </div>
          </MotionDiv>

          {/* Stats row */}
          <MotionDiv delay={0.4}>
            <div className="flex flex-wrap gap-x-10 gap-y-6 sm:gap-x-14 pt-7 sm:pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
              {stats.map((stat) => (
                <div key={stat.label} className="text-left">
                  <div
                    className="text-3xl sm:text-4xl font-bold"
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
                  <div className="text-xs sm:text-sm mt-1 font-medium" style={{ color: 'rgba(255,255,255,0.62)' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </MotionDiv>
        </div>
      </div>
    </section>
  );
}
