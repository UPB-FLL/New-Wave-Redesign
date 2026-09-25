/**
 * Scene contract: New Wave: Social Engineering line-art stories
 * ==============================================================
 *
 * A scene is a small decorative illustration, drawn in the division's icon
 * style, that tells one short story about the client goal of the page it sits
 * on (hub, the six service pages, contact, contact us). The copy beside it
 * carries the message; the scene only shows it.
 *
 * Files and props
 * - One scene per file: `motion/scenes/<Name>Scene.tsx`, exporting
 *   `export function <Name>Scene(props: SceneProps)` and, for the lazy page
 *   registry (scenes/index.ts, PAGE_SCENES), `export default <Name>Scene`.
 *   The export name is the scene's id in its test and in capture tooling.
 * - SceneProps = { tone?: 'dark' | 'light'; className?: string; forceStatic?: boolean }.
 *   Forward all three to <SceneFrame>. Nothing else is required to place it.
 * - <SceneFrame viewBox tone className duration forceStatic ground>:
 *   viewBox defaults to "0 0 480 320" (3:2; the box's aspect ratio follows
 *   the viewBox, so the page reserves the space before any script runs and
 *   nothing shifts). tone `dark` (default) is for the #09131D hero band and
 *   other dark sections; `light` for white and Cloud White sections. `ground`
 *   overrides the knock-out colour when a section's background differs.
 *
 * Drawing
 * - Build from the primitives in primitives.tsx (Draw, Appear, Travel, Check,
 *   Wave, Icon). They read the playback state from context and guarantee the
 *   rules below. Hand-rolled motion reads useSceneState() and must follow them
 *   too.
 * - Look: the icon set grown into an illustration. Stroke 3 on the 480 × 320
 *   canvas (the frame's default), round caps and joins, no fills except small
 *   dots and ground-coloured knock-outs, generous negative space, and a
 *   16-unit safe margin inside the viewBox (the frame clips).
 * - Colour only through sceneColor() / the --scene-* variables (line, line2,
 *   accent, cyan, tide, ground), never hex values, so both tones work. Lure
 *   Amber (`accent`) is the signature: the brand wave and the one thing the
 *   story lands on. Signal Cyan and Tide Blue are sparing support.
 * - Waves come from the logo's curve family (<Wave>, wavePath()).
 * - No text, no numbers, no invented stats, prices, logos, or client names or
 *   facts. No security or phishing metaphors: no locks, shields, hooks,
 *   masks, or fishing.
 *
 * Timing
 * - Plays once, the first time 35% of the frame is in view; never loops,
 *   repeats, or replays. It then holds its final frame for good.
 * - The whole timeline fits the frame's `duration` (default 4.5 s, capped at
 *   5 s). Every delay + duration must end inside it; primitives warn in
 *   development when one doesn't. All times are seconds from scene start.
 * - Final-frame rule: the last animated frame is identical to the static
 *   frame. Reduced motion, `forceStatic`, and environments without
 *   IntersectionObserver render that static final frame directly, with no
 *   motion at all.
 * - Allowed motion: opacity; transform (translate, scale, rotate); pathLength
 *   and stroke dashes (draw-on); path `d` morphs between paths with the same
 *   command structure (pathSignature()); cx, cy, r. Use framer-motion (already
 *   in the bundle; prefer the primitives). CSS animations are allowed only
 *   when keyed off the frame's `[data-scene-state]`: run under both "playing"
 *   and "done" with `animation-fill-mode: both`, and show the end state under
 *   "static". No SMIL, no filters or blur, no layout-affecting properties, no
 *   JavaScript timers of your own, no infinite or repeating animations, and
 *   no new dependencies.
 *
 * Accessibility: the svg is aria-hidden, focusable="false", and
 * role="presentation"; scenes are decorative and never take focus.
 */
import { useEffect, useMemo, type CSSProperties, type ReactNode } from 'react';
import { aspectRatioFor } from './geometry';
import { scenePaletteVars, type SceneTone } from './palette';
import {
  SCENE_DEFAULT_DURATION,
  SCENE_MAX_DURATION,
  SceneOverrideContext,
  SceneStateContext,
  type SceneState,
} from './sceneState';
import { useScenePlayback } from './useScenePlayback';

export interface SceneFrameProps {
  /** Defaults to "0 0 480 320"; the box keeps the viewBox's aspect ratio. */
  viewBox?: string;
  tone?: SceneTone;
  className?: string;
  style?: CSSProperties;
  /** Timeline budget in seconds (default 4.5, capped at 5). */
  duration?: number;
  forceStatic?: boolean;
  /** Knock-out colour; defaults to the tone's section ground (#09131D / #FFFFFF). */
  ground?: string;
  /** Default stroke width in viewBox units (3). */
  strokeWidth?: number;
  children?: ReactNode;
}

export function SceneFrame({
  viewBox = '0 0 480 320',
  tone = 'dark',
  className,
  style,
  duration = SCENE_DEFAULT_DURATION,
  forceStatic,
  ground,
  strokeWidth = 3,
  children,
}: SceneFrameProps) {
  const budget = Math.min(Math.max(duration, 0), SCENE_MAX_DURATION);
  useEffect(() => {
    if (import.meta.env.DEV && duration > SCENE_MAX_DURATION) {
      console.warn(`[scene] duration ${duration}s is over the ${SCENE_MAX_DURATION}s ceiling; clamped.`);
    }
  }, [duration]);
  const { ref, phase, playing, done, reduced, isStatic } = useScenePlayback<HTMLDivElement>({
    duration: budget,
    forceStatic,
  });
  const state = useMemo<SceneState>(
    () => ({ phase, playing, done, reduced, isStatic, tone, duration: budget }),
    [phase, playing, done, reduced, isStatic, tone, budget],
  );
  const frameStyle = {
    ...scenePaletteVars(tone, ground),
    position: 'relative',
    display: 'block',
    width: '100%',
    aspectRatio: aspectRatioFor(viewBox),
    pointerEvents: 'none',
    userSelect: 'none',
    ...style,
  } as CSSProperties;

  return (
    <div
      ref={ref}
      className={className}
      style={frameStyle}
      data-scene=""
      data-scene-state={phase}
      data-scene-tone={tone}
    >
      <svg
        viewBox={viewBox}
        aria-hidden="true"
        focusable="false"
        role="presentation"
        fill="none"
        stroke="var(--scene-line)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ position: 'absolute', inset: 0, display: 'block', width: '100%', height: '100%', overflow: 'hidden' }}
      >
        <SceneStateContext.Provider value={state}>{children}</SceneStateContext.Provider>
      </svg>
    </div>
  );
}

/** Forces every scene inside it to render its static final frame (tests, capture tooling). */
export function SceneOverrides({ forceStatic = false, children }: { forceStatic?: boolean; children?: ReactNode }) {
  const value = useMemo(() => ({ forceStatic }), [forceStatic]);
  return <SceneOverrideContext.Provider value={value}>{children}</SceneOverrideContext.Provider>;
}
