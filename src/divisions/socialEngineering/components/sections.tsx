import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { NwseIcon } from '../icons/NwseIcon';
import type { DivisionIconName } from '../icons/iconData';
import { DIVISION_CONTACT_PATH, DIVISION_PRIMARY_CTA } from '../site';
import type { DivisionFaq, DivisionPageSeo, DivisionPoint, DivisionRoadmapPhase } from '../types';
import { DivisionCurrents } from './DivisionCurrents';

export function Breadcrumbs({ trail }: { trail: DivisionPageSeo['breadcrumbs'] }) {
  const items = [{ name: 'New Wave IT', path: '/' }, ...trail];
  return (
    <nav aria-label="Breadcrumb" className="mb-4 sm:mb-6 max-lg:[@media(max-height:500px)]:mb-4">
      <ol className="nwse-type-caption flex flex-wrap items-center gap-x-2 gap-y-1 text-[var(--nw-mist-gray)] max-lg:gap-y-2">
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
                  {/* A 24px hit area below lg, with no change to the layout. */}
                  <Link to={crumb.path} className="transition-colors hover:text-[var(--nwse-lure-amber)] max-lg:-my-1 max-lg:py-1">
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

// The hero's currents stay as quiet texture: the footer's 18% opacity, faded
// further behind the text column (left) so they never compete with the H1.
const HERO_CURRENTS_OPACITY = 0.18;
const HERO_CURRENTS_FADE = {
  maskImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.35), #000 70%)',
  WebkitMaskImage: 'linear-gradient(to right, rgba(0, 0, 0, 0.35), #000 70%)',
} as const;

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
  // Balanced below lg, so a tablet hero never ends on a one-word line.
  const headingClass = 'nwse-type-display-1 mt-3 max-w-4xl text-[var(--nw-cloud-white)] max-lg:text-balance sm:mt-4';
  return (
    <section className="nwse-dark relative overflow-hidden" style={{ background: 'var(--nw-deep-current)' }}>
      <DivisionCurrents className="pointer-events-none absolute inset-0 h-full w-full" opacity={HERO_CURRENTS_OPACITY} style={HERO_CURRENTS_FADE} />
      {/* Landscape phones (below lg, at most 500px tall) keep the phone spacing
          (here, in Breadcrumbs, and around the summary and actions). */}
      <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-6 sm:px-6 sm:pb-12 sm:pt-10 lg:px-8 lg:pb-24 lg:pt-16 max-lg:[@media(max-height:500px)]:pb-8 max-lg:[@media(max-height:500px)]:pt-6">
        {breadcrumbs ? <Breadcrumbs trail={breadcrumbs} /> : null}
        {kickerInHeading ? (
          <h1>
            <span className="nwse-type-kicker nwse-kicker-on-dark block max-sm:text-balance">{kicker}</span>
            <span className="sr-only">: </span>
            <span className={`block ${headingClass}`}>{headline}</span>
          </h1>
        ) : (
          <>
            <p className="nwse-type-kicker nwse-kicker-on-dark max-sm:text-balance">{kicker}</p>
            <h1 className={headingClass}>{headline}</h1>
          </>
        )}
        <p className="nwse-type-lead mt-4 max-w-2xl text-[var(--nw-mist-gray)] sm:mt-6 max-lg:[@media(max-height:500px)]:mt-4">{summary}</p>
        {/* Phones stack the actions full width (.nwse-actions in division.css). */}
        {actions ? (
          <div className="nwse-actions mt-6 grid gap-3 sm:mt-8 sm:flex sm:flex-wrap max-lg:[@media(max-height:500px)]:mt-6">{actions}</div>
        ) : null}
        {/* The footnote only restates what the page lists next, so it is desktop-only.
            A hero animation, when one is added, follows the actions on phones. */}
        {footnote ? <div className="mt-10 hidden lg:block">{footnote}</div> : null}
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
      <h2 id={id} className="nwse-type-display-2 mt-2 text-[var(--nw-current-navy)] sm:mt-3">
        {title}
      </h2>
      {description ? <p className="nwse-type-body mt-3 text-[var(--nw-slate)] sm:mt-4">{description}</p> : null}
    </div>
  );
}

export function PointGrid({ points, columns = 3 }: { points: readonly DivisionPoint[]; columns?: 2 | 3 }) {
  return (
    <ul className={`nwse-hairlines mt-6 grid grid-cols-1 gap-0 sm:mt-8 md:gap-4 md:grid-cols-2 lg:mt-10 ${columns === 3 ? 'lg:grid-cols-3' : ''} ${ODD_ORPHAN_LI}`}>
      {points.map((point) => (
        <li key={point.title} className="nwse-card py-5 md:p-5 lg:p-6">
          <span className="block h-[3px] w-6 rounded-full md:h-1 md:w-10" style={{ background: 'var(--nwse-lure-amber)' }} aria-hidden="true" />
          <h3 className="nwse-type-title-2 mt-3 text-[var(--nw-current-navy)] md:mt-4 lg:mt-5">{point.title}</h3>
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
  // Below lg: a 40px tile with a 20px icon. Below md division.css pins the
  // tile to the timeline rail (StepList) or beside the title (RoadmapGrid).
  return (
    <div className="nwse-cardlabel flex items-center gap-4">
      <span className="nwse-icon h-10 w-10 shrink-0 lg:h-12 lg:w-12">
        <NwseIcon name={icon} size={24} className="max-lg:h-5 max-lg:w-5" />
      </span>
      {label}
    </div>
  );
}

/**
 * For grids that are 2 columns at md: with an odd count, the last item spans
 * both columns on tablets (768–1023px) instead of sitting alone. Desktop
 * column counts are untouched.
 */
const ODD_ORPHAN_LI = 'md:max-lg:[&>li:last-child:nth-child(odd)]:col-span-2';

// Static class names so Tailwind can see them; a row never strands one card.
const STEP_GRID: Record<number, string> = {
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-2 lg:grid-cols-4',
  5: `md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 ${ODD_ORPHAN_LI}`,
};
const STEP_GRID_FALLBACK = `md:grid-cols-2 lg:grid-cols-4 ${ODD_ORPHAN_LI}`;

/** Cards from md; below it, a timeline (.nwse-timeline in division.css). */
export function StepList({ steps }: { steps: readonly DivisionPoint[] }) {
  const markers = steps.every((step) => step.icon) ? 'icon' : 'node';
  return (
    <ol
      className={`nwse-timeline mt-6 grid grid-cols-1 gap-0 sm:mt-8 md:gap-4 lg:mt-10 ${STEP_GRID[steps.length] ?? STEP_GRID_FALLBACK}`}
      data-markers={markers}
    >
      {steps.map((step, index) => (
        <li key={step.title} className="nwse-card relative md:p-5 lg:p-6">
          <CardLabel icon={step.icon}>Step {String(index + 1).padStart(2, '0')}</CardLabel>
          <h3 className={`nwse-type-title-2 mt-1 ${step.icon ? 'md:mt-4' : 'md:mt-3'} text-[var(--nw-current-navy)]`}>{step.title}</h3>
          <p className="nwse-type-body-small mt-2 text-[var(--nw-slate)]">{step.detail}</p>
        </li>
      ))}
    </ol>
  );
}

/** True while the element's content is wider than its box (it scrolls sideways). */
function useOverflowsX<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [overflows, setOverflows] = useState(false);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setOverflows(element.scrollWidth > element.clientWidth + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    // The box (viewport changes) and its items (web fonts arriving).
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    [...element.children].forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, []);
  return [ref, overflows] as const;
}

/**
 * The customer journey the work is mapped against, as one ordered strip. Below
 * lg it is a single row that scrolls sideways (bleeding to the screen edges);
 * from lg it wraps as before. It is a Tab stop only while it actually scrolls,
 * so the keyboard can scroll it there and skips it everywhere else.
 */
export function JourneyStrip({ stages }: { stages: readonly string[] }) {
  const [listRef, scrolls] = useOverflowsX<HTMLOListElement>();
  return (
    <ol
      ref={listRef}
      className="nwse-journey -mx-4 mt-6 flex snap-x snap-proximity scroll-px-4 items-center gap-2 overflow-x-auto px-4 sm:-mx-6 sm:mt-8 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 print:mx-0 print:flex-wrap print:overflow-visible print:px-0"
      aria-label="Customer journey"
      tabIndex={scrolls ? 0 : undefined}
    >
      {stages.map((stage, index) => (
        <li key={stage} className="flex shrink-0 snap-start items-center gap-2">
          <span className="nwse-type-label nwse-label rounded-md border px-3 py-1.5" style={{ borderColor: 'var(--nw-mist-gray)', background: 'var(--nw-pure-white)' }}>
            <span className="text-[var(--nwse-lure-amber-deep)]">{String(index + 1).padStart(2, '0')}</span> {stage}
          </span>
          {index < stages.length - 1 ? <NwseIcon name="chevron-right" size={14} className="text-[var(--nw-slate)]" /> : null}
        </li>
      ))}
    </ol>
  );
}

/**
 * Three-phase roadmap: foundation, demand, engine. On tablets (md to lg) the
 * three cards share their row tracks (subgrid), so a title that wraps in one
 * card moves every card's divider down with it.
 */
export function RoadmapGrid({ phases }: { phases: readonly DivisionRoadmapPhase[] }) {
  return (
    <ol className="nwse-roadmap mt-6 grid grid-cols-1 gap-3 sm:mt-8 sm:gap-4 md:grid-cols-3 lg:mt-10 md:max-lg:grid-rows-[auto_auto_1fr] md:max-lg:gap-y-0">
      {phases.map((phase) => (
        <li key={phase.phase} className="nwse-card relative p-4 md:p-5 lg:p-6 md:max-lg:row-span-3 md:max-lg:grid md:max-lg:grid-rows-subgrid">
          <CardLabel icon={phase.icon}>{phase.phase}</CardLabel>
          <h3 className={`nwse-type-title-1 ${phase.icon ? 'mt-0.5 md:mt-4' : 'mt-3'} text-[var(--nw-current-navy)]`}>{phase.title}</h3>
          {/* Below md the items flow in rows at their natural width, in reading
              order, so none breaks mid-item; from md, one column. */}
          <ul
            className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t pt-3 md:mt-4 md:flex-col md:flex-nowrap md:gap-2 md:pt-4"
            style={{ borderColor: 'var(--nw-mist-gray)' }}
          >
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
    <ul className="mt-4 flex flex-col gap-3 sm:mt-6">
      {items.map((item) => (
        <li key={item} className="nwse-type-body-small flex items-start gap-3 text-[var(--nw-current-navy)]">
          <span className="nwse-icon mt-0.5 h-5 w-5 shrink-0">
            <NwseIcon name="check" size={15} />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

// Metric labels: chips. On light grounds below lg, where they sit in one
// narrow column, one grouped list (.nwse-labelrows) instead of ragged
// button-like chips.
const chipListClass = 'flex flex-wrap gap-2';
const chipClass = 'nwse-type-label nwse-label rounded-md border px-3 py-1.5';
const labelListClass = 'nwse-labelrows flex flex-col gap-0 lg:flex-row lg:flex-wrap lg:gap-2';
const labelRowClass = 'nwse-type-label nwse-label rounded-md border px-4 py-2.5 lg:px-3 lg:py-1.5';

/** Metric labels in Plex Mono caps — labels only; results belong in client reports. */
export function MetricLabels({ labels, onDark = false }: { labels: readonly string[]; onDark?: boolean }) {
  return (
    <ul className={onDark ? chipListClass : labelListClass}>
      {labels.map((label) => (
        <li
          key={label}
          className={onDark ? chipClass : labelRowClass}
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
    <div className="nwse-rowlist mt-6 flex flex-col gap-0 sm:mt-8 md:gap-3 lg:mt-10">
      {faqs.map((faq) => (
        <details key={faq.question} className="nwse-faq nwse-card group">
          <summary className="flex items-center justify-between gap-4 p-4 text-left sm:p-5">
            <h3 className="text-base font-semibold text-[var(--nw-current-navy)]">{faq.question}</h3>
            <NwseIcon name="chevron-down" size={18} className="nwse-faq-chevron shrink-0 text-[var(--nwse-lure-amber-deep)] transition-transform" />
          </summary>
          <p className="nwse-type-body-small px-4 pb-4 text-[var(--nw-slate)] sm:px-5 sm:pb-5">{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}

export function CtaBand({ heading, body }: { heading: string; body: string }) {
  return (
    <section className="nwse-dark relative overflow-hidden" style={{ background: 'var(--nw-current-navy)' }}>
      <DivisionCurrents className="pointer-events-none absolute inset-0 h-full w-full" opacity={0.3} />
      <div className="nwse-actions relative mx-auto flex max-w-7xl flex-col items-start gap-5 px-4 py-10 sm:gap-6 sm:px-6 sm:py-14 lg:flex-row lg:items-center lg:justify-between lg:px-8">
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
      className="py-10 sm:py-14 lg:py-20"
      style={{ background: tone === 'white' ? 'var(--nw-pure-white)' : 'var(--nw-cloud-white)' }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}
