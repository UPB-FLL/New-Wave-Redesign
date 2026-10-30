import { readinessChecks } from '../readiness.js';
import { ALL_STEPS } from '../steps.js';
import type { CollectContext, CollectResult, Collector, Observation } from './types.js';

/**
 * Where the agent looks. Each collector reads one part of the system and
 * turns what it finds into Observations with stable fingerprints; the agent
 * never reads a table itself. A collector that cannot finish throws, and the
 * agent reports that as an issue of its own instead of clearing the source.
 *
 * Adding a source: one more Collector here (or an external one posting to
 * the route with action `observe`), and resolvers for its kinds if any.
 */

/** How far back the collectors look at finished things. */
export const LOOKBACK_DAYS = 14;
const STALLED_MS = 2 * 60 * 60_000;
const QUEUED_LONG_MS = 60 * 60_000;
const WAITING_MS = 24 * 60 * 60_000;
const HEAD = 160;

const iso = (ms: number) => new Date(ms).toISOString();
const head = (text: unknown, n = HEAD) => String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const label = (step: string) => ALL_STEPS.find((s) => s.name === step)?.label ?? step;

/**
 * The part of an error that names the fault and not the instance: lower case,
 * ids, numbers and quoted names removed, the first 60 characters. Two audits
 * refused by the same provider for the same reason share one issue.
 */
export function errorKey(text: string): string {
  return head(text, 400)
    .toLowerCase()
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/"[^"]*"|'[^']*'|“[^”]*”/g, '')
    .replace(/\d+(\.\d+)?/g, '')
    .replace(/[^a-z ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

interface AuditLite {
  id: string;
  business_name: string;
  status: string;
  error: string | null;
  phase?: string | null;
  customer_id?: string | null;
  partner_id?: string | null;
  updated_at: string;
  created_at: string;
  started_at: string | null;
}
interface StepLite {
  audit_id: string;
  step: string;
  status: string;
  attempts: number;
  error: string | null;
  finished_at: string | null;
}
interface CompetitorStepLite {
  audit_id: string;
  finished_at: string | null;
  output: { competitors?: { name: string; website: string | null }[]; profile?: { category?: string | null; source?: string } | null; business?: { category?: string | null } | null; note?: string | null; dropped?: { name: string; reason: string }[] } | null;
}

/**
 * A delivered growth audit whose competitors were entered (or accepted from
 * intake's suggestions) while no category could be verified from the
 * business's own words: nothing checked that they compete. Six restaurant
 * pages were compared with a dog trainer on 2026-10-30 this way.
 */
export function unverifiedCompetitors(step: CompetitorStepLite): { names: string[]; why: string } | null {
  const out = step.output;
  const competitors = out?.competitors ?? [];
  if (!competitors.length) return null;
  const category = out?.profile?.category ?? out?.business?.category ?? null;
  if (category) return null;
  return { names: competitors.map((c) => c.name), why: out?.note ?? 'No category could be verified for the business, so the competitors were not checked.' };
}

async function rows<T>(query: PromiseLike<{ data: unknown; error: { message: string } | null }>, what: string): Promise<T[]> {
  const result = await query;
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return (result.data ?? []) as T[];
}

/** The audit engine: failed, held, stalled and long-queued runs, and the data steps skipped on delivered ones. */
export const runsCollector: Collector = {
  name: 'runs',
  sources: ['runs'],
  async collect({ db, now }: CollectContext): Promise<Observation[]> {
    const since = iso(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60_000);
    const audits = await rows<AuditLite>(
      db.from('marketing_audits').select('id,business_name,status,error,phase,customer_id,partner_id,updated_at,created_at,started_at').in('status', ['failed', 'review', 'running', 'queued', 'done']).gt('updated_at', since),
      'Could not read the runs'
    );
    if (!audits.length) return [];
    const steps = await rows<StepLite>(
      db.from('marketing_audit_steps').select('audit_id,step,status,attempts,error,finished_at').in('audit_id', audits.map((a) => a.id)).in('status', ['failed', 'skipped', 'running']),
      'Could not read the steps'
    );
    const out: Observation[] = [];
    const byAudit = (id: string) => steps.filter((s) => s.audit_id === id);
    const phaseOf = (a: AuditLite) => a.phase ?? 'audit';

    for (const a of audits) {
      const subjectBase = { audit_id: a.id, business: a.business_name, phase: phaseOf(a), customer_id: a.customer_id ?? null };
      if (a.status === 'failed') {
        const failed = byAudit(a.id).find((s) => s.status === 'failed');
        out.push({
          source: 'runs',
          kind: 'run_failed',
          fingerprint: `runs:run_failed:${a.id}`,
          severity: 'error',
          title: `${a.business_name}: the ${phaseOf(a)} run failed${failed ? ` at "${label(failed.step)}"` : ''}`,
          detail: head(a.error ?? failed?.error ?? 'No error text was recorded.', 600),
          subject: { ...subjectBase, step: failed?.step ?? null, step_label: failed ? label(failed.step) : null },
          evidence: { step_error: head(failed?.error, 600), attempts: failed?.attempts ?? null, skipped: byAudit(a.id).filter((s) => s.status === 'skipped').map((s) => s.step) },
          observed_at: a.updated_at,
        });
      } else if (a.status === 'review') {
        out.push({
          source: 'runs',
          kind: 'run_held',
          fingerprint: `runs:run_held:${a.id}`,
          severity: 'warning',
          title: `${a.business_name}: the ${phaseOf(a)} run is held for review`,
          detail: head(a.error ?? 'The verification passes disagreed, or the reviewer could not keep a sentence; a person decides whether to deliver the first read or check again.', 600),
          subject: subjectBase,
        });
      } else if (a.status === 'running' && now.getTime() - Date.parse(a.updated_at) > STALLED_MS) {
        out.push({
          source: 'runs',
          kind: 'run_stalled',
          fingerprint: `runs:run_stalled:${a.id}`,
          severity: 'warning',
          title: `${a.business_name}: the ${phaseOf(a)} run has not moved for ${Math.round((now.getTime() - Date.parse(a.updated_at)) / 3_600_000)} hours`,
          detail: `Started ${a.started_at ?? 'unknown'}, last change ${a.updated_at}. Steps still running: ${byAudit(a.id).filter((s) => s.status === 'running').map((s) => label(s.step)).join(', ') || 'none'}.`,
          subject: { ...subjectBase, updated_at: a.updated_at },
        });
      } else if (a.status === 'queued' && now.getTime() - Date.parse(a.created_at) > QUEUED_LONG_MS) {
        out.push({
          source: 'runs',
          kind: 'run_queued_long',
          fingerprint: `runs:run_queued_long:${a.id}`,
          severity: 'warning',
          title: `${a.business_name}: the ${phaseOf(a)} run has waited in the queue since ${a.created_at.slice(0, 16).replace('T', ' ')} UTC`,
          detail: 'The heartbeat starts queued runs on its own (up to three at once); a run still queued after an hour means the worker is not firing or the queue is full.',
          subject: { ...subjectBase, updated_at: a.updated_at },
        });
      }
    }

    // Delivered growth audits compared with competitors nobody verified.
    const delivered = audits.filter((a) => a.status === 'done' && phaseOf(a) === 'audit');
    if (delivered.length) {
      const competitorSteps = await rows<CompetitorStepLite>(
        db.from('marketing_audit_steps').select('audit_id,finished_at,output').in('audit_id', delivered.map((a) => a.id)).eq('step', 'competitors').eq('status', 'done'),
        'Could not read the competitor steps'
      );
      for (const s of competitorSteps) {
        const a = delivered.find((x) => x.id === s.audit_id);
        const found = unverifiedCompetitors(s);
        if (!a || !found) continue;
        out.push({
          source: 'runs',
          kind: 'competitors_unverified',
          fingerprint: `runs:competitors_unverified:${a.id}`,
          severity: 'warning',
          title: `${a.business_name}: its competitors were never verified as the same kind of business`,
          detail: `The delivered audit compares ${a.business_name} with ${found.names.slice(0, 6).join(', ')}${found.names.length > 6 ? ` and ${found.names.length - 6} more` : ''}. ${head(found.why, 300)}`,
          subject: { audit_id: a.id, business: a.business_name, phase: 'audit', customer_id: a.customer_id ?? null },
          evidence: { competitors: found.names.slice(0, 8) },
          observed_at: s.finished_at ?? a.updated_at,
        });
      }
    }

    // Data steps skipped on delivered runs, grouped by step and the fault's words.
    const groups = new Map<string, { step: string; error: string; audits: string[]; businesses: string[]; newest: string }>();
    for (const s of steps) {
      if (s.status !== 'skipped' || !s.error) continue;
      const audit = audits.find((a) => a.id === s.audit_id);
      if (!audit || audit.status !== 'done') continue;
      const key = `${s.step}:${errorKey(s.error)}`;
      const g = groups.get(key) ?? { step: s.step, error: s.error, audits: [], businesses: [], newest: '' };
      g.audits.push(s.audit_id);
      if ((s.finished_at ?? '') > g.newest) g.newest = s.finished_at ?? '';
      if (!g.businesses.includes(audit.business_name)) g.businesses.push(audit.business_name);
      groups.set(key, g);
    }
    for (const [key, g] of groups) {
      out.push({
        source: 'runs',
        kind: 'step_skipped',
        fingerprint: `runs:step_skipped:${key}`,
        severity: 'warning',
        title: `"${label(g.step)}" was skipped on ${g.audits.length} delivered run${g.audits.length === 1 ? '' : 's'}`,
        detail: head(g.error, 600),
        subject: { step: g.step, step_label: label(g.step), sample_audit_id: g.audits[0] },
        evidence: { runs: g.audits.length, businesses: g.businesses.slice(0, 6), audit_ids: g.audits.slice(0, 6) },
        observed_at: g.newest || undefined,
      });
    }
    return out;
  },
};

interface ActionLite {
  id: string;
  customer_id: string;
  service: string;
  title: string;
  status: string;
  error: string | null;
  attempts: number;
  blocked_by: string[] | null;
  updated_at: string;
}

/** Headway: actions that failed, and approved ones that have waited a day on something. */
export const headwayCollector: Collector = {
  name: 'headway',
  sources: ['headway'],
  async collect({ db, now }: CollectContext): Promise<Observation[]> {
    const since = iso(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60_000);
    const result = await db.from('groundswell_headway_actions').select('id,customer_id,service,title,status,error,attempts,blocked_by,updated_at').in('status', ['failed', 'approved']).gt('updated_at', since);
    if (result.error) {
      // Before the Headway migration there is nothing to watch.
      if (/relation .* does not exist|42P01/i.test(result.error.message)) return [];
      throw new Error(`Could not read the Headway actions: ${result.error.message}`);
    }
    const out: Observation[] = [];
    for (const a of (result.data ?? []) as ActionLite[]) {
      const subject = { action_id: a.id, action_title: a.title, customer_id: a.customer_id, service: a.service };
      if (a.status === 'failed') {
        out.push({ source: 'headway', kind: 'action_failed', fingerprint: `headway:action_failed:${a.id}`, severity: 'error', title: `Headway: "${a.title}" failed`, detail: head(a.error ?? 'No error text was recorded.', 600), subject, evidence: { attempts: a.attempts }, observed_at: a.updated_at });
      } else if (a.status === 'approved' && a.error && now.getTime() - Date.parse(a.updated_at) > WAITING_MS) {
        out.push({ source: 'headway', kind: 'action_waiting', fingerprint: `headway:action_waiting:${a.id}`, severity: 'warning', title: `Headway: "${a.title}" has waited more than a day`, detail: head(a.error, 600), subject, evidence: { blocked_by: a.blocked_by ?? [], attempts: a.attempts } });
      }
    }
    return out;
  },
};

/** The live readiness checks: every service that does not answer. GROUNDSWELL_AGENT_LIVE_CHECKS=off leaves them out. */
export const readinessCollector: Collector = {
  name: 'readiness',
  sources: ['readiness'],
  async collect(): Promise<Observation[]> {
    if ((process.env.GROUNDSWELL_AGENT_LIVE_CHECKS ?? '').trim().toLowerCase() === 'off') return [];
    const checks = await readinessChecks();
    return checks
      .filter((c) => !c.ok)
      .map((c) => ({
        source: 'readiness',
        kind: c.required ? 'service_required' : 'service_optional',
        fingerprint: `readiness:${c.key}`,
        severity: c.required ? 'error' : 'warning',
        title: `${c.label} is not answering`,
        detail: head(c.detail, 600),
        subject: { check: c.key, required: c.required ? 1 : 0 },
      }));
  },
};

export const COLLECTORS: readonly Collector[] = [runsCollector, headwayCollector, readinessCollector];

/** Runs every collector, each on its own: one that fails does not stop the others. */
export async function collectAll(ctx: CollectContext, collectors: readonly Collector[] = COLLECTORS): Promise<CollectResult[]> {
  return Promise.all(
    collectors.map(async (c) => {
      if (Date.now() > ctx.deadline) return { source: c.name, observations: [], error: 'The pass ran out of time before this source was read.' };
      try {
        return { source: c.name, observations: await c.collect(ctx) };
      } catch (err) {
        return { source: c.name, observations: [], error: err instanceof Error ? err.message : String(err) };
      }
    })
  );
}
