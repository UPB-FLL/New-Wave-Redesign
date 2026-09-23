// Contact hero: "Start with discovery."
// A lens takes in the business's own brand wave (understanding the business).
// A flag marks where it wants to be. Today's route there is dotted and full of
// gaps; a clear amber path grows out of the lens to the flag and replaces it,
// and the business sets out along it. No check: this is where the work starts.
// The method-discover icon grown into a scene; the flag is new in-style line art.
import { motion, type Variants } from 'framer-motion';
import { Draw, SceneFrame, Travel, sceneColor, useSceneState, wavePath, type SceneProps } from '../index';

/** Lens ring (centre 132,190, r 56), drawn from the handle's joint all the way round. */
const LENS = 'M 171.6 229.6 A 56 56 0 1 1 92.4 150.4 A 56 56 0 1 1 171.6 229.6';
const HANDLE = 'M 171.6 229.6 L 204 262';
/**
 * The business's own brand wave, inside the lens: method-discover's symmetric
 * accent wave, grown. (The logo wave's tight tail turn would read as a check
 * mark where the path leaves the lens.)
 */
const INNER_WAVE = wavePath({ variant: 'icon', x: 100, y: 190, width: 64, amplitude: 9 });

const FLAG_POLE = 'M 404 118 L 404 40';
const FLAG_PENNANT = 'M 404 42 C 416 34 430 50 444 42 L 444 70 C 430 78 416 62 404 70';

/** How customers find the business today: dotted, with gaps. */
const TODAY_ROUTE = 'M 196 206 C 236 238 268 152 300 170 S 356 176 398 130';
const TODAY_DASHES = '0 10 0 10 0 10 0 34';

/**
 * The clear path: the same wave family, rising from the inner wave's end
 * (164,190) to the flag's foot (404,126). Its crest height matches the inner
 * wave's exit slope, so the two join without a kink.
 */
const CLEAR_PATH = wavePath({ variant: 'icon', x: 164, y: 190, width: 240, amplitude: 26, rise: 64 });
/** The dot's route: along the brand wave, then the clear path (its opening M dropped). */
const JOURNEY = `${INNER_WAVE} ${CLEAR_PATH.replace(/^M [\d.]+ [\d.]+ /, '')}`;

const ROUTE_IN = 0.7;
const ROUTE_FADE_IN = 0.5;
const ROUTE_OUT = 2.2;
const ROUTE_FADE_OUT = 0.6;

/** Today's gappy route: fades in, then out as the clear path replaces it (opacity only; it is dashed). */
function TodayRoute() {
  const state = useSceneState();
  // Not part of the final frame.
  if (state.isStatic || state.phase === 'done') return null;
  const span = ROUTE_OUT + ROUTE_FADE_OUT - ROUTE_IN;
  const variants: Variants = {
    hidden: { opacity: 0 },
    shown: {
      opacity: [0, 1, 1, 0],
      transition: {
        delay: ROUTE_IN,
        duration: span,
        times: [0, ROUTE_FADE_IN / span, (ROUTE_OUT - ROUTE_IN) / span, 1],
        ease: 'easeInOut',
      },
    },
  };
  return (
    <motion.path
      d={TODAY_ROUTE}
      stroke={sceneColor('line2')}
      strokeDasharray={TODAY_DASHES}
      variants={variants}
      initial="hidden"
      animate={state.phase === 'idle' ? 'hidden' : 'shown'}
    />
  );
}

export function ContactDiscoveryScene({ tone, className, forceStatic }: SceneProps) {
  return (
    <SceneFrame tone={tone} className={className} forceStatic={forceStatic} duration={4}>
      {/* Understand the business: the lens and the brand wave inside it. */}
      <Draw d={LENS} delay={0} duration={0.8} />
      <Draw d={HANDLE} delay={0.5} duration={0.35} ease="easeOut" />
      <Draw d={INNER_WAVE} accent delay={0.6} duration={0.5} />

      {/* Where it wants to be: the flag. */}
      <Draw d={FLAG_POLE} delay={0.5} duration={0.4} />
      <Draw d={FLAG_PENNANT} delay={0.8} duration={0.4} />

      <TodayRoute />

      {/* One clear path, grown out of the lens to the flag. */}
      <Draw d={CLEAR_PATH} accent delay={1.2} duration={1.2} />

      {/* The business sets out and arrives at the flag's foot. */}
      <Travel along={JOURNEY} delay={2.45} duration={1.4} color="line" r={6} halo />
    </SceneFrame>
  );
}

export default ContactDiscoveryScene;
