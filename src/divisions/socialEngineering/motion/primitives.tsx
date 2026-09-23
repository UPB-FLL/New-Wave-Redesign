// Scene primitives: the building blocks every line-art story uses. Each one
// reads the frame's playback state (useSceneState) and follows the scene
// contract in SceneFrame.tsx:
// - static (reduced motion, forceStatic, no IntersectionObserver): renders its
//   final state as plain SVG, with no framer-motion at all
// - idle: holds its start state (usually invisible) until the scene plays
// - playing / done: animates once to its final state and holds it; the final
//   animated frame matches the static render exactly
// All times are seconds from the moment the scene starts playing.

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  easeIn,
  easeInOut,
  easeOut,
  motion,
  type AnimationDefinition,
  type Easing,
  type EasingFunction,
  type Variants,
} from 'framer-motion';
import { checkPath, pathEndpoints, pathSignature, ringPath, wavePath, type Point, type WaveGeometry } from './geometry';
import { DIVISION_ICONS, type DivisionIconName } from '../icons/iconData';
import { sceneColor, type SceneColor } from './palette';
import { useSceneState, type SceneState } from './sceneState';

const fmt = (n: number, places = 2) => {
  const f = 10 ** places;
  return Math.round(n * f) / f;
};

/** Warns in development when a primitive would still be moving after the scene's budget. */
function useBudgetCheck(label: string, end: number) {
  const { duration } = useSceneState();
  useEffect(() => {
    if (import.meta.env.DEV && end > duration + 1e-3) {
      console.warn(
        `[scene] <${label}> ends at ${fmt(end)}s, after the scene's ${duration}s budget. Shorten its delay or duration.`,
      );
    }
  }, [label, end, duration]);
}

/** Variant wiring for framer-motion: hold "hidden" while idle, animate to "shown" once playing. */
function variantProps(state: SceneState) {
  return {
    // Mounted after the timeline finished: start at the final frame, no replay.
    initial: state.phase === 'done' ? (false as const) : 'hidden',
    animate: state.phase === 'idle' ? 'hidden' : 'shown',
  };
}

// ---------------------------------------------------------------------------
// Draw
// ---------------------------------------------------------------------------

export interface DrawProps {
  /** Path data in the current coordinate system (scene units unless inside a transform). */
  d: string;
  /** Seconds from scene start before the stroke begins (default 0). */
  delay?: number;
  /** Seconds the draw-on takes (default 0.8). */
  duration?: number;
  /** framer-motion easing for the draw-on (default "easeInOut"). */
  ease?: Easing;
  /** Palette role (default "line"). */
  color?: SceneColor;
  /** Shorthand for color="accent". */
  accent?: boolean;
  /** Stroke width; defaults to the inherited width (3 on the scene canvas). */
  width?: number;
  /** Optional fill role, e.g. "ground" for a knock-out; appears when the stroke starts. */
  fill?: SceneColor;
  /**
   * Morph target. After drawing, the path eases into this shape. It must share
   * `d`'s command structure (see pathSignature); the static frame shows `to`.
   */
  to?: string;
  /** Seconds from scene start when the morph begins (default: when the draw ends). */
  morphDelay?: number;
  /** Seconds the morph takes (default 1). */
  morphDuration?: number;
  morphEase?: Easing;
}

/** A stroke that draws on from its start point (pathLength 0 → 1) and ends fully drawn. */
export function Draw({
  d,
  delay = 0,
  duration = 0.8,
  ease = 'easeInOut',
  color,
  accent = false,
  width,
  fill,
  to,
  morphDelay,
  morphDuration = 1,
  morphEase = 'easeInOut',
}: DrawProps) {
  const state = useSceneState();
  const stroke = sceneColor(color ?? (accent ? 'accent' : 'line'));
  const fillColor = fill ? sceneColor(fill) : undefined;
  const morphAt = morphDelay ?? delay + duration;
  useBudgetCheck('Draw', to ? Math.max(delay + duration, morphAt + morphDuration) : delay + duration);
  useEffect(() => {
    if (import.meta.env.DEV && to && pathSignature(d) !== pathSignature(to)) {
      console.warn(`[scene] <Draw to> needs matching path structures: "${pathSignature(d)}" vs "${pathSignature(to)}".`);
    }
  }, [d, to]);
  // After the draw finishes, swap to a plain path so the held frame is exactly the static one.
  const [complete, setComplete] = useState(state.phase === 'static' || state.phase === 'done');

  if (state.isStatic || complete) {
    return <path d={to ?? d} stroke={stroke} strokeWidth={width} fill={fillColor} />;
  }

  const variants: Variants = {
    hidden: { pathLength: 0, opacity: 0, ...(to ? { d } : {}) },
    shown: {
      pathLength: 1,
      opacity: 1,
      ...(to ? { d: to } : {}),
      transition: {
        pathLength: { delay, duration, ease },
        opacity: { delay, duration: 0.01 },
        ...(to ? { d: { delay: morphAt, duration: morphDuration, ease: morphEase } } : {}),
      },
    },
  };
  return (
    <motion.path
      d={to ? undefined : d}
      stroke={stroke}
      strokeWidth={width}
      fill={fillColor}
      variants={variants}
      {...variantProps(state)}
      onAnimationComplete={(definition: AnimationDefinition) => {
        if (definition === 'shown') setComplete(true);
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Appear
// ---------------------------------------------------------------------------

export interface AppearProps {
  /** Seconds from scene start (default 0). */
  delay?: number;
  /** Seconds the fade and scale take (default 0.5). */
  duration?: number;
  /** Starting scale around the group's own centre (default 0.9). */
  from?: number;
  /** Starting vertical offset in scene units; positive starts lower (default 0). */
  rise?: number;
  children?: ReactNode;
}

/** Fades and scales its children in around their own centre (transform-box: fill-box). */
export function Appear({ delay = 0, duration = 0.5, from = 0.9, rise = 0, children }: AppearProps) {
  const state = useSceneState();
  useBudgetCheck('Appear', delay + duration);
  if (state.isStatic) return <g>{children}</g>;
  const variants: Variants = {
    hidden: { opacity: 0, scale: from, y: rise },
    shown: { opacity: 1, scale: 1, y: 0, transition: { delay, duration, ease: [0.22, 1, 0.36, 1] } },
  };
  return (
    <motion.g
      style={{ transformBox: 'fill-box', originX: '50%', originY: '50%' }}
      variants={variants}
      {...variantProps(state)}
    >
      {children}
    </motion.g>
  );
}

// ---------------------------------------------------------------------------
// Travel
// ---------------------------------------------------------------------------

export type SceneEaseName = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';

const EASES: Record<SceneEaseName, EasingFunction> = {
  linear: (t) => t,
  easeIn,
  easeOut,
  easeInOut,
};

const TRACK_SAMPLES = 60;

interface Track {
  xs: number[];
  ys: number[];
  times: number[];
}

/** Points along the path at eased, evenly timed steps; ends pinned to the exact endpoints. */
function sampleTrack(path: SVGPathElement, ease: EasingFunction, start: Point, end: Point): Track {
  const total = path.getTotalLength();
  const xs: number[] = [];
  const ys: number[] = [];
  const times: number[] = [];
  for (let i = 0; i <= TRACK_SAMPLES; i += 1) {
    const t = i / TRACK_SAMPLES;
    const progress = Math.min(1, Math.max(0, ease(t)));
    const point = path.getPointAtLength(progress * total);
    xs.push(fmt(point.x, 3));
    ys.push(fmt(point.y, 3));
    times.push(t);
  }
  [xs[0], ys[0]] = start;
  [xs[TRACK_SAMPLES], ys[TRACK_SAMPLES]] = end;
  return { xs, ys, times };
}

export interface TravelProps {
  /** One open subpath the dot follows, start to end. */
  along: string;
  /** Seconds from scene start (default 0). */
  delay?: number;
  /** Seconds the trip takes (default 1.6). */
  duration?: number;
  /** Dot radius (default 5). */
  r?: number;
  /** Dot colour (default "accent"). */
  color?: SceneColor;
  ease?: SceneEaseName | EasingFunction;
  /** Draw the path behind the dot, in step with it: a palette role, or true for "line2". */
  trail?: SceneColor | boolean;
  trailWidth?: number;
  /** A ground-coloured ring around the dot so it reads where it crosses other lines. */
  halo?: boolean;
}

/** A dot that travels along a path once and rests at its end. */
export function Travel({
  along,
  delay = 0,
  duration = 1.6,
  r = 5,
  color = 'accent',
  ease = 'easeInOut',
  trail = false,
  trailWidth,
  halo = false,
}: TravelProps) {
  const state = useSceneState();
  const easeFn = typeof ease === 'function' ? ease : EASES[ease];
  const easeRef = useRef(easeFn);
  easeRef.current = easeFn;
  const { start, end } = useMemo(() => pathEndpoints(along), [along]);
  const measureRef = useRef<SVGPathElement>(null);
  const [track, setTrack] = useState<Track | null>(null);
  useBudgetCheck('Travel', delay + duration);

  useLayoutEffect(() => {
    if (state.isStatic) return;
    const path = measureRef.current;
    if (!path || typeof path.getTotalLength !== 'function') return;
    try {
      setTrack(sampleTrack(path, easeRef.current, start, end));
    } catch {
      // Unmeasurable (e.g. not rendered): the dot jumps to the end instead of travelling.
    }
  }, [state.isStatic, start, end]);

  const trailColor: SceneColor | null = trail === true ? 'line2' : trail || null;
  const trailPath = trailColor ? (
    <Draw d={along} delay={delay} duration={duration} ease={easeFn} color={trailColor} width={trailWidth} />
  ) : null;
  const dot = {
    r,
    fill: sceneColor(color),
    stroke: halo ? sceneColor('ground') : 'none',
    strokeWidth: halo ? 6 : undefined,
    paintOrder: halo ? 'stroke' : undefined,
  };

  if (state.isStatic) {
    return (
      <>
        {trailPath}
        <circle cx={end[0]} cy={end[1]} {...dot} />
      </>
    );
  }

  const appear = { delay, duration: 0.2 };
  const variants: Variants = {
    hidden: { cx: start[0], cy: start[1], opacity: 0 },
    shown: track
      ? {
          cx: track.xs,
          cy: track.ys,
          opacity: 1,
          transition: {
            cx: { delay, duration, times: track.times, ease: 'linear' },
            cy: { delay, duration, times: track.times, ease: 'linear' },
            opacity: appear,
          },
        }
      : {
          // Unmeasurable path (no layout): jump to the end when the trip would finish.
          cx: end[0],
          cy: end[1],
          opacity: 1,
          transition: { cx: { delay: delay + duration, duration: 0 }, cy: { delay: delay + duration, duration: 0 }, opacity: appear },
        },
  };
  return (
    <>
      {trailPath}
      <path ref={measureRef} d={along} stroke="none" fill="none" data-scene-measure="" />
      <motion.circle {...dot} variants={variants} {...variantProps(state)} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Check
// ---------------------------------------------------------------------------

export interface CheckProps {
  /** Centre of the check's 24-unit icon box, in scene units. */
  at: Point;
  /** Size of that icon box (default 36). */
  size?: number;
  delay?: number;
  /** Seconds for the whole check (and ring) to draw (default 0.6). */
  duration?: number;
  /** Palette role (default "line"). */
  color?: SceneColor;
  accent?: boolean;
  /** Draw a ring first, then a smaller check inside it (check-circle proportions). */
  ring?: boolean;
  width?: number;
}

/** The icon set's check, drawn on from its short arm. */
export function Check({ at, size = 36, delay = 0, duration = 0.6, color, accent = false, ring = false, width }: CheckProps) {
  const role = color ?? (accent ? 'accent' : 'line');
  if (!ring) {
    return <Draw d={checkPath(at, size)} delay={delay} duration={duration} ease="easeOut" color={role} width={width} />;
  }
  return (
    <>
      <Draw d={ringPath(at, size)} delay={delay} duration={duration * 0.6} color={role} width={width} />
      <Draw
        d={checkPath(at, size, { inRing: true })}
        delay={delay + duration * 0.5}
        duration={duration * 0.5}
        ease="easeOut"
        color={role}
        width={width}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Wave
// ---------------------------------------------------------------------------

export interface WaveProps extends WaveGeometry {
  delay?: number;
  /** Seconds the wave takes to draw (default 1.1). */
  duration?: number;
  ease?: Easing;
  /** Palette role (default "accent": the brand wave is the signature accent). */
  color?: SceneColor;
  /** Set false to draw in "line" instead of the accent. */
  accent?: boolean;
  strokeWidth?: number;
  /**
   * Morph target geometry (same variant and cycles), e.g. `{ amplitude: 0, rise: 90 }`
   * straightens the wave into a rising line after it draws.
   */
  to?: Partial<Pick<WaveGeometry, 'x' | 'y' | 'width' | 'amplitude' | 'rise'>>;
  morphDelay?: number;
  morphDuration?: number;
  morphEase?: Easing;
}

/** The brand wave, in the logo's curve family, drawn left to right. */
export function Wave({
  x,
  y,
  width,
  amplitude,
  rise,
  variant,
  cycles,
  delay = 0,
  duration = 1.1,
  ease,
  color,
  accent = true,
  strokeWidth,
  to,
  morphDelay,
  morphDuration,
  morphEase,
}: WaveProps) {
  const geometry: WaveGeometry = { x, y, width, amplitude, rise, variant, cycles };
  const d = wavePath(geometry);
  const toD = to ? wavePath({ ...geometry, ...to }) : undefined;
  return (
    <Draw
      d={d}
      to={toD}
      delay={delay}
      duration={duration}
      ease={ease}
      color={color ?? (accent ? 'accent' : 'line')}
      width={strokeWidth}
      morphDelay={morphDelay}
      morphDuration={morphDuration}
      morphEase={morphEase}
    />
  );
}

// ---------------------------------------------------------------------------
// Icon
// ---------------------------------------------------------------------------

export interface IconProps {
  name: DivisionIconName;
  /** Centre of the icon's 24-unit box, in scene units. */
  x: number;
  y: number;
  /** Rendered size of the 24-unit box (default 48). */
  size?: number;
  delay?: number;
  /** Seconds for the whole icon (default 1). */
  duration?: number;
  /** "draw": outlines draw on, then the accent wave; "appear": the finished icon fades and scales in. */
  mode?: 'draw' | 'appear';
  /** Outline role (default "line"). */
  color?: SceneColor;
  /** Role for the icon's own accent path (default "accent"). */
  accentColor?: SceneColor;
  /** Stroke width in scene units (default 3, the scene's line weight at any size). */
  strokeWidth?: number;
}

/** An icon from the approved set, placed and scaled into the scene. */
export function Icon({
  name,
  x,
  y,
  size = 48,
  delay = 0,
  duration = 1,
  mode = 'draw',
  color = 'line',
  accentColor = 'accent',
  strokeWidth = 3,
}: IconProps) {
  const { paths } = DIVISION_ICONS[name];
  const k = size / 24;
  const group = {
    transform: `translate(${fmt(x - size / 2)} ${fmt(y - size / 2)}) scale(${fmt(k, 4)})`,
    strokeWidth: fmt(strokeWidth / k, 4),
    'data-scene-icon': name,
  };

  if (mode === 'appear') {
    return (
      <Appear delay={delay} duration={duration}>
        <g {...group}>
          {paths.map((p, i) => (
            <path key={i} d={p.d} stroke={sceneColor(p.accent ? accentColor : color)} />
          ))}
        </g>
      </Appear>
    );
  }

  // Outlines draw in a slight stagger over the first 70%; the accent wave lands last.
  const outlineCount = paths.filter((p) => !p.accent).length;
  const hasAccent = outlineCount < paths.length;
  const span = hasAccent ? duration * 0.7 : duration;
  const each = span * 0.65;
  const step = outlineCount > 1 ? (span - each) / (outlineCount - 1) : 0;
  const outlineIndex = paths.map((_, i) => paths.slice(0, i).filter((p) => !p.accent).length);
  return (
    <g {...group}>
      {paths.map((p, i) =>
        p.accent ? (
          <Draw key={i} d={p.d} delay={delay + duration * 0.55} duration={duration * 0.45} color={accentColor} />
        ) : (
          <Draw key={i} d={p.d} delay={delay + outlineIndex[i] * step} duration={each} color={color} />
        ),
      )}
    </g>
  );
}
