import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  dbConfigured: true,
  composioConfigured: true,
  list: vi.fn(),
  activeConnection: vi.fn(),
}));

vi.mock('../../../api/_lib/supabaseAdmin', () => ({
  isSupabaseConfigured: () => mocks.dbConfigured,
  getSupabaseAdmin: () => ({ storage: { from: () => ({ list: mocks.list }) } }),
}));
vi.mock('../../../api/_lib/groundswell/composio', async (original) => ({
  ...(await original<object>()),
  isComposioConfigured: () => mocks.composioConfigured,
  activeConnection: mocks.activeConnection,
}));

import { readinessChecks, readinessSummary, TOOLKIT_CHECKS } from '../../../api/_lib/groundswell/readiness';
import { PermanentStepError } from '../../../api/_lib/groundswell/types';

/** The live checks the staff overview runs before partners are let loose: every service answers, and no detail carries a key. */

const openai = (status: number) => vi.fn(async () => ({ status, ok: status < 400 })) as unknown as typeof fetch;
const account = (toolkit: string) => ({ id: `ca_${toolkit}`, status: 'ACTIVE', user_id: 'pg-test-1', toolkit: { slug: toolkit } });

beforeEach(() => {
  mocks.dbConfigured = true;
  mocks.composioConfigured = true;
  mocks.list.mockReset().mockResolvedValue({ data: [], error: null });
  mocks.activeConnection.mockReset().mockImplementation(async (toolkit: string) => account(toolkit));
  vi.stubEnv('OPENAI_API_KEY', 'sk-secret-value');
  vi.stubEnv('COMPOSIO_API_KEY', 'ak_secret_value_1234');
  vi.stubEnv('RESEND_API_KEY', 're_secret');
  vi.stubEnv('GOOGLE_ADS_CUSTOMER_ID', '1234567890');
});

afterEach(() => vi.unstubAllEnvs());

describe('readiness checks', () => {
  it('asks every service to answer and reports ready when all do, without any value', async () => {
    const checks = await readinessChecks(openai(200));
    expect(checks.map((c) => c.key)).toEqual([
      'SUPABASE_SERVICE_ROLE_KEY',
      'OPENAI_API_KEY',
      'COMPOSIO_API_KEY',
      ...TOOLKIT_CHECKS.map((t) => `composio:${t.toolkit}`),
      'RESEND_API_KEY',
      'GOOGLE_ADS_CUSTOMER_ID',
    ]);
    expect(checks.every((c) => c.ok)).toBe(true);
    expect(readinessSummary(checks)).toEqual({ ready: true, complete: true, summary: 'Ready: every service answered.' });
    const text = JSON.stringify(checks);
    for (const secret of ['sk-secret-value', 'ak_secret_value_1234', 're_secret', '1234567890']) expect(text).not.toContain(secret);
    expect(checks.find((c) => c.key === 'COMPOSIO_API_KEY')?.detail).toMatch(/20 characters, starts with ak_/);
  });

  it('a missing toolkit connection keeps audits running and says what the reports lose', async () => {
    mocks.activeConnection.mockImplementation(async (toolkit: string) => (toolkit === 'googleads' ? null : account(toolkit)));
    const checks = await readinessChecks(openai(200));
    const ads = checks.find((c) => c.key === 'composio:googleads')!;
    expect(ads).toMatchObject({ ok: false, required: false });
    expect(ads.detail).toMatch(/keyword demand, the ad plan and the ad copy are left out/);
    expect(ads.detail).toMatch(/Auth Configs/);
    expect(readinessSummary(checks)).toMatchObject({ ready: true, complete: false });
    expect(readinessSummary(checks).summary).toMatch(/^Audits run, with 1 data source missing: Google Ads/);
  });

  it('a refused Composio key fails the key check with Composio’s reason and leaves the toolkits unchecked', async () => {
    mocks.activeConnection.mockRejectedValue(new PermanentStepError('Composio refused the API key (401): Invalid key. COMPOSIO_API_KEY as read: 20 characters, starts with ak_.'));
    const checks = await readinessChecks(openai(200));
    expect(checks.find((c) => c.key === 'COMPOSIO_API_KEY')).toMatchObject({ ok: false, required: true });
    expect(checks.find((c) => c.key === 'COMPOSIO_API_KEY')?.detail).toMatch(/refused the API key \(401\): Invalid key/);
    expect(checks.filter((c) => c.key.startsWith('composio:')).every((c) => !c.ok && /Not checked/.test(c.detail))).toBe(true);
    expect(readinessSummary(checks)).toMatchObject({ ready: false, complete: false });
    expect(readinessSummary(checks).summary).toMatch(/^Not ready: Composio project key/);
  });

  it('a Composio outage is not ok and never throws', async () => {
    mocks.activeConnection.mockRejectedValue(new Error('Composio could not list the ahrefs connections (503).'));
    const checks = await readinessChecks(openai(200));
    expect(checks.find((c) => c.key === 'COMPOSIO_API_KEY')).toMatchObject({ ok: false });
    expect(checks.find((c) => c.key === 'composio:ahrefs')?.detail).toMatch(/Could not list connections: Composio could not list/);
  });

  it('reports a refused OpenAI key, an unreachable reports bucket, and missing variables', async () => {
    mocks.list.mockResolvedValue({ data: null, error: { message: 'Bucket not found' } });
    let checks = await readinessChecks(openai(401));
    expect(checks.find((c) => c.key === 'OPENAI_API_KEY')).toMatchObject({ ok: false, detail: 'OpenAI refused the key.' });
    expect(checks.find((c) => c.key === 'SUPABASE_SERVICE_ROLE_KEY')?.detail).toMatch(/groundswell-reports.*not reachable: Bucket not found/);
    expect(readinessSummary(checks).summary).toMatch(/^Not ready: Supabase service role and the reports bucket, OpenAI/);

    vi.stubEnv('OPENAI_API_KEY', '');
    vi.stubEnv('COMPOSIO_API_KEY', '');
    vi.stubEnv('RESEND_API_KEY', '');
    mocks.composioConfigured = false;
    mocks.dbConfigured = false;
    mocks.activeConnection.mockClear();
    checks = await readinessChecks(openai(200));
    expect(checks.find((c) => c.key === 'OPENAI_API_KEY')?.detail).toMatch(/missing in Vercel/);
    expect(checks.find((c) => c.key === 'COMPOSIO_API_KEY')?.detail).toMatch(/missing in Vercel/);
    expect(checks.find((c) => c.key === 'SUPABASE_SERVICE_ROLE_KEY')?.detail).toMatch(/missing in Vercel/);
    expect(checks.find((c) => c.key === 'composio:ahrefs')?.detail).toMatch(/Composio is not set up/);
    expect(checks.find((c) => c.key === 'RESEND_API_KEY')).toMatchObject({ ok: false, required: false });
    expect(mocks.activeConnection).not.toHaveBeenCalled();
  });

  it('a network failure reaching OpenAI is a failed check, not a thrown error', async () => {
    const down = vi.fn(async () => {
      throw new Error('fetch failed');
    }) as unknown as typeof fetch;
    const checks = await readinessChecks(down);
    expect(checks.find((c) => c.key === 'OPENAI_API_KEY')?.detail).toBe('OpenAI could not be reached: fetch failed');
  });
});
