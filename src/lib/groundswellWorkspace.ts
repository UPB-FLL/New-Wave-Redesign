import { adminAuthHeaders } from './adminAuth';
import { getPartnerToken, PartnerSignedOut, type ClientAccount, type ReportKind } from './groundswellPartner';
import type { ClientService, CustomerStage, Phase } from './groundswellValidation';

/**
 * The browser's side of a customer's workspace (/api/groundswell/workspace
 * and /api/groundswell/asset), for a partner (its session token) or New
 * Wave staff (their Supabase session; the allow-listed admins). The same
 * screens serve both; the server decides what each may see.
 */

export type WorkspaceViewer = 'partner' | 'admin';

export interface DataPanel {
  key: string;
  title: string;
  source: string | null;
  rows?: { label: string; value: string }[];
  table?: { head: string[]; rows: string[][] };
  list?: string[];
  note?: string | null;
}

export interface WorkspaceFile {
  kind: 'image' | 'creative' | 'carousel' | 'export';
  name: string;
  path: string;
  content_type: string;
  bytes: number;
  meta?: Record<string, unknown>;
  /** A short-lived link (runFiles only). */
  url?: string;
}

export interface WorkspaceRun {
  id: string;
  status: 'queued' | 'running' | 'done' | 'failed' | 'review';
  kind: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  /** Staff only. */
  error?: string | null;
  steps: { step: string; status: string; error?: string | null }[];
  reports: { kind: ReportKind; name: string; pages: number }[];
  files: WorkspaceFile[];
  panels?: DataPanel[];
}

export interface WorkspacePhase {
  phase: Phase;
  number: 1 | 2 | 3;
  title: string;
  source: string;
  brings: string;
  runs: WorkspaceRun[];
  start: { allowed: boolean; reason: string; builds_on: string | null };
}

export interface WorkspaceData {
  customer: { id: string; business_name: string; city: string | null; website: string | null; instagram: string | null; partner_id: string | null; stage?: string };
  phases: WorkspacePhase[];
  phases_available: boolean;
}

export interface StaffCustomer {
  id: string;
  business_name: string;
  city: string | null;
  stage: string;
  partner: { id: string; company: string } | null;
  updated_at: string;
  phases: Record<Phase, { status: string; at: string } | null>;
}

async function api<T>(viewer: WorkspaceViewer, path: string, init: RequestInit = {}): Promise<T> {
  const auth: Record<string, string> =
    viewer === 'partner' ? (getPartnerToken() ? { Authorization: `Bearer ${getPartnerToken()}` } : {}) : await adminAuthHeaders();
  const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...auth, ...(init.headers ?? {}) } });
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (response.status === 401 && viewer === 'partner') throw new PartnerSignedOut(body.error || 'Sign in again.');
  if (!response.ok) throw new Error(body.error || 'Something went wrong; try again.');
  return body;
}

export const getWorkspace = (viewer: WorkspaceViewer, customerId: string) => api<WorkspaceData>(viewer, `/api/groundswell/workspace?customer=${encodeURIComponent(customerId)}`);

export const listStaffCustomers = async () => (await api<{ customers: StaffCustomer[] }>('admin', '/api/groundswell/workspace')).customers;

export const startPhase = (viewer: WorkspaceViewer, customerId: string, phase: Phase) =>
  api<{ queued: string; reason: string }>(viewer, '/api/groundswell/workspace', { method: 'POST', body: JSON.stringify({ customer: customerId, phase }) });

/** Every file of a run, each with a link that lasts ten minutes. */
export const runFiles = async (viewer: WorkspaceViewer, auditId: string) => (await api<{ files: WorkspaceFile[] }>(viewer, `/api/groundswell/asset?audit=${encodeURIComponent(auditId)}`)).files;

/** A short-lived link to one report of a run. */
export const reportUrl = async (viewer: WorkspaceViewer, auditId: string, kind: ReportKind) =>
  (await api<{ url: string }>(viewer, `/api/groundswell/report?audit=${encodeURIComponent(auditId)}&kind=${kind}`)).url;

// ---------------------------------------------------------------------------
// Staff: a customer's stage and linked accounts (/api/groundswell/accounts)

const ACCOUNTS = '/api/groundswell/accounts';

/** The staff versions of the partner portal's account calls, for the AccountsCard on the staff customer page. */
export const staffAccountsApi = {
  list: async (customerId: string) => api<{ accounts: ClientAccount[]; available: boolean }>('admin', `${ACCOUNTS}?customer=${encodeURIComponent(customerId)}`),
  link: (customerId: string, service: ClientService) =>
    api<{ redirect_url: string; accounts: ClientAccount[] }>('admin', ACCOUNTS, { method: 'POST', body: JSON.stringify({ customer: customerId, service }) }),
  unlink: async (customerId: string, service: ClientService) =>
    (await api<{ accounts: ClientAccount[] }>('admin', `${ACCOUNTS}?customer=${encodeURIComponent(customerId)}&service=${service}`, { method: 'DELETE' })).accounts,
};

/** "Became a client" or back to the prospects, by staff, for any customer. */
export const setStaffCustomerStage = async (customerId: string, stage: CustomerStage) =>
  (await api<{ customer: { id: string; stage: CustomerStage } }>('admin', `${ACCOUNTS}?customer=${encodeURIComponent(customerId)}`, { method: 'PATCH', body: JSON.stringify({ stage }) })).customer;
