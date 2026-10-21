import { DIVISION_ICONS, type DivisionIconName } from '../icons/iconData';
import { GROWTH_LOOP_NODES, type GrowthLoopNodeKey } from './growthLoop';

// The growth loop: the hub's one diagram. Four nodes on a clockwise loop, in
// the icon style grown up (stroke 3 on a 480 × 320 canvas, round caps, ground
// knock-outs behind each node): data informs integrations, integrations carry
// smart advertising, advertising brings sales, and sales data (the amber
// return link, the brand wave) feeds the next decision. Static SVG, no motion,
// no text: the list beside it names the four steps, so the drawing is
// decorative and hidden from assistive tech. It lives outside motion/ on
// purpose (the pages may import that folder only through the lazy scene
// registry), so it builds its own paths.

type Point = readonly [number, number];

const R = 36;
const STROKE = 3;

const round = (n: number) => Math.round(n * 100) / 100;
const pt = ([x, y]: Point) => `${round(x)} ${round(y)}`;

/** A point on a node's ring at `deg` (SVG convention: clockwise from +x). */
function onRing([cx, cy]: Point, deg: number): Point {
  const a = (deg * Math.PI) / 180;
  return [cx + R * Math.cos(a), cy + R * Math.sin(a)];
}

/** A cubic from one ring to the next, bowed outward through two control points. */
function link(from: Point, to: Point, c1: Point, c2: Point) {
  return { d: `M ${pt(from)} C ${pt(c1)} ${pt(c2)} ${pt(to)}`, end: to, tangent: [to[0] - c2[0], to[1] - c2[1]] as Point };
}

/** An open arrowhead at a link's end, 12 units long, 28° either side of the tangent. */
function arrowhead(end: Point, tangent: Point): string {
  const length = Math.hypot(tangent[0], tangent[1]) || 1;
  const [ux, uy] = [tangent[0] / length, tangent[1] / length];
  const wing = (deg: number): Point => {
    const a = (deg * Math.PI) / 180;
    const [rx, ry] = [ux * Math.cos(a) - uy * Math.sin(a), ux * Math.sin(a) + uy * Math.cos(a)];
    return [end[0] - rx * 12, end[1] - ry * 12];
  };
  return `M ${pt(wing(28))} L ${pt(end)} L ${pt(wing(-28))}`;
}

const [DATA, INTEGRATIONS, ADVERTISING, SALES] = GROWTH_LOOP_NODES.map((node) => node.at);

/** Data → integrations → advertising → sales, each bowed away from the centre. */
const LINKS = [
  link(onRing(DATA, -20), onRing(INTEGRATIONS, 200), [200, 52], [280, 52]),
  link(onRing(INTEGRATIONS, 70), onRing(ADVERTISING, -70), [404, 150], [404, 170]),
  link(onRing(ADVERTISING, 160), onRing(SALES, 20), [280, 268], [200, 268]),
];

/** Sales back to data: the brand wave, in Lure Amber, climbing the left side. */
const RETURN_FROM = onRing(SALES, 250);
const RETURN_TO = onRing(DATA, 110);
const RETURN_MID: Point = [RETURN_FROM[0], (RETURN_FROM[1] + RETURN_TO[1]) / 2];
const RETURN = {
  d: `M ${pt(RETURN_FROM)} C ${pt([RETURN_FROM[0] - 22, RETURN_FROM[1] - 10])} ${pt([RETURN_FROM[0] - 22, RETURN_MID[1] + 10])} ${pt(RETURN_MID)} S ${pt([RETURN_TO[0] + 22, RETURN_TO[1] + 10])} ${pt(RETURN_TO)}`,
  end: RETURN_TO,
  tangent: [RETURN_TO[0] - (RETURN_TO[0] + 22), RETURN_TO[1] - (RETURN_TO[1] + 10)] as Point,
};

/** An icon's 24-unit grid, scaled to `size` and centred on a node. */
function NodeIcon({ icon, at: [cx, cy], size }: { icon: DivisionIconName; at: Point; size: number }) {
  const k = size / 24;
  return (
    <g transform={`translate(${round(cx - size / 2)} ${round(cy - size / 2)}) scale(${round(k)})`} strokeWidth={round(STROKE / k)}>
      {DIVISION_ICONS[icon].paths.map((path) => (
        <path key={path.d} d={path.d} stroke={path.accent ? 'var(--nwse-lure-amber)' : 'currentColor'} />
      ))}
    </g>
  );
}

/** Each node's ring in its colour role (pillarStyle.ts); the sales node keeps the line colour. */
const NODE_RINGS: Record<GrowthLoopNodeKey, string> = {
  data: 'var(--nw-signal-cyan)',
  integrations: 'var(--nw-continuity-green)',
  advertising: 'var(--nwse-lure-amber)',
  sales: 'currentColor',
};

const LOOP_PALETTES = {
  light: { line: 'var(--nw-current-navy)', link: 'var(--nw-slate)', ground: 'var(--nw-pure-white)' },
  dark: { line: 'var(--nw-cloud-white)', link: 'color-mix(in srgb, var(--nw-cloud-white) 60%, transparent)', ground: 'var(--nw-current-navy)' },
} as const;

/**
 * The loop: Current Navy lines with Pure White knock-outs on a light ground,
 * Cloud White lines with Current Navy knock-outs on a dark one (`tone`; pass
 * `ground` when the panel's colour differs), each node ringed in its colour
 * role, and the amber return link. `className` sizes it (the box keeps its
 * 3:2 ratio).
 */
export function GrowthLoop({ className, tone = 'light', ground }: { className?: string; tone?: 'light' | 'dark'; ground?: string }) {
  const palette = LOOP_PALETTES[tone];
  return (
    <svg
      viewBox="0 0 480 320"
      aria-hidden="true"
      focusable="false"
      role="presentation"
      className={className}
      data-role="growth-loop"
      data-tone={tone}
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: palette.line, display: 'block', width: '100%', aspectRatio: '3 / 2' }}
    >
      {/* The loop, clockwise. */}
      {LINKS.map((item) => (
        <g key={item.d} stroke={palette.link}>
          <path d={item.d} />
          <path d={arrowhead(item.end, item.tangent)} />
        </g>
      ))}
      {/* Sales data feeds the next decision: the brand wave, in amber. */}
      <g stroke="var(--nwse-lure-amber)">
        <path d={RETURN.d} />
        <path d={arrowhead(RETURN.end, RETURN.tangent)} />
      </g>
      {/* The nodes, each knocking the loop out behind it, ringed in its colour role. */}
      {GROWTH_LOOP_NODES.map(({ key, icon, at }) => (
        <g key={key} data-loop-node={key}>
          <circle cx={at[0]} cy={at[1]} r={R} fill={ground ?? palette.ground} stroke={NODE_RINGS[key]} />
          <NodeIcon icon={icon} at={at} size={36} />
        </g>
      ))}
    </svg>
  );
}
