import { buildAuditInsert, type AuditDraft } from '../../src/lib/groundswellValidation.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { methodGuard, readJsonBody, rateLimit, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { notifyNewPartnerAudit, requirePartner } from '../_lib/groundswell/partners.js';
import { getSupabaseAdmin, isSupabaseConfigured } from '../_lib/supabaseAdmin.js';

/**
 * /api/groundswell/partner-audits — a signed-in partner's own audits.
 *
 * GET: the audits this partner submitted, newest first, with Drive links once
 * done. Error details stay internal; a failed audit only says so.
 * POST: queue a business (same checks as the admin form), as an audit or a
 * competitor benchmark (`kind: 'benchmark'`, two competitors). It waits in the
 * queue until an admin runs it.
 */

export const PARTNER_DAILY_LIMIT = 20;

const PARTNER_COLUMNS =
  'id,business_name,city,website,instagram,competitors,status,drive_folder_url,summary_pdf_url,deck_pdf_url,audit_pdf_url,created_at,completed_at';
/** Read only where the database has them (migration 20261022120000). */
const BENCHMARK_COLUMNS = ',kind,benchmark_pdf_url';
const missingColumn = (message: string | undefined) => /column .* does not exist|42703/i.test(message ?? '');

async function partnerAudits(db: SupabaseClient, partnerId: string) {
  const read = (columns: string) => db.from('marketing_audits').select(columns).eq('partner_id', partnerId).order('created_at', { ascending: false }).limit(200);
  const first = await read(PARTNER_COLUMNS + BENCHMARK_COLUMNS);
  return first.error && missingColumn(first.error.message) ? read(PARTNER_COLUMNS) : first;
}

function emptyDraft(body: Record<string, unknown>): AuditDraft {
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const competitors = Array.isArray(body.competitors) ? body.competitors.slice(0, 6) : [];
  return {
    business_name: str(body.business_name),
    city: str(body.city),
    website: str(body.website),
    instagram: str(body.instagram),
    notes: str(body.notes).slice(0, 2000),
    ...(body.kind === 'benchmark' ? { kind: 'benchmark' as const } : {}),
    competitors: competitors.map((c) => {
      const r = (c ?? {}) as Record<string, unknown>;
      return { name: str(r.name), website: str(r.website), instagram: str(r.instagram) };
    }),
  };
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!methodGuard(req, res, ['GET', 'POST'])) return;
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'The partner portal is not available right now.' });
  const partner = await requirePartner(req, res);
  if (!partner) return;
  const db = getSupabaseAdmin();

  if (req.method === 'GET') {
    const { data, error } = await partnerAudits(db, partner.id);
    if (error) {
      console.error('Partner audits read failed:', error.message);
      return res.status(500).json({ error: 'Could not load your audits.' });
    }
    return res.status(200).json({ audits: data ?? [] });
  }

  if (!rateLimit(`gs-partner-submit:${partner.id}`, PARTNER_DAILY_LIMIT, 24 * 60 * 60_000)) {
    return res.status(429).json({ error: `You can queue up to ${PARTNER_DAILY_LIMIT} audits a day.` });
  }
  let row;
  try {
    row = buildAuditInsert(emptyDraft(readJsonBody(req)));
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Check the details and try again.' });
  }
  const { data, error } = await db
    .from('marketing_audits')
    .insert({ ...row, status: 'queued', partner_id: partner.id })
    .select(row.kind ? PARTNER_COLUMNS + BENCHMARK_COLUMNS : PARTNER_COLUMNS)
    .single();
  if (error || !data) {
    console.error('Partner audit insert failed:', error?.message);
    return res.status(400).json({ error: 'Could not queue that audit. Check the website and Instagram and try again.' });
  }
  await notifyNewPartnerAudit(partner, row.business_name);
  return res.status(201).json({ audit: data });
}
