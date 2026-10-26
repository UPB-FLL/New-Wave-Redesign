import { adminAuthHeaders } from './adminAuth';
import { getPartnerToken, PartnerSignedOut } from './groundswellPartner';
import type { WorkspaceViewer } from './groundswellWorkspace';
import type { ChecklistItem, HeadwayAction, HeadwayPlanSummary, HeadwayService } from './headway';

/**
 * The browser's side of Headway (/api/groundswell/headway): a customer's
 * services, setup checklist, plans and actions, for its partner or New Wave
 * staff. The server decides what each may do (staff switch services and
 * reveal stored logins; both plan, provide setup items and approve).
 */

export interface HeadwayData {
  available: boolean;
  secrets_available: boolean;
  can_manage: boolean;
  services: { service: HeadwayService; label: string; does: string; enabled: boolean; granted_at: string | null }[];
  checklist: ChecklistItem[];
  plans: HeadwayPlanSummary[];
  actions: HeadwayAction[];
  source: { audit_id: string; phase: string; completed_at: string | null } | null;
  source_note: string;
}

const HEADWAY = '/api/groundswell/headway';

async function api<T>(viewer: WorkspaceViewer, path: string, init: RequestInit = {}): Promise<T> {
  const auth: Record<string, string> = viewer === 'partner' ? (getPartnerToken() ? { Authorization: `Bearer ${getPartnerToken()}` } : {}) : await adminAuthHeaders();
  const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...auth, ...(init.headers ?? {}) } });
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (response.status === 401 && viewer === 'partner') throw new PartnerSignedOut(body.error || 'Sign in again.');
  if (!response.ok) throw new Error(body.error || 'Something went wrong; try again.');
  return body;
}

export const getHeadway = (viewer: WorkspaceViewer, customerId: string) => api<HeadwayData>(viewer, `${HEADWAY}?customer=${encodeURIComponent(customerId)}`);

export const setHeadwayServices = (customerId: string, services: Partial<Record<HeadwayService, boolean>>) =>
  api<HeadwayData>('admin', HEADWAY, { method: 'PATCH', body: JSON.stringify({ customer: customerId, services }) });

export const saveHeadwaySetupItem = (viewer: WorkspaceViewer, customerId: string, item: { key: string; status: 'provided' | 'waived' | 'needed'; value?: string; notes?: string }) =>
  api<HeadwayData>(viewer, HEADWAY, { method: 'PUT', body: JSON.stringify({ customer: customerId, item: item.key, status: item.status, value: item.value, notes: item.notes }) });

export const revealHeadwaySecret = async (customerId: string, key: string) =>
  (await api<{ key: string; value: string }>('admin', `${HEADWAY}?customer=${encodeURIComponent(customerId)}&reveal=${encodeURIComponent(key)}`)).value;

export const planHeadway = (viewer: WorkspaceViewer, customerId: string) => api<HeadwayData>(viewer, HEADWAY, { method: 'POST', body: JSON.stringify({ customer: customerId, action: 'plan' }) });

export const moveHeadwayActions = (viewer: WorkspaceViewer, customerId: string, action: 'approve' | 'decline' | 'done' | 'retry', ids: string[]) =>
  api<HeadwayData>(viewer, HEADWAY, { method: 'POST', body: JSON.stringify({ customer: customerId, action, ids }) });
