import { listPosts } from '../_lib/blogStore.js';
import { methodGuard, queryParam, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { isSupabasePublicConfigured, missingSupabasePublicEnv } from '../_lib/supabasePublic.js';

/** GET /api/blog/list?page=&limit=&category=&search= — newest first, at most 50 per page. */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!methodGuard(req, res, ['GET'])) return;

  if (!isSupabasePublicConfigured()) {
    console.error(`blog/list: Supabase is not configured (missing ${missingSupabasePublicEnv().join(', ')})`);
    return res.status(503).json({ error: 'Blog is unavailable' });
  }

  try {
    const result = await listPosts({
      page: queryParam(req, 'page'),
      limit: queryParam(req, 'limit'),
      category: queryParam(req, 'category'),
      search: queryParam(req, 'search'),
    });
    return res.status(200).json(result);
  } catch (err) {
    console.error('blog/list error:', err);
    return res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
}
