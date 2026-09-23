import { vi } from 'vitest';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * Stubs window.matchMedia (jsdom has none) so `(prefers-reduced-motion:
 * reduce)` reports `reduce`, and lets a test switch it later, as a reader
 * changing the OS setting would: `set()` notifies every 'change' listener.
 * Every other query reports false. `vi.unstubAllGlobals()` removes it.
 */
export function stubReducedMotion(initial = false) {
  let reduce = initial;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const matchMedia = (query: string): MediaQueryList => {
    const tracked = query.replace(/\s+/g, '') === REDUCED_MOTION.replace(/\s+/g, '');
    const add = (listener: (event: MediaQueryListEvent) => void) => {
      if (tracked) listeners.add(listener);
    };
    const remove = (listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    };
    return {
      get matches() {
        return tracked && reduce;
      },
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => add(listener),
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => remove(listener),
      addListener: add,
      removeListener: remove,
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
  };
  vi.stubGlobal('matchMedia', vi.fn(matchMedia));
  return {
    /** Switch the preference and notify listeners (wrap in act() when components are mounted). */
    set(next: boolean) {
      reduce = next;
      const event = { matches: next, media: REDUCED_MOTION } as MediaQueryListEvent;
      [...listeners].forEach((listener) => listener(event));
    },
    listenerCount: () => listeners.size,
  };
}
