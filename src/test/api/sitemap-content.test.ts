import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  configured: true,
  posts: { data: [] as unknown[] | null, error: null as unknown },
  content: { data: [] as unknown[] | null, error: null as unknown },
  lteArgs: [] as unknown[],
}));

vi.mock('../../../api/_lib/supabaseAdmin', () => ({
  isSupabaseConfigured: () => db.configured,
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === 'blog_posts') {
        const query = {
          select: () => query,
          lte: (...args: unknown[]) => {
            db.lteArgs = args;
            return query;
          },
          order: async () => db.posts,
        };
        return query;
      }
      return { select: () => ({ in: async () => db.content }) };
    },
  }),
}));

import handler from '../../../api/sitemap-content';
import { buildSitemapXml, slugsFromContentList } from '../../../api/_lib/sitemap';

function makeRes() {
  return {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
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
    send(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
}

const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

beforeEach(() => {
  db.configured = true;
  db.posts = { data: [], error: null };
  db.content = { data: [], error: null };
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GET /sitemap-content.xml', () => {
  it('lists published blog posts and CMS service/threat pages with lastmod dates', async () => {
    db.posts = {
      data: [
        { slug: 'msp-checklist', published_at: '2026-09-01T10:00:00Z', updated_at: '2026-09-05T08:00:00Z' },
        { slug: 'backup-3-2-1', published_at: '2026-08-20T10:00:00Z', updated_at: null },
        { slug: '', published_at: '2026-08-01T10:00:00Z', updated_at: null },
      ],
      error: null,
    };
    db.content = {
      data: [
        { section: 'services-detail', key: 'services_list', value: JSON.stringify([{ slug: 'managed-soc' }, { slug: 'a&b' }]), updated_at: '2026-07-10T00:00:00Z' },
        { section: 'services-detail', key: 'hero_title', value: 'not a list', updated_at: null },
        { section: 'threats-detail', key: 'threats_list', value: JSON.stringify([{ slug: 'ransomware' }]), updated_at: '2026-06-01T00:00:00Z' },
      ],
      error: null,
    };
    const res = makeRes();
    await handler({ method: 'GET' }, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/xml; charset=utf-8');
    expect(res.headers['cache-control']).toContain('s-maxage=3600');
    const xml = res.body as string;
    expect(locs(xml)).toEqual([
      'https://www.newwaveitfl.com/blog/msp-checklist',
      'https://www.newwaveitfl.com/blog/backup-3-2-1',
      'https://www.newwaveitfl.com/service/managed-soc',
      'https://www.newwaveitfl.com/service/a%26b',
      'https://www.newwaveitfl.com/threat/ransomware',
    ]);
    expect(xml).toContain('<lastmod>2026-09-05</lastmod>');
    expect(xml).toContain('<lastmod>2026-08-20</lastmod>');
    // Scheduled (future) posts stay out: the query caps published_at at now.
    expect(db.lteArgs[0]).toBe('published_at');
  });

  it('answers 5xx rather than an empty sitemap when the database fails or is not configured', async () => {
    db.posts = { data: null, error: { message: 'boom' } };
    const failed = makeRes();
    await handler({ method: 'GET' }, failed);
    expect(failed.statusCode).toBe(500);

    db.configured = false;
    const unconfigured = makeRes();
    await handler({ method: 'GET' }, unconfigured);
    expect(unconfigured.statusCode).toBe(503);
  });

  it('rejects other methods', async () => {
    const res = makeRes();
    await handler({ method: 'POST' }, res);
    expect(res.statusCode).toBe(405);
  });
});

describe('sitemap builder', () => {
  it('writes a valid, de-duplicated urlset and skips malformed CMS lists', () => {
    const xml = buildSitemapXml([{ path: '/blog/a' }, { path: '/blog/a' }, { path: '/blog/b', lastmod: 'not a date' }]);
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
    expect(doc.documentElement.namespaceURI).toBe('http://www.sitemaps.org/schemas/sitemap/0.9');
    expect(locs(xml)).toEqual(['https://www.newwaveitfl.com/blog/a', 'https://www.newwaveitfl.com/blog/b']);
    expect(xml).not.toContain('<lastmod>');
    expect(buildSitemapXml([])).toContain('<urlset');
    expect(slugsFromContentList('{oops')).toEqual([]);
    expect(slugsFromContentList(JSON.stringify({ slug: 'x' }))).toEqual([]);
  });
});

describe('crawler wiring', () => {
  const root = path.resolve(__dirname, '../../..');
  it('robots.txt lists both sitemaps and vercel.json routes the content sitemap before the SPA catch-all', () => {
    const robots = readFileSync(path.join(root, 'public/robots.txt'), 'utf8');
    expect(robots).toContain('Sitemap: https://www.newwaveitfl.com/sitemap.xml');
    expect(robots).toContain('Sitemap: https://www.newwaveitfl.com/sitemap-content.xml');

    const { rewrites } = JSON.parse(readFileSync(path.join(root, 'vercel.json'), 'utf8')) as {
      rewrites: { source: string; destination: string }[];
    };
    const sitemap = rewrites.findIndex((r) => r.source === '/sitemap-content.xml' && r.destination === '/api/sitemap-content');
    const catchAll = rewrites.findIndex((r) => r.source === '/(.*)');
    expect(sitemap).toBeGreaterThanOrEqual(0);
    expect(sitemap).toBeLessThan(catchAll);
  });
});
