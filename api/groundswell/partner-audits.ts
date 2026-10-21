import { buildAuditInsert, type AuditDraft } from '../../src/lib/groundswellValidation.js';
import { methodGuard, readJsonBody, rateLimit, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { notifyNewPartnerAudit, requirePartner } from '../_lib/groundswell/partners.js';
import { getSupabaseAdmin, isSupabaseConfigured } from '../_lib/supabaseAdmin.js';

/**
 * /api/groundswell/partner-audits — a signed-in partner's own audits.
 *
 * GET: the audits this partner submitted, newest first, with Drive links once
 * done. Error details stay internal; a failed audit only says so.
 * POST: queue a business (same checks as the admin form). It waits in the
 * queue until an admin runs it.
 */

export const PARTNER_DAILY_LIMIT = 20;

const PARTNER_COLUMNS =
  'id,business_name,city,website,instagram,competitors,status,drive_folder_url,summary_pdf_url,deck_pdf_url,audit_pdf_url,created_at,completed_at';

function emptyDraft(body: Record<string, unknown>): AuditDraft {
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const competitors = Array.isArray(body.competitors) ? body.competitors.slice(0, 6) : [];
  return {
    business_name: str(body.business_name),
    city: str(body.city),
    website: str(body.website),
    instagram: str(body.instagram),
    notes: str(body.notes).slice(0, 2000),
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
    const { data, error } = await db
      .from('marketing_audits')
      .select(PARTNER_COLUMNS)
      .eq('partner_id', partner.id)
      .order('created_at', { ascending: false })
      .limit(200);
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
    .select(PARTNER_COLUMNS)
    .single();
  if (error || !data) {
    console.error('Partner audit insert failed:', error?.message);
    return res.status(400).json({ error: 'Could not queue that audit. Check the website and Instagram and try again.' });
  }
  await notifyNewPartnerAudit(partner, row.business_name);
  return res.status(201).json({ audit: data });
}
