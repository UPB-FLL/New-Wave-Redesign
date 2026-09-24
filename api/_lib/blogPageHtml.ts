import { blogPostPageMeta, type BlogPostState } from '../../src/lib/blogSeo.js';
import { PAGE_JSONLD_ELEMENT_ID, resolvePageMeta } from '../../src/lib/pageMeta.js';
import { applyPageHead, escapeJsonForScript, insertBeforeHeadClose } from '../../src/lib/prerenderHead.js';

/**
 * The SPA shell for /blog/:slug with the head BlogPostPage writes at runtime:
 * the post's title, description, canonical, Open Graph tags, and its JSON-LD
 * (BlogPosting, BreadcrumbList, FAQPage) in a #page-jsonld block that
 * usePageMeta takes over. Posts are data, so unlike the static pages this
 * can't happen at build time; without it the raw HTML declared the homepage
 * canonical and JavaScript changed it, which Google advises against.
 */
export function blogPageHtml(shell: string, slug: string, state: BlogPostState): string {
  const options = blogPostPageMeta(slug, state);
  const html = applyPageHead(shell, resolvePageMeta(options, `/blog/${slug}`));
  if (!options.jsonLd) return html;
  // Serialised as usePageMeta's injectJsonLd does, so both copies read the same.
  const json = escapeJsonForScript(JSON.stringify(Array.isArray(options.jsonLd) ? options.jsonLd : [options.jsonLd]));
  return insertBeforeHeadClose(html, `<script type="application/ld+json" id="${PAGE_JSONLD_ELEMENT_ID}">${json}</script>`);
}
