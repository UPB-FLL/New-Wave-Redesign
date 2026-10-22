import type { CustomerStage } from '../../src/lib/groundswellValidation.js';
import { GROUNDSWELL_CUSTOMERS_PATH } from '../../src/groundswell/site.js';
import { answerAccounts, missingColumn, missingTable, NOT_READY } from '../_lib/groundswell/accountLinking.js';
import { requirePartner, SITE_URL } from '../_lib/groundswell/partners.js';
import { methodGuard, queryParam, readJsonBody, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { getSupabaseAdmin, isSupabaseConfigured } from '../_lib/supabaseAdmin.js';

/**
 * /api/groundswell/partner-accounts — the accounts a partner links for one
 * of its clients (groundswell_client_accounts, migration 20261028120000),
 * through Composio's hosted connect flow under the user id
 * `client:<customer id>`. Only a client (stage) can have accounts; a
 * prospect's audit reads public data.
 *
 * GET `?customer=`: every service with its state (linked or not), after
 *   asking Composio about the pending ones and the active ones not checked
 *   lately.
 * POST `{ customer, service }`: starts the sign-in. Answers the Composio
 *   page to send the browser to; Composio brings it back to the client's
 *   page with `?linked=<service>`. A service already linked is replaced.
 * DELETE `?customer=&service=`: removes the connection in Composio (revoking
 *   it at the provider) and forgets it.
 *
 * Every read and write is scoped to the partner. Without the table the route
 * answers 503; without Composio, linking answers 503. The answers themselves
 * live in api/_lib/groundswell/accountLinking.ts, shared with the staff route.
 */

interface CustomerRow {
  id: string;
  business_name: string;
  stage?: CustomerStage;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!methodGuard(req, res, ['GET', 'POST', 'DELETE'])) return;
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'The partner portal is not available right now.' });
  const partner = await requirePartner(req, res);
  if (!partner) return;
  const db = getSupabaseAdmin();
  const body = req.method === 'POST' ? readJsonBody(req) : {};
  const customerId = req.method === 'POST' ? (typeof body.customer === 'string' ? body.customer : '') : (queryParam(req, 'customer') ?? '');
  if (!customerId) return res.status(400).json({ error: 'Which customer?' });

  const found = await db.from('groundswell_customers').select('id,business_name,stage').eq('partner_id', partner.id).eq('id', customerId).maybeSingle();
  if (found.error) {
    if (missingTable(found.error.message) || missingColumn(found.error.message)) return res.status(503).json({ error: NOT_READY });
    console.error('Client account customer read failed:', found.error.message);
    return res.status(500).json({ error: 'Could not load this customer.' });
  }
  const customer = found.data as unknown as CustomerRow | null;
  if (!customer) return res.status(404).json({ error: 'That customer is not in your account.' });

  return answerAccounts(req, res, { db, customer, linkedBy: partner.id, returnUrl: `${SITE_URL}${GROUNDSWELL_CUSTOMERS_PATH}/${encodeURIComponent(customer.id)}` });
}
