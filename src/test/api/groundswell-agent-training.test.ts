import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from './fixtures/fakeSupabase';

/**
 * The agent's daily training: what it trains on (the fixes and lessons since
 * the last run), how (the four logged steps), the playbook it writes and the
 * changes it logs, the proposals that follow the playbook, the route's
 * `train` action and dashboard view, and the migration's daily job.
 */

const db = vi.hoisted(() => ({ current: null as ReturnType<typeof import('./fixtures/fakeSupabase').fakeSupabase> | null }));
const who = vi.hoisted(() => ({ adminUser: vi.fn() }));
const waitUntil = vi.hoisted(() => vi.fn());

vi.mock('../../../api/_lib/supabaseAdmin', () => ({ isSupabaseConfigured: () => true, getSupabaseAdmin: () => db.current!.client }));
vi.mock('../../../api/_lib/adminKey', async (original) => ({ ...(await original<object>()), adminUser: who.adminUser }));
vi.mock('../../../api/_lib/groundswell/background', () => ({ runWorkerInBackground: vi.fn(), FUNCTION_SECONDS: 300 }));
vi.mock('@vercel/functions', () => ({ waitUntil }));

import { readFileSync } from 'node:fs';
import handler, { dashboardCounts } from '../../../api/groundswell/agent';
import { allowedResolvers, proposeAll, ruleProposal } from '../../../api/_lib/groundswell/agent/propose';
import { readPlaybook } from '../../../api/_lib/groundswell/agent/store';
import { buildPlaybook, diffPlaybook, readTrainingRuns, runTraining, startTraining, trainingWindow, TRAINING_JOB, TRAINING_NOT_READY } from '../../../api/_lib/groundswell/agent/train';
import type { Consultation } from '../../../api/_lib/groundswell/agent/consult';
import type { Db, IssueRow, PlaybookRow, TrainingRunRow } from '../../../api/_lib/groundswell/agent/types';
import type { ApiRequest, ApiResponse } from '../../../api/_lib/http';

const fake = () => db.current!.client as unknown as Db;
const NOW = new Date('2026-10-28T04:17:00Z');
const AUDIT = '4afe409b-a2b0-4d82-b1a6-df2fc3c2dbaa';
const hoursAgo = (h: number, from = NOW) => new Date(from.getTime() - h * 3_600_000).toISOString();

const issue = (over: Partial<IssueRow>): IssueRow => ({
  id: 'i0',
  fingerprint: `runs:run_failed:${over.id ?? 'i0'}`,
  source: 'runs',
  kind: 'run_failed',
  severity: 'error',
  title: 'Uncommon Path Brewing: the audit run failed at "GEO developer brief"',
  detail: 'Could not store the brief.',
  subject: { audit_id: AUDIT, step: 'deliver_geo' },
  evidence: {},
  status: 'open',
  first_seen: hoursAgo(30),
  last_seen: hoursAgo(5),
  occurrences: 2,
  recurrences: 0,
  proposal: null,
  proposed_at: null,
  approval_token_hash: null,
  approval_expires_at: null,
  decided_by: null,
  decided_at: null,
  resolved_at: null,
  outcome: null,
  reported_at: null,
  muted_until: null,
  created_at: hoursAgo(30),
  updated_at: hoursAgo(5),
  ...over,
});

const seed = (): Record<string, Record<string, unknown>[]> => ({
  marketing_audits: [{ id: AUDIT, business_name: 'Uncommon Path Brewing', status: 'done', updated_at: hoursAgo(2) }],
  groundswell_agent_issues: ([
    // Approved from the email three hours ago; not checked yet (the audit is done now, so it held).
    issue({ id: 'i1', status: 'resolved', decided_by: 'email:josh@newwaveitfl.com', decided_at: hoursAgo(3), resolved_at: hoursAgo(3), proposal: { resolver: 'requeue_step', summary: 's', cause: 'c', rationale: 'r', confidence: 'medium', by: 'claude' }, outcome: { ok: true, note: 'Step "deliver_geo" queued again.', verified: null } }),
    // Gone on its own.
    issue({ id: 'i2', fingerprint: 'readiness:composio:serpapi', source: 'readiness', kind: 'service_optional', title: 'SerpApi does not answer', subject: { check: 'composio:serpapi' }, status: 'resolved', resolved_at: hoursAgo(2), outcome: { ok: true, note: 'No longer observed; cleared without a change from the agent.', verified: 'worked' } }),
    // Dismissed an hour ago.
    issue({ id: 'i3', fingerprint: 'external:vercel:x', source: 'external:vercel', kind: 'runtime-error', title: 'TypeError in /api/x', subject: {}, status: 'dismissed', decided_by: 'staff:josh@newwaveitfl.com', decided_at: hoursAgo(1) }),
    // Resolved two days ago: outside the first window.
    issue({ id: 'i4', fingerprint: 'runs:run_failed:old', status: 'resolved', decided_by: 'staff:josh@newwaveitfl.com', resolved_at: hoursAgo(50), proposal: { resolver: 'requeue_step', summary: 's', cause: 'c', rationale: 'r', confidence: 'medium', by: 'rule' }, outcome: { ok: true, note: 'old', verified: 'worked', verified_at: hoursAgo(46) } }),
  ] as unknown as Record<string, unknown>[]),
  groundswell_agent_lessons: [
    { id: 'l-old-1', issue_id: null, source: 'runs', kind: 'run_held', resolver: 'release_review', result: 'failed', note: 'Deliver the first read: did not hold.', created_at: hoursAgo(72) },
    { id: 'l-old-2', issue_id: null, source: 'runs', kind: 'run_held', resolver: 'release_review', result: 'failed', note: 'Deliver the first read: did not hold.', created_at: hoursAgo(70) },
  ],
});

function makeRes() {
  return {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
    send(body: string) {
      this.body = body;
      return this;
    },
  };
}
const asRes = (r: ReturnType<typeof makeRes>) => r as unknown as ApiResponse;
const cron = (over: Partial<ApiRequest> = {}): ApiRequest => ({ method: 'GET', headers: { 'x-admin-key': 'secret' }, query: {}, ...over });

beforeEach(() => {
  // The fake stamps inserted rows with the clock; the training's window ends at NOW.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  process.env.ADMIN_API_KEY = 'secret';
  delete process.env.OPENAI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  db.current = fakeSupabase(seed());
  who.adminUser.mockReset();
  who.adminUser.mockResolvedValue(null);
  waitUntil.mockReset();
});
afterEach(() => vi.useRealTimers());

describe('the playbook', () => {
  it('orders the resolutions tried by how often they held, rules out what failed twice, and names each change', () => {
    const next = buildPlaybook([
      { source: 'runs', kind: 'run_held', resolver: 'release_review', worked: 1, failed: 2, last: 'a' },
      { source: 'runs', kind: 'run_held', resolver: 'recheck_review', worked: 2, failed: 0, last: 'b' },
      { source: 'headway', kind: 'action_failed', resolver: 'retry_action', worked: 0, failed: 2, last: 'c' },
    ]);
    expect(next).toEqual([
      { source: 'headway', kind: 'action_failed', preferred: [], ruled_out: ['retry_action'], stats: { retry_action: { worked: 0, failed: 2, last: 'c' } } },
      { source: 'runs', kind: 'run_held', preferred: ['recheck_review', 'release_review'], ruled_out: [], stats: { release_review: { worked: 1, failed: 2, last: 'a' }, recheck_review: { worked: 2, failed: 0, last: 'b' } } },
    ]);
    const before: PlaybookRow = { source: 'runs', kind: 'run_held', preferred: ['release_review'], ruled_out: [], stats: { release_review: { worked: 1, failed: 1, last: 'a' } }, trained_at: hoursAgo(24), training_run_id: 'r0' };
    const changes = diffPlaybook([before], next);
    expect(changes.map((c) => [c.kind, c.change, c.resolver])).toEqual([
      ['action_failed', 'new_kind', null],
      ['run_held', 'first_choice', 'recheck_review'],
      ['run_held', 'counts', 'recheck_review'],
      ['run_held', 'counts', 'release_review'],
    ]);
    expect(changes[1].note).toBe('Read the sources again and re-check the held run is now the first choice (held 2 of 2), ahead of Deliver the held run as it was first read.');
    expect(changes[3].note).toBe('Deliver the held run as it was first read: held 1 → 1, did not hold 1 → 2.');
    expect(diffPlaybook([{ ...before, ...next[1], trained_at: '', training_run_id: null }], [next[1]])).toEqual([]);
  });

  it('is the order the agent proposes in: the rule takes the training’s first choice, and the advisor is told', async () => {
    const held = issue({ id: 'h1', kind: 'run_held', subject: { audit_id: AUDIT } });
    expect(allowedResolvers(held, []).map((r) => r.key)).toEqual(['release_review', 'recheck_review']);
    const playbook: PlaybookRow[] = [{ source: 'runs', kind: 'run_held', preferred: ['recheck_review', 'release_review'], ruled_out: [], stats: { recheck_review: { worked: 2, failed: 0, last: '' }, release_review: { worked: 0, failed: 1, last: '' } }, trained_at: hoursAgo(1), training_run_id: 'r1' }];
    expect(allowedResolvers(held, [], playbook).map((r) => r.key)).toEqual(['recheck_review', 'release_review']);
    expect(ruleProposal(held, [], playbook)).toMatchObject({ resolver: 'recheck_review', rationale: expect.stringContaining('the first choice of the last training') });

    const consult = vi.fn(async (): Promise<Consultation> => ({ model: 'claude-opus-5-5', text: '{"proposals":[]}', parsed: { proposals: [] }, usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: null }, latency_ms: 1, stop_reason: 'end_turn', error: null }));
    const map = await proposeAll(fake(), [held], [], { consult, playbook });
    const question = JSON.parse((consult.mock.calls[0] as unknown as [string, string])[1]);
    expect(question.issues[0].allowed.map((a: { key: string }) => a.key)).toEqual(['recheck_review', 'release_review']);
    expect(question.playbook).toEqual([{ source: 'runs', kind: 'run_held', preferred: ['recheck_review', 'release_review'], ruled_out: [], stats: playbook[0].stats, trained_at: playbook[0].trained_at }]);
    expect(map.get('h1')).toMatchObject({ resolver: 'recheck_review', by: 'rule' });
  });
});

describe('a training run', () => {
  it('trains on the day’s fixes, logs what and how, writes the playbook, and the next run starts where it stopped', async () => {
    const first = await runTraining(fake(), { now: NOW, trigger: 'cron' });
    expect(first.started).toBe(true);
    const run = first.run;
    expect(run).toMatchObject({ status: 'done', trigger: 'cron', window_start: hoursAgo(24), window_end: NOW.toISOString(), error: null });
    expect(run.steps.map((s) => s.step)).toEqual(['check', 'gather', 'recount', 'playbook']);
    expect(run.steps[0].detail).toBe('1 resolution checked by their own resolver: 1 held, 0 did not hold. Each became a lesson.');
    expect(run.steps[1].detail).toContain('3 fixes (1 approved and applied, 1 cleared on their own, 1 dismissed) and 1 lesson (1 held, 0 did not hold)');
    expect(run.trained_on.fixes!.map((f) => [f.issue_id, f.how, f.resolver, f.verified])).toEqual([
      ['i3', 'dismissed', null, null],
      ['i2', 'cleared', null, 'worked'],
      // Checked in step 1, so it is trained on as held.
      ['i1', 'approved', 'requeue_step', 'worked'],
    ]);
    expect(run.trained_on.lessons).toEqual([expect.objectContaining({ source: 'runs', kind: 'run_failed', resolver: 'requeue_step', result: 'worked' })]);
    expect(run.changes.map((c) => [c.kind, c.change])).toEqual([
      ['run_failed', 'new_kind'],
      ['run_held', 'new_kind'],
    ]);
    expect(run.changes[1].note).toBe('First training on runs / run_held: every resolution tried is ruled out; ruled out: Deliver the held run as it was first read.');
    expect(run.counts).toEqual({ fixes: 3, lessons: 1, held: 1, failed: 0, kinds: 2, changes: 2, checked: 1 });
    expect(run.summary).toBe('Trained on 3 fixes and 1 lesson (1 held, 0 did not hold); 2 changes to the playbook.');
    expect(await readPlaybook(fake())).toEqual([
      { source: 'runs', kind: 'run_failed', preferred: ['requeue_step'], ruled_out: [], stats: { requeue_step: { worked: 1, failed: 0, last: expect.stringContaining('held') } }, trained_at: NOW.toISOString(), training_run_id: run.id },
      { source: 'runs', kind: 'run_held', preferred: [], ruled_out: ['release_review'], stats: { release_review: { worked: 0, failed: 2, last: 'Deliver the first read: did not hold.' } }, trained_at: NOW.toISOString(), training_run_id: run.id },
    ]);

    // A day later: one new lesson on each kind.
    const later = new Date(NOW.getTime() + 24 * 3_600_000);
    vi.setSystemTime(later);
    db.current!.tables.groundswell_agent_lessons.push(
      { id: 'l-new-1', issue_id: 'i5', source: 'runs', kind: 'run_failed', resolver: 'requeue_step', result: 'failed', note: 'Run the failed step again: did not hold.', created_at: hoursAgo(5, later) },
      { id: 'l-new-2', issue_id: 'i6', source: 'runs', kind: 'run_held', resolver: 'recheck_review', result: 'worked', note: 'Check again: held.', created_at: hoursAgo(4, later) }
    );
    const second = (await runTraining(fake(), { now: later, trigger: 'staff:josh@newwaveitfl.com' })).run;
    expect(second).toMatchObject({ status: 'done', window_start: NOW.toISOString(), window_end: later.toISOString(), trigger: 'staff:josh@newwaveitfl.com' });
    expect(second.trained_on.fixes).toEqual([]);
    expect(second.trained_on.lessons!.map((l) => l.id)).toEqual(['l-new-1', 'l-new-2']);
    expect(second.changes.map((c) => [c.kind, c.change, c.resolver])).toEqual([
      ['run_failed', 'counts', 'requeue_step'],
      ['run_held', 'first_choice', 'recheck_review'],
      ['run_held', 'counts', 'recheck_review'],
    ]);
    expect((await readPlaybook(fake())).find((p) => p.kind === 'run_held')).toMatchObject({ preferred: ['recheck_review'], ruled_out: ['release_review'], training_run_id: second.id });

    // A third with nothing new: logged all the same.
    const third = (await runTraining(fake(), { now: new Date(later.getTime() + 60_000) })).run;
    expect(third).toMatchObject({ status: 'done', changes: [], summary: 'No new fixes since the last training; the playbook is unchanged.' });
    expect((await readTrainingRuns(fake())).map((r) => r.id)).toEqual([third.id, second.id, run.id]);
  });

  it('never runs twice at once, and a run that cannot write the playbook is logged as failed with the step it reached', async () => {
    const started = await startTraining(fake(), { now: NOW });
    expect(started.started).toBe(true);
    const again = await startTraining(fake(), { now: new Date(NOW.getTime() + 60_000) });
    expect(again).toMatchObject({ started: false, reason: expect.stringContaining('still running') });

    db.current = fakeSupabase(seed(), { groundswell_agent_playbook: ['*'] });
    const failed = (await runTraining(fake(), { now: NOW })).run;
    expect(failed).toMatchObject({ status: 'failed', error: TRAINING_NOT_READY, summary: 'Stopped after 3 steps.' });
    expect(failed.steps.map((s) => s.step)).toEqual(['check', 'gather', 'recount']);
  });

  it('reaches back a day the first time and at most a week after a long gap', () => {
    expect(trainingWindow([], NOW)).toEqual({ start: hoursAgo(24), end: NOW.toISOString() });
    const old = { status: 'done', window_end: hoursAgo(24 * 30) } as TrainingRunRow;
    expect(trainingWindow([old], NOW).start).toBe(hoursAgo(24 * 7));
    expect(trainingWindow([{ status: 'failed', window_end: hoursAgo(2) } as TrainingRunRow, { status: 'done', window_end: hoursAgo(26) } as TrainingRunRow], NOW).start).toBe(hoursAgo(26));
  });
});

describe('the route', () => {
  it('trains from the daily job (202, after answering) and refuses before the migration', async () => {
    const res = makeRes();
    await handler(cron({ method: 'POST', body: { action: 'train' } }), asRes(res));
    expect(res.statusCode).toBe(202);
    expect(res.body).toMatchObject({ accepted: true, window: { start: hoursAgo(24), end: NOW.toISOString() } });
    expect(waitUntil).toHaveBeenCalledTimes(1);
    // The training runs after the answer; wait for it as Vercel does.
    await waitUntil.mock.calls[0][0];
    const [run] = await readTrainingRuns(fake());
    expect(run).toMatchObject({ id: (res.body as { run_id: string }).run_id, trigger: 'cron', status: 'done' });

    const busy = makeRes();
    db.current!.tables.groundswell_agent_training_runs.push({ id: 'r-busy', trigger: 'cron', status: 'running', window_start: hoursAgo(1), window_end: NOW.toISOString(), started_at: new Date(NOW.getTime() + 1000).toISOString(), steps: [], changes: [], counts: {}, trained_on: {}, summary: '', error: null });
    await handler(cron({ method: 'POST', body: { action: 'train' } }), asRes(busy));
    expect(busy.statusCode).toBe(409);

    db.current = fakeSupabase(seed(), { groundswell_agent_training_runs: ['*'] });
    const missing = makeRes();
    await handler(cron({ method: 'POST', body: { action: 'train' } }), asRes(missing));
    expect(missing.statusCode).toBe(503);
    expect(missing.body).toEqual({ error: TRAINING_NOT_READY });
  });

  it('serves the dashboard: counts, both jobs with their last run, the training log and the playbook', async () => {
    await runTraining(fake(), { now: NOW });
    const res = makeRes();
    await handler(cron({ query: { view: 'dashboard' } }), asRes(res));
    expect(res.statusCode).toBe(200);
    const body = res.body as { counts: ReturnType<typeof dashboardCounts>; schedule: { job: string; cron: string; last_at: string | null; last_status: string | null }[]; training_runs: TrainingRunRow[]; playbook: PlaybookRow[]; training_ready: boolean };
    expect(body.schedule).toEqual([
      expect.objectContaining({ job: 'groundswell-agent-report', cron: '0 */4 * * *', last_at: null }),
      expect.objectContaining({ job: 'groundswell-agent-training', cron: '17 4 * * *', last_at: NOW.toISOString(), last_status: 'done' }),
    ]);
    expect(body.training_runs).toHaveLength(1);
    expect(body.playbook.map((p) => p.kind)).toEqual(['run_failed', 'run_held']);
    expect(body.training_ready).toBe(true);
    expect(body.counts).toMatchObject({ resolved_30d: 3, held_30d: 1, failed_30d: 2, lessons_total: 3 });
    expect(body.counts.days).toHaveLength(14);
    expect(body.counts.days[13]).toEqual({ date: '2026-10-28', held: 1, failed: 0 });

    db.current = fakeSupabase(seed(), { groundswell_agent_training_runs: ['*'], groundswell_agent_playbook: ['*'] });
    const before = makeRes();
    await handler(cron({ query: { view: 'dashboard' } }), asRes(before));
    expect(before.statusCode).toBe(200);
    expect(before.body).toMatchObject({ training_runs: [], playbook: [], training_ready: false });
  });
});

describe('the migration', () => {
  it('schedules the daily job the dashboard names, posting the train action with the admin key', () => {
    const sql = readFileSync('supabase/migrations/20261106120000_groundswell_agent_training.sql', 'utf8');
    expect(sql).toContain(`'${TRAINING_JOB.job}',\n  '${TRAINING_JOB.cron}'`);
    expect(sql).toContain(`body := '{"action":"train"}'::jsonb`);
    expect(sql).toContain("WHERE name = 'blog_admin_api_key'");
    for (const table of ['groundswell_agent_training_runs', 'groundswell_agent_playbook']) {
      expect(sql).toContain(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
      expect(sql).toContain(`REVOKE ALL ON ${table} FROM anon, authenticated;`);
    }
  });
});
