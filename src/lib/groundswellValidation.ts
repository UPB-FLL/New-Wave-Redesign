// Groundswell audit requests: shapes and input checks. Pure (no Supabase),
// so the partner API (api/groundswell/partner-audits.ts) uses the same rules
// as the admin screen.

export type AuditStatus = 'queued' | 'running' | 'done' | 'failed';
/** An audit, or a competitor benchmark (the audit plus a comparison with the top two competitors). */
export type AuditKind = 'audit' | 'benchmark';
/** Competitors a benchmark compares: the first ones entered, in order. */
export const BENCHMARK_COMPETITORS = 2;

export interface AuditCompetitor {
  name: string;
  website: string | null;
  instagram: string | null;
}

export interface GroundswellAudit {
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
  /** The partner who submitted it; null when an admin queued it. */
  partner_id: string | null;
  /** Missing before the benchmark migration (20261022120000); then 'audit' unless queued as a benchmark. */
  kind?: AuditKind;
  benchmark_pdf_url?: string | null;
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
  /** 'benchmark' compares the business with its first two competitors; omitted means an audit. */
  kind?: AuditKind;
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
  /** Sent only for a benchmark, so queueing an audit never names the column. */
  kind?: 'benchmark';
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
  if (draft.kind === 'benchmark' && competitors.length < BENCHMARK_COMPETITORS) {
    throw new Error('A benchmark needs two competitors, each with a website or an Instagram handle.');
  }
  return {
    business_name,
    city: draft.city.trim() || null,
    website,
    instagram,
    notes: draft.notes.trim() || null,
    competitors,
    ...(draft.kind === 'benchmark' ? { kind: 'benchmark' as const } : {}),
  };
}
