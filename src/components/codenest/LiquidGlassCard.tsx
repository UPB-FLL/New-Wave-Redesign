import { useReducedMotion } from 'framer-motion';

/**
 * 200×200 "liquid glass" card that floats above the headline.
 *
 * The frosted surface, inner highlight and gradient border frame live in the
 * `.cn-liquid-glass` utility (see index.css) because the masked border relies
 * on a ::before pseudo-element. The -50px lift is applied here; when motion is
 * allowed it is handed to the float keyframes via the `--cn-lift` custom prop
 * so the animation oscillates around the lifted position.
 */
export default function LiquidGlassCard() {
  const reduced = useReducedMotion();

  return (
    <div
      className={`cn-liquid-glass relative h-[200px] w-[200px] rounded-2xl p-5 text-white ${
        reduced ? '' : 'cn-animate-float'
      }`}
      style={
        reduced
          ? { transform: 'translateY(-50px)' }
          : ({ '--cn-lift': '-50px', transform: 'translateY(-50px)' } as React.CSSProperties)
      }
    >
      <div className="flex h-full flex-col justify-between">
        <span
          className="font-jakarta font-medium tracking-[0.25em] text-white/70"
          style={{ fontSize: '14px' }}
        >
          [ 2025 ]
        </span>

        <h3
          className="font-inter font-semibold leading-snug text-white"
          style={{ fontSize: '18px' }}
        >
          Taught by{' '}
          <span className="font-instrument italic font-normal" style={{ color: '#5ed29c' }}>
            Industry
          </span>{' '}
          Professionals
        </h3>

        <p className="font-inter leading-relaxed text-white/55" style={{ fontSize: '11px' }}>
          Learn directly from engineers shipping real products at scale.
        </p>
      </div>
    </div>
  );
}
