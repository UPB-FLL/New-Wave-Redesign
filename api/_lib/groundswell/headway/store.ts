import type { SupabaseClient } from '@supabase/supabase-js';
import { HEADWAY_SERVICES, type ActionStatus, type HeadwayAction, type HeadwayPlanSummary, type HeadwayService } from '../../../../src/lib/headway.js';

/**
 * Headway's rows (migration 20261101120000): which services a customer pays
 * for, its typed setup items, its plans and their actions. Every read is
 * scoped to one customer; the route decides who may ask. `null` from a read
 * means the table is not there yet (the route answers 503).
 */

export const missingTable = (m: string | undefined) => /relation .* does not exist|42P01/i.test(m ?? '');
export const NOT_READY = 'Headway is not set up in the database yet. Try again later.';

export interface ServiceRow {
  id: string;
  customer_id: string;
  service: HeadwayService;
  enabled: boolean;
  granted_by: string | null;
  granted_at: string;
  notes: string | null;
}

export interface SetupRow {
  id: string;
  customer_id: string;
  key: string;
  status: 'needed' | 'provided' | 'waived';
  value_encrypted: string | null;
  value_hint: string | null;
  notes: string | null;
  provided_by: string | null;
  provided_at: string | null;
  revealed_at: string | null;
  revealed_by: string | null;
}

export interface PlanRow {
  id: string;
  customer_id: string;
  audit_id: string | null;
  status: 'open' | 'closed';
  summary: string;
  created_by: string | null;
  created_at: string;
}

export type ActionRow = HeadwayAction & { payload: Record<string, unknown>; lease_until: string | null };

const SERVICE_COLUMNS = 'id,customer_id,service,enabled,granted_by,granted_at,notes';
const SETUP_COLUMNS = 'id,customer_id,key,status,value_encrypted,value_hint,notes,provided_by,provided_at,revealed_at,revealed_by';
const PLAN_COLUMNS = 'id,customer_id,audit_id,status,summary,created_by,created_at';
export const ACTION_COLUMNS = 'id,plan_id,customer_id,service,kind,tool,title,detail,payload,status,blocked_by,depends_on,scheduled_for,result,error,attempts,lease_until,approved_by,approved_at,applied_at,created_at';

type Db = Pick<SupabaseClient, 'from'>;

async function rows<T>(query: PromiseLike<{ data: unknown; error: { message: string } | null }>, what: string): Promise<T[] | null> {
  const result = await query;
  if (result.error) {
    if (missingTable(result.error.message)) return null;
    throw new Error(`Could not read ${what}: ${result.error.message}`);
  }
  return (result.data ?? []) as T[];
}

export const readServices = (db: Db, customerId: string) => rows<ServiceRow>(db.from('groundswell_customer_services').select(SERVICE_COLUMNS).eq('customer_id', customerId), 'the services');
export const readSetupRows = (db: Db, customerId: string) => rows<SetupRow>(db.from('groundswell_setup_items').select(SETUP_COLUMNS).eq('customer_id', customerId), 'the setup items');
export const readPlans = (db: Db, customerId: string) => rows<PlanRow>(db.from('groundswell_headway_plans').select(PLAN_COLUMNS).eq('customer_id', customerId).order('created_at', { ascending: false }).limit(20), 'the plans');
export const readActions = (db: Db, customerId: string) => rows<ActionRow>(db.from('groundswell_headway_actions').select(ACTION_COLUMNS).eq('customer_id', customerId).order('created_at', { ascending: true }).limit(500), 'the actions');

/** The services switched on for a customer, in catalogue order. */
export const enabledServices = (services: ServiceRow[]): HeadwayService[] => HEADWAY_SERVICES.filter((s) => services.some((r) => r.service === s && r.enabled));

/** Switches services on or off for a customer (an upsert per service named). */
export async function setServices(db: Db, customerId: string, wanted: Partial<Record<HeadwayService, boolean>>, by: string | null): Promise<void> {
  for (const service of HEADWAY_SERVICES) {
    const enabled = wanted[service];
    if (enabled === undefined) continue;
    const { error } = await db
      .from('groundswell_customer_services')
      .upsert({ customer_id: customerId, service, enabled, granted_by: by, granted_at: new Date().toISOString() }, { onConflict: 'customer_id,service' });
    if (error) throw new Error(missingTable(error.message) ? 'NOT_READY' : `Could not save the service: ${error.message}`);
  }
}

/** Writes one typed setup item: its state, an encrypted value (or null to leave the stored one), a hint and notes. */
export async function saveSetupItem(
  db: Db,
  customerId: string,
  item: { key: string; status: SetupRow['status']; value_encrypted?: string | null; value_hint?: string | null; notes?: string | null; by: string | null }
): Promise<SetupRow> {
  const existing = (await readSetupRows(db, customerId))?.find((r) => r.key === item.key) ?? null;
  const row = {
    customer_id: customerId,
    key: item.key,
    status: item.status,
    value_encrypted: item.value_encrypted === undefined ? (existing?.value_encrypted ?? null) : item.value_encrypted,
    value_hint: item.value_hint === undefined ? (existing?.value_hint ?? null) : item.value_hint,
    notes: item.notes === undefined ? (existing?.notes ?? null) : item.notes,
    provided_by: item.status === 'needed' ? null : (item.by ?? existing?.provided_by ?? null),
    provided_at: item.status === 'needed' ? null : (existing?.provided_at && item.value_encrypted === undefined ? existing.provided_at : new Date().toISOString()),
  };
  const saved = await db.from('groundswell_setup_items').upsert(row, { onConflict: 'customer_id,key' }).select(SETUP_COLUMNS).single();
  if (saved.error || !saved.data) throw new Error(missingTable(saved.error?.message) ? 'NOT_READY' : `Could not save the setup item: ${saved.error?.message ?? 'no row'}`);
  return saved.data as unknown as SetupRow;
}

export async function recordReveal(db: Db, rowId: string, by: string | null): Promise<void> {
  const { error } = await db.from('groundswell_setup_items').update({ revealed_at: new Date().toISOString(), revealed_by: by }).eq('id', rowId);
  if (error) throw new Error(`Could not record the reveal: ${error.message}`);
}

export interface ActionDraft {
  service: HeadwayService;
  kind: HeadwayAction['kind'];
  tool: HeadwayAction['tool'];
  title: string;
  detail: string;
  payload: Record<string, unknown>;
  blocked_by: string[];
  scheduled_for: string | null;
  /** The index, within the same draft list, of the action this one waits on. */
  depends_on_index?: number;
}

/** Closes the customer's open plans (their undone actions are declined) and saves a new one with its actions. */
export async function savePlan(db: Db, customerId: string, auditId: string | null, summary: string, drafts: ActionDraft[], by: string | null): Promise<PlanRow> {
  const open = (await readPlans(db, customerId))?.filter((p) => p.status === 'open') ?? [];
  for (const plan of open) {
    const closed = await db.from('groundswell_headway_plans').update({ status: 'closed' }).eq('id', plan.id);
    if (closed.error) throw new Error(`Could not close the earlier plan: ${closed.error.message}`);
    const declined = await db.from('groundswell_headway_actions').update({ status: 'declined', error: 'Superseded by a newer plan.' }).eq('plan_id', plan.id).in('status', ['proposed', 'approved']);
    if (declined.error) throw new Error(`Could not retire the earlier plan's actions: ${declined.error.message}`);
  }
  const inserted = await db.from('groundswell_headway_plans').insert({ customer_id: customerId, audit_id: auditId, status: 'open', summary, created_by: by }).select(PLAN_COLUMNS).single();
  if (inserted.error || !inserted.data) throw new Error(missingTable(inserted.error?.message) ? 'NOT_READY' : `Could not save the plan: ${inserted.error?.message ?? 'no row'}`);
  const plan = inserted.data as unknown as PlanRow;
  const ids: string[] = [];
  for (const draft of drafts) {
    const { depends_on_index, ...rest } = draft;
    const row = { ...rest, plan_id: plan.id, customer_id: customerId, status: 'proposed', depends_on: depends_on_index === undefined ? null : (ids[depends_on_index] ?? null), attempts: 0 };
    const saved = await db.from('groundswell_headway_actions').insert(row).select('id').single();
    if (saved.error || !saved.data) throw new Error(`Could not save an action: ${saved.error?.message ?? 'no row'}`);
    ids.push((saved.data as { id: string }).id);
  }
  return plan;
}

/** A plan with how many of its actions are in each state. */
export function summarizePlans(plans: PlanRow[], actions: ActionRow[]): HeadwayPlanSummary[] {
  return plans.map((p) => {
    const counts = Object.fromEntries(['proposed', 'approved', 'applying', 'applied', 'failed', 'declined', 'done'].map((s) => [s, 0])) as Record<ActionStatus, number>;
    for (const a of actions) if (a.plan_id === p.id) counts[a.status] = (counts[a.status] ?? 0) + 1;
    return { id: p.id, customer_id: p.customer_id, audit_id: p.audit_id, status: p.status, summary: p.summary, created_at: p.created_at, counts };
  });
}

/** What a partner or staff member sees of an action: never the payload (a login could sit in a brief's notes), and error text for staff only. */
export function actionView(a: ActionRow, staff: boolean): HeadwayAction {
  const rest: Record<string, unknown> = { ...a };
  delete rest.payload;
  delete rest.lease_until;
  return { ...(rest as unknown as HeadwayAction), blocked_by: Array.isArray(a.blocked_by) ? a.blocked_by : [], error: staff ? a.error : a.error ? 'This action did not go through. We have been notified.' : null };
}
