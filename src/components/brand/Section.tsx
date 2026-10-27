import type { ReactNode } from 'react';

type SectionProps = {
  id?: string;
  /** white: a Pure White band; base: the page's Cloud White, so the wave shows through. */
  tone?: 'white' | 'base';
  className?: string;
  children: ReactNode;
};

/** One page band: the same rhythm, width, and hairline everywhere on the site. */
export function Section({ id, tone = 'white', className = '', children }: SectionProps) {
  return (
    <section
      id={id}
      className={`relative z-10 border-t py-16 sm:py-20 ${tone === 'white' ? 'bg-[var(--nw-pure-white)]' : ''} ${className}`}
      style={{ borderColor: 'var(--nw-mist-gray)' }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}
