// Website design hero: "...with a clear path for every way the business earns
// ... because every post, ad, and listing should land somewhere that can take a
// booking." Headline: "...turns visits into bookings".
// A post, an ad and a listing each send a wavy stream into one site. Inside it
// every stream straightens into a clear lane that ends at a next-step button.
// A customer rides the listing's lane, the button takes the booking, and its
// check stays. The service-web browser, grown into a scene.
import { motion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';
import {
  Appear,
  Check,
  Draw,
  Icon,
  SceneFrame,
  Travel,
  sceneColor,
  useSceneState,
  wavePath,
  type Point,
  type SceneColor,
  type DivisionIconName,
  type SceneProps,
} from '../index';
import { dot, roundRect } from './shapes';

/** The site: service-web's browser, grown. */
const BROWSER = roundRect(184, 56, 264, 208, 14);
const BROWSER_BAR = 'M 184 88 L 448 88';
const BROWSER_DOTS = [dot(202, 72), dot(216, 72)];

/** Lanes: wavy outside the site (the logo-family icon wave), straight inside it, ending short of a button. */
const LANE_END = 376;
const lanePath = (y: number) => `${wavePath({ variant: 'icon', x: 64, y, width: 120, amplitude: 12 })} L ${LANE_END} ${y}`;
const BUTTON_X = 408;
const button = (y: number) => roundRect(BUTTON_X - 24, y - 12, 48, 24, 12);

interface Lane {
  y: number;
  /** Where the visit comes from: a post, an ad, a listing. */
  source: DivisionIconName;
  color: SceneColor;
}

const LANES: readonly Lane[] = [
  { y: 128, source: 'service-social', color: 'line2' },
  { y: 176, source: 'service-marketing', color: 'line2' },
  // The listing's lane is the one the customer rides: the story's only amber.
  { y: 224, source: 'map-pin', color: 'accent' },
];
const BOOKED = LANES[2];
/** Source icons: 36 (24 px on a 320 px phone frame), clear of the lanes, which start at x 64. */
const SOURCE_X = 36;
const SOURCE_SIZE = 36;

const PRESS_AT = 3.35;
const PRESS_DURATION = 0.3;

/** The booked button gives one short press (1 → 0.94 → 1) about its own centre, then holds at rest. */
function Press({ at, children }: { at: Point; children: ReactNode }) {
  const state = useSceneState();
  if (state.isStatic) return <g>{children}</g>;
  const variants: Variants = {
    hidden: { scale: 1 },
    shown: {
      scale: [1, 0.94, 1],
      transition: { delay: PRESS_AT, duration: PRESS_DURATION, times: [0, 0.5, 1], ease: 'easeInOut' },
    },
  };
  return (
    <motion.g
      // Scale about the button's centre in viewBox units, so nothing drifts.
      style={{ transformBox: 'view-box', originX: `${at[0]}px`, originY: `${at[1]}px` }}
      variants={variants}
      initial={state.phase === 'done' ? false : 'hidden'}
      animate={state.phase === 'idle' ? 'hidden' : 'shown'}
    >
      {children}
    </motion.g>
  );
}

export function WebPathsScene({ tone, className, forceStatic }: SceneProps) {
  const line = sceneColor('line');
  return (
    <SceneFrame tone={tone} className={className} forceStatic={forceStatic} duration={4}>
      {/* One site. */}
      <Draw d={BROWSER} delay={0} duration={0.8} />
      <Draw d={BROWSER_BAR} delay={0.35} duration={0.5} />
      {BROWSER_DOTS.map((d, i) => (
        <Draw key={d} d={d} delay={0.6 + i * 0.05} duration={0.1} ease="easeOut" />
      ))}

      {/* Every way in: a post, an ad, a listing. Source icons keep their waves quiet (line2). */}
      {LANES.map(({ y, source }, i) => (
        <Icon key={source} name={source} x={SOURCE_X} y={y} size={SOURCE_SIZE} mode="appear" delay={0.2 + i * 0.1} duration={0.4} accentColor="line2" />
      ))}

      {/* Each stream straightens into a clear lane once it is inside the site. */}
      {LANES.map(({ y, color }, i) => (
        <Draw key={y} d={lanePath(y)} delay={0.5 + i * 0.15} duration={1.1} color={color} />
      ))}

      {/* The customer rides the listing's lane to its next step. Drawn before the buttons, so the dot's halo never cuts one. */}
      <Travel along={lanePath(BOOKED.y)} delay={2} duration={1.4} color="line" r={6} halo />

      {/* A next step at the end of every lane; the booked one presses and keeps its check. */}
      {LANES.map(({ y }, i) =>
        y === BOOKED.y ? (
          <Appear key={y} delay={1.6 + i * 0.1} duration={0.35}>
            <Press at={[BUTTON_X, y]}>
              <path d={button(y)} stroke={line} />
              <Check at={[BUTTON_X, y]} size={22} delay={3.45} duration={0.4} />
            </Press>
          </Appear>
        ) : (
          <Appear key={y} delay={1.6 + i * 0.1} duration={0.35}>
            <path d={button(y)} stroke={line} />
          </Appear>
        ),
      )}
    </SceneFrame>
  );
}

export default WebPathsScene;
