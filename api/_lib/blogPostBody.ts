import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import type { BlogPost } from '../../types/blog.js';
import { escapeHtmlText } from '../../src/lib/prerenderHead.js';

/**
 * The post as plain HTML for the shell's root element: breadcrumb, title,
 * byline and the Markdown body, so a reader that never runs the bundle gets
 * the article. The app replaces it with BlogPostPage at startup.
 */
export function blogPostBodyHtml(post: BlogPost): string {
  const published = new Date(post.published_at);
  const date = Number.isNaN(published.getTime()) ? '' : published.toISOString().slice(0, 10);
  const article = renderToStaticMarkup(createElement(ReactMarkdown, null, post.content));
  return (
    `<main><article>` +
    `<nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/blog">Blog</a> / ${escapeHtmlText(post.title)}</nav>` +
    `<p>${escapeHtmlText(post.category)}</p>` +
    `<h1>${escapeHtmlText(post.title)}</h1>` +
    `<p>By ${escapeHtmlText(post.author)}${date ? ` · <time datetime="${date}">${date}</time>` : ''}</p>` +
    (post.excerpt ? `<p>${escapeHtmlText(post.excerpt)}</p>` : '') +
    article +
    `</article></main>`
  );
}
