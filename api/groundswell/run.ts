import { requireAdmin } from '../_lib/adminKey.js';
import { runWorkerInBackground } from '../_lib/groundswell/background.js';
import { isComposioConfigured } from '../_lib/groundswell/composio.js';
import { startQueuedAudits } from '../_lib/groundswell/engine.js';
import { answerReview, ReviewError } from '../_lib/groundswell/review.js';
import { BENCHMARK_STEPS, STEPS } from '../_lib/groundswell/steps.js';
import { methodGuard, readJsonBody, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { getSupabaseAdmin, isSupabaseConfigured } from '../_lib/supabaseAdmin.js';

/**
 * GET /api/groundswell/run — which services Groundswell needs are set up
 * (names only, never values), for the admin overview.
 *
 * POST /api/groundswell/run — the "Run queued audits now" button on /admin/groundswell/audits.
 * With { action: 'deliver' | 'recheck', audit_id }, an admin's answer to an
 * audit held in review instead (review.ts): deliver it as it stands, or run its
 * checks again; either way the worker carries it on in the background.
 *
 * Starts up to MAX_AUDITS_PER_CLICK queued audits on Groundswell (gives each
 * its steps in marketing_audit_steps and marks it running), answers, and then
 * starts working on them in the background. pg_cron's minute ping to
 * /api/groundswell/worker carries them the rest of the way.
 */

export const MAX_AUDITS_PER_CLICK = 3;

/** Every service Groundswell uses, and whether its environment variables are set. */
export function setupChecks() {
  return [
    { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase service role', ok: isSupabaseConfigured(), required: true },
    { key: 'COMPOSIO_API_KEY', label: 'Composio (Drive, Ahrefs, Keyword Planner, Instagram)', ok: isComposioConfigured(), required: true },
    { key: 'OPENAI_API_KEY', label: 'OpenAI (the write-up)', ok: Boolean(process.env.OPENAI_API_KEY), required: true },
    { key: 'RESEND_API_KEY', label: 'Resend (partner invites and resets)', ok: Boolean(process.env.RESEND_API_KEY), required: false },
    { key: 'GOOGLE_ADS_CUSTOMER_ID', label: 'Google Ads customer id (Keyword Planner)', ok: Boolean(process.env.GOOGLE_ADS_CUSTOMER_ID), required: false },
  ];
}

export function missingSetup(): string[] {
  return [
    isSupabaseConfigured() ? null : 'SUPABASE_SERVICE_ROLE_KEY',
    isComposioConfigured() ? null : 'COMPOSIO_API_KEY',
    process.env.OPENAI_API_KEY ? null : 'OPENAI_API_KEY',
  ].filter((v): v is string => Boolean(v));
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const startedAt = Date.now();
  if (!methodGuard(req, res, ['GET', 'POST'])) return;
  if (!(await requireAdmin(req, res))) return;

  if (req.method === 'GET') {
    const checks = setupChecks();
    return res.status(200).json({
      ready: checks.every((c) => c.ok || !c.required),
      checks,
      drive_owner: process.env.GROUNDSWELL_DRIVE_OWNER || 'josh@newwaveitfl.com',
    });
  }

  const missing = missingSetup();
  if (missing.length) {
    console.error(`Groundswell is not configured: ${missing.join(', ')} missing.`);
    return res.status(503).json({ error: 'The audit engine is not set up yet.' });
  }

  const body = readJsonBody(req);
  if (body.action !== undefined) {
    try {
      const action = await answerReview(getSupabaseAdmin(), body.audit_id, body.action);
      runWorkerInBackground(startedAt);
      return res.status(200).json({ action });
    } catch (err) {
      if (err instanceof ReviewError) return res.status(err.status).json({ error: err.message });
      console.error(err);
      return res.status(500).json({ error: 'Could not update the audit.' });
    }
  }

  let started: string[];
  try {
    started = await startQueuedAudits(getSupabaseAdmin(), STEPS, MAX_AUDITS_PER_CLICK, BENCHMARK_STEPS);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not start the queued audits.' });
  }
  if (!started.length) return res.status(409).json({ error: 'Nothing is queued.', started: 0 });

  runWorkerInBackground(startedAt);
  return res.status(200).json({ started: started.length });
}
