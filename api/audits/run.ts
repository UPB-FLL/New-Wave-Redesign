import { requireAdmin } from '../_lib/adminKey.js';
import { methodGuard, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { getSupabaseAdmin, isSupabaseConfigured } from '../_lib/supabaseAdmin.js';

/**
 * POST /api/audits/run — the "Run queued audits now" button on /admin/audits.
 *
 * Starts one run of the marketing-audit Claude Code routine per queued audit
 * (at most MAX_RUNS_PER_CLICK). Each run claims the oldest queued row with
 * FOR UPDATE SKIP LOCKED (.claude/skills/marketing-audit/SKILL.md, step 1), so
 * runs started together never take the same audit, and a spare run stops
 * quietly when the queue is empty.
 *
 * The routine has an API trigger only (no schedule). AUDIT_ROUTINE_ID is its
 * trig_… id and AUDIT_ROUTINE_TOKEN the token claude.ai shows once when the
 * trigger is created; both stay server-side.
 */

export const MAX_RUNS_PER_CLICK = 3;

const FIRE_TEXT =
  'Run the marketing-audit skill (.claude/skills/marketing-audit) on the oldest queued audit. Started from /admin/audits.';

function routineConfig(): { id: string; token: string } | null {
  const id = process.env.AUDIT_ROUTINE_ID?.trim();
  const token = process.env.AUDIT_ROUTINE_TOKEN?.trim();
  if (!id || !token || !/^trig_[A-Za-z0-9]+$/.test(id)) return null;
  return { id, token };
}

async function fireRoutine(id: string, token: string): Promise<{ ok: true } | { ok: false; status: number }> {
  const response = await fetch(`https://api.anthropic.com/v1/claude_code/routines/${id}/fire`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'experimental-cc-routine-2026-04-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: FIRE_TEXT }),
    signal: AbortSignal.timeout(15_000),
  });
  return response.ok ? { ok: true } : { ok: false, status: response.status };
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!methodGuard(req, res, ['POST'])) return;
  if (!(await requireAdmin(req, res))) return;

  const routine = routineConfig();
  if (!routine || !isSupabaseConfigured()) {
    console.error('Audit routine is not configured (AUDIT_ROUTINE_ID, AUDIT_ROUTINE_TOKEN, Supabase service role).');
    return res.status(503).json({ error: 'The audit routine is not connected yet.' });
  }

  const { count, error } = await getSupabaseAdmin()
    .from('marketing_audits')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'queued');
  if (error) {
    console.error('Could not count queued audits:', error.message);
    return res.status(500).json({ error: 'Could not read the audit queue.' });
  }
  if (!count) return res.status(409).json({ error: 'Nothing is queued.', started: 0 });

  const wanted = Math.min(count, MAX_RUNS_PER_CLICK);
  let started = 0;
  let failure: number | null = null;
  for (let i = 0; i < wanted; i++) {
    try {
      const result = await fireRoutine(routine.id, routine.token);
      if (!result.ok) {
        failure = result.status;
        break;
      }
      started++;
    } catch (err) {
      console.error('Audit routine fire failed:', err);
      failure = 502;
      break;
    }
  }

  if (failure !== null) console.error(`Audit routine fire returned ${failure} after ${started} run(s).`);
  if (started > 0) return res.status(200).json({ started, queued: count });
  if (failure === 429) return res.status(429).json({ error: 'Too many runs started this hour; try again later.', started: 0 });
  return res.status(502).json({ error: 'The audit routine did not start; try again in a minute.', started: 0 });
}
