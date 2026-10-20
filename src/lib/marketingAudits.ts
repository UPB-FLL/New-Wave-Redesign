import { supabase } from './supabase';

/**
 * Marketing audit requests (NW Social Engineering). An admin queues a business,
 * by website and/or Instagram, with optional competitors; the hourly
 * marketing-audit routine runs the .claude/skills/marketing-audit skill and
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
