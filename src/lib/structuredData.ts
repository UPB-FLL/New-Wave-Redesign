// schema.org builders shared by New Wave IT pages. Pure data, no React or DOM:
// vite.config.ts imports it (through prerenderHead.ts) at build time.

import { SITE_NAME, SITE_URL, type Crumb } from './pageMeta.js';

export type { Crumb };

/** @id anchors declared by the index.html shell. Every page links to them rather than redeclaring the company. */
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const BUSINESS_ID = `${SITE_URL}/#business`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

const absolute = (path: string) => (path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`);

/** A BreadcrumbList from Home to the page. `crumbs` excludes Home. */
export function breadcrumbListNode(crumbs: readonly Crumb[]): Record<string, unknown> {
  const trail = [{ name: SITE_NAME, path: '/' }, ...crumbs];
  const last = trail[trail.length - 1];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${absolute(last.path)}#breadcrumb`,
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absolute(crumb.path),
    })),
  };
}

/** One question and its answer, as the page shows them. */
export type FaqItem = { question: string; answer: string };

/**
 * A FAQPage for the questions a page shows. The names and texts are the
 * visible strings: pass the list the page renders, never a reworded copy.
 * A page without questions passes no node at all.
 */
export function faqPageNode(items: readonly FaqItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}
