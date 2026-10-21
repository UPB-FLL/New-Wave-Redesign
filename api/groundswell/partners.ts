import { buildPartnerBranding } from '../../src/lib/groundswellValidation.js';
import { requireAdmin } from '../_lib/adminKey.js';
import { isValidEmail, methodGuard, readJsonBody, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import {
  destroyAllPartnerSessions,
  issuePartnerToken,
  normalizeEmail,
  sendPartnerEmail,
  setPasswordUrl,
} from '../_lib/groundswell/partners.js';
import { getSupabaseAdmin, isSupabaseConfigured } from '../_lib/supabaseAdmin.js';

/**
 * /api/groundswell/partners — partner accounts, for admins (requireAdmin).
 *
 * GET: every partner with how many audits it submitted.
 * POST { company, contact_name, email, notes }: creates an invited partner
 *   and emails a set-password link. The link is also returned once, so an
 *   admin can pass it on if the email does not arrive.
 * PATCH { id, action }: resend (a new invite, or a reset link for an active
 *   account), disable (also signs the partner out), enable, or branding
 *   ({ display_name, logo_url }: what the partner's reports carry instead of
 *   New Wave's name; the partner can set it from the portal too).
 * Password hashes never leave the server.
 */

const BASE_COLUMNS = 'id,company,contact_name,email,status,notes,created_at,last_sign_in_at';
/** Read only where the database has them (migration 20261023120000). */
const BRANDING_COLUMNS = ',display_name,logo_url';
const missingColumn = (message: string | undefined) => /column .* does not exist|42703/i.test(message ?? '');

type Result<T> = { data: T | null; error: { message: string; code?: string } | null };

/**
 * Runs a query that returns partner rows with the branding columns, or again
 * without them where the database does not have them yet (a failed statement
 * changes nothing, so repeating it is safe).
 */
async function withColumns<T>(run: (columns: string) => PromiseLike<Result<T>>): Promise<Result<T>> {
  const first = await run(BASE_COLUMNS + BRANDING_COLUMNS);
  return first.error && missingColumn(first.error.message) ? run(BASE_COLUMNS) : first;
}

type PartnerRow = {
  id: string;
  company: string;
  contact_name: string | null;
  email: string;
  status: 'invited' | 'active' | 'disabled';
  notes: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  display_name?: string | null;
  logo_url?: string | null;
};

async function auditCounts(ids: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!ids.length) return counts;
  const { data } = await getSupabaseAdmin().from('marketing_audits').select('partner_id').in('partner_id', ids);
  for (const row of (data ?? []) as { partner_id: string }[]) counts.set(row.partner_id, (counts.get(row.partner_id) ?? 0) + 1);
  return counts;
}

async function withCount(row: PartnerRow) {
  return { ...row, audit_count: (await auditCounts([row.id])).get(row.id) ?? 0 };
}

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!methodGuard(req, res, ['GET', 'POST', 'PATCH'])) return;
  if (!(await requireAdmin(req, res))) return;
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'The Supabase service role is not configured.' });
  const db = getSupabaseAdmin();

  if (req.method === 'GET') {
    const { data, error } = await withColumns((cols) => db.from('groundswell_partners').select(cols).order('created_at', { ascending: false }));
    if (error) {
      console.error('Partners read failed:', error.message);
      return res.status(500).json({ error: 'Could not load partners.' });
    }
    const rows = (data ?? []) as unknown as PartnerRow[];
    const counts = await auditCounts(rows.map((r) => r.id));
    return res.status(200).json({ partners: rows.map((r) => ({ ...r, audit_count: counts.get(r.id) ?? 0 })) });
  }

  const body = readJsonBody(req);

  if (req.method === 'POST') {
    const company = text(body.company, 120);
    const email = normalizeEmail(body.email);
    if (company.length < 2) return res.status(400).json({ error: 'Add the partner’s company name.' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Add a valid email address.' });
    const { data, error } = await withColumns<PartnerRow>((cols) =>
      db
        .from('groundswell_partners')
        .insert({ company, email, contact_name: text(body.contact_name, 120) || null, notes: text(body.notes, 2000) || null, status: 'invited' })
        .select(cols)
        .single()
    );
    if (error || !data) {
      const duplicate = error?.code === '23505';
      if (!duplicate) console.error('Partner insert failed:', error?.message);
      return res.status(duplicate ? 409 : 500).json({ error: duplicate ? 'A partner with that email already exists.' : 'Could not add the partner.' });
    }
    const token = await issuePartnerToken(data.id, 'invite');
    const emailed = await sendPartnerEmail('invite', email, company, token);
    return res.status(201).json({ partner: { ...data, audit_count: 0 }, invite_url: setPasswordUrl(token), emailed });
  }

  // PATCH
  const id = typeof body.id === 'string' ? body.id : '';
  const { data: partner } = await withColumns((cols) => db.from('groundswell_partners').select(`${cols},password_hash`).eq('id', id).maybeSingle());
  if (!partner) return res.status(404).json({ error: 'No such partner.' });
  const { password_hash, ...row } = partner as PartnerRow & { password_hash: string | null };

  switch (body.action) {
    case 'resend': {
      if (row.status === 'disabled') return res.status(409).json({ error: 'Turn the account back on first.' });
      const purpose = row.status === 'invited' ? 'invite' : 'reset';
      const token = await issuePartnerToken(row.id, purpose);
      const emailed = await sendPartnerEmail(purpose, row.email, row.company, token);
      return res.status(200).json({ partner: await withCount(row), invite_url: setPasswordUrl(token), emailed });
    }
    case 'disable': {
      const { data, error } = await withColumns((cols) => db.from('groundswell_partners').update({ status: 'disabled' }).eq('id', row.id).select(cols).single());
      if (error || !data) return res.status(500).json({ error: 'Could not turn the account off.' });
      await destroyAllPartnerSessions(row.id);
      return res.status(200).json({ partner: await withCount(data as PartnerRow) });
    }
    case 'branding': {
      let branding;
      try {
        branding = buildPartnerBranding(body);
      } catch (err) {
        return res.status(400).json({ error: err instanceof Error ? err.message : 'Check the branding and try again.' });
      }
      const { data, error } = await db.from('groundswell_partners').update(branding).eq('id', row.id).select(BASE_COLUMNS + BRANDING_COLUMNS).single();
      if (error && missingColumn(error.message)) return res.status(503).json({ error: 'Branding needs the database update (migration 20261023120000).' });
      if (error || !data) return res.status(500).json({ error: 'Could not save the branding.' });
      return res.status(200).json({ partner: await withCount(data as unknown as PartnerRow) });
    }
    case 'enable': {
      const status = password_hash ? 'active' : 'invited';
      const { data, error } = await withColumns((cols) => db.from('groundswell_partners').update({ status }).eq('id', row.id).select(cols).single());
      if (error || !data) return res.status(500).json({ error: 'Could not turn the account on.' });
      return res.status(200).json({ partner: await withCount(data as PartnerRow) });
    }
    default:
      return res.status(400).json({ error: 'Unknown action.' });
  }
}
