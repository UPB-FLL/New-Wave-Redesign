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
