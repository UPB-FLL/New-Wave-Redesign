import { describe, expect, it } from 'vitest';
import type { BlogPost } from '../../types/blog';
import { blogPostJsonLd, faqsFromMarkdown, wordCount } from './blogSeo';

const content = `Managed backup keeps work moving.

## What managed backup covers

Plain text with a [link](/contact).

## Frequently asked questions

### How often should backups run?

Every night, with a [tested restore](/contact) each month.

### Do I need Microsoft 365 backup?

Yes. Retention is not a backup.

## Protect your data

Talk to us.
`;

const post = {
  id: 'p1',
  title: 'Managed Backup for Fort Lauderdale Businesses',
  slug: 'managed-backup',
  excerpt: null,
  content,
  featured_image: null,
  category: 'Backup & Disaster Recovery',
  tags: [],
  meta_title: null,
  meta_description: 'd',
  published_at: '2026-09-27T02:00:00Z',
  created_at: '2026-09-27T02:00:00Z',
  updated_at: '2026-09-27T02:00:00Z',
  author: 'New Wave IT Team',
} satisfies BlogPost;

describe('blog post structured data', () => {
  it('reads the FAQ section as question/answer pairs, without Markdown', () => {
    expect(faqsFromMarkdown(content)).toEqual([
      { question: 'How often should backups run?', answer: 'Every night, with a tested restore each month.' },
      { question: 'Do I need Microsoft 365 backup?', answer: 'Yes. Retention is not a backup.' },
    ]);
    expect(faqsFromMarkdown('No FAQ here.')).toEqual([]);
  });

  it('adds wordCount to BlogPosting and an FAQPage node when the post has FAQs', () => {
    const nodes = blogPostJsonLd(post) as Record<string, unknown>[];
    const article = nodes.find((node) => node['@type'] === 'BlogPosting');
    expect(article?.wordCount).toBe(wordCount(content));
    expect(wordCount(content)).toBeGreaterThan(30);
    const faq = nodes.find((node) => node['@type'] === 'FAQPage') as { mainEntity: { name: string }[] } | undefined;
    expect(faq?.mainEntity.map((q) => q.name)).toEqual(['How often should backups run?', 'Do I need Microsoft 365 backup?']);
    expect(blogPostJsonLd({ ...post, content: 'Short post.' }).some((node) => (node as { '@type': string })['@type'] === 'FAQPage')).toBe(false);
  });
});
