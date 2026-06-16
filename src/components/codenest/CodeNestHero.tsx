import { ArrowRight } from 'lucide-react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import CodeNestNav from './CodeNestNav';
import VideoBackground from './VideoBackground';
import LiquidGlassCard from './LiquidGlassCard';

const GREEN = '#5ed29c';
const INK = '#070b0a';

/** Soft horizontal ellipse glow (cyan / dark-green) blurred behind the headline. */
function CentralGlow() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/3"
      width="1100"
      height="460"
      viewBox="0 0 1100 460"
      style={{ maxWidth: 'none' }}
    >
      <defs>
        <filter id="cn-glow-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="25" />
        </filter>
      </defs>
      <ellipse cx="550" cy="230" rx="440" ry="120" fill="#0d5a45" opacity="0.55" filter="url(#cn-glow-blur)" />
      <ellipse cx="550" cy="220" rx="300" ry="80" fill="#39CCCC" opacity="0.28" filter="url(#cn-glow-blur)" />
    </svg>
  );
}

/** Three thin vertical guide lines at 25 / 50 / 75% (desktop only). */
function GridLines() {
  return (
    <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden="true">
      <div className="absolute bottom-0 top-0 left-1/4 w-px bg-white/10" />
      <div className="absolute bottom-0 top-0 left-1/2 w-px bg-white/10" />
      <div className="absolute bottom-0 top-0 left-3/4 w-px bg-white/10" />
    </div>
  );
}

export default function CodeNestHero() {
  const reduced = useReducedMotion();

  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: reduced ? 0 : 0.1, delayChildren: reduced ? 0 : 0.1 } },
  };
  const item: Variants = {
    hidden: reduced ? { opacity: 1 } : { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0, 0, 0.2, 1] } },
  };

  return (
    <section
      id="top"
      className="relative min-h-screen w-full overflow-hidden font-inter"
      style={{ background: INK }}
    >
      <VideoBackground />
      <CentralGlow />
      <GridLines />
      <CodeNestNav />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 pb-20 pt-28 lg:px-10">
        <motion.div
          className="max-w-2xl"
          variants={container}
          initial="hidden"
          animate="visible"
        >
          {/* Floating liquid glass card, lifted above the headline. */}
          <motion.div variants={item} className="mb-2">
            <LiquidGlassCard />
          </motion.div>

          {/* Eyebrow */}
          <motion.p
            variants={item}
            className="font-jakarta font-bold uppercase tracking-[0.18em]"
            style={{ fontSize: '11px', color: GREEN }}
          >
            Career-Ready Curriculum
          </motion.p>

          {/* Main headline */}
          <motion.h1
            variants={item}
            className="mt-4 font-inter font-extrabold uppercase tracking-tight text-white"
            style={{ fontSize: 'clamp(40px, 7vw, 72px)', lineHeight: 1.02 }}
          >
            Launch your coding career<span style={{ color: GREEN }}>.</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            variants={item}
            className="mt-6 font-inter text-white/70"
            style={{ fontSize: '14px', maxWidth: '512px', lineHeight: 1.7 }}
          >
            Master in-demand coding skills through project-based courses, real-world mentorship,
            and a curriculum engineered around exactly what employers hire for today.
          </motion.p>

          {/* Primary CTA */}
          <motion.div variants={item} className="mt-9">
            <a
              href="#get-started"
              className="group inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-inter font-bold uppercase tracking-wide transition-all duration-200 hover:-translate-y-0.5"
              style={{ background: GREEN, color: INK, boxShadow: '0 10px 30px rgba(94,210,156,0.3)' }}
            >
              Get Started
              <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" />
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
