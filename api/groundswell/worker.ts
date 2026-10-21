import { requireAdmin } from '../_lib/adminKey.js';
import { runWorkerInBackground } from '../_lib/groundswell/background.js';
import { methodGuard, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { isSupabaseConfigured } from '../_lib/supabaseAdmin.js';

/**
 * POST /api/groundswell/worker — Groundswell's heartbeat. pg_cron calls it every
 * minute while an audit is running (x-admin-key, migration 20261021120000),
 * and the admin page may call it too. It answers at once and keeps working
 * after the response: each call runs runnable audit steps until its time is
 * nearly up (api/_lib/groundswell/engine.ts).
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  const startedAt = Date.now();
  if (!methodGuard(req, res, ['POST'])) return;
  if (!(await requireAdmin(req, res))) return;
  if (!isSupabaseConfigured()) {
    console.error('Groundswell worker: the Supabase service role is not configured.');
    return res.status(503).json({ error: 'The audit engine is not set up yet.' });
  }
  runWorkerInBackground(startedAt);
  return res.status(202).json({ accepted: true });
}
