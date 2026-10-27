import type { SupabaseClient } from '@supabase/supabase-js';
import { PHASES, type Phase } from '../../../../src/lib/groundswellValidation.js';
import { HEADWAY_SERVICES, HEADWAY_SERVICE_INFO, type ChecklistItem, type HeadwayAction, type HeadwayPlanSummary, type HeadwayService } from '../../../../src/lib/headway.js';
import type { ClientAccountRow } from '../clientAccounts.js';
import { loadRunOutputs } from '../engine.js';
import type { Viewer } from '../workspace.js';
import { buildChecklist } from './checklist.js';
import { isSecretsConfigured } from './secrets.js';
import { planActions, type PlanResult } from './plan.js';
import { actionView, enabledServices, readActions, readPlans, readServices, readSetupRows, savePlan, summarizePlans } from './store.js';

/**
 * What the Headway panel shows for one customer, for its partner or New Wave
 * staff: the services (switched on or not), the setup checklist, the plans
 * and their actions, and which delivered run a new plan would come from.
 */

export interface HeadwayView {
  available: boolean;
  /** Whether logins can be stored (GROUNDSWELL_SECRETS_KEY is set). */
  secrets_available: boolean;
  /** Staff may switch services on and reveal stored logins; partners may not. */
  can_manage: boolean;
  services: { service: HeadwayService; label: string; does: string; enabled: boolean; granted_at: string | null }[];
  checklist: ChecklistItem[];
  plans: HeadwayPlanSummary[];
  actions: HeadwayAction[];
  /** The run a new plan would be built from, or why none can be. */
  source: { audit_id: string; phase: Phase; completed_at: string | null } | null;
  source_note: string;
}

export interface CustomerLite {
  id: string;
  partner_id: string | null;
  business_name: string;
  website: string | null;
  instagram: string | null;
  city: string | null;
}

type RunLite = { id: string; phase?: Phase | null; status: string; completed_at: string | null; created_at: string; source_audit_id?: string | null; partner_id: string | null };

/** The customer's delivered runs, newest first, a partner's own only. */
async function deliveredRuns(db: SupabaseClient, customer: CustomerLite, viewer: Viewer): Promise<RunLite[]> {
  const q = db.from('marketing_audits').select('id,phase,status,completed_at,created_at,source_audit_id,partner_id').eq('customer_id', customer.id).eq('status', 'done').order('created_at', { ascending: false }).limit(50);
  const read = await (viewer.kind === 'partner' ? q.eq('partner_id', viewer.partnerId) : q);
  if (read.error) {
    if (/column .* does not exist|42703/i.test(read.error.message)) return [];
    throw new Error(`Could not read the runs: ${read.error.message}`);
  }
  return ((read.data ?? []) as RunLite[]).filter((r) => r.status === 'done' && (viewer.kind === 'admin' || r.partner_id === viewer.partnerId)).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

/** The furthest delivered phase's newest run: what a plan is built from. */
export function chooseSource(runs: RunLite[]): RunLite | null {
  for (const phase of [...PHASES].reverse()) {
    const run = runs.find((r) => (r.phase ?? 'audit') === phase);
    if (run) return run;
  }
  return null;
}

export async function activeAccountsFor(db: SupabaseClient, customerId: string): Promise<ClientAccountRow[]> {
  const read = await db.from('groundswell_client_accounts').select('id,customer_id,service,composio_account_id,auth_config_id,user_id,status,status_reason,linked_by,linked_at,checked_at,created_at,updated_at').eq('customer_id', customerId);
  if (read.error) {
    if (/relation .* does not exist|42P01/i.test(read.error.message)) return [];
    throw new Error(`Could not read the linked accounts: ${read.error.message}`);
  }
  return (read.data ?? []) as unknown as ClientAccountRow[];
}

/** Throws 'NOT_READY' when the Headway tables are not there yet. */
export async function headwayView(db: SupabaseClient, customer: CustomerLite, viewer: Viewer): Promise<HeadwayView> {
  const [services, setupRows, plans, actions, accounts, runs] = await Promise.all([
    readServices(db, customer.id),
    readSetupRows(db, customer.id),
    readPlans(db, customer.id),
    readActions(db, customer.id),
    activeAccountsFor(db, customer.id),
    deliveredRuns(db, customer, viewer),
  ]);
  if (!services || !setupRows || !plans || !actions) throw new Error('NOT_READY');
  const enabled = enabledServices(services);
  const source = chooseSource(runs);
  const staff = viewer.kind === 'admin';
  return {
    available: true,
    secrets_available: isSecretsConfigured(),
    can_manage: staff,
    services: HEADWAY_SERVICES.map((s) => {
      const row = services.find((r) => r.service === s);
      return { service: s, label: HEADWAY_SERVICE_INFO[s].label, does: HEADWAY_SERVICE_INFO[s].does, enabled: Boolean(row?.enabled), granted_at: row?.enabled ? row.granted_at : null };
    }),
    checklist: buildChecklist(enabled, accounts, setupRows),
    // The open plan first, then the closed ones newest first.
    plans: summarizePlans([...plans].sort((a, b) => Number(b.status === 'open') - Number(a.status === 'open') || Date.parse(b.created_at) - Date.parse(a.created_at)), actions),
    actions: actions.map((a) => actionView(a, staff)),
    source: source ? { audit_id: source.id, phase: source.phase ?? 'audit', completed_at: source.completed_at } : null,
    source_note: source ? `A plan is built from the ${phaseName(source.phase ?? 'audit')} delivered ${when(source.completed_at ?? source.created_at)}.` : 'Nothing has been delivered for this customer yet, so there is nothing to plan from.',
  };
}

const phaseName = (phase: Phase) => (phase === 'audit' ? 'growth audit' : phase === 'competitors' ? 'competitor plan' : 'integrated plan');
const when = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/** Plans from the newest delivered run and saves the plan (the open one before it is closed). */
export async function planForCustomer(db: SupabaseClient, customer: CustomerLite, viewer: Viewer, by: string | null, now = new Date()): Promise<{ plan: PlanResult; audit_id: string | null }> {
  const [services, setupRows, accounts, runs] = await Promise.all([readServices(db, customer.id), readSetupRows(db, customer.id), activeAccountsFor(db, customer.id), deliveredRuns(db, customer, viewer)]);
  if (!services || !setupRows) throw new Error('NOT_READY');
  const enabled = enabledServices(services);
  const checklist = buildChecklist(enabled, accounts, setupRows);
  const source = chooseSource(runs);
  const outputs = source ? await loadRunOutputs(db, source.id, source.source_audit_id) : {};
  const measureSource = runs.find((r) => (r.phase ?? 'audit') === 'competitors')?.id ?? null;
  const plan = planActions({
    customer: { id: customer.id, business_name: customer.business_name, website: customer.website, instagram: customer.instagram, city: customer.city },
    audit: source ? { id: source.id, phase: source.phase ?? 'audit', completed_at: source.completed_at } : null,
    outputs,
    measureSource,
    enabled,
    checklist,
    now,
  });
  await savePlan(db, customer.id, source?.id ?? null, plan.summary, plan.drafts, by);
  return { plan, audit_id: source?.id ?? null };
}
