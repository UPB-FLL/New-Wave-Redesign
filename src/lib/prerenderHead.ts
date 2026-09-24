// Build-time <head> prerendering, shared by New Wave IT pages and divisions.
//
// The site is a client-rendered SPA: every URL is served the same index.html,
// whose static <head> describes the homepage. Crawlers that don't run
// JavaScript (link-preview bots, many AI crawlers), and Google's first,
// pre-render pass, would therefore read every page as a copy of the homepage,
// canonical included. applyPageHead() writes a page's own <title> and every
// tag headEntries() lists, the same list usePageMeta writes at runtime, into
// the built shell.
//
// Tags that decide which page this is (title, description, canonical,
// og:title/description/url) must exist exactly once, or the build throws rather
// than ship another page's identity. Everything else is upserted, so routine
// edits to index.html (reordered attributes, an extra tag, a dropped keywords
// tag) never break the build.

import { BREADCRUMBS_ELEMENT_ID, headEntries, resolvePageMeta, type PageMetaOptions, type ResolvedPageMeta } from './pageMeta.js';
import { breadcrumbListNode } from './structuredData.js';

export function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export const escapeHtmlText = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Keeps a JSON-LD payload from closing its own <script> element. */
export const escapeJsonForScript = (json: string) => json.replace(/</g, '\\u003c');

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The inside of a tag up to its closing '>': quoted attribute values are
 * consumed whole, so a '>' inside one (legal HTML) doesn't end the tag.
 */
const TAG_BODY = `(?:[^>"']|"[^"]*"|'[^']*')*`;

/** Lookahead requiring attribute `name` to equal `value`, in any position and either quote style. */
export const hasAttr = (name: string, value: string) =>
  `(?=${TAG_BODY}?\\s${name}\\s*=\\s*["']${escapeRegex(value)}["'])`;

export const metaTagPattern = (attr: 'name' | 'property', key: string) =>
  new RegExp(`<meta\\b${hasAttr(attr, key)}${TAG_BODY}>`, 'gi');

export const linkTagPattern = (rel: string, ...extra: [string, string][]) =>
  new RegExp(`<link\\b${hasAttr('rel', rel)}${extra.map(([n, v]) => hasAttr(n, v)).join('')}${TAG_BODY}>`, 'gi');

export interface HeadTag {
  label: string;
  pattern: RegExp;
  tag: string;
  /** Required tags identify the page; a missing one fails the build. */
  required: boolean;
}

export function upsertHeadTag(html: string, { label, pattern, tag, required }: HeadTag): string {
  const matches = html.match(pattern) ?? [];
  if (matches.length > 1) {
    throw new Error(
      `Prerender: found ${matches.length} ${label} tags in index.html; expected at most one. ` +
        'Update src/lib/prerenderHead.ts to match the new shell.',
    );
  }
  if (matches.length === 1) return html.replace(pattern, () => tag);
  if (required) {
    throw new Error(
      `Prerender: expected exactly one ${label} in index.html, found 0. ` +
        'Update src/lib/prerenderHead.ts to match the new shell.',
    );
  }
  return insertBeforeHeadClose(html, tag);
}

export function insertBeforeHeadClose(html: string, markup: string): string {
  if (!/<\/head>/i.test(html)) throw new Error('Prerender: index.html has no </head>.');
  return html.replace(/<\/head>/i, () => `  ${markup}\n  </head>`);
}

/** Tags whose absence means the raw HTML would describe some other page. */
const IDENTITY_TAGS = new Set(['description', 'og:title', 'og:description', 'og:url']);

const LABELS: Record<string, string> = { description: 'meta description', keywords: 'meta keywords' };

/** Writes the page's <title> and every headEntries() tag into the shell. */
export function applyPageHead(shell: string, meta: ResolvedPageMeta): string {
  const attr = escapeHtmlAttribute;
  let html = upsertHeadTag(shell, {
    label: '<title>',
    pattern: /<title\b[^>]*>[\s\S]*?<\/title>/gi,
    tag: `<title>${escapeHtmlText(meta.title)}</title>`,
    required: true,
  });
  for (const entry of headEntries(meta)) {
    html = upsertHeadTag(
      html,
      entry.kind === 'canonical'
        ? {
            label: 'canonical link',
            pattern: linkTagPattern('canonical'),
            tag: `<link rel="canonical" href="${attr(entry.href)}" />`,
            required: true,
          }
        : {
            label: LABELS[entry.key] ?? entry.key,
            pattern: metaTagPattern(entry.attr, entry.key),
            tag: `<meta ${entry.attr}="${entry.key}" content="${attr(entry.value)}" />`,
            required: IDENTITY_TAGS.has(entry.key),
          },
    );
  }
  return html;
}

/**
 * The prerendered HTML for one static page: the shell with that page's head,
 * plus its BreadcrumbList (the same block usePageMeta writes at runtime).
 */
export function renderRouteHtml(shell: string, path: string, meta: PageMetaOptions): string {
  const html = applyPageHead(shell, resolvePageMeta(meta, path));
  if (!meta.breadcrumbs?.length) return html;
  const json = escapeJsonForScript(JSON.stringify(breadcrumbListNode(meta.breadcrumbs)));
  return insertBeforeHeadClose(html, `<script type="application/ld+json" id="${BREADCRUMBS_ELEMENT_ID}">${json}</script>`);
}
