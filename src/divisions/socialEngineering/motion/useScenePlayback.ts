import { useContext, useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import {
  SCENE_DEFAULT_DURATION,
  SCENE_VIEW_AMOUNT,
  SceneOverrideContext,
  type ScenePhase,
} from './sceneState';

export interface ScenePlaybackOptions {
  /** Timeline length in seconds; `done` flips this long after playback starts. */
  duration?: number;
  /** Fraction of the element that must be visible to start (default 0.35). */
  amount?: number;
  /** Skip the timeline and report the final frame. */
  forceStatic?: boolean;
}

export interface ScenePlayback<T extends Element> {
  ref: RefObject<T>;
  phase: ScenePhase;
  playing: boolean;
  done: boolean;
  reduced: boolean;
  isStatic: boolean;
}

const canObserve = () =>
  typeof window !== 'undefined' && typeof window.IntersectionObserver === 'function';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const reducedMotionQuery = (): MediaQueryList | null =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(REDUCED_MOTION_QUERY) : null;

function subscribeToReducedMotion(onChange: () => void): () => void {
  const query = reducedMotionQuery();
  if (!query) return () => {};
  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }
  // Safari before 14 has only the older listener API.
  query.addListener(onChange);
  return () => query.removeListener(onChange);
}

/**
 * prefers-reduced-motion, read live: a change re-renders every mounted scene.
 * (framer-motion's useReducedMotion reads it once per mount, so a scene that
 * mounted before the reader turned reduced motion on would still play.)
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    () => reducedMotionQuery()?.matches === true,
    () => false,
  );
}

// Enough thresholds that a frame taller than the viewport still gets callbacks
// while it scrolls through (see the viewport-coverage fallback below).
const thresholdsFor = (amount: number) =>
  Array.from(new Set([0, 0.1, 0.2, 0.3, amount, 0.5, 0.75, 1])).sort((a, b) => a - b);

/**
 * One-time playback for a scene: `idle` until at least `amount` of the element
 * is in view, then `playing` for `duration` seconds, then `done` for good. It
 * never replays (a remount is a new scene). Under prefers-reduced-motion, with
 * `forceStatic` (prop or <SceneOverrides>), or where IntersectionObserver is
 * missing (SSR, jsdom), it reports `static`: done and never playing. The
 * preference is read live, so switching reduced motion on stops a scene that
 * is waiting or playing at its final frame.
 */
export function useScenePlayback<T extends Element = HTMLDivElement>({
  duration = SCENE_DEFAULT_DURATION,
  amount = SCENE_VIEW_AMOUNT,
  forceStatic = false,
}: ScenePlaybackOptions = {}): ScenePlayback<T> {
  const ref = useRef<T>(null);
  const overrides = useContext(SceneOverrideContext);
  const reduced = usePrefersReducedMotion();
  const isStatic = reduced || forceStatic || overrides.forceStatic === true || !canObserve();
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  // Once the final frame has been shown statically, never fall back to an
  // empty idle frame (for example if reduced motion is switched off later).
  useEffect(() => {
    if (isStatic) setFinished(true);
  }, [isStatic]);

  useEffect(() => {
    if (isStatic || started || finished) return;
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry?.isIntersecting) return;
        const viewportHeight = entry.rootBounds?.height ?? 0;
        const enough =
          entry.intersectionRatio >= amount - 0.001 ||
          (viewportHeight > 0 && entry.intersectionRect.height >= viewportHeight * amount);
        if (!enough) return;
        observer.disconnect();
        setStarted(true);
      },
      { threshold: thresholdsFor(amount) },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [isStatic, started, finished, amount]);

  useEffect(() => {
    if (!started || finished || isStatic) return;
    const timer = window.setTimeout(() => setFinished(true), duration * 1000);
    return () => window.clearTimeout(timer);
  }, [started, finished, isStatic, duration]);

  const phase: ScenePhase = isStatic ? 'static' : finished ? 'done' : started ? 'playing' : 'idle';
  return {
    ref,
    phase,
    playing: phase === 'playing',
    done: phase === 'static' || phase === 'done',
    reduced,
    isStatic,
  };
}
