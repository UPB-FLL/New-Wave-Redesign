import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from './fixtures/fakeSupabase';

/**
 * /api/groundswell/accounts: a customer's stage and linked accounts for New
 * Wave staff, any customer (a partner's or New Wave's own), through the same
 * answers as the partner route (api/_lib/groundswell/accountLinking.ts).
 */

const db = vi.hoisted(() => ({ current: null as ReturnType<typeof import('./fixtures/fakeSupabase').fakeSupabase> | null }));
const who = vi.hoisted(() => ({ resolvePartner: vi.fn(), adminUser: vi.fn() }));
const composio = vi.hoisted(() => ({ configured: true, authConfigFor: vi.fn(), createConnectionLink: vi.fn(), getConnectedAccount: vi.fn(), deleteConnectedAccount: vi.fn() }));

vi.mock('../../../api/_lib/supabaseAdmin', () => ({ isSupabaseConfigured: () => true, getSupabaseAdmin: () => db.current!.client }));
vi.mock('../../../api/_lib/groundswell/partners', async (original) => ({ ...(await original<object>()), resolvePartner: who.resolvePartner }));
vi.mock('../../../api/_lib/adminKey', async (original) => ({ ...(await original<object>()), adminUser: who.adminUser }));
vi.mock('../../../api/_lib/groundswell/composio', async (original) => ({
  ...(await original<object>()),
  isComposioConfigured: () => composio.configured,
  authConfigFor: composio.authConfigFor,
  createConnectionLink: composio.createConnectionLink,
  getConnectedAccount: composio.getConnectedAccount,
  deleteConnectedAccount: composio.deleteConnectedAccount,
}));

import accounts from '../../../api/groundswell/accounts';
import type { ApiRequest, ApiResponse } from '../../../api/_lib/http';
import { GROUNDSWELL_ADMIN_CUSTOMERS_PATH } from '../../../src/groundswell/site';
import { CLIENT_SERVICES } from '../../../src/lib/groundswellValidation';

interface Body {
  error: string;
  accounts: { service: string; status: string }[];
  available: boolean;
  redirect_url: string;
  customer: { id: string; stage: string; became_client_at: string | null };
}
function makeRes() {
  return {
    statusCode: 0,
    body: undefined as unknown as Body,
    setHeader() {},
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
const AUTH = { authorization: 'Bearer supabase-session' };
async function call(method: string, body?: unknown, headers: Record<string, string> = AUTH, query: Record<string, string> = {}) {
  const res = makeRes();
  await accounts({ method, body, query, headers: { 'x-forwarded-for': '10.9.0.1', ...headers } } as unknown as ApiRequest, res as unknown as ApiResponse);
  return res;
}

const T0 = '2026-10-01T00:00:00Z';
const OWN = '512bdc77-01fd-4ec8-bc66-5cc03d20c025';
const THEIRS = '7a7a7a7a-0000-4000-8000-000000000002';
const PROSPECT = '7a7a7a7a-0000-4000-8000-000000000003';

function seed(missing: Record<string, string[]> = {}, rows: Record<string, unknown>[] = []) {
  db.current = fakeSupabase(
    {
      groundswell_customers: [
        { id: OWN, partner_id: null, business_name: 'Uncommon Path Brewing', stage: 'client', became_client_at: T0, created_at: T0, updated_at: T0 },
        { id: THEIRS, partner_id: 'p-other', business_name: 'Theirs', stage: 'client', became_client_at: T0, created_at: T0, updated_at: T0 },
        { id: PROSPECT, partner_id: null, business_name: 'Bay Bikes', stage: 'prospect', became_client_at: null, created_at: T0, updated_at: T0 },
      ],
      groundswell_client_accounts: rows,
    },
    missing
  );
}

beforeEach(() => {
  seed();
  who.resolvePartner.mockReset().mockResolvedValue(null);
  who.adminUser.mockReset().mockResolvedValue({ id: 'u1', email: 'josh@newwaveitfl.com' });
  composio.configured = true;
  composio.authConfigFor.mockReset().mockImplementation(async (toolkit: string) => ({ id: `ac_${toolkit}`, status: 'ENABLED', toolkit: { slug: toolkit } }));
  composio.createConnectionLink.mockReset().mockImplementation(async (authConfigId: string, userId: string, callback: string) => ({
    redirect_url: `https://connect.composio.example/${authConfigId}/${encodeURIComponent(userId)}?back=${encodeURIComponent(callback)}`,
    connected_account_id: `ca_${authConfigId}`,
  }));
  composio.getConnectedAccount.mockReset().mockResolvedValue({ id: 'ca_x', status: 'INITIATED', status_reason: null, is_disabled: false });
  composio.deleteConnectedAccount.mockReset().mockResolvedValue(undefined);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('staff accounts route', () => {
  it('is for the Groundswell admins only: a partner, a plain admin and a stranger are refused', async () => {
    expect((await call('GET', undefined, {}, { customer: OWN })).statusCode).toBe(401);
    who.adminUser.mockResolvedValue({ id: 'u2', email: 'someone@newwaveitfl.com' });
    expect((await call('GET', undefined, AUTH, { customer: OWN })).statusCode).toBe(403);
    who.resolvePartner.mockResolvedValue({ id: 'p-other', company: 'Tide Co' });
    expect((await call('GET', undefined, AUTH, { customer: THEIRS })).statusCode).toBe(403);
  });

  it('lists every service for New Wave’s own client and for a partner’s, and refuses a prospect and a missing customer', async () => {
    for (const id of [OWN, THEIRS]) {
      const res = await call('GET', undefined, AUTH, { customer: id });
      expect(res.statusCode).toBe(200);
      expect(res.body.accounts.map((a) => a.service)).toEqual(CLIENT_SERVICES.map((s) => s.key));
      expect(res.body.available).toBe(true);
    }
    const prospect = await call('GET', undefined, AUTH, { customer: PROSPECT });
    expect(prospect.statusCode).toBe(400);
    expect(prospect.body.error).toMatch(/once the business is a client/);
    expect((await call('GET', undefined, AUTH, { customer: '7a7a7a7a-0000-4000-8000-000000000009' })).statusCode).toBe(404);
    expect((await call('GET', undefined, AUTH, { customer: 'not-an-id' })).statusCode).toBe(400);
  });

  it('moves a customer to the clients and back, and then its accounts can be linked', async () => {
    const moved = await call('PATCH', { stage: 'client' }, AUTH, { customer: PROSPECT });
    expect(moved.statusCode).toBe(200);
    expect(moved.body.customer).toMatchObject({ id: PROSPECT, stage: 'client' });
    expect(moved.body.customer.became_client_at).toBeTruthy();
    expect((await call('GET', undefined, AUTH, { customer: PROSPECT })).statusCode).toBe(200);
    const back = await call('PATCH', { stage: 'prospect' }, AUTH, { customer: PROSPECT });
    expect(back.body.customer).toMatchObject({ stage: 'prospect', became_client_at: null });
    expect((await call('PATCH', { stage: 'vip' }, AUTH, { customer: PROSPECT })).statusCode).toBe(400);
    seed({ groundswell_customers: ['stage'] });
    expect((await call('PATCH', { stage: 'client' }, AUTH, { customer: PROSPECT })).statusCode).toBe(503);
  });

  it('starts a sign-in that comes back to the staff customer page, recording who linked it', async () => {
    const res = await call('POST', { customer: OWN, service: 'instagram' });
    expect(res.statusCode).toBe(201);
    expect(res.body.redirect_url).toContain(encodeURIComponent(`${GROUNDSWELL_ADMIN_CUSTOMERS_PATH}/${OWN}?linked=instagram`));
    expect(composio.createConnectionLink).toHaveBeenCalledWith('ac_instagram', `client:${OWN}`, expect.stringContaining(`${GROUNDSWELL_ADMIN_CUSTOMERS_PATH}/${OWN}?linked=instagram`));
    expect(db.current!.tables.groundswell_client_accounts[0]).toMatchObject({ customer_id: OWN, service: 'instagram', status: 'pending', linked_by: 'staff:josh@newwaveitfl.com', user_id: `client:${OWN}` });
    expect(res.body.accounts.find((a) => a.service === 'instagram')).toMatchObject({ status: 'pending' });
    // Unlink removes the connection in Composio and forgets the row.
    const gone = await call('DELETE', undefined, AUTH, { customer: OWN, service: 'instagram' });
    expect(gone.statusCode).toBe(200);
    expect(composio.deleteConnectedAccount).toHaveBeenCalledWith('ca_ac_instagram');
    expect(db.current!.tables.groundswell_client_accounts).toHaveLength(0);
  });

  it('says what is missing: no auth config, no Composio, no table', async () => {
    composio.authConfigFor.mockResolvedValue(null);
    const none = await call('POST', { customer: OWN, service: 'instagram' });
    expect(none.statusCode).toBe(409);
    expect(none.body.error).toMatch(/cannot be linked yet/);
    composio.configured = false;
    expect((await call('POST', { customer: OWN, service: 'instagram' })).statusCode).toBe(503);
    expect((await call('GET', undefined, AUTH, { customer: OWN })).body.available).toBe(false);
    seed({ groundswell_client_accounts: ['*'] });
    composio.configured = true;
    expect((await call('GET', undefined, AUTH, { customer: OWN })).statusCode).toBe(503);
  });
});
