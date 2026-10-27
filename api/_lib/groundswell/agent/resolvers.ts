import type { SupabaseClient } from '@supabase/supabase-js';
import { answerReview, ReviewError } from '../review.js';
import type { Db, IssueRow, Resolver } from './types.js';

/**
 * The resolutions the agent may apply, each after a person approves it in the
 * report. Every one is an operational row change the engine already knows how
 * to carry on from (the same moves staff make by hand on the admin screens),
 * reversible, and checked on a later pass. Nothing here edits code, runs a
 * provider tool, or touches a client's account.
 */

const str = (v: unknown) => (typeof v === 'string' && v ? v : null);
const UUID = /^[0-9a-f-]{36}$/i;
const auditOf = (issue: Pick<IssueRow, 'subject'>) => {
  const id = str(issue.subject.audit_id);
  return id && UUID.test(id) ? id : null;
};

async function auditStatus(db: Db, id: string): Promise<string | null> {
  const { data } = await db.from('marketing_audits').select('id,status').eq('id', id).maybeSingle();
  return (data as { status?: string } | null)?.status ?? null;
}

/** A failed run whose failing step is re-queued: the heartbeat runs it again and the delivery goes on. */
const requeueStep: Resolver = {
  key: 'requeue_step',
  label: 'Run the failed step again',
  applies: (issue) => issue.source === 'runs' && issue.kind === 'run_failed' && Boolean(auditOf(issue) && str(issue.subject.step)),
  describe: (issue) => ({
    change: `The run for ${str(issue.subject.business) ?? 'the business'} goes back to running and its "${str(issue.subject.step_label) ?? str(issue.subject.step)}" step is queued again with its attempts reset; the steps already finished are kept, so nothing is re-read or re-printed.`,
    rollback: 'If it fails again the run is marked failed once more, as it is now, with the new error; nothing already delivered changes.',
  }),
  async apply(db, issue) {
    const id = auditOf(issue)!;
    const step = str(issue.subject.step)!;
    const status = await auditStatus(db, id);
    if (status === null) return { ok: false, note: 'That run is no longer there.' };
    if (status !== 'failed') return { ok: false, note: `The run is ${status} now, not failed; nothing to re-queue.` };
    const stepUpdate = await db
      .from('marketing_audit_steps')
      .update({ status: 'pending', attempts: 0, error: null, started_at: null, finished_at: null })
      .eq('audit_id', id)
      .eq('step', step)
      .eq('status', 'failed');
    if (stepUpdate.error) return { ok: false, note: `Could not re-queue the step: ${stepUpdate.error.message}` };
    const auditUpdate = await db.from('marketing_audits').update({ status: 'running', error: null, completed_at: null }).eq('id', id).eq('status', 'failed');
    if (auditUpdate.error) return { ok: false, note: `Could not set the run running: ${auditUpdate.error.message}` };
    return { ok: true, note: `Step "${step}" queued again; the run is running.`, wakeWorker: true };
  },
  async verify(db, issue) {
    const status = await auditStatus(db, auditOf(issue)!);
    if (status === 'done') return 'worked';
    if (status === 'failed') return 'failed';
    return 'pending';
  },
};

/** A run held for review: deliver the first read, as the admin screen's "Deliver anyway". */
const releaseReview: Resolver = {
  key: 'release_review',
  label: 'Deliver the held run as it was first read',
  applies: (issue) => issue.source === 'runs' && issue.kind === 'run_held' && Boolean(auditOf(issue)),
  describe: (issue) => ({
    change: `The run for ${str(issue.subject.business) ?? 'the business'} is released from review and its reports are printed from the first read, reviewed, the way "Deliver anyway" does on the run queue.`,
    rollback: 'The reports are stored with the run and can be re-run from the workspace; the held figures stay on the run for staff to read.',
  }),
  async apply(db, issue) {
    try {
      await answerReview(db as SupabaseClient, auditOf(issue), 'deliver');
      return { ok: true, note: 'Released; the delivery steps run next.', wakeWorker: true };
    } catch (err) {
      return { ok: false, note: err instanceof ReviewError ? err.message : `Could not release the run: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
  async verify(db, issue) {
    const status = await auditStatus(db, auditOf(issue)!);
    if (status === 'done') return 'worked';
    if (status === 'failed' || status === 'review') return 'failed';
    return 'pending';
  },
};

/** A run held for review: read the sources again and compare once more, as "Run the checks again". */
const recheckReview: Resolver = {
  key: 'recheck_review',
  label: 'Read the sources again and re-check the held run',
  applies: releaseReview.applies,
  describe: (issue) => ({
    change: `The run for ${str(issue.subject.business) ?? 'the business'} reads its sources again and compares the figures once more before anything is delivered.`,
    rollback: 'If the passes still disagree the run is held again, as it is now.',
  }),
  async apply(db, issue) {
    try {
      await answerReview(db as SupabaseClient, auditOf(issue), 'recheck');
      return { ok: true, note: 'The verification rounds are queued again.', wakeWorker: true };
    } catch (err) {
      return { ok: false, note: err instanceof ReviewError ? err.message : `Could not re-check the run: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
  verify: releaseReview.verify,
};

/** A run that has not moved: the heartbeat is poked; the engine reclaims any lapsed lease itself. */
const wakeWorker: Resolver = {
  key: 'wake_worker',
  label: 'Wake the worker',
  applies: (issue) => issue.source === 'runs' && (issue.kind === 'run_stalled' || issue.kind === 'run_queued_long') && Boolean(auditOf(issue)),
  describe: () => ({
    change: 'The worker is called now instead of waiting for the next heartbeat; a step whose lease ran out is claimed again by the engine’s own rules.',
    rollback: 'Nothing to undo: the call does what the per-minute heartbeat does.',
  }),
  async apply() {
    return { ok: true, note: 'The worker was woken.', wakeWorker: true };
  },
  async verify(db, issue) {
    const { data } = await db.from('marketing_audits').select('id,status,updated_at').eq('id', auditOf(issue)!).maybeSingle();
    const row = data as { status?: string; updated_at?: string } | null;
    if (!row) return 'failed';
    if (row.status === 'done') return 'worked';
    if (row.status === 'failed' || row.status === 'review') return 'worked';
    const seen = str(issue.subject.updated_at);
    return seen && row.updated_at && row.updated_at > seen ? 'worked' : 'pending';
  },
};

/** A Headway action that failed: approved again with its attempts reset, as the panel's "Try again". */
const retryAction: Resolver = {
  key: 'retry_action',
  label: 'Try the action again',
  applies: (issue) => issue.source === 'headway' && issue.kind === 'action_failed' && Boolean(str(issue.subject.action_id)),
  describe: (issue) => ({
    change: `The Headway action "${str(issue.subject.action_title) ?? 'the action'}" is approved again and the worker applies it on the next heartbeat, as the client's own linked account, with its attempts reset.`,
    rollback: 'If it fails again it is marked failed once more with the new error; an action that applied is recorded as applied and is not run twice.',
  }),
  async apply(db, issue) {
    const id = str(issue.subject.action_id)!;
    const { data } = await db.from('groundswell_headway_actions').select('id,status').eq('id', id).maybeSingle();
    const status = (data as { status?: string } | null)?.status;
    if (!status) return { ok: false, note: 'That action is no longer there.' };
    if (status !== 'failed') return { ok: false, note: `The action is ${status} now, not failed.` };
    const { error } = await db.from('groundswell_headway_actions').update({ status: 'approved', attempts: 0, error: null, lease_until: null }).eq('id', id).eq('status', 'failed');
    if (error) return { ok: false, note: `Could not re-approve the action: ${error.message}` };
    return { ok: true, note: 'Approved again; the worker applies it next.', wakeWorker: true };
  },
  async verify(db, issue) {
    const { data } = await db.from('groundswell_headway_actions').select('id,status').eq('id', str(issue.subject.action_id)!).maybeSingle();
    const status = (data as { status?: string } | null)?.status;
    if (status === 'applied' || status === 'done') return 'worked';
    if (status === 'failed') return 'failed';
    if (!status) return 'failed';
    return 'pending';
  },
};

/**
 * Something a person fixes outside the app (a key, an account, a credit
 * balance): the issue is marked handled, and the next pass checks whether
 * the observation is really gone.
 */
const acknowledge: Resolver = {
  key: 'acknowledge',
  label: 'Mark as handled outside the app',
  applies: (issue) => issue.source === 'readiness' || issue.kind === 'step_skipped' || issue.kind === 'action_waiting' || issue.source.startsWith('external:'),
  describe: () => ({
    change: 'Nothing changes in the app: the issue is marked handled, and the next pass checks whether it is really gone. If it comes back it is reported again.',
    rollback: 'Nothing to undo.',
  }),
  async apply() {
    return { ok: true, note: 'Marked handled; the next pass checks.' };
  },
  async verify() {
    // The store decides: an acknowledged issue seen again on a later pass reopens and the lesson is recorded as failed.
    return 'pending';
  },
};

export const RESOLVERS: readonly Resolver[] = [requeueStep, releaseReview, recheckReview, wakeWorker, retryAction, acknowledge];

export const resolverByKey = (key: string | null | undefined): Resolver | undefined => RESOLVERS.find((r) => r.key === key);

/** The resolvers that can act on an issue at all, in registry order. */
export function applicableResolvers(issue: Pick<IssueRow, 'source' | 'kind' | 'subject'>): Resolver[] {
  return RESOLVERS.filter((r) => r.applies(issue));
}
