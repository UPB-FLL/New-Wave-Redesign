// Decorative long currents, after the guidelines' cover and brand-architecture
// pages: two inherited currents in Signal Cyan / Tide Blue and the division's
// third current in Lure Amber.

const CURRENTS = [
  { d: 'M -40 190 C 280 110 660 96 980 186 S 1300 330 1480 176', color: '#31C6CF' },
  { d: 'M -40 300 C 280 220 660 206 980 296 S 1300 440 1480 286', color: '#317B92' },
  { d: 'M 260 520 C 520 450 820 440 1060 520 S 1330 640 1480 520', color: '#F2A33A' },
] as const;

export function DivisionCurrents({ className, opacity = 0.45 }: { className?: string; opacity?: number }) {
  return (
    <svg
      aria-hidden="true"
      data-role="division-currents"
      viewBox="0 0 1440 700"
      preserveAspectRatio="xMidYMid slice"
      className={className}
    >
      {CURRENTS.map(({ d, color }) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          opacity={opacity}
        />
      ))}
    </svg>
  );
}
