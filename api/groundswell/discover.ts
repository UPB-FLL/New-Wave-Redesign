import { createHash } from 'node:crypto';
import { methodGuard, rateLimit, readJsonBody, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { discoverySeed, discoverPublicBusiness } from '../_lib/groundswell/discovery.js';
import { resolveViewer } from '../_lib/groundswell/viewer.js';
import { isSupabaseConfigured } from '../_lib/supabaseAdmin.js';
import type { DiscoveryResult } from '../../src/lib/groundswellDiscoveryTypes.js';

export const config = { maxDuration: 45 };
const cache = new Map<string, { expires: number; result: DiscoveryResult }>();
const pending = new Map<string, Promise<DiscoveryResult>>();

/** Staff/partner-only public research. It never creates or starts an audit. */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (!methodGuard(req, res, ['POST'])) return;
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'GroundSwell is not available right now.' });
  const who = await resolveViewer(req);
  if (!who.ok) return res.status(who.status).json({ error: who.error });
  let seed;
  try { seed = discoverySeed(readJsonBody(req)); }
  catch (err) { return res.status(400).json({ error: err instanceof Error ? err.message : 'Check the business details.' }); }
  const actor = who.viewer.kind === 'partner' ? `partner:${who.viewer.partnerId}` : 'staff';
  const key = createHash('sha256').update(JSON.stringify({ actor, seed })).digest('hex');
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return res.status(200).json(cached.result);
  if (!pending.has(key)) {
    if (!rateLimit(`gs-discovery:${actor}`, 40, 60 * 60_000)) return res.status(429).json({ error: 'Too many business lookups. Wait before retrying, or enter the details manually.' });
    pending.set(key, discoverPublicBusiness(seed));
  }
  try {
    const result = await pending.get(key)!;
    // A provider failure must be retryable immediately after its connection or credit balance is repaired.
    if (!result.sources.some(source => source.status === 'unavailable')) {
      if (cache.size >= 128) cache.delete(cache.keys().next().value!);
      cache.set(key, { expires: Date.now() + 10 * 60_000, result });
    }
    return res.status(200).json(result);
  } catch (err) {
    console.error('GroundSwell business lookup failed:', err instanceof Error ? err.message : 'unknown error');
    return res.status(502).json({ error: 'The public lookup could not be completed. Try again or enter the details manually.' });
  } finally { pending.delete(key); }
}
