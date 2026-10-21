import type { SupabaseClient } from '@supabase/supabase-js';
import { isCheckOutput, isVerifyStep } from './verify.js';

/**
 * An admin's answer to an audit held in `review` (verify.ts could not vouch
 * for it): deliver it as it stands (the first read, with the reviewer's
 * corrections), or run its checks again from the second read. Either way the
 * audit goes back to `running` and the worker carries it on.
 */

export type ReviewAction = 'deliver' | 'recheck';

export class ReviewError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface StepRow {
  id: string;
  step: string;
  output: unknown;
}

export async function answerReview(db: SupabaseClient, auditId: unknown, action: unknown): Promise<ReviewAction> {
  if (typeof auditId !== 'string' || !UUID.test(auditId)) throw new ReviewError(400, 'Choose an audit.');
  if (action !== 'deliver' && action !== 'recheck') throw new ReviewError(400, 'Choose deliver or check again.');
  const { data: audit, error } = await db.from('marketing_audits').select('id,status').eq('id', auditId).single();
  if (error || !audit) throw new ReviewError(404, 'That audit no longer exists.');
  if ((audit as { status: string }).status !== 'review') throw new ReviewError(409, 'This audit is not waiting for review.');

  const { data, error: stepsError } = await db.from('marketing_audit_steps').select('id,step,output').eq('audit_id', auditId);
  if (stepsError) throw new Error(stepsError.message);
  const checks = ((data ?? []) as StepRow[]).filter((r) => isVerifyStep(r.step));

  if (action === 'deliver') {
    const held = checks
      .flatMap((r) => (isCheckOutput(r.output) && r.output.status === 'held' ? [{ id: r.id, output: r.output }] : []))
      .sort((a, b) => b.output.round - a.output.round)[0];
    if (!held) throw new ReviewError(409, 'This audit has no held check to deliver.');
    const { error: e } = await db
      .from('marketing_audit_steps')
      .update({ output: { ...held.output, released_at: new Date().toISOString() } })
      .eq('id', held.id);
    if (e) throw new Error(e.message);
  } else {
    const { error: e } = await db
      .from('marketing_audit_steps')
      .update({ status: 'pending', attempts: 0, output: null, error: null, started_at: null, finished_at: null })
      .in(
        'id',
        checks.map((r) => r.id)
      );
    if (e) throw new Error(e.message);
  }
  const { error: e } = await db.from('marketing_audits').update({ status: 'running', error: null }).eq('id', auditId).eq('status', 'review');
  if (e) throw new Error(e.message);
  return action;
}
