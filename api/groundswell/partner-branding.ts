import { buildPartnerBranding, type PartnerBranding } from '../../src/lib/groundswellValidation.js';
import { methodGuard, readJsonBody, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { requirePartner } from '../_lib/groundswell/partners.js';
import { getSupabaseAdmin, isSupabaseConfigured } from '../_lib/supabaseAdmin.js';

/**
 * /api/groundswell/partner-branding — what a signed-in partner's reports carry
 * instead of New Wave's name: the name on its reports (its company when unset)
 * and its logo link.
 *
 * GET: { company, branding: { display_name, logo_url }, available }.
 * PUT { display_name, logo_url }: saves them (same checks as the admin screen).
 * `available` is false until the white-label migration (20261023120000) runs;
 * a save then answers 503.
 */

const missingColumn = (message: string | undefined) => /column .* does not exist|42703/i.test(message ?? '');
const EMPTY: PartnerBranding = { display_name: null, logo_url: null };

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!methodGuard(req, res, ['GET', 'PUT'])) return;
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'The partner portal is not available right now.' });
  const partner = await requirePartner(req, res);
  if (!partner) return;
  const db = getSupabaseAdmin();

  if (req.method === 'GET') {
    const { data, error } = await db.from('groundswell_partners').select('display_name,logo_url').eq('id', partner.id).single();
    if (error && missingColumn(error.message)) return res.status(200).json({ company: partner.company, branding: EMPTY, available: false });
    if (error || !data) {
      console.error('Partner branding read failed:', error?.message);
      return res.status(500).json({ error: 'Could not load your branding.' });
    }
    return res.status(200).json({ company: partner.company, branding: data as PartnerBranding, available: true });
  }

  let branding: PartnerBranding;
  try {
    branding = buildPartnerBranding(readJsonBody(req));
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Check the details and try again.' });
  }
  const { data, error } = await db.from('groundswell_partners').update(branding).eq('id', partner.id).select('display_name,logo_url').single();
  if (error && missingColumn(error.message)) return res.status(503).json({ error: 'Branding is not available yet. Try again later.' });
  if (error || !data) {
    console.error('Partner branding update failed:', error?.message);
    return res.status(500).json({ error: 'Could not save your branding.' });
  }
  return res.status(200).json({ company: partner.company, branding: data as PartnerBranding, available: true });
}
