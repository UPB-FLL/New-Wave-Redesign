import { requireAdmin } from '../_lib/adminKey.js';
import { runWorkerInBackground } from '../_lib/groundswell/background.js';
import { isComposioConfigured } from '../_lib/groundswell/composio.js';
import { startQueuedAudits } from '../_lib/groundswell/engine.js';
import { STEPS } from '../_lib/groundswell/steps.js';
import { methodGuard, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { getSupabaseAdmin, isSupabaseConfigured } from '../_lib/supabaseAdmin.js';

/**
 * POST /api/audits/run — the "Run queued audits now" button on /admin/audits.
 *
 * Starts up to MAX_AUDITS_PER_CLICK queued audits on Groundswell (gives each
 * its steps in marketing_audit_steps and marks it running), answers, and then
 * starts working on them in the background. pg_cron's minute ping to
 * /api/audits/worker carries them the rest of the way.
 */

export const MAX_AUDITS_PER_CLICK = 3;

export function missingSetup(): string[] {
  return [
    isSupabaseConfigured() ? null : 'SUPABASE_SERVICE_ROLE_KEY',
    isComposioConfigured() ? null : 'COMPOSIO_API_KEY',
    process.env.OPENAI_API_KEY ? null : 'OPENAI_API_KEY',
  ].filter((v): v is string => Boolean(v));
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const startedAt = Date.now();
  if (!methodGuard(req, res, ['POST'])) return;
  if (!(await requireAdmin(req, res))) return;

  const missing = missingSetup();
  if (missing.length) {
    console.error(`Groundswell is not configured: ${missing.join(', ')} missing.`);
    return res.status(503).json({ error: 'The audit engine is not set up yet.' });
  }

  let started: string[];
  try {
    started = await startQueuedAudits(getSupabaseAdmin(), STEPS, MAX_AUDITS_PER_CLICK);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not start the queued audits.' });
  }
  if (!started.length) return res.status(409).json({ error: 'Nothing is queued.', started: 0 });

  runWorkerInBackground(startedAt);
  return res.status(200).json({ started: started.length });
}
