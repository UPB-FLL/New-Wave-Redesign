import type { ReactNode } from 'react';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Crumb } from '../../lib/pageMeta';
import { CurrentField } from './CurrentField';

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  /** The trail below Home, the same one the page's BreadcrumbList states. */
  breadcrumbs?: readonly Crumb[];
  actions?: ReactNode;
  /** Short facts under the actions, each with a check. */
  facts?: readonly string[];
  /** Extra lines under the description, such as an article's date and author. */
  children?: ReactNode;
};

function Breadcrumbs({ trail }: { trail: readonly Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-[var(--nw-mist-gray)]">
        <li>
          <Link to="/" className="transition-colors hover:text-[var(--nw-signal-cyan)]">Home</Link>
        </li>
        {trail.map((crumb, index) => {
          const current = index === trail.length - 1;
          return (
            <li key={crumb.path} className="flex items-center gap-1.5">
              <ChevronRight size={14} className="shrink-0 text-[var(--nw-slate)]" aria-hidden="true" />
              {current ? (
                <span aria-current="page" className="text-[var(--nw-cloud-white)]">{crumb.name}</span>
              ) : (
                <Link to={crumb.path} className="transition-colors hover:text-[var(--nw-signal-cyan)]">{crumb.name}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * The header every inner New Wave IT page opens with: where the page sits,
 * what it is, and what to do next, on the same dark ground as the home hero.
 */
export function PageHeader({ title, description, breadcrumbs, actions, facts, children }: PageHeaderProps) {
  return (
    <header className="relative overflow-hidden pb-14 pt-28 sm:pb-16 sm:pt-32" style={{ background: 'var(--nw-deep-current)' }}>
      <CurrentField density="standard" tone="dark" className="pointer-events-none absolute inset-0 h-full w-full opacity-70" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          {breadcrumbs?.length ? <Breadcrumbs trail={breadcrumbs} /> : null}
          <h1 className="nw-display text-4xl leading-[1.08] text-[var(--nw-cloud-white)] sm:text-5xl">{title}</h1>
          {description ? <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[var(--nw-mist-gray)]">{description}</p> : null}
          {children}
          {actions ? <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">{actions}</div> : null}
          {facts?.length ? (
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t pt-6" style={{ borderColor: 'var(--nw-tide-blue)' }}>
              {facts.map((fact) => (
                <li key={fact} className="flex items-center gap-2 text-sm text-[var(--nw-mist-gray)]">
                  <CheckCircle2 size={16} className="shrink-0 text-[var(--nw-continuity-green)]" aria-hidden="true" />
                  {fact}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </header>
  );
}
