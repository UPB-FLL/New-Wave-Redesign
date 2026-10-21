import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from './fixtures/fakeSupabase';

const db = vi.hoisted(() => ({ current: null as ReturnType<typeof import('./fixtures/fakeSupabase').fakeSupabase> | null }));
const auth = vi.hoisted(() => ({ getUser: vi.fn() }));
const mail = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock('../../../api/_lib/supabaseAdmin', () => ({
  isSupabaseConfigured: () => true,
  getSupabaseAdmin: () => db.current!.client,
}));
vi.mock('../../../api/_lib/supabasePublic', () => ({
  isSupabasePublicConfigured: () => true,
  missingSupabasePublicEnv: () => [],
  getSupabasePublic: () => ({ auth: { getUser: auth.getUser } }),
}));
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mail.send };
  },
}));

import { hashPassword, passwordProblem, verifyPassword } from '../../../api/_lib/groundswell/partners';
import { hashToken } from '../../../api/_lib/tokens';
import type { ApiRequest, ApiResponse } from '../../../api/_lib/http';
import partnerAuth from '../../../api/groundswell/partner-auth';
import partnerAudits from '../../../api/groundswell/partner-audits';
import partners from '../../../api/groundswell/partners';

/** The fields these routes answer with, loosely: each test reads the ones its route sends. */
interface Body {
  token: string;
  error: string;
  message: string;
  emailed: boolean;
  invite_url: string;
  partner: { company: string; status: string; [key: string]: unknown };
  partners: { id: string; [key: string]: unknown }[];
  audits: { id: string; [key: string]: unknown }[];
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
async function call(route: (req: ApiRequest, res: ApiResponse) => Promise<unknown>, method: string, body?: unknown, headers: Record<string, string> = {}) {
  const res = makeRes();
  // A fresh IP per call keeps the in-memory rate limits out of the way, except where a test sets one.
  await route({ method, body, headers: { 'x-forwarded-for': `10.0.0.${++ipCounter % 250}`, ...headers } }, res);
  return res;
}

const NOW = new Date().toISOString();
const future = (ms: number) => new Date(Date.now() + ms).toISOString();

let goodHash = '';
// The sign-in rate limit is per email and lives in module memory, so each test gets its own address.
let testNo = 0;
let SAM = 'sam@reef.example';
beforeEach(async () => {
  SAM = `sam${++testNo}@reef.example`;
  goodHash ||= await hashPassword('correct horse battery');
  db.current = fakeSupabase({
    groundswell_partners: [
      { id: 'p-active', company: 'Reef Agency', contact_name: 'Sam', email: SAM, status: 'active', password_hash: goodHash, notes: null, created_at: NOW, last_sign_in_at: null },
      { id: 'p-invited', company: 'Tide Co', contact_name: null, email: 'ops@tide.example', status: 'invited', password_hash: null, notes: null, created_at: NOW, last_sign_in_at: null },
      { id: 'p-off', company: 'Gone LLC', contact_name: null, email: 'x@gone.example', status: 'disabled', password_hash: goodHash, notes: null, created_at: NOW, last_sign_in_at: null },
    ],
    groundswell_partner_sessions: [],
    groundswell_partner_tokens: [],
    marketing_audits: [
      { id: 'a1', business_name: 'Mine', partner_id: 'p-active', status: 'done', error: 'internal detail', created_at: NOW },
      { id: 'a2', business_name: 'Theirs', partner_id: 'p-invited', status: 'queued', created_at: NOW },
      { id: 'a3', business_name: 'Admin queued', partner_id: null, status: 'queued', created_at: NOW },
    ],
  });
  mail.send.mockReset();
  mail.send.mockResolvedValue({ data: { id: 'email-1' }, error: null });
  auth.getUser.mockReset();
  auth.getUser.mockImplementation(async (token: string) =>
    token === 'admin-session' ? { data: { user: { id: 'admin' } }, error: null } : { data: { user: null }, error: { message: 'bad' } }
  );
  vi.stubEnv('RESEND_API_KEY', 're_test');
  vi.stubEnv('ADMIN_API_KEY', 'admin-key');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function signIn(email = SAM, password = 'correct horse battery') {
  return call(partnerAuth, 'POST', { action: 'sign-in', email, password });
}

describe('passwords', () => {
  it('hashes with scrypt and verifies only the right password', async () => {
    const stored = await hashPassword('a long passphrase');
    expect(stored).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(stored).not.toContain('a long passphrase');
    await expect(verifyPassword('a long passphrase', stored)).resolves.toBe(true);
    await expect(verifyPassword('a long passphrasE', stored)).resolves.toBe(false);
    await expect(verifyPassword('anything', null)).resolves.toBe(false);
    await expect(verifyPassword('anything', 'md5$abc')).resolves.toBe(false);
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
  });

  it('asks for at least ten characters', () => {
    expect(passwordProblem('short')).toMatch(/at least 10/);
    expect(passwordProblem('long enough!')).toBeNull();
    expect(passwordProblem(undefined)).toMatch(/at least 10/);
  });
});

describe('partner sign-in', () => {
  it('signs in an active partner (email case and spaces ignored) and stores only the token digest', async () => {
    const res = await signIn(`  ${SAM.toUpperCase()} `);
    expect(res.statusCode).toBe(200);
    expect(res.body.partner).toEqual({ company: 'Reef Agency', contact_name: 'Sam', email: SAM });
    const [session] = db.current!.tables.groundswell_partner_sessions;
    expect(session.token_hash).toBe(hashToken(res.body.token));
    expect(session.token_hash).not.toBe(res.body.token);
    expect(db.current!.tables.groundswell_partners[0].last_sign_in_at).not.toBeNull();
  });

  it('gives the same answer for a wrong password, an unknown email, an invited and a turned-off account', async () => {
    for (const [email, password] of [
      [SAM, 'wrong password!'],
      ['nobody@nowhere.example', 'correct horse battery'],
      ['ops@tide.example', 'correct horse battery'],
      ['x@gone.example', 'correct horse battery'],
    ]) {
      const res = await signIn(email, password);
      expect(res.statusCode, email).toBe(401);
      expect(res.body.error).toBe('That email and password do not match an active partner account.');
    }
    expect(db.current!.tables.groundswell_partner_sessions).toHaveLength(0);
  });

  it('slows down repeated attempts on one account', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 10; i++) statuses.push((await signIn('ratelimit@reef.example', 'nope nope nope')).statusCode);
    expect(statuses.slice(0, 8).every((s) => s === 401)).toBe(true);
    expect(statuses.slice(8)).toEqual([429, 429]);
  });

  it('returns the profile for a live session and refuses an unknown or ended one', async () => {
    const { body } = await signIn();
    const me = await call(partnerAuth, 'GET', undefined, { authorization: `Bearer ${body.token}` });
    expect(me.statusCode).toBe(200);
    expect(me.body.partner.company).toBe('Reef Agency');
    expect((await call(partnerAuth, 'GET', undefined, { authorization: 'Bearer made-up' })).statusCode).toBe(401);
    await call(partnerAuth, 'POST', { action: 'sign-out' }, { authorization: `Bearer ${body.token}` });
    expect((await call(partnerAuth, 'GET', undefined, { authorization: `Bearer ${body.token}` })).statusCode).toBe(401);
  });

  it('ends a session once the account is turned off', async () => {
    const { body } = await signIn();
    db.current!.tables.groundswell_partners[0].status = 'disabled';
    expect((await call(partnerAuth, 'GET', undefined, { authorization: `Bearer ${body.token}` })).statusCode).toBe(401);
  });

  it('is not an admin: a partner token cannot reach the admin routes', async () => {
    const { body } = await signIn();
    expect((await call(partners, 'GET', undefined, { authorization: `Bearer ${body.token}` })).statusCode).toBe(401);
  });
});

describe('invite and reset links', () => {
  it('lets an invited partner choose a password once, then sign in', async () => {
    const created = await call(partners, 'POST', { company: 'New Co', email: 'Hello@NewCo.example', contact_name: 'Ana' }, { authorization: 'Bearer admin-session' });
    expect(created.statusCode).toBe(201);
    expect(created.body.emailed).toBe(true);
    expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'hello@newco.example', subject: 'Your Croissance partner account' }));
    const token = new URL(created.body.invite_url).searchParams.get('token')!;
    expect(created.body.invite_url).toMatch(/^https:\/\/www\.newwaveitfl\.com\/social-engineering\/croissance\/partners\/set-password\?token=/);

    expect((await call(partnerAuth, 'POST', { action: 'set-password', token, password: 'short' })).statusCode).toBe(400);
    const ok = await call(partnerAuth, 'POST', { action: 'set-password', token, password: 'a brand new passphrase' });
    expect(ok.statusCode).toBe(200);
    const again = await call(partnerAuth, 'POST', { action: 'set-password', token, password: 'another passphrase!' });
    expect(again.statusCode).toBe(400);
    expect((await signIn('hello@newco.example', 'a brand new passphrase')).statusCode).toBe(200);
  });

  it('refuses an expired link and a link for a turned-off account', async () => {
    const tokens = db.current!.tables.groundswell_partner_tokens;
    tokens.push({ id: 't1', partner_id: 'p-invited', purpose: 'invite', token_hash: hashToken('old'), expires_at: new Date(Date.now() - 1000).toISOString(), used_at: null });
    tokens.push({ id: 't2', partner_id: 'p-off', purpose: 'reset', token_hash: hashToken('off'), expires_at: future(60_000), used_at: null });
    expect((await call(partnerAuth, 'POST', { action: 'set-password', token: 'old', password: 'a brand new passphrase' })).statusCode).toBe(400);
    expect((await call(partnerAuth, 'POST', { action: 'set-password', token: 'off', password: 'a brand new passphrase' })).statusCode).toBe(403);
  });

  it('answers forgot-password the same way whether or not the account exists, and emails only real ones', async () => {
    const real = await call(partnerAuth, 'POST', { action: 'forgot-password', email: SAM });
    const fake = await call(partnerAuth, 'POST', { action: 'forgot-password', email: 'nobody@nowhere.example' });
    const off = await call(partnerAuth, 'POST', { action: 'forgot-password', email: 'x@gone.example' });
    expect([real.statusCode, fake.statusCode, off.statusCode]).toEqual([200, 200, 200]);
    expect(real.body).toEqual(fake.body);
    expect(mail.send).toHaveBeenCalledTimes(1);
    expect(mail.send.mock.calls[0][0]).toMatchObject({ to: SAM, subject: 'Reset your Croissance partner password' });
  });
});

describe('partner audits', () => {
  async function partnerHeaders() {
    return { authorization: `Bearer ${(await signIn()).body.token}` };
  }

  it('needs a partner session', async () => {
    expect((await call(partnerAudits, 'GET')).statusCode).toBe(401);
    expect((await call(partnerAudits, 'GET', undefined, { authorization: 'Bearer admin-session' })).statusCode).toBe(401);
  });

  it('lists only the partner’s own audits, without internal error text', async () => {
    const res = await call(partnerAudits, 'GET', undefined, await partnerHeaders());
    expect(res.statusCode).toBe(200);
    expect(res.body.audits.map((a: { id: string }) => a.id)).toEqual(['a1']);
    expect(res.body.audits[0]).not.toHaveProperty('error');
    expect(res.body.audits[0]).not.toHaveProperty('partner_id');
  });

  it('queues a valid business under the partner and tells the team', async () => {
    const res = await call(
      partnerAudits,
      'POST',
      { business_name: 'Harbor Auto', website: 'harbor-auto.example', instagram: '@harbor', city: 'Miami', competitors: [{ name: 'Bay', website: 'bay.example' }], status: 'done', partner_id: 'p-invited' },
      await partnerHeaders()
    );
    expect(res.statusCode).toBe(201);
    const row = db.current!.tables.marketing_audits.find((a) => a.business_name === 'Harbor Auto')!;
    expect(row).toMatchObject({ partner_id: 'p-active', status: 'queued', website: 'https://harbor-auto.example', instagram: 'harbor' });
    expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'contact@newwaveitfl.com' }));
  });

  it('rejects a business with neither website nor Instagram', async () => {
    const res = await call(partnerAudits, 'POST', { business_name: 'Nothing' }, await partnerHeaders());
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/website or an Instagram/);
  });
});

describe('admin partner management', () => {
  const admin = { authorization: 'Bearer admin-session' };

  it('needs an admin', async () => {
    expect((await call(partners, 'GET')).statusCode).toBe(401);
  });

  it('lists partners with their audit counts and never their password hashes', async () => {
    const res = await call(partners, 'GET', undefined, admin);
    expect(res.statusCode).toBe(200);
    expect(res.body.partners.find((p: { id: string }) => p.id === 'p-active')).toMatchObject({ company: 'Reef Agency', audit_count: 1 });
    expect(JSON.stringify(res.body)).not.toContain('scrypt$');
  });

  it('refuses a duplicate email and a bad one', async () => {
    expect((await call(partners, 'POST', { company: 'Again', email: SAM }, admin)).statusCode).toBe(409);
    expect((await call(partners, 'POST', { company: 'Bad', email: 'not-an-email' }, admin)).statusCode).toBe(400);
  });

  it('turns an account off (ending its sessions) and back on', async () => {
    await signIn();
    expect(db.current!.tables.groundswell_partner_sessions).toHaveLength(1);
    const off = await call(partners, 'PATCH', { id: 'p-active', action: 'disable' }, admin);
    expect(off.body.partner.status).toBe('disabled');
    expect(db.current!.tables.groundswell_partner_sessions).toHaveLength(0);
    const on = await call(partners, 'PATCH', { id: 'p-active', action: 'enable' }, admin);
    expect(on.body.partner.status).toBe('active');
    const invitedOn = await call(partners, 'PATCH', { id: 'p-invited', action: 'enable' }, admin);
    expect(invitedOn.body.partner.status).toBe('invited');
  });

  it('resends an invite, or a reset link for an active account, and shows the link when email fails', async () => {
    mail.send.mockResolvedValueOnce({ data: null, error: { message: 'domain not verified' } });
    const res = await call(partners, 'PATCH', { id: 'p-invited', action: 'resend' }, admin);
    expect(res.statusCode).toBe(200);
    expect(res.body.emailed).toBe(false);
    expect(res.body.invite_url).toContain('/set-password?token=');
    await call(partners, 'PATCH', { id: 'p-active', action: 'resend' }, admin);
    expect(mail.send.mock.calls[mail.send.mock.calls.length - 1][0].subject).toBe('Reset your Croissance partner password');
    expect((await call(partners, 'PATCH', { id: 'p-off', action: 'resend' }, admin)).statusCode).toBe(409);
  });
});
