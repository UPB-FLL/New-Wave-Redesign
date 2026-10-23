import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./adminAuth', () => ({ adminAuthHeaders: vi.fn(async () => ({ Authorization: 'Bearer staff-session' })) }));
vi.mock('./groundswellPartner', async (original) => ({ ...await original<typeof import('./groundswellPartner')>(), getPartnerToken: vi.fn(() => 'partner-session') }));

import { adminAuthHeaders } from './adminAuth';
import { PartnerSignedOut } from './groundswellPartner';
import { discoverBusiness } from './groundswellDiscovery';

const response = { business: { brand_colors: [] }, competitors: [], sources: [], warnings: [], discovered_at: '2026-10-23' };
const fetcher = vi.fn();
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('fetch', fetcher); fetcher.mockResolvedValue(new Response(JSON.stringify(response), { status: 200 })); });
afterEach(() => vi.unstubAllGlobals());

describe('business discovery browser client', () => {
  it.each(['admin', 'partner'] as const)('uses %s authentication and forwards cancellation to the discovery endpoint', async (viewer) => {
    const controller = new AbortController();
    await discoverBusiness(viewer, { website: 'https://wildlyprimal.com' }, controller.signal);
    expect(fetcher).toHaveBeenCalledWith('/api/groundswell/discover', expect.objectContaining({ method: 'POST', body: JSON.stringify({ website: 'https://wildlyprimal.com' }), headers: { 'Content-Type': 'application/json', Authorization: viewer === 'admin' ? 'Bearer staff-session' : 'Bearer partner-session' }, signal: controller.signal }));
    expect(adminAuthHeaders).toHaveBeenCalledTimes(viewer === 'admin' ? 1 : 0);
  });

  it('preserves partner sign-in failures and exposes server failure details', async () => {
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Sign in again.' }), { status: 401 }));
    await expect(discoverBusiness('partner', { instagram: 'wildlyprimal' })).rejects.toBeInstanceOf(PartnerSignedOut);
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Lookup is temporarily unavailable.' }), { status: 503 }));
    await expect(discoverBusiness('admin', { website: 'https://wildlyprimal.com' })).rejects.toThrow('Lookup is temporarily unavailable.');
  });

  it('rejects an incomplete successful response instead of breaking the intake', async () => {
    fetcher.mockResolvedValueOnce(new Response('{}', { status: 200 }));
    await expect(discoverBusiness('admin', { website: 'https://wildlyprimal.com' })).rejects.toThrow('incomplete details');
  });
});
