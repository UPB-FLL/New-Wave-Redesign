import type { SupabaseClient } from '@supabase/supabase-js';
import { isClientService, type ClientService, type CustomerStage } from '../../../src/lib/groundswellValidation.js';
import { accountsView, refreshClientAccounts, serviceOf, type ClientAccountRow } from './clientAccounts.js';
import { authConfigFor, clientUserId, createConnectionLink, deleteConnectedAccount, isComposioConfigured } from './composio.js';
import type { ApiRequest, ApiResponse } from '../http.js';
import { queryParam, readJsonBody } from '../http.js';

/**
 * Linking a client's accounts (groundswell_client_accounts, migration
 * 20261028120000) through Composio's hosted sign-in, shared by the partner
 * route (api/groundswell/partner-accounts.ts, scoped to the partner's own
 * clients) and the staff route (api/groundswell/accounts.ts, any customer,
 * New Wave's own included). The caller resolves who is asking and which
 * customer; this module answers the request.
 */

export const ACCOUNT_COLUMNS = 'id,customer_id,service,composio_account_id,auth_config_id,user_id,status,status_reason,linked_by,linked_at,checked_at,created_at,updated_at';
export const missingTable = (message: string | undefined) => /relation .* does not exist|42P01/i.test(message ?? '');
export const missingColumn = (message: string | undefined) => /column .* does not exist|42703/i.test(message ?? '');
export const NOT_READY = 'Linked accounts are not available yet. Try again later.';

export interface LinkableCustomer {
  id: string;
  business_name: string;
  stage?: CustomerStage;
}

/** The customer's rows; `null` when the table is not there yet (the route answers 503). */
export async function readAccountRows(db: SupabaseClient, customerId: string): Promise<ClientAccountRow[] | null> {
  const rows = await db.from('groundswell_client_accounts').select(ACCOUNT_COLUMNS).eq('customer_id', customerId);
  if (rows.error) {
    if (missingTable(rows.error.message)) return null;
    throw new Error(`Client accounts read failed: ${rows.error.message}`);
  }
  return (rows.data ?? []) as unknown as ClientAccountRow[];
}

/** The service named by a POST body or a `service` query parameter. */
export function requestedService(req: ApiRequest): ClientService | null {
  const body = req.method === 'POST' ? readJsonBody(req) : {};
  const service = req.method === 'POST' ? body.service : queryParam(req, 'service');
  return isClientService(service) ? service : null;
}

/**
 * Answers GET (every service with its state), POST (start a sign-in, the
 * browser coming back to `returnUrl?linked=<service>`) and DELETE (remove the
 * connection) for one customer. `linkedBy` is recorded on the row: a partner's
 * id, or `staff:<email>` for New Wave.
 */
export async function answerAccounts(
  req: ApiRequest,
  res: ApiResponse,
  opts: { db: SupabaseClient; customer: LinkableCustomer; linkedBy: string | null; returnUrl: string }
): Promise<void> {
  const { db, customer } = opts;
  if (customer.stage !== 'client') {
    res.status(400).json({ error: 'Accounts can be linked once the business is a client.' });
    return;
  }
  let existing: ClientAccountRow[] | null;
  try {
    existing = await readAccountRows(db, customer.id);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Could not load the linked accounts.' });
    return;
  }
  if (!existing) {
    res.status(503).json({ error: NOT_READY });
    return;
  }

  if (req.method === 'GET') {
    const refreshed = isComposioConfigured() ? await refreshClientAccounts(db, existing) : existing;
    res.status(200).json({ accounts: accountsView(refreshed), available: isComposioConfigured() });
    return;
  }

  const service = requestedService(req);
  if (!service) {
    res.status(400).json({ error: 'Which account?' });
    return;
  }
  const current = existing.find((r) => r.service === service) ?? null;

  if (req.method === 'DELETE') {
    if (current) {
      try {
        await deleteConnectedAccount(current.composio_account_id);
      } catch (err) {
        console.error('Client account removal failed:', err instanceof Error ? err.message : err);
        res.status(502).json({ error: 'Could not remove the connection right now. Try again in a minute.' });
        return;
      }
      const { error } = await db.from('groundswell_client_accounts').delete().eq('id', current.id);
      if (error) {
        console.error('Client account delete failed:', error.message);
        res.status(500).json({ error: 'Could not forget the connection.' });
        return;
      }
    }
    res.status(200).json({ accounts: accountsView(existing.filter((r) => r !== current)) });
    return;
  }

  // POST: start the sign-in for one service.
  if (!isComposioConfigured()) {
    res.status(503).json({ error: 'Account linking is not set up yet.' });
    return;
  }
  const def = serviceOf(service);
  let config;
  try {
    config = await authConfigFor(def.toolkit);
  } catch (err) {
    console.error('Auth config lookup failed:', err instanceof Error ? err.message : err);
    res.status(502).json({ error: 'Could not reach the sign-in service. Try again in a minute.' });
    return;
  }
  if (!config) {
    res.status(409).json({ error: `${def.label} cannot be linked yet. New Wave has to add it to the sign-in service first.` });
    return;
  }

  if (current) {
    // A fresh sign-in replaces the old connection; a removal that fails is not worth stopping for.
    await deleteConnectedAccount(current.composio_account_id).catch((err) => console.error('Old client account removal failed:', err instanceof Error ? err.message : err));
  }
  let link;
  try {
    link = await createConnectionLink(config.id, clientUserId(customer.id), `${opts.returnUrl}?linked=${service}`);
  } catch (err) {
    console.error('Connection link failed:', err instanceof Error ? err.message : err);
    res.status(502).json({ error: 'Could not start the sign-in. Try again in a minute.' });
    return;
  }
  const row = {
    customer_id: customer.id,
    service,
    composio_account_id: link.connected_account_id,
    auth_config_id: config.id,
    user_id: clientUserId(customer.id),
    status: 'pending',
    status_reason: null,
    linked_by: opts.linkedBy,
    linked_at: null,
    checked_at: new Date().toISOString(),
  };
  const saved = await db.from('groundswell_client_accounts').upsert(row, { onConflict: 'customer_id,service' }).select(ACCOUNT_COLUMNS).single();
  if (saved.error || !saved.data) {
    console.error('Client account save failed:', saved.error?.message);
    res.status(500).json({ error: 'Could not save the connection.' });
    return;
  }
  const next = [...existing.filter((r) => r.service !== service), saved.data as unknown as ClientAccountRow];
  res.status(201).json({ redirect_url: link.redirect_url, accounts: accountsView(next) });
}

/** Moves a customer between the stages ("Became a client" sets the date; moving back clears it). */
export async function setStage(db: SupabaseClient, customerId: string, stage: CustomerStage): Promise<{ ok: true; customer: Record<string, unknown> } | { ok: false; status: 500 | 503; error: string }> {
  const patch = stage === 'client' ? { stage: 'client', became_client_at: new Date().toISOString() } : { stage: 'prospect', became_client_at: null };
  const { data, error } = await db.from('groundswell_customers').update(patch).eq('id', customerId).select('id,business_name,stage,became_client_at').single();
  if (error || !data) {
    if (missingColumn(error?.message)) return { ok: false, status: 503, error: 'Stages are not available yet. Try again later.' };
    console.error('Customer stage update failed:', error?.message);
    return { ok: false, status: 500, error: 'Could not change the stage.' };
  }
  return { ok: true, customer: data as Record<string, unknown> };
}
