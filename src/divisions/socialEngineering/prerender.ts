// Build-time <head> prerendering for division URLs. The page's own title,
// description, canonical, and Open Graph/Twitter tags come from the shared
// applyPageHead() (src/lib/prerenderHead.ts), fed the same options the runtime
// hook uses; this module adds what is division-specific: favicon and manifest,
// the division's JSON-LD in place of the parent's, preload links, and a no-JS
// fallback.

import { resolvePageMeta } from '../../lib/pageMeta';
import {
  applyPageHead,
  escapeHtmlAttribute,
  escapeHtmlText,
  escapeJsonForScript,
  hasAttr,
  insertBeforeHeadClose,
  linkTagPattern,
  upsertHeadTag,
} from '../../lib/prerenderHead';
import { allDivisionPages, divisionJsonLdDocument, divisionPageMetaOptions } from './seo';
import { DIVISION_ASSETS, DIVISION_ENDORSEMENT, DIVISION_NAME } from './site';
import type { DivisionPageSeo } from './types';

export { escapeHtmlAttribute, escapeJsonForScript };

/** Stable id so the runtime hook replaces, rather than duplicates, the prerendered block. */
export const DIVISION_JSONLD_ELEMENT_ID = 'division-jsonld';

const JSON_LD_BLOCK = new RegExp(
  `(?:<!--[^>]*structured data[^>]*-->\\s*)?<script\\b${hasAttr('type', 'application/ld+json')}[^>]*>[\\s\\S]*?</script>\\s*`,
  'gi',
);

export interface RenderOptions {
  /** Extra <head> markup, e.g. modulepreload links for the page's lazy chunks. */
  headExtras?: readonly string[];
}

export function renderDivisionPageHtml(shell: string, page: DivisionPageSeo, options: RenderOptions = {}): string {
  const attr = escapeHtmlAttribute;
  let html = applyPageHead(shell, resolvePageMeta(divisionPageMetaOptions(page), page.path));

  const icons = [
    { label: 'SVG favicon link', pattern: linkTagPattern('icon', ['type', 'image/svg+xml']), tag: `<link rel="icon" type="image/svg+xml" href="${DIVISION_ASSETS.faviconSvg}" />` },
    { label: 'ICO favicon link', pattern: linkTagPattern('icon', ['sizes', 'any']), tag: `<link rel="icon" href="${DIVISION_ASSETS.faviconIco}" sizes="any" />` },
    { label: 'apple-touch-icon link', pattern: linkTagPattern('apple-touch-icon'), tag: `<link rel="apple-touch-icon" href="${DIVISION_ASSETS.appleTouchIcon}" />` },
    { label: 'manifest link', pattern: linkTagPattern('manifest'), tag: `<link rel="manifest" href="${DIVISION_ASSETS.manifest}" />` },
  ];
  for (const icon of icons) html = upsertHeadTag(html, { ...icon, required: false });

  // Every shell JSON-LD block describes the parent; division pages carry their
  // own graph instead, which links back to the parent by @id.
  html = html.replace(JSON_LD_BLOCK, '');
  html = insertBeforeHeadClose(
    html,
    `<!-- ${DIVISION_NAME} structured data (links to the parent by @id) -->\n    ` +
      `<script type="application/ld+json" id="${DIVISION_JSONLD_ELEMENT_ID}">${escapeJsonForScript(divisionJsonLdDocument(page))}</script>`,
  );
  for (const extra of options.headExtras ?? []) html = insertBeforeHeadClose(html, extra);

  // Readable fallback for crawlers that never execute the app bundle, with
  // plain links to every other division page.
  const crumbs = page.breadcrumbs
    .map((crumb) => `<a href="${attr(crumb.path)}">${escapeHtmlText(crumb.name)}</a>`)
    .join(' / ');
  const links = allDivisionPages()
    .filter((other) => other.path !== page.path)
    .map((other) => `<li><a href="${attr(other.path)}">${escapeHtmlText(other.breadcrumbs.slice(-1)[0]?.name ?? other.h1)}</a></li>`)
    .join('');
  const fallback =
    `<noscript><main><p><a href="/">New Wave IT</a> / ${crumbs}</p>` +
    `<h1>${escapeHtmlText(page.h1)}</h1><p>${escapeHtmlText(page.description)}</p>` +
    `<nav aria-label="${attr(DIVISION_NAME)}"><ul>${links}</ul></nav>` +
    `<p>${escapeHtmlText(`${DIVISION_NAME} — ${DIVISION_ENDORSEMENT}.`)}</p></main></noscript>`;

  return upsertHeadTag(html, {
    label: 'root element',
    pattern: /<div id="root"><\/div>/g,
    tag: `<div id="root"></div>${fallback}`,
    required: true,
  });
}
