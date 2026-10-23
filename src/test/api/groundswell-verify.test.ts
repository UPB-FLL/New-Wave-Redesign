import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ chatJson: vi.fn(), runMaps: vi.fn(), runSearch: vi.fn(), runKeywords: vi.fn(), runSocial: vi.fn() }));
vi.mock('../../../api/_lib/groundswell/openai', () => ({ chatJson: mocks.chatJson, GROUNDSWELL_MODEL: () => 'test-model' }));
vi.mock('../../../api/_lib/groundswell/currents/maps', async (original) => ({ ...(await original<object>()), runMaps: mocks.runMaps }));
vi.mock('../../../api/_lib/groundswell/currents/search', async (original) => ({ ...(await original<object>()), runSearch: mocks.runSearch, runKeywords: mocks.runKeywords }));
vi.mock('../../../api/_lib/groundswell/currents/social', async (original) => ({ ...(await original<object>()), runSocial: mocks.runSocial }));

import { GROUNDSWELL_CONFIG } from '../../../packages/groundswell/groundswell.config';
import type { AdcopyOutput } from '../../../api/_lib/groundswell/adcopy';
import type { AdplanOutput } from '../../../api/_lib/groundswell/adplan';
import { reportData } from '../../../api/_lib/groundswell/delivery';
import { buildFacts } from '../../../api/_lib/groundswell/model';
import { PermanentStepError, type StepContext } from '../../../api/_lib/groundswell/types';
import {
  checkStep,
  readStep,
  refitCopy,
  rerunPlan,
  REVIEW_SYSTEM,
  reviseSentences,
  runVerifyCheck,
  runVerifyRead,
  sentencesOf,
  verifiedOutputs,
  verifySteps,
  type VerifyCheckOutput,
  type VerifyReadOutput,
} from '../../../api/_lib/groundswell/verify';
import { answerReview, ReviewError } from '../../../api/_lib/groundswell/review';
import { fakeSupabase } from './fixtures/fakeSupabase';
import { sampleAdplanOutput, sampleAudit, sampleModelOutput, sampleOutputs } from './fixtures/groundswell-report';
import type { SupabaseClient } from '@supabase/supabase-js';

type Outputs = Record<string, unknown>;
const STEPS_3 = ['model', 'adplan', readStep(2), checkStep(2), readStep(3), checkStep(3), 'deliver_prepare'];
const STEPS_2 = ['model', 'adplan', readStep(2), checkStep(2), 'deliver_prepare'];

const first = (): Outputs => ({ ...sampleOutputs(), model: sampleModelOutput(), adplan: sampleAdplanOutput() });
const ctx = (outputs: Outputs, extra: Partial<StepContext> = {}): StepContext => ({
  audit: sampleAudit,
  outputs,
  steps: STEPS_3,
  deadline: Date.now() + 250_000,
  attempt: 1,
  ...extra,
});

/** A read of the four sources: the first pass's, changed by `edit`. */
function read(round: number, edit: (o: Outputs) => void = () => {}): VerifyReadOutput {
  const o = structuredClone(sampleOutputs());
  edit(o);
  return { round, fetched_at: '2026-10-21T13:00:00.000Z', reads: { maps: o.maps, search: o.search, keywords: o.keywords, social: o.social }, errors: {} };
}
const searches = (factor: number) => (o: Outputs) => {
  const k = o.keywords as { ideas: { monthly_searches: number | null }[] };
  k.ideas.forEach((i) => (i.monthly_searches = Math.round((i.monthly_searches ?? 0) * factor)));
};

const writeup = () => sampleModelOutput().writeup;
const idOf = (text: string) => sentencesOf(writeup(), 'w').find((s) => s.text === text)!.id;

beforeEach(() => {
  for (const m of Object.values(mocks)) m.mockReset();
  mocks.chatJson.mockResolvedValue({ problems: [] });
});

describe('reading again', () => {
  it('reads again, in parallel, only the sources the first pass read, and records what failed', async () => {
    const o = first();
    delete o.social;
    mocks.runMaps.mockRejectedValue(new Error('Google showed a consent page.'));
    mocks.runSearch.mockResolvedValue({ again: 'search' });
    mocks.runKeywords.mockResolvedValue({ again: 'keywords' });
    const out = await runVerifyRead(2)(ctx(o));
    expect(out.reads).toEqual({ search: { again: 'search' }, keywords: { again: 'keywords' } });
    expect(out.errors).toEqual({ maps: 'Google showed a consent page.' });
    expect(mocks.runSocial).not.toHaveBeenCalled();
    // The same inputs as the first pass: its site and Maps category seed the same Keyword Planner call.
    expect(mocks.runKeywords.mock.calls[0][0].outputs.maps).toBe(o.maps);
  });

  it('counts a source still reading when the step\'s time runs out as not read', async () => {
    mocks.runMaps.mockReturnValue(new Promise(() => {}));
    mocks.runSearch.mockResolvedValue({ again: 'search' });
    mocks.runKeywords.mockResolvedValue({ again: 'keywords' });
    mocks.runSocial.mockResolvedValue({ again: 'social' });
    const out = await runVerifyRead(2)(ctx(first(), { deadline: Date.now() }));
    expect(out.errors).toEqual({ maps: 'Google Maps did not answer within 1 seconds.' });
    expect(Object.keys(out.reads)).toEqual(['search', 'keywords', 'social']);
  });

  it('re-runs the plan exactly as the step built it, from the same read', () => {
    const o = first();
    const adplan = o.adplan as AdplanOutput;
    const again = rerunPlan(buildFacts(sampleAudit, o), adplan, GROUNDSWELL_CONFIG);
    expect(again.angles).toEqual(adplan.angles);
    expect(again.result).toEqual({ plan: adplan.plan, ranked: adplan.ranked, comparison: adplan.comparison });
  });
});

describe('the check', () => {
  it('holds a new-format report with complete research when its findings are still generic or missing', async () => {
    const o = { ...first(), [readStep(2)]: read(2) };
    (o.model as Record<string, unknown>).report_schema_version = 2;
    const out = await runVerifyCheck(2)(ctx(o));
    expect(out.status).toBe('held');
    expect(out.hold).toMatch(/substantive.*findings/i);
  });

  it('accepts a new-format report whose supported findings connect evidence to actions and verification', async () => {
    const o = { ...first(), [readStep(2)]: read(2) };
    const model = o.model as ReturnType<typeof sampleModelOutput>;
    model.report_schema_version = 2;
    model.writeup.findings = [
      { area: 'website', source: 'website', title: 'Verify booking completion', evidence: 'The homepage contains a Square booking link in its initial HTML.', implication: 'A booking link alone does not establish completed appointments.', action: 'Trace a completed test booking and inspect its confirmation event.', measure: 'A completed booking produces one deduplicated analytics event.' },
      { area: 'google', source: 'maps', title: 'Build on the observed review baseline', evidence: 'The Google listing has a 4.6 rating from 212 reviews in the snapshot.', implication: 'A consistent follow-up process can make customer feedback easier to capture.', action: 'Add the correct review link to the completed-job follow-up workflow.', measure: 'The link opens the correct listing and the workflow records its delivery.' },
      { area: 'keywords', source: 'keywords', title: 'Match service intent to a landing page', evidence: 'Keyword Planner returned brake repair searches and associated bid estimates.', implication: 'A service-specific destination can answer a relevant search more directly.', action: 'Create a brake-repair page with local service details and a booking path.', measure: 'The published page and its booking path work on a mobile device.' },
    ].map(finding => ({ ...finding, priority: 'high', basis: 'observed', effort: 'Estimate depends on access and the existing system.', dependency: 'Requires owner approval.' })) as NonNullable<typeof model.writeup.findings>;
    const out = await runVerifyCheck(2)(ctx(o));
    expect(out.status).toBe('agreed');
    expect(out.hold).toBeNull();
  });

  it('holds an audit when repeated payloads contain failures rather than usable public research', async () => {
    const o = first();
    const failed = (x: Outputs) => {
      x.maps = { business: null, nearby: [], note: 'Google Maps could not be read.', source: 'Google Maps', fetched_at: '2026-10-21' };
      x.social = { business: { handle: 'harborautocare', exists: false, followers: null, error: 'blocked' }, competitors: [], source: 'Instagram', fetched_at: '2026-10-21' };
    };
    failed(o);
    o[readStep(2)] = read(2, failed);
    const out = await runVerifyCheck(2)(ctx(o, { steps: ['maps', 'social', ...STEPS_2] }));
    expect(out.status).toBe('held');
    expect(out.hold).toMatch(/public research/i);
  });

  it('agrees in round 2 on the same figures, and delivers the first read with the write-up reviewed', async () => {
    const o = { ...first(), [readStep(2)]: read(2) };
    mocks.chatJson.mockResolvedValue({
      problems: [
        { id: idOf('Bayside Garage has 540 reviews'), problem: 'Names no source.', fix: 'Bayside Garage has 540 Google reviews.' },
        { id: idOf('1,250 followers'), problem: 'Wrong count.', fix: 'It has 9,999 followers.' },
        { id: 'w999', problem: 'No such sentence.', fix: '' },
      ],
    });
    const out = await runVerifyCheck(2)(ctx(o));
    expect(out).toMatchObject({ status: 'agreed', agreed_with: 1, disagreements: [], hold: null, reason: 'Round 2 agreed with the first read.' });
    // Nothing replaces the first read's data; only the reviewed write-up.
    expect(Object.keys(out.outputs!)).toEqual(['model']);
    const w = (out.outputs!.model as ReturnType<typeof sampleModelOutput>).writeup;
    expect(w.areas.google.costing).toEqual(['Bayside Garage has 540 Google reviews.']);
    // A fix with a number the data does not have is not taken: the sentence is dropped.
    expect(w.areas.social.working).toEqual([]);
    expect(out.review).toEqual({
      checked: sentencesOf(writeup(), 'w').length,
      corrected: [{ from: 'Bayside Garage has 540 reviews', to: 'Bayside Garage has 540 Google reviews.', problem: 'Names no source.' }],
      dropped: [{ from: '1,250 followers', problem: 'Wrong count.' }],
    });
    expect((out.outputs!.model as { removed_sentences: string[] }).removed_sentences).toContain('1,250 followers');
    const [system, user] = mocks.chatJson.mock.calls[0];
    expect(system).toBe(REVIEW_SYSTEM);
    expect(user).toContain('"estimates"');
  });

  it('still agrees when a figure moves within the tolerance, or likes on recent posts keep coming in', async () => {
    const r = read(2, (x) => {
      const ig = (x.social as { business: { followers: number; avg_likes_recent: number } }).business;
      ig.followers = 1300;
      ig.avg_likes_recent = 40;
      searches(1.04)(x);
    });
    const out = await runVerifyCheck(2)(ctx({ ...first(), [readStep(2)]: r }));
    expect(out.status).toBe('agreed');
  });

  it('reads a third time when the second moved, and delivers the first when the third agrees with it', async () => {
    const r2 = read(2, searches(1.5));
    const o = { ...first(), [readStep(2)]: r2 };
    const two = await runVerifyCheck(2)(ctx(o));
    expect(two.status).toBe('again');
    expect(two.disagreements.map((d) => d.key)).toContain('keyword:brake repair near me:searches');
    expect(mocks.chatJson).not.toHaveBeenCalled();
    const three = await runVerifyCheck(3)(ctx({ ...o, [checkStep(2)]: two, [readStep(3)]: read(3) }));
    expect(three).toMatchObject({ status: 'agreed', agreed_with: 1 });
  });

  it('delivers a later read, with the plan and the search-ad model re-run on it, when the first read did not hold up', async () => {
    const o = { ...first(), [readStep(2)]: read(2, searches(1.5)) };
    const two = await runVerifyCheck(2)(ctx(o));
    const three = await runVerifyCheck(3)(ctx({ ...o, [checkStep(2)]: two, [readStep(3)]: read(3, searches(1.5)) }));
    expect(three).toMatchObject({ status: 'agreed', agreed_with: 2, reason: 'Round 3 agreed with round 2; the first read did not hold up.' });
    const out = three.outputs!;
    expect(out.keywords).toEqual((o[readStep(2)] as VerifyReadOutput).reads.keywords);
    const before = (o.adplan as AdplanOutput).plan.rows[0];
    const after = (out.adplan as AdplanOutput).plan.rows.find((r) => r.angle_id === before.angle_id && r.platform === before.platform)!;
    expect(after.demand).toBeCloseTo(before.demand * 1.5, -1);
    const roi = (m: unknown) => (m as ReturnType<typeof sampleModelOutput>).roi!.demand_monthly;
    expect(roi(out.model)).toBeCloseTo(roi(o.model) * 1.5, -1);
  });

  it('holds after the last round with what moved, and keeps the first read, reviewed, for "Deliver anyway"', async () => {
    const o = { ...first(), [readStep(2)]: read(2, searches(1.5)) };
    const two = await runVerifyCheck(2)(ctx(o));
    const three = await runVerifyCheck(3)(ctx({ ...o, [checkStep(2)]: two, [readStep(3)]: read(3, searches(2)) }));
    expect(three.status).toBe('held');
    expect(three.agreed_with).toBeNull();
    expect(three.hold).toMatch(/^The figures did not agree after 3 reads: /);
    expect(three.disagreements.find((d) => d.key === 'keyword:brake repair near me:searches')).toMatchObject({ earlier: 900, later: 1800 });
    expect(Object.keys(three.outputs!)).toEqual(['model']);
    expect(mocks.chatJson).toHaveBeenCalledTimes(1);
  });

  it('takes the last round from the audit\'s own steps, not the setup file', async () => {
    const o = { ...first(), [readStep(2)]: read(2, searches(1.5)) };
    expect((await runVerifyCheck(2)(ctx(o, { steps: STEPS_2 }))).status).toBe('held');
    expect((await runVerifyCheck(2)(ctx(o, { steps: undefined }))).status).toBe('again');
  });

  it('counts a source that could not be read again, or a read that never ran, as a disagreement', async () => {
    const r = read(2);
    delete r.reads.maps;
    r.errors.maps = 'Google showed a consent page.';
    const out = await runVerifyCheck(2)(ctx({ ...first(), [readStep(2)]: r }));
    expect(out.status).toBe('again');
    expect(out.disagreements).toContainEqual({ key: 'source:maps', label: 'Google Maps was read', earlier: 1, later: null, change: null, kind: 'unread' });
    expect(out.disagreements.find((d) => d.key === 'maps:rating')?.kind).toBe('unread');
    // The read step failed three times and was skipped: nothing was read again.
    expect((await runVerifyCheck(2)(ctx(first()))).disagreements.filter((d) => d.key.startsWith('source:')).map((d) => d.key)).toEqual([
      'source:maps',
      'source:search',
      'source:keywords',
      'source:social',
    ]);
  });

  it('skips later rounds once a round has settled', async () => {
    const settled = { round: 2, status: 'agreed', disagreements: [] } as unknown as VerifyCheckOutput;
    const o = { ...first(), [checkStep(2)]: settled };
    expect(await runVerifyRead(3)(ctx(o))).toMatchObject({ skipped: 'Settled in round 2.' });
    expect(await runVerifyCheck(3)(ctx(o))).toMatchObject({ status: 'skipped', reason: 'Settled in round 2.', hold: null });
    expect(mocks.runMaps).not.toHaveBeenCalled();
    expect(mocks.chatJson).not.toHaveBeenCalled();
  });
});

describe('the reviewer', () => {
  const agreed = () => ({ ...first(), [readStep(2)]: read(2) });

  it('holds when it drops more than the setup file allows', async () => {
    const all = sentencesOf(writeup(), 'w');
    const many = all.slice(2, 2 + Math.ceil(all.length * GROUNDSWELL_CONFIG.verification.max_review_drops) + 1);
    mocks.chatJson.mockResolvedValue({ problems: many.map((s) => ({ id: s.id, problem: 'Not in the data.', fix: '' })) });
    const out = await runVerifyCheck(2)(ctx(agreed()));
    expect(out.status).toBe('held');
    expect(out.hold).toBe(`The reviewer dropped ${many.length} of ${all.length} sentences; read the write-up before it goes out.`);
  });

  it('holds when the headline cannot be kept, and keeps the original for "Deliver anyway"', async () => {
    mocks.chatJson.mockResolvedValue({ problems: [{ id: 'w1', problem: 'Rivals do not win the searches.', fix: '' }] });
    const out = await runVerifyCheck(2)(ctx(agreed()));
    expect(out.hold).toBe('The reviewer found the headline does not match the data, and no correction held up.');
    expect((out.outputs!.model as ReturnType<typeof sampleModelOutput>).writeup.headline).toBe(writeup().headline);
  });

  it('retries when the reviewer does not answer, and holds after the last attempt', async () => {
    mocks.chatJson.mockRejectedValue(new Error('OpenAI failed (503): overloaded'));
    await expect(runVerifyCheck(2)(ctx(agreed()))).rejects.toThrow('overloaded');
    const out = await runVerifyCheck(2)(ctx(agreed(), { attempt: 3 }));
    expect(out).toMatchObject({ status: 'held', agreed_with: 1, hold: 'The reviewer could not run (OpenAI failed (503): overloaded); read the write-up before it goes out.' });
  });

  it('fails at once without a write-up', async () => {
    const o = agreed();
    delete o.model;
    await expect(runVerifyCheck(2)(ctx(o))).rejects.toBeInstanceOf(PermanentStepError);
  });

  it('walks the same sentences in the same order to enumerate and to apply, splitting at sentence ends but not inside numbers', () => {
    const w = { verdict: 'It has a 4.6 rating. It posts rarely!', lever: 'format', list: ['One.', 'Two. Three.'] };
    expect(sentencesOf(w, 'x')).toEqual([
      { id: 'x1', text: 'It has a 4.6 rating.' },
      { id: 'x2', text: 'It posts rarely!' },
      { id: 'x3', text: 'One.' },
      { id: 'x4', text: 'Two.' },
      { id: 'x5', text: 'Three.' },
    ]);
    expect(reviseSentences(w, 'x', (t, id) => (id === 'x2' || id === 'x3' ? '' : id === 'x5' ? 'Four.' : t))).toEqual({
      verdict: 'It has a 4.6 rating.',
      lever: 'format',
      list: ['Two. Four.'],
    });
  });
});

describe('delivery', () => {
  it('builds the reports from the settled check\'s replacements, never from a round that did not settle', () => {
    const model = sampleModelOutput();
    const reviewed = { ...model, writeup: { ...model.writeup, headline: 'Reviewed headline' } };
    const o: Outputs = {
      ...first(),
      [checkStep(2)]: { round: 2, status: 'again', disagreements: [], outputs: null },
      [checkStep(3)]: { round: 3, status: 'agreed', disagreements: [], outputs: { model: reviewed } },
    };
    expect(verifiedOutputs(o).model).toBe(reviewed);
    expect(reportData(ctx(o)).model.writeup.headline).toBe('Reviewed headline');
    const untouched = first();
    expect(verifiedOutputs(untouched)).toBe(untouched);
  });

  it('fits the ad copy to a re-run plan', () => {
    const plan = sampleAdplanOutput().plan;
    const [kept, gone] = plan.rows.filter((r) => r.recommendation !== 'skip');
    const ad = (r: typeof kept) => ({ angle: r.angle, platform_label: r.platform_label, recommendation: 'fund' as const, format: 'f', limits_source: 's', fields: {} });
    const copy = { model: 'm', generated_at: 'g', ads: [ad(kept), ad(gone)], not_written: [], dropped: [] } as unknown as AdcopyOutput;
    const rows = plan.rows.map((r) => (r === gone ? { ...r, recommendation: 'skip' as const } : r));
    const out = refitCopy(copy, { ...plan, rows });
    expect(out.ads.map((a) => a.angle + a.platform_label)).toEqual([kept.angle + kept.platform_label]);
    expect(out.ads[0].recommendation).toBe(kept.recommendation);
    expect(out.dropped).toEqual([`${gone.angle} on ${gone.platform_label}: no longer in the plan after its figures were read again.`]);
    const others = rows.filter((r) => r.recommendation !== 'skip' && r !== kept);
    expect(out.not_written.map((n) => n.angle + n.platform_label)).toEqual(others.map((r) => r.angle + r.platform_label));
  });
});

describe('the steps', () => {
  it('gives each round after the first a read (optional) and a check (required), up to the supported rounds', () => {
    expect(verifySteps(3).map((s) => [s.name, s.optional])).toEqual([
      [readStep(2), true],
      [checkStep(2), false],
      [readStep(3), true],
      [checkStep(3), false],
    ]);
    expect(() => verifySteps(6)).toThrow(/at most 5/);
  });
});

describe('answering a held audit', () => {
  const ID = '6f1c2a5e-0b7d-4c1e-9a2b-3c4d5e6f7a8b';
  const held = { round: 3, status: 'held', disagreements: [], hold: 'The figures did not agree after 3 reads.', outputs: { model: { reviewed: true } } };
  const seed = (status = 'review') => ({
    marketing_audits: [{ id: ID, status, error: 'The figures did not agree after 3 reads.' }],
    marketing_audit_steps: [
      { id: 's1', audit_id: ID, step: 'model', status: 'done', attempts: 1, output: { m: 1 } },
      { id: 's2', audit_id: ID, step: readStep(2), status: 'done', attempts: 1, output: { round: 2 } },
      { id: 's3', audit_id: ID, step: checkStep(2), status: 'done', attempts: 1, output: { round: 2, status: 'again', disagreements: [] } },
      { id: 's4', audit_id: ID, step: checkStep(3), status: 'done', attempts: 2, output: held },
      { id: 's5', audit_id: ID, step: 'deliver_prepare', status: 'pending', attempts: 0, output: null },
    ],
  });
  const db = (status?: string) => {
    const fake = fakeSupabase(seed(status));
    return { fake, client: fake.client as unknown as SupabaseClient };
  };

  it('delivers it as it stands: marks the held check released and lets the audit run on', async () => {
    const { fake, client } = db();
    expect(await answerReview(client, ID, 'deliver')).toBe('deliver');
    expect(fake.tables.marketing_audits[0]).toMatchObject({ status: 'running', error: null });
    const check = fake.tables.marketing_audit_steps.find((r) => r.id === 's4')!;
    expect(check.output).toMatchObject({ ...held, released_at: expect.any(String) });
    // Delivery then builds from the held check's outputs.
    expect(verifiedOutputs({ [checkStep(3)]: check.output }).model).toEqual({ reviewed: true });
  });

  it('runs the checks again from the second read, leaving the first pass alone', async () => {
    const { fake, client } = db();
    await answerReview(client, ID, 'recheck');
    const rows = Object.fromEntries(fake.tables.marketing_audit_steps.map((r) => [r.step, r]));
    for (const step of [readStep(2), checkStep(2), checkStep(3)]) expect(rows[step]).toMatchObject({ status: 'pending', attempts: 0, output: null });
    expect(rows.model).toMatchObject({ status: 'done', output: { m: 1 } });
    expect(fake.tables.marketing_audits[0]).toMatchObject({ status: 'running', error: null });
  });

  it('refuses an audit that is not held, a bad id, or an unknown answer', async () => {
    await expect(answerReview(db('done').client, ID, 'deliver')).rejects.toMatchObject({ status: 409 });
    await expect(answerReview(db().client, 'not-an-id', 'deliver')).rejects.toMatchObject({ status: 400 });
    await expect(answerReview(db().client, ID, 'approve')).rejects.toBeInstanceOf(ReviewError);
    await expect(answerReview(db().client, '00000000-0000-4000-8000-000000000000', 'deliver')).rejects.toMatchObject({ status: 404 });
  });
});
