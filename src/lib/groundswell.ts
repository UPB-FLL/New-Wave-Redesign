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
  site: 'Website',
  maps: 'Google Maps',
  search: 'Search rankings',
  keywords: 'Keyword demand',
  social: 'Instagram',
  ads: 'Ads',
  model: 'Write-up and ROI',
  adplan: 'Ad plan and change ranking',
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

/** Starts up to three queued audits on Groundswell; returns how many started. */
export async function startQueuedAudits(): Promise<number> {
  const body = await adminApi<{ started?: number }>('/api/groundswell/run', { method: 'POST' });
  return body.started ?? 0;
}

/** Which of Groundswell's services are set up in Vercel (names only, never values). */
export interface SetupStatus {
  ready: boolean;
  checks: { key: string; label: string; ok: boolean; required: boolean }[];
  drive_owner: string;
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
