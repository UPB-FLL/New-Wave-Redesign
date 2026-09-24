import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BlogPost } from '../../../types/blog';

const root = path.resolve(__dirname, '../../..');
const SOURCE_SHELL = readFileSync(path.join(root, 'index.html'), 'utf8');

const env = vi.hoisted(() => ({
  configured: true,
  shell: null as string | null,
  getPostBySlug: vi.fn(),
}));

vi.mock('../../../api/_lib/supabasePublic', () => ({ isSupabasePublicConfigured: () => env.configured }));
vi.mock('../../../api/_lib/blogStore', () => ({ getPostBySlug: env.getPostBySlug }));
vi.mock('../../../api/_lib/spaShell', () => ({
  readSpaShell: () => {
    if (env.shell === null) throw new Error('ENOENT: dist/index.html');
    return env.shell;
  },
}));

import handler from '../../../api/blog-page';
import { blogPostPageMeta } from '../../lib/blogSeo';
import { headEntries, resolvePageMeta, SITE_URL } from '../../lib/pageMeta';

const POST: BlogPost = {
  id: '124f4292-4fa8-44c1-a5a4-63cf25b4406b',
  title: 'Effective Disaster Recovery Solutions for Fort Lauderdale',
  slug: 'disaster-recovery-solutions',
  excerpt: 'How Fort Lauderdale businesses plan for recovery.',
  content: 'Intro paragraph.\n\n## Frequently asked questions\n\n### How often should we test?\n\nAt least twice a year.\n',
  featured_image: 'https://images.pexels.com/photos/1/recovery.jpeg',
  category: 'Backup & Disaster Recovery',
  tags: ['disaster recovery', 'backup'],
  meta_title: 'Disaster Recovery Solutions for Fort Lauderdale',
  meta_description: 'Plan, test, and recover faster: a practical guide to disaster recovery solutions for Fort Lauderdale businesses from New Wave IT.',
  published_at: '2026-09-24T21:54:58.123Z',
  created_at: '2026-09-24T21:54:58.123Z',
  updated_at: '2026-09-24T21:54:58.123Z',
  author: 'New Wave IT Team',
};

const POST_URL = `${SITE_URL}/blog/${POST.slug}`;

function makeRes() {
  return {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    send(payload: string) {
      this.body = payload;
      return this;
    },
  };
}

async function get(slug: string | undefined, method = 'GET') {
  const res = makeRes();
  await handler({ method, headers: {}, query: slug === undefined ? {} : { slug } }, res);
  return res;
}

function head(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const meta = (attr: string, key: string) => doc.head.querySelector(`meta[${attr}="${key}"]`)?.getAttribute('content');
  return {
    doc,
    title: doc.title,
    canonicals: [...doc.head.querySelectorAll('link[rel="canonical"]')].map((link) => link.getAttribute('href')),
    meta,
    robots: meta('name', 'robots'),
    pageJsonLd: doc.getElementById('page-jsonld')?.textContent ?? null,
  };
}

beforeEach(() => {
  env.configured = true;
  env.shell = SOURCE_SHELL;
  env.getPostBySlug.mockReset();
});

describe('GET /blog/:slug (api/blog-page.ts)', () => {
  it("serves the post's own head, the same tags the page writes at runtime", async () => {
    env.getPostBySlug.mockResolvedValue(POST);
    const res = await get(POST.slug);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/html; charset=utf-8');
    expect(res.headers['cache-control']).toMatch(/s-maxage=\d+/);
    expect(env.getPostBySlug).toHaveBeenCalledWith(POST.slug);

    const page = head(res.body as string);
    // One canonical, and it is the post: the homepage canonical is gone.
    expect(page.canonicals).toEqual([POST_URL]);
    expect(page.title).toBe(`${POST.meta_title} | New Wave IT`);
    expect(page.robots).toBe('index, follow');

    const runtime = resolvePageMeta(blogPostPageMeta(POST.slug, { status: 'ready', post: POST }), `/blog/${POST.slug}`);
    for (const entry of headEntries(runtime)) {
      if (entry.kind === 'canonical') continue;
      expect(page.meta(entry.attr, entry.key), entry.key).toBe(entry.value);
    }
    expect(page.meta('property', 'og:url')).toBe(POST_URL);
    expect(page.meta('property', 'og:type')).toBe('article');
  });

  it('writes the post JSON-LD into a #page-jsonld block for usePageMeta to take over', async () => {
    env.getPostBySlug.mockResolvedValue(POST);
    const page = head((await get(POST.slug)).body as string);

    const graph = JSON.parse(page.pageJsonLd ?? 'null') as { '@type': string; '@id'?: string }[];
    expect(graph.map((node) => node['@type'])).toEqual(['BlogPosting', 'BreadcrumbList', 'FAQPage']);
    expect(graph[0]['@id']).toBe(`${POST_URL}#article`);
    // The shell's business/organization graph is still there for BlogPosting to reference.
    expect(page.doc.head.querySelectorAll('script[type="application/ld+json"]').length).toBeGreaterThan(1);
  });

  it('escapes post text so it cannot break out of the head', async () => {
    env.getPostBySlug.mockResolvedValue({ ...POST, meta_title: 'Backups </title><script>alert(1)</script>', title: 'A </script><script>alert(1)</script> post' });
    const html = (await get(POST.slug)).body as string;

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(head(html).title).toBe('Backups </title><script>alert(1)</script> | New Wave IT');
    expect(head(html).pageJsonLd).toContain('\\u003c/script>');
  });

  it('answers a real 404 with noindex when no post has the slug', async () => {
    env.getPostBySlug.mockResolvedValue(null);
    const res = await get('no-such-post');

    expect(res.statusCode).toBe(404);
    const page = head(res.body as string);
    expect(page.robots).toBe('noindex, nofollow');
    expect(page.canonicals).toEqual([`${SITE_URL}/blog/no-such-post`]);
    expect(page.pageJsonLd).toBeNull();
  });

  it.each([[''], ['a/b'], ['<script>'], ['two words'], ['x'.repeat(201)]])('404s an implausible slug %j without querying', async (slug) => {
    const res = await get(slug);
    expect(res.statusCode).toBe(404);
    expect(head(res.body as string).robots).toBe('noindex, nofollow');
    expect(env.getPostBySlug).not.toHaveBeenCalled();
  });

  it('404s when the rewrite passes no slug at all', async () => {
    expect((await get(undefined)).statusCode).toBe(404);
  });

  it('answers 503 without noindex when the database is unreachable, so a post is never deindexed by an outage', async () => {
    env.getPostBySlug.mockRejectedValue(new Error('fetch failed'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await get(POST.slug);
    spy.mockRestore();

    expect(res.statusCode).toBe(503);
    expect(res.headers['retry-after']).toBe('120');
    expect(res.headers['cache-control']).toBe('no-store');
    const page = head(res.body as string);
    expect(page.robots).toBe('index, follow');
    expect(page.canonicals).toEqual([POST_URL]);
  });

  it('answers 503 when Supabase is not configured', async () => {
    env.configured = false;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await get(POST.slug);
    spy.mockRestore();
    expect(res.statusCode).toBe(503);
    expect(env.getPostBySlug).not.toHaveBeenCalled();
  });

  it('fails loudly (500) when the shell was not bundled with the function', async () => {
    env.shell = null;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await get(POST.slug);
    spy.mockRestore();
    expect(res.statusCode).toBe(500);
  });

  it('allows only GET and HEAD', async () => {
    expect((await get(POST.slug, 'POST')).statusCode).toBe(405);
    env.getPostBySlug.mockResolvedValue(POST);
    expect((await get(POST.slug, 'HEAD')).statusCode).toBe(200);
  });
});

describe('vercel.json wiring for /blog/:slug', () => {
  const config = JSON.parse(readFileSync(path.join(root, 'vercel.json'), 'utf8')) as {
    rewrites: { source: string; destination: string }[];
    functions: Record<string, { includeFiles?: string }>;
  };

  it('rewrites each post URL to the function, before the SPA catch-all', () => {
    const sources = config.rewrites.map((rule) => rule.source);
    const index = sources.indexOf('/blog/:slug');
    expect(index).toBeGreaterThan(-1);
    expect(config.rewrites[index].destination).toBe('/api/blog-page?slug=:slug');
    expect(index).toBeLessThan(sources.indexOf('/(.*)'));
    // The blog index keeps its prerendered file.
    expect(config.rewrites.find((rule) => rule.source === '/blog')?.destination).toBe('/blog/index.html');
  });

  it('ships the built shell with the function', () => {
    expect(config.functions['api/blog-page.ts']?.includeFiles).toBe('dist/index.html');
  });
});
