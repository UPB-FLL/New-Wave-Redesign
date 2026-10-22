import { isClientService, type CustomerStage } from '../../src/lib/groundswellValidation.js';
import { GROUNDSWELL_CUSTOMERS_PATH } from '../../src/groundswell/site.js';
import { accountsView, refreshClientAccounts, serviceOf, type ClientAccountRow } from '../_lib/groundswell/clientAccounts.js';
import { authConfigFor, clientUserId, createConnectionLink, deleteConnectedAccount, isComposioConfigured } from '../_lib/groundswell/composio.js';
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
 * answers 503; without Composio, linking answers 503.
 */

const COLUMNS = 'id,customer_id,service,composio_account_id,auth_config_id,user_id,status,status_reason,linked_by,linked_at,checked_at,created_at,updated_at';
const missingTable = (message: string | undefined) => /relation .* does not exist|42P01/i.test(message ?? '');
const missingColumn = (message: string | undefined) => /column .* does not exist|42703/i.test(message ?? '');
const NOT_READY = 'Linked accounts are not available yet. Try again later.';

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
  if (customer.stage !== 'client') return res.status(400).json({ error: 'Accounts can be linked once the business is a client.' });

  const rows = await db.from('groundswell_client_accounts').select(COLUMNS).eq('customer_id', customer.id);
  if (rows.error) {
    if (missingTable(rows.error.message)) return res.status(503).json({ error: NOT_READY });
    console.error('Client accounts read failed:', rows.error.message);
    return res.status(500).json({ error: 'Could not load the linked accounts.' });
  }
  const existing = (rows.data ?? []) as unknown as ClientAccountRow[];

  if (req.method === 'GET') {
    const refreshed = isComposioConfigured() ? await refreshClientAccounts(db, existing) : existing;
    return res.status(200).json({ accounts: accountsView(refreshed), available: isComposioConfigured() });
  }

  const service = req.method === 'POST' ? body.service : queryParam(req, 'service');
  if (!isClientService(service)) return res.status(400).json({ error: 'Which account?' });
  const current = existing.find((r) => r.service === service) ?? null;

  if (req.method === 'DELETE') {
    if (current) {
      try {
        await deleteConnectedAccount(current.composio_account_id);
      } catch (err) {
        console.error('Client account removal failed:', err instanceof Error ? err.message : err);
        return res.status(502).json({ error: 'Could not remove the connection right now. Try again in a minute.' });
      }
      const { error } = await db.from('groundswell_client_accounts').delete().eq('id', current.id);
      if (error) {
        console.error('Client account delete failed:', error.message);
        return res.status(500).json({ error: 'Could not forget the connection.' });
      }
    }
    return res.status(200).json({ accounts: accountsView(existing.filter((r) => r !== current)) });
  }

  // POST: start the sign-in for one service.
  if (!isComposioConfigured()) return res.status(503).json({ error: 'Account linking is not set up yet.' });
  const def = serviceOf(service);
  let config;
  try {
    config = await authConfigFor(def.toolkit);
  } catch (err) {
    console.error('Auth config lookup failed:', err instanceof Error ? err.message : err);
    return res.status(502).json({ error: 'Could not reach the sign-in service. Try again in a minute.' });
  }
  if (!config) return res.status(409).json({ error: `${def.label} cannot be linked yet. New Wave has to add it to the sign-in service first.` });

  if (current) {
    // A fresh sign-in replaces the old connection; a removal that fails is not worth stopping for.
    await deleteConnectedAccount(current.composio_account_id).catch((err) => console.error('Old client account removal failed:', err instanceof Error ? err.message : err));
  }
  let link;
  try {
    link = await createConnectionLink(config.id, clientUserId(customer.id), `${SITE_URL}${GROUNDSWELL_CUSTOMERS_PATH}/${encodeURIComponent(customer.id)}?linked=${service}`);
  } catch (err) {
    console.error('Connection link failed:', err instanceof Error ? err.message : err);
    return res.status(502).json({ error: 'Could not start the sign-in. Try again in a minute.' });
  }
  const row = {
    customer_id: customer.id,
    service,
    composio_account_id: link.connected_account_id,
    auth_config_id: config.id,
    user_id: clientUserId(customer.id),
    status: 'pending',
    status_reason: null,
    linked_by: partner.id,
    linked_at: null,
    checked_at: new Date().toISOString(),
  };
  const saved = await db.from('groundswell_client_accounts').upsert(row, { onConflict: 'customer_id,service' }).select(COLUMNS).single();
  if (saved.error || !saved.data) {
    console.error('Client account save failed:', saved.error?.message);
    return res.status(500).json({ error: 'Could not save the connection.' });
  }
  const next = [...existing.filter((r) => r.service !== service), saved.data as unknown as ClientAccountRow];
  return res.status(201).json({ redirect_url: link.redirect_url, accounts: accountsView(next) });
}
