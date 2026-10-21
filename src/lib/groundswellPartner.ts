import type { AuditDraft, AuditStatus } from './groundswellValidation';

/**
 * Browser client for the Croissance partner portal
 * (/social-engineering/croissance/partners). Partners are not Supabase users;
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
  created_at: string;
  completed_at: string | null;
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
