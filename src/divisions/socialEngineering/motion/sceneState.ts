import { createContext, useContext } from 'react';
import type { SceneTone } from './palette';

/**
 * - `static`: final frame, no motion (reduced motion, forceStatic, or no IntersectionObserver)
 * - `idle`: waiting to be scrolled into view; primitives hold their start state
 * - `playing`: the one-time timeline is running
 * - `done`: the timeline has finished; the final frame holds for good
 */
export type ScenePhase = 'static' | 'idle' | 'playing' | 'done';

export interface SceneState {
  phase: ScenePhase;
  /** The timeline is running. */
  playing: boolean;
  /** The final frame is showing (immediately when static). */
  done: boolean;
  /** The visitor prefers reduced motion. */
  reduced: boolean;
  /** Render the final frame with no motion at all. */
  isStatic: boolean;
  tone: SceneTone;
  /** The scene's timeline budget in seconds; every primitive must end inside it. */
  duration: number;
}

/** The props every scene component accepts and forwards to <SceneFrame>. */
export interface SceneProps {
  tone?: SceneTone;
  className?: string;
  forceStatic?: boolean;
}

/** Default timeline budget in seconds. */
export const SCENE_DEFAULT_DURATION = 4.5;
/** Hard ceiling for a scene's timeline in seconds. */
export const SCENE_MAX_DURATION = 5;
/** Fraction of the frame that must be visible before the scene plays. */
export const SCENE_VIEW_AMOUNT = 0.35;

// Outside a <SceneFrame>, primitives render their final frame.
const OUTSIDE_FRAME: SceneState = {
  phase: 'static',
  playing: false,
  done: true,
  reduced: false,
  isStatic: true,
  tone: 'dark',
  duration: SCENE_DEFAULT_DURATION,
};

export const SceneStateContext = createContext<SceneState>(OUTSIDE_FRAME);

/** Playback state for primitives and hand-rolled motion inside a <SceneFrame>. */
export function useSceneState(): SceneState {
  return useContext(SceneStateContext);
}

export interface SceneOverrideOptions {
  /** Render every scene below as its static final frame (tests, previews, capture). */
  forceStatic?: boolean;
}

export const SceneOverrideContext = createContext<SceneOverrideOptions>({});
