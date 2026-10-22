import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ getUser: vi.fn() }));
const db = vi.hoisted(() => ({ configured: true, started: [] as string[], error: null as Error | null }));
const engine = vi.hoisted(() => ({ startQueuedAudits: vi.fn(), runWorker: vi.fn() }));
const waitUntil = vi.hoisted(() => vi.fn());
const review = vi.hoisted(() => ({ answerReview: vi.fn() }));

vi.mock('../../../api/_lib/supabasePublic', () => ({
  isSupabasePublicConfigured: () => true,
  missingSupabasePublicEnv: () => [],
  getSupabasePublic: () => ({ auth: { getUser: auth.getUser } }),
}));
vi.mock('../../../api/_lib/supabaseAdmin', () => ({
  isSupabaseConfigured: () => db.configured,
  getSupabaseAdmin: () => ({ fake: 'db' }),
}));
vi.mock('../../../api/_lib/groundswell/engine', () => engine);
vi.mock('@vercel/functions', () => ({ waitUntil }));
vi.mock('../../../api/_lib/groundswell/review', async (original) => ({ ...(await original<object>()), answerReview: review.answerReview }));

import handler, { MAX_AUDITS_PER_CLICK } from '../../../api/groundswell/run';
import worker from '../../../api/groundswell/worker';
import { FUNCTION_SECONDS } from '../../../api/_lib/groundswell/background';
import { ALL_STEPS, BENCHMARK_STEPS, STEPS } from '../../../api/_lib/groundswell/steps';
import { ReviewError } from '../../../api/_lib/groundswell/review';

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
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    send(payload: string) {
      this.body = payload;
      return this;
    },
  };
}

const signedIn = { authorization: 'Bearer good-session' };

async function call(route: typeof handler, headers: Record<string, string> = signedIn, method = 'POST') {
  const res = makeRes();
  await route({ method, headers }, res);
  return res;
}

beforeEach(() => {
  auth.getUser.mockReset();
  auth.getUser.mockImplementation(async (token: string) =>
    token === 'good-session' ? { data: { user: { id: 'admin' } }, error: null } : { data: { user: null }, error: { message: 'bad' } }
  );
  db.configured = true;
  engine.startQueuedAudits.mockReset();
  engine.startQueuedAudits.mockResolvedValue(['a1', 'a2']);
  engine.runWorker.mockReset();
  engine.runWorker.mockResolvedValue({ ran: [], finished: [] });
  waitUntil.mockReset();
  vi.stubEnv('ADMIN_API_KEY', 'test-admin-key');
  vi.stubEnv('COMPOSIO_API_KEY', 'ak_test');
  vi.stubEnv('OPENAI_API_KEY', 'sk-test');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('POST /api/groundswell/run', () => {
  it('accepts GET and POST only', async () => {
    expect((await call(handler, signedIn, 'PUT')).statusCode).toBe(405);
    expect(engine.startQueuedAudits).not.toHaveBeenCalled();
  });

  it('reports which services are set up, by name only', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    const res = await call(handler, signedIn, 'GET');
    expect(res.statusCode).toBe(200);
    const body = res.body as { ready: boolean; checks: { key: string; ok: boolean; required: boolean }[] };
    expect(body.ready).toBe(true);
    expect(body.checks.find((c) => c.key === 'RESEND_API_KEY')).toMatchObject({ ok: false, required: false });
    expect(JSON.stringify(body)).not.toContain('sk-test');
    expect(JSON.stringify(body)).not.toContain('ak_test');
    vi.stubEnv('OPENAI_API_KEY', '');
    expect(((await call(handler, signedIn, 'GET')).body as { ready: boolean }).ready).toBe(false);
    expect((await call(handler, {}, 'GET')).statusCode).toBe(401);
  });

  it('refuses callers who are not signed-in admins', async () => {
    expect((await call(handler, {})).statusCode).toBe(401);
    expect((await call(handler, { authorization: 'Bearer expired' })).statusCode).toBe(401);
    expect(engine.startQueuedAudits).not.toHaveBeenCalled();
  });

  it('answers 503 until Supabase, Composio and OpenAI are set up', async () => {
    vi.stubEnv('COMPOSIO_API_KEY', '');
    expect((await call(handler)).statusCode).toBe(503);
    vi.stubEnv('COMPOSIO_API_KEY', 'ak_test');
    vi.stubEnv('OPENAI_API_KEY', '');
    expect((await call(handler)).statusCode).toBe(503);
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');
    db.configured = false;
    expect((await call(handler)).statusCode).toBe(503);
    expect(engine.startQueuedAudits).not.toHaveBeenCalled();
  });

  it('says so when nothing is queued, without starting the worker', async () => {
    engine.startQueuedAudits.mockResolvedValue([]);
    const res = await call(handler);
    expect(res.statusCode).toBe(409);
    expect(waitUntil).not.toHaveBeenCalled();
  });

  it(`starts up to ${MAX_AUDITS_PER_CLICK} queued audits with every step, then works on them after answering`, async () => {
    const res = await call(handler);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ started: 2 });
    // Audits get the audit steps; competitor benchmarks the benchmark steps.
    expect(engine.startQueuedAudits).toHaveBeenCalledWith({ fake: 'db' }, STEPS, MAX_AUDITS_PER_CLICK, BENCHMARK_STEPS);
    expect(waitUntil).toHaveBeenCalledTimes(1);
    await waitUntil.mock.calls[0][0];
    const [, steps, { deadline }] = engine.runWorker.mock.calls[0];
    // The worker knows every step, so it can run either kind.
    expect(steps).toBe(ALL_STEPS);
    expect(deadline - Date.now()).toBeLessThanOrEqual(FUNCTION_SECONDS * 1000);
  });

  it('answers a held audit (deliver or check again) instead of starting the queue, and works on it after answering', async () => {
    review.answerReview.mockResolvedValueOnce('recheck');
    const res = makeRes();
    await handler({ method: 'POST', headers: signedIn, body: { action: 'recheck', audit_id: 'a-1' } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ action: 'recheck' });
    expect(review.answerReview).toHaveBeenCalledWith({ fake: 'db' }, 'a-1', 'recheck');
    expect(engine.startQueuedAudits).not.toHaveBeenCalled();
    expect(waitUntil).toHaveBeenCalledTimes(1);

    review.answerReview.mockRejectedValueOnce(new ReviewError(409, 'This audit is not waiting for review.'));
    const refused = makeRes();
    await handler({ method: 'POST', headers: signedIn, body: JSON.stringify({ action: 'deliver', audit_id: 'a-1' }) }, refused);
    expect(refused.statusCode).toBe(409);
    expect(refused.body).toEqual({ error: 'This audit is not waiting for review.' });

    review.answerReview.mockRejectedValueOnce(new Error('connection reset'));
    const failed = makeRes();
    await handler({ method: 'POST', headers: signedIn, body: { action: 'deliver', audit_id: 'a-1' } }, failed);
    expect(failed.statusCode).toBe(500);
    expect(failed.body).toEqual({ error: 'Could not update the audit.' });
  });

  it('reports a database failure', async () => {
    engine.startQueuedAudits.mockRejectedValue(new Error('rpc missing'));
    expect((await call(handler)).statusCode).toBe(500);
  });
});

describe('POST /api/groundswell/worker', () => {
  it('takes the cron key, answers at once and keeps working in the background', async () => {
    const res = await call(worker, { 'x-admin-key': 'test-admin-key' });
    expect(res.statusCode).toBe(202);
    expect(waitUntil).toHaveBeenCalledTimes(1);
  });

  it('refuses anyone else', async () => {
    expect((await call(worker, { 'x-admin-key': 'wrong' })).statusCode).toBe(401);
    expect((await call(worker, {}, 'POST')).statusCode).toBe(401);
    expect(waitUntil).not.toHaveBeenCalled();
  });
});

describe('Groundswell steps and Vercel limits', () => {
  it('lists unique step names and ends with delivery', () => {
    const names = STEPS.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
    // The competitor picker runs first, so the Site, Social and Search steps already see its picks.
    expect(names.slice(0, 2)).toEqual(['competitors', 'site']);
    expect(names[names.length - 1]).toBe('deliver_finish');
    expect(STEPS.filter((s) => s.current === 'Delivery').every((s) => !s.optional)).toBe(true);
  });

  it('gives both routes the time the worker plans for, and ships Chromium and the report font', () => {
    const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
    for (const route of ['api/groundswell/run.ts', 'api/groundswell/worker.ts']) {
      expect(vercel.functions[route].maxDuration).toBe(FUNCTION_SECONDS);
      expect(vercel.functions[route].includeFiles).toContain('node_modules/@sparticuz/chromium/bin/**');
      expect(vercel.functions[route].includeFiles).toContain('inter-latin-var.woff2');
    }
  });

  it('the latest migration points the cron at the worker route, and the old address still rewrites there', () => {
    const engineSql = readFileSync('supabase/migrations/20261021120000_groundswell_engine.sql', 'utf8');
    for (const fn of ['claim_next_audit_step', 'start_queued_audits']) expect(engineSql).toContain(`GRANT EXECUTE ON FUNCTION ${fn}`);
    const partnersSql = readFileSync('supabase/migrations/20261021140000_groundswell_partners.sql', 'utf8');
    expect(partnersSql).toContain("'https://www.newwaveitfl.com/api/groundswell/worker'");
    const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
    expect(vercel.rewrites).toContainEqual({ source: '/api/audits/worker', destination: '/api/groundswell/worker' });
    expect(vercel.rewrites).toContainEqual({ source: '/api/audits/run', destination: '/api/groundswell/run' });
  });
});
