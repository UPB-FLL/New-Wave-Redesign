import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from './fixtures/fakeSupabase';

/**
 * /api/groundswell/partner-customers: a partner's customers (groundswell_customers,
 * migration 20261024120000), each with its audits as history. Every read and
 * write is scoped to the signed-in partner.
 */

const db = vi.hoisted(() => ({ current: null as ReturnType<typeof import('./fixtures/fakeSupabase').fakeSupabase> | null }));
const mail = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock('../../../api/_lib/supabaseAdmin', () => ({
  isSupabaseConfigured: () => true,
  getSupabaseAdmin: () => db.current!.client,
}));
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mail.send };
  },
}));

import { hashPassword } from '../../../api/_lib/groundswell/partners';
import type { ApiRequest, ApiResponse } from '../../../api/_lib/http';
import partnerAuth from '../../../api/groundswell/partner-auth';
import customers from '../../../api/groundswell/partner-customers';

interface Customer {
  id: string;
  business_name: string;
  latest: { id: string; status: string; kind: string } | null;
  last_reports_at: string | null;
  audit_count: number;
  [key: string]: unknown;
}
interface Body {
  token: string;
  error: string;
  customer: Customer;
  customers: Customer[];
  audit: { id: string; [key: string]: unknown };
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
async function call(method: string, body?: unknown, headers: Record<string, string> = {}, query: Record<string, string> = {}) {
  const res = makeRes();
  await customers({ method, body, query, headers: { 'x-forwarded-for': `10.1.0.${++ipCounter % 250}`, ...headers } } as unknown as ApiRequest, res as unknown as ApiResponse);
  return res;
}

const T0 = '2026-10-01T00:00:00Z';
const T1 = '2026-10-10T00:00:00Z';
const T2 = '2026-10-20T00:00:00Z';

let goodHash = '';
let testNo = 0;
let SAM = '';
let auth: Record<string, string> = {};

/** Seeds the database; a re-seed mid-test keeps the signed-in session. */
function seed(missing: Record<string, string[]> = {}) {
  const sessions = db.current?.tables.groundswell_partner_sessions ?? [];
  db.current = fakeSupabase(
    {
      groundswell_partners: [
        { id: 'p-active', company: 'Reef Agency', contact_name: 'Sam', email: SAM, status: 'active', password_hash: goodHash, created_at: T0, last_sign_in_at: null },
        { id: 'p-other', company: 'Tide Co', contact_name: null, email: 'ops@tide.example', status: 'active', password_hash: goodHash, created_at: T0, last_sign_in_at: null },
      ],
      groundswell_partner_sessions: sessions,
      groundswell_customers: [
        { id: 'c-harbor', partner_id: 'p-active', business_name: 'Harbor Auto', city: 'Miami', website: 'https://harbor.example', instagram: null, competitors: [], notes: null, created_at: T0, updated_at: T0 },
        { id: 'c-bay', partner_id: 'p-active', business_name: 'Bay Bikes', city: null, website: null, instagram: 'baybikes', competitors: [], notes: null, created_at: T1, updated_at: T1 },
        { id: 'c-theirs', partner_id: 'p-other', business_name: 'Theirs', city: null, website: 'https://theirs.example', instagram: null, competitors: [], notes: null, created_at: T0, updated_at: T0 },
      ],
      marketing_audits: [
        { id: 'a-harbor-1', customer_id: 'c-harbor', partner_id: 'p-active', business_name: 'Harbor Auto', status: 'done', error: 'internal detail', summary_pdf_url: 'https://drive.google.com/file/d/S/view', created_at: T0, completed_at: T1 },
        { id: 'a-harbor-2', customer_id: 'c-harbor', partner_id: 'p-active', business_name: 'Harbor Auto', status: 'running', kind: 'benchmark', created_at: T2, completed_at: null },
        { id: 'a-theirs', customer_id: 'c-theirs', partner_id: 'p-other', business_name: 'Theirs', status: 'done', created_at: T0, completed_at: T1 },
      ],
    },
    missing
  );
}

beforeEach(async () => {
  SAM = `sam${++testNo}@reef.example`;
  goodHash ||= await hashPassword('correct horse battery');
  seed();
  mail.send.mockReset();
  mail.send.mockResolvedValue({ data: { id: 'email-1' }, error: null });
  vi.stubEnv('RESEND_API_KEY', 're_test');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const res = makeRes();
  await partnerAuth(
    { method: 'POST', body: { action: 'sign-in', email: SAM, password: 'correct horse battery' }, headers: { 'x-forwarded-for': `10.2.0.${testNo % 250}` } } as unknown as ApiRequest,
    res as unknown as ApiResponse
  );
  auth = { authorization: `Bearer ${res.body.token}` };
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('listing customers', () => {
  it('needs a partner session', async () => {
    expect((await call('GET')).statusCode).toBe(401);
  });

  it('lists only the partner’s customers, most recent activity first, with the newest audit and last reports', async () => {
    const res = await call('GET', undefined, auth);
    expect(res.statusCode).toBe(200);
    // Harbor's newer audit (T2) outranks Bay's later record (T1).
    expect(res.body.customers.map((c) => c.id)).toEqual(['c-harbor', 'c-bay']);
    expect(res.body.customers[0]).toMatchObject({
      latest: { id: 'a-harbor-2', status: 'running', kind: 'benchmark' },
      last_reports_at: T1,
      audit_count: 2,
    });
    expect(res.body.customers[1]).toMatchObject({ latest: null, last_reports_at: null, audit_count: 0 });
  });

  it('returns one customer with its audits, newest first, without internal detail', async () => {
    const res = await call('GET', undefined, auth, { id: 'c-harbor' });
    expect(res.statusCode).toBe(200);
    expect(res.body.customer.business_name).toBe('Harbor Auto');
    expect(res.body.audits.map((a) => a.id)).toEqual(['a-harbor-2', 'a-harbor-1']);
    expect(res.body.audits[1]).not.toHaveProperty('error');
    expect(res.body.audits[1]).not.toHaveProperty('partner_id');
    expect(res.body.audits[1]).not.toHaveProperty('customer_id');
  });

  it('does not show another partner’s customer', async () => {
    const res = await call('GET', undefined, auth, { id: 'c-theirs' });
    expect(res.statusCode).toBe(404);
  });

  it('says customers are not available before the migration', async () => {
    seed({ groundswell_customers: ['*'] });
    const res = await call('GET', undefined, auth);
    expect(res.statusCode).toBe(503);
    expect(res.body.error).toMatch(/not available yet/);
  });
});

describe('adding a customer', () => {
  it('creates the customer and queues its first audit under the partner, then tells the team', async () => {
    const res = await call('POST', { business_name: 'Pier Coffee', website: 'pier.example', city: 'Hollywood, FL', competitors: [{ name: 'Dock', website: 'dock.example' }], partner_id: 'p-other' }, auth);
    expect(res.statusCode).toBe(201);
    const customer = db.current!.tables.groundswell_customers.find((c) => c.business_name === 'Pier Coffee')!;
    expect(customer).toMatchObject({ partner_id: 'p-active', website: 'https://pier.example', city: 'Hollywood, FL' });
    const audit = db.current!.tables.marketing_audits.find((a) => a.business_name === 'Pier Coffee')!;
    expect(audit).toMatchObject({ partner_id: 'p-active', customer_id: customer.id, status: 'queued', website: 'https://pier.example' });
    expect(res.body.customer).toMatchObject({ id: customer.id, latest: { status: 'queued', kind: 'audit' }, audit_count: 1 });
    expect(res.body.audit.id).toBe(audit.id);
    expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'contact@newwaveitfl.com' }));
  });

  it('queues a benchmark with one competitor (the engine picks the other) and keeps the logo and colour on the audit only', async () => {
    const base = { business_name: 'Bench Shop', website: 'bench.example', kind: 'benchmark', brand_color: '#1A2B3C' };
    const two = await call('POST', { ...base, competitors: [{ name: 'A', website: 'a.example' }] }, auth);
    expect(two.statusCode).toBe(201);
    expect(db.current!.tables.marketing_audits.find((a) => a.business_name === 'Bench Shop')).toMatchObject({ kind: 'benchmark', brand_color: '#1a2b3c' });
    expect(db.current!.tables.groundswell_customers.find((c) => c.business_name === 'Bench Shop')).not.toHaveProperty('brand_color');
  });

  it('rejects a business with neither website nor Instagram, adding nothing', async () => {
    const res = await call('POST', { business_name: 'Nothing' }, auth);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/website or an Instagram/);
    expect(db.current!.tables.groundswell_customers).toHaveLength(3);
  });

  it('removes the new customer again when its audit cannot be queued', async () => {
    seed({ marketing_audits: ['brand_logo_url'] });
    const res = await call('POST', { business_name: 'Logo Co', website: 'logo.example', brand_logo_url: 'https://logo.example/l.png' }, auth);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/logo and colour are not available yet/);
    expect(db.current!.tables.groundswell_customers.some((c) => c.business_name === 'Logo Co')).toBe(false);
  });
});

describe('editing a customer', () => {
  it('changes the partner’s own customer and nobody else’s', async () => {
    const res = await call('PUT', { business_name: 'Harbor Auto Group', website: 'harbor.example', city: 'Fort Lauderdale', competitors: [] }, auth, { id: 'c-harbor' });
    expect(res.statusCode).toBe(200);
    expect(res.body.customer).toMatchObject({ business_name: 'Harbor Auto Group', city: 'Fort Lauderdale', audit_count: 2 });
    expect(db.current!.tables.groundswell_customers.find((c) => c.id === 'c-harbor')).toMatchObject({ business_name: 'Harbor Auto Group' });
    // Audits keep the details they were queued with.
    expect(db.current!.tables.marketing_audits.find((a) => a.id === 'a-harbor-1')!.business_name).toBe('Harbor Auto');
    const theirs = await call('PUT', { business_name: 'Taken', website: 'taken.example', competitors: [] }, auth, { id: 'c-theirs' });
    expect(theirs.statusCode).toBe(404);
    expect(db.current!.tables.groundswell_customers.find((c) => c.id === 'c-theirs')!.business_name).toBe('Theirs');
  });

  it('checks the details like a new audit', async () => {
    const res = await call('PUT', { business_name: 'H', website: 'harbor.example', competitors: [] }, auth, { id: 'c-harbor' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/business name/);
  });
});

describe('prospects and clients', () => {
  it('every customer is a prospect until moved; ?stage keeps one stage', async () => {
    const all = await call('GET', undefined, auth);
    expect(all.body.customers.map((c) => c.stage)).toEqual(['prospect', 'prospect']);
    const clients = await call('GET', undefined, auth, { stage: 'client' });
    expect(clients.statusCode).toBe(200);
    expect(clients.body.customers).toEqual([]);
    expect((await call('GET', undefined, auth, { stage: 'lead' })).statusCode).toBe(400);
  });

  it('"Became a client" records when, keeps every audit on the record, and the way back clears it', async () => {
    const moved = await call('PATCH', { stage: 'client' }, auth, { id: 'c-harbor' });
    expect(moved.statusCode).toBe(200);
    expect(moved.body.customer).toMatchObject({ id: 'c-harbor', stage: 'client', audit_count: 2 });
    expect(moved.body.customer.became_client_at).toBeTruthy();
    expect((await call('GET', undefined, auth, { stage: 'client' })).body.customers.map((c) => c.id)).toEqual(['c-harbor']);
    expect((await call('GET', undefined, auth, { stage: 'prospect' })).body.customers.map((c) => c.id)).toEqual(['c-bay']);
    const detail = await call('GET', undefined, auth, { id: 'c-harbor' });
    expect(detail.body.audits.map((a) => a.id)).toEqual(['a-harbor-2', 'a-harbor-1']);
    expect(detail.body).toMatchObject({ stages_available: true });
    const back = await call('PATCH', { stage: 'prospect' }, auth, { id: 'c-harbor' });
    expect(back.body.customer).toMatchObject({ stage: 'prospect', became_client_at: null });
    expect((await call('PATCH', { stage: 'client' }, auth, { id: 'c-theirs' })).statusCode).toBe(404);
    expect((await call('PATCH', { stage: 'vip' }, auth, { id: 'c-harbor' })).statusCode).toBe(400);
  });

  it('adds a customer straight in as a client', async () => {
    const res = await call('POST', { business_name: 'Pier Coffee', website: 'pier.example', stage: 'client' }, auth);
    expect(res.statusCode).toBe(201);
    expect(res.body.customer).toMatchObject({ stage: 'client' });
    expect(db.current!.tables.groundswell_customers.find((c) => c.business_name === 'Pier Coffee')).toMatchObject({ stage: 'client' });
    expect((await call('GET', undefined, auth, { stage: 'client' })).body.customers.map((c) => c.business_name)).toEqual(['Pier Coffee']);
  });

  it('before the stage migration every customer reads as a prospect, and moving one says so', async () => {
    seed({ groundswell_customers: ['stage', 'became_client_at'] });
    const all = await call('GET', undefined, auth);
    expect(all.statusCode).toBe(200);
    expect(all.body.customers.map((c) => c.stage)).toEqual(['prospect', 'prospect']);
    expect((await call('GET', undefined, auth, { id: 'c-harbor' })).body).toMatchObject({ stages_available: false });
    const moved = await call('PATCH', { stage: 'client' }, auth, { id: 'c-harbor' });
    expect(moved.statusCode).toBe(503);
    expect(moved.body.error).toMatch(/Clients are not available yet/);
    expect((await call('POST', { business_name: 'Pier Coffee', website: 'pier.example', stage: 'client' }, auth)).statusCode).toBe(503);
    expect((await call('POST', { business_name: 'Pier Coffee', website: 'pier.example' }, auth)).statusCode).toBe(201);
  });
});
