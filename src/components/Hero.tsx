import { ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContent } from '../lib/useContent';
import { FADE_UP, DURATION, EASE } from '../lib/animation';
import { CurrentField } from './brand/CurrentField';
import { HeroRibbonField } from './hero/HeroRibbonField';

type Stat = { value: string; label: string };

const defaultStats: Stat[] = [
  { value: '24/7', label: 'Service and monitoring' },
  { value: 'Certified', label: 'Technicians' },
  { value: 'Dedicated', label: 'Project managers' },
];

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

export default function Hero() {
  const content = useContent('hero');
  const navigate = useNavigate();
  const reducedMotion = Boolean(useReducedMotion());
  const [ribbonsReady, setRibbonsReady] = useState(false);
  const [ribbonsFailed, setRibbonsFailed] = useState(false);
  const handleRibbonsReady = useCallback(() => setRibbonsReady(true), []);
  const handleRibbonsFailure = useCallback(() => {
    setRibbonsReady(false);
    setRibbonsFailed(true);
  }, []);

  useEffect(() => {
    if (reducedMotion) setRibbonsReady(false);
  }, [reducedMotion]);

  let stats: Stat[] = defaultStats;
  try {
    if (content.stats) stats = JSON.parse(content.stats);
  } catch {
    // Keep the approved default metrics when CMS content is malformed.
  }

  const secondaryAction = () => {
    if (content.cta_secondary) {
      const services = document.getElementById('services');
      if (services) services.scrollIntoView({ behavior: 'smooth' });
      else navigate('/services');
      return;
    }
    navigate('/support');
  };

  const fallbackVisible = reducedMotion || ribbonsFailed || !ribbonsReady;

  return (
    <section
      id="hero"
      className="relative flex min-h-[640px] items-center overflow-hidden pb-16 pt-28 sm:min-h-[82vh] sm:pb-20 sm:pt-32"
      style={{ background: 'var(--nw-deep-current)', zIndex: 20 }}
    >
      <div
        data-testid="hero-current-fallback"
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${
          fallbackVisible ? 'opacity-80' : 'opacity-25'
        }`}
      >
        <CurrentField
          density="highImpact"
          tone="dark"
          strokeColor="#F7FBFA"
          className="h-full w-full"
        />
      </div>

      <HeroRibbonField
        disabled={reducedMotion || ribbonsFailed}
        onReady={handleRibbonsReady}
        onFailure={handleRibbonsFailure}
      />

      <div
        data-testid="hero-readability-veil"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(9,19,29,0.96) 0%, rgba(9,19,29,0.78) 44%, rgba(9,19,29,0.18) 78%, rgba(9,19,29,0.08) 100%)',
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl text-left">
          <MotionDiv delay={0}>
            <div className="mb-5 flex items-center gap-3 sm:mb-6">
              <span className="h-0.5 w-8 bg-[var(--nw-signal-cyan)]" />
              <span className="nw-meta text-xs font-semibold text-[var(--nw-cloud-white)] sm:text-sm">
                {content.badge || 'Fort Lauderdale, Florida'}
              </span>
            </div>
          </MotionDiv>

          <MotionDiv delay={0.1}>
            <h1 className="nw-display mb-5 text-4xl leading-[1.05] text-[var(--nw-cloud-white)] sm:mb-6 sm:text-6xl lg:text-7xl">
              {content.headline_part1 || 'Technology that keeps business moving.'}{' '}
              {content.headline_accent ? <span className="text-[var(--nw-signal-cyan)]">{content.headline_accent}</span> : null}
              {content.headline_part2 ? ` ${content.headline_part2}` : null}
              {content.headline_accent2 ? <span className="text-[var(--nw-tide-blue)]"> {content.headline_accent2}</span> : null}
            </h1>
          </MotionDiv>

          <MotionDiv delay={0.2}>
            <p className="mb-7 max-w-xl text-base leading-relaxed text-[var(--nw-mist-gray)] sm:mb-8 lg:text-lg">
              {content.subheadline || 'Managed IT, cybersecurity, cloud, and support built around the way your business actually works.'}
            </p>
          </MotionDiv>

          <MotionDiv delay={0.3}>
            <div className="mb-8 flex flex-col gap-3 sm:mb-10 sm:flex-row">
              <button type="button" onClick={() => navigate('/contact')} className="btn-primary">
                {content.cta_primary || 'Request an assessment'}
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={secondaryAction}
                className="inline-flex items-center justify-center gap-2 rounded-md border px-5 py-3 font-semibold text-[var(--nw-cloud-white)] transition-colors hover:border-[var(--nw-signal-cyan)] hover:text-[var(--nw-signal-cyan)]"
                style={{ borderColor: 'var(--nw-slate)', background: 'transparent' }}
              >
                {content.cta_secondary || 'Get support'}
              </button>
            </div>
          </MotionDiv>

          <MotionDiv delay={0.4}>
            <div className="flex flex-wrap gap-x-10 gap-y-6 border-t pt-7 sm:gap-x-14 sm:pt-8" style={{ borderColor: 'var(--nw-slate)' }}>
              {stats.map((stat) => (
                <div key={stat.label} className="text-left">
                  <div className="nw-display text-3xl text-[var(--nw-signal-cyan)] sm:text-4xl">{stat.value}</div>
                  <div className="mt-1 text-xs font-medium text-[var(--nw-mist-gray)] sm:text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </MotionDiv>
        </div>
      </div>
    </section>
  );
}
