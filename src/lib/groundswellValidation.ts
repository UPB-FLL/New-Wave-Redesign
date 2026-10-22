// Groundswell audit requests: shapes and input checks. Pure (no Supabase),
// so the partner API (api/groundswell/partner-audits.ts) uses the same rules
// as the admin screen.

/** `review`: held before delivery for a person (the checks could not vouch for the figures). */
export type AuditStatus = 'queued' | 'running' | 'done' | 'failed' | 'review';
/** An audit, or a competitor benchmark (the audit plus a comparison with the top two competitors; any not entered are picked by the engine). */
export type AuditKind = 'audit' | 'benchmark';
/** Competitors a benchmark compares: the first ones entered, in order; the engine picks one local and one country-wide for empty slots. */
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
  /** Overrides for the business's own look in its reports; missing before the white-label migration (20261023120000). */
  brand_logo_url?: string | null;
  brand_color?: string | null;
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
  /** Optional: the business's logo link and main colour, when its website's are wrong or missing. */
  brand_logo_url?: string;
  brand_color?: string;
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

/** Hosts a report must never load from: local names and bare IP addresses. */
const PRIVATE_HOST = /^(localhost|.+\.local|.+\.internal)$|^\d{1,3}(\.\d{1,3}){3}$|^\[/i;
const LOGO_MAX_CHARS = 500;

/** An https link to a logo image on a public host; "" → null. Throws a readable Error. */
export function normalizeLogoUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (raw.length > LOGO_MAX_CHARS) throw new Error('That logo link is too long.');
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`“${raw}” isn’t a web address.`);
  }
  if (url.protocol !== 'https:') throw new Error('The logo link must start with https://.');
  if (url.username || url.password || !url.hostname.includes('.') || PRIVATE_HOST.test(url.hostname)) {
    throw new Error(`“${raw}” isn’t a public web address.`);
  }
  return url.toString();
}

/** "#1A2B3C", "1a2b3c" or "#abc" → "#1a2b3c"; "" → null. Throws a readable Error. */
export function normalizeBrandColor(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const m = raw.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) throw new Error(`“${raw}” isn’t a colour code like #1a2b3c.`);
  const hex = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return `#${hex.toLowerCase()}`;
}

/** What a partner's reports carry instead of New Wave's name: a display name (else the company) and a logo. */
export interface PartnerBranding {
  display_name: string | null;
  logo_url: string | null;
}

/** Validates branding from the partner portal or the admin screen; throws a readable Error. */
export function buildPartnerBranding(input: { display_name?: unknown; logo_url?: unknown }): PartnerBranding {
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const display_name = str(input.display_name).replace(/\s+/g, ' ').trim();
  if (display_name && display_name.length < 2) throw new Error('The name on your reports needs at least two characters.');
  if (display_name.length > 120) throw new Error('The name on your reports can be at most 120 characters.');
  return { display_name: display_name || null, logo_url: normalizeLogoUrl(str(input.logo_url)) };
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
  /** Sent only when set, like `kind`. */
  brand_logo_url?: string;
  brand_color?: string;
}

/** A customer's own details: an audit draft without the per-run choices (kind, logo and colour overrides). */
/** A customer's stage: a prospect (a lead read from public data) or a client (a business the partner works for). */
export const CUSTOMER_STAGES = ['prospect', 'client'] as const;
export type CustomerStage = (typeof CUSTOMER_STAGES)[number];
export const isCustomerStage = (v: unknown): v is CustomerStage => CUSTOMER_STAGES.includes(v as CustomerStage);

export type CustomerDraft = Omit<AuditDraft, 'kind' | 'brand_logo_url' | 'brand_color'>;
export type CustomerInsert = Omit<AuditInsert, 'kind' | 'brand_logo_url' | 'brand_color'>;

/** The same checks as an audit, for the customer record (groundswell_customers). */
export function buildCustomerInsert(draft: CustomerDraft): CustomerInsert {
  const { business_name, city, website, instagram, notes, competitors } = buildAuditInsert({ ...draft, kind: undefined, brand_logo_url: '', brand_color: '' });
  return { business_name, city, website, instagram, notes, competitors };
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
  // A benchmark with fewer than BENCHMARK_COMPETITORS entered gets the rest picked by the engine (Google Places).
  const brand_logo_url = normalizeLogoUrl(draft.brand_logo_url ?? '');
  const brand_color = normalizeBrandColor(draft.brand_color ?? '');
  return {
    business_name,
    city: draft.city.trim() || null,
    website,
    instagram,
    notes: draft.notes.trim() || null,
    competitors,
    ...(draft.kind === 'benchmark' ? { kind: 'benchmark' as const } : {}),
    ...(brand_logo_url ? { brand_logo_url } : {}),
    ...(brand_color ? { brand_color } : {}),
  };
}
