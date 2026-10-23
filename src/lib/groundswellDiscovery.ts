import { adminAuthHeaders } from './adminAuth';
import { getPartnerToken, PartnerSignedOut } from './groundswellPartner';
import type { WorkspaceViewer } from './groundswellWorkspace';
import type { DiscoveryResult, DiscoverySeed } from './groundswellDiscoveryTypes';

/** Read public business details using the signed-in viewer's existing session. */
export async function discoverBusiness(viewer: WorkspaceViewer, seed: DiscoverySeed, signal?: AbortSignal): Promise<DiscoveryResult> {
  const token = viewer === 'partner' ? getPartnerToken() : null;
  const auth = viewer === 'admin' ? await adminAuthHeaders() : token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch('/api/groundswell/discover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify(seed),
    signal,
  });
  const body = await response.json().catch(() => ({})) as (DiscoveryResult & { error?: string }) | null;
  if (response.status === 401 && viewer === 'partner') throw new PartnerSignedOut(body?.error || 'Sign in again.');
  if (!response.ok) throw new Error(body?.error || 'Could not look up this business. Try again or enter the details below.');
  if (!body?.business || !Array.isArray(body.business.brand_colors) || !Array.isArray(body.competitors) || !Array.isArray(body.sources) || !Array.isArray(body.warnings)) {
    throw new Error('The lookup returned incomplete details. Try again or enter the details below.');
  }
  return body;
}
