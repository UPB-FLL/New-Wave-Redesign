import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { runWorker, startQueuedRuns, startWithinCapacity, type StepLists } from '../../../api/_lib/groundswell/engine';
import { integratedReady, queueNextPhase, queuePhase } from '../../../api/_lib/groundswell/phases';
import { ALL_STEPS, COMPETITOR_STEPS, INTEGRATED_STEPS, PHASE_STEPS, STEPS } from '../../../api/_lib/groundswell/steps';
import type { StepContext, StepDefinition } from '../../../api/_lib/groundswell/types';
import { nextPhase, PHASE_INFO, PHASES } from '../../../src/lib/groundswellValidation';
import { fakeSupabase } from './fixtures/fakeSupabase';

/**
 * Groundswell's three phases: each its own run, starting from the outputs of
 * the run it builds on, queued one after another without anyone pressing a
 * button (migration 20261029120000).
 */

type Row = Record<string, unknown>;

/** The engine's tables and functions in memory, for several runs at once. */
function engineDb(audits: Row[], steps: Row[]) {
  const claim = () => {
    const runnable = steps.find(
      (s) =>
        audits.find((a) => a.id === s.audit_id)?.status === 'running' &&
        s.status === 'pending' &&
        steps.every((p) => p.audit_id !== s.audit_id || (p.position as number) >= (s.position as number) || ['done', 'skipped'].includes(p.status as string))
    );
    if (!runnable) return [];
    runnable.status = 'running';
    runnable.attempts = ((runnable.attempts as number) ?? 0) + 1;
    return [{ ...runnable }];
  };
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
    if (name === 'claim_next_audit_step') return { data: claim(), error: null };
    if (name === 'start_queued_runs') {
      const started: string[] = [];
      for (const a of audits.filter((x) => x.status === 'queued').slice(0, args.max_audits as number)) {
        a.status = 'running';
        const lists = args.step_lists as Record<string, string[]>;
        const names = a.phase !== 'audit' ? lists[a.phase as string] : lists.audit;
        names.forEach((step, i) => steps.push({ id: `${a.id}-${step}`, audit_id: a.id, step, position: i + 1, status: 'pending', attempts: 0, output: null }));
        started.push(a.id as string);
      }
      return { data: started, error: null };
    }
    throw new Error(name);
  });
  const from = (table: string) => {
    const filters: [string, unknown][] = [];
    let patch: Row | null = null;
    const rows = () => (table === 'marketing_audits' ? audits : steps).filter((r) => filters.every(([k, v]) => r[k] === v));
    const chain = {
      select: () => chain,
      update: (p: Row) => {
        patch = p;
        return chain;
      },
      eq: (k: string, v: unknown) => {
        filters.push([k, v]);
        return chain;
      },
      limit: () => chain,
      single: async () => ({ data: rows()[0] ?? null, error: rows()[0] ? null : { message: 'not found' } }),
      then: (resolve: (v: unknown) => void) => {
        if (patch) rows().forEach((r) => Object.assign(r, patch));
        resolve({ data: rows(), error: null });
      },
    };
    return chain;
  };
  return { db: { rpc, from } as unknown as SupabaseClient, rpc };
}

const audit = (id: string, over: Row = {}): Row => ({ id, business_name: 'Transmissions Unlimited', city: 'North Miami Beach, FL', website: 'https://transmissionsunlimitedfl.com', instagram: null, competitors: [], notes: null, status: 'running', phase: 'audit', source_audit_id: null, ...over });
const done = (audit_id: string, step: string, position: number, output: unknown): Row => ({ id: `${audit_id}-${step}`, audit_id, step, position, status: 'done', attempts: 1, output });
const def = (name: string, run: StepDefinition['run']): StepDefinition => ({ name, current: 'Model', label: name, optional: false, run });

describe('a phase starts from the runs it builds on', () => {
  it('phase 3 reads phases 1 and 2, its own outputs win, and it knows which came from where', async () => {
    const seen: StepContext[] = [];
    const { db } = engineDb(
      [audit('p1', { status: 'done' }), audit('p2', { status: 'done', phase: 'competitors', source_audit_id: 'p1' }), audit('p3', { phase: 'integrated', source_audit_id: 'p2' })],
      [
        done('p1', 'site', 1, { from: 'p1' }),
        done('p1', 'adplan', 2, { from: 'p1' }),
        done('p2', 'adsets', 1, { from: 'p2' }),
        done('p2', 'creative', 2, { from: 'p2' }),
        done('p3', 'linked', 1, { from: 'p3' }),
        { id: 'p3-adsets', audit_id: 'p3', step: 'adsets', position: 2, status: 'pending', attempts: 0, output: null },
      ]
    );
    const report = await runWorker(db, [def('adsets', async (ctx) => (seen.push(ctx), { from: 'p3' }))], { deadline: Date.now() + 600_000 });
    expect(report.ran).toEqual([{ audit_id: 'p3', step: 'adsets', outcome: 'done' }]);
    const ctx = seen[0];
    expect(ctx.audit).toMatchObject({ id: 'p3', phase: 'integrated', source_audit_id: 'p2' });
    expect(ctx.outputs).toMatchObject({ site: { from: 'p1' }, adplan: { from: 'p1' }, adsets: { from: 'p2' }, creative: { from: 'p2' }, linked: { from: 'p3' } });
    expect(ctx.inherited).toEqual({ site: 'p1', adplan: 'p1', adsets: 'p2', creative: 'p2' });
    // The run's own step list, not its sources'.
    expect(ctx.steps).toEqual(['linked', 'adsets']);
  });

  it('a source chain that loops back is read once', async () => {
    const seen: StepContext[] = [];
    const { db } = engineDb(
      [audit('a', { status: 'done', source_audit_id: 'b' }), audit('b', { phase: 'competitors', source_audit_id: 'a' })],
      [done('a', 'site', 1, { from: 'a' }), { id: 'b-x', audit_id: 'b', step: 'x', position: 1, status: 'pending', attempts: 0, output: null }]
    );
    await runWorker(db, [def('x', async (ctx) => (seen.push(ctx), {}))], { deadline: Date.now() + 600_000 });
    expect(seen[0].outputs).toEqual({ site: { from: 'a' } });
  });
});

describe('starting queued runs', () => {
  const lists = PHASE_STEPS as StepLists;

  it('gives each run its phase\'s steps', async () => {
    const audits = [audit('q1', { status: 'queued' }), audit('q2', { status: 'queued', phase: 'competitors', source_audit_id: 'x' })];
    const steps: Row[] = [];
    const { db, rpc } = engineDb(audits, steps);
    expect(await startQueuedRuns(db, lists, 3)).toEqual(['q1', 'q2']);
    expect(rpc.mock.calls[0][1].step_lists).toEqual({
      audit: STEPS.map((s) => s.name),
      benchmark: PHASE_STEPS.benchmark.map((s) => s.name),
      competitors: COMPETITOR_STEPS.map((s) => s.name),
      integrated: INTEGRATED_STEPS.map((s) => s.name),
    });
    expect(steps.filter((s) => s.audit_id === 'q2').map((s) => s.step)).toEqual(COMPETITOR_STEPS.map((s) => s.name));
  });

  it('falls back to the kind-based start before the phases migration', async () => {
    const rpc = vi.fn(async (name: string) =>
      name === 'start_queued_runs' ? { data: null, error: { message: 'Could not find the function public.start_queued_runs(max_audits, step_lists)', code: 'PGRST202' } } : { data: ['a1'], error: null }
    );
    expect(await startQueuedRuns({ rpc } as unknown as SupabaseClient, lists, 2)).toEqual(['a1']);
    expect(rpc.mock.calls[1]).toEqual(['start_queued_audits', { step_names: STEPS.map((s) => s.name), max_audits: 2, benchmark_step_names: PHASE_STEPS.benchmark.map((s) => s.name) }]);
  });

  it('keeps no more than three running at once', async () => {
    const running = [audit('r1'), audit('r2')];
    const queued = [audit('q1', { status: 'queued' }), audit('q2', { status: 'queued' })];
    const { db } = engineDb([...running, ...queued], []);
    expect(await startWithinCapacity(db, lists)).toEqual(['q1']);
    expect(await startWithinCapacity(db, lists)).toEqual([]);
  });

  it('an idle worker starts what is queued once per idle spell, then runs it', async () => {
    const audits = [audit('q1', { status: 'queued' })];
    const steps: Row[] = [];
    const { db } = engineDb(audits, steps);
    const startQueued = vi.fn(() => startQueuedRuns(db, { ...lists, audit: [def('only', async () => ({}))] }, 3));
    const report = await runWorker(db, [def('only', async () => ({ ok: true }))], { deadline: Date.now() + 600_000, startQueued });
    expect(report.ran).toEqual([{ audit_id: 'q1', step: 'only', outcome: 'done' }]);
    // Once to start q1, once more when idle again (nothing left), then it stops.
    expect(startQueued).toHaveBeenCalledTimes(2);
  });
});

describe('queueing the next phase', () => {
  const seed = (over: Row = {}, customer: Row = { id: 'c1', stage: 'prospect' }, accounts: Row[] = []) =>
    fakeSupabase({
      marketing_audits: [
        { id: 'p1', business_name: 'Flow & Mills', city: 'Delray Beach, FL', website: null, instagram: 'flowandmills', competitors: [{ name: 'Rival', website: 'https://rival.example', instagram: null }], notes: 'n', partner_id: 'partner-a', customer_id: 'c1', requested_by: null, brand_logo_url: null, brand_color: '#cc0000', status: 'done', phase: 'audit', ...over },
      ],
      groundswell_customers: [customer],
      groundswell_client_accounts: accounts,
    });

  it('phase 1 delivering queues phase 2 with the business\'s details, its partner and customer, once', async () => {
    const { client, tables } = seed();
    const first = await queueNextPhase(client as never, { id: 'p1', phase: 'audit', customer_id: 'c1' });
    expect(first).toMatchObject({ phase: 'competitors', reason: 'Phase 2 queued.' });
    const queued = tables.marketing_audits.find((a) => a.id === first.queued)!;
    expect(queued).toMatchObject({ status: 'queued', phase: 'competitors', source_audit_id: 'p1', partner_id: 'partner-a', customer_id: 'c1', business_name: 'Flow & Mills', instagram: 'flowandmills', brand_color: '#cc0000', kind: 'audit' });
    expect(queued.competitors).toEqual([{ name: 'Rival', website: 'https://rival.example', instagram: null }]);
    const again = await queueNextPhase(client as never, { id: 'p1', phase: 'audit', customer_id: 'c1' });
    expect(again).toMatchObject({ queued: first.queued, reason: 'Phase 2 is already queued.' });
    expect(tables.marketing_audits.filter((a) => a.phase === 'competitors')).toHaveLength(1);
  });

  it('phase 3 waits for a client with a linked account, and says why', async () => {
    let { client } = seed({ phase: 'competitors' });
    expect(await queueNextPhase(client as never, { id: 'p1', phase: 'competitors', customer_id: 'c1' })).toMatchObject({ queued: null, reason: 'Phase 3 is for clients: mark the business as a client first.' });
    ({ client } = seed({ phase: 'competitors' }, { id: 'c1', stage: 'client' }, [{ id: 'x', customer_id: 'c1', status: 'expired' }]));
    expect((await queueNextPhase(client as never, { id: 'p1', phase: 'competitors', customer_id: 'c1' })).reason).toMatch(/No linked account yet/);
    ({ client } = seed({ phase: 'competitors' }, { id: 'c1', stage: 'client' }, [{ id: 'x', customer_id: 'c1', status: 'active' }]));
    expect(await queueNextPhase(client as never, { id: 'p1', phase: 'competitors', customer_id: 'c1' })).toMatchObject({ phase: 'integrated', reason: 'Phase 3 queued.' });
  });

  it('refuses a source that has not delivered, a phase out of order, and anything after the last', async () => {
    const { client } = seed({ status: 'running' });
    expect((await queuePhase(client as never, 'p1', 'competitors')).reason).toBe('Phase 1 has not delivered yet.');
    expect((await queuePhase(client as never, 'p1', 'integrated')).reason).toBe('Phase 3 builds on phase 2.');
    expect(await queueNextPhase(client as never, { id: 'p1', phase: 'integrated', customer_id: 'c1' })).toEqual({ queued: null, phase: null, reason: 'This was the last phase.' });
  });

  it('before the migration, says phases are not set up instead of failing', async () => {
    const { client } = fakeSupabase({ marketing_audits: [{ id: 'p1', status: 'done' }] }, { marketing_audits: ['phase'] });
    expect(await queueNextPhase(client as never, { id: 'p1', phase: 'audit', customer_id: null })).toMatchObject({ queued: null, reason: 'Phases are not set up yet. Try again later.' });
    expect(await integratedReady(client as never, null)).toMatchObject({ ok: false });
  });
});

describe('the phases as steps', () => {
  it('phase 1 reads public data only; phase 2 builds the ad sets; phase 3 reads the client\'s accounts first; all end by finishing', () => {
    expect(PHASES.map((p) => PHASE_INFO[p].number)).toEqual([1, 2, 3]);
    expect(nextPhase('audit')).toBe('competitors');
    expect(nextPhase('integrated')).toBeNull();
    expect(STEPS.map((s) => s.name)).not.toContain('linked');
    expect(COMPETITOR_STEPS.map((s) => s.name)).toEqual(['social_depth', 'ads_library', 'pricing', 'authority', 'benchmark', 'creative', 'adsets', 'deliver_prepare', 'deliver_benchmark', 'deliver_creatives', 'deliver_adsets', 'deliver_finish']);
    expect(INTEGRATED_STEPS.map((s) => s.name)).toEqual(['linked', 'search_terms', 'integrated', 'adsets', 'deliver_prepare', 'deliver_integrated', 'deliver_creatives', 'deliver_adsets', 'deliver_finish']);
    for (const list of [STEPS, COMPETITOR_STEPS, INTEGRATED_STEPS]) expect(list[list.length - 1].name).toBe('deliver_finish');
    // Something must be delivered: the integrated PDF is required in phase 3; phase 2's are optional, and finish checks one exists.
    expect(INTEGRATED_STEPS.find((s) => s.name === 'deliver_integrated')?.optional).toBe(false);
    expect(ALL_STEPS.find((s) => s.name === 'social_depth')).toBe(COMPETITOR_STEPS.find((s) => s.name === 'social_depth'));
  });

  it('a competitor step an earlier run already ran hands its output on without reading again', async () => {
    const step = COMPETITOR_STEPS.find((s) => s.name === 'pricing')!;
    const prior = { accounts: ['read in phase 1'] };
    const ctx = { audit: audit('p2') as never, outputs: { pricing: prior }, inherited: { pricing: 'p1' }, deadline: Date.now() + 60_000, attempt: 1 } as StepContext;
    expect(await step.run(ctx)).toBe(prior);
  });
});
