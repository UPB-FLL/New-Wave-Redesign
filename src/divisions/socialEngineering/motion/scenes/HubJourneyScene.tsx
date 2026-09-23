// Hub, "What we gather" band: "Every touchpoint, mapped to the customer
// journey ... We map how people discover the business, understand what it
// offers, book, attend, return, and refer others."
// One amber path runs through the six journey stages. The customer books (the
// Book ring keeps its check), a tide arc brings customers back to Book, and a
// referral (cyan) loops a new customer back to the start: the client's goal as
// a flywheel. The JourneyStrip chips below label the stages, so there is no
// text here. journey-book, journey-return and journey-refer, grown into a scene.
//
// Placement: the Cloud White band, so this scene defaults to tone "light" and
// knocks out to Cloud White there.
import { easeInOut } from 'framer-motion';
import { Appear, Check, Draw, SceneFrame, Travel, sceneColor, type Point, type SceneProps } from '../index';

/** The "What we gather" band's ground (Cloud White), for the rings' knock-outs. */
const CLOUD_WHITE = '#F7FAFB';

const Y = 144;
/** Discover, Understand, Book, Attend, Return, Refer. */
const STAGES = [64, 136, 208, 280, 352, 424] as const;
const BOOK = 2;
const STAGE_R = 9;
const BOOK_R = 15;
/** Rings pop as the path reaches them (the path draws easeInOut over 1 s). */
const STAGE_AT = [0.05, 0.28, 0.4, 0.55, 0.68, 0.85] as const;

/** The journey: five icon-family half-waves (crest first, amplitude 14) through the six stages. */
const PATH =
  'M 64 144 C 86.64 125.33 113.36 125.33 136 144 S 185.36 162.67 208 144 S 257.36 125.33 280 144 ' +
  'S 329.36 162.67 352 144 S 401.36 125.33 424 144';

/** Returning customers: a tide arc (journey-return's style) from Attend back over to Book. */
const RETURN_ARC = 'M 280 132 C 276 84 214 80 210 124';
const RETURN_CHEVRON = 'M 201 116 L 210 126 L 219 117';

/**
 * Referrals: a cyan arc under the whole path, from just below Refer to just
 * below Discover (the same small gap at both rings). The new customer rides it
 * and carries on into the Discover ring, so both ends of the flywheel hold a
 * customer the same way.
 */
const REFERRAL_ARC: readonly [Point, Point, Point, Point] = [
  [424, 160],
  [416, 266],
  [72, 266],
  [64, 160],
];
const REFERRAL = (() => {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = REFERRAL_ARC;
  return `M ${x0} ${y0} C ${x1} ${y1} ${x2} ${y2} ${x3} ${y3}`;
})();
const REFERRAL_INTO_DISCOVER = `${REFERRAL} L ${STAGES[0]} ${Y}`;
const REFERRAL_START = 3.4;
const REFERRAL_DURATION = 1.1;

/** Length of a cubic Bézier, by sampling (pure maths, so it also runs in jsdom and at build time). */
function cubicLength([p0, p1, p2, p3]: readonly [Point, Point, Point, Point]): number {
  const at = (t: number, i: 0 | 1) => {
    const u = 1 - t;
    return u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i];
  };
  let length = 0;
  for (let k = 1; k <= 200; k += 1) {
    const t0 = (k - 1) / 200;
    const t1 = k / 200;
    length += Math.hypot(at(t1, 0) - at(t0, 0), at(t1, 1) - at(t0, 1));
  }
  return length;
}

/**
 * The cyan trail draws the arc only, keeping pace with the dot (which travels
 * the arc plus the short step into the ring), so the arc stops just outside
 * the Discover ring and the ring's outline stays whole.
 */
const ARC_SHARE = (() => {
  const arc = cubicLength(REFERRAL_ARC);
  return arc / (arc + (REFERRAL_ARC[3][1] - Y));
})();
const referralTrailEase = (t: number) => Math.min(1, easeInOut(t) / ARC_SHARE);

/** The customer's trip: Discover → Understand → Book, a pause at Book while it books, then on to Refer. */
const JOURNEY_START = 1;
const JOURNEY_DURATION = 2.4;
const PAUSE_FROM = 0.4;
const PAUSE_TO = 0.6;
/** Book sits 2 of 5 equal half-waves along the path. */
const BOOK_PROGRESS = 0.4;
/** The check starts as the customer leaves Book (JOURNEY_START + PAUSE_TO × JOURNEY_DURATION = 2.44 s). */
const CHECK_AT = 2.45;
function plateau(u: number): number {
  if (u < PAUSE_FROM) return easeInOut(u / PAUSE_FROM) * BOOK_PROGRESS;
  if (u < PAUSE_TO) return BOOK_PROGRESS;
  return BOOK_PROGRESS + easeInOut((u - PAUSE_TO) / (1 - PAUSE_TO)) * (1 - BOOK_PROGRESS);
}

export interface HubJourneySceneProps extends SceneProps {
  /** Knock-out colour; defaults to Cloud White on the light tone and the tone's own ground on dark. */
  ground?: string;
}

export function HubJourneyScene({ tone = 'light', className, forceStatic, ground }: HubJourneySceneProps) {
  const line = sceneColor('line');
  const knockout = sceneColor('ground');
  return (
    <SceneFrame
      tone={tone}
      className={className}
      forceStatic={forceStatic}
      duration={4.5}
      ground={ground ?? (tone === 'light' ? CLOUD_WHITE : undefined)}
    >
      {/* One path through the whole journey. */}
      <Draw d={PATH} delay={0} duration={1} accent />
      {STAGES.map((x, i) => (
        <Appear key={x} delay={STAGE_AT[i]} duration={0.35} from={0.7}>
          <circle cx={x} cy={Y} r={i === BOOK ? BOOK_R : STAGE_R} stroke={line} fill={knockout} />
        </Appear>
      ))}

      {/* Booked: the customer pauses in the Book ring, and the check is drawn as they move on, so it is never under the dot. */}
      <Check at={[STAGES[BOOK], Y]} size={26} delay={CHECK_AT} duration={0.45} />

      {/* Customers come back: Attend → Book. */}
      <Draw d={RETURN_ARC} delay={2.85} duration={0.45} color="tide" />
      <Draw d={RETURN_CHEVRON} delay={3.25} duration={0.2} ease="easeOut" color="tide" />

      {/* A referral brings a new customer back round to the start, into the Discover ring. */}
      <Draw d={REFERRAL} delay={REFERRAL_START} duration={REFERRAL_DURATION} ease={referralTrailEase} color="cyan" />
      <Travel along={REFERRAL_INTO_DISCOVER} delay={REFERRAL_START} duration={REFERRAL_DURATION} color="line" r={6} />

      {/* The customer, on top of everything. No halo here: it would cut each ring open as the dot passes through. */}
      <Travel along={PATH} delay={JOURNEY_START} duration={JOURNEY_DURATION} ease={plateau} color="line" r={6} />
    </SceneFrame>
  );
}

export default HubJourneyScene;
