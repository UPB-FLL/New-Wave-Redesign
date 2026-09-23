// Marketing hero: "Every campaign sends people to a page that can take a
// booking... We measure the work against bookings and inquiries, not likes and
// impressions." Also "...email and SMS marketing... that turn a first visit
// into a repeat one."
// A campaign goes out: broadcast ripples spread, then fade (impressions are not
// the measure). The megaphone's amber wave grows into the path itself, carrying
// a customer to a page that takes the booking. An email follow-up then curves
// back around into the path: the repeat visit. The service-marketing icon,
// grown into a scene.
import { motion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';
import {
  Appear,
  Check,
  Draw,
  DIVISION_ICONS,
  SceneFrame,
  Travel,
  fromIconGrid,
  sceneColor,
  useSceneState,
  wavePath,
  type DivisionIconName,
  type SceneProps,
} from '../index';
import { dot, roundRect } from './shapes';

const round = (n: number, places = 2) => Math.round(n * 10 ** places) / 10 ** places;

/** The megaphone (service-marketing), drawn as outlines: its amber accent is grown into the path below. */
const MEGAPHONE = { x: 73, y: 164, size: 88 } as const;
/**
 * Where the campaign's path begins: where the icon's own accent wave starts,
 * (15, 12) on its 24-unit grid, just clear of the megaphone's mouth. The icon's
 * short accent is not drawn; the path is that wave, grown, so there is one
 * wave from the mouth to the page instead of a small squiggle and a big one.
 */
const [PATH_X, PATH_Y] = fromIconGrid([MEGAPHONE.x, MEGAPHONE.y], MEGAPHONE.size, [15, 12]).map((n) => round(n));

/** The campaign's path: two icon-wave cycles from the megaphone to the page's edge. */
const PATH = wavePath({ variant: 'icon', x: PATH_X, y: PATH_Y, width: 352 - PATH_X, cycles: 2, amplitude: 12 });

/**
 * Broadcast ripples centred where the path begins: r 44 / 68 / 92, from 27° to
 * 65° above and below the axis, which keeps them clear of the path's first
 * crest and trough. Each pair draws from beside the path outward, so the two
 * halves mirror each other.
 */
const RIPPLE_FROM = 27;
const RIPPLE_TO = 65;
function ripplePair(r: number): readonly [string, string] {
  const at = (deg: number, side: 1 | -1) => {
    const a = (deg * Math.PI) / 180;
    return `${round(PATH_X + r * Math.cos(a))} ${round(PATH_Y - side * r * Math.sin(a))}`;
  };
  return [
    `M ${at(RIPPLE_FROM, 1)} A ${r} ${r} 0 0 0 ${at(RIPPLE_TO, 1)}`,
    `M ${at(RIPPLE_FROM, -1)} A ${r} ${r} 0 0 1 ${at(RIPPLE_TO, -1)}`,
  ];
}
const RIPPLE_PAIRS = [44, 68, 92].map(ripplePair);
/** Impressions fade: the ripples end at 30%. */
const RIPPLE_REST_OPACITY = 0.3;

/** A page that can take a booking (service-web, grown): its left edge is where the path lands. */
const PAGE = roundRect(352, 112, 96, 104, 10);
const PAGE_BAR = 'M 352 132 L 448 132';
const PAGE_DOTS = [dot(364, 122), dot(374, 122)];

/** The follow-up: a tide return arc (journey-return's style) under the path, back up into it. */
const RETURN_ARC = 'M 400 230 C 398 290 244 292 236 190';
const RETURN_CHEVRON = 'M 226 198 L 236 188 L 246 197';
/** The email that carries it, centred on the arc's low point, on a ground plate so the arc passes behind it. */
const MAIL = { x: 320, y: 271, size: 36 } as const;
const MAIL_PLATE = roundRect(306, 258, 28, 26, 4);

/** Fades its children from full to `to` opacity once; static renders the end opacity. */
function FadeTo({ to, delay, duration, children }: { to: number; delay: number; duration: number; children: ReactNode }) {
  const state = useSceneState();
  if (state.isStatic) return <g opacity={to}>{children}</g>;
  const variants: Variants = {
    hidden: { opacity: 1 },
    shown: { opacity: to, transition: { delay, duration, ease: 'easeInOut' } },
  };
  return (
    <motion.g variants={variants} initial={state.phase === 'done' ? false : 'hidden'} animate={state.phase === 'idle' ? 'hidden' : 'shown'}>
      {children}
    </motion.g>
  );
}

/** Places an icon's 24-unit grid at scene scale with the scene's 3-unit stroke. */
function iconGroup(name: DivisionIconName, x: number, y: number, size: number) {
  const k = size / 24;
  return {
    transform: `translate(${round(x - size / 2)} ${round(y - size / 2)}) scale(${round(k, 4)})`,
    strokeWidth: round(3 / k, 4),
    'data-scene-icon': name,
  };
}

/** An icon's outlines drawing on in a slight stagger (the <Icon> draw rhythm), without its accent wave. */
function IconOutline({ name, x, y, size, delay, duration }: { name: DivisionIconName; x: number; y: number; size: number; delay: number; duration: number }) {
  const outlines = DIVISION_ICONS[name].paths.filter((p) => !p.accent);
  const each = duration * 0.65;
  const step = outlines.length > 1 ? (duration - each) / (outlines.length - 1) : 0;
  return (
    <g {...iconGroup(name, x, y, size)}>
      {outlines.map((p, i) => (
        <Draw key={p.d} d={p.d} delay={delay + i * step} duration={each} />
      ))}
    </g>
  );
}

/** A finished icon at scene scale (for icons that share an Appear with a knock-out plate). */
function IconGlyph({ name, x, y, size }: { name: DivisionIconName; x: number; y: number; size: number }) {
  return (
    <g {...iconGroup(name, x, y, size)}>
      {DIVISION_ICONS[name].paths.map((p) => (
        <path key={p.d} d={p.d} stroke={sceneColor(p.accent ? 'accent' : 'line')} />
      ))}
    </g>
  );
}

export function MarketingReachScene({ tone, className, forceStatic }: SceneProps) {
  return (
    <SceneFrame tone={tone} className={className} forceStatic={forceStatic} duration={4.4}>
      {/* The broadcast spreads outward in pairs, then fades: impressions are not the measure. */}
      <FadeTo to={RIPPLE_REST_OPACITY} delay={1.6} duration={0.6}>
        {RIPPLE_PAIRS.map((pair, i) =>
          pair.map((d) => <Draw key={d} d={d} delay={0.5 + i * 0.15} duration={0.45} color="line2" />),
        )}
      </FadeTo>

      {/* The campaign: the megaphone draws... */}
      <IconOutline name="service-marketing" {...MEGAPHONE} delay={0} duration={0.7} />

      {/* ...and its amber wave runs on as the path to a page that can take a booking. */}
      <Draw d={PATH} delay={0.65} duration={1.25} accent />
      <Draw d={PAGE} delay={1.1} duration={0.7} />
      <Draw d={PAGE_BAR} delay={1.45} duration={0.3} />
      {PAGE_DOTS.map((d, i) => (
        <Draw key={d} d={d} delay={1.7 + i * 0.05} duration={0.1} ease="easeOut" />
      ))}

      {/* The follow-up email brings them back around into the path: a repeat visit. */}
      <Draw d={RETURN_ARC} delay={3.45} duration={0.6} color="tide" />
      <Appear delay={3.6} duration={0.3} from={0.7}>
        <path d={MAIL_PLATE} stroke="none" fill={sceneColor('ground')} />
        <IconGlyph name="mail" {...MAIL} />
      </Appear>
      <Draw d={RETURN_CHEVRON} delay={4.05} duration={0.25} ease="easeOut" color="tide" />

      {/* A customer follows the path to the page, which takes the booking. */}
      <Travel along={PATH} delay={2} duration={1.2} color="line" r={6} halo />
      <Check at={[400, 176]} size={40} delay={3.2} duration={0.4} />
    </SceneFrame>
  );
}

export default MarketingReachScene;
