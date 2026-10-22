import { isPhase } from '../../src/lib/groundswellValidation.js';
import { methodGuard, queryParam, rateLimit, readJsonBody, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { runWorkerInBackground } from '../_lib/groundswell/background.js';
import { autoStartEnabled } from '../_lib/groundswell/engine.js';
import { queuePhase } from '../_lib/groundswell/phases.js';
import { resolveViewer } from '../_lib/groundswell/viewer.js';
import { listCustomers, loadWorkspace, queueAudit } from '../_lib/groundswell/workspace.js';
import { getSupabaseAdmin, isSupabaseConfigured } from '../_lib/supabaseAdmin.js';
import { PARTNER_DAILY_LIMIT } from './partner-audits.js';

/**
 * /api/groundswell/workspace — a customer's three phases, for the partner who
 * owns it or a New Wave admin (api/_lib/groundswell/workspace.ts).
 *
 * GET ?customer=<id>: the customer, and for each phase its runs (progress,
 *   reports, files, the newest run's data) and whether it can start now.
 *   Someone else's customer and a missing one answer alike: 404.
 * GET (no customer, admins only): every customer with its partner and the
 *   newest run of each phase.
 * POST { customer, phase }: start a phase: phase 1 again from the saved
 *   details, or the next phase on the newest delivered run of the one before
 *   (phase 3 only for a client with a linked account). The heartbeat starts
 *   it (full auto); this call wakes the worker too.
 */

const ID = /^[0-9a-f-]{36}$/i;
const NOT_READY = 'Customers are not available yet. Try again later.';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const startedAt = Date.now();
  if (!methodGuard(req, res, ['GET', 'POST'])) return;
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Groundswell is not available right now.' });
  const who = await resolveViewer(req);
  if (!who.ok) return res.status(who.status).json({ error: who.error });
  const db = getSupabaseAdmin();

  if (req.method === 'GET') {
    const customer = queryParam(req, 'customer');
    if (!customer) {
      if (who.viewer.kind !== 'admin') return res.status(400).json({ error: 'Which customer?' });
      try {
        return res.status(200).json({ customers: await listCustomers(db) });
      } catch (err) {
        if (err instanceof Error && err.message === 'NOT_READY') return res.status(503).json({ error: NOT_READY });
        console.error('Groundswell customer list failed:', err);
        return res.status(500).json({ error: 'Could not load the customers.' });
      }
    }
    if (!ID.test(customer)) return res.status(404).json({ error: 'No such customer.' });
    try {
      const workspace = await loadWorkspace(db, customer, who.viewer);
      if (!workspace) return res.status(404).json({ error: 'No such customer.' });
      return res.status(200).json(workspace);
    } catch (err) {
      if (err instanceof Error && err.message === 'NOT_READY') return res.status(503).json({ error: NOT_READY });
      console.error('Groundswell workspace failed:', err);
      return res.status(500).json({ error: 'Could not load this customer.' });
    }
  }

  const body = readJsonBody(req);
  const customerId = typeof body.customer === 'string' ? body.customer : '';
  if (!ID.test(customerId) || !isPhase(body.phase)) return res.status(400).json({ error: 'Say which customer and which phase.' });
  if (who.partner && !rateLimit(`gs-partner-submit:${who.partner.id}`, PARTNER_DAILY_LIMIT, 24 * 60 * 60_000)) {
    return res.status(429).json({ error: `You can start up to ${PARTNER_DAILY_LIMIT} runs a day.` });
  }
  try {
    const workspace = await loadWorkspace(db, customerId, who.viewer);
    if (!workspace) return res.status(404).json({ error: 'No such customer.' });
    const phase = workspace.phases.find((p) => p.phase === body.phase)!;
    if (!phase.start.allowed) return res.status(409).json({ error: phase.start.reason });
    const result =
      body.phase === 'audit'
        ? await queueAudit(db, workspace.customer as Record<string, unknown> & { id: string; partner_id: string | null }, workspace.phases_available)
        : await queuePhase(db, phase.start.builds_on!, body.phase);
    if (!result.queued) return res.status(409).json({ error: result.reason });
    if (autoStartEnabled()) runWorkerInBackground(startedAt);
    return res.status(201).json({ queued: result.queued, reason: result.reason });
  } catch (err) {
    console.error('Groundswell could not start a phase:', err);
    return res.status(500).json({ error: 'Could not start that phase. Try again.' });
  }
}
