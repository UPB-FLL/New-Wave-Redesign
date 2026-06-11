import { useReducedMotion } from 'framer-motion';
import React from 'react';

interface BorderBeamProps {
  className?: string;
  duration?: number;
  colorFrom?: string;
  colorTo?: string;
  borderWidth?: number;
}

export function BorderBeam({
  className = '',
  duration = 12,
  colorFrom = '#39CCCC',
  colorTo = '#5EBC67',
  borderWidth = 1.5,
}: BorderBeamProps) {
  const reduced = useReducedMotion();

  if (reduced) return null;

  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden ${className}`}
      style={{ zIndex: 1 }}
    >
      <span
        className="border-beam-glow absolute"
        style={
          {
            '--beam-color-from': colorFrom,
            '--beam-color-to': colorTo,
            '--beam-duration': `${duration}s`,
            '--beam-border-width': `${borderWidth}px`,
            inset: `-${borderWidth * 2}px`,
          } as React.CSSProperties
        }
      />
    </span>
  );
}
