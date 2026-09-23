// Digital oversight hero: "...with one Fort Lauderdale team accountable for all
// of it." and "The aim is to catch a broken path before a customer runs into it."
// One dial (one team) watches every touchpoint on the customer's path. Its
// needle checks each touchpoint in turn, finds the broken link, and the missing
// piece is drawn in before the customer arrives; the customer then gets
// through to a booking. The service-oversight gauge grown into a scene, ending
// in the icon's own needle pose.
import { useState } from 'react';
import { easeInOut, motion, type AnimationDefinition, type Variants } from 'framer-motion';
import { Appear, Draw, SceneFrame, Travel, sceneColor, useSceneState, type SceneProps } from '../index';
import { BookedCalendar } from './BookedCalendar';

/** The dial: r 140 around (220, 206), from 190° to 350° (its two feet). */
const DIAL = 'M 82.13 181.69 A 140 140 0 0 1 357.87 181.69';
const PIVOT = { x: 220, y: 206 } as const;
const NEEDLE_LENGTH = 96;
/** Sweep: from pointing left (the dial's left foot) to up-right (the icon's pose). */
const NEEDLE_FROM = 190;
const NEEDLE_TO = 315;
const SWEEP_DELAY = 1.2;
const SWEEP_DURATION = 1.7;

/**
 * The customer's path at y 250: six half-waves (amplitude 8, 56 units each)
 * from 40 to 376. It starts broken: A and C are there, B (between the 4th and
 * 5th touchpoints) is missing until the needle reaches it.
 */
const PATH_A = 'M 40 250 C 57.61 239.33 78.39 239.33 96 250 S 134.39 260.67 152 250 S 190.39 239.33 208 250 S 246.39 260.67 264 250';
const PATH_B = 'M 264 250 C 281.61 239.33 302.39 239.33 320 250';
const PATH_C = 'M 320 250 C 337.61 260.67 358.39 260.67 376 250';
const FULL_PATH = `${PATH_A} S 302.39 239.33 320 250 S 358.39 260.67 376 250`;

/** Touchpoints on the path, and when the needle checks each one (its inner dot pops). */
const TOUCHPOINTS = [
  { x: 96, checked: 1.5 },
  { x: 152, checked: 1.8 },
  { x: 208, checked: 2.1 },
  { x: 264, checked: 2.35 },
  { x: 320, checked: 2.9 },
] as const;
const TOUCHPOINT_Y = 250;

/** The calendar at (406, 255), S 80: its entry point is the path's end, (376, 250). */
const CALENDAR = { cx: 406, cy: 255, size: 80 } as const;

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * The storyboard geometry sits low in the frame (64 units clear above the dial,
 * 34 below the calendar); the whole drawing is lifted so it sits centred.
 */
const LIFT = 14;

/** The needle as a line from the pivot at `angle` degrees (SVG convention: clockwise from +x). */
function needlePath(angle: number): string {
  const a = (angle * Math.PI) / 180;
  const x = PIVOT.x + NEEDLE_LENGTH * Math.cos(a);
  const y = PIVOT.y + NEEDLE_LENGTH * Math.sin(a);
  return `M ${PIVOT.x} ${PIVOT.y} L ${round(x)} ${round(y)}`;
}

const NEEDLE_FINAL = needlePath(NEEDLE_TO);
const SWEEP_SAMPLES = 40;

/**
 * The sweep as `d` keyframes at eased, evenly timed steps. The pivot end of
 * every keyframe is the same point, so the needle can't drift off its pivot
 * the way a CSS transform-origin can on SVG.
 */
const SWEEP = (() => {
  const d: string[] = [];
  const times: number[] = [];
  for (let i = 0; i <= SWEEP_SAMPLES; i += 1) {
    const t = i / SWEEP_SAMPLES;
    d.push(needlePath(NEEDLE_FROM + (NEEDLE_TO - NEEDLE_FROM) * easeInOut(t)));
    times.push(t);
  }
  d[SWEEP_SAMPLES] = NEEDLE_FINAL;
  return { d, times };
})();

/** The needle, swept once from NEEDLE_FROM to NEEDLE_TO; static and done frames show the final pose. */
function Needle() {
  const state = useSceneState();
  // Once the sweep ends, swap to a plain path so the held frame is exactly the static one.
  const [complete, setComplete] = useState(state.phase === 'static' || state.phase === 'done');
  if (state.isStatic || complete) return <path d={NEEDLE_FINAL} />;
  const variants: Variants = {
    hidden: { d: SWEEP.d[0] },
    shown: {
      d: SWEEP.d,
      transition: { d: { delay: SWEEP_DELAY, duration: SWEEP_DURATION, times: SWEEP.times, ease: 'linear' } },
    },
  };
  return (
    <motion.path
      variants={variants}
      initial={state.phase === 'done' ? false : 'hidden'}
      animate={state.phase === 'idle' ? 'hidden' : 'shown'}
      onAnimationComplete={(definition: AnimationDefinition) => {
        if (definition === 'shown') setComplete(true);
      }}
    />
  );
}

export function OversightOneTeamScene({ tone, className, forceStatic }: SceneProps) {
  const line = sceneColor('line');
  const ground = sceneColor('ground');
  return (
    <SceneFrame tone={tone} className={className} forceStatic={forceStatic} duration={4.5}>
      <g transform={`translate(0 ${-LIFT})`}>
        {/* One team: the dial. */}
        <Draw d={DIAL} delay={0} duration={0.9} />

        {/* The customer's path, with a gap between the 4th and 5th touchpoints. */}
        <Draw d={PATH_A} delay={0.3} duration={0.8} accent />
        <Draw d={PATH_C} delay={0.9} duration={0.3} accent />
        {/* The gap is closed before any customer arrives. */}
        <Draw d={PATH_B} delay={2.45} duration={0.4} accent />

        {/* The booking at the end of the path. */}
        <BookedCalendar {...CALENDAR} tBody={0.6} tHead={4} tCheck={4.1} />

        {/* Touchpoints: ground-filled rings over the path; each centre fills in as the needle checks it. */}
        {TOUCHPOINTS.map(({ x, checked }, i) => (
          <g key={x}>
            <Appear delay={0.4 + i * 0.12} duration={0.35} from={0.7}>
              <circle cx={x} cy={TOUCHPOINT_Y} r={10} stroke={line} fill={ground} />
            </Appear>
            <Appear delay={checked} duration={0.2} from={0.3}>
              <circle cx={x} cy={TOUCHPOINT_Y} r={3.5} fill={line} stroke="none" />
            </Appear>
          </g>
        ))}

        {/* The needle and its pivot; the needle sweeps across the whole path. */}
        <Appear delay={0.6} duration={0.4} from={0.9}>
          <Needle />
          <circle cx={PIVOT.x} cy={PIVOT.y} r={5} fill={line} stroke="none" />
        </Appear>

        {/* The customer gets through the unbroken path to the booking. */}
        <Travel along={FULL_PATH} delay={2.95} duration={1.1} color="line" r={6} halo />
      </g>
    </SceneFrame>
  );
}

export default OversightOneTeamScene;
