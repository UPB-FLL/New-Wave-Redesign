// Pure data types for the New Wave: Social Engineering division. Nothing in this
// folder's data modules may import React or touch the DOM: vite.config.ts imports
// them at build time to prerender each division page's <head>.

import type { DivisionIconName } from './icons/iconData';

export type DivisionServiceIcon = 'social' | 'brand' | 'web' | 'marketing' | 'integration' | 'oversight';

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
}

export interface DivisionRoadmapPhase {
  /** e.g. 'Phase 01' */
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
  /** The opportunity: why a business's digital presence needs one owner. */
  intro: { heading: string; paragraphs: string[] };
  /** How we work: Discover → Prioritize → Build. */
  method: DivisionPoint[];
  /** The data gathered in discovery. */
  dataWeGather: DivisionPoint[];
  /** Customer-journey stages the work is mapped against, in order (short labels). */
  journey: string[];
  roadmap: DivisionRoadmapPhase[];
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

/** Everything the prerenderer and the runtime meta hook need for one URL. */
export interface DivisionPageSeo {
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
