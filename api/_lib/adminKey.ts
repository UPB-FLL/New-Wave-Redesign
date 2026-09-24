import { createHash, timingSafeEqual } from 'node:crypto';
import type { ApiRequest, ApiResponse } from './http.js';

const digest = (value: string) => createHash('sha256').update(value).digest();

/**
 * Gate for the blog write routes (PUT/DELETE /api/blog/:id and
 * /api/blog/generate-post). Fails closed: with ADMIN_API_KEY unset every
 * request is refused (503), where it used to let everyone through. The key
 * arrives in the x-admin-key header and is compared in constant time.
 */
export function requireAdminKey(req: ApiRequest, res: ApiResponse): boolean {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) {
    console.error('Admin API key is not configured (ADMIN_API_KEY).');
    res.status(503).json({ error: 'Admin API is not configured' });
    return false;
  }
  const header = req.headers?.['x-admin-key'];
  const provided = Array.isArray(header) ? header[0] : header;
  // Hashing first gives equal-length buffers, so timingSafeEqual never throws on length.
  if (typeof provided !== 'string' || !timingSafeEqual(digest(provided), digest(expected))) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}
