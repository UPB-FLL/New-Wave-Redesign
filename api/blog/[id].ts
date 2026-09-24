import { requireAdminKey } from '../_lib/adminKey.js';
import { deletePost, getPostById, pickUpdatableFields, updatePost } from '../_lib/blogStore.js';
import { methodGuard, queryParam, readJsonBody, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { isSupabaseConfigured } from '../_lib/supabaseAdmin.js';
import { isSupabasePublicConfigured, missingSupabasePublicEnv } from '../_lib/supabasePublic.js';

/**
 * GET /api/blog/:id (public), PUT and DELETE /api/blog/:id (x-admin-key).
 * Unknown or malformed ids answer 404.
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!methodGuard(req, res, ['GET', 'PUT', 'DELETE'])) return;

  const id = queryParam(req, 'id');
  if (!id) return res.status(400).json({ error: 'Invalid ID' });

  if (req.method === 'GET') {
    if (!isSupabasePublicConfigured()) {
      console.error(`blog/[id]: Supabase is not configured (missing ${missingSupabasePublicEnv().join(', ')})`);
      return res.status(503).json({ error: 'Blog is unavailable' });
    }
    try {
      const post = await getPostById(id);
      if (!post) return res.status(404).json({ error: 'Blog post not found' });
      return res.status(200).json(post);
    } catch (err) {
      console.error('blog/[id] GET error:', err);
      return res.status(500).json({ error: 'Failed to fetch blog post' });
    }
  }

  // Write operations require the admin key, and the service role to get past RLS.
  if (!requireAdminKey(req, res)) return;
  if (!isSupabaseConfigured()) {
    console.error('blog/[id]: SUPABASE_SERVICE_ROLE_KEY is not configured');
    return res.status(503).json({ error: 'Blog writes are unavailable' });
  }

  if (req.method === 'PUT') {
    const updates = pickUpdatableFields(readJsonBody(req));
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No updatable fields' });
    try {
      const updated = await updatePost(id, updates);
      if (!updated) return res.status(404).json({ error: 'Blog post not found' });
      return res.status(200).json(updated);
    } catch (err) {
      console.error('blog/[id] PUT error:', err);
      return res.status(500).json({ error: 'Failed to update blog post' });
    }
  }

  try {
    const deleted = await deletePost(id);
    if (!deleted) return res.status(404).json({ error: 'Blog post not found' });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('blog/[id] DELETE error:', err);
    return res.status(500).json({ error: 'Failed to delete blog post' });
  }
}
