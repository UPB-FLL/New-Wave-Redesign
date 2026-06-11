import { useReducedMotion } from 'framer-motion';
import React from 'react';

interface MarqueeProps {
  children: React.ReactNode;
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  duration?: number;
}

export function Marquee({
  children,
  className = '',
  reverse = false,
  pauseOnHover = true,
  duration = 32,
}: MarqueeProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <div className={`overflow-hidden ${className}`}>
        <div className="flex gap-8">{children}</div>
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden relative ${className}`}
      style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)' }}
    >
      <div
        className={`flex w-max gap-8 ${pauseOnHover ? 'marquee-pause-on-hover' : ''}`}
        style={{
          animation: `marquee-scroll ${duration}s linear infinite ${reverse ? 'reverse' : ''}`,
        }}
      >
        {children}
        {children}
      </div>
    </div>
  );
}
