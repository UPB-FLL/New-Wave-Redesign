import type { SupabaseClient } from '@supabase/supabase-js';
import { nextPhase, PHASE_INFO, PHASES, type Phase } from '../../../src/lib/groundswellValidation.js';
import type { AuditCompetitor, AuditRow } from './types.js';

/**
 * Groundswell's phases as runs (migration 20261029120000). Each phase is a
 * marketing_audits row of its own, queued with the business's details copied
 * from the run it builds on (source_audit_id); the engine reads that run's
 * outputs as the start of the new one (engine.ts, loadSteps).
 *
 * - Phase 1 (audit) delivering queues phase 2 (competitors).
 * - Phase 2 delivering queues phase 3 (integrated) when the customer is a
 *   client with at least one active linked account; otherwise phase 3 waits
 *   for a person to start it once an account is linked.
 * - A phase already queued or running for the same source is never queued
 *   twice.
 */

export interface QueueResult {
  /** The run queued (or the one already waiting); null when nothing was queued. */
  queued: string | null;
  phase: Phase | null;
  /** Why, in words a partner or staff member can act on. */
  reason: string;
}

const COPY_COLUMNS = 'id,business_name,city,website,instagram,facebook,competitors,notes,partner_id,customer_id,requested_by,brand_logo_url,brand_color,status,phase';
const missingColumn = (message: string | undefined) => /column .* does not exist|42703/i.test(message ?? '');
const missingTable = (message: string | undefined) => /relation .* does not exist|42P01/i.test(message ?? '');
const NOT_READY = 'Phases are not set up yet. Try again later.';

/** Phase 3's precondition: the customer is a client with at least one active linked account. */
export async function integratedReady(db: Pick<SupabaseClient, 'from'>, customerId: string | null | undefined): Promise<{ ok: boolean; reason: string }> {
  if (!customerId) return { ok: false, reason: `${PHASE_INFO.integrated.title} needs a customer record with linked accounts.` };
  const customer = await db.from('groundswell_customers').select('id,stage').eq('id', customerId).maybeSingle();
  if (customer.error) {
    if (missingColumn(customer.error.message) || missingTable(customer.error.message)) return { ok: false, reason: 'Clients are not set up yet.' };
    throw new Error(`Could not read the customer: ${customer.error.message}`);
  }
  if ((customer.data as { stage?: string } | null)?.stage !== 'client') return { ok: false, reason: `${PHASE_INFO.integrated.title} is for clients: mark the business as a client first.` };
  const accounts = await db.from('groundswell_client_accounts').select('id').eq('customer_id', customerId).eq('status', 'active').limit(1);
  if (accounts.error) {
    if (missingTable(accounts.error.message)) return { ok: false, reason: 'Account linking is not set up yet.' };
    throw new Error(`Could not read the linked accounts: ${accounts.error.message}`);
  }
  if (!((accounts.data ?? []) as unknown[]).length) return { ok: false, reason: 'No linked account yet: link at least one of the client’s accounts first.' };
  return { ok: true, reason: '' };
}

/**
 * Queues `phase` building on `sourceId`, which must be a delivered run of the
 * phase before it. The run already queued or running for the same source is
 * returned instead of a second one.
 */
export async function queuePhase(db: Pick<SupabaseClient, 'from'>, sourceId: string, phase: Phase): Promise<QueueResult> {
  const read = await db.from('marketing_audits').select(COPY_COLUMNS).eq('id', sourceId).maybeSingle();
  if (read.error) {
    if (missingColumn(read.error.message)) return { queued: null, phase, reason: NOT_READY };
    throw new Error(`Could not read the run to build on: ${read.error.message}`);
  }
  const source = read.data as unknown as (Record<string, unknown> & { id: string; status: string; phase?: Phase; customer_id?: string | null }) | null;
  if (!source) return { queued: null, phase, reason: 'That run is not there.' };
  const before = PHASES[PHASES.indexOf(phase) - 1];
  if (nextPhase(source.phase ?? 'audit') !== phase) {
    return { queued: null, phase, reason: before ? `${PHASE_INFO[phase].title} builds on ${PHASE_INFO[before].title.toLowerCase()}.` : `${PHASE_INFO[phase].title} starts from the business’s public data.` };
  }
  if (source.status !== 'done') return { queued: null, phase, reason: `${PHASE_INFO[before].title} has not delivered yet.` };

  const waiting = await db.from('marketing_audits').select('id,status').eq('source_audit_id', sourceId).eq('phase', phase);
  if (waiting.error) throw new Error(`Could not check the queue: ${waiting.error.message}`);
  const open = ((waiting.data ?? []) as { id: string; status: string }[]).find((r) => r.status === 'queued' || r.status === 'running');
  if (open) return { queued: open.id, phase, reason: `${PHASE_INFO[phase].title} is already ${open.status}.` };

  if (phase === 'integrated') {
    const ready = await integratedReady(db, source.customer_id);
    if (!ready.ok) return { queued: null, phase, reason: ready.reason };
  }

  const row = {
    business_name: source.business_name,
    city: source.city ?? null,
    website: source.website ?? null,
    instagram: source.instagram ?? null,
    ...(source.facebook ? { facebook: source.facebook } : {}),
    competitors: source.competitors ?? [],
    notes: source.notes ?? null,
    partner_id: source.partner_id ?? null,
    customer_id: source.customer_id ?? null,
    requested_by: source.requested_by ?? null,
    brand_logo_url: source.brand_logo_url ?? null,
    brand_color: source.brand_color ?? null,
    kind: 'audit',
    phase,
    source_audit_id: sourceId,
    status: 'queued',
  };
  const inserted = await db.from('marketing_audits').insert(row).select('id').single();
  if (inserted.error || !inserted.data) {
    if (missingColumn(inserted.error?.message)) return { queued: null, phase, reason: NOT_READY };
    throw new Error(`Could not queue ${PHASE_INFO[phase].title.toLowerCase()}: ${inserted.error?.message ?? 'no row'}`);
  }
  return { queued: (inserted.data as { id: string }).id, phase, reason: `${PHASE_INFO[phase].title} queued.` };
}

/**
 * Queues a fresh phase 1 run for a customer from its saved details: the
 * public data read again (rankings, the listing, estimated traffic), which is
 * how a plan is measured when no account is linked. A phase 1 run already
 * queued or running for the customer is returned instead of a second one.
 */
export async function queuePublicReread(db: Pick<SupabaseClient, 'from'>, customerId: string, options: { competitors?: AuditCompetitor[] } = {}): Promise<QueueResult> {
  const read = await db.from('groundswell_customers').select('id,partner_id,business_name,city,website,instagram,facebook,competitors,notes').eq('id', customerId).maybeSingle();
  if (read.error) {
    if (missingColumn(read.error.message) || missingTable(read.error.message)) return { queued: null, phase: 'audit', reason: 'Customers are not set up yet.' };
    throw new Error(`Could not read the customer: ${read.error.message}`);
  }
  const customer = read.data as unknown as (Record<string, unknown> & { id: string; partner_id: string | null }) | null;
  if (!customer) return { queued: null, phase: 'audit', reason: 'That customer is not there.' };
  const waiting = await db.from('marketing_audits').select('id,status,phase').eq('customer_id', customerId);
  if (waiting.error) throw new Error(`Could not check the queue: ${waiting.error.message}`);
  const open = ((waiting.data ?? []) as { id: string; status: string; phase?: Phase | null }[]).find((r) => (r.phase ?? 'audit') === 'audit' && (r.status === 'queued' || r.status === 'running'));
  if (open) return { queued: open.id, phase: 'audit', reason: `${PHASE_INFO.audit.title} is already ${open.status}.` };
  const row = {
    business_name: customer.business_name,
    city: customer.city ?? null,
    website: customer.website ?? null,
    instagram: customer.instagram ?? null,
    ...(customer.facebook ? { facebook: customer.facebook } : {}),
    competitors: options.competitors ?? customer.competitors ?? [],
    notes: customer.notes ?? null,
    partner_id: customer.partner_id ?? null,
    customer_id: customer.id,
    kind: 'audit',
    phase: 'audit',
    source_audit_id: null,
    status: 'queued',
  };
  const inserted = await db.from('marketing_audits').insert(row).select('id').single();
  if (inserted.error || !inserted.data) {
    if (missingColumn(inserted.error?.message)) return { queued: null, phase: 'audit', reason: NOT_READY };
    throw new Error(`Could not queue the public re-read: ${inserted.error?.message ?? 'no row'}`);
  }
  return { queued: (inserted.data as { id: string }).id, phase: 'audit', reason: `${PHASE_INFO.audit.title} queued from today’s public data.` };
}

/** After a run delivers: queues the phase after it when that phase applies. Never throws; the reason says what happened. */
export async function queueNextPhase(db: Pick<SupabaseClient, 'from'>, run: Pick<AuditRow, 'id' | 'phase' | 'customer_id'>): Promise<QueueResult> {
  const next = nextPhase(run.phase ?? 'audit');
  if (!next) return { queued: null, phase: null, reason: 'This was the last phase.' };
  try {
    return await queuePhase(db, run.id, next);
  } catch (err) {
    return { queued: null, phase: next, reason: (err instanceof Error ? err.message : String(err)).slice(0, 300) };
  }
}
