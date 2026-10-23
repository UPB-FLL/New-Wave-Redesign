import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiRequest, ApiResponse } from '../../../api/_lib/http';
import type { DiscoveryResult } from '../../lib/groundswellDiscoveryTypes';

const mocks = vi.hoisted(() => ({ viewer: vi.fn(), discover: vi.fn(), limit: vi.fn() }));
vi.mock('../../../api/_lib/groundswell/viewer', () => ({ resolveViewer: mocks.viewer }));
vi.mock('../../../api/_lib/supabaseAdmin', () => ({ isSupabaseConfigured: () => true }));
vi.mock('../../../api/_lib/groundswell/discovery', async original => ({ ...await original<typeof import('../../../api/_lib/groundswell/discovery')>(), discoverPublicBusiness: mocks.discover }));
vi.mock('../../../api/_lib/http', async original => ({ ...await original<typeof import('../../../api/_lib/http')>(), rateLimit: mocks.limit }));

const result: DiscoveryResult = { business: { business_name: 'Harbor', website: 'https://harbor.example', city: 'Miami', instagram: 'harbor', facebook: null, brand_logo_url: 'https://harbor.example/logo.svg', brand_color: '#123456', brand_colors: ['#123456'], category: 'Repair' }, competitors: [], sources: [{ name: 'Website', status: 'ok', url: 'https://harbor.example' }], warnings: [], discovered_at: '2026-10-23T12:00:00Z' };
let handler: typeof import('../../../api/groundswell/discover').default;
const response = () => {
  const res = { setHeader: vi.fn(), status: vi.fn(), json: vi.fn(), send: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
};
beforeEach(async () => {
  vi.resetModules();
  mocks.viewer.mockReset().mockResolvedValue({ ok: true, viewer: { kind: 'admin' }, partner: null });
  mocks.discover.mockReset().mockResolvedValue(result);
  mocks.limit.mockReset().mockReturnValue(true);
  handler = (await import('../../../api/groundswell/discover')).default;
});
const run = async (body: unknown, method = 'POST') => {
  const res = response();
  await handler({ method, headers: {}, body } as ApiRequest, res as ApiResponse);
  return res;
};

describe('authenticated business discovery', () => {
  it('rejects unauthenticated requests before doing public research', async () => {
    mocks.viewer.mockResolvedValue({ ok: false, status: 401, error: 'Sign in.' });
    const res = await run({ website: 'harbor.example' });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(mocks.discover).not.toHaveBeenCalled();
  });
  it('returns editable suggestions directly and prevents shared HTTP caching', async () => {
    const res = await run({ website: 'harbor.example', instagram: '@harbor' });
    expect(res.json).toHaveBeenCalledWith(result);
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
    expect(mocks.discover).toHaveBeenCalledWith(expect.objectContaining({ website: 'https://harbor.example', instagram: 'harbor' }));
  });
  it.each([{ website: 'http://127.0.0.1' }, { website: 'https://localhost.local' }, { facebook: 'https://facebook.com.evil.example/page' }, { instagram: '<script>' }, { website: 123 }, {}])('rejects invalid seeds before fetching: %j', async body => {
    expect((await run(body)).status).toHaveBeenCalledWith(400);
    expect(mocks.discover).not.toHaveBeenCalled();
  });
  it('deduplicates healthy lookups for one viewer, without sharing another partner’s cached result', async () => {
    await run({ website: 'harbor.example' });
    await run({ website: 'harbor.example' });
    expect(mocks.discover).toHaveBeenCalledTimes(1);
    mocks.viewer.mockResolvedValue({ ok: true, viewer: { kind: 'partner', partnerId: 'other' }, partner: { id: 'other' } });
    await run({ website: 'harbor.example' });
    expect(mocks.discover).toHaveBeenCalledTimes(2);
  });
  it('does not cache unavailable provider reads after their connection or credit balance is repaired', async () => {
    mocks.discover.mockResolvedValue({ ...result, sources: [{ name: 'Competitor research', status: 'unavailable' }], warnings: ['Composio needs credits.'] });
    await run({ website: 'harbor.example' });
    await run({ website: 'harbor.example' });
    expect(mocks.discover).toHaveBeenCalledTimes(2);
  });
  it('rate limits costly lookups and does not leak internal provider exceptions', async () => {
    mocks.limit.mockReturnValue(false);
    expect((await run({ website: 'harbor.example' })).status).toHaveBeenCalledWith(429);
    expect(mocks.discover).not.toHaveBeenCalled();
    mocks.limit.mockReturnValue(true);
    mocks.discover.mockRejectedValue(new Error('Internal request failed'));
    const res = await run({ website: 'harbor.example' });
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('enter the details manually') });
  });
});
