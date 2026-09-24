import { methodGuard } from './_lib/http.js';
import { buildSitemapXml, detailPath, slugsFromContentList, type SitemapEntry } from './_lib/sitemap.js';
import { getSupabaseAdmin, isSupabaseConfigured } from './_lib/supabaseAdmin.js';

/**
 * GET /sitemap-content.xml (vercel.json rewrites it here): every blog post and
 * every CMS-driven /service/:slug and /threat/:slug page. These URLs live in
 * the database, so the static public/sitemap.xml cannot list them.
 *
 * Failures answer 5xx rather than an empty sitemap: crawlers retry a 5xx
 * later, while an empty sitemap would read as "these pages are gone".
 */

const DETAIL_LISTS = [
  { section: 'services-detail', key: 'services_list', prefix: '/service' },
  { section: 'threats-detail', key: 'threats_list', prefix: '/threat' },
] as const;

interface SitemapResponse {
  setHeader(name: string, value: string): void;
  status(code: number): SitemapResponse;
  json(body: unknown): SitemapResponse;
  send(body: string): SitemapResponse;
}

export default async function handler(req: { method?: string }, res: SitemapResponse) {
  if (!methodGuard(req, res, ['GET', 'HEAD'])) return;

  if (!isSupabaseConfigured()) {
    console.error('sitemap-content: Supabase is not configured');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ error: 'Sitemap unavailable' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const [posts, content] = await Promise.all([
      supabase
        .from('blog_posts')
        .select('slug, published_at, updated_at')
        .lte('published_at', new Date().toISOString())
        .order('published_at', { ascending: false }),
      supabase
        .from('site_content')
        .select('section, key, value, updated_at')
        .in('section', DETAIL_LISTS.map((list) => list.section)),
    ]);
    if (posts.error) throw posts.error;
    if (content.error) throw content.error;

    const entries: SitemapEntry[] = [];
    for (const post of posts.data ?? []) {
      const path = detailPath('/blog', post.slug);
      if (path) entries.push({ path, lastmod: post.updated_at ?? post.published_at });
    }
    for (const list of DETAIL_LISTS) {
      const row = (content.data ?? []).find((r) => r.section === list.section && r.key === list.key);
      for (const slug of slugsFromContentList(row?.value)) {
        const path = detailPath(list.prefix, slug);
        if (path) entries.push({ path, lastmod: row?.updated_at });
      }
    }

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    // Fresh enough for a weekly blog; the CDN absorbs crawler traffic.
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(req.method === 'HEAD' ? '' : buildSitemapXml(entries));
  } catch (err) {
    console.error('sitemap-content error:', err);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(500).json({ error: 'Sitemap unavailable' });
  }
}
