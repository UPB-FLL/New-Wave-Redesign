// Pure path geometry shared by the scene primitives. No DOM: everything here
// also runs in jsdom and at build time.

export type Point = readonly [number, number];

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** CSS aspect-ratio for a viewBox: "0 0 480 320" → "3 / 2". */
export function aspectRatioFor(viewBox: string): string {
  const [, , w, h] = viewBox.trim().split(/[\s,]+/).map(Number);
  if (!(w > 0 && h > 0)) return '3 / 2';
  if (Number.isInteger(w) && Number.isInteger(h)) {
    const k = gcd(w, h);
    return `${w / k} / ${h / k}`;
  }
  return `${w} / ${h}`;
}

/** The logo's amber wave, on the logo's own 64-unit artboard. */
export const LOGO_WAVE_D = 'M 8 15 C 17 5 29 5 39 15 S 51 25 56 13';

const round = (n: number) => {
  const r = Math.round(n * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
};
const pt = (x: number, y: number) => `${round(x)} ${round(y)}`;

export interface WaveGeometry {
  /** Left end of the wave, on its baseline. */
  x: number;
  y: number;
  width: number;
  /**
   * Crest height in scene units. Defaults to the logo's proportion
   * (`logo`: 0.156 × width) or the icon accent's (`icon`: 0.128 × half-wave).
   * 0 gives a straight line with the same path structure, for morphs.
   */
  amplitude?: number;
  /** How far the right end sits above the left end (positive = up). Shears the whole wave. */
  rise?: number;
  /**
   * `logo`: the logo wave (one crest, one trough, the tail lifting at the end).
   * `icon`: the icons' symmetric accent wave, `cycles` crest-trough pairs.
   */
  variant?: 'logo' | 'icon';
  /** `icon` only: crest-trough pairs (default 1). */
  cycles?: number;
}

/** Logo wave as offsets from its start: x in widths, y in control heights. */
const LOGO_WAVE = {
  c1: [9 / 48, -1],
  c2: [21 / 48, -1],
  mid: [31 / 48, 0],
  s2: [43 / 48, 1],
  end: [1, -0.2],
} as const;

/** Icon accent wave (`c2.83-1.54 6.17-1.54 9 0`) per half-wave, x in half-wave widths. */
const ICON_WAVE_C1 = 2.83 / 9;
const ICON_WAVE_C2 = 6.17 / 9;

/**
 * A brand wave as absolute `M … C … S …` path data. Two calls with the same
 * `variant` and `cycles` always share one command structure, so framer-motion
 * can morph between them (for example a wave straightening into a rising line:
 * `wavePath(g)` → `wavePath({ ...g, amplitude: 0, rise: 80 })`).
 */
export function wavePath({ x, y, width, amplitude, rise = 0, variant = 'logo', cycles = 1 }: WaveGeometry): string {
  // Map (fraction of width, vertical offset) to a scene point, sheared by `rise`.
  const at = (u: number, dy: number) => pt(x + u * width, y + dy - rise * u);

  if (variant === 'logo') {
    const crest = amplitude ?? width * (7.5 / 48);
    const h = crest / 0.75; // a symmetric cubic crest peaks at 0.75 × its control height
    const { c1, c2, mid, s2, end } = LOGO_WAVE;
    return [
      `M ${at(0, 0)}`,
      `C ${at(c1[0], c1[1] * h)} ${at(c2[0], c2[1] * h)} ${at(mid[0], mid[1] * h)}`,
      `S ${at(s2[0], s2[1] * h)} ${at(end[0], end[1] * h)}`,
    ].join(' ');
  }

  const halves = Math.max(1, Math.round(cycles)) * 2;
  const hw = 1 / halves;
  const crest = amplitude ?? width * hw * (0.75 * 1.54 / 9);
  const h = crest / 0.75;
  const parts = [`M ${at(0, 0)}`, `C ${at(hw * ICON_WAVE_C1, -h)} ${at(hw * ICON_WAVE_C2, -h)} ${at(hw, 0)}`];
  for (let i = 1; i < halves; i += 1) {
    const sign = i % 2 === 1 ? 1 : -1; // trough, crest, trough, …
    parts.push(`S ${at(hw * (i + ICON_WAVE_C2), sign * h)} ${at(hw * (i + 1), 0)}`);
  }
  return parts.join(' ');
}

/** The icon set's check (`check.svg`), reversed to draw from the short arm. */
const CHECK_POINTS: readonly Point[] = [[4, 12], [9.25, 17.25], [20, 6.5]];
/** The smaller check inside `check-circle.svg`'s ring. */
const RING_CHECK_POINTS: readonly Point[] = [[8.25, 11.5], [10.75, 14], [15.75, 9]];

/** Map a point on the 24-unit icon grid to a scene point for an icon box centred at `at`. */
export function fromIconGrid(at: Point, size: number, [px, py]: Point): Point {
  const k = size / 24;
  return [at[0] + (px - 12) * k, at[1] + (py - 12) * k];
}

/**
 * The icon set's check at scene scale; `size` is the 24-unit icon box it sits
 * in. `inRing` uses the smaller check that fits inside ringPath().
 */
export function checkPath(at: Point, size: number, { inRing = false }: { inRing?: boolean } = {}): string {
  const [a, b, c] = (inRing ? RING_CHECK_POINTS : CHECK_POINTS).map((p) => fromIconGrid(at, size, p));
  return `M ${pt(...a)} L ${pt(...b)} L ${pt(...c)}`;
}

/** A full circle (radius 9 on the icon grid, like check-circle) that draws clockwise from 12 o'clock. */
export function ringPath(at: Point, size: number): string {
  const r = (9 * size) / 24;
  const [cx, cy] = at;
  return `M ${pt(cx, cy - r)} A ${round(r)} ${round(r)} 0 1 1 ${pt(cx, cy + r)} A ${round(r)} ${round(r)} 0 1 1 ${pt(cx, cy - r)}`;
}

export interface PathSegment {
  command: string;
  args: number[];
}

const COMMANDS = /[MmLlHhVvCcSsQqTtAaZz]/;
const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/;
const ARITY: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };

/** Tokenise SVG path data into commands and numbers (handles packed arc flags like `a1 1 0 01 1 1`). */
export function parsePath(d: string): PathSegment[] {
  const segments: PathSegment[] = [];
  let current: PathSegment | null = null;
  let i = 0;
  while (i < d.length) {
    const ch = d[i];
    if (ch === ' ' || ch === ',' || ch === '\n' || ch === '\t' || ch === '\r') {
      i += 1;
      continue;
    }
    if (COMMANDS.test(ch)) {
      current = { command: ch, args: [] };
      segments.push(current);
      i += 1;
      continue;
    }
    if (!current) throw new Error(`Path data must start with a command: "${d}"`);
    const isArcFlag = current.command.toLowerCase() === 'a' && [3, 4].includes(current.args.length % 7);
    if (isArcFlag && (ch === '0' || ch === '1')) {
      current.args.push(ch === '1' ? 1 : 0);
      i += 1;
      continue;
    }
    const match = NUMBER.exec(d.slice(i));
    if (!match) throw new Error(`Unexpected "${ch}" in path data: "${d}"`);
    current.args.push(Number(match[0]));
    i += match[0].length;
  }
  return segments;
}

/** Start and end points of a path (the end is where the pen stops, so a closed subpath ends at its start). */
export function pathEndpoints(d: string): { start: Point; end: Point } {
  let x = 0;
  let y = 0;
  let subX = 0;
  let subY = 0;
  let start: Point | null = null;
  for (const { command, args } of parsePath(d)) {
    const lower = command.toLowerCase();
    const rel = command === lower;
    if (lower === 'z') {
      x = subX;
      y = subY;
      continue;
    }
    const n = ARITY[lower];
    for (let k = 0; k + n <= args.length; k += n) {
      const a = args.slice(k, k + n);
      if (lower === 'h') x = rel ? x + a[0] : a[0];
      else if (lower === 'v') y = rel ? y + a[0] : a[0];
      else {
        const ex = a[n - 2];
        const ey = a[n - 1];
        x = rel ? x + ex : ex;
        y = rel ? y + ey : ey;
      }
      // Only the first pair of an M starts a subpath; later pairs are implicit line-tos.
      if (lower === 'm' && k === 0) {
        subX = x;
        subY = y;
        if (!start) start = [x, y];
      }
    }
  }
  return { start: start ?? [0, 0], end: [x, y] };
}

/**
 * The command letters and argument counts of a path, e.g. `M2 C6 S4`
 * (case-sensitive: relative and absolute commands don't interpolate).
 * Two paths morph cleanly only when their signatures match.
 */
export function pathSignature(d: string): string {
  return parsePath(d)
    .map(({ command, args }) => `${command}${args.length}`)
    .join(' ');
}
