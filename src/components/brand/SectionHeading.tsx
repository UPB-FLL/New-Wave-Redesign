import type { ReactNode } from 'react';

type SectionHeadingProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Kept for older callers; New Wave IT pages title a section once, without a label above it. */
  eyebrow?: string;
  as?: 'h1' | 'h2' | 'h3';
  align?: 'left' | 'center';
  tone?: 'light' | 'dark';
  id?: string;
  className?: string;
};

export function SectionHeading({
  title,
  description,
  eyebrow,
  as: Heading = 'h2',
  align = 'left',
  tone = 'light',
  id,
  className = '',
}: SectionHeadingProps) {
  const alignment = align === 'center' ? 'mx-auto text-center' : '';
  const dark = tone === 'dark';

  return (
    <div className={`max-w-3xl ${alignment} ${className}`}>
      {eyebrow ? <p className="nw-kicker mb-2 text-[var(--nw-tide-blue)]">{eyebrow}</p> : null}
      <Heading
        id={id}
        className={`nw-display leading-[1.15] ${Heading === 'h3' ? 'text-2xl' : 'text-3xl sm:text-[2.25rem]'} ${
          dark ? 'text-[var(--nw-cloud-white)]' : 'text-[var(--nw-current-navy)]'
        }`}
      >
        {title}
      </Heading>
      {description ? (
        <p className={`mt-3 text-base leading-relaxed sm:text-lg ${dark ? 'text-[var(--nw-mist-gray)]' : 'text-[var(--nw-slate)]'}`}>{description}</p>
      ) : null}
    </div>
  );
}
