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

/** The step lists the queue starts runs with: by phase, and by kind for phase 1 (an older benchmark run). */
export type StepLists = Record<'audit' | 'benchmark' | 'competitors' | 'integrated', StepDefinition[]>;

const missingFunction = (error: { message: string; code?: string }) =>
  /could not find the function|function .* does not exist|PGRST202/i.test(`${error.message} ${error.code ?? ''}`);
const missingColumn = (message: string | undefined) => /column .* does not exist|42703/i.test(message ?? '');
const ids = (data: unknown) => ((data ?? []) as unknown[]).map((v) => (typeof v === 'string' ? v : Object.values(v as Record<string, string>)[0]));

/**
 * Starts queued runs, giving each the step list for its phase (start_queued_runs,
 * migration 20261029120000). Before that migration every run is phase 1 and
 * start_queued_audits gives it its kind's list.
 */
export async function startQueuedRuns(db: SupabaseClient, lists: StepLists, max = 3): Promise<string[]> {
  const step_lists = Object.fromEntries(Object.entries(lists).map(([key, steps]) => [key, steps.map((s) => s.name)]));
  const { data, error } = await db.rpc('start_queued_runs', { step_lists, max_audits: max });
  if (error && missingFunction(error)) return startQueuedAudits(db, lists.audit, max, lists.benchmark);
  if (error) throw new Error(`Could not start queued runs: ${error.message}`);
  return ids(data);
}

/** How many runs go at once: the shared accounts' rate limits and credits come first. */
export const MAX_RUNNING = 3;

/** Full auto: the heartbeat starts queued runs itself, unless GROUNDSWELL_AUTO_START is "off". */
export const autoStartEnabled = () => (process.env.GROUNDSWELL_AUTO_START ?? '').trim().toLowerCase() !== 'off';

/** Starts queued runs while fewer than `max` are running. */
export async function startWithinCapacity(db: SupabaseClient, lists: StepLists, max = MAX_RUNNING): Promise<string[]> {
  const { data, error } = await db.from('marketing_audits').select('id').eq('status', 'running').limit(max + 1);
  if (error) throw new Error(`Could not count running audits: ${error.message}`);
  const slots = max - ((data ?? []) as unknown[]).length;
  return slots > 0 ? startQueuedRuns(db, lists, slots) : [];
}

/** The longest chain of earlier phases a run reads (phase 3 reads phases 2 and 1). */
const MAX_SOURCES = 3;

type StepRowLite = { step: string; status: string; output: unknown; position: number };

async function stepRows(db: SupabaseClient, auditId: string): Promise<StepRowLite[]> {
  const { data, error } = await db.from('marketing_audit_steps').select('step,status,output,position').eq('audit_id', auditId);
  if (error) throw new Error(error.message);
  return ((data ?? []) as StepRowLite[]).sort((a, b) => a.position - b.position);
}

/** The runs a run builds on, oldest first (phase 1, then phase 2). */
async function sourceChain(db: SupabaseClient, sourceId: string | null | undefined, self: string): Promise<string[]> {
  const chain: string[] = [];
  const seen = new Set([self]);
  let next = sourceId ?? null;
  while (next && !seen.has(next) && chain.length < MAX_SOURCES) {
    seen.add(next);
    chain.unshift(next);
    const { data, error } = await db.from('marketing_audits').select('id,source_audit_id').eq('id', next);
    if (error) throw new Error(`Could not read the run this one builds on: ${error.message}`);
    next = ((data ?? []) as { id: string; source_audit_id?: string | null }[]).find((r) => r.id === next)?.source_audit_id ?? null;
  }
  return chain;
}

/**
 * The outputs of the run's finished steps laid over those of the runs it
 * builds on (each earlier phase's finished steps, oldest first), which of
 * them came from an earlier run, and the names of the run's own steps in order.
 */
async function loadSteps(
  db: SupabaseClient,
  auditId: string,
  sourceId?: string | null
): Promise<{ outputs: Record<string, unknown>; inherited: Record<string, string>; steps: string[] }> {
  const outputs: Record<string, unknown> = {};
  const inherited: Record<string, string> = {};
  for (const source of await sourceChain(db, sourceId, auditId)) {
    for (const r of await stepRows(db, source)) {
      if (r.status !== 'done') continue;
      outputs[r.step] = r.output;
      inherited[r.step] = source;
    }
  }
  const own = await stepRows(db, auditId);
  for (const r of own) {
    if (r.status !== 'done') continue;
    outputs[r.step] = r.output;
    delete inherited[r.step];
  }
  return { outputs, inherited, steps: own.map((r) => r.step) };
}

const RUN_COLUMNS = 'id,business_name,city,website,instagram,competitors,notes';
/** Read only where the database has them (migrations 20261022120000, 20261024130000, 20261029120000). */
const PHASE_COLUMNS = ',kind,partner_id,customer_id,phase,source_audit_id';

async function readRun(db: SupabaseClient, auditId: string) {
  const first = await db.from('marketing_audits').select(RUN_COLUMNS + PHASE_COLUMNS).eq('id', auditId).single();
  return first.error && missingColumn(first.error.message) ? db.from('marketing_audits').select(RUN_COLUMNS).eq('id', auditId).single() : first;
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
  {
    deadline,
    now = Date.now,
    startQueued,
  }: {
    deadline: number;
    now?: () => number;
    /** Full auto: starts queued runs (a phase the last one queued) when nothing is left to claim; once per idle spell. */
    startQueued?: () => Promise<string[]>;
  }
): Promise<WorkerReport> {
  const byName = new Map(steps.map((s) => [s.name, s]));
  const report: WorkerReport = { ran: [], finished: [] };
  const finishing = new Set(steps.filter((s) => s.name === 'deliver_finish'));
  let startedSinceIdle = false;

  while (deadline - now() > SAFETY_MS + MIN_STEP_MS) {
    const { data, error } = await db.rpc('claim_next_audit_step', { lease_seconds: 600 });
    if (error) throw new Error(`Could not claim a step: ${error.message}`);
    const claimed = ((data ?? []) as ClaimedStep[])[0];
    if (!claimed) {
      if (!startQueued || startedSinceIdle) break;
      startedSinceIdle = true;
      const started = await startQueued().catch((err) => {
        console.error('Groundswell could not start queued runs:', message(err));
        return [] as string[];
      });
      if (!started.length) break;
      continue;
    }
    startedSinceIdle = false;

    const def = byName.get(claimed.step);
    const { data: auditRow, error: auditError } = await readRun(db, claimed.audit_id);
    if (auditError || !auditRow || !def) {
      const why = !def ? `Unknown step "${claimed.step}"` : `Audit not found: ${auditError?.message ?? ''}`;
      await db.from('marketing_audit_steps').update({ status: 'failed', error: why, finished_at: new Date().toISOString() }).eq('id', claimed.id);
      await failAudit(db, claimed.audit_id, why);
      report.ran.push({ audit_id: claimed.audit_id, step: claimed.step, outcome: 'failed', error: why });
      continue;
    }

    try {
      const run = auditRow as unknown as AuditRow;
      const { outputs, inherited, steps: names } = await loadSteps(db, claimed.audit_id, run.source_audit_id);
      const branding = await loadBranding(db, claimed.audit_id);
      const output = await def.run({
        audit: { ...run, branding },
        outputs,
        inherited,
        steps: names,
        deadline: deadline - SAFETY_MS,
        attempt: claimed.attempts,
      });
      const patch = def.persist?.(output, run);
      if (patch && Object.keys(patch).length) {
        const { error: persistError } = await db.from('marketing_audits').update(patch).eq('id', claimed.audit_id);
        if (persistError) throw new Error(`Could not save the step's changes to the audit: ${persistError.message}`);
      }
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
      if (finishing.has(def) || def === steps[steps.length - 1]) report.finished.push(claimed.audit_id);
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
