import type { SupabaseClient } from '@supabase/supabase-js';
import { loadBranding } from './branding.js';
import { PermanentStepError, type AuditRow, type StepDefinition } from './types.js';

/**
 * Groundswell's worker loop. Each call claims runnable steps one at a time
 * (claim_next_audit_step, which skips steps another call holds), runs each
 * within the remaining time, and records the result:
 *
 * - success: the step is `done` with its output; the last step finishes the audit.
 * - failure: retried on a later call up to MAX_ATTEMPTS; then an optional step is
 *   `skipped` (the audit goes on without it) and a required one fails the audit
 *   with a sentence an admin can act on.
 * - hold: a step whose output carries `hold` (verify.ts, when a check cannot
 *   vouch for the figures) is `done`, and the audit stops in `review` before
 *   anything is delivered, until an admin delivers it or runs the checks again.
 */

export const MAX_ATTEMPTS = 3;
/** Leave this much of the function's time unused, for saving and returning. */
export const SAFETY_MS = 20_000;
/** Do not start a step with less than this left; the next call will take it. */
export const MIN_STEP_MS = 45_000;

interface ClaimedStep {
  id: string;
  audit_id: string;
  step: string;
  position: number;
  attempts: number;
}

export interface WorkerReport {
  ran: { audit_id: string; step: string; outcome: 'done' | 'retry' | 'skipped' | 'failed' | 'held'; error?: string }[];
  finished: string[];
}

const message = (err: unknown) => (err instanceof Error ? err.message : String(err)).slice(0, 500);

/**
 * Starts queued audits, giving each the step list for its kind. Before the
 * benchmark migration (20261022120000) the database has only the two-argument
 * function; then every audit gets the audit steps.
 */
export async function startQueuedAudits(
  db: SupabaseClient,
  steps: StepDefinition[],
  max = 3,
  benchmarkSteps: StepDefinition[] | null = null
): Promise<string[]> {
  const args = { step_names: steps.map((s) => s.name), max_audits: max };
  let { data, error } = benchmarkSteps
    ? await db.rpc('start_queued_audits', { ...args, benchmark_step_names: benchmarkSteps.map((s) => s.name) })
    : await db.rpc('start_queued_audits', args);
  if (error && benchmarkSteps && /could not find the function|function .* does not exist|PGRST202/i.test(`${error.message} ${(error as { code?: string }).code ?? ''}`)) {
    ({ data, error } = await db.rpc('start_queued_audits', args));
  }
  if (error) throw new Error(`Could not start queued audits: ${error.message}`);
  return ((data ?? []) as unknown[]).map((v) => (typeof v === 'string' ? v : (v as { start_queued_audits: string }).start_queued_audits));
}

/** Partners' runs: the default daily cap when a partner has none of its own (groundswell_partners.daily_run_limit). */
export const DEFAULT_DAILY_RUNS = 3;

export type StartOutcome = 'started' | 'not_queued' | 'another_running' | 'daily_limit';

export interface StartResult {
  outcome: StartOutcome;
  /** For `another_running`: the business whose audit is still running. */
  running_business: string | null;
  /** For `daily_limit`: when the oldest run of the last 24 hours leaves the window. */
  resets_at: string | null;
}

/**
 * Starts one queued audit for a partner (start_audit, migration
 * 20261025120000), which also holds the partner's caps: one running audit at
 * a time and a daily limit. Throws when the function is missing, so the route
 * can say the feature is not switched on yet.
 */
export async function startAudit(
  db: SupabaseClient,
  auditId: string,
  partnerId: string,
  steps: StepDefinition[],
  benchmarkSteps: StepDefinition[],
  defaultDailyLimit = DEFAULT_DAILY_RUNS
): Promise<StartResult> {
  const { data, error } = await db.rpc('start_audit', {
    p_audit_id: auditId,
    p_partner_id: partnerId,
    step_names: steps.map((s) => s.name),
    benchmark_step_names: benchmarkSteps.map((s) => s.name),
    default_daily_limit: defaultDailyLimit,
  });
  if (error) throw new Error(`Could not start the audit: ${error.message}`);
  const row = (Array.isArray(data) ? data[0] : data) as StartResult | undefined;
  if (!row?.outcome) throw new Error('Could not start the audit: no outcome.');
  return { outcome: row.outcome, running_business: row.running_business ?? null, resets_at: row.resets_at ?? null };
}

/** The outputs of the audit's finished steps, and the names of all its steps in order. */
async function loadSteps(db: SupabaseClient, auditId: string): Promise<{ outputs: Record<string, unknown>; steps: string[] }> {
  const { data, error } = await db.from('marketing_audit_steps').select('step,status,output,position').eq('audit_id', auditId);
  if (error) throw new Error(error.message);
  const rows = ((data ?? []) as { step: string; status: string; output: unknown; position: number }[]).sort((a, b) => a.position - b.position);
  return {
    outputs: Object.fromEntries(rows.filter((r) => r.status === 'done').map((r) => [r.step, r.output])),
    steps: rows.map((r) => r.step),
  };
}

async function failAudit(db: SupabaseClient, auditId: string, sentence: string) {
  await db
    .from('marketing_audits')
    .update({ status: 'failed', error: sentence, completed_at: new Date().toISOString() })
    .eq('id', auditId);
}

/** The reason a step's output asks for a person before delivery, or null. */
export function holdReason(output: unknown): string | null {
  const hold = (output as { hold?: unknown } | null | undefined)?.hold;
  return typeof hold === 'string' && hold ? hold : null;
}

/**
 * Stops an audit for a person. Before migration 20261024120000 the database
 * refuses the `review` status; the audit then fails with the reason instead,
 * so nothing is delivered either way. Any other error retries the step.
 */
async function holdAudit(db: SupabaseClient, auditId: string, why: string) {
  const { error } = await db.from('marketing_audits').update({ status: 'review', error: why }).eq('id', auditId);
  if (!error) return;
  if (/check constraint|23514/i.test(`${error.message} ${(error as { code?: string }).code ?? ''}`)) await failAudit(db, auditId, `Needs review: ${why}`);
  else throw new Error(`Could not hold the audit for review: ${error.message}`);
}

export async function runWorker(
  db: SupabaseClient,
  steps: StepDefinition[],
  { deadline, now = Date.now }: { deadline: number; now?: () => number }
): Promise<WorkerReport> {
  const byName = new Map(steps.map((s) => [s.name, s]));
  const report: WorkerReport = { ran: [], finished: [] };

  while (deadline - now() > SAFETY_MS + MIN_STEP_MS) {
    const { data, error } = await db.rpc('claim_next_audit_step', { lease_seconds: 600 });
    if (error) throw new Error(`Could not claim a step: ${error.message}`);
    const claimed = ((data ?? []) as ClaimedStep[])[0];
    if (!claimed) break;

    const def = byName.get(claimed.step);
    const { data: auditRow, error: auditError } = await db
      .from('marketing_audits')
      .select('id,business_name,city,website,instagram,competitors,notes')
      .eq('id', claimed.audit_id)
      .single();
    if (auditError || !auditRow || !def) {
      const why = !def ? `Unknown step "${claimed.step}"` : `Audit not found: ${auditError?.message ?? ''}`;
      await db.from('marketing_audit_steps').update({ status: 'failed', error: why, finished_at: new Date().toISOString() }).eq('id', claimed.id);
      await failAudit(db, claimed.audit_id, why);
      report.ran.push({ audit_id: claimed.audit_id, step: claimed.step, outcome: 'failed', error: why });
      continue;
    }

    try {
      const { outputs, steps: names } = await loadSteps(db, claimed.audit_id);
      const branding = await loadBranding(db, claimed.audit_id);
      const output = await def.run({
        audit: { ...(auditRow as AuditRow), branding },
        outputs,
        steps: names,
        deadline: deadline - SAFETY_MS,
        attempt: claimed.attempts,
      });
      await db
        .from('marketing_audit_steps')
        .update({ status: 'done', output: output ?? null, error: null, finished_at: new Date().toISOString() })
        .eq('id', claimed.id);
      const hold = holdReason(output);
      if (hold) {
        await holdAudit(db, claimed.audit_id, hold);
        report.ran.push({ audit_id: claimed.audit_id, step: claimed.step, outcome: 'held', error: hold });
        continue;
      }
      report.ran.push({ audit_id: claimed.audit_id, step: claimed.step, outcome: 'done' });
      if (def === steps[steps.length - 1]) report.finished.push(claimed.audit_id);
    } catch (err) {
      const why = message(err);
      const permanent = err instanceof PermanentStepError;
      if (!permanent && claimed.attempts < MAX_ATTEMPTS) {
        await db.from('marketing_audit_steps').update({ status: 'pending', error: why }).eq('id', claimed.id);
        report.ran.push({ audit_id: claimed.audit_id, step: claimed.step, outcome: 'retry', error: why });
        // Back off: leave the rest of this call to other steps or audits.
        break;
      }
      if (def.optional) {
        await db
          .from('marketing_audit_steps')
          .update({ status: 'skipped', error: why, finished_at: new Date().toISOString() })
          .eq('id', claimed.id);
        report.ran.push({ audit_id: claimed.audit_id, step: claimed.step, outcome: 'skipped', error: why });
      } else {
        await db
          .from('marketing_audit_steps')
          .update({ status: 'failed', error: why, finished_at: new Date().toISOString() })
          .eq('id', claimed.id);
        await failAudit(db, claimed.audit_id, `${def.label} failed: ${why}`);
        report.ran.push({ audit_id: claimed.audit_id, step: claimed.step, outcome: 'failed', error: why });
      }
    }
  }
  return report;
}
