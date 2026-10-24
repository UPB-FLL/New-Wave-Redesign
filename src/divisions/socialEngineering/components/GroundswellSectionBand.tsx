import type { ReactNode } from 'react';

/** A GroundSwell page section on one of the product's surfaces; the division's shared section colours stay untouched. */
export function GroundswellSectionBand({
  children,
  surface,
  compact = false,
  id,
  labelledBy,
}: {
  children: ReactNode;
  surface: 'navigation' | 'foam' | 'navy' | 'sample' | 'amber';
  compact?: boolean;
  id?: string;
  labelledBy?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={`gs-section gs-section-${surface} relative ${compact ? 'py-6 sm:py-8 lg:py-10' : 'py-10 sm:py-14 lg:py-20'}`}
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}
