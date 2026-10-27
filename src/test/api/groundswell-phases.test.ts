import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { runWorker, START_LEASE_MS, startQueuedRuns, startWithinCapacity, type StepLists } from '../../../api/_lib/groundswell/engine';
import { integratedReady, queueNextPhase, queuePhase } from '../../../api/_lib/groundswell/phases';
import { ALL_STEPS, COMPETITOR_STEPS, INTEGRATED_STEPS, PHASE_STEPS, STEPS } from '../../../api/_lib/groundswell/steps';
import type { StepContext, StepDefinition } from '../../../api/_lib/groundswell/types';
import { nextPhase, PHASE_INFO, PHASES } from '../../../src/lib/groundswellValidation';
import { fakeSupabase } from './fixtures/fakeSupabase';

/**
 * Groundswell's three phases: each its own run, starting from the outputs of
 * the run it builds on, queued one after another without anyone pressing a
 * button (migration 20261029120000; the app starts each run, startQueuedRuns).
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
  const rpc = vi.fn(async (name: string) => {
    if (name === 'claim_next_audit_step') return { data: claim(), error: null };
    throw new Error(name);
  });
  const from = (table: string) => {
    const filters: ((r: Row) => boolean)[] = [];
    let patch: Row | null = null;
    let insert: Row[] | null = null;
    let remove = false;
    let limit = Infinity;
    const all = () => (table === 'marketing_audits' ? audits : steps);
    const rows = () => all().filter((r) => filters.every((f) => f(r)));
    const run = () => {
      if (insert) {
        const clash = insert.find((n) => steps.some((s) => s.audit_id === n.audit_id && (s.step === n.step || s.position === n.position)));
        if (clash) return { data: null, error: { message: 'duplicate key value violates unique constraint', code: '23505' } };
        insert.forEach((n) => steps.push({ id: `${n.audit_id}-${n.step}`, status: 'pending', attempts: 0, output: null, ...n }));
        return { data: insert, error: null };
      }
      const hit = rows();
      if (remove) {
        hit.forEach((r) => all().splice(all().indexOf(r), 1));
        return { data: hit, error: null };
      }
      if (patch) hit.forEach((r) => Object.assign(r, patch));
      return { data: hit.slice(0, limit), error: null };
    };
    const chain = {
      select: () => chain,
      update: (p: Row) => ((patch = p), chain),
      insert: (r: Row[]) => ((insert = r), chain),
      delete: () => ((remove = true), chain),
      eq: (k: string, v: unknown) => (filters.push((r) => r[k] === v), chain),
      is: (k: string, v: unknown) => (filters.push((r) => (r[k] ?? null) === v), chain),
      lt: (k: string, v: string) => (filters.push((r) => typeof r[k] === 'string' && Date.parse(r[k] as string) < Date.parse(v)), chain),
      order: () => chain,
      limit: (n: number) => ((limit = n), chain),
      single: async () => ({ data: rows()[0] ?? null, error: rows()[0] ? null : { message: 'not found' } }),
      then: (resolve: (v: unknown) => void) => resolve(run()),
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

  it.each(['competitors', 'integrated'])('rebuilds the growth audit when a queued %s run lost its source audit', async (phase) => {
    const audits = [audit('orphan', { status: 'queued', phase, source_audit_id: null, started_at: null, error: 'This phase delivered nothing: no report was printed.' })];
    const steps: Row[] = [done('orphan', 'creative', 1, { stale: true })];
    const { db } = engineDb(audits, steps);
    expect(await startQueuedRuns(db, lists, 1)).toEqual(['orphan']);
    expect(audits[0]).toMatchObject({ phase: 'audit', kind: 'audit', status: 'running', source_audit_id: null, error: null });
    expect(steps.map(s => s.step)).toEqual(STEPS.map(s => s.name));
    expect(steps.every(s => s.status === 'pending' && s.output === null)).toBe(true);
  });

  it('gives each run its phase\'s steps, and a benchmark from before the phases its own', async () => {
    const audits = [audit('q1', { status: 'queued', started_at: null }), audit('q2', { status: 'queued', phase: 'competitors', source_audit_id: 'x', started_at: null }), audit('q3', { status: 'queued', kind: 'benchmark', started_at: null })];
    const steps: Row[] = [];
    const { db } = engineDb(audits, steps);
    expect(await startQueuedRuns(db, lists, 3)).toEqual(['q1', 'q2', 'q3']);
    const of = (id: string) => steps.filter((s) => s.audit_id === id).sort((a, b) => (a.position as number) - (b.position as number)).map((s) => s.step);
    expect(of('q1')).toEqual(STEPS.map((s) => s.name));
    expect(of('q2')).toEqual(COMPETITOR_STEPS.map((s) => s.name));
    expect(of('q3')).toEqual(PHASE_STEPS.benchmark.map((s) => s.name));
    expect(audits.map((a) => a.status)).toEqual(['running', 'running', 'running']);
    expect(audits.every((a) => typeof a.started_at === 'string')).toBe(true);
  });

  it('clears a re-queued run\'s old steps before it starts again', async () => {
    const audits = [audit('q1', { status: 'queued', started_at: null, error: 'Step maps failed' })];
    const steps: Row[] = [done('q1', 'site', 1, { old: true }), { id: 'q1-old', audit_id: 'q1', step: 'retired', position: 2, status: 'pending', attempts: 0, output: null }];
    const { db } = engineDb(audits, steps);
    expect(await startQueuedRuns(db, { ...lists, audit: [def('site', async () => ({})), def('model', async () => ({}))] }, 3)).toEqual(['q1']);
    expect(steps.map((s) => [s.step, s.status, s.output])).toEqual([
      ['site', 'pending', null],
      ['model', 'pending', null],
    ]);
    expect(audits[0]).toMatchObject({ status: 'running', error: null });
  });

  it('leaves a run another worker is starting to it, and takes over one whose start died', async () => {
    const audits = [
      audit('busy', { status: 'queued', started_at: new Date(Date.now() - 10_000).toISOString() }),
      audit('dead', { status: 'queued', started_at: new Date(Date.now() - START_LEASE_MS - 60_000).toISOString() }),
    ];
    const steps: Row[] = [];
    const { db } = engineDb(audits, steps);
    expect(await startQueuedRuns(db, lists, 3)).toEqual(['dead']);
    expect(audits.map((a) => a.status)).toEqual(['queued', 'running']);
    expect(steps.some((s) => s.audit_id === 'busy')).toBe(false);
  });

  it('starts at most the number asked for', async () => {
    const audits = [audit('q1', { status: 'queued', started_at: null }), audit('q2', { status: 'queued', started_at: null })];
    const { db } = engineDb(audits, []);
    expect(await startQueuedRuns(db, lists, 1)).toEqual(['q1']);
    expect(audits[1].status).toBe('queued');
  });

  it('falls back to the kind-based start before the phases migration', async () => {
    const rpc = vi.fn(async () => ({ data: ['a1'], error: null }));
    const chain: Record<string, unknown> = {};
    for (const k of ['select', 'eq', 'order', 'limit']) chain[k] = () => chain;
    chain.then = (resolve: (v: unknown) => void) => resolve({ data: null, error: { message: 'column marketing_audits.phase does not exist', code: '42703' } });
    const db = { rpc, from: () => chain } as unknown as SupabaseClient;
    expect(await startQueuedRuns(db, lists, 2)).toEqual(['a1']);
    expect(rpc.mock.calls[0]).toEqual(['start_queued_audits', { step_names: STEPS.map((s) => s.name), max_audits: 2, benchmark_step_names: PHASE_STEPS.benchmark.map((s) => s.name) }]);
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
    expect(first).toMatchObject({ phase: 'competitors', reason: 'Competitor plan queued.' });
    const queued = tables.marketing_audits.find((a) => a.id === first.queued)!;
    expect(queued).toMatchObject({ status: 'queued', phase: 'competitors', source_audit_id: 'p1', partner_id: 'partner-a', customer_id: 'c1', business_name: 'Flow & Mills', instagram: 'flowandmills', brand_color: '#cc0000', kind: 'audit' });
    expect(queued.competitors).toEqual([{ name: 'Rival', website: 'https://rival.example', instagram: null }]);
    const again = await queueNextPhase(client as never, { id: 'p1', phase: 'audit', customer_id: 'c1' });
    expect(again).toMatchObject({ queued: first.queued, reason: 'Competitor plan is already queued.' });
    expect(tables.marketing_audits.filter((a) => a.phase === 'competitors')).toHaveLength(1);
  });

  it('phase 3 waits for a client with a linked account, and says why', async () => {
    let { client } = seed({ phase: 'competitors' });
    expect(await queueNextPhase(client as never, { id: 'p1', phase: 'competitors', customer_id: 'c1' })).toMatchObject({ queued: null, reason: 'Integrated plan is for clients: mark the business as a client first.' });
    ({ client } = seed({ phase: 'competitors' }, { id: 'c1', stage: 'client' }, [{ id: 'x', customer_id: 'c1', status: 'expired' }]));
    expect((await queueNextPhase(client as never, { id: 'p1', phase: 'competitors', customer_id: 'c1' })).reason).toMatch(/No linked account yet/);
    ({ client } = seed({ phase: 'competitors' }, { id: 'c1', stage: 'client' }, [{ id: 'x', customer_id: 'c1', status: 'active' }]));
    expect(await queueNextPhase(client as never, { id: 'p1', phase: 'competitors', customer_id: 'c1' })).toMatchObject({ phase: 'integrated', reason: 'Integrated plan queued.' });
  });

  it('refuses a source that has not delivered, a phase out of order, and anything after the last', async () => {
    const { client } = seed({ status: 'running' });
    expect((await queuePhase(client as never, 'p1', 'competitors')).reason).toBe('Growth audit has not delivered yet.');
    expect((await queuePhase(client as never, 'p1', 'integrated')).reason).toBe('Integrated plan builds on competitor plan.');
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
    expect(COMPETITOR_STEPS.map((s) => s.name)).toEqual(['social_depth', 'ads_library', 'pricing', 'authority', 'benchmark', 'creative', 'adsets', 'posts', 'deliver_prepare', 'deliver_benchmark', 'deliver_creatives', 'deliver_adsets', 'deliver_finish']);
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
