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
