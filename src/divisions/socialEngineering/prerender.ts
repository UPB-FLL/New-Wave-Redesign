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
// Tags that decide which page this is (title, description, canonical,
// og:title/description/url) must exist exactly once, or the build throws rather
// than ship IT identity on a division URL. Everything else is upserted, so
// routine edits to index.html (reordered attributes, an extra JSON-LD block, a
// dropped keywords tag) never break the New Wave IT build.

import { allDivisionPages, divisionJsonLdDocument } from './seo';
import { DIVISION_ASSETS, DIVISION_ENDORSEMENT, DIVISION_NAME, absoluteUrl } from './site';
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

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Lookahead requiring attribute `name` to equal `value`, in any position and either quote style. */
const hasAttr = (name: string, value: string) =>
  `(?=[^>]*\\s${name}\\s*=\\s*["']${escapeRegex(value)}["'])`;

const metaTag = (attr: 'name' | 'property', key: string) => new RegExp(`<meta\\b${hasAttr(attr, key)}[^>]*>`, 'gi');
const linkTag = (rel: string, ...extra: [string, string][]) =>
  new RegExp(`<link\\b${hasAttr('rel', rel)}${extra.map(([n, v]) => hasAttr(n, v)).join('')}[^>]*>`, 'gi');

interface HeadTag {
  label: string;
  pattern: RegExp;
  tag: string;
  /** Required tags identify the page; a missing one fails the build. */
  required: boolean;
}

function upsertTag(html: string, { label, pattern, tag, required }: HeadTag): string {
  const matches = html.match(pattern) ?? [];
  if (matches.length > 1) {
    throw new Error(
      `Division prerender: found ${matches.length} ${label} tags in index.html; expected at most one. ` +
        'Update src/divisions/socialEngineering/prerender.ts to match the new shell.',
    );
  }
  if (matches.length === 1) return html.replace(pattern, () => tag);
  if (required) {
    throw new Error(
      `Division prerender: expected exactly one ${label} in index.html, found 0. ` +
        'Update src/divisions/socialEngineering/prerender.ts to match the new shell.',
    );
  }
  return insertBeforeHeadClose(html, tag);
}

function insertBeforeHeadClose(html: string, markup: string): string {
  if (!/<\/head>/i.test(html)) throw new Error('Division prerender: index.html has no </head>.');
  return html.replace(/<\/head>/i, () => `  ${markup}\n  </head>`);
}

const JSON_LD_BLOCK = new RegExp(
  `(?:<!--[^>]*structured data[^>]*-->\\s*)?<script\\b${hasAttr('type', 'application/ld+json')}[^>]*>[\\s\\S]*?</script>\\s*`,
  'gi',
);

export interface RenderOptions {
  /** Extra <head> markup, e.g. modulepreload links for the page's lazy chunks. */
  headExtras?: readonly string[];
}

export function renderDivisionPageHtml(shell: string, page: DivisionPageSeo, options: RenderOptions = {}): string {
  const url = absoluteUrl(page.path);
  const ogImage = absoluteUrl(DIVISION_ASSETS.ogImage);
  const attr = escapeHtmlAttribute;

  const tags: HeadTag[] = [
    { label: '<title>', pattern: /<title\b[^>]*>[\s\S]*?<\/title>/gi, tag: `<title>${escapeHtmlText(page.title)}</title>`, required: true },
    { label: 'meta description', pattern: metaTag('name', 'description'), tag: `<meta name="description" content="${attr(page.description)}" />`, required: true },
    { label: 'canonical link', pattern: linkTag('canonical'), tag: `<link rel="canonical" href="${attr(url)}" />`, required: true },
    { label: 'og:title', pattern: metaTag('property', 'og:title'), tag: `<meta property="og:title" content="${attr(page.title)}" />`, required: true },
    { label: 'og:description', pattern: metaTag('property', 'og:description'), tag: `<meta property="og:description" content="${attr(page.description)}" />`, required: true },
    { label: 'og:url', pattern: metaTag('property', 'og:url'), tag: `<meta property="og:url" content="${attr(url)}" />`, required: true },
    { label: 'meta keywords', pattern: metaTag('name', 'keywords'), tag: `<meta name="keywords" content="${attr(page.keywords)}" />`, required: false },
    { label: 'og:site_name', pattern: metaTag('property', 'og:site_name'), tag: `<meta property="og:site_name" content="${attr(DIVISION_NAME)}" />`, required: false },
    { label: 'og:image', pattern: metaTag('property', 'og:image'), tag: `<meta property="og:image" content="${attr(ogImage)}" />`, required: false },
    { label: 'twitter:title', pattern: metaTag('name', 'twitter:title'), tag: `<meta name="twitter:title" content="${attr(page.title)}" />`, required: false },
    { label: 'twitter:description', pattern: metaTag('name', 'twitter:description'), tag: `<meta name="twitter:description" content="${attr(page.description)}" />`, required: false },
    { label: 'twitter:image', pattern: metaTag('name', 'twitter:image'), tag: `<meta name="twitter:image" content="${attr(ogImage)}" />`, required: false },
    { label: 'SVG favicon link', pattern: linkTag('icon', ['type', 'image/svg+xml']), tag: `<link rel="icon" type="image/svg+xml" href="${DIVISION_ASSETS.faviconSvg}" />`, required: false },
    { label: 'ICO favicon link', pattern: linkTag('icon', ['sizes', 'any']), tag: `<link rel="icon" href="${DIVISION_ASSETS.faviconIco}" sizes="any" />`, required: false },
    { label: 'apple-touch-icon link', pattern: linkTag('apple-touch-icon'), tag: `<link rel="apple-touch-icon" href="${DIVISION_ASSETS.appleTouchIcon}" />`, required: false },
    { label: 'manifest link', pattern: linkTag('manifest'), tag: `<link rel="manifest" href="${DIVISION_ASSETS.manifest}" />`, required: false },
  ];

  let html = shell;
  for (const tag of tags) html = upsertTag(html, tag);

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

  return upsertTag(html, {
    label: 'root element',
    pattern: /<div id="root"><\/div>/g,
    tag: `<div id="root"></div>${fallback}`,
    required: true,
  });
}
