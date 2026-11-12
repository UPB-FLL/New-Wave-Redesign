import { blogPostPageMeta, type BlogPostState } from '../../src/lib/blogSeo.js';
import { resolvePageMeta } from '../../src/lib/pageMeta.js';
import { applyPageHead, injectRootBody, insertBeforeHeadClose, pageJsonLdScript } from '../../src/lib/prerenderHead.js';
import { blogPostBodyHtml } from './blogPostBody.js';

/**
 * The SPA shell for /blog/:slug with the head BlogPostPage writes at runtime:
 * the post's title, description, canonical, Open Graph tags, and its JSON-LD
 * (BlogPosting, BreadcrumbList, FAQPage) in a #page-jsonld block that
 * usePageMeta takes over, and the article itself in the root element. Posts
 * are data, so unlike the static pages this can't happen at build time;
 * without it the raw HTML declared the homepage canonical and JavaScript
 * changed it, which Google advises against.
 */
export function blogPageHtml(shell: string, slug: string, state: BlogPostState): string {
  const options = blogPostPageMeta(slug, state);
  let html = applyPageHead(shell, resolvePageMeta(options, `/blog/${slug}`));
  if (state.status === 'ready') html = injectRootBody(html, `/blog/${slug}`, blogPostBodyHtml(state.post));
  if (!options.jsonLd) return html;
  // The same block the static prerender writes for its pages (renderRouteHtml).
  return insertBeforeHeadClose(html, pageJsonLdScript(options.jsonLd));
}
