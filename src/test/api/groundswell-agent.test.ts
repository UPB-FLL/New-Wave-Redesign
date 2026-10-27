import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from './fixtures/fakeSupabase';

/**
 * The operations agent: what it sees (collectors), what it keeps (the issue
 * table and its lessons), what it proposes (the model held to the registry,
 * or the rule), what it may do (resolvers), the 4-hour report with its
 * approval links, and the route from the email to the applied change.
 */

const db = vi.hoisted(() => ({ current: null as ReturnType<typeof import('./fixtures/fakeSupabase').fakeSupabase> | null }));
const who = vi.hoisted(() => ({ adminUser: vi.fn() }));
const background = vi.hoisted(() => ({ runWorkerInBackground: vi.fn() }));
const readiness = vi.hoisted(() => ({ readinessChecks: vi.fn() }));
const waitUntil = vi.hoisted(() => vi.fn());

vi.mock('../../../api/_lib/supabaseAdmin', () => ({ isSupabaseConfigured: () => true, getSupabaseAdmin: () => db.current!.client }));
vi.mock('../../../api/_lib/adminKey', async (original) => ({ ...(await original<object>()), adminUser: who.adminUser }));
vi.mock('../../../api/_lib/groundswell/background', () => ({ runWorkerInBackground: background.runWorkerInBackground, FUNCTION_SECONDS: 300 }));
vi.mock('../../../api/_lib/groundswell/readiness', async (original) => ({ ...(await original<object>()), readinessChecks: readiness.readinessChecks }));
vi.mock('@vercel/functions', () => ({ waitUntil }));

import handler, { externalObservations } from '../../../api/groundswell/agent';
import { decide, runAgentPass, verifyResolutions, type Sender } from '../../../api/_lib/groundswell/agent/agent';
import { COLLECTORS, collectAll, errorKey, headwayCollector, runsCollector } from '../../../api/_lib/groundswell/agent/collectors';
import { allowedResolvers, checkProposal, proposeAll, ruleProposal } from '../../../api/_lib/groundswell/agent/propose';
import { approvalUrl, buildReport, decisionPage } from '../../../api/_lib/groundswell/agent/report';
import { RESOLVERS, applicableResolvers, resolverByKey } from '../../../api/_lib/groundswell/agent/resolvers';
import { foldObservations, issueForToken, readIssues, readLessons, summarizeLessons } from '../../../api/_lib/groundswell/agent/store';
import type { CollectResult, Db, IssueRow, Observation } from '../../../api/_lib/groundswell/agent/types';
import type { ApiRequest, ApiResponse } from '../../../api/_lib/http';

const fake = () => db.current!.client as unknown as Db;
const NOW = new Date('2026-10-27T04:00:00Z');
const AUDIT = '4afe409b-a2b0-4d82-b1a6-df2fc3c2dbaa';
const AUDIT_2 = '5bfe409b-a2b0-4d82-b1a6-df2fc3c2dbab';
const ACTION = '7cfe409b-a2b0-4d82-b1a6-df2fc3c2dbac';
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

const failedRun = () => ({
  marketing_audits: [
    { id: AUDIT, business_name: 'Uncommon Path Brewing', status: 'failed', error: 'GEO developer brief (Markdown) failed: Could not store the brief: mime type text/markdown; charset=utf-8 is not supported', phase: 'audit', customer_id: 'c1', partner_id: null, updated_at: hoursAgo(2), created_at: hoursAgo(5), started_at: hoursAgo(5) },
    { id: AUDIT_2, business_name: 'Wildly Primal', status: 'done', error: null, phase: 'audit', customer_id: 'c2', partner_id: null, updated_at: hoursAgo(20), created_at: hoursAgo(30), started_at: hoursAgo(30) },
  ],
  marketing_audit_steps: [
    { audit_id: AUDIT, step: 'deliver_summary', position: 20, status: 'done', attempts: 1, error: null, finished_at: hoursAgo(2) },
    { audit_id: AUDIT, step: 'deliver_geo', position: 21, status: 'failed', attempts: 3, error: 'Could not store the brief: mime type text/markdown; charset=utf-8 is not supported', finished_at: hoursAgo(2) },
    { audit_id: AUDIT, step: 'deliver_finish', position: 22, status: 'pending', attempts: 0, error: null, finished_at: null },
    { audit_id: AUDIT, step: 'social', position: 5, status: 'skipped', attempts: 3, error: 'ScrapeCreators has run out of credits (HTTP 402), so its reads are paused.', finished_at: hoursAgo(4) },
    { audit_id: AUDIT_2, step: 'social', position: 5, status: 'skipped', attempts: 3, error: 'ScrapeCreators has run out of credits (HTTP 402: "insufficient credits"), so its reads are paused.', finished_at: hoursAgo(25) },
    { audit_id: AUDIT_2, step: 'keywords', position: 4, status: 'skipped', attempts: 3, error: 'Keyword Planner: the customer id 123-456-7890 cannot be read.', finished_at: hoursAgo(25) },
  ],
  groundswell_headway_actions: [{ id: ACTION, customer_id: 'c1', service: 'social-media', title: 'Post the Tuesday reel', status: 'failed', error: 'Instagram refused the media (code 36003).', attempts: 3, blocked_by: null, updated_at: hoursAgo(1) }],
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
const staff = (over: Partial<ApiRequest> = {}): ApiRequest => ({ method: 'GET', headers: { 'x-admin-key': 'secret' }, query: {}, ...over });

const sent: { to: string; subject: string; html: string; text: string }[] = [];
const sender: Sender = async (m) => {
  sent.push(m);
  return { id: 'email-1', error: null };
};
const noLive: CollectResult[] = [];
const collectorsOf = (...names: string[]) => COLLECTORS.filter((c) => names.includes(c.name));

beforeEach(() => {
  process.env.ADMIN_API_KEY = 'secret';
  delete process.env.OPENAI_API_KEY;
  db.current = fakeSupabase(failedRun());
  who.adminUser.mockReset();
  who.adminUser.mockResolvedValue({ id: 'u1', email: 'josh@newwaveitfl.com' });
  background.runWorkerInBackground.mockReset();
  readiness.readinessChecks.mockReset();
  readiness.readinessChecks.mockResolvedValue([{ key: 'composio:serpapi', label: 'SerpApi', ok: false, required: false, detail: 'The active account answers 401.' }, { key: 'OPENAI_API_KEY', label: 'OpenAI', ok: true, required: true, detail: 'Answered.' }]);
  waitUntil.mockReset();
  sent.length = 0;
  void noLive;
});

describe('collectors', () => {
  it('reads failed runs, skipped data steps grouped by fault, and failed Headway actions', async () => {
    const runs = await runsCollector.collect({ db: fake(), now: NOW, deadline: Infinity });
    const kinds = runs.map((o) => `${o.kind}:${o.fingerprint}`);
    expect(kinds).toContain(`run_failed:runs:run_failed:${AUDIT}`);
    const failed = runs.find((o) => o.kind === 'run_failed')!;
    expect(failed.title).toBe('Uncommon Path Brewing: the audit run failed at "GEO developer brief (Markdown)"');
    expect(failed.subject).toMatchObject({ audit_id: AUDIT, step: 'deliver_geo', business: 'Uncommon Path Brewing' });
    expect(failed.detail).toContain('text/markdown');
    // The two ScrapeCreators refusals share one issue (their numbers and quotes differ); the Keyword Planner one is its own.
    const skipped = runs.filter((o) => o.kind === 'step_skipped');
    expect(skipped).toHaveLength(2);
    const social = skipped.find((o) => o.subject.step === 'social')!;
    expect(social.title).toBe('"Instagram and Facebook" was skipped on 1 delivered run');
    expect(social.evidence).toMatchObject({ runs: 1, businesses: ['Wildly Primal'] });

    const headway = await headwayCollector.collect({ db: fake(), now: NOW, deadline: Infinity });
    expect(headway).toHaveLength(1);
    expect(headway[0]).toMatchObject({ kind: 'action_failed', fingerprint: `headway:action_failed:${ACTION}`, subject: { action_id: ACTION, action_title: 'Post the Tuesday reel' } });
  });

  it('sees a run that has not moved for hours and one that waited an hour in the queue', async () => {
    db.current = fakeSupabase({
      marketing_audits: [
        { id: AUDIT, business_name: 'Stalled Co', status: 'running', error: null, phase: 'competitors', updated_at: hoursAgo(3), created_at: hoursAgo(6), started_at: hoursAgo(6) },
        { id: AUDIT_2, business_name: 'Queued Co', status: 'queued', error: null, phase: 'audit', updated_at: hoursAgo(2), created_at: hoursAgo(2), started_at: null },
      ],
      marketing_audit_steps: [{ audit_id: AUDIT, step: 'maps', position: 2, status: 'running', attempts: 1, error: null, finished_at: null }],
    });
    const runs = await runsCollector.collect({ db: fake(), now: NOW, deadline: Infinity });
    expect(runs.map((o) => o.kind).sort()).toEqual(['run_queued_long', 'run_stalled']);
    expect(runs.find((o) => o.kind === 'run_stalled')!.title).toBe('Stalled Co: the competitors run has not moved for 3 hours');
  });

  it('errorKey strips ids, numbers and quoted names so the same fault shares an issue', () => {
    expect(errorKey('ScrapeCreators has run out of credits (HTTP 402: "insufficient credits")')).toBe(errorKey('ScrapeCreators has run out of credits (HTTP 402)'));
    expect(errorKey('Keyword Planner: the customer id 123-456 cannot be read')).not.toBe(errorKey('ScrapeCreators has run out of credits'));
  });

  it('a collector that throws is reported, not fatal, and the others still answer', async () => {
    db.current = fakeSupabase(failedRun(), { groundswell_headway_actions: ['*'] });
    const results = await collectAll({ db: fake(), now: NOW, deadline: Infinity }, collectorsOf('runs', 'headway'));
    expect(results.find((r) => r.source === 'headway')).toEqual({ source: 'headway', observations: [] });
    expect(results.find((r) => r.source === 'runs')!.observations.length).toBeGreaterThan(0);
    readiness.readinessChecks.mockRejectedValue(new Error('Composio timed out'));
    const live = await collectAll({ db: fake(), now: NOW, deadline: Infinity }, collectorsOf('readiness'));
    expect(live[0]).toMatchObject({ source: 'readiness', error: 'Composio timed out' });
  });

  it('the live checks become issues only where a service does not answer', async () => {
    const live = await collectAll({ db: fake(), now: NOW, deadline: Infinity }, collectorsOf('readiness'));
    expect(live[0].observations).toEqual([expect.objectContaining({ kind: 'service_optional', fingerprint: 'readiness:composio:serpapi', title: 'SerpApi is not answering', severity: 'warning' })]);
  });
});

describe('memory', () => {
  const obs = (over: Partial<Observation> = {}): Observation => ({ source: 'runs', kind: 'run_failed', fingerprint: `runs:run_failed:${AUDIT}`, severity: 'error', title: 'A run failed', detail: 'why', subject: { audit_id: AUDIT, step: 'deliver_geo' }, ...over });
  const pass = (observations: Observation[], sources = ['runs']) => sources.map((source) => ({ source, observations: observations.filter((o) => o.source === source) }));

  it('opens, counts, clears, and reopens with a lesson when a resolved issue comes back', async () => {
    const client = fake();
    const first = await foldObservations(client, pass([obs()]), NOW);
    expect(first.opened).toEqual([`runs:run_failed:${AUDIT}`]);
    const again = await foldObservations(client, pass([obs({ detail: 'why, again' })]), new Date(NOW.getTime() + 1000));
    expect(again.seen).toHaveLength(1);
    let [row] = await readIssues(client);
    expect(row).toMatchObject({ status: 'open', occurrences: 2, detail: 'why, again' });

    // Gone on its own: cleared, counted as held.
    const gone = await foldObservations(client, pass([]), new Date(NOW.getTime() + 2000));
    expect(gone.cleared).toHaveLength(1);
    [row] = await readIssues(client);
    expect(row.status).toBe('resolved');
    expect(row.outcome).toMatchObject({ ok: true, verified: 'worked' });

    // A source whose collector failed clears nothing.
    await foldObservations(client, [{ source: 'runs', observations: [obs()], error: undefined }], new Date(NOW.getTime() + 3000));
    const unread = await foldObservations(client, [{ source: 'runs', observations: [], error: 'down' }], new Date(NOW.getTime() + 4000));
    expect(unread.cleared).toEqual([]);
    expect(unread.unread).toEqual(['runs']);
    [row] = await readIssues(client);
    expect(row.status).toBe('open');
    expect(row.recurrences).toBe(1);
  });

  it('a resolution that was applied and then the issue came back is a failed lesson', async () => {
    const client = fake();
    await foldObservations(client, pass([obs()]), NOW);
    let [row] = await readIssues(client);
    const resolver = resolverByKey('requeue_step')!;
    await client.from('groundswell_agent_issues').update({ status: 'resolved', resolved_at: NOW.toISOString(), proposal: { resolver: resolver.key, summary: '', cause: '', rationale: '', confidence: 'medium', by: 'rule' }, outcome: { ok: true, note: 'queued', verified: null } }).eq('id', row.id);
    const back = await foldObservations(client, pass([obs()]), new Date(NOW.getTime() + 60_000));
    expect(back.reopened).toHaveLength(1);
    [row] = await readIssues(client);
    expect(row).toMatchObject({ status: 'open', recurrences: 1, proposal: null });
    const lessons = summarizeLessons(await readLessons(client));
    expect(lessons).toEqual([expect.objectContaining({ source: 'runs', kind: 'run_failed', resolver: 'requeue_step', worked: 0, failed: 1 })]);
  });

  it('history no newer than the decision is the same sighting; a newer event is a recurrence', async () => {
    const client = fake();
    const seen = obs({ kind: 'step_skipped', fingerprint: 'runs:step_skipped:social:credits', subject: { step: 'social' }, observed_at: hoursAgo(25) });
    await foldObservations(client, pass([seen]), NOW);
    let [row] = await readIssues(client);
    await client.from('groundswell_agent_issues').update({ status: 'proposed', proposal: { resolver: 'acknowledge', summary: '', cause: '', rationale: '', confidence: 'medium', by: 'rule' } }).eq('id', row.id);
    [row] = await readIssues(client);
    await decide(client, row, 'approve', 'staff:josh', NOW);
    expect((await readIssues(client))[0].status).toBe('resolved');
    const same = await foldObservations(client, pass([seen]), new Date(NOW.getTime() + 4 * 3_600_000));
    expect(same.reopened).toEqual([]);
    expect((await readIssues(client))[0].status).toBe('resolved');
    const newer = await foldObservations(client, pass([{ ...seen, observed_at: new Date(NOW.getTime() + 3_600_000).toISOString() }]), new Date(NOW.getTime() + 8 * 3_600_000));
    expect(newer.reopened).toHaveLength(1);
    expect(summarizeLessons(await readLessons(client))).toEqual([expect.objectContaining({ resolver: 'acknowledge', failed: 1 })]);
  });

  it('a dismissed issue stays quiet for a week and is reopened after', async () => {
    const client = fake();
    await foldObservations(client, pass([obs()]), NOW);
    const [row] = await readIssues(client);
    await decide(client, row, 'dismiss', 'staff:josh', NOW);
    const quiet = await foldObservations(client, pass([obs()]), new Date(NOW.getTime() + 24 * 3_600_000));
    expect(quiet.seen).toEqual([]);
    expect(quiet.reopened).toEqual([]);
    const later = await foldObservations(client, pass([obs()]), new Date(NOW.getTime() + 8 * 24 * 3_600_000));
    expect(later.reopened).toHaveLength(1);
  });
});

describe('proposals', () => {
  const issue = (over: Partial<IssueRow> = {}): IssueRow => ({
    id: 'i1', fingerprint: `runs:run_failed:${AUDIT}`, source: 'runs', kind: 'run_failed', severity: 'error', title: 'A run failed', detail: 'The brief could not be stored.', subject: { audit_id: AUDIT, step: 'deliver_geo', business: 'Uncommon Path Brewing', step_label: 'GEO developer brief' }, evidence: {},
    status: 'open', first_seen: NOW.toISOString(), last_seen: NOW.toISOString(), occurrences: 1, recurrences: 0, proposal: null, proposed_at: null, approval_token_hash: null, approval_expires_at: null, decided_by: null, decided_at: null, resolved_at: null, outcome: null, reported_at: null, muted_until: null, created_at: NOW.toISOString(), updated_at: NOW.toISOString(), ...over,
  });

  it('the registry decides what applies; the lessons rule a resolver out after two failures with no success', () => {
    expect(applicableResolvers(issue()).map((r) => r.key)).toEqual(['requeue_step']);
    expect(applicableResolvers(issue({ kind: 'run_held' })).map((r) => r.key)).toEqual(['release_review', 'recheck_review']);
    expect(applicableResolvers(issue({ source: 'headway', kind: 'action_failed', subject: { action_id: ACTION } })).map((r) => r.key)).toEqual(['retry_action']);
    expect(applicableResolvers(issue({ source: 'readiness', kind: 'service_optional', subject: {} })).map((r) => r.key)).toEqual(['acknowledge']);
    expect(applicableResolvers(issue({ subject: {} }))).toEqual([]);
    const ruledOut = [{ source: 'runs', kind: 'run_failed', resolver: 'requeue_step', worked: 0, failed: 2, last: 'x' }];
    expect(allowedResolvers(issue(), ruledOut)).toEqual([]);
    expect(allowedResolvers(issue(), [{ ...ruledOut[0], worked: 1 }]).map((r) => r.key)).toEqual(['requeue_step']);
  });

  it('the rule proposes the first allowed resolver, or a developer brief', () => {
    expect(ruleProposal(issue(), [])).toMatchObject({ resolver: 'requeue_step', confidence: 'medium', by: 'rule' });
    const p = ruleProposal(issue({ subject: {}, recurrences: 2 }), []);
    expect(p.resolver).toBe('needs_developer');
    expect(p.brief).toContain('Source runs, kind run_failed');
  });

  it('a model answer is kept only within the rules: no invented resolver, no empty rationale', () => {
    const allowed = applicableResolvers(issue());
    expect(checkProposal(issue(), { id: 'i1', resolver: 'delete_everything', rationale: 'because', confidence: 'high' }, allowed)).toBeNull();
    expect(checkProposal(issue(), { id: 'i1', resolver: 'requeue_step', rationale: '', confidence: 'high' }, allowed)).toBeNull();
    expect(checkProposal(issue(), { id: 'i1', resolver: 'requeue_step', summary: 'The brief file could not be saved.', cause: 'A file type the storage refuses.', rationale: 'The storage rule was fixed; a retry stores it.', confidence: 'certain' }, allowed)).toMatchObject({ resolver: 'requeue_step', confidence: 'low', by: 'model' });
    expect(checkProposal(issue(), { id: 'i1', resolver: 'needs_developer', rationale: 'Code change.', confidence: 'high', brief: 'Look at geoDelivery.ts' }, allowed)).toMatchObject({ resolver: 'needs_developer', brief: 'Look at geoDelivery.ts' });
  });

  it('proposeAll asks the model once with the allowed keys and falls back to the rule for anything it got wrong', async () => {
    const ask = vi.fn().mockResolvedValue({ proposals: [{ id: 'i1', resolver: 'requeue_step', summary: 'S', cause: 'C', rationale: 'R', confidence: 'high' }, { id: 'i2', resolver: 'retry_action', rationale: 'wrong kind', confidence: 'high' }] });
    const map = await proposeAll([issue(), issue({ id: 'i2', kind: 'run_held' })], [], { ask, useModel: true });
    expect(ask).toHaveBeenCalledTimes(1);
    const user = JSON.parse(ask.mock.calls[0][1]);
    expect(user.issues[0].allowed.map((a: { key: string }) => a.key)).toEqual(['requeue_step']);
    expect(map.get('i1')).toMatchObject({ resolver: 'requeue_step', summary: 'S', by: 'model' });
    expect(map.get('i2')).toMatchObject({ resolver: 'release_review', by: 'rule' });
    const failing = vi.fn().mockRejectedValue(new Error('OpenAI failed (500)'));
    const ruled = await proposeAll([issue()], [], { ask: failing, useModel: true });
    expect(ruled.get('i1')!.by).toBe('rule');
  });
});

describe('resolvers', () => {
  it('every resolver describes a change and a rollback in words', () => {
    for (const r of RESOLVERS) {
      const d = r.describe({ source: 'runs', kind: 'run_failed', subject: { audit_id: AUDIT, step: 'deliver_geo', business: 'B', step_label: 'GEO brief' }, title: 't' });
      expect(d.change.length).toBeGreaterThan(20);
      expect(d.rollback.length).toBeGreaterThan(10);
    }
  });

  it('requeue_step puts the failed step back and the run to running, then checks whether it held', async () => {
    const client = fake();
    const [issue] = await (async () => {
      await foldObservations(client, [{ source: 'runs', observations: await runsCollector.collect({ db: client, now: NOW, deadline: Infinity }) }], NOW);
      return (await readIssues(client)).filter((i) => i.kind === 'run_failed');
    })();
    const r = resolverByKey('requeue_step')!;
    const result = await r.apply(client, issue);
    expect(result).toMatchObject({ ok: true, wakeWorker: true });
    expect(db.current!.tables.marketing_audits.find((a) => a.id === AUDIT)).toMatchObject({ status: 'running', error: null, completed_at: null });
    expect(db.current!.tables.marketing_audit_steps.find((s) => s.audit_id === AUDIT && s.step === 'deliver_geo')).toMatchObject({ status: 'pending', attempts: 0, error: null });
    expect(await r.verify(client, issue)).toBe('pending');
    await client.from('marketing_audits').update({ status: 'done' }).eq('id', AUDIT);
    expect(await r.verify(client, issue)).toBe('worked');
    // Applied twice: the run is not failed any more, so nothing is touched.
    expect((await r.apply(client, issue)).ok).toBe(false);
  });

  it('retry_action approves a failed Headway action again with its attempts reset', async () => {
    const client = fake();
    const issue = { source: 'headway', kind: 'action_failed', subject: { action_id: ACTION } } as unknown as IssueRow;
    const r = resolverByKey('retry_action')!;
    expect((await r.apply(client, issue)).ok).toBe(true);
    expect(db.current!.tables.groundswell_headway_actions[0]).toMatchObject({ status: 'approved', attempts: 0, error: null });
    await client.from('groundswell_headway_actions').update({ status: 'applied' }).eq('id', ACTION);
    expect(await r.verify(client, issue)).toBe('worked');
  });
});

describe('a pass', () => {
  it('collects, proposes, emails the report with approval links, records it, and stays quiet when nothing changed', async () => {
    const client = fake();
    const report = await runAgentPass(client, { now: NOW, deadline: Infinity, collectors: collectorsOf('runs', 'headway'), send: sender, base: 'https://example.test', to: 'owner@example.test', useModel: false });
    expect(report.sent).toBe(true);
    // The failed run, the failed action, and the two skipped-step faults (handled outside the app, then checked).
    expect(report.counts).toMatchObject({ approvals: 4, developer: 0 });
    expect(sent).toHaveLength(1);
    const mail = sent[0];
    expect(mail.to).toBe('owner@example.test');
    expect(mail.subject).toBe('GroundSwell agent: 4 resolutions waiting on you (2026-10-27 04:00 UTC)');
    expect(mail.html).toContain('Needs your approval (4)');
    expect(mail.html).toContain('Uncommon Path Brewing: the audit run failed at &quot;GEO developer brief (Markdown)&quot;');
    expect(mail.html).toContain('If it does not help:');
    const links = [...mail.text.matchAll(/Approve: (\S+)/g)].map((m) => m[1]);
    expect(links).toHaveLength(4);
    expect(links[0]).toMatch(/^https:\/\/example\.test\/api\/groundswell\/agent\?token=[A-Za-z0-9_-]+&decision=approve$/);
    // The skipped steps are handled outside the app (credits, keys): the proposal says so and the next pass checks.
    expect(mail.text).toContain('Proposed: Nothing changes in the app: the issue is marked handled');
    const issues = await readIssues(client);
    expect(issues.filter((i) => i.status === 'proposed')).toHaveLength(4);
    expect(issues.every((i) => i.reported_at === NOW.toISOString())).toBe(true);
    expect(db.current!.tables.groundswell_agent_reports[0]).toMatchObject({ to_email: 'owner@example.test', status: 'sent', email_id: 'email-1' });

    // Four hours on, the same four still wait: the report repeats them, with fresh links.
    const repeat = await runAgentPass(client, { now: new Date(NOW.getTime() + 4 * 3_600_000), deadline: Infinity, collectors: collectorsOf('runs', 'headway'), send: sender, base: 'https://example.test', to: 'owner@example.test', useModel: false });
    expect(repeat.sent).toBe(true);
    expect(sent).toHaveLength(2);
    expect([...sent[1].text.matchAll(/Approve: (\S+)/g)].map((m) => m[1])).not.toEqual(links);

    // Everything decided and nothing new: no email.
    for (const i of await readIssues(client)) await decide(client, i, 'dismiss', 'staff:josh', new Date(NOW.getTime() + 5 * 3_600_000));
    const quiet = await runAgentPass(client, { now: new Date(NOW.getTime() + 8 * 3_600_000), deadline: Infinity, collectors: collectorsOf('runs', 'headway'), send: sender, base: 'https://example.test', to: 'owner@example.test', useModel: false });
    expect(quiet.sent).toBe(false);
    expect(quiet.reason).toBe('Nothing new since the last report.');
    expect(sent).toHaveLength(2);

    // A day on, still nothing new: the daily all-clear line goes out so silence is never ambiguous.
    const daily = await runAgentPass(client, { now: new Date(NOW.getTime() + 29 * 3_600_000), deadline: Infinity, collectors: collectorsOf('runs', 'headway'), send: sender, base: 'https://example.test', to: 'owner@example.test', useModel: false });
    expect(daily.sent).toBe(true);
    expect(daily.reason).toBe('Sent the daily all-clear.');
  });

  it('a failed collector is an issue of the agent itself and is named in the report', async () => {
    db.current = fakeSupabase(failedRun(), { groundswell_headway_actions: ['*'] });
    db.current.tables.groundswell_headway_actions = [];
    readiness.readinessChecks.mockRejectedValue(new Error('Composio timed out'));
    const report = await runAgentPass(fake(), { now: NOW, deadline: Infinity, collectors: collectorsOf('runs', 'readiness'), send: sender, base: 'https://example.test', to: 'o@example.test', useModel: false });
    expect(report.fold.unread).toEqual(['readiness']);
    expect(sent[0].text).toContain('NOT READ THIS PASS: readiness');
    expect((await readIssues(fake())).find((i) => i.fingerprint === 'agent:collector_failed:readiness')).toMatchObject({ title: 'The agent could not read its "readiness" source' });
  });

  it('verifies earlier resolutions and records the lesson', async () => {
    const client = fake();
    await runAgentPass(client, { now: NOW, deadline: Infinity, collectors: collectorsOf('runs'), send: sender, base: 'https://example.test', to: 'o@example.test', useModel: false });
    const issue = (await readIssues(client)).find((i) => i.kind === 'run_failed')!;
    const applied = await decide(client, issue, 'approve', 'staff:josh', NOW);
    expect(applied).toMatchObject({ ok: true, wakeWorker: true });
    expect((await readIssues(client)).find((i) => i.id === issue.id)).toMatchObject({ status: 'resolved', outcome: { ok: true, verified: null } });
    await client.from('marketing_audits').update({ status: 'done' }).eq('id', AUDIT);
    const verified = await verifyResolutions(client, new Date(NOW.getTime() + 3_600_000));
    expect(verified.worked).toEqual([issue.fingerprint]);
    expect(summarizeLessons(await readLessons(client))).toEqual([expect.objectContaining({ resolver: 'requeue_step', worked: 1, failed: 0 })]);
  });

  it('a resolution that cannot be applied goes back to open with a failed lesson', async () => {
    const client = fake();
    await runAgentPass(client, { now: NOW, deadline: Infinity, collectors: collectorsOf('runs'), send: sender, base: 'https://example.test', to: 'o@example.test', useModel: false });
    const issue = (await readIssues(client)).find((i) => i.kind === 'run_failed')!;
    await client.from('marketing_audits').update({ status: 'running' }).eq('id', AUDIT);
    const result = await decide(client, issue, 'approve', 'staff:josh', NOW);
    expect(result.ok).toBe(false);
    expect(result.note).toBe('The run is running now, not failed; nothing to re-queue.');
    expect((await readIssues(client)).find((i) => i.id === issue.id)).toMatchObject({ status: 'open', proposal: null });
    expect((await readLessons(client))[0]).toMatchObject({ resolver: 'requeue_step', result: 'failed' });
  });
});

describe('the report', () => {
  it('builds an all-clear when there is nothing, and never leaks a token into the developer section', () => {
    const report = buildReport({ now: NOW, base: 'https://example.test', approvals: [], developer: [], resolved: [], watching: [], lessons: [], unread: [] });
    expect(report.subject).toBe('GroundSwell agent: all clear (2026-10-27 04:00 UTC)');
    expect(report.text).toContain('All clear');
    expect(approvalUrl('https://example.test', 'abc', 'dismiss')).toBe('https://example.test/api/groundswell/agent?token=abc&decision=dismiss');
    const page = decisionPage({ title: 'Approve this resolution?', body: 'Press the button.', base: 'https://example.test', issue: null, action: { url: 'https://example.test/x', label: 'Approve and apply', decision: 'approve' } });
    expect(page).toContain('<form method="post" action="https://example.test/x">');
    expect(page).toContain('name="robots" content="noindex"');
  });
});

describe('the route', () => {
  it('refuses without the admin key, lists for staff, and starts a pass after answering', async () => {
    const anon = makeRes();
    await handler({ method: 'GET', headers: {}, query: {} }, asRes(anon));
    expect(anon.statusCode).toBe(401);

    const list = makeRes();
    await handler(staff(), asRes(list));
    expect(list.statusCode).toBe(200);
    expect(list.body).toMatchObject({ issues: [], lessons: [], last_report: null, config: { email: 'josh@newwaveitfl.com' } });

    const run = makeRes();
    await handler(staff({ method: 'POST', body: { action: 'report' } }), asRes(run));
    expect(run.statusCode).toBe(202);
    expect(waitUntil).toHaveBeenCalledTimes(1);
  });

  it('takes an outside system’s observations, checked, under its own source', async () => {
    const res = makeRes();
    await handler(staff({ method: 'POST', body: { action: 'observe', observations: [{ source: 'Vercel Logs', kind: 'runtime error', title: 'TypeError in /api/send-contact-email', detail: 'x is undefined', severity: 'error', subject: { route: '/api/send-contact-email', count: 4 } }] } }), asRes(res));
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ opened: 1, seen: 0, reopened: 0 });
    const [row] = await readIssues(fake());
    expect(row).toMatchObject({ source: 'external:vercel-logs', kind: 'runtime-error', severity: 'error', subject: { route: '/api/send-contact-email', count: 4 } });
    expect(row.fingerprint).toBe('external:vercel-logs:runtime-error:typeerror-in-api-send-contact-email');
    expect(externalObservations({ observations: [{ source: 'x' }] }).error).toBe('Each observation needs a source, a kind and a title.');
    expect(externalObservations({ observations: [] }).error).toBe('Send 1 to 50 observations.');
    expect(applicableResolvers(row).map((r) => r.key)).toEqual(['acknowledge']);
  });

  it('from the email: the link shows a confirmation page, the button applies the change, and the link then dies', async () => {
    const client = fake();
    await runAgentPass(client, { now: NOW, deadline: Infinity, collectors: collectorsOf('runs'), send: sender, base: 'https://example.test', to: 'o@example.test', useModel: false });
    const token = /token=([A-Za-z0-9_-]+)&decision=approve/.exec(sent[0].text)![1];
    expect(await issueForToken(client, token, NOW)).not.toBeNull();

    const show = makeRes();
    await handler({ method: 'GET', headers: {}, query: { token, decision: 'approve' } }, asRes(show));
    expect(show.statusCode).toBe(200);
    expect(show.headers['Content-Type']).toBe('text/html; charset=utf-8');
    expect(show.body).toContain('Approve this resolution?');
    expect(show.body).toContain('What will change:');
    // The page alone changed nothing.
    expect(db.current!.tables.marketing_audits.find((a) => a.id === AUDIT)!.status).toBe('failed');

    const press = makeRes();
    await handler({ method: 'POST', headers: {}, query: { token, decision: 'approve' } }, asRes(press));
    expect(press.statusCode).toBe(200);
    expect(press.body).toContain('Applied');
    expect(db.current!.tables.marketing_audits.find((a) => a.id === AUDIT)!.status).toBe('running');
    expect(background.runWorkerInBackground).toHaveBeenCalledTimes(1);
    expect((await readIssues(client)).find((i) => i.kind === 'run_failed')).toMatchObject({ status: 'resolved', decided_by: 'email:josh@newwaveitfl.com' });

    const dead = makeRes();
    await handler({ method: 'GET', headers: {}, query: { token } }, asRes(dead));
    expect(dead.statusCode).toBe(404);
    expect(dead.body).toContain('This link has expired');

    const nonsense = makeRes();
    await handler({ method: 'GET', headers: {}, query: { token: 'short' } }, asRes(nonsense));
    expect(nonsense.statusCode).toBe(404);
  });

  it('staff approve and dismiss from the screen by id; an expired token is refused', async () => {
    const client = fake();
    await runAgentPass(client, { now: NOW, deadline: Infinity, collectors: collectorsOf('runs'), send: sender, base: 'https://example.test', to: 'o@example.test', useModel: false });
    const issue = (await readIssues(client)).find((i) => i.kind === 'run_failed')!;
    const token = /token=([A-Za-z0-9_-]+)&decision=approve/.exec(sent[0].text)![1];
    expect(await issueForToken(client, token, new Date(NOW.getTime() + 8 * 24 * 3_600_000))).toBeNull();

    const dismiss = makeRes();
    await handler(staff({ method: 'POST', body: { action: 'dismiss', id: issue.id } }), asRes(dismiss));
    expect(dismiss.statusCode).toBe(200);
    expect((dismiss.body as { issue: IssueRow }).issue).toMatchObject({ status: 'dismissed', decided_by: 'staff:josh@newwaveitfl.com' });

    const twice = makeRes();
    await handler(staff({ method: 'POST', body: { action: 'approve', id: issue.id } }), asRes(twice));
    expect(twice.statusCode).toBe(409);
    expect((twice.body as { note: string }).note).toBe('This issue is already dismissed now.');

    const reopen = makeRes();
    await handler(staff({ method: 'POST', body: { action: 'reopen', id: issue.id } }), asRes(reopen));
    expect(reopen.statusCode).toBe(200);
    expect((reopen.body as { issue: IssueRow }).issue.status).toBe('open');
  });

  it('answers 503 before the migration', async () => {
    db.current = fakeSupabase({}, { groundswell_agent_issues: ['*'] });
    const res = makeRes();
    await handler(staff(), asRes(res));
    expect(res.statusCode).toBe(503);
  });
});
