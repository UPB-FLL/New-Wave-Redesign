import { findSetupItem, isHeadwayService, isSettableSetupStatus, valueHint, type HeadwayService } from '../../src/lib/headway.js';
import { adminUser } from '../_lib/adminKey.js';
import { applyHeadwayInBackground } from '../_lib/groundswell/background.js';
import { encryptSecret, decryptSecret, isSecretsConfigured } from '../_lib/groundswell/headway/secrets.js';
import { NOT_READY, readActions, readSetupRows, recordReveal, saveSetupItem, setServices, missingTable } from '../_lib/groundswell/headway/store.js';
import { headwayView, planForCustomer, type CustomerLite } from '../_lib/groundswell/headway/view.js';
import { resolveViewer } from '../_lib/groundswell/viewer.js';
import type { Viewer } from '../_lib/groundswell/workspace.js';
import { methodGuard, queryParam, readJsonBody, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { getSupabaseAdmin, isSupabaseConfigured } from '../_lib/supabaseAdmin.js';

/**
 * /api/groundswell/headway — Headway, the implementation service, for one
 * customer: the partner who owns it, or a New Wave admin (the same two doors
 * as the workspace).
 *
 * GET ?customer=<id>: the services switched on, the setup checklist, the
 *   plans and their actions (api/_lib/groundswell/headway/view.ts).
 * GET ?customer=&reveal=<key> (staff only): a stored login, once, recorded.
 * PATCH { customer, services: { 'social-media': true, … } } (staff only):
 *   what the customer pays for.
 * PUT { customer, item, status, value?, notes? }: a typed setup item
 *   (an id in clear, a login encrypted, an access recorded). Linked
 *   accounts go through the accounts card, not here.
 * POST { customer, action: 'plan' }: a new plan from the newest delivered
 *   run (the open plan before it is closed).
 * POST { customer, action: 'approve' | 'decline' | 'done' | 'retry', ids }:
 *   moves actions. Approving an automatic action lets the worker apply it
 *   (now, and the heartbeat); a brief is marked done by hand.
 *
 * Nothing here runs a provider tool: the worker does, as the client's own
 * linked account, after the approval.
 */

const ID = /^[0-9a-f-]{36}$/i;

async function readCustomer(db: ReturnType<typeof getSupabaseAdmin>, id: string, viewer: Viewer): Promise<CustomerLite | null | 'NOT_READY'> {
  const q = db.from('groundswell_customers').select('id,partner_id,business_name,website,instagram,city').eq('id', id);
  const read = await (viewer.kind === 'partner' ? q.eq('partner_id', viewer.partnerId) : q).maybeSingle();
  if (read.error) return missingTable(read.error.message) ? 'NOT_READY' : null;
  const row = read.data as unknown as CustomerLite | null;
  if (!row || (viewer.kind === 'partner' && row.partner_id !== viewer.partnerId)) return null;
  return row;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const startedAt = Date.now();
  if (!methodGuard(req, res, ['GET', 'POST', 'PUT', 'PATCH'])) return;
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Groundswell is not available right now.' });
  const who = await resolveViewer(req);
  if (!who.ok) return res.status(who.status).json({ error: who.error });
  const db = getSupabaseAdmin();
  const body = req.method === 'GET' ? {} : readJsonBody(req);
  const customerId = req.method === 'GET' ? (queryParam(req, 'customer') ?? '') : typeof body.customer === 'string' ? body.customer : '';
  if (!ID.test(customerId)) return res.status(400).json({ error: 'Which customer?' });
  const customer = await readCustomer(db, customerId, who.viewer);
  if (customer === 'NOT_READY') return res.status(503).json({ error: 'Customers are not available yet. Try again later.' });
  if (!customer) return res.status(404).json({ error: 'No such customer.' });
  const staff = who.viewer.kind === 'admin';
  const by = staff ? `staff:${(await adminUser(req))?.email ?? 'staff'}` : `partner:${who.partner?.id ?? ''}`;

  const answer = async (status = 200) => {
    try {
      return res.status(status).json(await headwayView(db, customer, who.viewer));
    } catch (err) {
      if (err instanceof Error && err.message === 'NOT_READY') return res.status(503).json({ error: NOT_READY });
      console.error('Headway view failed:', err);
      return res.status(500).json({ error: 'Could not load Headway for this customer.' });
    }
  };

  try {
    if (req.method === 'GET') {
      const reveal = queryParam(req, 'reveal');
      if (!reveal) return answer();
      if (!staff) return res.status(403).json({ error: 'Only New Wave staff can see a stored login.' });
      const rows = await readSetupRows(db, customer.id);
      if (!rows) return res.status(503).json({ error: NOT_READY });
      const row = rows.find((r) => r.key === reveal);
      if (!row?.value_encrypted) return res.status(404).json({ error: 'Nothing is stored for that item.' });
      if (!isSecretsConfigured()) return res.status(503).json({ error: 'GROUNDSWELL_SECRETS_KEY is not set, so the stored value cannot be read.' });
      const value = decryptSecret(row.value_encrypted);
      await recordReveal(db, row.id, by);
      return res.status(200).json({ key: row.key, value });
    }

    if (req.method === 'PATCH') {
      if (!staff) return res.status(403).json({ error: 'Only New Wave staff can switch services on or off.' });
      const wanted = body.services && typeof body.services === 'object' ? (body.services as Record<string, unknown>) : null;
      if (!wanted) return res.status(400).json({ error: 'Say which services.' });
      const patch: Partial<Record<HeadwayService, boolean>> = {};
      for (const [key, value] of Object.entries(wanted)) {
        if (!isHeadwayService(key) || typeof value !== 'boolean') return res.status(400).json({ error: `Unknown service: ${key}.` });
        patch[key] = value;
      }
      await setServices(db, customer.id, patch, by);
      return answer();
    }

    if (req.method === 'PUT') {
      const def = typeof body.item === 'string' ? findSetupItem(body.item) : undefined;
      if (!def) return res.status(400).json({ error: 'Which setup item?' });
      if (def.kind === 'link') return res.status(400).json({ error: 'Linked accounts are signed in from the accounts card.' });
      const status = isSettableSetupStatus(body.status) ? body.status : 'provided';
      const value = typeof body.value === 'string' ? body.value.trim() : '';
      const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 1000) || null : undefined;
      if (status === 'provided' && def.kind !== 'access' && !value) return res.status(400).json({ error: `Add the ${def.label.toLowerCase()}.` });
      if (value.length > 4000) return res.status(400).json({ error: 'That value is too long.' });
      let stored: { value_encrypted?: string | null; value_hint?: string | null } = {};
      if (status !== 'provided') stored = { value_encrypted: null, value_hint: null };
      else if (def.kind === 'id') stored = { value_encrypted: null, value_hint: value };
      else if (def.kind === 'secret') {
        if (!isSecretsConfigured()) return res.status(503).json({ error: 'Logins cannot be stored until GROUNDSWELL_SECRETS_KEY is set in Vercel. Link the account instead, or keep the login outside the app.' });
        stored = { value_encrypted: encryptSecret(value), value_hint: valueHint(value) };
      }
      await saveSetupItem(db, customer.id, { key: def.key, status, ...stored, notes, by });
      return answer();
    }

    // POST
    const action = typeof body.action === 'string' ? body.action : '';
    if (action === 'plan') {
      await planForCustomer(db, customer, who.viewer, by);
      return answer(201);
    }
    if (!['approve', 'decline', 'done', 'retry'].includes(action)) return res.status(400).json({ error: 'Say what to do: plan, approve, decline, done or retry.' });
    const ids = Array.isArray(body.ids) ? body.ids.filter((x: unknown): x is string => typeof x === 'string' && /^[\w-]{1,64}$/.test(x)) : [];
    if (!ids.length) return res.status(400).json({ error: 'Say which actions.' });
    const actions = await readActions(db, customer.id);
    if (!actions) return res.status(503).json({ error: NOT_READY });
    const now = new Date().toISOString();
    let moved = 0;
    for (const id of ids) {
      const row = actions.find((a) => a.id === id);
      if (!row) continue;
      let patch: Record<string, unknown> | null = null;
      if (action === 'approve' && row.status === 'proposed') patch = { status: 'approved', approved_by: by, approved_at: now, error: null };
      else if (action === 'decline' && (row.status === 'proposed' || row.status === 'approved' || row.status === 'failed')) patch = { status: 'declined' };
      else if (action === 'done' && row.kind === 'handoff' && (row.status === 'proposed' || row.status === 'approved')) patch = { status: 'done', approved_by: row.approved_by ?? by, approved_at: row.approved_at ?? now, applied_at: now };
      else if (action === 'retry' && row.status === 'failed') patch = { status: 'approved', approved_by: by, approved_at: now, error: null, attempts: 0 };
      if (!patch) continue;
      const { error } = await db.from('groundswell_headway_actions').update(patch).eq('id', id).eq('status', row.status);
      if (error) throw new Error(`Could not update the action: ${error.message}`);
      moved += 1;
    }
    if (moved && (action === 'approve' || action === 'retry')) applyHeadwayInBackground(startedAt);
    return answer();
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_READY') return res.status(503).json({ error: NOT_READY });
    console.error('Headway request failed:', err);
    return res.status(500).json({ error: 'Something went wrong; try again.' });
  }
}
