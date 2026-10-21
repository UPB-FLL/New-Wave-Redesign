import { supabase } from './supabase';
import { adminAuthHeaders } from './adminAuth';

/**
 * Marketing audit requests (NW Social Engineering). An admin queues a business,
 * by website and/or Instagram, with optional competitors, then starts the audits
 * from the same screen (POST /api/audits/run). Groundswell, the engine in
 * api/_lib/groundswell/, runs each audit's steps (marketing_audit_steps) and
 * writes public Google Drive links back to the row.
 */

export type AuditStatus = 'queued' | 'running' | 'done' | 'failed';

export interface AuditCompetitor {
  name: string;
  website: string | null;
  instagram: string | null;
}

export interface MarketingAudit {
  id: string;
  business_name: string;
  city: string | null;
  website: string | null;
  instagram: string | null;
  competitors: AuditCompetitor[];
  notes: string | null;
  status: AuditStatus;
  error: string | null;
  drive_folder_url: string | null;
  summary_pdf_url: string | null;
  deck_pdf_url: string | null;
  audit_pdf_url: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface AuditDraft {
  business_name: string;
  city: string;
  website: string;
  instagram: string;
  notes: string;
  competitors: { name: string; website: string; instagram: string }[];
}

const INSTAGRAM_HANDLE = /^[A-Za-z0-9._]{1,30}$/;

/** "example.com", "www.example.com/", "https://example.com/" → "https://example.com"; "" → null. */
export function normalizeWebsite(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error(`“${raw}” isn’t a website address.`);
  }
  if (!/^https?:$/.test(url.protocol) || !url.hostname.includes('.') || /\s/.test(raw)) {
    throw new Error(`“${raw}” isn’t a website address.`);
  }
  const path = url.pathname.replace(/\/+$/, '');
  return `${url.protocol}//${url.hostname.toLowerCase()}${path}${url.search}`;
}

/** "@shop", "shop", "instagram.com/shop/", "https://www.instagram.com/shop?igsh=…" → "shop"; "" → null. */
export function normalizeInstagram(input: string): string | null {
  let raw = input.trim();
  if (!raw) return null;
  const m = raw.match(/instagram\.com\/([^/?#]+)/i);
  if (m) raw = m[1];
  raw = raw.replace(/^@/, '').replace(/\/+$/, '');
  if (!INSTAGRAM_HANDLE.test(raw)) {
    throw new Error(`“${input.trim()}” isn’t an Instagram handle.`);
  }
  return raw;
}

/** Report links must be Google Drive links (the table enforces the same rule). */
export function isDriveLink(url: string | null | undefined): boolean {
  return typeof url === 'string' && /^https:\/\/drive\.google\.com\//.test(url);
}

export type CompetitorDraft = AuditDraft['competitors'][number];

/** Validates one competitor row; an unnamed one is named after its website or @handle. */
export function buildCompetitor(c: CompetitorDraft): AuditCompetitor {
  const website = normalizeWebsite(c.website);
  const instagram = normalizeInstagram(c.instagram);
  if (!website && !instagram) throw new Error(`Add a website or Instagram for ${c.name.trim() || 'each competitor'}.`);
  return { name: c.name.trim() || website || `@${instagram}`, website, instagram };
}

export interface AuditInsert {
  business_name: string;
  city: string | null;
  website: string | null;
  instagram: string | null;
  notes: string | null;
  competitors: AuditCompetitor[];
}

/** Validates a draft from the admin form; throws a readable Error on bad input. */
export function buildAuditInsert(draft: AuditDraft): AuditInsert {
  const business_name = draft.business_name.trim();
  if (business_name.length < 2) throw new Error('Add the business name.');
  const website = normalizeWebsite(draft.website);
  const instagram = normalizeInstagram(draft.instagram);
  if (!website && !instagram) throw new Error('Add a website or an Instagram handle.');
  const competitors = draft.competitors
    .filter((c) => c.name.trim() || c.website.trim() || c.instagram.trim())
    .map(buildCompetitor);
  return {
    business_name,
    city: draft.city.trim() || null,
    website,
    instagram,
    notes: draft.notes.trim() || null,
    competitors,
  };
}

const COLUMNS =
  'id,business_name,city,website,instagram,competitors,notes,status,error,drive_folder_url,summary_pdf_url,deck_pdf_url,audit_pdf_url,created_at,completed_at';

export async function listAudits(): Promise<MarketingAudit[]> {
  const { data, error } = await supabase
    .from('marketing_audits')
    .select(COLUMNS)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as MarketingAudit[];
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
export async function addCompetitor(audit: MarketingAudit, draft: CompetitorDraft): Promise<void> {
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

/** Starts up to three queued audits on Groundswell; returns how many started. */
export async function startQueuedAudits(): Promise<number> {
  const response = await fetch('/api/audits/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await adminAuthHeaders()) },
  });
  const body = (await response.json().catch(() => ({}))) as { started?: number; error?: string };
  if (!response.ok) throw new Error(body.error || 'Could not start the audits.');
  return body.started ?? 0;
}
