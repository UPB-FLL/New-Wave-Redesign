import { supabase } from './supabase';
import { adminAuthHeaders } from './adminAuth';
import {
  buildAuditInsert,
  buildCompetitor,
  type AuditCompetitor,
  type AuditDraft,
  type CompetitorDraft,
  type GroundswellAudit,
} from './groundswellValidation';

export * from './groundswellValidation';

/**
 * Groundswell in the admin portal (NW Social Engineering). An admin queues a
 * business, by website and/or Instagram, with optional competitors, then starts
 * the audits from the same screen (POST /api/groundswell/run). Groundswell, the
 * engine in api/_lib/groundswell/, runs each audit's steps
 * (marketing_audit_steps) and writes public Google Drive links back to the row.
 * Partners (outside agencies) are managed here too, through
 * /api/groundswell/partners.
 */

const COLUMNS =
  'id,business_name,city,website,instagram,competitors,notes,status,error,drive_folder_url,summary_pdf_url,deck_pdf_url,audit_pdf_url,partner_id,created_at,completed_at';

/** The benchmark columns (migration 20261022120000); read only where the database has them. */
const BENCHMARK_COLUMNS = ',kind,benchmark_pdf_url';
export const missingColumn = (message: string) => /column .* does not exist|42703/i.test(message);

export async function listAudits(): Promise<GroundswellAudit[]> {
  const read = (columns: string) => supabase.from('marketing_audits').select(columns).order('created_at', { ascending: false });
  let { data, error } = await read(COLUMNS + BENCHMARK_COLUMNS);
  if (error && missingColumn(error.message)) ({ data, error } = await read(COLUMNS));
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as GroundswellAudit[];
}

export async function queueAudit(draft: AuditDraft): Promise<void> {
  const row = buildAuditInsert(draft);
  const { error } = await supabase.from('marketing_audits').insert({ ...row, status: 'queued' });
  if (error) throw new Error(error.message);
}

/** Re-runs an audit, optionally with an updated competitor list. */
export async function requeueAudit(id: string, competitors?: AuditCompetitor[]): Promise<void> {
  const client = supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  };
  if (typeof client.rpc !== 'function') throw new Error('Supabase is not configured.');
  const { error } = await client.rpc('requeue_marketing_audit', {
    audit_id: id,
    new_competitors: competitors ?? null,
  });
  if (error) throw new Error(error.message);
}

/** Adds a competitor to an existing request and queues the audit to run again with it. */
export async function addCompetitor(audit: GroundswellAudit, draft: CompetitorDraft): Promise<void> {
  const competitor = buildCompetitor(draft);
  await requeueAudit(audit.id, [...audit.competitors, competitor]);
}

export async function deleteAudit(id: string): Promise<void> {
  const { error } = await supabase.from('marketing_audits').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export type StepStatus = 'pending' | 'running' | 'done' | 'skipped' | 'failed';

export interface AuditStep {
  audit_id: string;
  step: string;
  position: number;
  status: StepStatus;
  error: string | null;
}

/** Plain labels for Groundswell's steps (api/_lib/groundswell/steps.ts). */
export const STEP_LABELS: Record<string, string> = {
  competitors: 'Top competitors',
  site: 'Website',
  maps: 'Google Maps',
  search: 'Search rankings',
  keywords: 'Keyword demand',
  social: 'Instagram',
  ads: 'Ads',
  model: 'Write-up and ROI',
  adplan: 'Ad plan and change ranking',
  adcopy: 'Ad copy',
  social_depth: 'Instagram posts and reels',
  ads_library: 'Ad libraries',
  pricing: 'Offers and prices',
  authority: 'Authority',
  benchmark: 'Scorecard and plan',
  deliver_benchmark: 'Benchmark PDF',
  deliver_prepare: 'Drive folder',
  deliver_audit: 'Full audit PDF',
  deliver_deck: 'Slides PDF',
  deliver_summary: 'Summary PDF',
  deliver_finish: 'Share and save links',
  // The checks (api/_lib/groundswell/verify.ts), for every round the worker supports.
  ...Object.fromEntries(
    [2, 3, 4, 5].flatMap((r) => [
      [`verify_read_${r}`, `Read again (round ${r})`],
      [`verify_check_${r}`, `Compare and review (round ${r})`],
    ])
  ),
};

/** Each audit's steps in order, by audit id. Empty when there are none to show. */
export async function listAuditSteps(auditIds: string[]): Promise<Record<string, AuditStep[]>> {
  if (!auditIds.length) return {};
  const { data, error } = await supabase
    .from('marketing_audit_steps')
    .select('audit_id,step,position,status,error')
    .in('audit_id', auditIds)
    .order('position', { ascending: true });
  if (error) throw new Error(error.message);
  const out: Record<string, AuditStep[]> = {};
  for (const row of (data ?? []) as AuditStep[]) (out[row.audit_id] ??= []).push(row);
  return out;
}

async function adminApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(await adminAuthHeaders()), ...(init.headers ?? {}) },
  });
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || 'Something went wrong; try again.');
  return body;
}

/** What the checks found on an audit held in review (api/_lib/groundswell/verify.ts). */
export interface HeldCheck {
  round: number;
  hold: string | null;
  disagreements: { key: string; label: string; earlier: number | string | null; later: number | string | null; change: number | null; kind: 'moved' | 'unread' | 'changed' }[];
  missing_keywords: string[];
  review: { checked: number; corrected: { from: string; to: string; problem: string }[]; dropped: { from: string; problem: string }[] } | null;
}

/** The latest held check of each audit, by audit id. */
export async function listHeldChecks(auditIds: string[]): Promise<Record<string, HeldCheck>> {
  if (!auditIds.length) return {};
  const { data, error } = await supabase
    .from('marketing_audit_steps')
    .select('audit_id,step,output')
    .in('audit_id', auditIds)
    .like('step', 'verify_check_%');
  if (error) throw new Error(error.message);
  const out: Record<string, HeldCheck> = {};
  for (const row of (data ?? []) as { audit_id: string; output: (HeldCheck & { status?: string }) | null }[]) {
    const o = row.output;
    if (o?.status !== 'held') continue;
    if (!out[row.audit_id] || o.round > out[row.audit_id].round) out[row.audit_id] = o;
  }
  return out;
}

/** An admin's answer to a held audit: deliver it as it stands, or run its checks again. */
export async function answerReview(id: string, action: 'deliver' | 'recheck'): Promise<void> {
  await adminApi('/api/groundswell/run', { method: 'POST', body: JSON.stringify({ action, audit_id: id }) });
}

/** Starts up to three queued audits on Groundswell; returns how many started. */
export async function startQueuedAudits(): Promise<number> {
  const body = await adminApi<{ started?: number }>('/api/groundswell/run', { method: 'POST' });
  return body.started ?? 0;
}

/** Which of Groundswell's services are set up in Vercel (names only, never values). */
export interface SetupStatus {
  ready: boolean;
  checks: { key: string; label: string; ok: boolean; required: boolean }[];
  /** Who may open every report (GROUNDSWELL_ADMIN_EMAILS). */
  report_admins: string[];
}

export type ReportKind = 'summary' | 'deck' | 'audit' | 'benchmark';
export const REPORT_LABELS: Record<ReportKind, string> = { summary: 'Summary', deck: 'Slides', audit: 'Full audit', benchmark: 'Competitive benchmark' };

/** A short-lived link to a report, for an admin on the allow-list. */
export async function adminReportUrl(auditId: string, kind: ReportKind): Promise<string> {
  return (await adminApi<{ url: string }>(`/api/groundswell/report?audit=${encodeURIComponent(auditId)}&kind=${kind}`)).url;
}

export function getSetupStatus(): Promise<SetupStatus> {
  return adminApi<SetupStatus>('/api/groundswell/run');
}

export type PartnerStatus = 'invited' | 'active' | 'disabled';

export interface GroundswellPartner {
  id: string;
  company: string;
  contact_name: string | null;
  email: string;
  status: PartnerStatus;
  notes: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  audit_count: number;
  /** The name and logo the partner's reports carry; missing before the white-label migration (20261023120000). */
  display_name?: string | null;
  logo_url?: string | null;
}

export interface PartnerDraft {
  company: string;
  contact_name: string;
  email: string;
  notes: string;
}

/** The result of an invite: the link is shown once, in case the email does not arrive. */
export interface PartnerInvite {
  partner: GroundswellPartner;
  invite_url: string;
  emailed: boolean;
}

export async function listPartners(): Promise<GroundswellPartner[]> {
  return (await adminApi<{ partners: GroundswellPartner[] }>('/api/groundswell/partners')).partners;
}

export function invitePartner(draft: PartnerDraft): Promise<PartnerInvite> {
  return adminApi<PartnerInvite>('/api/groundswell/partners', { method: 'POST', body: JSON.stringify(draft) });
}

export function updatePartner(id: string, action: 'resend' | 'disable' | 'enable'): Promise<PartnerInvite | { partner: GroundswellPartner }> {
  return adminApi('/api/groundswell/partners', { method: 'PATCH', body: JSON.stringify({ id, action }) });
}

/** Sets the name and logo a partner's reports carry instead of New Wave's. */
export function setPartnerBranding(id: string, branding: { display_name: string; logo_url: string }): Promise<{ partner: GroundswellPartner }> {
  return adminApi('/api/groundswell/partners', { method: 'PATCH', body: JSON.stringify({ id, action: 'branding', ...branding }) });
}
