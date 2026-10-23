import type { AuditCompetitor, AuditDraft, AuditKind, AuditStatus, ClientAccountStatus, ClientService, CustomerDraft, CustomerStage, PartnerBranding } from './groundswellValidation';

/**
 * Browser client for Groundswell's partner app (/groundswell). Partners are not Supabase users;
 * they hold an opaque session token from /api/groundswell/partner-auth. It lives
 * in sessionStorage, like the support portal's, so it ends with the tab.
 */

const SESSION_KEY = 'groundswell_partner_session';

export interface PartnerSummary {
  company: string;
  contact_name: string | null;
  email: string;
}

export interface PartnerAudit {
  id: string;
  business_name: string;
  city: string | null;
  website: string | null;
  instagram: string | null;
  facebook?: string | null;
  competitors: { name: string }[];
  status: AuditStatus;
  drive_folder_url: string | null;
  summary_pdf_url: string | null;
  deck_pdf_url: string | null;
  audit_pdf_url: string | null;
  /** Missing until the benchmark migration (20261022120000) is applied. */
  kind?: 'audit' | 'benchmark';
  benchmark_pdf_url?: string | null;
  /** The reports stored for this audit (migration 20261026120000); opened through openPartnerReport. */
  reports?: { kind: ReportKind; name: string; pages: number }[];
  created_at: string;
  completed_at: string | null;
}

export type ReportKind = 'summary' | 'deck' | 'audit' | 'benchmark' | 'adsets' | 'integrated';
export const REPORT_LABELS: Record<ReportKind, string> = {
  summary: 'Summary',
  deck: 'Slides',
  audit: 'Full audit',
  benchmark: 'Competitive benchmark',
  adsets: 'Ad sets',
  integrated: 'Integrated plan',
};
const REPORT = '/api/groundswell/report';

/** A short-lived link to one of the partner's own reports. */
export async function partnerReportUrl(auditId: string, kind: ReportKind): Promise<string> {
  return (await call<{ url: string }>(`${REPORT}?audit=${encodeURIComponent(auditId)}&kind=${kind}`)).url;
}

export function getPartnerToken(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function setPartnerToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(SESSION_KEY, token);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage blocked: the session lasts until reload */
  }
}

/** Thrown when the session is missing or has ended, so pages can send the partner to sign in. */
export class PartnerSignedOut extends Error {}

async function call<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const token = getPartnerToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (response.status === 401 && auth) {
    setPartnerToken(null);
    throw new PartnerSignedOut(body.error || 'Sign in again.');
  }
  if (!response.ok) throw new Error(body.error || 'Something went wrong; try again.');
  return body;
}

const AUTH = '/api/groundswell/partner-auth';
const AUDITS = '/api/groundswell/partner-audits';

export async function partnerSignIn(email: string, password: string): Promise<PartnerSummary> {
  const body = await call<{ token: string; partner: PartnerSummary }>(
    AUTH,
    { method: 'POST', body: JSON.stringify({ action: 'sign-in', email, password }) },
    false
  );
  setPartnerToken(body.token);
  return body.partner;
}

export async function partnerSignOut(): Promise<void> {
  try {
    await call(AUTH, { method: 'POST', body: JSON.stringify({ action: 'sign-out' }) });
  } catch {
    /* the local token is cleared either way */
  } finally {
    setPartnerToken(null);
  }
}

export async function currentPartner(): Promise<PartnerSummary | null> {
  if (!getPartnerToken()) return null;
  try {
    return (await call<{ partner: PartnerSummary }>(AUTH)).partner;
  } catch (err) {
    if (err instanceof PartnerSignedOut) return null;
    throw err;
  }
}

export async function setPartnerPassword(token: string, password: string): Promise<void> {
  await call(AUTH, { method: 'POST', body: JSON.stringify({ action: 'set-password', token, password }) }, false);
}

export async function requestPartnerReset(email: string): Promise<string> {
  const body = await call<{ message?: string }>(AUTH, { method: 'POST', body: JSON.stringify({ action: 'forgot-password', email }) }, false);
  return body.message ?? 'If that email belongs to a partner account, a reset link is on its way.';
}

export async function listPartnerAudits(): Promise<PartnerAudit[]> {
  return (await call<{ audits: PartnerAudit[] }>(AUDITS)).audits;
}

export async function submitPartnerAudit(draft: AuditDraft): Promise<PartnerAudit> {
  return (await call<{ audit: PartnerAudit }>(AUDITS, { method: 'POST', body: JSON.stringify(draft) })).audit;
}

// ---------------------------------------------------------------------------
// Customers (migration 20261024130000): a business the partner audits, with its audits as history.
// A customer is a prospect (a lead read from public data) or a client (migration 20261027120000).

const CUSTOMERS = '/api/groundswell/partner-customers';

export interface PartnerCustomer {
  id: string;
  business_name: string;
  city: string | null;
  website: string | null;
  instagram: string | null;
  facebook?: string | null;
  competitors: AuditCompetitor[];
  notes: string | null;
  created_at: string;
  updated_at: string;
  /** Prospect (its public data is read) or client (the partner works for it); every customer is a prospect before the stage migration. */
  stage: CustomerStage;
  became_client_at: string | null;
  /** The newest audit, or null before the first one is queued. */
  latest: { id: string; status: AuditStatus; kind: AuditKind; created_at: string; completed_at: string | null } | null;
  /** When the newest finished audit's reports were delivered. */
  last_reports_at: string | null;
  audit_count: number;
}

/** The first audit queued with a new customer: an audit or a benchmark, with optional look overrides; `stage: 'client'` adds a client. */
export type NewCustomerDraft = CustomerDraft & Pick<AuditDraft, 'kind' | 'brand_logo_url' | 'brand_color'> & { stage?: CustomerStage };

/** The partner's customers, most recent activity first; with a stage, only that stage's. */
export async function listPartnerCustomers(stage?: CustomerStage): Promise<PartnerCustomer[]> {
  return (await call<{ customers: PartnerCustomer[] }>(stage ? `${CUSTOMERS}?stage=${stage}` : CUSTOMERS)).customers;
}

export interface PartnerCustomerDetail {
  customer: PartnerCustomer;
  audits: PartnerAudit[];
  /** False until the stage migration is applied (no "Became a client" then). */
  stages_available?: boolean;
}

export async function getPartnerCustomer(id: string): Promise<PartnerCustomerDetail> {
  return call<PartnerCustomerDetail>(`${CUSTOMERS}?id=${encodeURIComponent(id)}`);
}

/** Moves a prospect to the clients, or a client back; the record and everything gathered stay. */
export async function setPartnerCustomerStage(id: string, stage: CustomerStage): Promise<PartnerCustomer> {
  return (await call<{ customer: PartnerCustomer }>(`${CUSTOMERS}?id=${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ stage }) })).customer;
}

/** Adds a customer and queues its first audit. */
export async function createPartnerCustomer(draft: NewCustomerDraft): Promise<{ customer: PartnerCustomer; audit: PartnerAudit }> {
  return call<{ customer: PartnerCustomer; audit: PartnerAudit }>(CUSTOMERS, { method: 'POST', body: JSON.stringify(draft) });
}

export async function updatePartnerCustomer(id: string, draft: CustomerDraft): Promise<PartnerCustomer> {
  return (await call<{ customer: PartnerCustomer }>(`${CUSTOMERS}?id=${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(draft) })).customer;
}

// ---------------------------------------------------------------------------
// A client's linked accounts (migration 20261028120000): Composio's hosted sign-in per service.

const ACCOUNTS = '/api/groundswell/partner-accounts';

export interface ClientAccount {
  service: ClientService;
  label: string;
  brings: string;
  status: ClientAccountStatus | 'none';
  linked_at: string | null;
  /** A plain sentence for a failed or expired link. */
  reason: string | null;
}

export async function listClientAccounts(customerId: string): Promise<{ accounts: ClientAccount[]; available: boolean }> {
  return call<{ accounts: ClientAccount[]; available: boolean }>(`${ACCOUNTS}?customer=${encodeURIComponent(customerId)}`);
}

/** Starts the sign-in for one service; the browser goes to `redirect_url` and comes back to the client's page. */
export async function linkClientAccount(customerId: string, service: ClientService): Promise<{ redirect_url: string; accounts: ClientAccount[] }> {
  return call<{ redirect_url: string; accounts: ClientAccount[] }>(ACCOUNTS, { method: 'POST', body: JSON.stringify({ customer: customerId, service }) });
}

export async function unlinkClientAccount(customerId: string, service: ClientService): Promise<ClientAccount[]> {
  return (await call<{ accounts: ClientAccount[] }>(`${ACCOUNTS}?customer=${encodeURIComponent(customerId)}&service=${service}`, { method: 'DELETE' })).accounts;
}

const BRANDING = '/api/groundswell/partner-branding';

/** What a partner's reports carry instead of New Wave's name; `available` is false until the database supports it. */
export interface PartnerBrandingState {
  company: string;
  branding: PartnerBranding;
  available: boolean;
}

export async function getPartnerBranding(): Promise<PartnerBrandingState> {
  return call<PartnerBrandingState>(BRANDING);
}

export async function savePartnerBranding(branding: { display_name: string; logo_url: string }): Promise<PartnerBrandingState> {
  return call<PartnerBrandingState>(BRANDING, { method: 'PUT', body: JSON.stringify(branding) });
}
