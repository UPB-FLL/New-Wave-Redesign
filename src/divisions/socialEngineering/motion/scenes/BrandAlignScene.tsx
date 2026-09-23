// Brand development hero: "...so you look the same everywhere."
// Four touchpoints (a website, a social profile on a phone, a map listing and
// a printed card) start scattered and tilted, each wearing a different mark.
// They snap upright onto one line, and every mark becomes the same amber
// brand wave. No check: the promise here is recognition.
import { motion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';
import {
  Draw,
  Icon,
  SceneFrame,
  useSceneState,
  wavePath,
  type Point,
  type SceneColor,
  type SceneProps,
  type WaveGeometry,
} from '../index';
import { dot, roundRect } from './shapes';

/** Every mark sits at the same height, the same size. */
const MARK_Y = 178;
const MARK_WIDTH = 40;
const brandMark = (x: number) => wavePath({ x, y: MARK_Y, width: MARK_WIDTH, amplitude: 6 });

interface Touchpoint {
  /** Centre the tilt turns around. */
  c: Point;
  /** Scattered start pose: [dx, dy, degrees]. */
  from: readonly [number, number, number];
  /** Outline strokes, drawn in order. */
  outline: readonly string[];
  /** Left end of its mark. */
  wx: number;
  /** The mismatched mark it starts with. */
  startMark: Pick<WaveGeometry, 'amplitude' | 'rise'>;
  startColor: SceneColor;
  /** Map-pin icon for the listing card. */
  pin?: boolean;
}

const TOUCHPOINTS: readonly Touchpoint[] = [
  {
    // Website: the service-web browser.
    c: [88, 164],
    from: [10, -64, -12],
    outline: [roundRect(40, 124, 96, 80, 8), 'M 40 142 L 136 142', dot(52, 133), dot(62, 133)],
    wx: 68,
    startMark: { amplitude: -9, rise: 10 },
    startColor: 'cyan',
  },
  {
    // Social profile on a phone.
    c: [192, 154],
    from: [18, 58, 10],
    outline: [roundRect(164, 104, 56, 100, 10), 'M 184 116 L 200 116'],
    wx: 172,
    startMark: { amplitude: 13, rise: -8 },
    startColor: 'tide',
  },
  {
    // Map listing: a card under a pin.
    c: [292, 164],
    from: [-24, -74, -8],
    outline: [roundRect(244, 144, 96, 60, 8)],
    wx: 272,
    startMark: { amplitude: 0, rise: 7 },
    startColor: 'line2',
    pin: true,
  },
  {
    // Printed card.
    c: [402, 178],
    from: [-14, 54, 14],
    outline: [roundRect(364, 152, 76, 52, 6)],
    wx: 382,
    startMark: { amplitude: 2.5, rise: -9 },
    startColor: 'accent',
  },
];

const SNAP_AT = 1.1;
const SNAP_STAGGER = 0.05;
const SNAP_DURATION = 0.9;
const MORPH_AT = 2.0;
const UNIFY_AT = 2.45;

/** Holds a touchpoint in its scattered pose, then snaps it upright onto the line. */
function Snap({ c, from, delay, children }: { c: Point; from: Touchpoint['from']; delay: number; children: ReactNode }) {
  const state = useSceneState();
  if (state.isStatic) return <g>{children}</g>;
  const [dx, dy, rotate] = from;
  const variants: Variants = {
    hidden: { x: dx, y: dy, rotate },
    shown: { x: 0, y: 0, rotate: 0, transition: { delay, duration: SNAP_DURATION, ease: [0.22, 1, 0.36, 1] } },
  };
  return (
    <motion.g
      // Turn about the touchpoint's own centre, in viewBox units, so nothing drifts.
      style={{ transformBox: 'view-box', originX: `${c[0]}px`, originY: `${c[1]}px` }}
      variants={variants}
      initial={state.phase === 'done' ? false : 'hidden'}
      animate={state.phase === 'idle' ? 'hidden' : 'shown'}
    >
      {children}
    </motion.g>
  );
}

/** The mismatched start mark: it morphs into the shared shape, then fades as the amber mark takes over. */
function OldMark({ tp, delay }: { tp: Touchpoint; delay: number }) {
  const state = useSceneState();
  // Gone from the final frame: never rendered statically, and dropped once the timeline is done.
  if (state.isStatic || state.phase === 'done') return null;
  const variants: Variants = {
    hidden: { opacity: 1 },
    shown: { opacity: 0, transition: { delay: UNIFY_AT, duration: 0.4, ease: 'easeIn' } },
  };
  return (
    <motion.g variants={variants} initial="hidden" animate={state.phase === 'idle' ? 'hidden' : 'shown'}>
      <Draw
        d={wavePath({ x: tp.wx, y: MARK_Y, width: MARK_WIDTH, ...tp.startMark })}
        to={brandMark(tp.wx)}
        color={tp.startColor}
        delay={delay}
        duration={0.5}
        morphDelay={MORPH_AT}
        morphDuration={0.5}
      />
    </motion.g>
  );
}

export function BrandAlignScene({ tone, className, forceStatic }: SceneProps) {
  return (
    <SceneFrame tone={tone} className={className} forceStatic={forceStatic} duration={3.2}>
      {/* The one line everything lines up on. */}
      <Draw d="M 24 222 L 456 222" color="line2" delay={1.3} duration={0.8} />

      {TOUCHPOINTS.map((tp, i) => {
        const start = i * 0.12;
        return (
          <Snap key={tp.wx} c={tp.c} from={tp.from} delay={SNAP_AT + i * SNAP_STAGGER}>
            {tp.outline.map((d, k) => (
              <Draw key={d} d={d} delay={start + k * 0.08} duration={k >= 2 ? 0.15 : 0.6} />
            ))}
            {tp.pin ? <Icon name="map-pin" x={292} y={122} size={36} delay={start + 0.08} duration={0.6} /> : null}
            <OldMark tp={tp} delay={0.35 + i * 0.12} />
            {/* One brand, everywhere: the same amber wave at the same height. */}
            <Draw d={brandMark(tp.wx)} accent delay={UNIFY_AT} duration={0.5} ease="easeOut" />
          </Snap>
        );
      })}
    </SceneFrame>
  );
}

export default BrandAlignScene;
