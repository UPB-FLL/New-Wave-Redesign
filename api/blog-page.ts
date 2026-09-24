import { blogPageHtml } from './_lib/blogPageHtml.js';
import { getPostBySlug } from './_lib/blogStore.js';
import { methodGuard, queryParam, type ApiRequest, type ApiResponse } from './_lib/http.js';
import { readSpaShell } from './_lib/spaShell.js';
import { isSupabasePublicConfigured } from './_lib/supabasePublic.js';

/**
 * GET /blog/:slug, rewritten here by vercel.json (a fixed-name function: the
 * SPA catch-all shadows dynamic [param] routes). Serves the SPA shell with
 * the post's own head, so crawlers and link previews read the post rather
 * than the homepage; the app then boots as usual.
 *
 * - Post found: 200.
 * - No post with that slug: 404 with noindex (a real 404, not a soft one).
 * - Database unreachable: 503 with the post's canonical and no noindex, so a
 *   transient failure can't deindex a post. The shell still loads the app,
 *   which fetches the post itself.
 */

const CACHE_FOUND = 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400';
const CACHE_MISSING = 'public, max-age=0, s-maxage=60';

/** Anything a stored slug could be; the rest (paths, markup, whitespace) is a 404 without a query. */
const isPlausibleSlug = (slug: string) => /^[^\s/<>"'`]{1,200}$/.test(slug);

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!methodGuard(req, res, ['GET', 'HEAD'])) return;

  let shell: string;
  try {
    shell = readSpaShell();
  } catch (error) {
    console.error('blog-page: dist/index.html is missing from the function bundle', error);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(500).send('Blog temporarily unavailable.');
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  const slug = queryParam(req, 'slug')?.trim() ?? '';
  if (!isPlausibleSlug(slug)) {
    res.setHeader('Cache-Control', CACHE_MISSING);
    return res.status(404).send(blogPageHtml(shell, '', { status: 'missing' }));
  }

  try {
    if (!isSupabasePublicConfigured()) throw new Error('Supabase is not configured');
    const post = await getPostBySlug(slug);
    if (!post) {
      res.setHeader('Cache-Control', CACHE_MISSING);
      return res.status(404).send(blogPageHtml(shell, slug, { status: 'missing' }));
    }
    res.setHeader('Cache-Control', CACHE_FOUND);
    return res.status(200).send(blogPageHtml(shell, slug, { status: 'ready', post }));
  } catch (error) {
    console.error(`blog-page: could not load /blog/${slug}`, error);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Retry-After', '120');
    return res.status(503).send(blogPageHtml(shell, slug, { status: 'loading' }));
  }
}
