// Pure data types for the New Wave: Social Engineering division. Nothing in this
// folder's data modules may import React or touch the DOM: vite.config.ts imports
// them at build time to prerender each division page's <head>.

import type { DivisionIconName } from './icons/iconData';

export type DivisionServiceIcon = 'social' | 'brand' | 'web' | 'marketing' | 'integration' | 'oversight';

/**
 * The three things the division is built on. Every service serves one of them
 * first; the hub explains all three, and each service page shows where it fits.
 */
export type DivisionPillarKey = 'data' | 'integrations' | 'advertising';

export interface DivisionFaq {
  question: string;
  answer: string;
}

export interface DivisionPoint {
  title: string;
  detail: string;
  /** Optional icon from the division set (icons/iconData.ts). */
  icon?: DivisionIconName;
}

/** One pillar on the hub: what it is, and the work that belongs to it. */
export interface DivisionPillar {
  key: DivisionPillarKey;
  title: string;
  icon: DivisionIconName;
  /** One sentence: the promise. */
  summary: string;
  /** The work inside the pillar, as short labels. */
  items: string[];
}

/** A label and value in a service page's "At a glance" strip ("Best for", "Measured by", …). */
export interface DivisionGlance {
  label: string;
  value: string;
}

export interface DivisionServiceContent {
  /** URL segment under /social-engineering, e.g. 'social-media'. */
  slug: string;
  /** Short label for navigation and cards, sentence case. */
  navLabel: string;
  /** Full <title>, including the " | New Wave: Social Engineering" suffix. */
  metaTitle: string;
  /** Meta description, 140–160 characters. */
  metaDescription: string;
  /** Comma-separated keywords for meta[name="keywords"]. */
  keywords: string;
  /** schema.org Service.serviceType. */
  serviceType: string;
  icon: DivisionServiceIcon;
  /** IBM Plex Mono kicker above the H1 (rendered uppercase). */
  kicker: string;
  /** The page's single H1, sentence case. */
  headline: string;
  /** Hero paragraph under the H1. */
  summary: string;
  /** One or two sentences for the hub's service card. */
  cardSummary: string;
  /** The pillar the service serves first (highlighted in the page's pillar strip). */
  pillar: DivisionPillarKey;
  /** The "At a glance" strip under the hero: four label/value pairs, no numbers. */
  glance: DivisionGlance[];
  /** What changes for the business: three plain statements, no invented figures. */
  outcomes: string[];
  /** What the service includes ("What's included"). */
  scope: DivisionPoint[];
  /** How the engagement runs for this service. */
  process: DivisionPoint[];
  deliverables: string[];
  /** Metric labels the work is measured and reported against. Labels only — never invented numbers. */
  metrics: string[];
  faqs: DivisionFaq[];
  /** Overrides the "What's included" section heading. */
  scopeHeading?: string;
  /** Overrides the closing call-to-action heading. */
  ctaHeading?: string;
  /**
   * The hero scene's column from lg (DivisionHero `sceneSize`; default
   * 'large'). 'compact' for a headline that would run four lines beside the
   * full-size scene.
   */
  heroSceneSize?: 'large' | 'compact';
}

export interface DivisionRoadmapPhase {
  /** A meaningful time range, e.g. 'Days 1–30'. */
  phase: string;
  title: string;
  items: string[];
  /** Optional icon from the division set (icons/iconData.ts). */
  icon?: DivisionIconName;
}

export interface DivisionHubContent {
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  /** Topic line rendered as the first line of the H1 (carries the page's primary keyword). */
  kicker: string;
  /** The brand line, rendered large as the rest of the H1. */
  headline: string;
  summary: string;
  /** The opportunity: why a small business needs one connected growth system. */
  intro: { heading: string; paragraphs: string[] };
  /** The three pillars: data, integrations, smart advertising (in that order). */
  pillars: DivisionPillar[];
  /** How we work: Audit → Plan → Build and run. */
  method: DivisionPoint[];
  /** The data gathered in discovery. */
  dataWeGather: DivisionPoint[];
  /** Customer-journey stages the work is mapped against, in order (short labels). */
  journey: string[];
  /** The first 90 days, in three phases. */
  roadmap: DivisionRoadmapPhase[];
  /** The working rhythm after launch: weekly, monthly, quarterly. */
  cadence: DivisionPoint[];
  /** Who we work with: kinds of business, as short labels, and the line under them. */
  industries: { heading: string; intro: string; items: string[]; note: string };
  /** What the work is measured against. Labels + one-line explanation; no numbers. */
  metrics: DivisionPoint[];
  relationship: { heading: string; paragraphs: string[] };
  faqs: DivisionFaq[];
  cta: { heading: string; body: string };
}

/**
 * One business on the Customers page. It says what the business is, in its
 * own terms (category, location, and description from its own site), and
 * never what the division did for it: no services, results, ratings, or quotes.
 */
export interface DivisionCustomer {
  name: string;
  /** Plex Mono label: the kind of business. */
  category: string;
  location: string;
  description: string;
  /** Visible link text: the bare domain, never "see the work". */
  linkLabel: string;
  /** An absolute https:// URL opens in a new tab; a same-site path (New Wave IT: '/') stays in the app. */
  href: string;
}

/** An app in the Customers page's "Apps we've developed" section. */
export interface DivisionApp {
  name: string;
  /** Plex Mono label: the kind of software. */
  category: string;
  /** Where it runs, as the app's own site lists it. */
  platforms: string;
  description: string;
  /** Visible link text: the bare domain. */
  linkLabel: string;
  /** The app's own site (absolute https://; opens in a new tab). */
  href: string;
}

/** Everything the prerenderer and the runtime meta hook need for one URL. */
export interface DivisionPageSeo {
  brand?: 'groundswell';
  ogImage?: string;
  /** Absolute path, no trailing slash, e.g. '/social-engineering/social-media'. */
  path: string;
  title: string;
  description: string;
  keywords: string;
  /** The page's H1 text, reused in the prerendered <noscript> fallback. */
  h1: string;
  /** Breadcrumb trail after "New Wave IT" home, ending with this page. */
  breadcrumbs: { name: string; path: string }[];
  /** schema.org nodes for this page (the prerenderer wraps them in an @graph). */
  jsonLd: Record<string, unknown>[];
}
