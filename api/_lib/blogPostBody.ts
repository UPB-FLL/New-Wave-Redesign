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
  // The columns are typed as strings but only `title`, `slug` and `content`
  // are NOT NULL in the table; a null elsewhere must not turn the post into a 503.
  const published = post.published_at ? new Date(post.published_at) : null;
  const date = published && !Number.isNaN(published.getTime()) ? published.toISOString().slice(0, 10) : '';
  const author = post.author ?? '';
  const category = post.category ?? '';
  const article = renderToStaticMarkup(createElement(ReactMarkdown, null, post.content ?? ''));
  return (
    `<main><article>` +
    `<nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/blog">Blog</a> / ${escapeHtmlText(post.title)}</nav>` +
    (category ? `<p>${escapeHtmlText(category)}</p>` : '') +
    `<h1>${escapeHtmlText(post.title)}</h1>` +
    (author || date ? `<p>${author ? `By ${escapeHtmlText(author)}` : ''}${author && date ? ' · ' : ''}${date ? `<time datetime="${date}">${date}</time>` : ''}</p>` : '') +
    (post.excerpt ? `<p>${escapeHtmlText(post.excerpt)}</p>` : '') +
    article +
    `</article></main>`
  );
}
