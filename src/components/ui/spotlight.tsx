interface SpotlightProps {
  className?: string;
  colorFrom?: string;
  colorTo?: string;
}

export function Spotlight({
  className = '',
  colorFrom = 'rgba(57,204,204,0.18)',
  colorTo = 'transparent',
}: SpotlightProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <div
        className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[120%] h-[70%]"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${colorFrom} 0%, ${colorTo} 70%)`,
        }}
      />
      <div
        className="absolute -right-[15%] top-[10%] w-[60%] h-[80%]"
        style={{
          background: `radial-gradient(ellipse 60% 80% at 100% 20%, rgba(94,188,103,0.10) 0%, transparent 70%)`,
        }}
      />
    </div>
  );
}
