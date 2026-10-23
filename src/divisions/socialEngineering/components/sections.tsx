import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { NwseIcon } from '../icons/NwseIcon';
import type { DivisionIconName } from '../icons/iconData';
import type { ScenePageKey } from '../motion/scenes';
import { SceneSlot } from '../motion/scenes/SceneSlot';
import { DIVISION_BASE_PATH, DIVISION_CONTACT_PATH, DIVISION_PRIMARY_CTA } from '../site';
import type { DivisionFaq, DivisionGlance, DivisionPageSeo, DivisionPillar, DivisionPillarKey, DivisionPoint, DivisionRoadmapPhase } from '../types';
import { DivisionCurrents } from './DivisionCurrents';
import { PILLAR_STYLE, accentAt, type SurfaceColor } from './pillarStyle';

/** A section's ground: light tones (Band) or dark (a navy or Deep Current band). */
export type SurfaceTone = 'light' | 'dark';

/** Text colours per ground, so a component reads the same way on either. */
const TEXT = {
  light: { heading: 'text-[var(--nw-current-navy)]', body: 'text-[var(--nw-slate)]', hairline: 'var(--nw-mist-gray)' },
  dark: { heading: 'text-[var(--nw-cloud-white)]', body: 'text-[var(--nw-mist-gray)]', hairline: 'color-mix(in srgb, var(--nw-cloud-white) 14%, transparent)' },
} as const;

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

/**
 * The hero's currents, for a dark section's ground (the hero and the hub's
 * metrics band). The section needs `relative`, and its content `relative` to
 * sit above them.
 */
export function DarkCurrents() {
  return (
    <DivisionCurrents className="pointer-events-none absolute inset-0 h-full w-full" opacity={HERO_CURRENTS_OPACITY} style={HERO_CURRENTS_FADE} />
  );
}

// The hero's scene layout switches at em widths, as the header's menu does
// (DESKTOP_NAV_QUERY in DivisionHeader): 48em, 64em, and 80em are md, lg, and
// xl (768, 1024, and 1280px) at the default text size, and proportionally
// wider when the reader enlarges text. The scene row and column are sized in
// rem, so switching at px widths would let them grow into the text under 200%
// text (a 64px text column at 1280px) while the breakpoint stayed put.
// Switching at em widths keeps the default layout's proportions when text is
// enlarged (WCAG 1.4.4). Tailwind's screens are px and `min-[64em]:` is not
// generated with px screens, so the classes spell out the media query,
// `[@media(min-width:64em)]:`. Tailwind sorts these after the px screens, in
// the order of their text, not their width: 48em, 64em, and 80em happen to
// sort by width (scenes.test.tsx checks the order). Tailwind needs each class
// written out in full, so no prefixes are composed here.

/**
 * Where a hero scene shows below the grid, 64em (from there it always sits
 * beside the text):
 * - `show`: every phone and tablet width.
 * - `wide`: from 375px. Service summaries run 11 to 13 lines on 320–374px
 *   phones, so the scene would only lengthen an already long hero there.
 * - `hide`: only beside the text, from 64em (the contact page). Its hero has
 *   no actions, so below the grid the scene would sit alone under the summary
 *   and only push the form, the page's action, further down.
 * Landscape phones (below 1024px wide and at most 500px tall) never show it:
 * at 3:2 it would take more than half the screen.
 */
export type HeroSceneOnPhones = 'show' | 'wide' | 'hide';

const HERO_SCENE_ON_PHONES: Record<HeroSceneOnPhones, string> = {
  show: '',
  wide: 'max-[374.98px]:hidden',
  hide: '[@media_not_all_and_(min-width:64em)]:hidden',
};

/**
 * A page's line-art scene (motion/scenes), decorative: hidden from assistive
 * tech, never focusable. SceneSlot reserves the scene's 3:2 box before its
 * chunk loads, so nothing shifts.
 */
function PageScene({
  page,
  tone,
  className,
  style,
}: {
  page: ScenePageKey;
  tone: 'dark' | 'light';
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div aria-hidden="true" data-page-scene={page} className={className} style={style}>
      <SceneSlot page={page} tone={tone} />
    </div>
  );
}

/**
 * The hero's ground as a soft disc behind the scene: the hero's currents
 * (their opacity unchanged) fade out behind the drawing, so no faint amber
 * current crosses the scene's Lure Amber line where the story lands. It fades
 * to transparent at the box's edges, so nothing is cut off hard.
 */
const HERO_SCENE_KNOCKOUT: CSSProperties = {
  background: 'radial-gradient(closest-side, var(--nw-deep-current) 72%, transparent)',
};

/**
 * The hero's scene. Phones: after the actions, 18rem wide and centred under the
 * full-width buttons. sm: the same, left-aligned. From 48em (md at the default
 * text size): 16rem, to the right of the actions, at the end of a 44rem row
 * (the summary's measure, plus a little), so it stays with the text rather
 * than the container's edge. From 64em (lg): the hero grid's second column,
 * beside the text and actions, centred on them.
 */
function HeroScene({ page, onPhones }: { page: ScenePageKey; onPhones: HeroSceneOnPhones }) {
  return (
    <PageScene
      page={page}
      tone="dark"
      style={HERO_SCENE_KNOCKOUT}
      className={`mx-auto mt-4 w-full max-w-[18rem] sm:mx-0 sm:mt-10 [@media(min-width:48em)]:ml-auto [@media(min-width:48em)]:mt-8 [@media(min-width:48em)]:w-[16rem] [@media(min-width:48em)]:shrink-0 [@media(min-width:64em)]:col-start-2 [@media(min-width:64em)]:row-span-2 [@media(min-width:64em)]:row-start-1 [@media(min-width:64em)]:mt-0 [@media(min-width:64em)]:w-full [@media(min-width:64em)]:max-w-none [@media(min-width:64em)]:self-center max-lg:[@media(max-height:500px)]:hidden ${HERO_SCENE_ON_PHONES[onPhones]}`}
    />
  );
}

/**
 * The scene's column: `large` is 20rem from 64em (so a 1024px text column
 * keeps its measure), then 30rem from 80em, where the scene draws 1:1 with its
 * 480-unit viewBox and the text column is the summary's own 42rem. `compact`
 * is 16rem from 64em and 22rem from 80em: for a hero whose text is too short
 * to stand beside the full-size scene (contact), or whose headline would run
 * four lines beside it (digital oversight).
 */
export type HeroSceneSize = 'large' | 'compact';

/**
 * The hero grid when a scene is present. From 64em: text | scene. The H1
 * steps down to display-1-beside (type.css) there, where it shares the row.
 */
const HERO_SCENE_GRID =
  '[@media(min-width:64em)]:grid [@media(min-width:64em)]:gap-x-10 [@media(min-width:80em)]:gap-x-16 [@media(min-width:64em)]:[--nwse-type-display-1-size:var(--nwse-type-display-1-beside-size)]';
const HERO_SCENE_COLUMNS: Record<HeroSceneSize, string> = {
  large: '[@media(min-width:64em)]:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] [@media(min-width:80em)]:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]',
  compact: '[@media(min-width:64em)]:grid-cols-[minmax(0,1fr)_minmax(0,16rem)] [@media(min-width:80em)]:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]',
};

/**
 * The hero's ground: Deep Current, with a soft Lure Amber glow rising from
 * the top right corner (behind the scene) and a cooler Signal Cyan one from
 * the bottom left, so the dark band reads as lit rather than flat. The
 * currents (DarkCurrents) paint over it unchanged.
 */
const HERO_GROUND = `radial-gradient(48rem 26rem at 100% 0%, color-mix(in srgb, var(--nwse-lure-amber) 14%, transparent), transparent 70%), radial-gradient(40rem 22rem at 0% 100%, color-mix(in srgb, var(--nw-signal-cyan) 12%, transparent), transparent 70%), var(--nw-deep-current)`;

export function DivisionHero({
  kicker,
  headline,
  summary,
  breadcrumbs,
  actions,
  facts,
  kickerInHeading = false,
  scene,
  sceneOnPhones = 'show',
  sceneSize = 'large',
}: {
  kicker: string;
  headline: string;
  summary: string;
  breadcrumbs?: DivisionPageSeo['breadcrumbs'];
  actions?: ReactNode;
  /** Short facts under the summary ("Nationwide, remote-first"), as one dotted line, never a list. */
  facts?: readonly string[];
  /** Render the kicker as the first line of the H1 (keeps a brand-line headline topical). */
  kickerInHeading?: boolean;
  /** The page's line-art scene (motion/scenes): beside the text from 64em, after the actions below it. */
  scene?: ScenePageKey;
  /** Which phone widths show the scene (see HeroSceneOnPhones). */
  sceneOnPhones?: HeroSceneOnPhones;
  /** The scene's column from 64em (see HeroSceneSize). */
  sceneSize?: HeroSceneSize;
}) {
  // Balanced below lg, so a tablet hero never ends on a one-word line.
  const headingClass = 'nwse-type-display-1 mt-3 max-w-4xl text-[var(--nw-cloud-white)] max-lg:text-balance sm:mt-4';
  // Each fact carries its own trailing separator, so a wrapped line ends on a
  // dot rather than starting with one.
  const factsLine = facts?.length ? (
    <p className="nwse-type-label mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[var(--nw-mist-gray)] sm:mt-6" data-role="hero-facts">
      {facts.map((fact, index) => (
        <span key={fact} className="flex items-center gap-x-3">
          {fact}
          {index < facts.length - 1 ? (
            <span aria-hidden="true" className="h-1 w-1 rounded-full" style={{ background: 'var(--nwse-lure-amber)' }} />
          ) : null}
        </span>
      ))}
    </p>
  ) : null;
  const heading = kickerInHeading ? (
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
  );
  const summaryText = (
    <p className="nwse-type-lead mt-4 max-w-2xl text-[var(--nw-mist-gray)] sm:mt-6 max-lg:[@media(max-height:500px)]:mt-4">{summary}</p>
  );
  // Phones stack the actions full width (.nwse-actions in division.css).
  const actionRow = (besideScene: boolean) =>
    actions ? (
      <div
        className={`nwse-actions mt-6 grid gap-3 sm:mt-8 sm:flex sm:flex-wrap max-lg:[@media(max-height:500px)]:mt-6${besideScene ? ' [@media(min-width:64em)]:col-start-1 [@media(min-width:64em)]:row-start-2' : ''}`}
      >
        {actions}
      </div>
    ) : null;
  return (
    <section className="nwse-dark relative overflow-hidden" style={{ background: HERO_GROUND }}>
      <DarkCurrents />
      {/* Landscape phones (below lg, at most 500px tall) keep the phone spacing
          (here, in Breadcrumbs, and around the summary and actions). */}
      <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-6 sm:px-6 sm:pb-12 sm:pt-10 lg:px-8 lg:pb-24 lg:pt-16 max-lg:[@media(max-height:500px)]:pb-8 max-lg:[@media(max-height:500px)]:pt-6">
        {breadcrumbs ? <Breadcrumbs trail={breadcrumbs} /> : null}
        {scene ? (
          // DOM order text, actions, scene. Phones: one column. From 48em: the
          // scene beside the actions. From 64em: text and actions | scene.
          <div className={`${HERO_SCENE_GRID} ${HERO_SCENE_COLUMNS[sceneSize]}`}>
            <div className="[@media(min-width:64em)]:col-start-1 [@media(min-width:64em)]:row-start-1">
              {heading}
              {summaryText}
              {factsLine}
            </div>
            <div className="[@media(min-width:48em)]:flex [@media(min-width:48em)]:max-w-[44rem] [@media(min-width:48em)]:items-start [@media(min-width:48em)]:gap-8 [@media(min-width:64em)]:contents">
              {actionRow(true)}
              <HeroScene page={scene} onPhones={sceneOnPhones} />
            </div>
          </div>
        ) : (
          <>
            {heading}
            {summaryText}
            {factsLine}
            {actionRow(false)}
          </>
        )}
      </div>
    </section>
  );
}

/** The discovery-call button: Lure Amber on dark grounds (the default), Lure Amber Deep with white text on light ones. */
export function PrimaryCta({ children = DIVISION_PRIMARY_CTA, tone = 'dark' }: { children?: ReactNode; tone?: SurfaceTone }) {
  return (
    <Link to={DIVISION_CONTACT_PATH} className={`nwse-btn ${tone === 'dark' ? 'nwse-btn-amber' : 'nwse-btn-amber-deep'}`}>
      {children}
      <NwseIcon name="arrow-right" size={16} />
    </Link>
  );
}

/**
 * A call to action inside a light band, after a section that has made its
 * case: an amber-tinted panel with a heading, one line, and the primary
 * button (or `children` in its place). Phones stack the button full width.
 */
export function CtaStrip({ heading, body, children }: { heading: string; body: string; children?: ReactNode }) {
  return (
    <div
      className="nwse-tint nwse-tint-amber nwse-actions mt-6 flex flex-col gap-4 p-5 sm:mt-8 sm:p-6 lg:mt-10 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:p-7"
      data-role="cta-strip"
    >
      <div className="max-w-2xl">
        <h3 className="nwse-type-title-1 text-[var(--nw-current-navy)]">{heading}</h3>
        <p className="nwse-type-body-small mt-1 text-[var(--nw-slate)]">{body}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-3">{children ?? <PrimaryCta tone="light" />}</div>
    </div>
  );
}

export function SectionIntro({
  kicker,
  title,
  description,
  id,
  align = 'left',
  tone = 'light',
  scene,
}: {
  kicker: string;
  title: string;
  description?: string;
  id?: string;
  align?: 'left' | 'center';
  /** `dark` for a navy or Deep Current band: Lure Amber kicker, Cloud White title, Mist Gray description. */
  tone?: SurfaceTone;
  /** A light-tone line-art scene beside the intro from lg (hidden below, where it would sit alone under the text). */
  scene?: ScenePageKey;
}) {
  const intro = (
    <div className={align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      <p className={`nwse-type-kicker ${tone === 'dark' ? 'nwse-kicker-on-dark' : 'nwse-kicker'}`}>{kicker}</p>
      {/* Balanced, so a two-line heading never strands its last word. */}
      <h2 id={id} className={`nwse-type-display-2 mt-2 text-balance ${TEXT[tone].heading} sm:mt-3`}>
        {title}
      </h2>
      {description ? <p className={`nwse-type-body mt-3 ${TEXT[tone].body} sm:mt-4`}>{description}</p> : null}
    </div>
  );
  if (!scene) return intro;
  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] lg:items-center lg:gap-12">
      {intro}
      <PageScene page={scene} tone="light" className="hidden lg:block" />
    </div>
  );
}

/**
 * Five cards in three columns: the second row sits centred under the first.
 * From lg the grid has six tracks, each card spans two, and the fourth starts
 * at the second track; on tablets, four tracks with the fifth card in the
 * middle. Static class names, so Tailwind can see them.
 */
export const FIVE_CENTRED_LI =
  'md:grid-cols-4 md:[&>li]:col-span-2 md:[&>li:nth-child(5)]:col-start-2 lg:grid-cols-6 lg:[&>li:nth-child(4)]:col-start-2 lg:[&>li:nth-child(5)]:col-start-auto';
const FIVE_CENTRED_DIV =
  'md:grid-cols-4 md:[&>div]:col-span-2 md:[&>div:nth-child(5)]:col-start-2 lg:grid-cols-6 lg:[&>div:nth-child(4)]:col-start-2 lg:[&>div:nth-child(5)]:col-start-auto';

/**
 * Cards for a list of points. A five-card, three-column grid centres its
 * second row under the first (FIVE_CENTRED_LI); otherwise an odd last card
 * spans the row on tablets.
 */
export function PointGrid({
  points,
  columns = 3,
  variant = 'hairline',
  accents = 'amber',
}: {
  points: readonly DivisionPoint[];
  columns?: 2 | 3;
  /** `hairline`: the white card with a Mist Gray border; `soft`: a borderless white tile with a soft shadow (for Cloud White bands). */
  variant?: 'hairline' | 'soft';
  /** The short bar over each title: amber on every card, or the colour roles in rotation. */
  accents?: 'amber' | 'cycle';
}) {
  const centred = columns === 3 && points.length === 5;
  const items = points.map((point, index) => (
    <li key={point.title} className={`${variant === 'soft' ? 'nwse-soft' : 'nwse-card'} py-5 md:p-5 lg:p-6`}>
      <span
        className="block h-[3px] w-6 rounded-full md:h-1 md:w-10"
        style={{ background: accents === 'cycle' ? accentAt(index).accent : 'var(--nwse-lure-amber)' }}
        aria-hidden="true"
      />
      <h3 className="nwse-type-title-2 mt-3 text-[var(--nw-current-navy)] md:mt-4 lg:mt-5">{point.title}</h3>
      <p className="nwse-type-body-small mt-2 text-[var(--nw-slate)]">{point.detail}</p>
    </li>
  ));
  return (
    <ul
      className={`nwse-hairlines mt-6 grid grid-cols-1 gap-0 sm:mt-8 md:gap-4 lg:mt-10 ${centred ? FIVE_CENTRED_LI : `md:grid-cols-2 ${columns === 3 ? 'lg:grid-cols-3' : ''} ${ODD_ORPHAN_LI}`}`}
      data-centred={centred ? 'true' : undefined}
    >
      {items}
    </ul>
  );
}

/**
 * A card's optional Plex Mono label (such as "Days 1–30"), led by its marker
 * tile: a 24px icon in a 48px tile, or a neutral dot when `marker` is set
 * without an icon. The tile takes a colour role (`color.tile`); the label
 * stays Tide Blue. With `rail`, a hairline follows the marker and label
 * (.nwse-rail in division.css: the stepper's rail to the next step, shown
 * from md).
 */
function CardLabel({
  icon,
  marker = false,
  color,
  rail = false,
  children,
}: {
  icon?: DivisionIconName;
  marker?: boolean;
  color?: SurfaceColor;
  rail?: boolean;
  children?: ReactNode;
}) {
  const label = children ? <p className="nwse-type-label nwse-label">{children}</p> : null;
  if (!icon && !marker) return label;
  // Below lg: a 40px tile with a 20px icon. Below md division.css pins the
  // tile to the timeline rail (StepList) or beside the title (RoadmapGrid).
  return (
    <div className="nwse-cardlabel flex items-center gap-4">
      <span className={`nwse-icon ${color?.tile ?? ''} h-10 w-10 shrink-0 lg:h-12 lg:w-12`}>
        {icon ? (
          <NwseIcon name={icon} size={24} className="max-lg:h-5 max-lg:w-5" />
        ) : (
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: color?.deep ?? 'var(--nw-current-navy)' }} aria-hidden="true" />
        )}
      </span>
      {label}
      {rail ? <span className="nwse-rail" aria-hidden="true" /> : null}
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
// The column counts per width go on the list (data-columns-*), so
// division.css can leave the rail out after a step that ends a row.
interface StepGrid {
  className: string;
  columns: { md: number; lg: number; xl?: number };
}
const STEP_GRID: Record<number, StepGrid> = {
  3: { className: 'md:grid-cols-3', columns: { md: 3, lg: 3 } },
  4: { className: 'md:grid-cols-2 lg:grid-cols-4', columns: { md: 2, lg: 4 } },
  5: { className: `md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 ${ODD_ORPHAN_LI}`, columns: { md: 2, lg: 3, xl: 5 } },
};
const STEP_GRID_FALLBACK: StepGrid = { className: `md:grid-cols-2 lg:grid-cols-4 ${ODD_ORPHAN_LI}`, columns: { md: 2, lg: 4 } };

/**
 * The steps as a stepper from md: each marker tile (the step's icon, or a
 * neutral dot), then a hairline rail from the marker to the next step's
 * tile (.nwse-rail in division.css), with no card chrome, so the
 * row reads as one process rather than three more boxes. The last step has
 * no rail, nor does a step that ends a row, which the list declares per width
 * (data-columns-md/-lg/-xl). Below md the same list is a timeline
 * (.nwse-timeline). The tiles take the colour roles in rotation.
 */
export function StepList({ steps }: { steps: readonly DivisionPoint[] }) {
  const markers = steps.every((step) => step.icon) ? 'icon' : 'dot';
  const grid = STEP_GRID[steps.length] ?? STEP_GRID_FALLBACK;
  return (
    <ol
      className={`nwse-timeline nwse-stepper mt-6 grid grid-cols-1 gap-0 sm:mt-8 md:gap-4 lg:mt-10 ${grid.className}`}
      data-markers={markers}
      data-columns-md={grid.columns.md}
      data-columns-lg={grid.columns.lg}
      data-columns-xl={grid.columns.xl}
    >
      {steps.map((step, index) => (
        <li key={step.title} className="relative md:pr-4">
          <CardLabel icon={step.icon} marker color={accentAt(index)} rail={index < steps.length - 1} />
          <h3 className="nwse-type-title-2 mt-1 text-[var(--nw-current-navy)] md:mt-4">{step.title}</h3>
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
          <span className="nwse-type-label nwse-label flex items-center gap-2 rounded-md border px-3 py-1.5" style={{ borderColor: 'var(--nw-mist-gray)', background: 'var(--nw-pure-white)' }}>
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--nwse-lure-amber-deep)]" aria-hidden="true" />
            {stage}
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
      {phases.map((phase, index) => {
        // Capped cards: each phase wears the next colour role (cyan, green,
        // amber) as a tinted header, so the three read as a progression.
        const color = accentAt(index);
        return (
          <li key={phase.phase} className="nwse-card relative overflow-hidden p-4 md:p-5 lg:p-6 md:max-lg:row-span-3 md:max-lg:grid md:max-lg:grid-rows-subgrid">
            <span className="absolute inset-x-0 top-0 h-1.5" style={{ background: color.accent }} aria-hidden="true" />
            <CardLabel icon={phase.icon} color={color}>
              {phase.phase}
            </CardLabel>
            <h3 className={`nwse-type-title-1 ${phase.icon ? 'mt-0.5 md:mt-4' : 'mt-3'} text-[var(--nw-current-navy)]`}>{phase.title}</h3>
            {/* Below md the items flow in rows at their natural width, in reading
                order, so none breaks mid-item; from md, one column. */}
            <ul
              className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t pt-3 md:mt-4 md:flex-col md:flex-nowrap md:gap-2 md:pt-4"
              style={{ borderColor: 'var(--nw-mist-gray)' }}
            >
              {phase.items.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-[var(--nw-current-navy)]">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color.accent }} aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}

export function CheckList({ items, tone = 'light', color }: { items: readonly string[]; tone?: SurfaceTone; color?: SurfaceColor }) {
  return (
    <ul className="mt-4 flex flex-col gap-3 sm:mt-6">
      {items.map((item) => (
        <li key={item} className={`nwse-type-body-small flex items-start gap-3 ${tone === 'dark' ? 'text-[var(--nw-cloud-white)]' : 'text-[var(--nw-current-navy)]'}`}>
          <span className={`nwse-icon ${color?.tile ?? ''} ${tone === 'dark' ? 'nwse-icon-on-dark' : ''} mt-0.5 h-5 w-5 shrink-0`}>
            <NwseIcon name="check" size={15} />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

// Metric labels: chips from lg. Below lg, where they sit in one narrow column,
// one grouped list (.nwse-labelrows) instead of ragged button-like chips.
const labelListClass = 'nwse-labelrows flex flex-col gap-0 lg:flex-row lg:flex-wrap lg:gap-2';
const labelRowClass = 'nwse-type-label nwse-label rounded-md border px-4 py-2.5 lg:px-3 lg:py-1.5';

/** Metric labels in Plex Mono caps — labels only; results belong in client reports. */
export function MetricLabels({ labels }: { labels: readonly string[] }) {
  return (
    <ul className={labelListClass}>
      {labels.map((label) => (
        <li key={label} className={labelRowClass} style={{ borderColor: 'var(--nw-mist-gray)', background: 'var(--nw-pure-white)' }}>
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

/** The closing band's ground: Current Navy warmed toward Tide Blue on the right, under its own stronger currents. */
const CTA_GROUND = 'linear-gradient(110deg, var(--nw-current-navy) 35%, color-mix(in srgb, var(--nw-tide-blue) 38%, var(--nw-current-navy)) 100%)';

export function CtaBand({ heading, body }: { heading: string; body: string }) {
  return (
    <section className="nwse-dark relative overflow-hidden" style={{ background: CTA_GROUND }}>
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

// A band's vertical rhythm: the page's regular beat, or the compact one for a
// strip that sits directly under a hero (the service pages' "At a glance").
const BAND_PADDING = {
  regular: 'py-10 sm:py-14 lg:py-20',
  compact: 'py-6 sm:py-8 lg:py-10',
} as const;

/** The dark bands' grounds: Deep Current (the hero's) or Current Navy (a step lighter, for a band between light ones). */
const DARK_GROUNDS = {
  dark: 'var(--nw-deep-current)',
  navy: 'var(--nw-current-navy)',
} as const;

/**
 * A section. Light tones, Cloud White (`light`) or Pure White (`white`), carry
 * the division's currents faintly behind them (.nwse-band in division.css;
 * mirrored and fainter on Cloud White, keyed on `data-tone`). Dark tones,
 * `dark` (Deep Current) and `navy` (Current Navy), carry the hero's currents
 * (DarkCurrents) as every dark section does.
 */
export function Band({
  children,
  tone = 'light',
  size = 'regular',
  id,
  labelledBy,
}: {
  children: ReactNode;
  tone?: 'light' | 'white' | keyof typeof DARK_GROUNDS;
  size?: keyof typeof BAND_PADDING;
  id?: string;
  labelledBy?: string;
}) {
  if (tone === 'dark' || tone === 'navy') {
    return (
      <section
        id={id}
        aria-labelledby={labelledBy}
        data-tone={tone}
        className={`nwse-dark relative overflow-hidden ${BAND_PADDING[size]}`}
        style={{ background: DARK_GROUNDS[tone] }}
      >
        <DarkCurrents />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
      </section>
    );
  }
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      data-tone={tone}
      className={`nwse-band relative ${BAND_PADDING[size]}`}
      style={{ background: tone === 'white' ? 'var(--nw-pure-white)' : 'var(--nw-cloud-white)' }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// The growth system: pillars, glance strips, outcomes, chips, cadence.
// ---------------------------------------------------------------------------

/**
 * The hub's three pillars, each in its own colour role (cyan, green, amber):
 * on a dark band (`tone="dark"`, the hub), glass tiles with a coloured cap,
 * a coloured icon tile; on a light band,
 * the same card washed in the role's tint. One column on phones, three from
 * lg; on tablets the third card spans the row rather than standing alone.
 */
export function PillarCards({ pillars, tone = 'light' }: { pillars: readonly DivisionPillar[]; tone?: SurfaceTone }) {
  const dark = tone === 'dark';
  return (
    <ol className="mt-6 grid grid-cols-1 gap-3 sm:mt-8 sm:gap-4 md:grid-cols-2 lg:mt-10 lg:grid-cols-3 md:max-lg:[&>li:last-child:nth-child(odd)]:col-span-2" data-role="pillars">
      {pillars.map((pillar) => {
        const color = PILLAR_STYLE[pillar.key];
        return (
          <li
            key={pillar.key}
            id={`pillar-${pillar.key}`}
            className={`${dark ? 'nwse-glass' : `nwse-tint ${color.tint}`} relative flex flex-col overflow-hidden p-5 sm:p-6 lg:p-7`}
          >
            <span className="absolute inset-x-0 top-0 h-1.5" style={{ background: color.accent }} aria-hidden="true" />
            <span className={`nwse-icon ${color.tile} ${dark ? 'nwse-icon-on-dark' : ''} h-14 w-14 shrink-0`}>
              <NwseIcon name={pillar.icon} size={28} />
            </span>
            <h3 className={`nwse-type-title-1 mt-5 ${TEXT[tone].heading}`}>{pillar.title}</h3>
            <p className={`nwse-type-body mt-2 ${TEXT[tone].body}`}>{pillar.summary}</p>
            <div className="mt-4 border-t pt-4" style={{ borderColor: dark ? TEXT.dark.hairline : color.accent }}>
              <CheckList items={pillar.items} tone={tone} color={color} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * A service page's "At a glance": four label/value pairs in one row from lg
 * (two by two on tablets, stacked on phones), each with a hairline to its left
 * from the second column on. On a dark band (the navy strip under a service
 * hero) the labels are Lure Amber and the values Cloud White.
 */
export function GlanceStrip({ items, labelledBy, tone = 'light' }: { items: readonly DivisionGlance[]; labelledBy: string; tone?: SurfaceTone }) {
  const dark = tone === 'dark';
  const hairline = TEXT[tone].hairline;
  return (
    <dl
      aria-labelledby={labelledBy}
      data-role="glance"
      className={`${dark ? 'nwse-glass' : 'nwse-card'} grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`}
    >
      {items.map((item, index) => (
        <div
          key={item.label}
          className={`flex flex-col gap-1.5 px-5 py-4 sm:py-5 lg:px-6 ${index > 0 ? 'max-sm:border-t' : ''} ${index % 2 === 1 ? 'sm:border-l' : ''} ${index >= 2 ? 'sm:border-t lg:border-t-0' : ''} ${index > 0 ? 'lg:border-l' : ''}`}
          style={{ borderColor: hairline }}
        >
          <dt className={`nwse-type-label ${dark ? '' : 'nwse-label'}`} style={dark ? { color: 'var(--nwse-lure-amber)' } : undefined}>
            {item.label}
          </dt>
          <dd className={`nwse-type-body-small font-medium ${TEXT[tone].heading}`}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * What changes for the business: three statements, each a panel washed in
 * the next colour role (cyan, green, amber) with a check icon in the
 * role's text colour. One grouped list on phones (.nwse-rowlist), three
 * panels from md.
 */
export function OutcomeList({ outcomes }: { outcomes: readonly string[] }) {
  return (
    <ol className="nwse-rowlist mt-6 grid grid-cols-1 gap-0 sm:mt-8 md:grid-cols-3 md:gap-4 lg:mt-10" data-role="outcomes">
      {outcomes.map((outcome, index) => {
        const color = accentAt(index);
        return (
          <li key={outcome} className={`nwse-tint ${color.tint} flex flex-col gap-3 p-5 sm:p-6 lg:p-7`}>
            <span className="flex items-center gap-3" aria-hidden="true">
              <span style={{ color: color.deep }}>
                <NwseIcon name="check-circle" size={32} />
              </span>
              <span className="h-1 w-8 rounded-full" style={{ background: color.accent }} />
            </span>
            <p className="nwse-type-body text-[var(--nw-current-navy)]">{outcome}</p>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Where a service sits in the system: the three pillars as a row, each in its
 * tint, the one the service serves first outlined in its colour and tagged,
 * then a link to the hub's pillars. Stacked on phones, three across from md.
 */
export function PillarStrip({ pillars, active }: { pillars: readonly DivisionPillar[]; active: DivisionPillarKey }) {
  return (
    <>
      <ol className="mt-6 grid grid-cols-1 gap-3 sm:mt-8 md:grid-cols-3 md:gap-4 lg:mt-10" data-role="pillar-strip" data-active={active}>
        {pillars.map((pillar) => {
          const current = pillar.key === active;
          const color = PILLAR_STYLE[pillar.key];
          return (
            <li
              key={pillar.key}
              aria-current={current ? 'true' : undefined}
              className={`nwse-tint ${color.tint} flex items-start gap-4 border-2 p-4 sm:p-5`}
              style={{ borderColor: current ? color.accent : 'transparent' }}
            >
              <span className={`nwse-icon ${color.tile} h-11 w-11 shrink-0`}>
                <NwseIcon name={pillar.icon} size={22} />
              </span>
              <div className="min-w-0">
                <p className="nwse-type-label" style={{ color: current ? color.deep : 'var(--nw-slate)' }}>
                  {current ? 'This service, first' : 'Supports'}
                </p>
                <h3 className="nwse-type-title-2 mt-0.5 text-[var(--nw-current-navy)]">{pillar.title}</h3>
                <p className="nwse-type-body-small mt-1 text-[var(--nw-slate)]">{pillar.summary}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <Link to={`${DIVISION_BASE_PATH}#pillars`} className="nwse-link mt-5 inline-flex items-center gap-1.5 text-sm max-lg:min-h-11 sm:mt-6">
        How the three work together
        <NwseIcon name="arrow-right" size={14} />
      </Link>
    </>
  );
}

/** Short labels as wrapping chips (kinds of business, for example), each with a dot in the next colour role. */
export function ChipList({ items, label }: { items: readonly string[]; label: string }) {
  return (
    <ul className="mt-6 flex flex-wrap gap-2 sm:mt-8" aria-label={label}>
      {items.map((item, index) => (
        <li
          key={item}
          className="nwse-type-body-small flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-medium text-[var(--nw-current-navy)]"
          style={{ borderColor: 'var(--nw-mist-gray)', background: 'var(--nw-pure-white)' }}
        >
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: accentAt(index).accent }} aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  );
}

/** The working rhythm after launch (weekly, monthly, quarterly): three columns under a hairline, each led by a coloured dot. */
export function CadenceRow({ cadence }: { cadence: readonly DivisionPoint[] }) {
  return (
    <dl className="mt-8 grid grid-cols-1 gap-6 border-t pt-6 sm:mt-10 sm:pt-8 md:grid-cols-3 md:gap-8" style={{ borderColor: 'var(--nw-mist-gray)' }} data-role="cadence">
      {cadence.map((item, index) => (
        <div key={item.title}>
          <dt className="nwse-type-label nwse-label flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: accentAt(index).accent }} aria-hidden="true" />
            {item.title}
          </dt>
          <dd className="nwse-type-body-small mt-1.5 text-[var(--nw-slate)]">{item.detail}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * What the work is measured against, on a dark band: glass tiles, each led by
 * its icon in a tile of the next colour role and a label in that colour. Five
 * tiles centre their second row under the first (FIVE_CENTRED_DIV); any other
 * count runs two columns from md and three from lg.
 */
export function MetricTiles({ metrics }: { metrics: readonly DivisionPoint[] }) {
  const centred = metrics.length === 5;
  return (
    <dl
      className={`mt-6 grid grid-cols-1 gap-3 sm:mt-8 sm:gap-4 lg:mt-10 ${centred ? FIVE_CENTRED_DIV : 'md:grid-cols-2 lg:grid-cols-3 md:max-lg:[&>div:last-child:nth-child(odd)]:col-span-2'}`}
      data-role="metric-tiles"
      data-centred={centred ? 'true' : undefined}
    >
      {metrics.map((metric, index) => {
        const color = accentAt(index);
        return (
          <div key={metric.title} className="nwse-glass p-5 lg:p-6">
            <dt className="flex items-center gap-3">
              {metric.icon ? (
                <span className={`nwse-icon ${color.tile} nwse-icon-on-dark h-11 w-11 shrink-0`}>
                  <NwseIcon name={metric.icon} size={24} className="max-sm:h-5 max-sm:w-5" />
                </span>
              ) : null}
              <span className="nwse-type-label" style={{ color: color.onDark }}>
                {metric.title}
              </span>
            </dt>
            <dd className="nwse-type-body-small mt-3 text-[var(--nw-mist-gray)]">{metric.detail}</dd>
          </div>
        );
      })}
    </dl>
  );
}
