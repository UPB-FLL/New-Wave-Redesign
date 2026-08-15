import React from 'react';

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  background?: string;
  borderRadius?: string;
  children: React.ReactNode;
}

/**
 * Compatibility wrapper for existing CTA callers. The refreshed system keeps
 * the API but replaces the decorative shimmer with the shared primary button.
 */
export function ShimmerButton({
  background = 'var(--nw-signal-cyan)',
  borderRadius = 'var(--nw-radius-control)',
  className = '',
  children,
  ...props
}: ShimmerButtonProps) {
  return (
    <button
      className={`btn-primary ${className}`}
      style={{ background, borderRadius }}
      {...props}
    >
      {children}
    </button>
  );
}
