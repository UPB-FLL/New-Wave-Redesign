import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ getUser: vi.fn() }));
const db = vi.hoisted(() => ({ configured: true, count: 0 as number | null, error: null as { message: string } | null, eq: vi.fn() }));

vi.mock('../../../api/_lib/supabasePublic', () => ({
  isSupabasePublicConfigured: () => true,
  missingSupabasePublicEnv: () => [],
  getSupabasePublic: () => ({ auth: { getUser: auth.getUser } }),
}));

vi.mock('../../../api/_lib/supabaseAdmin', () => ({
  isSupabaseConfigured: () => db.configured,
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: (...args: unknown[]) => {
          db.eq(...args);
          return Promise.resolve({ count: db.count, error: db.error });
        },
      }),
    }),
  }),
}));

import handler, { MAX_RUNS_PER_CLICK } from '../../../api/audits/run';

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

const ROUTINE_ID = 'trig_01AuditRoutine';
const signedIn = { authorization: 'Bearer good-session' };
const fetchMock = vi.fn();

async function call(headers: Record<string, string> = signedIn, method = 'POST') {
  const res = makeRes();
  await handler({ method, headers }, res);
  return res;
}

beforeEach(() => {
  auth.getUser.mockReset();
  auth.getUser.mockImplementation(async (token: string) =>
    token === 'good-session' ? { data: { user: { id: 'admin' } }, error: null } : { data: { user: null }, error: { message: 'bad' } }
  );
  db.configured = true;
  db.count = 2;
  db.error = null;
  db.eq.mockReset();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ type: 'routine_fire' }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('ADMIN_API_KEY', 'test-admin-key');
  vi.stubEnv('AUDIT_ROUTINE_ID', ROUTINE_ID);
  vi.stubEnv('AUDIT_ROUTINE_TOKEN', 'routine-token');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('POST /api/audits/run', () => {
  it('accepts POST only', async () => {
    const res = await call(signedIn, 'GET');
    expect(res.statusCode).toBe(405);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses callers who are not signed-in admins', async () => {
    expect((await call({})).statusCode).toBe(401);
    expect((await call({ authorization: 'Bearer expired' })).statusCode).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers 503 until the routine id and token are set, and checks the id shape', async () => {
    vi.stubEnv('AUDIT_ROUTINE_TOKEN', '');
    expect((await call()).statusCode).toBe(503);
    vi.stubEnv('AUDIT_ROUTINE_TOKEN', 'routine-token');
    vi.stubEnv('AUDIT_ROUTINE_ID', 'https://evil.example/');
    expect((await call()).statusCode).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not start a run when nothing is queued', async () => {
    db.count = 0;
    const res = await call();
    expect(res.statusCode).toBe(409);
    expect(db.eq).toHaveBeenCalledWith('status', 'queued');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fires the routine once per queued audit with the documented request', async () => {
    const res = await call();
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ started: 2, queued: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`https://api.anthropic.com/v1/claude_code/routines/${ROUTINE_ID}/fire`);
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer routine-token',
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(init.body).text).toMatch(/marketing-audit/);
  });

  it(`caps one click at ${MAX_RUNS_PER_CLICK} runs`, async () => {
    db.count = 10;
    const res = await call();
    expect(res.body).toEqual({ started: MAX_RUNS_PER_CLICK, queued: 10 });
    expect(fetchMock).toHaveBeenCalledTimes(MAX_RUNS_PER_CLICK);
  });

  it('reports the hourly limit and other failures without leaking the upstream body', async () => {
    fetchMock.mockResolvedValue(new Response('{"error":{"type":"rate_limit_error"}}', { status: 429 }));
    let res = await call();
    expect(res.statusCode).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockReset();
    fetchMock.mockRejectedValue(new Error('network down'));
    res = await call();
    expect(res.statusCode).toBe(502);
  });

  it('counts the runs that started before a failure', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(new Response('{}', { status: 503 }));
    const res = await call();
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ started: 1, queued: 2 });
  });
});
