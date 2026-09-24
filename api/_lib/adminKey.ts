import { createHash, timingSafeEqual } from 'node:crypto';
import type { ApiRequest, ApiResponse } from './http.js';
import { getSupabasePublic, isSupabasePublicConfigured } from './supabasePublic.js';

const digest = (value: string) => createHash('sha256').update(value).digest();

const header = (req: ApiRequest, name: string) => {
  const value = req.headers?.[name];
  return Array.isArray(value) ? value[0] : value;
};

/**
 * Gate for the admin API routes (blog writes, generate-post, api/seo/*).
 * Two ways in, and anything else is refused:
 *
 * - `x-admin-key` equal to ADMIN_API_KEY, compared in constant time. For
 *   server-to-server callers such as the weekly pg_cron job.
 * - `Authorization: Bearer <access token>` of a signed-in Supabase user: the
 *   admin screens. That is the same test AdminGuard and the tables' RLS
 *   policies apply (any authenticated user), so no secret ever has to be
 *   shipped to the browser as a VITE_ variable.
 *
 * Fails closed: with neither configured, the answer is 503, not a pass.
 */
export async function requireAdmin(req: ApiRequest, res: ApiResponse): Promise<boolean> {
  const expected = process.env.ADMIN_API_KEY;
  const key = header(req, 'x-admin-key');
  const bearer = header(req, 'authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];

  if (key) {
    // Hashing first gives equal-length buffers, so timingSafeEqual never throws on length.
    if (expected && timingSafeEqual(digest(key), digest(expected))) return true;
    res.status(expected ? 401 : 503).json({ error: expected ? 'Unauthorized' : 'Admin API is not configured' });
    return false;
  }

  if (bearer) {
    if (!isSupabasePublicConfigured()) {
      res.status(503).json({ error: 'Admin API is not configured' });
      return false;
    }
    try {
      const { data, error } = await getSupabasePublic().auth.getUser(bearer);
      if (!error && data?.user) return true;
    } catch (err) {
      console.error('Admin session check failed:', err);
    }
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  if (!expected) console.error('Admin API key is not configured (ADMIN_API_KEY).');
  res.status(expected ? 401 : 503).json({ error: expected ? 'Unauthorized' : 'Admin API is not configured' });
  return false;
}
