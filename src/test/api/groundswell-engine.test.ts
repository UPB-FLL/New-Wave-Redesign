import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { MAX_ATTEMPTS, MIN_STEP_MS, runWorker, SAFETY_MS, startQueuedAudits } from '../../../api/_lib/groundswell/engine';
import { PermanentStepError, type StepDefinition } from '../../../api/_lib/groundswell/types';
import { sampleAudit } from './fixtures/groundswell-report';

/**
 * An in-memory stand-in for the two tables and two functions the engine uses,
 * claiming steps the way claim_next_audit_step does (lowest pending step whose
 * earlier steps are done or skipped).
 */
interface StepRow {
  id: string;
  audit_id: string;
  step: string;
  position: number;
  status: string;
  attempts: number;
  output: unknown;
  error: string | null;
}

function fakeDb(stepNames: string[]) {
  const audits = new Map<string, Record<string, unknown>>([[sampleAudit.id, { ...sampleAudit, status: 'running' }]]);
  const steps: StepRow[] = stepNames.map((step, i) => ({
    id: `s${i}`,
    audit_id: sampleAudit.id,
    step,
    position: i + 1,
    status: 'pending',
    attempts: 0,
    output: null,
    error: null,
  }));

  const claim = () => {
    const candidate = steps.find(
      (s) =>
        audits.get(s.audit_id)?.status === 'running' &&
        s.status === 'pending' &&
        steps.every((p) => p.audit_id !== s.audit_id || p.position >= s.position || ['done', 'skipped'].includes(p.status))
    );
    if (!candidate) return [];
    candidate.status = 'running';
    candidate.attempts += 1;
    return [{ ...candidate }];
  };

  const db = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      if (name === 'claim_next_audit_step') return { data: claim(), error: null };
      if (name === 'start_queued_audits') return { data: [{ start_queued_audits: 'a1' }, 'a2'], error: null, args };
      throw new Error(name);
    },
    from: (table: string) => {
      const filters: [string, unknown][] = [];
      let patch: Record<string, unknown> | null = null;
      const rows = () =>
        (table === 'marketing_audits' ? [...audits.values()] : (steps as unknown as Record<string, unknown>[])).filter((r) =>
          filters.every(([k, v]) => r[k] === v)
        );
      const chain = {
        select: () => chain,
        update: (p: Record<string, unknown>) => {
          patch = p;
          return chain;
        },
        eq: (k: string, v: unknown) => {
          filters.push([k, v]);
          return chain;
        },
        single: async () => ({ data: rows()[0] ?? null, error: rows()[0] ? null : { message: 'not found' } }),
        then: (resolve: (v: unknown) => void) => {
          if (patch) rows().forEach((r) => Object.assign(r, patch));
          resolve({ data: rows(), error: null });
        },
      };
      return chain;
    },
  };
  return { db: db as unknown as SupabaseClient, steps, audits };
}

const def = (name: string, run: StepDefinition['run'], optional = false): StepDefinition => ({
  name,
  current: 'Site',
  label: name,
  optional,
  run,
});

const plenty = () => Date.now() + 10 * 60_000;

describe('startQueuedAudits', () => {
  it('passes the step names in order and returns the ids it started', async () => {
    const { db } = fakeDb([]);
    const ids = await startQueuedAudits(db, [def('a', async () => 1), def('b', async () => 2)]);
    expect(ids).toEqual(['a1', 'a2']);
  });
});

describe('runWorker', () => {
  it('runs steps in order and hands each one the earlier outputs', async () => {
    const seen: Record<string, unknown>[] = [];
    const steps = [
      def('one', async (ctx) => (seen.push(ctx.outputs), { n: 1 })),
      def('two', async (ctx) => (seen.push(ctx.outputs), { n: 2 })),
    ];
    const { db, steps: rows } = fakeDb(['one', 'two']);
    const report = await runWorker(db, steps, { deadline: plenty() });
    expect(rows.map((r) => r.status)).toEqual(['done', 'done']);
    expect(seen).toEqual([{}, { one: { n: 1 } }]);
    expect(report.finished).toEqual([sampleAudit.id]);
  });

  it('retries a failing step on a later call, then skips it when optional', async () => {
    const steps = [def('flaky', async () => { throw new Error('timeout'); }, true), def('after', async () => 'ok')];
    const { db, steps: rows } = fakeDb(['flaky', 'after']);
    for (let i = 0; i < MAX_ATTEMPTS - 1; i++) {
      const r = await runWorker(db, steps, { deadline: plenty() });
      expect(r.ran).toEqual([{ audit_id: sampleAudit.id, step: 'flaky', outcome: 'retry', error: 'timeout' }]);
      expect(rows[0].status).toBe('pending');
    }
    await runWorker(db, steps, { deadline: plenty() });
    expect(rows.map((r) => r.status)).toEqual(['skipped', 'done']);
  });

  it('fails the audit at once on a permanent error in a required step', async () => {
    const steps = [def('site', async () => { throw new PermanentStepError('No website.'); }), def('after', async () => 'never')];
    const { db, steps: rows, audits } = fakeDb(['site', 'after']);
    await runWorker(db, steps, { deadline: plenty() });
    expect(rows.map((r) => r.status)).toEqual(['failed', 'pending']);
    expect(audits.get(sampleAudit.id)).toMatchObject({ status: 'failed', error: 'site failed: No website.' });
  });

  it('does not start a step without enough time left', async () => {
    let ran = false;
    const { db } = fakeDb(['one']);
    await runWorker(db, [def('one', async () => (ran = true))], { deadline: Date.now() + SAFETY_MS + MIN_STEP_MS - 1 });
    expect(ran).toBe(false);
  });
});
