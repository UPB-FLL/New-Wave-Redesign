import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { FUNCTION_SECONDS } from '../../../api/_lib/groundswell/background';
import { MAX_ATTEMPTS, MIN_STEP_MS, runWorker, SAFETY_MS, startQueuedAudits } from '../../../api/_lib/groundswell/engine';
import { ALL_STEPS, SOCIAL_NEEDS_MS, STEPS } from '../../../api/_lib/groundswell/steps';
import { POSTS_NEEDS_MS } from '../../../api/_lib/groundswell/posts';
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

function fakeDb(stepNames: string[], { refuse }: { refuse?: (table: string, patch: Record<string, unknown>) => boolean } = {}) {
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
          // A CHECK constraint the database does not have yet (a status before its migration).
          if (patch && refuse?.(table, patch)) return resolve({ data: null, error: { message: 'new row violates check constraint' } });
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

/** A query builder whose updates fail with a connection error; reads still work. */
function brokenUpdate<T extends object>(chain: T): T {
  const c = chain as unknown as Record<string, unknown>;
  return new Proxy(c, {
    get(target, key) {
      if (key !== 'update') return target[key as string];
      return () => ({ eq: () => ({ then: (resolve: (v: unknown) => void) => resolve({ data: null, error: { message: 'connection reset' } }) }) });
    },
  }) as unknown as T;
}

describe('startQueuedAudits', () => {
  it('passes the step names in order and returns the ids it started', async () => {
    const { db } = fakeDb([]);
    const ids = await startQueuedAudits(db, [def('a', async () => 1), def('b', async () => 2)]);
    expect(ids).toEqual(['a1', 'a2']);
  });
});

describe('runWorker', () => {
  it('writes a step\'s persisted fields to the audit row before the next step reads it', async () => {
    const seen: unknown[] = [];
    const picked = [{ name: 'Rival', website: 'https://rival.example', instagram: null }];
    const steps: StepDefinition[] = [
      { ...def('competitors', async () => ({ competitors: picked })), persist: (out) => ({ competitors: (out as { competitors: typeof picked }).competitors }) },
      def('site', async (ctx) => (seen.push(ctx.audit.competitors), 'ok')),
    ];
    const { db, audits } = fakeDb(['competitors', 'site']);
    await runWorker(db, steps, { deadline: plenty() });
    expect(audits.get(sampleAudit.id)?.competitors).toEqual(picked);
    expect(seen).toEqual([picked]);
  });

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

  it('gives up a step whose calls died mid-flight MAX_ATTEMPTS times instead of claiming it for ever', async () => {
    // A call cut off by the function's time limit writes nothing: the lease runs out and the claim hands the
    // step out again with attempts + 1. Three such leases are the limit, like three failures.
    const ran: string[] = [];
    const steps = [def('social', async () => { ran.push('social'); return 'x'; }, true), def('after', async () => 'ok')];
    const { db, steps: rows } = fakeDb(['social', 'after']);
    rows[0].attempts = MAX_ATTEMPTS;
    const r = await runWorker(db, steps, { deadline: plenty() });
    expect(ran).toEqual([]);
    expect(rows.map((x) => x.status)).toEqual(['skipped', 'done']);
    expect(rows[0].error).toBe("The step ran out the worker's time limit 3 times without finishing.");
    expect(r.ran[0]).toEqual({ audit_id: sampleAudit.id, step: 'social', outcome: 'skipped', error: rows[0].error });

    const required = [def('model', async () => { ran.push('model'); return 'x'; }), def('after', async () => 'ok')];
    const second = fakeDb(['model', 'after']);
    second.steps[0].attempts = MAX_ATTEMPTS;
    await runWorker(second.db, required, { deadline: plenty() });
    expect(ran).toEqual([]);
    expect(second.steps.map((x) => x.status)).toEqual(['failed', 'pending']);
    expect(second.audits.get(sampleAudit.id)).toMatchObject({ status: 'failed', error: "model failed: The step ran out the worker's time limit 3 times without finishing." });
  });

  it('hands a long step back uncounted when the call cannot give it the time it wants, and runs it as the next call\'s first step', async () => {
    const ran: string[] = [];
    const social = { ...def('social', async () => { ran.push('social'); return 'x'; }, true), needsMs: 180_000 };
    const steps = [def('site', async () => { ran.push('site'); return 'ok'; }), social, def('after', async () => { ran.push('after'); return 'ok'; })];
    const { db, steps: rows } = fakeDb(['site', 'social', 'after']);
    // A call with time for one short step and a little over the minimum: site runs, social is handed back.
    const start = Date.now();
    const clock = [start, start, start + 120_000];
    const now = () => clock.shift() ?? start + 120_000;
    const first = await runWorker(db, steps, { deadline: start + 120_000 + SAFETY_MS + MIN_STEP_MS + 10_000, now });
    expect(ran).toEqual(['site']);
    expect(first.ran.map((r) => [r.step, r.outcome])).toEqual([['site', 'done'], ['social', 'deferred']]);
    expect(rows[1]).toMatchObject({ status: 'pending', attempts: 0, error: null });
    // The next call starts with the social step and has the whole call for it.
    await runWorker(db, steps, { deadline: plenty() });
    expect(ran).toEqual(['site', 'social', 'after']);
    expect(rows.map((r) => r.status)).toEqual(['done', 'done', 'done']);
    expect(rows[1].attempts).toBe(1);
  });

  it('lets the social step ask for most of a call, and no more than a fresh call can give', () => {
    expect(STEPS.find((s) => s.name === 'social')?.needsMs).toBe(SOCIAL_NEEDS_MS);
    // A fresh call's step deadline is FUNCTION_SECONDS less the route's and the engine's margins; leave a minute for the steps before it.
    expect(SOCIAL_NEEDS_MS).toBeLessThanOrEqual(FUNCTION_SECONDS * 1000 - 10_000 - SAFETY_MS - 60_000);
    // The posts step (phase 2) prints images and may wait on an image model: it asks for a call of its own too.
    expect(POSTS_NEEDS_MS).toBeLessThanOrEqual(FUNCTION_SECONDS * 1000 - 10_000 - SAFETY_MS - 60_000);
    expect(ALL_STEPS.filter((s) => s.needsMs).map((s) => [s.name, s.needsMs])).toEqual([
      ['posts', POSTS_NEEDS_MS],
      ['social', SOCIAL_NEEDS_MS],
    ]);
  });

  it('runs a long step as a call\'s first step however little the call has left, so it never waits for ever', async () => {
    const ran: string[] = [];
    const steps = [{ ...def('social', async () => { ran.push('social'); return 'x'; }, true), needsMs: 10 * 60_000 }, def('after', async () => 'ok')];
    const { db, steps: rows } = fakeDb(['social', 'after']);
    await runWorker(db, steps, { deadline: Date.now() + SAFETY_MS + MIN_STEP_MS + 5_000 });
    expect(ran).toEqual(['social']);
    expect(rows[0].status).toBe('done');
  });

  it('fails the audit at once on a permanent error in a required step', async () => {
    const steps = [def('site', async () => { throw new PermanentStepError('No website.'); }), def('after', async () => 'never')];
    const { db, steps: rows, audits } = fakeDb(['site', 'after']);
    await runWorker(db, steps, { deadline: plenty() });
    expect(rows.map((r) => r.status)).toEqual(['failed', 'pending']);
    expect(audits.get(sampleAudit.id)).toMatchObject({ status: 'failed', error: 'site failed: No website.' });
  });

  it('hands each step the names of all the audit\'s steps, in order', async () => {
    const seen: (string[] | undefined)[] = [];
    const { db } = fakeDb(['one', 'two']);
    await runWorker(db, [def('one', async (ctx) => seen.push(ctx.steps)), def('two', async (ctx) => seen.push(ctx.steps))], { deadline: plenty() });
    expect(seen).toEqual([['one', 'two'], ['one', 'two']]);
  });

  it('holds the audit for a person when a step asks, and runs nothing after it', async () => {
    let after = false;
    const steps = [def('check', async () => ({ status: 'held', hold: 'The figures moved.' })), def('deliver', async () => (after = true))];
    const { db, steps: rows, audits } = fakeDb(['check', 'deliver']);
    const report = await runWorker(db, steps, { deadline: plenty() });
    expect(rows.map((r) => r.status)).toEqual(['done', 'pending']);
    expect(rows[0].output).toEqual({ status: 'held', hold: 'The figures moved.' });
    expect(audits.get(sampleAudit.id)).toMatchObject({ status: 'review', error: 'The figures moved.' });
    expect(report.ran).toEqual([{ audit_id: sampleAudit.id, step: 'check', outcome: 'held', error: 'The figures moved.' }]);
    expect(after).toBe(false);
  });

  it('fails a held audit with the reason before the review status exists, so nothing is delivered', async () => {
    const steps = [def('check', async () => ({ hold: 'The figures moved.' })), def('deliver', async () => 'never')];
    const { db, audits } = fakeDb(['check', 'deliver'], { refuse: (table, patch) => table === 'marketing_audits' && patch.status === 'review' });
    await runWorker(db, steps, { deadline: plenty() });
    expect(audits.get(sampleAudit.id)).toMatchObject({ status: 'failed', error: 'Needs review: The figures moved.' });
  });

  it('retries the step, rather than failing the audit, when holding it fails for another reason', async () => {
    const steps = [def('check', async () => ({ hold: 'The figures moved.' })), def('deliver', async () => 'never')];
    const { db, steps: rows, audits } = fakeDb(['check', 'deliver']);
    const flaky = { ...db, from: (t: string) => (t === 'marketing_audits' ? brokenUpdate(db.from(t)) : db.from(t)) } as unknown as typeof db;
    const report = await runWorker(flaky, steps, { deadline: plenty() });
    expect(report.ran[0]).toMatchObject({ step: 'check', outcome: 'retry', error: 'Could not hold the audit for review: connection reset' });
    expect(rows[0].status).toBe('pending');
    expect(audits.get(sampleAudit.id)).toMatchObject({ status: 'running' });
  });

  it('does not start a step without enough time left', async () => {
    let ran = false;
    const { db } = fakeDb(['one']);
    await runWorker(db, [def('one', async () => (ran = true))], { deadline: Date.now() + SAFETY_MS + MIN_STEP_MS - 1 });
    expect(ran).toBe(false);
  });
});
