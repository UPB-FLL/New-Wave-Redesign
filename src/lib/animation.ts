export const DURATION = {
  fast: 0.3,
  base: 0.5,
  slow: 0.8,
} as const;

export const EASE = {
  out: [0.0, 0.0, 0.2, 1] as [number, number, number, number],
  inOut: [0.4, 0.0, 0.2, 1] as [number, number, number, number],
} as const;

export const FADE_UP = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
} as const;

export const STAGGER_CONTAINER = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
} as const;

/**
 * True in the build-time page render (src/lib/prerenderBody.tsx), which has
 * no viewport: reveal animations start from their visible state there, so
 * the static HTML never carries copy at opacity 0.
 */
export const PRERENDERING = typeof window === 'undefined';

/** The `initial` prop for a reveal: its hidden variant in the browser, the resting state in the prerender. */
export const revealInitial = (hidden: string): string | false => (PRERENDERING ? false : hidden);
