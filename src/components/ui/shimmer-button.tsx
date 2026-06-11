import { useReducedMotion } from 'framer-motion';
import React from 'react';

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  background?: string;
  borderRadius?: string;
  children: React.ReactNode;
}

export function ShimmerButton({
  shimmerColor = 'rgba(255,255,255,0.18)',
  background = 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)',
  borderRadius = '0.75rem',
  className = '',
  children,
  ...props
}: ShimmerButtonProps) {
  const reduced = useReducedMotion();

  return (
    <button
      className={`relative overflow-hidden inline-flex items-center justify-center gap-2 font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2 ${className}`}
      style={{
        background,
        borderRadius,
        boxShadow: '0 8px 32px rgba(57,204,204,0.25)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(57,204,204,0.38)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(57,204,204,0.25)';
      }}
      {...props}
    >
      {!reduced && (
        <span
          aria-hidden="true"
          className="shimmer-sweep absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(105deg, transparent 40%, ${shimmerColor} 50%, transparent 60%)`,
          }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
}
