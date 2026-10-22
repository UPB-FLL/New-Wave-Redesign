import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Where finished reports live: a private Supabase Storage bucket, one object
 * per report, and a row in groundswell_reports per (audit, kind). Nothing is
 * public: the browser never gets a bucket URL, only a short-lived signed
 * link from /api/groundswell/report after the ownership check (the partner
 * that queued the audit, or an admin on the allow-list).
 */

export const REPORTS_BUCKET = 'groundswell-reports';
export const REPORT_KINDS = ['summary', 'deck', 'audit', 'benchmark', 'adsets', 'integrated'] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];
export const isReportKind = (v: unknown): v is ReportKind => typeof v === 'string' && (REPORT_KINDS as readonly string[]).includes(v);

/** The words the screens use for each report. */
export const REPORT_LABELS: Record<ReportKind, string> = {
  summary: 'Summary',
  deck: 'Slides',
  audit: 'Full audit',
  benchmark: 'Competitive benchmark',
  adsets: 'Ad sets',
  integrated: 'Integrated plan',
};

/** How long a signed link opens the file for: long enough to load, short enough not to be worth forwarding. */
export const SIGNED_URL_SECONDS = 120;

export interface ReportRow {
  id?: string;
  audit_id: string;
  kind: ReportKind;
  path: string;
  name: string;
  pages: number;
  bytes: number;
  created_at?: string;
}

/** A business name as a file name: no slashes, no control characters. */
export const safeName = (s: string) =>
  s
    // eslint-disable-next-line no-control-regex -- control characters are exactly what is removed
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100) || 'Business';

/** The object's path: one folder per audit, the kind, then the file name (ASCII only, so every client agrees on it). */
export function reportPath(auditId: string, kind: ReportKind, fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, '').replace(/[#?%\\]/g, '').trim() || `${kind}.pdf`;
  return `${auditId}/${kind}/${ascii}`;
}

type StorageClient = Pick<SupabaseClient, 'storage' | 'from'>;

/** Uploads one PDF and records it; a second delivery of the same kind replaces the first. */
export async function storeReport(db: StorageClient, report: Omit<ReportRow, 'path'>, bytes: Uint8Array): Promise<ReportRow> {
  const path = reportPath(report.audit_id, report.kind, report.name);
  const { error: uploadError } = await db.storage.from(REPORTS_BUCKET).upload(path, bytes, { contentType: 'application/pdf', upsert: true });
  if (uploadError) throw new Error(`Could not store ${report.name}: ${uploadError.message}`);
  const row: ReportRow = { ...report, path };
  const { error } = await db.from('groundswell_reports').upsert(row, { onConflict: 'audit_id,kind' });
  if (error) throw new Error(`Could not record ${report.name}: ${error.message}`);
  return row;
}

/** The reports of some audits, by audit id, in the order the kinds are delivered. */
export async function reportsFor(db: StorageClient, auditIds: string[]): Promise<Map<string, ReportRow[]>> {
  const out = new Map<string, ReportRow[]>();
  if (!auditIds.length) return out;
  const { data, error } = await db.from('groundswell_reports').select('audit_id,kind,path,name,pages,bytes,created_at').in('audit_id', auditIds);
  if (error) {
    // The table not being there yet (a migration not applied) reads as no reports, like the link columns before it.
    if (/relation .* does not exist|42P01/i.test(error.message)) return out;
    throw new Error(`Could not read the reports: ${error.message}`);
  }
  for (const row of (data ?? []) as ReportRow[]) {
    if (!isReportKind(row.kind)) continue;
    const list = out.get(row.audit_id) ?? [];
    list.push(row);
    out.set(row.audit_id, list);
  }
  for (const list of out.values()) list.sort((a, b) => REPORT_KINDS.indexOf(a.kind) - REPORT_KINDS.indexOf(b.kind));
  return out;
}

/** A link that opens the file for SIGNED_URL_SECONDS, for one reader the route has already checked. */
export async function signedReportUrl(db: StorageClient, path: string, seconds = SIGNED_URL_SECONDS): Promise<string> {
  const { data, error } = await db.storage.from(REPORTS_BUCKET).createSignedUrl(path, seconds);
  if (error || !data?.signedUrl) throw new Error(`Could not sign the report link: ${error?.message ?? 'no url'}`);
  return data.signedUrl;
}
