import { buildAuditInsert, buildCustomerInsert, type AuditDraft, type AuditStatus } from '../../src/lib/groundswellValidation.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { methodGuard, queryParam, rateLimit, readJsonBody, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { notifyNewPartnerAudit, requirePartner } from '../_lib/groundswell/partners.js';
import { getSupabaseAdmin, isSupabaseConfigured } from '../_lib/supabaseAdmin.js';
import { PARTNER_DAILY_LIMIT } from './partner-audits.js';

/**
 * /api/groundswell/partner-customers — a signed-in partner's customers
 * (groundswell_customers, migration 20261024120000): the businesses it has
 * had audited, each with its audits as history.
 *
 * GET: every customer, most recent activity first, with its newest audit's
 *   status and the date of its last reports. `?id=` returns one customer with
 *   all of its audits (Drive links once done; never internal error text).
 * POST: add a customer (the same checks as an audit) and queue its first
 *   audit, as an audit or a benchmark, optionally with the business's logo and
 *   colour for its reports. It waits in the queue until an admin runs it.
 * PUT `?id=`: change a customer's details. Audits already queued keep the
 *   details they were queued with.
 *
 * Every read and write is scoped to the partner. Without the table (the
 * migration not yet applied) the route answers 503.
 */

const CUSTOMER_COLUMNS = 'id,business_name,city,website,instagram,competitors,notes,created_at,updated_at';
const AUDIT_COLUMNS =
  'id,customer_id,business_name,city,website,instagram,competitors,status,drive_folder_url,summary_pdf_url,deck_pdf_url,audit_pdf_url,created_at,completed_at';
/** Read only where the database has them (migration 20261022120000). */
const BENCHMARK_COLUMNS = ',kind,benchmark_pdf_url';

const missingColumn = (message: string | undefined) => /column .* does not exist|42703/i.test(message ?? '');
const missingTable = (message: string | undefined) => /relation .* does not exist|42P01/i.test(message ?? '');
const NOT_READY = 'Customers are not available yet. Try again later.';

interface CustomerRow {
  id: string;
  updated_at: string;
  [key: string]: unknown;
}

interface AuditRow {
  id: string;
  customer_id: string | null;
  status: AuditStatus;
  kind?: 'audit' | 'benchmark';
  created_at: string;
  completed_at: string | null;
  [key: string]: unknown;
}

async function partnerAudits(db: SupabaseClient, partnerId: string, customerId?: string) {
  const read = (columns: string) => {
    let q = db.from('marketing_audits').select(columns).eq('partner_id', partnerId);
    if (customerId) q = q.eq('customer_id', customerId);
    return q.order('created_at', { ascending: false }).limit(500);
  };
  const first = await read(AUDIT_COLUMNS + BENCHMARK_COLUMNS);
  const result = first.error && missingColumn(first.error.message) ? await read(AUDIT_COLUMNS) : first;
  // Newest first (the query orders too; the summaries below rely on it).
  const rows = ((result.data ?? null) as unknown as AuditRow[] | null)?.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)) ?? null;
  return { data: rows, error: result.error };
}

/** A customer with what the list shows: its newest audit and when its last reports arrived. */
function summarize(customer: CustomerRow, audits: AuditRow[]) {
  const own = audits.filter((a) => a.customer_id === customer.id);
  const latest = own[0] ?? null;
  const delivered = own.find((a) => a.status === 'done' && a.completed_at);
  return {
    ...customer,
    latest: latest ? { id: latest.id, status: latest.status, kind: latest.kind ?? 'audit', created_at: latest.created_at, completed_at: latest.completed_at } : null,
    last_reports_at: delivered?.completed_at ?? null,
    audit_count: own.length,
  };
}

/** Audits as the partner sees them: no customer_id (the page knows it) and nothing internal. */
function publicAudit(row: AuditRow) {
  const audit: Record<string, unknown> = { ...row };
  delete audit.customer_id;
  return audit;
}

function draftFrom(body: Record<string, unknown>): AuditDraft {
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const competitors = Array.isArray(body.competitors) ? body.competitors.slice(0, 6) : [];
  return {
    business_name: str(body.business_name),
    city: str(body.city),
    website: str(body.website),
    instagram: str(body.instagram),
    notes: str(body.notes).slice(0, 2000),
    ...(body.kind === 'benchmark' ? { kind: 'benchmark' as const } : {}),
    brand_logo_url: str(body.brand_logo_url),
    brand_color: str(body.brand_color),
    competitors: competitors.map((c) => {
      const r = (c ?? {}) as Record<string, unknown>;
      return { name: str(r.name), website: str(r.website), instagram: str(r.instagram) };
    }),
  };
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!methodGuard(req, res, ['GET', 'POST', 'PUT'])) return;
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'The partner portal is not available right now.' });
  const partner = await requirePartner(req, res);
  if (!partner) return;
  const db = getSupabaseAdmin();
  const id = queryParam(req, 'id');

  if (req.method === 'GET') {
    const customers = id
      ? await db.from('groundswell_customers').select(CUSTOMER_COLUMNS).eq('partner_id', partner.id).eq('id', id).limit(1)
      : await db.from('groundswell_customers').select(CUSTOMER_COLUMNS).eq('partner_id', partner.id).order('updated_at', { ascending: false }).limit(500);
    if (customers.error) {
      if (missingTable(customers.error.message)) return res.status(503).json({ error: NOT_READY });
      console.error('Partner customers read failed:', customers.error.message);
      return res.status(500).json({ error: 'Could not load your customers.' });
    }
    if (id && !customers.data?.length) return res.status(404).json({ error: 'That customer is not in your account.' });
    const audits = await partnerAudits(db, partner.id, id);
    if (audits.error) {
      console.error('Partner customer audits read failed:', audits.error.message);
      return res.status(500).json({ error: 'Could not load your customers.' });
    }
    const rows = (customers.data ?? []) as unknown as CustomerRow[];
    if (id) return res.status(200).json({ customer: summarize(rows[0], audits.data ?? []), audits: (audits.data ?? []).map(publicAudit) });
    const summaries = rows.map((c) => summarize(c, audits.data ?? []));
    // Most recent activity first: a new audit counts as activity on its customer.
    const activity = (c: ReturnType<typeof summarize>) => Math.max(Date.parse(c.updated_at), c.latest ? Date.parse(c.latest.created_at) : 0);
    summaries.sort((a, b) => activity(b) - activity(a));
    return res.status(200).json({ customers: summaries });
  }

  const body = readJsonBody(req);

  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'Which customer?' });
    let details;
    try {
      details = buildCustomerInsert(draftFrom(body));
    } catch (err) {
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Check the details and try again.' });
    }
    const { data, error } = await db.from('groundswell_customers').update(details).eq('partner_id', partner.id).eq('id', id).select(CUSTOMER_COLUMNS).maybeSingle();
    if (error) {
      if (missingTable(error.message)) return res.status(503).json({ error: NOT_READY });
      console.error('Partner customer update failed:', error.message);
      return res.status(400).json({ error: 'Could not save those details. Check the website and Instagram and try again.' });
    }
    if (!data) return res.status(404).json({ error: 'That customer is not in your account.' });
    const audits = await partnerAudits(db, partner.id, id);
    return res.status(200).json({ customer: summarize(data as unknown as CustomerRow, audits.data ?? []) });
  }

  // POST: a new customer and its first audit.
  if (!rateLimit(`gs-partner-submit:${partner.id}`, PARTNER_DAILY_LIMIT, 24 * 60 * 60_000)) {
    return res.status(429).json({ error: `You can queue up to ${PARTNER_DAILY_LIMIT} audits a day.` });
  }
  let audit;
  let details;
  try {
    const draft = draftFrom(body);
    audit = buildAuditInsert(draft);
    details = buildCustomerInsert(draft);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Check the details and try again.' });
  }
  const created = await db.from('groundswell_customers').insert({ ...details, partner_id: partner.id }).select(CUSTOMER_COLUMNS).single();
  if (created.error || !created.data) {
    if (missingTable(created.error?.message)) return res.status(503).json({ error: NOT_READY });
    console.error('Partner customer insert failed:', created.error?.message);
    return res.status(400).json({ error: 'Could not add that customer. Check the website and Instagram and try again.' });
  }
  const customer = created.data as unknown as CustomerRow;
  const queued = await db
    .from('marketing_audits')
    .insert({ ...audit, status: 'queued', partner_id: partner.id, customer_id: customer.id })
    .select(audit.kind ? AUDIT_COLUMNS + BENCHMARK_COLUMNS : AUDIT_COLUMNS)
    .single();
  if (queued.error || !queued.data) {
    // Nothing half-added: without its audit the customer goes too, so the partner can simply try again.
    await db.from('groundswell_customers').delete().eq('id', customer.id);
    const reason =
      missingColumn(queued.error?.message) && (audit.brand_logo_url || audit.brand_color)
        ? 'A business’s own logo and colour are not available yet. Queue it without them.'
        : 'Could not queue that audit. Check the website and Instagram and try again.';
    console.error('Partner first audit insert failed:', queued.error?.message);
    return res.status(400).json({ error: reason });
  }
  await notifyNewPartnerAudit(partner, audit.business_name);
  const row = queued.data as unknown as AuditRow;
  return res.status(201).json({ customer: summarize(customer, [row]), audit: publicAudit(row) });
}
