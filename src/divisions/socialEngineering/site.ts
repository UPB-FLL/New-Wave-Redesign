// Division-wide constants. Pure data — imported by vite.config.ts at build time.

export const SITE_URL = 'https://www.newwaveitfl.com';

/** Every division URL lives under this path on the parent domain. */
export const DIVISION_BASE_PATH = '/social-engineering';
export const DIVISION_CONTACT_PATH = `${DIVISION_BASE_PATH}/contact`;

/**
 * Service URL segments, in display order. Kept here (not derived from the copy
 * in content/) so the router can register routes without pulling page copy
 * into the main bundle; a test asserts it matches content/index.ts.
 */
export const DIVISION_SERVICE_SLUGS = [
  'phishing-simulation',
  'vishing-pretext-testing',
  'physical-social-engineering',
  'security-awareness-training',
] as const;

export const divisionServicePath = (slug: string) => `${DIVISION_BASE_PATH}/${slug}`;

export const isDivisionPath = (pathname: string) =>
  pathname === DIVISION_BASE_PATH || pathname.startsWith(`${DIVISION_BASE_PATH}/`);

/** First reference in any piece of copy — always with the colon. */
export const DIVISION_NAME = 'New Wave: Social Engineering';
/** Acceptable in running copy after the first reference. Never "NWSE". */
export const DIVISION_SHORT_NAME = 'NW Social Engineering';
export const DIVISION_ENDORSEMENT = 'A New Wave IT division';
export const PARENT_NAME = 'New Wave IT';

export const DIVISION_TAGLINE = 'Your people are the perimeter.';

/** Schema.org @id anchors. The parent ids match those declared in index.html. */
export const PARENT_ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const PARENT_WEBSITE_ID = `${SITE_URL}/#website`;
export const DIVISION_ORGANIZATION_ID = `${SITE_URL}${DIVISION_BASE_PATH}#organization`;

const ASSET_BASE = '/brand/social-engineering';

export const DIVISION_ASSETS = {
  logoPrimaryOnLight: `${ASSET_BASE}/logos/nwse-logo-primary_fullcolor-light.svg`,
  logoPrimaryOnDark: `${ASSET_BASE}/logos/nwse-logo-primary_fullcolor-dark.svg`,
  logoEndorsedOnLight: `${ASSET_BASE}/logos/nwse-logo-primary-endorsed_fullcolor-light.svg`,
  logoEndorsedOnDark: `${ASSET_BASE}/logos/nwse-logo-primary-endorsed_fullcolor-dark.svg`,
  logoInlineOnLight: `${ASSET_BASE}/logos/nwse-logo-inline_fullcolor-light.svg`,
  logoInlineOnDark: `${ASSET_BASE}/logos/nwse-logo-inline_fullcolor-dark.svg`,
  markOnLight: `${ASSET_BASE}/logos/nwse-mark_fullcolor-light.svg`,
  markOnDark: `${ASSET_BASE}/logos/nwse-mark_fullcolor-dark.svg`,
  /** Raster logo for schema.org Organization.logo (Google prefers raster). */
  logoPng: `${ASSET_BASE}/logos/nwse-logo-primary_fullcolor-light_1200w.png`,
  ogImage: `${ASSET_BASE}/og/og-image-1200x630.png`,
  faviconSvg: `${ASSET_BASE}/icons/favicon.svg`,
  faviconIco: `${ASSET_BASE}/icons/favicon.ico`,
  appleTouchIcon: `${ASSET_BASE}/icons/apple-touch-icon.png`,
  manifest: `${ASSET_BASE}/site.webmanifest`,
} as const;

/** Brand-guide minimum digital widths (px), page 05. */
export const DIVISION_LOGO_MIN_WIDTH = {
  primary: 160,
  endorsed: 220,
  inline: 200,
  mark: 24,
} as const;

export const absoluteUrl = (path: string) => `${SITE_URL}${path}`;
