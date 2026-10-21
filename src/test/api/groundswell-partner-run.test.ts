import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from './fixtures/fakeSupabase';

/**
 * /api/groundswell/partner-run: a partner starts an audit of its own customer.
 * `start_audit` (migration 20261025120000) is stood in for by startAuditFn
 * below, which applies the same rules on the fake tables: only a queued audit
 * of that partner, one running at a time, so many started in the last 24
 * hours (the partner's daily_run_limit, or the default).
 */

const db = vi.hoisted(() => ({ current: null as ReturnType<typeof import('./fixtures/fakeSupabase').fakeSupabase> | null }));
const mail = vi.hoisted(() => ({ send: vi.fn() }));
const background = vi.hoisted(() => ({ runWorkerInBackground: vi.fn() }));

vi.mock('../../../api/_lib/supabaseAdmin', () => ({
  isSupabaseConfigured: () => true,
  getSupabaseAdmin: () => db.current!.client,
}));
vi.mock('../../../api/_lib/groundswell/background', () => ({ FUNCTION_SECONDS: 300, ...background }));
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mail.send };
  },
}));

import { hashPassword } from '../../../api/_lib/groundswell/partners';
import { BENCHMARK_STEPS, STEPS } from '../../../api/_lib/groundswell/steps';
import type { ApiRequest, ApiResponse } from '../../../api/_lib/http';
import partnerAuth from '../../../api/groundswell/partner-auth';
import customers from '../../../api/groundswell/partner-customers';
import run, { refusal, untilText } from '../../../api/groundswell/partner-run';

type Row = Record<string, unknown>;

interface Body {
  token: string;
  error: string;
  customer: { id: string; latest: { id: string; status: string; kind: string } | null; audit_count: number };
  audits: { id: string; status: string; steps?: { step: string; status: string }[]; [key: string]: unknown }[];
}

function makeRes() {
  return {
    statusCode: 0,
    body: undefined as unknown as Body,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload as Body;
      return this;
    },
    send(payload: string) {
      this.body = payload as unknown as Body;
      return this;
    },
  };
}

let ipCounter = 0;
async function call(route: typeof run, method: string, body?: unknown, headers: Record<string, string> = {}, query: Record<string, string> = {}) {
  const res = makeRes();
  await route({ method, body, query, headers: { 'x-forwarded-for': `10.3.0.${++ipCounter % 250}`, ...headers } } as unknown as ApiRequest, res as unknown as ApiResponse);
  return res;
}

const ago = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();
const DEFAULT_LIMIT = 3;

/** The SQL function's rules, on the fake tables. */
function startAuditFn(args: Record<string, unknown>, tables: Record<string, Row[]>) {
  const audits = tables.marketing_audits;
  const audit = audits.find((a) => a.id === args.p_audit_id && a.partner_id === args.p_partner_id && a.status === 'queued');
  if (!audit) return [{ outcome: 'not_queued', running_business: null, resets_at: null }];
  const running = audits.filter((a) => a.partner_id === args.p_partner_id && a.status === 'running').sort((a, b) => String(a.started_at).localeCompare(String(b.started_at)))[0];
  if (running) return [{ outcome: 'another_running', running_business: running.business_name, resets_at: null }];
  const partner = tables.groundswell_partners.find((p) => p.id === args.p_partner_id);
  const cap = typeof partner?.daily_run_limit === 'number' ? partner.daily_run_limit : (args.default_daily_limit as number);
  const recent = audits.filter((a) => a.partner_id === args.p_partner_id && typeof a.started_at === 'string' && Date.parse(a.started_at) >= Date.now() - 86_400_000);
  if (recent.length >= cap) {
    const oldest = recent.map((a) => Date.parse(a.started_at as string)).sort()[0];
    return [{ outcome: 'daily_limit', running_business: null, resets_at: new Date(oldest + 86_400_000).toISOString() }];
  }
  Object.assign(audit, { status: 'running', started_at: new Date().toISOString(), completed_at: null, error: null });
  tables.marketing_audit_steps = tables.marketing_audit_steps.filter((s) => s.audit_id !== audit.id);
  const names = (audit.kind === 'benchmark' && args.benchmark_step_names ? args.benchmark_step_names : args.step_names) as string[];
  names.forEach((name, i) => tables.marketing_audit_steps.push({ id: `s-${audit.id}-${i}`, audit_id: audit.id, step: name, position: i + 1, status: 'pending', error: null }));
  return [{ outcome: 'started', running_business: null, resets_at: null }];
}

let goodHash = '';
let testNo = 0;
let SAM = '';
let auth: Record<string, string> = {};

function seed(rows: { audits?: Row[]; partner?: Row } = {}, functions: Record<string, (args: Record<string, unknown>, tables: Record<string, Row[]>) => unknown> = { start_audit: startAuditFn }) {
  const sessions = db.current?.tables.groundswell_partner_sessions ?? [];
  db.current = fakeSupabase(
    {
      groundswell_partners: [
        { id: 'p-active', company: 'Reef Agency', contact_name: 'Sam', email: SAM, status: 'active', password_hash: goodHash, created_at: ago(100), last_sign_in_at: null, daily_run_limit: null, ...rows.partner },
        { id: 'p-other', company: 'Tide Co', contact_name: null, email: 'ops@tide.example', status: 'active', password_hash: goodHash, created_at: ago(100), last_sign_in_at: null, daily_run_limit: null },
      ],
      groundswell_partner_sessions: sessions,
      groundswell_customers: [
        { id: 'c-harbor', partner_id: 'p-active', business_name: 'Harbor Auto', city: 'Miami', website: 'https://harbor.example', instagram: null, competitors: [{ name: 'Dock', website: 'https://dock.example' }, { name: 'Pier', instagram: 'pier' }], notes: null, created_at: ago(100), updated_at: ago(100) },
        { id: 'c-bay', partner_id: 'p-active', business_name: 'Bay Bikes', city: null, website: null, instagram: 'baybikes', competitors: [], notes: null, created_at: ago(90), updated_at: ago(90) },
        { id: 'c-theirs', partner_id: 'p-other', business_name: 'Theirs', city: null, website: 'https://theirs.example', instagram: null, competitors: [], notes: null, created_at: ago(100), updated_at: ago(100) },
      ],
      marketing_audits: rows.audits ?? [
        { id: 'a-harbor-q', customer_id: 'c-harbor', partner_id: 'p-active', business_name: 'Harbor Auto', website: 'https://harbor.example', competitors: [], status: 'queued', kind: 'benchmark', created_at: ago(1), started_at: null, completed_at: null },
        { id: 'a-bay-done', customer_id: 'c-bay', partner_id: 'p-active', business_name: 'Bay Bikes', instagram: 'baybikes', competitors: [], status: 'done', kind: 'audit', created_at: ago(80), started_at: ago(79), completed_at: ago(78), summary_pdf_url: 'https://drive.google.com/file/d/S/view' },
        { id: 'a-theirs-q', customer_id: 'c-theirs', partner_id: 'p-other', business_name: 'Theirs', status: 'queued', created_at: ago(1), started_at: null, completed_at: null },
      ],
      marketing_audit_steps: [],
    },
    {},
    functions
  );
}

beforeEach(async () => {
  SAM = `sam${++testNo}@reef-run.example`;
  goodHash ||= await hashPassword('correct horse battery');
  seed();
  mail.send.mockReset();
  mail.send.mockResolvedValue({ data: { id: 'email-1' }, error: null });
  background.runWorkerInBackground.mockReset();
  vi.stubEnv('RESEND_API_KEY', 're_test');
  vi.stubEnv('COMPOSIO_API_KEY', 'ak_test');
  vi.stubEnv('OPENAI_API_KEY', 'sk-test');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const res = makeRes();
  await partnerAuth(
    { method: 'POST', body: { action: 'sign-in', email: SAM, password: 'correct horse battery' }, headers: { 'x-forwarded-for': `10.4.0.${testNo % 250}` } } as unknown as ApiRequest,
    res as unknown as ApiResponse
  );
  auth = { authorization: `Bearer ${res.body.token}` };
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const audit = (id: string) => db.current!.tables.marketing_audits.find((a) => a.id === id)!;
const stepsOf = (id: string) => db.current!.tables.marketing_audit_steps.filter((s) => s.audit_id === id).map((s) => s.step);

describe('starting a queued audit', () => {
  it('needs a partner session and a customer of its own', async () => {
    expect((await call(run, 'POST', { customer_id: 'c-harbor' })).statusCode).toBe(401);
    expect((await call(run, 'POST', {}, auth)).statusCode).toBe(400);
    expect((await call(run, 'POST', { customer_id: 'c-theirs' }, auth)).statusCode).toBe(404);
    expect(audit('a-theirs-q').status).toBe('queued');
    expect(background.runWorkerInBackground).not.toHaveBeenCalled();
  });

  it('starts the queued audit with its kind’s steps, kicks the worker, tells the team, and answers with progress', async () => {
    const res = await call(run, 'POST', { customer_id: 'c-harbor' }, auth);
    expect(res.statusCode).toBe(200);
    expect(audit('a-harbor-q').status).toBe('running');
    expect(stepsOf('a-harbor-q')).toEqual(BENCHMARK_STEPS.map((s) => s.name));
    expect(background.runWorkerInBackground).toHaveBeenCalledTimes(1);
    expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({ subject: expect.stringMatching(/started an audit: Harbor Auto/) }));
    expect(res.body.customer).toMatchObject({ id: 'c-harbor', latest: { id: 'a-harbor-q', status: 'running' }, audit_count: 1 });
    expect(res.body.audits[0].steps).toHaveLength(BENCHMARK_STEPS.length);
    expect(res.body.audits[0].steps![0]).toEqual({ step: 'site', status: 'pending' });
    expect(res.body.audits[0]).not.toHaveProperty('error');
    // The customer read now carries the same progress, and the run cannot be started twice.
    const page = await call(customers, 'GET', undefined, auth, { id: 'c-harbor' });
    expect(page.body.audits[0].steps).toHaveLength(BENCHMARK_STEPS.length);
    expect((await call(run, 'POST', { customer_id: 'c-harbor' }, auth)).statusCode).toBe(409);
  });

  it('refuses to start a second audit while one is running, naming it, and removes the fresh one it queued', async () => {
    expect((await call(run, 'POST', { customer_id: 'c-harbor' }, auth)).statusCode).toBe(200);
    const res = await call(run, 'POST', { customer_id: 'c-bay' }, auth);
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/Harbor Auto is still running/);
    expect(db.current!.tables.marketing_audits.filter((a) => a.customer_id === 'c-bay')).toHaveLength(1);
  });
});

describe('running again', () => {
  it('queues a fresh audit from the customer’s details, as a benchmark when asked, and starts it', async () => {
    const res = await call(run, 'POST', { customer_id: 'c-bay', kind: 'benchmark' }, auth);
    // Bay Bikes has no competitors, so a benchmark is refused and nothing is added.
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/two competitors/);
    expect(db.current!.tables.marketing_audits.filter((a) => a.customer_id === 'c-bay')).toHaveLength(1);

    const plain = await call(run, 'POST', { customer_id: 'c-bay', kind: 'audit', brand_color: '#123456' }, auth);
    expect(plain.statusCode).toBe(200);
    const rows = db.current!.tables.marketing_audits.filter((a) => a.customer_id === 'c-bay');
    expect(rows).toHaveLength(2);
    const fresh = rows.find((a) => a.id !== 'a-bay-done')!;
    expect(fresh).toMatchObject({ status: 'running', partner_id: 'p-active', instagram: 'baybikes', brand_color: '#123456' });
    expect(stepsOf(fresh.id as string)).toEqual(STEPS.map((s) => s.name));
    expect(audit('a-bay-done')).toMatchObject({ status: 'done', summary_pdf_url: 'https://drive.google.com/file/d/S/view' });
    expect(plain.body.customer).toMatchObject({ latest: { id: fresh.id, status: 'running', kind: 'audit' }, audit_count: 2 });
    expect(plain.body.audits.map((a) => a.id)).toEqual([fresh.id, 'a-bay-done']);
  });

  it('holds the daily cap, says when the next run frees up, and leaves nothing queued', async () => {
    seed({
      audits: [
        { id: 'r1', customer_id: 'c-bay', partner_id: 'p-active', business_name: 'Bay Bikes', status: 'done', created_at: ago(20), started_at: ago(20), completed_at: ago(19) },
        { id: 'r2', customer_id: 'c-bay', partner_id: 'p-active', business_name: 'Bay Bikes', status: 'done', created_at: ago(10), started_at: ago(10), completed_at: ago(9) },
        { id: 'r3', customer_id: 'c-bay', partner_id: 'p-active', business_name: 'Bay Bikes', status: 'failed', created_at: ago(5), started_at: ago(5), completed_at: ago(4) },
        { id: 'old', customer_id: 'c-harbor', partner_id: 'p-active', business_name: 'Harbor Auto', status: 'done', created_at: ago(30), started_at: ago(30), completed_at: ago(29) },
      ],
    });
    const res = await call(run, 'POST', { customer_id: 'c-harbor' }, auth);
    expect(res.statusCode).toBe(429);
    expect(res.body.error).toMatch(/used your 3 runs for today\. The next one frees up in about 4 hours/);
    expect(db.current!.tables.marketing_audits.filter((a) => a.customer_id === 'c-harbor')).toHaveLength(1);
    expect(background.runWorkerInBackground).not.toHaveBeenCalled();

    // A partner's own limit replaces the default, in the refusal too.
    seed({ partner: { daily_run_limit: 1 }, audits: [{ id: 'r1', customer_id: 'c-bay', partner_id: 'p-active', business_name: 'Bay Bikes', status: 'done', created_at: ago(23.5), started_at: ago(23.5), completed_at: ago(23) }] });
    const one = await call(run, 'POST', { customer_id: 'c-harbor' }, auth);
    expect(one.statusCode).toBe(429);
    expect(one.body.error).toMatch(/used your 1 run for today\. The next one frees up in 30 minutes/);

    seed({ partner: { daily_run_limit: 5 }, audits: [{ id: 'r1', customer_id: 'c-bay', partner_id: 'p-active', business_name: 'Bay Bikes', status: 'done', created_at: ago(2), started_at: ago(2), completed_at: ago(1) }] });
    expect((await call(run, 'POST', { customer_id: 'c-harbor' }, auth)).statusCode).toBe(200);
  });

  it('keeps a fresh audit queued for New Wave before the migration adds start_audit', async () => {
    seed({}, {});
    const res = await call(run, 'POST', { customer_id: 'c-bay' }, auth);
    expect(res.statusCode).toBe(503);
    expect(res.body.error).toMatch(/isn’t switched on yet/);
    const rows = db.current!.tables.marketing_audits.filter((a) => a.customer_id === 'c-bay');
    expect(rows).toHaveLength(2);
    expect(rows.some((a) => a.status === 'queued')).toBe(true);
    expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({ subject: expect.stringMatching(/queued an audit: Bay Bikes/) }));
    expect(background.runWorkerInBackground).not.toHaveBeenCalled();
  });

  it('says the engine is not set up without naming what is missing', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    const res = await call(run, 'POST', { customer_id: 'c-harbor' }, auth);
    expect(res.statusCode).toBe(503);
    expect(res.body.error).not.toMatch(/OPENAI/);
    expect(audit('a-harbor-q').status).toBe('queued');
  });
});

describe('the words for a refusal', () => {
  it('counts down to the next free run without a time zone', () => {
    const now = Date.parse('2026-10-21T12:00:00Z');
    expect(untilText('2026-10-21T12:00:30Z', now)).toBe('in 1 minute');
    expect(untilText('2026-10-21T12:40:00Z', now)).toBe('in 40 minutes');
    expect(untilText('2026-10-21T15:10:00Z', now)).toBe('in about 3 hours');
    expect(untilText(null, now)).toBe('tomorrow');
    expect(refusal({ outcome: 'not_queued', running_business: null, resets_at: null }, DEFAULT_LIMIT)).toEqual({ status: 409, error: 'That audit has already been started.' });
  });
});
