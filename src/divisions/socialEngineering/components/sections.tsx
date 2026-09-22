import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { NwseIcon } from '../icons/NwseIcon';
import type { DivisionIconName } from '../icons/iconData';
import { DIVISION_CONTACT_PATH, DIVISION_PRIMARY_CTA } from '../site';
import type { DivisionFaq, DivisionPageSeo, DivisionPoint, DivisionRoadmapPhase } from '../types';
import { DivisionCurrents } from './DivisionCurrents';

export function Breadcrumbs({ trail }: { trail: DivisionPageSeo['breadcrumbs'] }) {
  const items = [{ name: 'New Wave IT', path: '/' }, ...trail];
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="nwse-type-caption flex flex-wrap items-center gap-x-2 gap-y-1 text-[var(--nw-mist-gray)]">
        {items.map((crumb, index) => {
          const last = index === items.length - 1;
          return (
            <li key={crumb.path} className="flex items-center gap-2">
              {last ? (
                <span aria-current="page" className="text-[var(--nw-cloud-white)]">
                  {crumb.name}
                </span>
              ) : (
                <>
                  <Link to={crumb.path} className="transition-colors hover:text-[var(--nwse-lure-amber)]">
                    {crumb.name}
                  </Link>
                  <span aria-hidden="true">/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function DivisionHero({
  kicker,
  headline,
  summary,
  breadcrumbs,
  actions,
  footnote,
  kickerInHeading = false,
}: {
  kicker: string;
  headline: string;
  summary: string;
  breadcrumbs?: DivisionPageSeo['breadcrumbs'];
  actions?: ReactNode;
  footnote?: ReactNode;
  /** Render the kicker as the first line of the H1 (keeps a brand-line headline topical). */
  kickerInHeading?: boolean;
}) {
  const headingClass = 'nwse-type-display-1 mt-4 max-w-4xl text-[var(--nw-cloud-white)]';
  return (
    <section className="nwse-dark relative overflow-hidden" style={{ background: 'var(--nw-deep-current)' }}>
      <DivisionCurrents className="pointer-events-none absolute inset-0 h-full w-full" />
      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8 lg:pb-24">
        {breadcrumbs ? <Breadcrumbs trail={breadcrumbs} /> : null}
        {kickerInHeading ? (
          <h1>
            <span className="nwse-type-kicker nwse-kicker-on-dark block">{kicker}</span>
            <span className="sr-only">: </span>
            <span className={`block ${headingClass}`}>{headline}</span>
          </h1>
        ) : (
          <>
            <p className="nwse-type-kicker nwse-kicker-on-dark">{kicker}</p>
            <h1 className={headingClass}>{headline}</h1>
          </>
        )}
        <p className="nwse-type-lead mt-6 max-w-2xl text-[var(--nw-mist-gray)]">{summary}</p>
        {actions ? <div className="mt-8 flex flex-wrap gap-3">{actions}</div> : null}
        {footnote ? <div className="mt-10">{footnote}</div> : null}
      </div>
    </section>
  );
}

export function PrimaryCta({ children = DIVISION_PRIMARY_CTA }: { children?: ReactNode }) {
  return (
    <Link to={DIVISION_CONTACT_PATH} className="nwse-btn nwse-btn-amber">
      {children}
      <NwseIcon name="arrow-right" size={16} />
    </Link>
  );
}

export function SectionIntro({
  kicker,
  title,
  description,
  id,
  align = 'left',
}: {
  kicker: string;
  title: string;
  description?: string;
  id?: string;
  align?: 'left' | 'center';
}) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      <p className="nwse-type-kicker nwse-kicker">{kicker}</p>
      <h2 id={id} className="nwse-type-display-2 mt-3 text-[var(--nw-current-navy)]">
        {title}
      </h2>
      {description ? <p className="nwse-type-body mt-4 text-[var(--nw-slate)]">{description}</p> : null}
    </div>
  );
}

export function PointGrid({ points, columns = 3 }: { points: readonly DivisionPoint[]; columns?: 2 | 3 }) {
  return (
    <ul className={`mt-10 grid gap-4 md:grid-cols-2 ${columns === 3 ? 'lg:grid-cols-3' : ''}`}>
      {points.map((point) => (
        <li key={point.title} className="nwse-card p-6">
          <span className="block h-1 w-10 rounded-full" style={{ background: 'var(--nwse-lure-amber)' }} aria-hidden="true" />
          <h3 className="nwse-type-title-2 mt-5 text-[var(--nw-current-navy)]">{point.title}</h3>
          <p className="nwse-type-body-small mt-2 text-[var(--nw-slate)]">{point.detail}</p>
        </li>
      ))}
    </ul>
  );
}

/**
 * A card's Plex Mono label ("Step 01", "Phase 01"), led by its icon tile when
 * it has one: a 24px icon in a 48px tile, one step up from the 20px service
 * icons in their 44px tiles.
 */
function CardLabel({ icon, children }: { icon?: DivisionIconName; children: ReactNode }) {
  const label = <p className="nwse-type-label nwse-label">{children}</p>;
  if (!icon) return label;
  return (
    <div className="flex items-center gap-4">
      <span className="nwse-icon h-12 w-12 shrink-0">
        <NwseIcon name={icon} size={24} />
      </span>
      {label}
    </div>
  );
}

// Static class names so Tailwind can see them; a row never strands one card.
const STEP_GRID: Record<number, string> = {
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-2 lg:grid-cols-4',
  5: 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
};

export function StepList({ steps }: { steps: readonly DivisionPoint[] }) {
  return (
    <ol className={`mt-10 grid gap-4 ${STEP_GRID[steps.length] ?? 'md:grid-cols-2 lg:grid-cols-4'}`}>
      {steps.map((step, index) => (
        <li key={step.title} className="nwse-card relative p-6">
          <CardLabel icon={step.icon}>Step {String(index + 1).padStart(2, '0')}</CardLabel>
          <h3 className={`nwse-type-title-2 ${step.icon ? 'mt-4' : 'mt-3'} text-[var(--nw-current-navy)]`}>{step.title}</h3>
          <p className="nwse-type-body-small mt-2 text-[var(--nw-slate)]">{step.detail}</p>
        </li>
      ))}
    </ol>
  );
}

/** The customer journey the work is mapped against, as one ordered strip. */
export function JourneyStrip({ stages }: { stages: readonly string[] }) {
  return (
    <ol className="mt-8 flex flex-wrap items-center gap-2" aria-label="Customer journey">
      {stages.map((stage, index) => (
        <li key={stage} className="flex items-center gap-2">
          <span className="nwse-type-label nwse-label rounded-md border px-3 py-1.5" style={{ borderColor: 'var(--nw-mist-gray)', background: 'var(--nw-pure-white)' }}>
            <span className="text-[var(--nwse-lure-amber-deep)]">{String(index + 1).padStart(2, '0')}</span> {stage}
          </span>
          {index < stages.length - 1 ? <NwseIcon name="chevron-right" size={14} className="text-[var(--nw-slate)]" /> : null}
        </li>
      ))}
    </ol>
  );
}

/** Three-phase roadmap: foundation, demand, engine. */
export function RoadmapGrid({ phases }: { phases: readonly DivisionRoadmapPhase[] }) {
  return (
    <ol className="mt-10 grid gap-4 md:grid-cols-3">
      {phases.map((phase) => (
        <li key={phase.phase} className="nwse-card p-6">
          <CardLabel icon={phase.icon}>{phase.phase}</CardLabel>
          <h3 className={`nwse-type-title-1 ${phase.icon ? 'mt-4' : 'mt-3'} text-[var(--nw-current-navy)]`}>{phase.title}</h3>
          <ul className="mt-4 flex flex-col gap-2 border-t pt-4" style={{ borderColor: 'var(--nw-mist-gray)' }}>
            {phase.items.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-[var(--nw-current-navy)]">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--nwse-lure-amber)' }} aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

export function CheckList({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-6 flex flex-col gap-3">
      {items.map((item) => (
        <li key={item} className="nwse-type-body-small flex items-start gap-3 text-[var(--nw-current-navy)]">
          <span className="nwse-icon mt-0.5 h-5 w-5 shrink-0">
            <NwseIcon name="check" size={13} />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Metric labels in Plex Mono caps — labels only; results belong in client reports. */
export function MetricLabels({ labels, onDark = false }: { labels: readonly string[]; onDark?: boolean }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {labels.map((label) => (
        <li
          key={label}
          className="nwse-type-label nwse-label rounded-md border px-3 py-1.5"
          style={
            onDark
              ? { color: 'var(--nw-cloud-white)', borderColor: 'color-mix(in srgb, var(--nw-cloud-white) 25%, transparent)' }
              : { borderColor: 'var(--nw-mist-gray)', background: 'var(--nw-pure-white)' }
          }
        >
          {label}
        </li>
      ))}
    </ul>
  );
}

export function FaqList({ faqs }: { faqs: readonly DivisionFaq[] }) {
  return (
    <div className="mt-10 flex flex-col gap-3">
      {faqs.map((faq) => (
        <details key={faq.question} className="nwse-faq nwse-card group">
          <summary className="flex items-center justify-between gap-4 p-5 text-left">
            <h3 className="text-base font-semibold text-[var(--nw-current-navy)]">{faq.question}</h3>
            <NwseIcon name="chevron-down" size={18} className="nwse-faq-chevron shrink-0 text-[var(--nwse-lure-amber-deep)] transition-transform" />
          </summary>
          <p className="nwse-type-body-small px-5 pb-5 text-[var(--nw-slate)]">{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}

export function CtaBand({ heading, body }: { heading: string; body: string }) {
  return (
    <section className="nwse-dark relative overflow-hidden" style={{ background: 'var(--nw-current-navy)' }}>
      <DivisionCurrents className="pointer-events-none absolute inset-0 h-full w-full" opacity={0.3} />
      <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="max-w-2xl">
          <h2 className="nwse-type-display-2 text-[var(--nw-cloud-white)]">{heading}</h2>
          <p className="nwse-type-body mt-3 text-[var(--nw-mist-gray)]">{body}</p>
        </div>
        <PrimaryCta />
      </div>
    </section>
  );
}

export function Band({
  children,
  tone = 'light',
  id,
  labelledBy,
}: {
  children: ReactNode;
  tone?: 'light' | 'white';
  id?: string;
  labelledBy?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className="py-16 sm:py-20"
      style={{ background: tone === 'white' ? 'var(--nw-pure-white)' : 'var(--nw-cloud-white)' }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}
