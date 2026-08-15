import type { ReactNode } from 'react';

type SectionHeadingProps = {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: string;
  as?: 'h1' | 'h2' | 'h3';
  align?: 'left' | 'center';
  className?: string;
};

export function SectionHeading({
  title,
  description,
  eyebrow,
  as: Heading = 'h2',
  align = 'left',
  className = '',
}: SectionHeadingProps) {
  const alignment = align === 'center' ? 'mx-auto text-center' : '';

  return (
    <div className={`max-w-3xl ${alignment} ${className}`}>
      {eyebrow ? <p className="nw-kicker text-[var(--nw-tide-blue)]">{eyebrow}</p> : null}
      <Heading className="nw-display mt-2 text-3xl leading-[1.1] text-[var(--nw-current-navy)] sm:text-4xl lg:text-5xl">
        {title}
      </Heading>
      {description ? <p className="mt-4 text-base leading-relaxed text-[var(--nw-slate)] sm:text-lg">{description}</p> : null}
    </div>
  );
}
