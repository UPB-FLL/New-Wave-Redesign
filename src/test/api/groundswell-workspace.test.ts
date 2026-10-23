import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ resolvePartner: vi.fn(), adminUser: vi.fn(), client: null as unknown, runWorkerInBackground: vi.fn() }));
vi.mock('../../../api/_lib/groundswell/partners', async (original) => ({ ...(await original<object>()), resolvePartner: mocks.resolvePartner }));
vi.mock('../../../api/_lib/adminKey', async (original) => ({ ...(await original<object>()), adminUser: mocks.adminUser }));
vi.mock('../../../api/_lib/supabaseAdmin', () => ({ getSupabaseAdmin: () => mocks.client, isSupabaseConfigured: () => true }));
vi.mock('../../../api/_lib/groundswell/background', () => ({ runWorkerInBackground: mocks.runWorkerInBackground, FUNCTION_SECONDS: 300 }));

import assetRoute from '../../../api/groundswell/asset';
import workspaceRoute from '../../../api/groundswell/workspace';
import { ASSETS_BUCKET } from '../../../api/_lib/groundswell/assetStore';
import { panelsFor } from '../../../api/_lib/groundswell/workspace';
import type { ApiRequest, ApiResponse } from '../../../api/_lib/http';
import { fakeSupabase } from './fixtures/fakeSupabase';
import { sampleAdplanOutput, sampleOutputs } from './fixtures/groundswell-report';

/**
 * A customer's workspace (/api/groundswell/workspace) and its files
 * (/api/groundswell/asset): the partner that owns the customer sees its
 * phases, reports, files and data, never another partner's and never error
 * text; the allow-listed admin sees every customer, errors included.
 */

type Body = Record<string, unknown> & { error?: string };
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
async function call(route: (req: ApiRequest, res: ApiResponse) => unknown, method: string, query: Record<string, string> = {}, body: unknown = undefined) {
  const res = makeRes();
  await route({ method, body, query, headers: { authorization: 'Bearer token' } } as unknown as ApiRequest, res as unknown as ApiResponse);
  return res;
}

const C1 = '11111111-1111-4111-8111-111111111111';
const C2 = '22222222-2222-4222-8222-222222222222';
const R1 = 'aaaaaaaa-1111-4111-8111-111111111111';
const R2 = 'aaaaaaaa-2222-4222-8222-222222222222';
const RX = 'aaaaaaaa-3333-4333-8333-333333333333';
const R9 = 'aaaaaaaa-9999-4999-8999-999999999999';
const reef = { id: 'p1', company: 'Reef Agency', contact_name: null, email: 'reef@example.com', status: 'active' as const };
const T = (d: number) => `2026-10-${String(d).padStart(2, '0')}T12:00:00.000Z`;

let db: ReturnType<typeof fakeSupabase>;
beforeEach(() => {
  mocks.resolvePartner.mockReset().mockResolvedValue(reef);
  mocks.adminUser.mockReset().mockResolvedValue(null);
  mocks.runWorkerInBackground.mockReset();
  const outputs = { ...sampleOutputs(), adplan: sampleAdplanOutput() };
  db = fakeSupabase({
    groundswell_customers: [
      { id: C1, partner_id: 'p1', business_name: 'Harbor Auto Care', city: 'Fort Lauderdale, FL', website: 'https://harbor-auto.example', instagram: 'harborautocare', competitors: [], notes: null, stage: 'client', updated_at: T(20), created_at: T(1) },
      { id: C2, partner_id: 'p2', business_name: 'Tide Client', city: null, website: 'https://tide.example', instagram: null, competitors: [], notes: null, stage: 'prospect', updated_at: T(21), created_at: T(1) },
    ],
    groundswell_partners: [{ id: 'p1', company: 'Reef Agency' }, { id: 'p2', company: 'Tide Media' }],
    marketing_audits: [
      { id: R1, customer_id: C1, partner_id: 'p1', status: 'done', kind: 'audit', phase: 'audit', source_audit_id: null, created_at: T(10), started_at: T(10), completed_at: T(11), error: null },
      { id: R2, customer_id: C1, partner_id: 'p1', status: 'failed', kind: 'audit', phase: 'competitors', source_audit_id: R1, created_at: T(12), started_at: T(12), completed_at: T(12), error: 'Composio refused the consumer API key (401): internal detail' },
      // Mis-tagged: another partner's run naming this customer. Never shown to Reef.
      { id: RX, customer_id: C1, partner_id: 'p2', status: 'done', kind: 'audit', phase: 'audit', source_audit_id: null, created_at: T(15), started_at: T(15), completed_at: T(15), error: null },
      { id: R9, customer_id: C2, partner_id: 'p2', status: 'done', kind: 'audit', phase: 'audit', source_audit_id: null, created_at: T(9), started_at: T(9), completed_at: T(9), error: null },
    ],
    marketing_audit_steps: [
      ...Object.entries(outputs).map(([step, output], i) => ({ audit_id: R1, step, status: 'done', position: i + 1, output, error: null })),
      { audit_id: R2, step: 'social_depth', status: 'skipped', position: 1, output: null, error: 'ScrapeCreators: credits exhausted' },
      { audit_id: R2, step: 'deliver_finish', status: 'failed', position: 2, output: null, error: 'boom' },
    ],
    groundswell_reports: [{ audit_id: R1, kind: 'summary', path: `${R1}/summary/s.pdf`, name: 'Summary.pdf', pages: 1, bytes: 10 }],
    groundswell_assets: [
      { audit_id: R2, kind: 'export', path: `${R2}/export/Meta.xlsx`, name: 'Harbor - Meta Bulk Import.xlsx', content_type: 'text/csv', bytes: 4, meta: {} },
      { audit_id: R9, kind: 'export', path: `${R9}/export/Tide.xlsx`, name: 'Tide.xlsx', content_type: 'text/csv', bytes: 4, meta: {} },
    ],
    groundswell_client_accounts: [{ id: 'x', customer_id: C1, status: 'active' }],
  });
  db.objects[ASSETS_BUCKET] = new Map([
    [`${R2}/export/Meta.xlsx`, new Uint8Array([1, 2, 3, 4])],
    [`${R9}/export/Tide.xlsx`, new Uint8Array([1, 2, 3, 4])],
  ]);
  mocks.client = db.client;
});

describe('a partner’s view of its customer', () => {
  it('shows the three phases with runs, steps, reports, files and phase 1’s data, never error text', async () => {
    const res = await call(workspaceRoute, 'GET', { customer: C1 });
    expect(res.statusCode).toBe(200);
    const phases = res.body.phases as { phase: string; runs: Record<string, unknown>[]; start: { allowed: boolean; reason: string } }[];
    expect(phases.map((p) => p.phase)).toEqual(['audit', 'competitors', 'integrated']);
    const [audit, competitors, integrated] = phases;
    // Reef's own runs only: the mis-tagged run of another partner is not there.
    expect(audit.runs.map((r) => r.id)).toEqual([R1]);
    expect(audit.runs[0].reports).toEqual([{ kind: 'summary', name: 'Summary.pdf', pages: 1 }]);
    const panels = audit.runs[0].panels as { key: string }[];
    expect(panels.map((p) => p.key)).toEqual(['site', 'maps', 'search', 'keywords', 'social', 'adplan']);
    expect(competitors.runs[0].files).toEqual([expect.objectContaining({ kind: 'export', name: 'Harbor - Meta Bulk Import.xlsx' })]);
    const text = JSON.stringify(res.body);
    for (const secret of ['internal detail', 'credits exhausted', 'boom', RX, 'Tide']) expect(text).not.toContain(secret);
    expect(competitors.runs[0]).not.toHaveProperty('error');
    // Phase 2 failed, so phase 3 waits; phase 2 can run again on phase 1.
    expect(competitors.start).toMatchObject({ allowed: true });
    expect(integrated.start).toEqual({ allowed: false, reason: 'Competitor plan has to deliver first.', builds_on: null });
  });

  it('another partner’s customer answers exactly like a missing one, and the staff list is closed to partners', async () => {
    const theirs = await call(workspaceRoute, 'GET', { customer: C2 });
    const missing = await call(workspaceRoute, 'GET', { customer: '33333333-3333-4333-8333-333333333333' });
    expect([theirs.statusCode, theirs.body]).toEqual([missing.statusCode, missing.body]);
    expect(theirs.statusCode).toBe(404);
    expect((await call(workspaceRoute, 'GET')).statusCode).toBe(400);
    expect((await call(workspaceRoute, 'POST', {}, { customer: C2, phase: 'audit' })).statusCode).toBe(404);
    expect(db.tables.marketing_audits.filter((r) => r.customer_id === C2)).toHaveLength(1);
  });

  it('starts phase 2 on phase 1’s delivered run, and phase 1 again from the saved details', async () => {
    const two = await call(workspaceRoute, 'POST', {}, { customer: C1, phase: 'competitors' });
    expect(two.statusCode).toBe(201);
    const queued = db.tables.marketing_audits.find((r) => r.id === two.body.queued)!;
    expect(queued).toMatchObject({ customer_id: C1, partner_id: 'p1', phase: 'competitors', source_audit_id: R1, status: 'queued' });
    expect(mocks.runWorkerInBackground).toHaveBeenCalledTimes(1);
    // Already queued: not twice.
    expect((await call(workspaceRoute, 'POST', {}, { customer: C1, phase: 'competitors' })).statusCode).toBe(409);
    const one = await call(workspaceRoute, 'POST', {}, { customer: C1, phase: 'audit' });
    expect(db.tables.marketing_audits.find((r) => r.id === one.body.queued)).toMatchObject({ customer_id: C1, partner_id: 'p1', phase: 'audit', business_name: 'Harbor Auto Care', status: 'queued' });
    expect((await call(workspaceRoute, 'POST', {}, { customer: C1, phase: 'integrated' })).body.error).toBe('Competitor plan has to deliver first.');
    expect((await call(workspaceRoute, 'POST', {}, { customer: C1, phase: 'everything' })).statusCode).toBe(400);
  });
});

describe('the staff view', () => {
  it('the allow-listed admin sees every customer and every run, errors included', async () => {
    mocks.resolvePartner.mockResolvedValue(null);
    mocks.adminUser.mockResolvedValue({ id: 'u1', email: 'josh@newwaveitfl.com' });
    const list = await call(workspaceRoute, 'GET');
    expect(list.statusCode).toBe(200);
    const customers = list.body.customers as { id: string; partner: { company: string } | null; phases: Record<string, { status: string } | null> }[];
    // The database orders them by recent activity; the fake keeps insertion order, so compare as a set.
    expect(customers.map((c) => [c.id, c.partner?.company]).sort()).toEqual([[C1, 'Reef Agency'], [C2, 'Tide Media']]);
    expect(customers.find((c) => c.id === C1)!.phases).toMatchObject({ audit: { status: 'done' }, competitors: { status: 'failed' }, integrated: null });
    const one = await call(workspaceRoute, 'GET', { customer: C1 });
    const phases = one.body.phases as { runs: { id: string; error?: string | null; steps: { error?: string | null }[] }[] }[];
    expect(phases[0].runs.map((r) => r.id)).toEqual([RX, R1]);
    expect(phases[1].runs[0].error).toMatch(/internal detail/);
    expect(phases[1].runs[0].steps[0].error).toBe('ScrapeCreators: credits exhausted');
  });

  it('a signed-in staff member off the allow-list is told so; nobody else gets in', async () => {
    mocks.resolvePartner.mockResolvedValue(null);
    mocks.adminUser.mockResolvedValue({ id: 'u2', email: 'someone@newwaveitfl.com' });
    expect(await call(workspaceRoute, 'GET')).toMatchObject({ statusCode: 403, body: { error: expect.stringMatching(/not on the Groundswell admin list/) } });
    mocks.adminUser.mockResolvedValue(null);
    expect((await call(workspaceRoute, 'GET', { customer: C1 })).statusCode).toBe(401);
  });
});

describe('a run’s files', () => {
  it('signs only files recorded for the partner’s own runs', async () => {
    const list = await call(assetRoute, 'GET', { audit: R2 });
    expect(list.statusCode).toBe(200);
    expect(list.body.files).toEqual([expect.objectContaining({ name: 'Harbor - Meta Bulk Import.xlsx', url: expect.stringContaining(`${R2}/export/Meta.xlsx`) })]);
    expect((await call(assetRoute, 'GET', { audit: R2, path: `${R2}/export/Meta.xlsx` })).body.url).toContain('Meta.xlsx');
    // Another run's path through this run, and another partner's run outright: both missing.
    expect((await call(assetRoute, 'GET', { audit: R2, path: `${R9}/export/Tide.xlsx` })).statusCode).toBe(404);
    expect((await call(assetRoute, 'GET', { audit: R9 })).statusCode).toBe(404);
    expect((await call(assetRoute, 'GET', { audit: 'not-an-id' })).statusCode).toBe(400);
  });
});

describe('the data panels', () => {
  it('turn step outputs into rows and tables, without raw provider answers', () => {
    const panels = panelsFor({ ...sampleOutputs(), adplan: sampleAdplanOutput() });
    const site = panels.find((p) => p.key === 'site')!;
    expect(site.rows?.find((r) => r.label === 'Secure (https)')?.value).toBe('Yes');
    const keywords = panels.find((p) => p.key === 'keywords')!;
    expect(keywords.table?.rows[0]).toEqual(['auto repair fort lauderdale', '1,300', 'high', '$4.10 – 12.50']);
    expect(panelsFor({})).toEqual([]);
  });
});
