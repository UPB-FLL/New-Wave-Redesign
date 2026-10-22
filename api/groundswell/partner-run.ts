import { buildAuditInsert } from '../../src/lib/groundswellValidation.js';
import { runWorkerInBackground } from '../_lib/groundswell/background.js';
import { DEFAULT_DAILY_RUNS, startAudit, type StartResult } from '../_lib/groundswell/engine.js';
import { notifyNewPartnerAudit, requirePartner } from '../_lib/groundswell/partners.js';
import { BENCHMARK_STEPS, STEPS } from '../_lib/groundswell/steps.js';
import { methodGuard, rateLimit, readJsonBody, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { getSupabaseAdmin, isSupabaseConfigured } from '../_lib/supabaseAdmin.js';
import { PARTNER_DAILY_LIMIT } from './partner-audits.js';
import {
  activeSteps,
  AUDIT_COLUMNS,
  BENCHMARK_COLUMNS,
  CUSTOMER_COLUMNS,
  draftFrom,
  missingColumn,
  missingTable,
  NOT_READY,
  partnerAudits,
  summarize,
  withSteps,
  type AuditRow,
  type CustomerRow,
} from './partner-customers.js';
import { missingSetup } from './run.js';

/**
 * POST /api/groundswell/partner-run — "Run audit" on a partner's customer page.
 *
 * Body: { customer_id, kind?: 'audit' | 'benchmark', brand_logo_url?, brand_color? }.
 * The customer's newest audit decides what happens: queued, it is started;
 * running, nothing (409); finished or failed (or none yet), a fresh audit is
 * queued from the customer's details with the kind asked for, and started.
 * Old reports stay; new ones carry a new date.
 *
 * start_audit (migration 20261025120000) starts the audit and holds the
 * partner's caps in one transaction: one running audit at a time and a daily
 * limit (groundswell_partners.daily_run_limit, default DEFAULT_DAILY_RUNS).
 * A refusal says why and when the next run frees up, and a fresh audit
 * queued for it is removed again. Started, the worker begins after the
 * answer, as the admin's run route does; the cron carries it on.
 */

const missingFunction = (message: string | undefined, code?: string) =>
  /could not find the function|function .* does not exist|PGRST202/i.test(`${message ?? ''} ${code ?? ''}`);

/** "in about 3 hours", "in 40 minutes": when a cap next frees a run, without naming a time zone. */
export function untilText(resetsAt: string | null, now = Date.now()): string {
  const minutes = resetsAt ? Math.max(1, Math.ceil((Date.parse(resetsAt) - now) / 60_000)) : 0;
  if (!minutes) return 'tomorrow';
  if (minutes < 60) return `in ${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.round(minutes / 60);
  return `in about ${hours} hour${hours === 1 ? '' : 's'}`;
}

/** The sentence a partner sees for a refusal, and its status. */
export function refusal(result: StartResult, limit: number): { status: number; error: string } {
  switch (result.outcome) {
    case 'another_running':
      return { status: 409, error: `An audit for ${result.running_business ?? 'another customer'} is still running. It has to finish before the next one starts.` };
    case 'daily_limit':
      return { status: 429, error: `You’ve used your ${limit} run${limit === 1 ? '' : 's'} for today. The next one frees up ${untilText(result.resets_at)}.` };
    default:
      return { status: 409, error: 'That audit has already been started.' };
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const startedAt = Date.now();
  if (!methodGuard(req, res, ['POST'])) return;
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'The partner portal is not available right now.' });
  const partner = await requirePartner(req, res);
  if (!partner) return;
  if (missingSetup().length) {
    console.error(`Groundswell is not configured: ${missingSetup().join(', ')} missing.`);
    return res.status(503).json({ error: 'The audit engine is not set up yet. New Wave has been notified.' });
  }
  const db = getSupabaseAdmin();
  const body = readJsonBody(req);
  const customerId = typeof body.customer_id === 'string' ? body.customer_id : '';
  if (!customerId) return res.status(400).json({ error: 'Which customer?' });

  const found = await db.from('groundswell_customers').select(CUSTOMER_COLUMNS).eq('partner_id', partner.id).eq('id', customerId).maybeSingle();
  if (found.error) {
    if (missingTable(found.error.message)) return res.status(503).json({ error: NOT_READY });
    console.error('Partner run customer read failed:', found.error.message);
    return res.status(500).json({ error: 'Could not load that customer.' });
  }
  if (!found.data) return res.status(404).json({ error: 'That customer is not in your account.' });
  const customer = found.data as unknown as CustomerRow;

  const history = await partnerAudits(db, partner.id, customer.id);
  if (history.error) {
    console.error('Partner run audits read failed:', history.error.message);
    return res.status(500).json({ error: 'Could not load that customer.' });
  }
  const latest = history.data?.[0] ?? null;
  if (latest?.status === 'running') return res.status(409).json({ error: 'This audit is already running.' });

  // The audit to start: the queued one, or a fresh one from the customer's details.
  let target = latest?.status === 'queued' ? latest : null;
  let fresh = false;
  if (!target) {
    if (!rateLimit(`gs-partner-submit:${partner.id}`, PARTNER_DAILY_LIMIT, 24 * 60 * 60_000)) {
      return res.status(429).json({ error: `You can queue up to ${PARTNER_DAILY_LIMIT} audits a day.` });
    }
    let row;
    try {
      row = buildAuditInsert(draftFrom({ ...customer, ...body, business_name: customer.business_name, city: customer.city ?? '', website: customer.website ?? '', instagram: customer.instagram ?? '', notes: customer.notes ?? '', competitors: customer.competitors }));
    } catch (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Check the customer’s details and try again.' });
    }
    const queued = await db
      .from('marketing_audits')
      .insert({ ...row, status: 'queued', partner_id: partner.id, customer_id: customer.id })
      .select(row.kind ? AUDIT_COLUMNS + BENCHMARK_COLUMNS : AUDIT_COLUMNS)
      .single();
    if (queued.error || !queued.data) {
      const reason =
        missingColumn(queued.error?.message) && (row.brand_logo_url || row.brand_color)
          ? 'A business’s own logo and colour are not available yet. Run it without them.'
          : 'Could not queue that audit. Check the customer’s website and Instagram and try again.';
      console.error('Partner run insert failed:', queued.error?.message);
      return res.status(400).json({ error: reason });
    }
    target = queued.data as unknown as AuditRow;
    fresh = true;
  }

  const limit = await partnerLimit(db, partner.id);
  let result: StartResult;
  try {
    result = await startAudit(db, target.id, partner.id, STEPS, BENCHMARK_STEPS, DEFAULT_DAILY_RUNS);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (missingFunction(message)) {
      // Before the migration: the audit stays queued for New Wave to run.
      if (fresh) await notifyNewPartnerAudit(partner, customer.business_name as string);
      return res.status(503).json({ error: 'Running audits yourself isn’t switched on yet. This one is queued, and New Wave will start it.' });
    }
    console.error('Partner run failed:', message);
    if (fresh) await db.from('marketing_audits').delete().eq('id', target.id);
    return res.status(500).json({ error: 'Could not start the audit. Try again in a minute.' });
  }
  if (result.outcome !== 'started') {
    if (fresh) await db.from('marketing_audits').delete().eq('id', target.id);
    const { status, error } = refusal(result, limit);
    return res.status(status).json({ error });
  }

  runWorkerInBackground(startedAt);
  await notifyNewPartnerAudit(partner, customer.business_name as string, 'started');
  const after = await partnerAudits(db, partner.id, customer.id);
  const audits = after.data ?? [];
  const steps = await activeSteps(db, audits);
  return res.status(200).json({ customer: summarize(customer, audits), audits: audits.map((a) => withSteps(a, steps)) });
}

/** The partner's own daily cap, or the default where the column is missing or unset. */
async function partnerLimit(db: ReturnType<typeof getSupabaseAdmin>, partnerId: string): Promise<number> {
  const { data, error } = await db.from('groundswell_partners').select('daily_run_limit').eq('id', partnerId).maybeSingle();
  if (error || typeof (data as { daily_run_limit?: unknown } | null)?.daily_run_limit !== 'number') return DEFAULT_DAILY_RUNS;
  return (data as { daily_run_limit: number }).daily_run_limit;
}
