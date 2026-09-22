// Build-time <head> prerendering for division URLs.
//
// The site is a client-rendered SPA: every URL is served the same index.html,
// whose static <head> describes the New Wave IT homepage. Crawlers that do not
// run JavaScript (link-preview bots, many AI crawlers) — and Google's first,
// pre-render pass — would therefore see division pages as copies of the IT
// homepage, canonical and all. This module rewrites the shell's head for each
// division URL so the raw HTML already carries the right title, description,
// canonical, Open Graph tags, icons, and structured data.
//
// It fails loudly: if index.html changes shape and a tag can no longer be
// found exactly once, the build throws instead of shipping IT metadata on a
// division page.

import { divisionJsonLdDocument } from './seo';
import { DIVISION_ASSETS, DIVISION_NAME, DIVISION_ENDORSEMENT, absoluteUrl } from './site';
import type { DivisionPageSeo } from './types';

/** Stable id so the runtime hook replaces, rather than duplicates, the prerendered block. */
export const DIVISION_JSONLD_ELEMENT_ID = 'division-jsonld';

export function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const escapeHtmlText = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Keeps a JSON-LD payload from closing its own <script> element. */
export const escapeJsonForScript = (json: string) => json.replace(/</g, '\\u003c');

function replaceExactlyOnce(html: string, pattern: RegExp, replacement: string, label: string): string {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const matches = html.match(new RegExp(pattern.source, flags)) ?? [];
  if (matches.length !== 1) {
    throw new Error(
      `Division prerender: expected exactly one ${label} in index.html, found ${matches.length}. ` +
        'Update src/divisions/socialEngineering/prerender.ts to match the new shell.',
    );
  }
  return html.replace(pattern, () => replacement);
}

const metaByName = (name: string) => new RegExp(`<meta\\s+name="${name}"\\s+content="[^"]*"\\s*/?>`);
const metaByProperty = (property: string) =>
  new RegExp(`<meta\\s+property="${property}"\\s+content="[^"]*"\\s*/?>`);

export function renderDivisionPageHtml(shell: string, page: DivisionPageSeo): string {
  const url = absoluteUrl(page.path);
  const ogImage = absoluteUrl(DIVISION_ASSETS.ogImage);
  const attr = escapeHtmlAttribute;

  const replacements: [RegExp, string, string][] = [
    [/<title>[\s\S]*?<\/title>/, `<title>${escapeHtmlText(page.title)}</title>`, '<title>'],
    [metaByName('description'), `<meta name="description" content="${attr(page.description)}" />`, 'meta description'],
    [metaByName('keywords'), `<meta name="keywords" content="${attr(page.keywords)}" />`, 'meta keywords'],
    [metaByProperty('og:site_name'), `<meta property="og:site_name" content="${attr(DIVISION_NAME)}" />`, 'og:site_name'],
    [metaByProperty('og:title'), `<meta property="og:title" content="${attr(page.title)}" />`, 'og:title'],
    [metaByProperty('og:description'), `<meta property="og:description" content="${attr(page.description)}" />`, 'og:description'],
    [metaByProperty('og:url'), `<meta property="og:url" content="${attr(url)}" />`, 'og:url'],
    [metaByProperty('og:image'), `<meta property="og:image" content="${attr(ogImage)}" />`, 'og:image'],
    [metaByName('twitter:title'), `<meta name="twitter:title" content="${attr(page.title)}" />`, 'twitter:title'],
    [metaByName('twitter:description'), `<meta name="twitter:description" content="${attr(page.description)}" />`, 'twitter:description'],
    [metaByName('twitter:image'), `<meta name="twitter:image" content="${attr(ogImage)}" />`, 'twitter:image'],
    [/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${attr(url)}" />`, 'canonical link'],
    [
      /<link\s+rel="icon"\s+type="image\/svg\+xml"\s+href="[^"]*"\s*\/?>/,
      `<link rel="icon" type="image/svg+xml" href="${DIVISION_ASSETS.faviconSvg}" />`,
      'SVG favicon link',
    ],
    [
      /<link\s+rel="icon"\s+href="[^"]*"\s+sizes="any"\s*\/?>/,
      `<link rel="icon" href="${DIVISION_ASSETS.faviconIco}" sizes="any" />`,
      'ICO favicon link',
    ],
    [
      /<link\s+rel="apple-touch-icon"\s+href="[^"]*"\s*\/?>/,
      `<link rel="apple-touch-icon" href="${DIVISION_ASSETS.appleTouchIcon}" />`,
      'apple-touch-icon link',
    ],
    [/<link\s+rel="manifest"\s+href="[^"]*"\s*\/?>/, `<link rel="manifest" href="${DIVISION_ASSETS.manifest}" />`, 'manifest link'],
    // The shell's LocalBusiness/Organization block describes the parent. Division
    // pages carry their own graph, which links back to the parent by @id.
    [
      /(?:<!--[^>]*structured data[^>]*-->\s*)?<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/,
      `<!-- ${DIVISION_NAME} structured data (links to the parent by @id) -->\n    ` +
        `<script type="application/ld+json" id="${DIVISION_JSONLD_ELEMENT_ID}">${escapeJsonForScript(divisionJsonLdDocument(page))}</script>`,
      'JSON-LD script',
    ],
  ];

  let html = shell;
  for (const [pattern, replacement, label] of replacements) {
    html = replaceExactlyOnce(html, pattern, replacement, label);
  }

  // Readable fallback for crawlers that never execute the app bundle.
  const crumbs = page.breadcrumbs
    .map((crumb) => `<a href="${attr(crumb.path)}">${escapeHtmlText(crumb.name)}</a>`)
    .join(' / ');
  const fallback =
    `<noscript><main><p><a href="/">New Wave IT</a> / ${crumbs}</p>` +
    `<h1>${escapeHtmlText(page.h1)}</h1><p>${escapeHtmlText(page.description)}</p>` +
    `<p>${escapeHtmlText(`${DIVISION_NAME} — ${DIVISION_ENDORSEMENT}.`)}</p></main></noscript>`;

  return replaceExactlyOnce(html, /<div id="root"><\/div>/, `<div id="root"></div>${fallback}`, 'root element');
}
