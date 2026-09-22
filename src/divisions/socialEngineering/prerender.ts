// Build-time <head> prerendering for division URLs. The page's own title,
// description, canonical, and Open Graph/Twitter tags come from the shared
// applyPageHead() (src/lib/prerenderHead.ts), fed the same options the runtime
// hook uses; this module adds what is division-specific: favicon and manifest,
// the division's JSON-LD in place of the parent's, preload links (page chunks
// and the self-hosted fonts in type.css), a non-render-blocking copy of the
// parent's Google Fonts stylesheet, and a no-JS fallback.

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

/**
 * The self-hosted files a division page paints its first screen with: the
 * display (H1) and text faces from type.css. The URLs must match type.css
 * exactly, or the preload is wasted and the font downloads twice. Plex Mono
 * (labels) loads on demand.
 */
export const DIVISION_CRITICAL_FONTS = [
  '/brand/social-engineering/fonts/plus-jakarta-sans-latin-var.woff2',
  '/brand/social-engineering/fonts/inter-latin-var.woff2',
] as const;

const GOOGLE_FONTS_HREF = /\shref\s*=\s*["']https:\/\/fonts\.googleapis\.com\//i;

/**
 * Division pages render in the self-hosted NWSE families, so they must not
 * wait on the parent shell's Google Fonts stylesheet. It still has to load,
 * because a client-side navigation to a New Wave IT page needs it, so it is
 * fetched as a print stylesheet (low priority, non-blocking) and switched to
 * all media once loaded. The CSP allows the inline handler (script-src
 * 'unsafe-inline') and the stylesheet (style-src fonts.googleapis.com). A
 * <noscript> copy of the original link covers browsers without JavaScript.
 * The font preloads go where the link was, early in the head.
 */
function deferGoogleFontsStylesheet(html: string): string {
  const links = (html.match(linkTagPattern('stylesheet')) ?? []).filter((tag) => GOOGLE_FONTS_HREF.test(tag));
  if (links.length !== 1) {
    throw new Error(
      `Prerender: expected exactly one Google Fonts stylesheet link in index.html, found ${links.length}. ` +
        'Update src/divisions/socialEngineering/prerender.ts to match the new shell.',
    );
  }
  const [link] = links;
  if (/\s(?:media|onload)\s*=/i.test(link)) {
    throw new Error(
      'Prerender: the Google Fonts stylesheet link in index.html already has a media or onload attribute. ' +
        'Update src/divisions/socialEngineering/prerender.ts to match the new shell.',
    );
  }
  const deferred = link.replace(/\s*\/?>$/, (end) => ` media="print" onload="this.media='all'"${end}`);
  const preloads = DIVISION_CRITICAL_FONTS.map(
    (href) => `<link rel="preload" as="font" type="font/woff2" crossorigin href="${href}" />`,
  );
  return html.replace(link, () => [...preloads, deferred, `<noscript>${link}</noscript>`].join('\n    '));
}

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
  html = deferGoogleFontsStylesheet(html);

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
