
interface BorderBeamProps {
  className?: string;
  duration?: number;
  colorFrom?: string;
  colorTo?: string;
  borderWidth?: number;
}

/** Compatibility surface for existing callers without animated or glowing borders. */
export function BorderBeam({
  className = '',
  colorFrom = 'var(--nw-signal-cyan)',
  borderWidth = 1,
}: BorderBeamProps) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 rounded-[inherit] ${className}`}
      style={{ border: `${borderWidth}px solid ${colorFrom}`, zIndex: 1 }}
    />
  );
}
