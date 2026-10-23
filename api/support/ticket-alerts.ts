import { Resend } from 'resend';
import { requireAdmin } from '../_lib/adminKey.js';
import { type ApiRequest, type ApiResponse, methodGuard, readJsonBody } from '../_lib/http.js';
import { getSupabaseAdmin, isSupabaseConfigured } from '../_lib/supabaseAdmin.js';
import {
  type AlertTicket,
  SuperOpsRequestError,
  getRecentTickets,
  getTicketById,
  isSuperOpsConfigured,
} from '../_lib/superops.js';
import {
  RECENT_LIMIT,
  WEBHOOK_SECRET_HEADER,
  alertEmailAddress,
  alertEmailHtml,
  alertEmailSubject,
  alertEmailText,
  alertSms,
  alertSmsNumbers,
  freshTickets,
  ticketIdsIn,
  webhookSecretMatches,
} from '../_lib/ticketAlerts.js';
import { sendSms } from '../_lib/twilio.js';

/**
 * New-ticket alerts. SuperOps posts here on TICKET_CREATED (a webhook
 * subscription carrying SUPEROPS_WEBHOOK_SECRET as a custom header); staff or
 * a cron can post with `x-admin-key` to run the same check.
 *
 * The delivery's own fields are not trusted or needed: the route reads the
 * newest tickets from SuperOps (plus any ticketId the delivery names), and
 * alerts each one under an hour old that it has not alerted before
 * (`support_ticket_alerts`, one row per ticket), by text and by email.
 */

const FROM_ADDRESS = process.env.SUPPORT_FROM_EMAIL || 'New Wave IT Support <support@newwaveitfl.com>';
const MAX_NAMED_TICKETS = 5;

type Claim = 'claimed' | 'seen' | 'untracked';

async function claim(ticket: AlertTicket): Promise<Claim> {
  if (!isSupabaseConfigured()) return 'untracked';
  const { error } = await getSupabaseAdmin()
    .from('support_ticket_alerts')
    .insert({ ticket_id: ticket.ticketId, display_id: ticket.displayId, subject: ticket.subject.slice(0, 200) });
  if (!error) return 'claimed';
  if (error.code === '23505') return 'seen';
  // A missing table (migration not applied) or a database hiccup: alert anyway.
  // A duplicate text beats a missed ticket.
  console.error('ticket-alerts: could not record the alert', error.code, error.message);
  return 'untracked';
}

async function release(ticket: AlertTicket): Promise<void> {
  const { error } = await getSupabaseAdmin().from('support_ticket_alerts').delete().eq('ticket_id', ticket.ticketId);
  if (error) console.error('ticket-alerts: could not release the alert', error.message);
}

/** Texts and emails one ticket; answers how many messages went out. */
async function deliver(ticket: AlertTicket, resend: Resend | null): Promise<number> {
  const sends: Array<Promise<unknown>> = alertSmsNumbers().map((to) => sendSms(to, alertSms(ticket)));
  if (resend) {
    sends.push(
      resend.emails
        .send({
          from: FROM_ADDRESS,
          to: alertEmailAddress(),
          subject: alertEmailSubject(ticket),
          html: alertEmailHtml(ticket),
          text: alertEmailText(ticket),
        })
        .then((result) => {
          if (result?.error) throw new Error(result.error.message);
        }),
    );
  }
  const results = await Promise.allSettled(sends);
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error(`ticket-alerts: a message for #${ticket.displayId} failed`, String(result.reason).slice(0, 300));
    }
  }
  return results.filter((r) => r.status === 'fulfilled').length;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!methodGuard(req, res, ['POST'])) return;

  const secret = req.headers?.[WEBHOOK_SECRET_HEADER];
  const provided = Array.isArray(secret) ? secret[0] : secret;
  if (provided !== undefined) {
    if (!webhookSecretMatches(provided)) return res.status(401).json({ error: 'Unauthorized' });
  } else if (!(await requireAdmin(req, res))) {
    return;
  }

  if (!isSuperOpsConfigured()) {
    console.error('ticket-alerts: SUPEROPS_API_TOKEN / SUPEROPS_SUBDOMAIN are not configured');
    return res.status(503).json({ error: 'SuperOps is not configured.' });
  }

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  if (!resend) console.error('ticket-alerts: RESEND_API_KEY is not set; no alert email will be sent');
  if (!alertSmsNumbers().length) console.error('ticket-alerts: no SUPPORT_ALERT_SMS_NUMBERS; no alert text will be sent');

  let tickets: AlertTicket[];
  try {
    const named = ticketIdsIn(readJsonBody(req)).slice(0, MAX_NAMED_TICKETS);
    const [recent, ...fetched] = await Promise.all([getRecentTickets(RECENT_LIMIT), ...named.map((id) => getTicketById(id).catch(() => null))]);
    const byId = new Map<string, AlertTicket>();
    for (const ticket of [...recent, ...fetched]) if (ticket) byId.set(ticket.ticketId, ticket);
    tickets = freshTickets([...byId.values()]);
  } catch (error) {
    const message = error instanceof SuperOpsRequestError ? error.message : String(error);
    console.error('ticket-alerts: reading SuperOps failed', message);
    // 5xx so SuperOps delivers the event again.
    return res.status(502).json({ error: 'Could not read tickets from SuperOps.' });
  }

  const alerted: string[] = [];
  const failed: string[] = [];
  for (const ticket of tickets) {
    const state = await claim(ticket);
    if (state === 'seen') continue;
    const sent = await deliver(ticket, resend);
    if (sent > 0) {
      alerted.push(ticket.displayId);
    } else {
      failed.push(ticket.displayId);
      if (state === 'claimed') await release(ticket);
    }
  }

  return res.status(failed.length && !alerted.length ? 502 : 200).json({
    success: failed.length === 0,
    checked: tickets.length,
    alerted,
    failed,
  });
}
