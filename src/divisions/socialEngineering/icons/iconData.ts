// New Wave: Social Engineering icon set: path data for NwseIcon.
//
// Converted from the brand kit's icon SVGs (one file per icon: 24 x 24 grid,
// stroke 1.75, round caps and joins, <path> elements only), in the kit's
// display order. Each <path d> is one entry here and data-accent="true"
// becomes `accent: true`. Keep this module and the kit's SVG files
// identical; to add an icon, see docs/social-engineering-division.md,
// "Icons". icons.test.ts enforces the spec rules on every entry.
//
// Pure data: no React, no DOM, so types.ts and the content modules can name
// icons without pulling a component into the build-time prerender. Accent
// paths are the brand wave, always last, stroked in Lure Amber by NwseIcon;
// every icon still reads in one colour without them.

export type DivisionIconGroup = 'services' | 'phases' | 'method' | 'journey' | 'metrics' | 'ui';

export interface DivisionIconPath {
  /** SVG path data on the 24 x 24 grid. */
  readonly d: string;
  /** Part of the icon's single brand-wave accent group. */
  readonly accent?: boolean;
}

export interface DivisionIconDefinition {
  /** Plain-language name, used as the accessible title when an icon is meaningful. */
  readonly label: string;
  readonly group: DivisionIconGroup;
  readonly paths: readonly DivisionIconPath[];
}

const icons = {
  'service-social': {
    label: 'Social media',
    group: 'services',
    paths: [
      { d: 'M3 16.5V5.5A2.5 2.5 0 0 1 5.5 3h9A2.5 2.5 0 0 1 17 5.5v5A2.5 2.5 0 0 1 14.5 13h-8z' },
      { d: 'M17 9h1.5a2.5 2.5 0 0 1 2.5 2.5V21l-3-2.5h-4a2.5 2.5 0 0 1-2.5-2.5' },
      { d: 'M5.75 8c1.33-1.46 2.92-1.46 4.25 0s2.92 1.46 4.25 0', accent: true },
    ],
  },
  'service-brand': {
    label: 'Brand development',
    group: 'services',
    paths: [
      { d: 'M12 20.75a8.75 8.75 0 1 1 8.75-8.75c0 2.2-1.8 3.75-4 3.75h-2a1.75 1.75 0 0 0-1.4 2.8l.2.25a1.2 1.2 0 0 1-1.55 1.95z' },
      { d: 'M7.25 13.25h.01' },
      { d: 'M8 8.75h.01' },
      { d: 'M12 6.25h.01' },
      { d: 'M10.5 11.5c1.18-1.29 2.57-1.29 3.75 0s2.57 1.29 3.75 0', accent: true },
    ],
  },
  'service-web': {
    label: 'Website design',
    group: 'services',
    paths: [
      { d: 'M5.5 4h13a2.5 2.5 0 0 1 2.5 2.5v11a2.5 2.5 0 0 1 -2.5 2.5h-13a2.5 2.5 0 0 1 -2.5-2.5v-11a2.5 2.5 0 0 1 2.5-2.5z' },
      { d: 'M3 9.5h18' },
      { d: 'M6.25 6.75h.01' },
      { d: 'M9.25 6.75h.01' },
      { d: 'M6 14.75c1.88-2.06 4.12-2.06 6 0s4.12 2.06 6 0', accent: true },
    ],
  },
  'service-marketing': {
    label: 'Marketing',
    group: 'services',
    paths: [
      { d: 'M6.75 9c2.3 0 4.1-1.3 5.5-3.5v13c-1.4-2.2-3.2-3.5-5.5-3.5h-1.25A2.5 2.5 0 0 1 3 12.5v-1A2.5 2.5 0 0 1 5.5 9z' },
      { d: 'M6.75 9v6' },
      { d: 'M5.25 15l1 4' },
      { d: 'M15 12c.94-1.13 2.06-1.13 3 0s2.06 1.13 3 0', accent: true },
    ],
  },
  'service-integration': {
    label: 'Integration',
    group: 'services',
    paths: [
      { d: 'M3 4.75a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0' },
      { d: 'M3 12a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0' },
      { d: 'M3 19.25a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0' },
      { d: 'M6 4.75c3 0 2.75 7.25 5.5 7.25' },
      { d: 'M6 19.25c3 0 2.75-7.25 5.5-7.25' },
      { d: 'M6 12h5.5' },
      { d: 'M11.5 12c1.49-1.63 3.26-1.63 4.75 0s3.26 1.63 4.75 0', accent: true },
    ],
  },
  'service-oversight': {
    label: 'Digital oversight',
    group: 'services',
    paths: [
      { d: 'M5.11 18.04A9 9 0 1 1 18.89 18.04' },
      { d: 'M12 12.25l3.75-3.75' },
      { d: 'M12 12.25h.01' },
      { d: 'M7.25 19.75c1.49-1.63 3.26-1.63 4.75 0s3.26 1.63 4.75 0', accent: true },
    ],
  },
  'phase-foundation': {
    label: 'Digital foundation',
    group: 'phases',
    paths: [
      { d: 'M12 8.75L20.25 12.75L12 16.75L3.75 12.75Z' },
      { d: 'M3.75 17l8.25 4 8.25-4' },
      { d: 'M6.5 4.75c1.73-1.7 3.77-1.7 5.5 0s3.77 1.7 5.5 0', accent: true },
    ],
  },
  'phase-demand': {
    label: 'Demand generation',
    group: 'phases',
    paths: [
      { d: 'M13 16.25L21 8.25' },
      { d: 'M15.75 8.25H21V13.5' },
      { d: 'M3 16.25c1.57-1.57 3.43-1.57 5 0s3.43 1.57 5 0', accent: true },
    ],
  },
  'phase-engine': {
    label: 'Marketing engine',
    group: 'phases',
    paths: [
      { d: 'M9.91 5.84L10.26 3.42A8.75 8.75 0 0 1 13.74 3.42L14.09 5.84A6.5 6.5 0 0 1 16.29 7.12L18.56 6.21A8.75 8.75 0 0 1 20.3 9.22L18.37 10.73A6.5 6.5 0 0 1 18.37 13.27L20.3 14.78A8.75 8.75 0 0 1 18.56 17.79L16.29 16.88A6.5 6.5 0 0 1 14.09 18.16L13.74 20.58A8.75 8.75 0 0 1 10.26 20.58L9.91 18.16A6.5 6.5 0 0 1 7.71 16.88L5.44 17.79A8.75 8.75 0 0 1 3.7 14.78L5.63 13.27A6.5 6.5 0 0 1 5.63 10.73L3.7 9.22A8.75 8.75 0 0 1 5.44 6.21L7.71 7.12A6.5 6.5 0 0 1 9.91 5.84z' },
      { d: 'M8.25 12c1.18-1.29 2.57-1.29 3.75 0s2.57 1.29 3.75 0', accent: true },
    ],
  },
  'method-discover': {
    label: 'Discover',
    group: 'method',
    paths: [
      { d: 'M3.5 10.5a7 7 0 1 0 14 0a7 7 0 1 0 -14 0' },
      { d: 'M15.45 15.45L20.5 20.5' },
      { d: 'M6.7 10.5c1.19-1.3 2.61-1.3 3.8 0s2.61 1.3 3.8 0', accent: true },
    ],
  },
  'method-prioritize': {
    label: 'Prioritize',
    group: 'method',
    paths: [
      { d: 'M6 20V4' },
      { d: 'M3 7l3-3 3 3' },
      { d: 'M12.5 12h6' },
      { d: 'M12.5 18h2.5' },
      { d: 'M12.5 6c1.33-1.46 2.92-1.46 4.25 0s2.92 1.46 4.25 0', accent: true },
    ],
  },
  'method-build': {
    label: 'Build',
    group: 'method',
    paths: [
      { d: 'M3 5.5A2.5 2.5 0 0 1 5.5 3h4A2.5 2.5 0 0 1 12 5.5V12h6.5a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5z' },
      { d: 'M3 12h9v9' },
      { d: 'M14.75 6.75c.94-1.03 2.06-1.03 3 0s2.06 1.03 3 0', accent: true },
    ],
  },
  'journey-discover': {
    label: 'Discover',
    group: 'journey',
    paths: [
      { d: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0' },
      { d: 'M15.82 8.18L14.2 13.05L8.18 15.82L9.8 10.95z' },
    ],
  },
  'journey-understand': {
    label: 'Understand',
    group: 'journey',
    paths: [
      { d: 'M9 17.5V15.5A6.25 6.25 0 1 1 15 15.5V17.5z' },
      { d: 'M10 20.5h4' },
      { d: 'M8.5 10c1.1-1.2 2.4-1.2 3.5 0s2.4 1.2 3.5 0', accent: true },
    ],
  },
  'journey-book': {
    label: 'Book',
    group: 'journey',
    paths: [
      { d: 'M5.5 4.5h13a2.5 2.5 0 0 1 2.5 2.5v11.5a2.5 2.5 0 0 1 -2.5 2.5h-13a2.5 2.5 0 0 1 -2.5 -2.5v-11.5a2.5 2.5 0 0 1 2.5 -2.5z' },
      { d: 'M8 3v3.5' },
      { d: 'M16 3v3.5' },
      { d: 'M12 13.75v4.5' },
      { d: 'M9.75 16h4.5' },
      { d: 'M3 10.5c2.83-1.54 6.17-1.54 9 0s6.17 1.54 9 0', accent: true },
    ],
  },
  'journey-attend': {
    label: 'Attend',
    group: 'journey',
    paths: [
      { d: 'M3 8.5A2.5 2.5 0 0 1 5.5 6h13A2.5 2.5 0 0 1 21 8.5V10a2 2 0 0 0 0 4v1.5A2.5 2.5 0 0 1 18.5 18h-13A2.5 2.5 0 0 1 3 15.5V14a2 2 0 0 0 0-4z' },
      { d: 'M16.25 9.25h.01' },
      { d: 'M16.25 12h.01' },
      { d: 'M16.25 14.75h.01' },
      { d: 'M7.75 12c.9-.99 1.97-.99 2.88 0s1.97 .99 2.88 0', accent: true },
    ],
  },
  'journey-return': {
    label: 'Return',
    group: 'journey',
    paths: [
      { d: 'M4.28 12.68A7.75 7.75 0 0 1 16.45 5.65' },
      { d: 'M19.72 11.32A7.75 7.75 0 0 1 7.55 18.35' },
      { d: 'M13.98 6.09L16.45 5.65L16.01 3.19' },
      { d: 'M10.02 17.91L7.55 18.35L7.99 20.81' },
      { d: 'M8.5 12c1.1-1.2 2.4-1.2 3.5 0s2.4 1.2 3.5 0', accent: true },
    ],
  },
  'journey-refer': {
    label: 'Refer',
    group: 'journey',
    paths: [
      { d: 'M4.25 11.5a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0' },
      { d: 'M3 21a3.75 3.75 0 0 1 7.5 0' },
      { d: 'M14.75 11.5a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0' },
      { d: 'M13.5 21a3.75 3.75 0 0 1 7.5 0' },
      { d: 'M6.75 5c1.65-1.8 3.6-1.8 5.25 0s3.6 1.8 5.25 0', accent: true },
    ],
  },
  'metric-bookings': {
    label: 'Bookings and inquiries',
    group: 'metrics',
    paths: [
      { d: 'M7.4 4.5h9.2a2.5 2.5 0 0 1 2.24 1.38L21 10.25v8.25a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5v-8.25l2.16-4.37A2.5 2.5 0 0 1 7.4 4.5z' },
      { d: 'M3 13h4.5l1.5 2.5h6l1.5-2.5H21' },
      { d: 'M7.5 8.75c1.41-1.54 3.09-1.54 4.5 0s3.09 1.54 4.5 0', accent: true },
    ],
  },
  'metric-cost-per-lead': {
    label: 'Cost per lead',
    group: 'metrics',
    paths: [
      { d: 'M3.5 6A2.5 2.5 0 0 1 6 3.5h5l8.5 8.5a2.5 2.5 0 0 1 0 3.54l-3.96 3.96a2.5 2.5 0 0 1-3.54 0L3.5 11z' },
      { d: 'M7.75 7.75h.01' },
      { d: 'M10.41 10.41C11.85 10.34 12.66 11.16 12.6 12.6C12.54 14.04 13.35 14.86 14.79 14.79', accent: true },
    ],
  },
  'metric-conversion': {
    label: 'Conversion rate',
    group: 'metrics',
    paths: [
      { d: 'M9.75 21v-5.25L3 9h18l-6.75 6.75V21' },
      { d: 'M6 4.9c1.88-1.65 4.12-1.65 6 0s4.12 1.65 6 0', accent: true },
    ],
  },
  'metric-search': {
    label: 'Search visibility',
    group: 'metrics',
    paths: [
      { d: 'M3 8.5l5-2 8 3 5-2v11l-5 2-8-3-5 2z' },
      { d: 'M8 6.5V9.46' },
      { d: 'M8 15.26V17.5' },
      { d: 'M16 9.5V11.74' },
      { d: 'M16 17.54V20.5' },
      { d: 'M3 13.5c2.83-1.54 6.17-1.54 9 0s6.17 1.54 9 0', accent: true },
    ],
  },
  'metric-engagement': {
    label: 'Engagement that turns into visits',
    group: 'metrics',
    paths: [
      { d: 'M21 12.5v-7A2.5 2.5 0 0 0 18.5 3h-13A2.5 2.5 0 0 0 3 5.5v13A2.5 2.5 0 0 0 5.5 21h7' },
      { d: 'M12.75 12.75L20.88 15.94L17.45 17.45L15.94 20.88z' },
      { d: 'M6.5 8.25c1.41-1.31 3.09-1.31 4.5 0s3.09 1.31 4.5 0', accent: true },
    ],
  },
  'arrow-right': {
    label: 'Arrow right',
    group: 'ui',
    paths: [
      { d: 'M4.5 12h15' },
      { d: 'M13 5.5l6.5 6.5-6.5 6.5' },
    ],
  },
  'arrow-up-right': {
    label: 'Arrow up right',
    group: 'ui',
    paths: [
      { d: 'M6 18L17.25 6.75' },
      { d: 'M8.25 6.75h9v9' },
    ],
  },
  'chevron-down': {
    label: 'Chevron down',
    group: 'ui',
    paths: [
      { d: 'M6 9l6 6 6-6' },
    ],
  },
  'chevron-right': {
    label: 'Chevron right',
    group: 'ui',
    paths: [
      { d: 'M9 6l6 6-6 6' },
    ],
  },
  'menu': {
    label: 'Menu',
    group: 'ui',
    paths: [
      { d: 'M4 6.75h16' },
      { d: 'M4 17.25h16' },
      { d: 'M4 12c2.51-2 5.49-2 8 0s5.49 2 8 0', accent: true },
    ],
  },
  'close': {
    label: 'Close',
    group: 'ui',
    paths: [
      { d: 'M6 6l12 12' },
      { d: 'M18 6L6 18' },
    ],
  },
  'check': {
    label: 'Check',
    group: 'ui',
    paths: [
      { d: 'M20 6.5L9.25 17.25 4 12' },
    ],
  },
  'check-circle': {
    label: 'Success',
    group: 'ui',
    paths: [
      { d: 'M5.64 18.36A9 9 0 1 1 18.36 18.36' },
      { d: 'M8.25 11.5l2.5 2.5 5-5' },
      { d: 'M8.25 19.25c1.18-1.29 2.57-1.29 3.75 0s2.57 1.29 3.75 0', accent: true },
    ],
  },
  'phone': {
    label: 'Phone',
    group: 'ui',
    paths: [
      { d: 'M5.75 3.75h2a2 2 0 0 1 2 2v2l-1.5 1.5A10 10 0 0 0 14.75 15.75l1.5-1.5h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2A14.5 14.5 0 0 1 3.75 5.75a2 2 0 0 1 2-2z' },
    ],
  },
  'mail': {
    label: 'Email',
    group: 'ui',
    paths: [
      { d: 'M6.25 5.25h11.5a2.5 2.5 0 0 1 2.5 2.5v8.5a2.5 2.5 0 0 1-2.5 2.5h-11.5a2.5 2.5 0 0 1-2.5-2.5v-8.5a2.5 2.5 0 0 1 2.5-2.5z' },
      { d: 'M3.75 8l7.25 4.9a1.8 1.8 0 0 0 2 0L20.25 8' },
    ],
  },
  'map-pin': {
    label: 'Location',
    group: 'ui',
    paths: [
      { d: 'M19 10c0 4.4-4.5 8.7-6.3 10.3a1 1 0 0 1-1.4 0C9.5 18.7 5 14.4 5 10a7 7 0 0 1 14 0z' },
      { d: 'M14.5 10a2.5 2.5 0 1 1-5 0a2.5 2.5 0 1 1 5 0z' },
    ],
  },
  'send': {
    label: 'Send',
    group: 'ui',
    paths: [
      { d: 'M20.5 3.5L3.5 9.5l7.5 3.5 3.5 7.5z' },
      { d: 'M20.5 3.5L11 13' },
    ],
  },
} satisfies Record<string, DivisionIconDefinition>;

export type DivisionIconName = keyof typeof icons;

export const DIVISION_ICONS: Readonly<Record<DivisionIconName, DivisionIconDefinition>> = icons;

/** Every icon name, in display order (services, phases, method, journey, metrics, ui). */
export const DIVISION_ICON_NAMES = Object.keys(icons) as DivisionIconName[];
