// A page's scene from the lazy registry, without layout shift: until the
// scene's chunk has loaded, an empty box with the scene's 3:2 aspect ratio (and
// the same className) holds its space. Decorative, like the scene itself.
//
// The chunk is requested only once the slot comes near the viewport (within
// half a screen below it), so a scene further down the page loads when the
// reader gets there, and a slot hidden at the current width (display: none has
// no box, so it never intersects) never loads at all. Without
// IntersectionObserver (jsdom, very old browsers) it loads straight away and
// the scene renders its static final frame.
//
// A scene that fails to load (a flaky network, or a tab still on an old
// deploy) leaves its empty box, never an error: the scene is decorative, so it
// must never reach the route's error boundary and take the page (and the
// contact form) down with it.
import { Component, Suspense, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { SceneProps } from '../sceneState';
import { PAGE_SCENES, type ScenePageKey } from './index';

export interface SceneSlotProps extends SceneProps {
  page: ScenePageKey;
}

/** How far below the viewport a slot starts loading its scene. */
const LOAD_MARGIN = '0px 0px 50% 0px';

const canObserve = () => typeof window !== 'undefined' && typeof window.IntersectionObserver === 'function';

/** True once the element has come within LOAD_MARGIN of the viewport; it then stays true. */
function useNearViewport<T extends Element>(): [boolean, RefObject<T>] {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(() => !canObserve());
  useEffect(() => {
    if (near) return;
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        setNear(true);
      },
      { rootMargin: LOAD_MARGIN },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [near]);
  return [near, ref];
}

/**
 * Catches a scene that fails to load or render and shows `fallback` (the
 * slot's empty box) in its place. That covers a rejected chunk import and the
 * undefined module Vite hands back once main.tsx's stale-chunk reload has
 * already fired for this session.
 */
class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function SceneSlot({ page, className, ...props }: SceneSlotProps) {
  const Scene = PAGE_SCENES[page];
  const [near, ref] = useNearViewport<HTMLDivElement>();
  const box = (state: 'waiting' | 'loading' | 'failed') => (
    <div
      ref={state === 'waiting' ? ref : undefined}
      className={className}
      style={{ display: 'block', width: '100%', aspectRatio: '3 / 2' }}
      aria-hidden="true"
      data-scene-slot={state}
    />
  );
  if (!near) return box('waiting');
  return (
    <SceneBoundary fallback={box('failed')}>
      <Suspense fallback={box('loading')}>
        <Scene className={className} {...props} />
      </Suspense>
    </SceneBoundary>
  );
}
