import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CurrentField } from './CurrentField';

type PublicPageHeroProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  backTo?: string;
  backLabel?: string;
  icon?: LucideIcon;
  children?: ReactNode;
};

/** A stable, low-noise route header for public service and resource pages. */
export function PublicPageHero({
  title,
  description,
  eyebrow,
  backTo,
  backLabel,
  icon: Icon,
  children,
}: PublicPageHeroProps) {
  return (
    <header className="relative overflow-hidden px-4 pb-14 pt-28 sm:px-6 sm:pb-16 sm:pt-32" style={{ background: 'var(--nw-deep-current)' }}>
      <CurrentField density="standard" tone="dark" className="pointer-events-none absolute inset-0 h-full w-full opacity-70" />
      <div className="relative mx-auto max-w-5xl">
        {backTo && backLabel ? (
          <Link to={backTo} className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--nw-mist-gray)] transition-colors hover:text-[var(--nw-signal-cyan)]">
            <ArrowLeft size={15} />
            {backLabel}
          </Link>
        ) : null}
        {Icon ? <span className="nw-icon-signal mb-5 h-12 w-12"><Icon size={23} aria-hidden="true" /></span> : null}
        {eyebrow ? <p className="nw-kicker text-[var(--nw-signal-cyan)]">{eyebrow}</p> : null}
        <h1 className="nw-display mt-2 text-4xl leading-[1.05] text-[var(--nw-cloud-white)] sm:text-5xl lg:text-6xl">{title}</h1>
        {description ? <p className="mt-4 max-w-3xl text-lg leading-relaxed text-[var(--nw-mist-gray)] sm:text-xl">{description}</p> : null}
        {children ? <div className="mt-8 flex flex-wrap gap-3">{children}</div> : null}
      </div>
    </header>
  );
}
