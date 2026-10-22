import type { AuditCompetitor, AuditDraft, AuditKind, AuditStatus, CustomerDraft, PartnerBranding } from './groundswellValidation';

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

export type ReportKind = 'summary' | 'deck' | 'audit' | 'benchmark';
export const REPORT_LABELS: Record<ReportKind, string> = { summary: 'Summary', deck: 'Slides', audit: 'Full audit', benchmark: 'Competitive benchmark' };
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
// Customers (migration 20261024120000): a business the partner audits, with its audits as history.

const CUSTOMERS = '/api/groundswell/partner-customers';

export interface PartnerCustomer {
  id: string;
  business_name: string;
  city: string | null;
  website: string | null;
  instagram: string | null;
  competitors: AuditCompetitor[];
  notes: string | null;
  created_at: string;
  updated_at: string;
  /** The newest audit, or null before the first one is queued. */
  latest: { id: string; status: AuditStatus; kind: AuditKind; created_at: string; completed_at: string | null } | null;
  /** When the newest finished audit's reports were delivered. */
  last_reports_at: string | null;
  audit_count: number;
}

/** The first audit queued with a new customer: an audit or a benchmark, with optional look overrides. */
export type NewCustomerDraft = CustomerDraft & Pick<AuditDraft, 'kind' | 'brand_logo_url' | 'brand_color'>;

export async function listPartnerCustomers(): Promise<PartnerCustomer[]> {
  return (await call<{ customers: PartnerCustomer[] }>(CUSTOMERS)).customers;
}

export async function getPartnerCustomer(id: string): Promise<{ customer: PartnerCustomer; audits: PartnerAudit[] }> {
  return call<{ customer: PartnerCustomer; audits: PartnerAudit[] }>(`${CUSTOMERS}?id=${encodeURIComponent(id)}`);
}

/** Adds a customer and queues its first audit. */
export async function createPartnerCustomer(draft: NewCustomerDraft): Promise<{ customer: PartnerCustomer; audit: PartnerAudit }> {
  return call<{ customer: PartnerCustomer; audit: PartnerAudit }>(CUSTOMERS, { method: 'POST', body: JSON.stringify(draft) });
}

export async function updatePartnerCustomer(id: string, draft: CustomerDraft): Promise<PartnerCustomer> {
  return (await call<{ customer: PartnerCustomer }>(`${CUSTOMERS}?id=${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(draft) })).customer;
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
