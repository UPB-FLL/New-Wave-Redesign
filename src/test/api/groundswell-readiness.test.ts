import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  dbConfigured: true,
  composioConfigured: true,
  list: vi.fn(),
  activeConnection: vi.fn(),
  authConfigFor: vi.fn(),
  consumerConnections: vi.fn(),
}));

vi.mock('../../../api/_lib/supabaseAdmin', () => ({
  isSupabaseConfigured: () => mocks.dbConfigured,
  getSupabaseAdmin: () => ({ storage: { from: () => ({ list: mocks.list }) } }),
}));
vi.mock('../../../api/_lib/groundswell/composio', async (original) => ({
  ...(await original<object>()),
  isComposioConfigured: () => mocks.composioConfigured,
  activeConnection: mocks.activeConnection,
  authConfigFor: mocks.authConfigFor,
}));

vi.mock('../../../api/_lib/groundswell/composioConsumer', async (original) => ({
  ...(await original<object>()),
  consumerConnections: mocks.consumerConnections,
}));

import { readinessChecks, readinessSummary, TOOLKIT_CHECKS } from '../../../api/_lib/groundswell/readiness';
import { CLIENT_SERVICES } from '../../../src/lib/groundswellValidation';
import { PermanentStepError } from '../../../api/_lib/groundswell/types';

/** The live checks the staff overview runs before partners are let loose: every service answers, and no detail carries a key. */

const openai = (status: number) => vi.fn(async () => ({ status, ok: status < 400 })) as unknown as typeof fetch;
const account = (toolkit: string) => ({ id: `ca_${toolkit}`, status: 'ACTIVE', user_id: 'pg-test-1', toolkit: { slug: toolkit } });

beforeEach(() => {
  mocks.dbConfigured = true;
  mocks.composioConfigured = true;
  mocks.list.mockReset().mockResolvedValue({ data: [], error: null });
  mocks.activeConnection.mockReset().mockImplementation(async (toolkit: string) => account(toolkit));
  mocks.authConfigFor.mockReset().mockImplementation(async (toolkit: string) => ({ id: `ac_${toolkit}`, status: 'ENABLED', toolkit: { slug: toolkit } }));
  mocks.consumerConnections.mockReset().mockImplementation(async (toolkits: string[]) => toolkits.map((toolkit) => ({ toolkit, state: 'active', accounts: 1 })));
  vi.stubEnv('COMPOSIO_CONSUMER_API_KEY', '');
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
      'COMPOSIO_CONSUMER_API_KEY',
      'COMPOSIO_API_KEY',
      ...TOOLKIT_CHECKS.map((t) => `composio:${t.toolkit}`),
      ...CLIENT_SERVICES.map((s) => `authconfig:${s.toolkit}`),
      'RESEND_API_KEY',
      'GOOGLE_ADS_CUSTOMER_ID',
    ]);
    // Without a consumer key, phases 1 and 2 read through the project; the row says so and never blocks.
    expect(checks.find((c) => c.key === 'COMPOSIO_CONSUMER_API_KEY')).toMatchObject({ ok: false, required: false });
    expect(checks.find((c) => c.key === 'COMPOSIO_CONSUMER_API_KEY')?.detail).toMatch(/phases 1 and 2 read through the Composio project/);
    expect(checks.filter((c) => c.key !== 'COMPOSIO_CONSUMER_API_KEY').every((c) => c.ok)).toBe(true);
    expect(mocks.consumerConnections).not.toHaveBeenCalled();
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

  it('a client sign-in without an auth config is named, and never counts against readiness', async () => {
    mocks.authConfigFor.mockImplementation(async (toolkit: string) => (toolkit === 'metaads' ? null : { id: `ac_${toolkit}`, status: 'ENABLED' }));
    const checks = await readinessChecks(openai(200));
    const meta = checks.find((c) => c.key === 'authconfig:metaads')!;
    expect(meta).toMatchObject({ ok: false, required: false, label: 'Client sign-in: Meta Ads' });
    expect(meta.detail).toMatch(/partners cannot link Meta Ads for a client/);
    expect(checks.find((c) => c.key === 'authconfig:googleads')?.detail).toMatch(/partners can link Google Ads/);
    expect(readinessSummary(checks)).toEqual({ ready: true, complete: true, summary: 'Ready: every service answered.' });
  });

  it('a refused Composio key fails the key check with Composio’s reason and leaves the toolkits unchecked', async () => {
    mocks.authConfigFor.mockRejectedValue(new PermanentStepError('Composio refused the API key (401): Invalid key.'));
    mocks.activeConnection.mockRejectedValue(new PermanentStepError('Composio refused the API key (401): Invalid key. COMPOSIO_API_KEY as read: 20 characters, starts with ak_.'));
    const checks = await readinessChecks(openai(200));
    expect(checks.find((c) => c.key === 'COMPOSIO_API_KEY')).toMatchObject({ ok: false, required: true });
    expect(checks.find((c) => c.key === 'COMPOSIO_API_KEY')?.detail).toMatch(/refused the API key \(401\): Invalid key/);
    expect(checks.filter((c) => c.key.startsWith('composio:') || c.key.startsWith('authconfig:')).every((c) => !c.ok && /Not checked/.test(c.detail))).toBe(true);
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
    mocks.authConfigFor.mockClear();
    checks = await readinessChecks(openai(200));
    expect(checks.find((c) => c.key === 'OPENAI_API_KEY')?.detail).toMatch(/missing in Vercel/);
    expect(checks.find((c) => c.key === 'COMPOSIO_API_KEY')?.detail).toMatch(/missing in Vercel/);
    expect(checks.find((c) => c.key === 'SUPABASE_SERVICE_ROLE_KEY')?.detail).toMatch(/missing in Vercel/);
    expect(checks.find((c) => c.key === 'composio:ahrefs')?.detail).toMatch(/Composio is not set up/);
    expect(checks.find((c) => c.key === 'authconfig:instagram')?.detail).toMatch(/Composio is not set up/);
    expect(mocks.authConfigFor).not.toHaveBeenCalled();
    expect(checks.find((c) => c.key === 'RESEND_API_KEY')).toMatchObject({ ok: false, required: false });
    expect(mocks.activeConnection).not.toHaveBeenCalled();
  });

  it('with a consumer key, phases 1 and 2 are checked in the consumer account and the project key only serves clients', async () => {
    vi.stubEnv('COMPOSIO_CONSUMER_API_KEY', 'ck_consumer_secret');
    mocks.consumerConnections.mockImplementation(async (toolkits: string[]) =>
      toolkits.map((toolkit) => ({ toolkit, state: toolkit === 'ahrefs' ? 'instant' : toolkit === 'googleads' ? 'active' : toolkit === 'google_maps' ? 'active' : 'missing', accounts: toolkit === 'ahrefs' ? 0 : 1 }))
    );
    const checks = await readinessChecks(openai(200));
    expect(checks.map((c) => c.key)).toEqual([
      'SUPABASE_SERVICE_ROLE_KEY',
      'OPENAI_API_KEY',
      'COMPOSIO_CONSUMER_API_KEY',
      ...TOOLKIT_CHECKS.map((t) => `composio:${t.toolkit}`),
      'COMPOSIO_API_KEY',
      ...CLIENT_SERVICES.map((s) => `authconfig:${s.toolkit}`),
      'RESEND_API_KEY',
      'GOOGLE_ADS_CUSTOMER_ID',
    ]);
    expect(checks.find((c) => c.key === 'COMPOSIO_CONSUMER_API_KEY')).toMatchObject({ ok: true });
    expect(checks.find((c) => c.key === 'COMPOSIO_CONSUMER_API_KEY')?.detail).toMatch(/18 characters, starts with ck_/);
    expect(checks.find((c) => c.key === 'composio:ahrefs')?.detail).toMatch(/instant account, billed per call/);
    expect(checks.find((c) => c.key === 'composio:scrapecreators')).toMatchObject({ ok: false });
    expect(checks.find((c) => c.key === 'composio:scrapecreators')?.detail).toMatch(/For You dashboard/);
    expect(checks.find((c) => c.key === 'COMPOSIO_API_KEY')).toMatchObject({ ok: true, required: false });
    // The project's own connections are not asked about: nothing reads them for a prospect.
    expect(mocks.activeConnection).not.toHaveBeenCalled();
    expect(JSON.stringify(checks)).not.toContain('ck_consumer_secret');
    expect(readinessSummary(checks).summary).toMatch(/^Audits run, with 1 data source missing: ScrapeCreators/);
  });

  it('a consumer key with no project key still runs audits; a refused consumer key is not ok', async () => {
    vi.stubEnv('COMPOSIO_CONSUMER_API_KEY', 'ck_consumer_secret');
    vi.stubEnv('COMPOSIO_API_KEY', '');
    mocks.composioConfigured = false;
    let checks = await readinessChecks(openai(200));
    expect(checks.find((c) => c.key === 'COMPOSIO_API_KEY')).toMatchObject({ ok: false, required: false });
    expect(checks.find((c) => c.key === 'COMPOSIO_API_KEY')?.detail).toMatch(/partners cannot link a client’s accounts/);
    expect(readinessSummary(checks).ready).toBe(true);

    mocks.consumerConnections.mockRejectedValue(new PermanentStepError('Composio refused the consumer API key (401): Invalid consumer API key. COMPOSIO_CONSUMER_API_KEY as read: 18 characters, starts with ck_.'));
    checks = await readinessChecks(openai(200));
    expect(checks.find((c) => c.key === 'COMPOSIO_CONSUMER_API_KEY')).toMatchObject({ ok: false });
    expect(checks.find((c) => c.key === 'COMPOSIO_CONSUMER_API_KEY')?.detail).toMatch(/Invalid consumer API key/);
    expect(checks.find((c) => c.key === 'composio:googleads')?.detail).toBe('Not checked: the consumer key was refused.');
  });

  it('a network failure reaching OpenAI is a failed check, not a thrown error', async () => {
    const down = vi.fn(async () => {
      throw new Error('fetch failed');
    }) as unknown as typeof fetch;
    const checks = await readinessChecks(down);
    expect(checks.find((c) => c.key === 'OPENAI_API_KEY')?.detail).toBe('OpenAI could not be reached: fetch failed');
  });
});
