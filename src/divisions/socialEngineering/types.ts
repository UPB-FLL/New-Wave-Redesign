// Pure data types for the New Wave: Social Engineering division. Nothing in this
// folder's data modules may import React or touch the DOM: vite.config.ts imports
// them at build time to prerender each division page's <head>.

export type DivisionServiceIcon = 'mail' | 'phone' | 'building' | 'graduation';

export interface DivisionFaq {
  question: string;
  answer: string;
}

export interface DivisionPoint {
  title: string;
  detail: string;
}

export interface DivisionServiceContent {
  /** URL segment under /social-engineering, e.g. 'phishing-simulation'. */
  slug: string;
  /** Short label for navigation and cards, sentence case. */
  navLabel: string;
  /** Full <title>, including the " | New Wave: Social Engineering" suffix. */
  metaTitle: string;
  /** Meta description, 150–160 characters. */
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
  whatWeTest: DivisionPoint[];
  howItWorks: DivisionPoint[];
  deliverables: string[];
  /** Metric labels a program reports on. Labels only — never invented numbers. */
  metrics: string[];
  faqs: DivisionFaq[];
}

export interface DivisionHubContent {
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  kicker: string;
  /** The hub's H1 — the brand line. */
  headline: string;
  summary: string;
  problem: { heading: string; paragraphs: string[] };
  approach: DivisionPoint[];
  process: DivisionPoint[];
  metrics: DivisionPoint[];
  industries: DivisionPoint[];
  relationship: { heading: string; paragraphs: string[] };
  faqs: DivisionFaq[];
  cta: { heading: string; body: string };
}

/** Everything the prerenderer and the runtime meta hook need for one URL. */
export interface DivisionPageSeo {
  /** Absolute path, no trailing slash, e.g. '/social-engineering/phishing-simulation'. */
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
