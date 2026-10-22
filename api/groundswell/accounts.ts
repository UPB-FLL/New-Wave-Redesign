import { isCustomerStage, type CustomerStage } from '../../src/lib/groundswellValidation.js';
import { GROUNDSWELL_ADMIN_CUSTOMERS_PATH } from '../../src/groundswell/site.js';
import { answerAccounts, missingColumn, missingTable, NOT_READY, setStage } from '../_lib/groundswell/accountLinking.js';
import { SITE_URL } from '../_lib/groundswell/partners.js';
import { resolveViewer } from '../_lib/groundswell/viewer.js';
import { adminUser } from '../_lib/adminKey.js';
import { methodGuard, queryParam, readJsonBody, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { getSupabaseAdmin, isSupabaseConfigured } from '../_lib/supabaseAdmin.js';

/**
 * /api/groundswell/accounts — a customer's linked accounts and stage, for New
 * Wave staff (the Groundswell admins, GROUNDSWELL_ADMIN_EMAILS): any customer,
 * a partner's or New Wave's own (partner_id null), which the partner route
 * cannot reach. The same answers as api/groundswell/partner-accounts.ts
 * (api/_lib/groundswell/accountLinking.ts), the sign-in coming back to the
 * staff customer page, plus:
 *
 * PATCH `?customer=` with `{ stage }`: "Became a client" (or back to the
 *   prospects), which the partner customers route does for a partner's own.
 *
 * The row records who linked it as `staff:<email>`.
 */

const ID = /^[0-9a-f-]{36}$/i;

interface CustomerRow {
  id: string;
  business_name: string;
  stage?: CustomerStage;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!methodGuard(req, res, ['GET', 'POST', 'DELETE', 'PATCH'])) return;
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Groundswell is not available right now.' });
  const who = await resolveViewer(req);
  if (!who.ok) return res.status(who.status).json({ error: who.error });
  if (who.viewer.kind !== 'admin') return res.status(403).json({ error: 'Only New Wave staff can manage accounts here.' });
  const db = getSupabaseAdmin();
  const body = req.method === 'POST' || req.method === 'PATCH' ? readJsonBody(req) : {};
  const customerId = req.method === 'POST' ? (typeof body.customer === 'string' ? body.customer : '') : (queryParam(req, 'customer') ?? '');
  if (!customerId || !ID.test(customerId)) return res.status(400).json({ error: 'Which customer?' });

  if (req.method === 'PATCH') {
    if (!isCustomerStage(body.stage)) return res.status(400).json({ error: 'Which stage?' });
    const moved = await setStage(db, customerId, body.stage);
    if (!moved.ok) return res.status(moved.status).json({ error: moved.error });
    return res.status(200).json({ customer: moved.customer });
  }

  let found = await db.from('groundswell_customers').select('id,business_name,stage').eq('id', customerId).maybeSingle();
  if (found.error && missingColumn(found.error.message)) found = await db.from('groundswell_customers').select('id,business_name').eq('id', customerId).maybeSingle();
  if (found.error) {
    if (missingTable(found.error.message)) return res.status(503).json({ error: NOT_READY });
    console.error('Staff account customer read failed:', found.error.message);
    return res.status(500).json({ error: 'Could not load this customer.' });
  }
  const customer = found.data as unknown as CustomerRow | null;
  if (!customer) return res.status(404).json({ error: 'No such customer.' });

  const admin = await adminUser(req);
  return answerAccounts(req, res, {
    db,
    customer: { ...customer, stage: customer.stage ?? 'prospect' },
    linkedBy: admin?.email ? `staff:${admin.email}` : 'staff',
    returnUrl: `${SITE_URL}${GROUNDSWELL_ADMIN_CUSTOMERS_PATH}/${encodeURIComponent(customer.id)}`,
  });
}
