// GroundSwell website icon system.
// The twelve source drawings below are the supplied 03_Icons color SVGs,
// uniformly normalized from their native 32 grid to the site's 24 grid.
// Circles and rounded rectangles become paths so existing scene renderers
// can share this data. A filled circle's visible stroke is folded into its
// radius. No logo geometry is changed. See 03_Icons/website-provenance.md.

export type DivisionIconGroup = 'services' | 'pillars' | 'phases' | 'method' | 'journey' | 'metrics' | 'ui';
export type DivisionIconTone = 'signal' | 'tide' | 'highlight';

export interface DivisionIconPath {
  /** SVG path data on the 24 x 24 grid. */
  readonly d: string;
  /** Primary cyan detail; retained for the shared scene-animation API. */
  readonly accent?: boolean;
  /** Original GroundSwell color role. Unmarked paths inherit currentColor. */
  readonly tone?: DivisionIconTone;
  /** Solid detail. All geometry remains paths for scene compatibility. */
  readonly fill?: boolean;
}

export interface DivisionIconDefinition {
  readonly label: string;
  readonly group: DivisionIconGroup;
  readonly paths: readonly DivisionIconPath[];
  /** 1.8 on the source 32 grid becomes 1.35 on this 24 grid. */
  readonly strokeWidth?: number;
  /** Supplied source icon, when this is a direct normalized drawing. */
  readonly source?: GroundSwellSourceIconName;
}

export const GROUNDSWELL_SOURCE_ICONS = {
  'analytics': {
    strokeWidth: 1.35,
    paths: [
      { d: 'M 3.75 20.25 H 20.25' },
      { d: 'M 5.25 17.25 V 14.25 M 12 17.25 V 10.5 M 18.75 17.25 V 7.5' },
      { d: 'M 3.75 9.75 C 6.75 9.75 7.5 5.625 10.875 5.625 S 16.125 7.5 19.5 3.75', tone: 'signal', accent: true },
      { d: 'M 18.3 3.75 A 1.2 1.2 0 1 0 20.7 3.75 A 1.2 1.2 0 1 0 18.3 3.75 Z', tone: 'highlight', fill: true },
    ],
  },
  'audience-insight': {
    strokeWidth: 1.35,
    paths: [
      { d: 'M 7.5 9.75 A 6.375 6.375 0 1 0 20.25 9.75 A 6.375 6.375 0 1 0 7.5 9.75 Z' },
      { d: 'M 9.225 14.4 L 3.75 19.875' },
      { d: 'M 12.3 7.725 A 1.575 1.575 0 1 0 15.45 7.725 A 1.575 1.575 0 1 0 12.3 7.725 Z M 10.8 12.975 C 10.8 9.6 16.95 9.6 16.95 12.975', tone: 'signal', accent: true },
      { d: 'M 2.7 19.875 A 1.05 1.05 0 1 0 4.8 19.875 A 1.05 1.05 0 1 0 2.7 19.875 Z', tone: 'highlight', fill: true },
    ],
  },
  'automation': {
    strokeWidth: 1.35,
    paths: [
      { d: 'M 4.35 3.375 H 6.9 A 1.35 1.35 0 0 1 8.25 4.725 V 7.275 A 1.35 1.35 0 0 1 6.9 8.625 H 4.35 A 1.35 1.35 0 0 1 3 7.275 V 4.725 A 1.35 1.35 0 0 1 4.35 3.375 Z' },
      { d: 'M 17.1 9.375 H 19.65 A 1.35 1.35 0 0 1 21 10.725 V 13.275 A 1.35 1.35 0 0 1 19.65 14.625 H 17.1 A 1.35 1.35 0 0 1 15.75 13.275 V 10.725 A 1.35 1.35 0 0 1 17.1 9.375 Z', tone: 'signal', accent: true },
      { d: 'M 6.6 15.75 H 9.15 A 1.35 1.35 0 0 1 10.5 17.1 V 19.65 A 1.35 1.35 0 0 1 9.15 21 H 6.6 A 1.35 1.35 0 0 1 5.25 19.65 V 17.1 A 1.35 1.35 0 0 1 6.6 15.75 Z' },
      { d: 'M 8.25 6 H 15 A 3.375 3.375 0 0 1 18.375 9.375 M 18.375 14.625 V 15 A 3.375 3.375 0 0 1 15 18.375 H 10.5', tone: 'tide' },
      { d: 'M 12.75 16.125 L 10.5 18.375 L 12.75 20.625', tone: 'tide' },
      { d: 'M 17.5125 12 A 0.8625 0.8625 0 1 0 19.2375 12 A 0.8625 0.8625 0 1 0 17.5125 12 Z', tone: 'highlight', fill: true },
    ],
  },
  'brand-identity': {
    strokeWidth: 1.35,
    paths: [
      { d: 'M 9 3.75 H 6 A 2.25 2.25 0 0 0 3.75 6 V 9 M 15 3.75 H 18 A 2.25 2.25 0 0 1 20.25 6 V 9 M 20.25 15 V 18 A 2.25 2.25 0 0 1 18 20.25 H 15 M 9 20.25 H 6 A 2.25 2.25 0 0 1 3.75 18 V 15' },
      { d: 'M 7.5 10.5 C 9.3 7.875 11.25 7.875 13.125 10.5 S 15.9 13.125 17.25 10.5', tone: 'signal', accent: true },
      { d: 'M 6.75 14.25 C 8.55 11.625 10.5 11.625 12.375 14.25 S 15.15 16.875 16.5 14.25' },
      { d: 'M 19.05 3.75 A 1.2 1.2 0 1 0 21.45 3.75 A 1.2 1.2 0 1 0 19.05 3.75 Z', tone: 'highlight', fill: true },
    ],
  },
  'campaigns': {
    strokeWidth: 1.35,
    paths: [
      { d: 'M 3.75 10.5 H 8.25 C 12 10.5 14.25 7.875 18 6 V 17.25 C 14.25 15.375 12 12.75 8.25 12.75 H 3.75 V 10.5 Z' },
      { d: 'M 6 12.75 L 7.5 18.75 H 11.25 L 9.45 12.825' },
      { d: 'M 20.25 7.875 C 21 9 21 14.025 20.25 15.225', tone: 'signal', accent: true },
      { d: 'M 6 7.5 C 8.475 5.25 10.875 5.25 12.75 6.75', tone: 'tide' },
      { d: 'M 3.4875 7.8 A 1.0125 1.0125 0 1 0 5.5125 7.8 A 1.0125 1.0125 0 1 0 3.4875 7.8 Z', tone: 'highlight', fill: true },
    ],
  },
  'community': {
    strokeWidth: 1.35,
    paths: [
      { d: 'M 9.75 6.375 A 2.25 2.25 0 1 0 14.25 6.375 A 2.25 2.25 0 1 0 9.75 6.375 Z' },
      { d: 'M 3.75 11.25 A 1.875 1.875 0 1 0 7.5 11.25 A 1.875 1.875 0 1 0 3.75 11.25 Z', tone: 'tide' },
      { d: 'M 16.5 11.25 A 1.875 1.875 0 1 0 20.25 11.25 A 1.875 1.875 0 1 0 16.5 11.25 Z', tone: 'tide' },
      { d: 'M 8.25 20.25 V 16.5 A 3.75 3.75 0 0 1 15.75 16.5 V 20.25' },
      { d: 'M 3 20.25 V 18 A 2.625 2.625 0 0 1 6.75 15.6 M 21 20.25 V 18 A 2.625 2.625 0 0 0 17.25 15.6', tone: 'signal', accent: true },
      { d: 'M 10.65 10.875 C 11.55 11.625 12.45 11.625 13.35 10.875', tone: 'highlight' },
    ],
  },
  'content': {
    strokeWidth: 1.35,
    paths: [
      { d: 'M 13.875 3.75 H 6.75 A 2.25 2.25 0 0 0 4.5 6 V 18 A 2.25 2.25 0 0 0 6.75 20.25 H 17.25 A 2.25 2.25 0 0 0 19.5 18 V 9.375 L 13.875 3.75 Z' },
      { d: 'M 13.875 3.75 V 7.5 A 1.875 1.875 0 0 0 15.75 9.375 H 19.5', tone: 'tide' },
      { d: 'M 9.375 10.125 L 15 13.5 L 9.375 16.875 V 10.125 Z', tone: 'signal', accent: true },
      { d: 'M 5.775 6.225 A 0.975 0.975 0 1 0 7.725 6.225 A 0.975 0.975 0 1 0 5.775 6.225 Z', tone: 'highlight', fill: true },
    ],
  },
  'integrations': {
    strokeWidth: 1.35,
    paths: [
      { d: 'M 9 4.5 H 5.25 A 2.25 2.25 0 0 0 3 6.75 V 17.25 A 2.25 2.25 0 0 0 5.25 19.5 H 9' },
      { d: 'M 15 4.5 H 18.75 A 2.25 2.25 0 0 1 21 6.75 V 17.25 A 2.25 2.25 0 0 1 18.75 19.5 H 15' },
      { d: 'M 6 12 C 8.475 8.25 10.65 8.25 13.125 12 S 16.8 15.75 18.75 12', tone: 'signal', accent: true },
      { d: 'M 4.05 12 A 1.95 1.95 0 1 0 7.95 12 A 1.95 1.95 0 1 0 4.05 12 Z', fill: true },
      { d: 'M 16.8 12 A 1.95 1.95 0 1 0 20.7 12 A 1.95 1.95 0 1 0 16.8 12 Z', tone: 'highlight', fill: true },
    ],
  },
  'momentum': {
    strokeWidth: 1.35,
    paths: [
      { d: 'M 3.75 20.25 C 9 20.25 9 15 14.25 15 S 18.975 13.575 20.25 11.25' },
      { d: 'M 3.75 15 C 7.875 15 7.875 9.75 12.375 9.75 S 17.7 8.85 20.25 3.75', tone: 'signal', accent: true },
      { d: 'M 3.75 9.75 C 6.3 9.75 6.825 7.125 9.3 6.15', tone: 'tide' },
      { d: 'M 16.35 3.75 H 20.25 V 7.65', tone: 'highlight' },
    ],
  },
  'social-media': {
    strokeWidth: 1.35,
    paths: [
      { d: 'M 12 16.5 H 9 L 5.25 19.5 V 16.125 A 3 3 0 0 1 3 13.2 V 6.75 A 3 3 0 0 1 6 3.75 H 15 A 3 3 0 0 1 18 6.75 V 9' },
      { d: 'M 13.5 11.25 H 18.375 A 2.625 2.625 0 0 1 21 13.875 V 17.25 A 2.625 2.625 0 0 1 18.375 19.5 H 18 V 21 L 15.375 19.5 H 13.5 A 2.625 2.625 0 0 1 10.875 16.875 V 13.875 A 2.625 2.625 0 0 1 13.5 11.25 Z', tone: 'tide' },
      { d: 'M 6.525 9.375 C 7.875 7.65 9.3 7.65 10.8 9.375 S 13.05 11.1 14.325 9.375', tone: 'signal', accent: true },
      { d: 'M 14.775 15.375 A 1.125 1.125 0 1 0 17.025 15.375 A 1.125 1.125 0 1 0 14.775 15.375 Z', tone: 'highlight', fill: true },
    ],
  },
  'strategy': {
    strokeWidth: 1.35,
    paths: [
      { d: 'M 4.5 18.75 C 4.5 14.25 9.75 17.25 9.75 13.875 M 9.75 11.625 C 9.75 8.25 12.75 6 17.25 6' },
      { d: 'M 17.25 3.75 V 10.5' },
      { d: 'M 17.25 3.75 H 21 L 19.275 6.15 L 21 8.475 H 17.25', tone: 'signal', accent: true },
      { d: 'M 2.325 18.75 A 2.175 2.175 0 1 0 6.675 18.75 A 2.175 2.175 0 1 0 2.325 18.75 Z', tone: 'highlight', fill: true },
      { d: 'M 8.625 12.75 A 1.125 1.125 0 1 0 10.875 12.75 A 1.125 1.125 0 1 0 8.625 12.75 Z' },
    ],
  },
  'web-design': {
    strokeWidth: 1.35,
    paths: [
      { d: 'M 5.625 4.5 H 18.375 A 2.25 2.25 0 0 1 20.625 6.75 V 18 A 2.25 2.25 0 0 1 18.375 20.25 H 5.625 A 2.25 2.25 0 0 1 3.375 18 V 6.75 A 2.25 2.25 0 0 1 5.625 4.5 Z' },
      { d: 'M 3.375 9 H 20.625' },
      { d: 'M 5.25 6.75 A 0.75 0.75 0 1 0 6.75 6.75 A 0.75 0.75 0 1 0 5.25 6.75 Z', tone: 'highlight', fill: true },
      { d: 'M 7.875 6.75 A 0.75 0.75 0 1 0 9.375 6.75 A 0.75 0.75 0 1 0 7.875 6.75 Z', tone: 'signal', fill: true },
      { d: 'M 6.375 13.5 C 7.725 11.55 9 11.55 10.35 13.5 S 12.375 15.375 13.5 13.5', tone: 'signal', accent: true },
      { d: 'M 6.375 17.25 H 12 M 15.75 12.75 H 17.625 M 15.75 15.75 H 17.625', tone: 'tide' },
    ],
  },
} as const;

export type GroundSwellSourceIconName = keyof typeof GROUNDSWELL_SOURCE_ICONS;

function supplied(source: GroundSwellSourceIconName, label: string, group: DivisionIconGroup): DivisionIconDefinition {
  return { ...GROUNDSWELL_SOURCE_ICONS[source], source, label, group };
}

// Stable names keep navigation, content, and motion scenes on one registry.
// Direct source drawings serve the main subjects. Supporting workflow and
// utility drawings use the same open corners, rounded ends, and current.
const icons = {
  'service-social': supplied('social-media', 'Social media', 'services'),
  'service-brand': supplied('brand-identity', 'Brand development', 'services'),
  'service-web': supplied('web-design', 'Website design', 'services'),
  'service-marketing': supplied('campaigns', 'Marketing', 'services'),
  'service-integration': supplied('integrations', 'Integration', 'services'),
  'service-oversight': supplied('analytics', 'Digital oversight', 'services'),
  'pillar-data': supplied('analytics', 'Data', 'pillars'),
  'pillar-integrations': supplied('integrations', 'Integrations', 'pillars'),
  'pillar-advertising': supplied('campaigns', 'Smart advertising', 'pillars'),
  'phase-foundation': {
    label: 'Digital foundation', group: 'phases', strokeWidth: 1.5,
    paths: [
      { d: 'M4 7.5V5.5A2 2 0 0 1 6 3.5H10M14 3.5H18A2 2 0 0 1 20 5.5V7.5' },
      { d: 'M4 11.5V13.5A2 2 0 0 0 6 15.5H10M14 15.5H18A2 2 0 0 0 20 13.5V11.5' },
      { d: 'M4 19.5H20', tone: 'tide' },
      { d: 'M8 9.5C10 6.5 12 6.5 14 9.5S17 12.5 18.5 9.5', tone: 'signal', accent: true },
    ],
  },
  'phase-demand': supplied('momentum', 'Demand generation', 'phases'),
  'phase-engine': supplied('automation', 'Marketing engine', 'phases'),
  'method-discover': supplied('audience-insight', 'Discover', 'method'),
  'method-prioritize': supplied('strategy', 'Prioritize', 'method'),
  'method-build': supplied('web-design', 'Build', 'method'),
  'journey-discover': supplied('audience-insight', 'Discover', 'journey'),
  'journey-understand': supplied('content', 'Understand', 'journey'),
  'journey-book': {
    label: 'Book', group: 'journey', strokeWidth: 1.5,
    paths: [
      { d: 'M7 5H5.5A2 2 0 0 0 3.5 7V18.5A2 2 0 0 0 5.5 20.5H18.5A2 2 0 0 0 20.5 18.5V7A2 2 0 0 0 18.5 5H17M7 3.5V7M17 3.5V7M10 5H14' },
      { d: 'M3.5 10H20.5', tone: 'tide' },
      { d: 'M8.5 15.5L11 18L16 13', tone: 'signal', accent: true },
    ],
  },
  'journey-attend': supplied('community', 'Attend', 'journey'),
  'journey-return': {
    label: 'Return', group: 'journey', strokeWidth: 1.5,
    paths: [
      { d: 'M4 10A8.25 8.25 0 0 1 18.5 6.5L20 8M15.5 8H20V3.5M20 14A8.25 8.25 0 0 1 5.5 17.5L4 16M8.5 16H4V20.5' },
      { d: 'M8 12C9.5 9.75 11 9.75 12.5 12S15 14.25 16.5 12', tone: 'signal', accent: true },
    ],
  },
  'journey-refer': supplied('social-media', 'Refer', 'journey'),
  'metric-bookings': {
    label: 'Bookings and inquiries', group: 'metrics', strokeWidth: 1.5,
    paths: [
      { d: 'M8 4H6A2 2 0 0 0 4 6V18A2 2 0 0 0 6 20H18A2 2 0 0 0 20 18V6A2 2 0 0 0 18 4H16M10.5 4H13.5' },
      { d: 'M4 14H8L10 17H14L16 14H20', tone: 'tide' },
      { d: 'M8 9.5C9.5 7.25 11 7.25 12.5 9.5S15 11.75 16.5 9.5', tone: 'signal', accent: true },
    ],
  },
  'metric-cost-per-lead': {
    label: 'Cost per lead', group: 'metrics', strokeWidth: 1.5,
    paths: [
      { d: 'M12 4H6A2 2 0 0 0 4 6V12L12 20A2 2 0 0 0 14.8 20L20 14.8A2 2 0 0 0 20 12L12 4Z' },
      { d: 'M6.8 8A1.2 1.2 0 1 0 9.2 8A1.2 1.2 0 1 0 6.8 8Z', tone: 'highlight', fill: true },
      { d: 'M10 12C12 10.5 14 11 14 13S16 15.5 18 14', tone: 'signal', accent: true },
    ],
  },
  'metric-conversion': {
    label: 'Conversion rate', group: 'metrics', strokeWidth: 1.5,
    paths: [
      { d: 'M4 4.5C10 4.5 8 12 14 12M4 19.5C10 19.5 8 12 14 12', tone: 'tide' },
      { d: 'M16.5 8.5L20 12L16.5 15.5' },
      { d: 'M4 12H20', tone: 'signal', accent: true },
    ],
  },
  'metric-search': supplied('audience-insight', 'Search visibility', 'metrics'),
  'metric-engagement': supplied('momentum', 'Engagement that turns into visits', 'metrics'),
  'arrow-right': {
    label: 'Arrow right', group: 'ui',
    paths: [{ d: 'M4.5 12H19.5M14 6.5L19.5 12L14 17.5' }],
  },
  'arrow-up-right': {
    label: 'Arrow up right', group: 'ui',
    paths: [{ d: 'M6 18L18 6M7.5 6H18V16.5' }],
  },
  'chevron-down': {
    label: 'Chevron down', group: 'ui',
    paths: [{ d: 'M6.5 9.25L12 14.75L17.5 9.25' }],
  },
  'chevron-right': {
    label: 'Chevron right', group: 'ui',
    paths: [{ d: 'M9.25 6.5L14.75 12L9.25 17.5' }],
  },
  'menu': {
    label: 'Menu', group: 'ui',
    paths: [{ d: 'M4 6.5H20M4 12H17M4 17.5H20' }],
  },
  'close': {
    label: 'Close', group: 'ui',
    paths: [{ d: 'M6.5 6.5L17.5 17.5M17.5 6.5L6.5 17.5' }],
  },
  'check': {
    label: 'Check', group: 'ui',
    paths: [{ d: 'M4.5 12L9.5 17L19.5 7' }],
  },
  'check-circle': {
    label: 'Success', group: 'ui',
    paths: [
      { d: 'M20.5 12A8.5 8.5 0 1 1 15 4.05' },
      { d: 'M8 11.5L11 14.5L20 5.5' },
    ],
  },
  'phone': {
    label: 'Phone', group: 'ui',
    paths: [{ d: 'M5.5 4H8L10 9L7.75 11A13 13 0 0 0 13 16.25L15 14L20 16V18.5A2 2 0 0 1 18 20.5A15.5 15.5 0 0 1 3.5 6A2 2 0 0 1 5.5 4Z' }],
  },
  'mail': {
    label: 'Email', group: 'ui',
    paths: [{ d: 'M7 5H5.5A2 2 0 0 0 3.5 7V17A2 2 0 0 0 5.5 19H18.5A2 2 0 0 0 20.5 17V7A2 2 0 0 0 18.5 5H17M10 5H14M4 8L10.5 12.5A2.5 2.5 0 0 0 13.5 12.5L20 8' }],
  },
  'map-pin': {
    label: 'Location', group: 'ui',
    paths: [
      { d: 'M19 10C19 15 12 21 12 21S5 15 5 10A7 7 0 0 1 19 10Z' },
      { d: 'M9.5 10A2.5 2.5 0 1 0 14.5 10A2.5 2.5 0 1 0 9.5 10Z' },
    ],
  },
  'send': {
    label: 'Send', group: 'ui',
    paths: [{ d: 'M20.5 3.5L3.5 10L10.5 13.5L14 20.5L20.5 3.5ZM10.5 13.5L20.5 3.5' }],
  },
} satisfies Record<string, DivisionIconDefinition>;

export type DivisionIconName = keyof typeof icons;
export const DIVISION_ICONS: Readonly<Record<DivisionIconName, DivisionIconDefinition>> = icons;

/** Stable display order: services, pillars, phases, method, journey, metrics, UI. */
export const DIVISION_ICON_NAMES = Object.keys(icons) as DivisionIconName[];
