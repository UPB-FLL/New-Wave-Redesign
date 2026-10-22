import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from './fixtures/fakeSupabase';

/**
 * /api/groundswell/partner-accounts: the accounts a partner links for a client
 * through Composio's hosted sign-in (groundswell_client_accounts, migration
 * 20261028120000). Composio is mocked; the rows live in the fake database.
 */

const db = vi.hoisted(() => ({ current: null as ReturnType<typeof import('./fixtures/fakeSupabase').fakeSupabase> | null }));
const composio = vi.hoisted(() => ({
  configured: true,
  authConfigFor: vi.fn(),
  createConnectionLink: vi.fn(),
  getConnectedAccount: vi.fn(),
  deleteConnectedAccount: vi.fn(),
}));

vi.mock('../../../api/_lib/supabaseAdmin', () => ({
  isSupabaseConfigured: () => true,
  getSupabaseAdmin: () => db.current!.client,
}));
vi.mock('../../../api/_lib/groundswell/composio', async (original) => ({
  ...(await original<object>()),
  isComposioConfigured: () => composio.configured,
  authConfigFor: composio.authConfigFor,
  createConnectionLink: composio.createConnectionLink,
  getConnectedAccount: composio.getConnectedAccount,
  deleteConnectedAccount: composio.deleteConnectedAccount,
}));

import { hashPassword } from '../../../api/_lib/groundswell/partners';
import { CLIENT_USER_PREFIX } from '../../../api/_lib/groundswell/composio';
import { RECHECK_MS } from '../../../api/_lib/groundswell/clientAccounts';
import type { ApiRequest, ApiResponse } from '../../../api/_lib/http';
import partnerAuth from '../../../api/groundswell/partner-auth';
import accounts from '../../../api/groundswell/partner-accounts';
import { CLIENT_SERVICES } from '../../../src/lib/groundswellValidation';

interface Account {
  service: string;
  label: string;
  status: string;
  reason: string | null;
  linked_at: string | null;
}
interface Body {
  token: string;
  error: string;
  accounts: Account[];
  available: boolean;
  redirect_url: string;
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
async function call(method: string, body?: unknown, headers: Record<string, string> = {}, query: Record<string, string> = {}) {
  const res = makeRes();
  await accounts({ method, body, query, headers: { 'x-forwarded-for': `10.3.0.${++ipCounter % 250}`, ...headers } } as unknown as ApiRequest, res as unknown as ApiResponse);
  return res;
}

const T0 = '2026-10-01T00:00:00Z';
let goodHash = '';
let testNo = 0;
let SAM = '';
let auth: Record<string, string> = {};

function seed(missing: Record<string, string[]> = {}, rows: Record<string, unknown>[] = []) {
  const sessions = db.current?.tables.groundswell_partner_sessions ?? [];
  db.current = fakeSupabase(
    {
      groundswell_partners: [
        { id: 'p-active', company: 'Reef Agency', contact_name: 'Sam', email: SAM, status: 'active', password_hash: goodHash, created_at: T0, last_sign_in_at: null },
        { id: 'p-other', company: 'Tide Co', contact_name: null, email: 'ops@tide.example', status: 'active', password_hash: goodHash, created_at: T0, last_sign_in_at: null },
      ],
      groundswell_partner_sessions: sessions,
      groundswell_customers: [
        { id: 'c-client', partner_id: 'p-active', business_name: 'Harbor Auto', stage: 'client', website: 'https://harbor.example', created_at: T0, updated_at: T0 },
        { id: 'c-prospect', partner_id: 'p-active', business_name: 'Bay Bikes', stage: 'prospect', website: 'https://bay.example', created_at: T0, updated_at: T0 },
        { id: 'c-theirs', partner_id: 'p-other', business_name: 'Theirs', stage: 'client', website: 'https://theirs.example', created_at: T0, updated_at: T0 },
      ],
      groundswell_client_accounts: rows,
    },
    missing
  );
}

beforeEach(async () => {
  SAM = `sam${++testNo}@reef.example`;
  goodHash ||= await hashPassword('correct horse battery');
  seed();
  composio.configured = true;
  composio.authConfigFor.mockReset().mockImplementation(async (toolkit: string) => ({ id: `ac_${toolkit}`, status: 'ENABLED', toolkit: { slug: toolkit } }));
  composio.createConnectionLink.mockReset().mockImplementation(async (authConfigId: string, userId: string) => ({
    redirect_url: `https://connect.composio.example/${authConfigId}/${encodeURIComponent(userId)}`,
    connected_account_id: `ca_${authConfigId}`,
  }));
  composio.getConnectedAccount.mockReset().mockResolvedValue({ id: 'ca_x', status: 'INITIATED', status_reason: null, is_disabled: false });
  composio.deleteConnectedAccount.mockReset().mockResolvedValue(undefined);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const res = makeRes();
  await partnerAuth(
    { method: 'POST', body: { action: 'sign-in', email: SAM, password: 'correct horse battery' }, headers: { 'x-forwarded-for': `10.4.0.${testNo % 250}` } } as unknown as ApiRequest,
    res as unknown as ApiResponse
  );
  auth = { authorization: `Bearer ${res.body.token}` };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('listing a client’s accounts', () => {
  it('needs a partner session, a customer of the partner’s, and a client', async () => {
    expect((await call('GET', undefined, {}, { customer: 'c-client' })).statusCode).toBe(401);
    expect((await call('GET', undefined, auth)).statusCode).toBe(400);
    expect((await call('GET', undefined, auth, { customer: 'c-theirs' })).statusCode).toBe(404);
    const prospect = await call('GET', undefined, auth, { customer: 'c-prospect' });
    expect(prospect.statusCode).toBe(400);
    expect(prospect.body.error).toMatch(/once the business is a client/);
  });

  it('lists every service, linked or not, in catalogue order', async () => {
    const res = await call('GET', undefined, auth, { customer: 'c-client' });
    expect(res.statusCode).toBe(200);
    expect(res.body.available).toBe(true);
    expect(res.body.accounts.map((a) => a.service)).toEqual(CLIENT_SERVICES.map((s) => s.key));
    expect(res.body.accounts.every((a) => a.status === 'none' && a.reason === null)).toBe(true);
    expect(res.body.accounts[0]).toMatchObject({ label: 'Google Analytics 4' });
    expect(composio.getConnectedAccount).not.toHaveBeenCalled();
  });

  it('asks Composio about a pending sign-in and records what it says', async () => {
    seed({}, [{ id: 'r1', customer_id: 'c-client', service: 'googleads', composio_account_id: 'ca_pending', auth_config_id: 'ac', user_id: 'client:c-client', status: 'pending', status_reason: null, linked_by: 'p-active', linked_at: null, checked_at: null, created_at: T0, updated_at: T0 }]);
    composio.getConnectedAccount.mockResolvedValue({ id: 'ca_pending', status: 'ACTIVE', status_reason: null, is_disabled: false });
    const res = await call('GET', undefined, auth, { customer: 'c-client' });
    const ads = res.body.accounts.find((a) => a.service === 'googleads')!;
    expect(ads.status).toBe('active');
    expect(ads.linked_at).toBeTruthy();
    expect(composio.getConnectedAccount).toHaveBeenCalledWith('ca_pending');
    expect(db.current!.tables.groundswell_client_accounts[0]).toMatchObject({ status: 'active' });
    // A failed sign-in reads as a plain sentence, never Composio's text.
    seed({}, [{ id: 'r2', customer_id: 'c-client', service: 'instagram', composio_account_id: 'ca_failed', auth_config_id: 'ac', user_id: 'client:c-client', status: 'pending', status_reason: null, linked_by: 'p-active', linked_at: null, checked_at: null, created_at: T0, updated_at: T0 }]);
    composio.getConnectedAccount.mockResolvedValue({ id: 'ca_failed', status: 'FAILED', status_reason: 'oauth_error: invalid_scope', is_disabled: false });
    const failed = (await call('GET', undefined, auth, { customer: 'c-client' })).body.accounts.find((a) => a.service === 'instagram')!;
    expect(failed.status).toBe('failed');
    expect(failed.reason).toMatch(/did not finish/);
    expect(JSON.stringify(failed)).not.toContain('invalid_scope');
  });

  it('re-checks an active account only when its last check is old, and keeps the last state through an outage', async () => {
    const fresh = new Date().toISOString();
    const stale = new Date(Date.now() - RECHECK_MS - 1000).toISOString();
    seed({}, [
      { id: 'r1', customer_id: 'c-client', service: 'googleads', composio_account_id: 'ca_fresh', auth_config_id: 'ac', user_id: 'client:c-client', status: 'active', status_reason: null, linked_by: 'p-active', linked_at: T0, checked_at: fresh, created_at: T0, updated_at: T0 },
      { id: 'r2', customer_id: 'c-client', service: 'metaads', composio_account_id: 'ca_stale', auth_config_id: 'ac', user_id: 'client:c-client', status: 'active', status_reason: null, linked_by: 'p-active', linked_at: T0, checked_at: stale, created_at: T0, updated_at: T0 },
    ]);
    composio.getConnectedAccount.mockRejectedValue(new Error('Composio could not read the connection (503)'));
    const res = await call('GET', undefined, auth, { customer: 'c-client' });
    expect(res.statusCode).toBe(200);
    expect(composio.getConnectedAccount).toHaveBeenCalledTimes(1);
    expect(composio.getConnectedAccount).toHaveBeenCalledWith('ca_stale');
    expect(res.body.accounts.filter((a) => a.status === 'active')).toHaveLength(2);
    // Removed in Composio: disabled, with the way forward.
    composio.getConnectedAccount.mockResolvedValue(null);
    const gone = (await call('GET', undefined, auth, { customer: 'c-client' })).body.accounts.find((a) => a.service === 'metaads')!;
    expect(gone).toMatchObject({ status: 'disabled' });
    expect(gone.reason).toMatch(/Link the account again/);
  });

  it('says linked accounts are not available before the migration', async () => {
    seed({ groundswell_client_accounts: ['*'] });
    const res = await call('GET', undefined, auth, { customer: 'c-client' });
    expect(res.statusCode).toBe(503);
    expect(res.body.error).toMatch(/not available yet/);
  });
});

describe('linking an account', () => {
  it('starts Composio’s sign-in under the client’s own user id, with the way back to the client’s page, and remembers it as pending', async () => {
    const res = await call('POST', { customer: 'c-client', service: 'google_analytics' }, auth);
    expect(res.statusCode).toBe(201);
    expect(res.body.redirect_url).toBe(`https://connect.composio.example/ac_google_analytics/${encodeURIComponent('client:c-client')}`);
    expect(composio.createConnectionLink).toHaveBeenCalledWith('ac_google_analytics', `${CLIENT_USER_PREFIX}c-client`, 'https://www.newwaveitfl.com/groundswell/customers/c-client?linked=google_analytics');
    expect(res.body.accounts.find((a) => a.service === 'google_analytics')).toMatchObject({ status: 'pending' });
    expect(db.current!.tables.groundswell_client_accounts[0]).toMatchObject({ customer_id: 'c-client', service: 'google_analytics', composio_account_id: 'ca_ac_google_analytics', user_id: 'client:c-client', status: 'pending', linked_by: 'p-active' });
    expect(composio.deleteConnectedAccount).not.toHaveBeenCalled();
  });

  it('replaces an existing link, removing the old connection first', async () => {
    seed({}, [{ id: 'r1', customer_id: 'c-client', service: 'googleads', composio_account_id: 'ca_old', auth_config_id: 'ac', user_id: 'client:c-client', status: 'failed', status_reason: null, linked_by: 'p-active', linked_at: null, checked_at: T0, created_at: T0, updated_at: T0 }]);
    const res = await call('POST', { customer: 'c-client', service: 'googleads' }, auth);
    expect(res.statusCode).toBe(201);
    expect(composio.deleteConnectedAccount).toHaveBeenCalledWith('ca_old');
    const rows = db.current!.tables.groundswell_client_accounts.filter((r) => r.service === 'googleads');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ composio_account_id: 'ca_ac_googleads', status: 'pending' });
  });

  it('refuses a service the project cannot offer yet, an unknown service, a prospect, and another partner’s client', async () => {
    composio.authConfigFor.mockResolvedValue(null);
    const none = await call('POST', { customer: 'c-client', service: 'metaads' }, auth);
    expect(none.statusCode).toBe(409);
    expect(none.body.error).toMatch(/Meta Ads cannot be linked yet/);
    expect(composio.createConnectionLink).not.toHaveBeenCalled();
    expect((await call('POST', { customer: 'c-client', service: 'tiktok' }, auth)).statusCode).toBe(400);
    expect((await call('POST', { customer: 'c-prospect', service: 'googleads' }, auth)).statusCode).toBe(400);
    expect((await call('POST', { customer: 'c-theirs', service: 'googleads' }, auth)).statusCode).toBe(404);
    expect(db.current!.tables.groundswell_client_accounts).toHaveLength(0);
  });

  it('says so when Composio is not set up or does not answer', async () => {
    composio.configured = false;
    const off = await call('POST', { customer: 'c-client', service: 'googleads' }, auth);
    expect(off.statusCode).toBe(503);
    expect((await call('GET', undefined, auth, { customer: 'c-client' })).body.available).toBe(false);
    composio.configured = true;
    composio.createConnectionLink.mockRejectedValue(new Error('Composio could not start the connection (500): upstream'));
    const down = await call('POST', { customer: 'c-client', service: 'googleads' }, auth);
    expect(down.statusCode).toBe(502);
    expect(down.body.error).not.toMatch(/upstream|500/);
    expect(db.current!.tables.groundswell_client_accounts).toHaveLength(0);
  });
});

describe('unlinking an account', () => {
  it('removes the connection in Composio and forgets it; nothing to do is still fine', async () => {
    seed({}, [{ id: 'r1', customer_id: 'c-client', service: 'googleads', composio_account_id: 'ca_live', auth_config_id: 'ac', user_id: 'client:c-client', status: 'active', status_reason: null, linked_by: 'p-active', linked_at: T0, checked_at: new Date().toISOString(), created_at: T0, updated_at: T0 }]);
    const res = await call('DELETE', undefined, auth, { customer: 'c-client', service: 'googleads' });
    expect(res.statusCode).toBe(200);
    expect(composio.deleteConnectedAccount).toHaveBeenCalledWith('ca_live');
    expect(res.body.accounts.find((a) => a.service === 'googleads')).toMatchObject({ status: 'none' });
    expect(db.current!.tables.groundswell_client_accounts).toHaveLength(0);
    expect((await call('DELETE', undefined, auth, { customer: 'c-client', service: 'googleads' })).statusCode).toBe(200);
  });

  it('keeps the row when Composio cannot remove the connection', async () => {
    seed({}, [{ id: 'r1', customer_id: 'c-client', service: 'googleads', composio_account_id: 'ca_live', auth_config_id: 'ac', user_id: 'client:c-client', status: 'active', status_reason: null, linked_by: 'p-active', linked_at: T0, checked_at: new Date().toISOString(), created_at: T0, updated_at: T0 }]);
    composio.deleteConnectedAccount.mockRejectedValue(new Error('Composio could not remove the connection (500)'));
    const res = await call('DELETE', undefined, auth, { customer: 'c-client', service: 'googleads' });
    expect(res.statusCode).toBe(502);
    expect(db.current!.tables.groundswell_client_accounts).toHaveLength(1);
  });
});
