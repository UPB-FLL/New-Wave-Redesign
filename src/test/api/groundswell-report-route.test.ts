import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ resolvePartner: vi.fn(), adminUser: vi.fn(), client: null as unknown }));
vi.mock('../../../api/_lib/groundswell/partners', async (original) => ({ ...(await original<object>()), resolvePartner: mocks.resolvePartner }));
vi.mock('../../../api/_lib/adminKey', async (original) => ({ ...(await original<object>()), adminUser: mocks.adminUser }));
vi.mock('../../../api/_lib/supabaseAdmin', () => ({ getSupabaseAdmin: () => mocks.client, isSupabaseConfigured: () => true }));

import handler from '../../../api/groundswell/report';
import { storeReport } from '../../../api/_lib/groundswell/reportStore';
import type { ApiRequest, ApiResponse } from '../../../api/_lib/http';
import { fakeSupabase } from './fixtures/fakeSupabase';

type Body = Record<string, unknown> & { error?: string; url?: string; reports?: { kind: string }[] };
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
    end() {
      return this;
    },
  };
}
async function call(route: typeof handler, method: string, body: unknown, headers: Record<string, string> = {}, query: Record<string, string> = {}) {
  const res = makeRes();
  await route({ method, body, query, headers } as unknown as ApiRequest, res as unknown as ApiResponse);
  return res;
}

/**
 * /api/groundswell/report: a partner opens its own audits' reports, the
 * allow-listed admin opens any, and everyone else sees nothing.
 */

const AUDIT = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const partner = { id: 'p1', company: 'Reef Agency', contact_name: null, email: 'reef@example.com', status: 'active' as const };
const headers = { authorization: 'Bearer token' };

beforeEach(async () => {
  const db = fakeSupabase({
    marketing_audits: [
      { id: AUDIT, partner_id: 'p1', status: 'done' },
      { id: OTHER, partner_id: 'p2', status: 'done' },
    ],
  });
  mocks.client = db.client;
  for (const [audit, kind] of [[AUDIT, 'summary'], [AUDIT, 'audit'], [OTHER, 'summary']] as const) {
    await storeReport(db.client as never, { audit_id: audit, kind, name: `${kind}.pdf`, pages: 1, bytes: 1 }, new Uint8Array([1]));
  }
  mocks.resolvePartner.mockReset().mockResolvedValue(null);
  mocks.adminUser.mockReset().mockResolvedValue(null);
  vi.stubEnv('GROUNDSWELL_ADMIN_EMAILS', 'josh@newwaveitfl.com');
});
afterEach(() => vi.unstubAllEnvs());

describe('GET /api/groundswell/report', () => {
  it('needs a signed-in caller and a well-formed ask', async () => {
    expect((await call(handler, 'GET', undefined, {}, { audit: AUDIT, kind: 'summary' })).statusCode).toBe(401);
    expect((await call(handler, 'GET', undefined, headers, { audit: AUDIT, kind: 'summary' })).statusCode).toBe(401);
    expect((await call(handler, 'GET', undefined, headers, { audit: 'nope', kind: 'summary' })).statusCode).toBe(400);
    expect((await call(handler, 'GET', undefined, headers, { audit: AUDIT, kind: 'poster' })).statusCode).toBe(400);
    expect((await call(handler, 'POST', { audit: AUDIT }, headers)).statusCode).toBe(405);
  });

  it('gives a partner a short link to its own report, and lists its kinds', async () => {
    mocks.resolvePartner.mockResolvedValue(partner);
    const res = await call(handler, 'GET', undefined, headers, { audit: AUDIT, kind: 'summary' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ expires_in: 120, name: 'summary.pdf' });
    expect(res.body.url).toMatch(/\/sign\/groundswell-reports\/11111111-1111-4111-8111-111111111111\/summary\//);
    const list = await call(handler, 'GET', undefined, headers, { audit: AUDIT });
    expect(list.body.reports?.map((r) => r.kind)).toEqual(['summary', 'audit']);
  });

  it('answers 404 for another partner\'s audit, a missing audit, and a report not delivered, alike', async () => {
    mocks.resolvePartner.mockResolvedValue(partner);
    expect((await call(handler, 'GET', undefined, headers, { audit: OTHER, kind: 'summary' })).statusCode).toBe(404);
    expect((await call(handler, 'GET', undefined, headers, { audit: '33333333-3333-4333-8333-333333333333', kind: 'summary' })).statusCode).toBe(404);
    expect((await call(handler, 'GET', undefined, headers, { audit: AUDIT, kind: 'deck' })).statusCode).toBe(404);
  });

  it('lets only the allow-listed admin open every audit\'s reports', async () => {
    mocks.adminUser.mockResolvedValue({ id: 'u1', email: 'josh@newwaveitfl.com' });
    expect((await call(handler, 'GET', undefined, headers, { audit: OTHER, kind: 'summary' })).statusCode).toBe(200);
    expect((await call(handler, 'GET', undefined, headers, { audit: AUDIT, kind: 'audit' })).statusCode).toBe(200);
    mocks.adminUser.mockResolvedValue({ id: 'u2', email: 'someone@newwaveitfl.com' });
    expect((await call(handler, 'GET', undefined, headers, { audit: AUDIT, kind: 'audit' })).statusCode).toBe(401);
  });
});
