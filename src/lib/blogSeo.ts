// Head metadata and schema.org nodes for a blog post (/blog/:slug). Pure data.

import type { BlogPost } from '../../types/blog';
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, type PageMetaOptions } from './pageMeta.js';
import { breadcrumbListNode, ORGANIZATION_ID, WEBSITE_ID } from './structuredData.js';

export const blogPostUrl = (slug: string) => `${SITE_URL}/blog/${slug}`;

/** The post's author: the company when the byline is New Wave IT's own (the database default), otherwise a person. */
function authorNode(author: string) {
  return author.includes(SITE_NAME)
    ? { '@type': 'Organization', '@id': ORGANIZATION_ID, name: SITE_NAME, url: SITE_URL }
    : { '@type': 'Person', name: author };
}

const plainText = (markdown: string) => markdown.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`>#]/g, '').replace(/\s+/g, ' ').trim();

/** Words as a reader sees them (link targets and Markdown markers excluded). */
export function wordCount(markdown: string): number {
  return plainText(markdown).split(' ').filter((word) => /[A-Za-z0-9]/.test(word)).length;
}

/**
 * The question/answer pairs under a post's "Frequently asked questions" H2
 * (the section api/blog/generate-post.ts writes: "### Question" then the answer).
 */
export function faqsFromMarkdown(markdown: string): { question: string; answer: string }[] {
  const section = markdown.match(/^##\s+Frequently asked questions\s*$([\s\S]*?)(?=^##\s|(?![\s\S]))/im)?.[1];
  if (!section) return [];
  return section
    .split(/^###\s+/m)
    .slice(1)
    .map((block) => {
      const [question, ...answer] = block.split('\n');
      return { question: plainText(question), answer: plainText(answer.join('\n')) };
    })
    .filter((faq) => faq.question && faq.answer);
}

export function blogPostJsonLd(post: BlogPost): object[] {
  const url = blogPostUrl(post.slug);
  const description = post.meta_description || post.excerpt || undefined;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      '@id': `${url}#article`,
      headline: post.title,
      ...(description ? { description } : {}),
      image: post.featured_image || DEFAULT_OG_IMAGE,
      datePublished: post.published_at,
      dateModified: post.updated_at || post.published_at,
      author: authorNode(post.author || `${SITE_NAME} Team`),
      publisher: { '@id': ORGANIZATION_ID },
      isPartOf: { '@id': WEBSITE_ID },
      mainEntityOfPage: url,
      url,
      inLanguage: 'en-US',
      ...(post.category ? { articleSection: post.category } : {}),
      ...(post.tags?.length ? { keywords: post.tags.join(', ') } : {}),
      wordCount: wordCount(post.content ?? ''),
    },
    breadcrumbListNode([
      { name: 'Blog', path: '/blog' },
      { name: post.title, path: `/blog/${post.slug}` },
    ]),
    ...faqNode(url, faqsFromMarkdown(post.content ?? '')),
  ];
}

function faqNode(url: string, faqs: { question: string; answer: string }[]): object[] {
  if (!faqs.length) return [];
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    },
  ];
}

export type BlogPostState = { status: 'loading' } | { status: 'missing' } | { status: 'ready'; post: BlogPost };

/**
 * usePageMeta options for every state of the post page. A slug with no post
 * is marked noindex, so a dead or mistyped link never gets indexed as a page.
 */
export function blogPostPageMeta(slug: string, state: BlogPostState): PageMetaOptions {
  const canonical = blogPostUrl(slug);
  if (state.status === 'ready') {
    const { post } = state;
    return {
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt || undefined,
      canonical,
      ogImage: post.featured_image || undefined,
      ogType: 'article',
      keywords: post.tags?.length ? post.tags.join(', ') : undefined,
      jsonLd: blogPostJsonLd(post),
    };
  }
  if (state.status === 'missing') return { title: 'Blog post not found', canonical, noindex: true };
  return { title: 'IT Support Blog', canonical };
}
