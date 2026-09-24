import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BlogPost } from '../../types/blog';
import { fetchBlogPostBySlug } from '../lib/blog';
import BlogPostPage from './BlogPostPage';

vi.mock('../lib/blog', () => ({
  fetchBlogPostBySlug: vi.fn(),
  fetchBlogPosts: vi.fn(async () => ({ posts: [], total: 0 })),
  estimateReadTime: () => 3,
}));
vi.mock('../components/Footer', () => ({ default: () => null }));

const post: BlogPost = {
  id: 'p1',
  title: 'Choosing a managed IT provider in Fort Lauderdale',
  slug: 'choosing-a-managed-it-provider',
  excerpt: 'What to ask before you sign.',
  content: 'Body **text**.',
  featured_image: 'https://images.example.com/cover.jpg',
  category: 'Managed IT',
  tags: ['msp', 'fort lauderdale'],
  meta_title: null,
  meta_description: 'Questions to ask a Fort Lauderdale MSP before you sign.',
  published_at: '2026-09-01T12:00:00Z',
  created_at: '2026-09-01T12:00:00Z',
  updated_at: '2026-09-03T12:00:00Z',
  author: 'New Wave IT Team',
};

const renderAt = (slug: string) =>
  render(
    <MemoryRouter initialEntries={[`/blog/${slug}`]}>
      <Routes>
        <Route path="/blog/:slug" element={<BlogPostPage />} />
      </Routes>
    </MemoryRouter>,
  );

const robots = () => document.head.querySelector('meta[name="robots"]')?.getAttribute('content');
const jsonLd = () =>
  [...document.head.querySelectorAll('script[type="application/ld+json"]')].flatMap((s) => JSON.parse(s.textContent ?? '[]'));

afterEach(() => {
  vi.mocked(fetchBlogPostBySlug).mockReset();
  vi.restoreAllMocks();
});

describe('BlogPostPage', () => {
  it('renders a loaded post without a hook-order crash, with its own head and BlogPosting data', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(fetchBlogPostBySlug).mockResolvedValue(post);
    renderAt(post.slug);

    expect(await screen.findByRole('heading', { level: 1, name: post.title })).toBeInTheDocument();
    expect(consoleError.mock.calls.map((call) => String(call[0])).join('\n')).not.toMatch(/hooks/i);
    await waitFor(() => expect(document.title).toBe(`${post.title} | New Wave IT`));
    expect(robots()).toBe('index, follow');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      `https://www.newwaveitfl.com/blog/${post.slug}`,
    );
    expect(document.head.querySelector('meta[property="og:type"]')?.getAttribute('content')).toBe('article');

    const article = jsonLd().find((node) => node['@type'] === 'BlogPosting');
    expect(article).toMatchObject({
      headline: post.title,
      datePublished: post.published_at,
      dateModified: post.updated_at,
      image: post.featured_image,
      mainEntityOfPage: `https://www.newwaveitfl.com/blog/${post.slug}`,
      author: { '@type': 'Organization', name: 'New Wave IT' },
      publisher: { '@id': 'https://www.newwaveitfl.com/#organization' },
    });
    const crumbs = jsonLd().find((node) => node['@type'] === 'BreadcrumbList');
    expect(crumbs.itemListElement.map((item: { name: string }) => item.name)).toEqual(['New Wave IT', 'Blog', post.title]);
  });

  it('marks a slug with no post noindex', async () => {
    vi.mocked(fetchBlogPostBySlug).mockResolvedValue(null);
    renderAt('no-such-post');

    expect(await screen.findByRole('heading', { level: 1, name: 'Blog Post Not Found' })).toBeInTheDocument();
    await waitFor(() => expect(robots()).toBe('noindex, nofollow'));
  });

  it('keeps the page indexable when loading fails (a transient error must not deindex a real post)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(fetchBlogPostBySlug).mockRejectedValue(new Error('network down'));
    renderAt(post.slug);

    expect(await screen.findByRole('heading', { level: 1, name: 'Blog Post Not Found' })).toBeInTheDocument();
    expect(robots()).toBe('index, follow');
  });
});
