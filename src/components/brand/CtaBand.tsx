import { ArrowRight, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useContent } from '../../lib/useContent';
import { CurrentField } from './CurrentField';

type CtaBandProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  actionTo?: string;
};

/** The dark closing band of a page: one next step, and the number to call instead. */
export function CtaBand({ title, description, actionLabel = 'Request an assessment', actionTo = '/contact' }: CtaBandProps) {
  // The footer's section: every page already loads it for the footer itself.
  const footer = useContent('footer');
  const phone = footer.phone || '(561) 564-1846';

  return (
    <section className="relative z-10 overflow-hidden py-16 sm:py-20" style={{ background: 'var(--nw-deep-current)' }}>
      <CurrentField density="subtle" tone="dark" className="pointer-events-none absolute inset-0 h-full w-full opacity-60" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="max-w-2xl">
          <h2 className="nw-display text-3xl leading-[1.15] text-[var(--nw-cloud-white)] sm:text-[2.25rem]">{title}</h2>
          {description ? <p className="mt-3 text-base leading-relaxed text-[var(--nw-mist-gray)] sm:text-lg">{description}</p> : null}
        </div>
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
          <Link to={actionTo} className="btn-primary">
            {actionLabel}
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <a href={`tel:${phone.replace(/\D/g, '')}`} className="btn-ghost-dark">
            <Phone size={16} aria-hidden="true" />
            {phone}
          </a>
        </div>
      </div>
    </section>
  );
}
