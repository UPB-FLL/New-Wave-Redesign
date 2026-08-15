interface SpotlightProps {
  className?: string;
  colorFrom?: string;
  colorTo?: string;
}

export function Spotlight({ className = '', colorFrom = 'color-mix(in srgb, var(--nw-signal-cyan) 10%, transparent)' }: SpotlightProps) {
  return <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${className}`} style={{ background: colorFrom }} />;
}
