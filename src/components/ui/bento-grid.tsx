import React from 'react';

interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

interface BentoCellProps {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
  rowSpan?: number;
}

export function BentoGrid({ children, className = '' }: BentoGridProps) {
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 ${className}`}
    >
      {children}
    </div>
  );
}

export function BentoCell({ children, className = '', colSpan = 1, rowSpan = 1 }: BentoCellProps) {
  const colClass = colSpan === 2 ? 'lg:col-span-2' : colSpan === 3 ? 'lg:col-span-3' : '';
  const rowClass = rowSpan === 2 ? 'lg:row-span-2' : rowSpan === 3 ? 'lg:row-span-3' : '';
  return (
    <div className={`${colClass} ${rowClass} ${className}`}>{children}</div>
  );
}
