import type { ReactNode } from 'react';

interface MarqueeProps {
  children: ReactNode;
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  duration?: number;
}

export function Marquee({ children, className = '' }: MarqueeProps) {
  return <div className={`overflow-hidden ${className}`}><div className="flex flex-wrap gap-8">{children}</div></div>;
}
