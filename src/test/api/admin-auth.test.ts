import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  configured: true,
  getUser: vi.fn(),
}));

vi.mock('../../../api/_lib/supabasePublic', () => ({
  isSupabasePublicConfigured: () => auth.configured,
  missingSupabasePublicEnv: () => [],
  getSupabasePublic: () => ({ auth: { getUser: auth.getUser } }),
}));

import { requireAdmin } from '../../../api/_lib/adminKey';
import generatePage from '../../../api/seo/generate-page';
import refreshImages from '../../../api/seo/refresh-images';
import researchCompetitors from '../../../api/seo/research-competitors';

function makeRes() {
  return {
    statusCode: 0,
    body: undefined as unknown,
    setHeader() {},
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

const KEY = 'test-admin-key';

beforeEach(() => {
  auth.configured = true;
  auth.getUser.mockReset();
  vi.stubEnv('ADMIN_API_KEY', KEY);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('requireAdmin', () => {
  const check = async (headers: Record<string, string>) => {
    const res = makeRes();
    const ok = await requireAdmin({ method: 'POST', headers }, res);
    return { ok, status: res.statusCode };
  };

  it('accepts the server key (the cron) and a signed-in admin session (the admin screens)', async () => {
    expect(await check({ 'x-admin-key': KEY })).toEqual({ ok: true, status: 0 });

    auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    expect(await check({ authorization: 'Bearer session-token' })).toEqual({ ok: true, status: 0 });
    expect(auth.getUser).toHaveBeenCalledWith('session-token');
  });

  it('refuses a wrong key, an invalid or expired session, and no credentials', async () => {
    expect(await check({ 'x-admin-key': 'nope' })).toEqual({ ok: false, status: 401 });

    auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid JWT' } });
    expect(await check({ authorization: 'Bearer expired' })).toEqual({ ok: false, status: 401 });

    auth.getUser.mockRejectedValue(new Error('network'));
    expect(await check({ authorization: 'Bearer anything' })).toEqual({ ok: false, status: 401 });

    expect(await check({})).toEqual({ ok: false, status: 401 });
    expect(await check({ authorization: 'Basic abc' })).toEqual({ ok: false, status: 401 });
  });

  it('fails closed when nothing is configured (it used to let everyone through)', async () => {
    vi.stubEnv('ADMIN_API_KEY', '');
    expect(await check({})).toEqual({ ok: false, status: 503 });
    expect(await check({ 'x-admin-key': 'anything' })).toEqual({ ok: false, status: 503 });

    auth.configured = false;
    expect(await check({ authorization: 'Bearer t' })).toEqual({ ok: false, status: 503 });
    expect(auth.getUser).not.toHaveBeenCalled();
  });
});

describe('api/seo routes', () => {
  it.each([
    ['generate-page', generatePage],
    ['refresh-images', refreshImages],
    ['research-competitors', researchCompetitors],
  ] as const)('%s refuses callers without admin credentials, even with ADMIN_API_KEY unset', async (_name, handler) => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const anonymous = makeRes();
    await handler({ method: 'POST', headers: {}, body: {} }, anonymous);
    expect(anonymous.statusCode).toBe(401);

    vi.stubEnv('ADMIN_API_KEY', '');
    const unconfigured = makeRes();
    await handler({ method: 'POST', headers: {}, body: {} }, unconfigured);
    expect(unconfigured.statusCode).toBe(503);

    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it.each([
    ['generate-page', generatePage],
    ['refresh-images', refreshImages],
    ['research-competitors', researchCompetitors],
  ] as const)('%s answers a signed-in admin', async (_name, handler) => {
    auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    const res = makeRes();
    await handler({ method: 'GET', headers: { authorization: 'Bearer session-token' } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ ok: true });
  });
});

describe('browser code', () => {
  const root = path.resolve(__dirname, '../../..');
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) return files(full);
      return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [full] : [];
    });

  /** Values that are public by design. Vite copies every VITE_ variable the code reads into the bundle. */
  const PUBLIC_VITE_VARS = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_SUPEROPS_PORTAL_URL'];

  it('reads only public VITE_ variables, so no secret can be compiled into the site', () => {
    const used = new Map<string, string[]>();
    for (const file of files(path.join(root, 'src'))) {
      for (const [, name] of readFileSync(file, 'utf8').matchAll(/import\.meta\.env\.(VITE_[A-Z0-9_]+)/g)) {
        used.set(name, [...(used.get(name) ?? []), path.relative(root, file)]);
      }
    }
    const secret = [...used].filter(([name]) => !PUBLIC_VITE_VARS.includes(name));
    expect(secret, JSON.stringify(secret)).toEqual([]);
  });
});
