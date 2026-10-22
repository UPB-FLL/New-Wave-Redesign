import { adminUser, isReportAdmin } from '../_lib/adminKey.js';
import { resolvePartner } from '../_lib/groundswell/partners.js';
import { isReportKind, reportsFor, signedReportUrl, SIGNED_URL_SECONDS } from '../_lib/groundswell/reportStore.js';
import { methodGuard, queryParam, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { getSupabaseAdmin, isSupabaseConfigured } from '../_lib/supabaseAdmin.js';

/**
 * GET /api/groundswell/report?audit=<id>[&kind=summary|deck|audit|benchmark]
 *
 * The one door to a finished report. The caller is either the partner whose
 * session queued the audit (Bearer partner token) or an admin on the
 * allow-list (Bearer Supabase token, GROUNDSWELL_ADMIN_EMAILS). Anyone else,
 * and any audit the caller does not own, gets 404, never a hint that it
 * exists. With a kind, the answer is a signed link that opens the file for
 * SIGNED_URL_SECONDS; without one, the kinds the audit has.
 */

const bearer = (req: ApiRequest) => {
  const v = req.headers?.authorization;
  return (Array.isArray(v) ? v[0] : v)?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? null;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!methodGuard(req, res, ['GET'])) return;
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Reports are not available right now.' });
  const auditId = queryParam(req, 'audit');
  const kind = queryParam(req, 'kind');
  if (!auditId || !/^[0-9a-f-]{36}$/i.test(auditId) || (kind && !isReportKind(kind))) return res.status(400).json({ error: 'Say which audit, and which report.' });

  const token = bearer(req);
  if (!token) return res.status(401).json({ error: 'Sign in to open reports.' });
  const partner = await resolvePartner(token);
  const admin = partner ? null : await adminUser(req);
  if (!partner && !isReportAdmin(admin?.email)) return res.status(401).json({ error: 'Sign in to open reports.' });

  const db = getSupabaseAdmin();
  const { data: audit, error } = await db.from('marketing_audits').select('id,partner_id').eq('id', auditId).maybeSingle();
  if (error) {
    console.error('Report lookup failed:', error.message);
    return res.status(503).json({ error: 'Reports are not available right now.' });
  }
  // A partner sees only its own audits; a missing one and someone else's answer alike.
  if (!audit || (partner && (audit as { partner_id: string | null }).partner_id !== partner.id)) return res.status(404).json({ error: 'No such report.' });

  const reports = (await reportsFor(db, [auditId])).get(auditId) ?? [];
  if (!kind) return res.status(200).json({ reports: reports.map((r) => ({ kind: r.kind, name: r.name, pages: r.pages })) });
  const report = reports.find((r) => r.kind === kind);
  if (!report) return res.status(404).json({ error: 'No such report.' });
  try {
    const url = await signedReportUrl(db, report.path);
    return res.status(200).json({ url, expires_in: SIGNED_URL_SECONDS, name: report.name });
  } catch (err) {
    console.error('Report link failed:', err instanceof Error ? err.message : err);
    return res.status(503).json({ error: 'Reports are not available right now.' });
  }
}
