import { createHash, timingSafeEqual } from 'node:crypto';
import { escapeHtml } from './http.js';
import type { AlertTicket } from './superops.js';
import { superOpsTime } from './superops.js';

/**
 * New-ticket alerts: when a ticket lands on the SuperOps board, a text to the
 * owner's phone and an email to the owner. See "New-ticket alerts" in
 * docs/support-page.md.
 */

export const DEFAULT_ALERT_EMAIL = 'josh@newwaveitfl.com';
/** Tickets older than this are never alerted, so a first run cannot text the whole backlog. */
export const ALERT_WINDOW_MS = 60 * 60_000;
/** How many of the newest tickets each check reads. */
export const RECENT_LIMIT = 10;
export const WEBHOOK_SECRET_HEADER = 'x-superops-webhook-secret';

const DEFAULT_APP_URL = 'https://newwave.superops.ai';
const LOGO_URL = 'https://www.newwaveitfl.com/brand/email/new-wave-it-logo-on-dark.png';

export function alertEmailAddress(): string {
  return (process.env.SUPPORT_ALERT_EMAIL || DEFAULT_ALERT_EMAIL).trim();
}

/** The cell number(s) alerts are texted to: their own list, else the chat bridge's. */
export function alertSmsNumbers(): string[] {
  return (process.env.SUPPORT_ALERT_SMS_NUMBERS || process.env.SUPPORT_AGENT_SMS_NUMBERS || process.env.SUPPORT_AGENT_SMS_NUMBER || '')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
}

export function superOpsAppUrl(): string {
  return (process.env.SUPEROPS_APP_URL || DEFAULT_APP_URL).replace(/\/+$/, '');
}

/** Constant-time check of the shared secret SuperOps sends as a custom header. */
export function webhookSecretMatches(provided: string | undefined): boolean {
  const expected = process.env.SUPEROPS_WEBHOOK_SECRET;
  if (!expected || !provided) return false;
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(provided), digest(expected));
}

/** Tickets young enough to alert, oldest first so texts arrive in board order. */
export function freshTickets(tickets: AlertTicket[], now = Date.now()): AlertTicket[] {
  return tickets
    .filter((t) => {
      const created = superOpsTime(t.createdAt);
      return Number.isFinite(created) && now - created <= ALERT_WINDOW_MS && created - now <= 5 * 60_000;
    })
    .sort((a, b) => superOpsTime(a.createdAt) - superOpsTime(b.createdAt));
}

/**
 * The ticket ids a webhook delivery names, wherever SuperOps puts them
 * (its payload shape is not documented): any `ticketId` key at any depth.
 */
export function ticketIdsIn(body: unknown, depth = 0): string[] {
  if (!body || typeof body !== 'object' || depth > 5) return [];
  const ids: string[] = [];
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (key === 'ticketId' && (typeof value === 'string' || typeof value === 'number') && /^\d{1,30}$/.test(String(value))) {
      ids.push(String(value));
    } else if (value && typeof value === 'object') {
      ids.push(...ticketIdsIn(value, depth + 1));
    }
  }
  return [...new Set(ids)];
}

function who(ticket: AlertTicket): string {
  const parts = [ticket.requester, ticket.client].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Unknown requester';
}

function clip(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/** One short text per ticket: number, subject, who, priority. */
export function alertSms(ticket: AlertTicket): string {
  const lines = [
    `New Wave IT: new ticket #${ticket.displayId}`,
    clip(ticket.subject, 90),
    clip(who(ticket), 70),
  ];
  const meta = [ticket.priority && `Priority: ${ticket.priority}`, ticket.source && `via ${ticket.source.toLowerCase()}`].filter(Boolean).join(' · ');
  if (meta) lines.push(meta);
  lines.push(superOpsAppUrl());
  return lines.join('\n');
}

export function alertEmailSubject(ticket: AlertTicket): string {
  return clip(`New ticket #${ticket.displayId}: ${ticket.subject}`, 150);
}

function createdLabel(ticket: AlertTicket): string {
  const created = superOpsTime(ticket.createdAt);
  if (!Number.isFinite(created)) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(created)) + ' ET';
}

/** The owner's alert email, in New Wave IT's colours (tables and inline styles for mail clients). */
export function alertEmailHtml(ticket: AlertTicket): string {
  const rows: Array<[string, string]> = [
    ['Requester', ticket.requester],
    ['Client', ticket.client],
    ['Site', ticket.site],
    ['Priority', ticket.priority],
    ['Status', ticket.status],
    ['Source', ticket.source && ticket.source.charAt(0) + ticket.source.slice(1).toLowerCase()],
    ['Received', createdLabel(ticket)],
  ];
  const detail = rows
    .filter(([, value]) => value)
    .map(
      ([label, value]) => `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #E8EFF1;color:#526271;font-size:13px;width:110px;vertical-align:top;">${label}</td>
                <td style="padding:10px 0;border-bottom:1px solid #E8EFF1;color:#101E2D;font-size:14px;font-weight:600;">${escapeHtml(value)}</td>
              </tr>`,
    )
    .join('');
  const appUrl = escapeHtml(superOpsAppUrl());

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#F7FAFB;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7FAFB;padding:24px 12px;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border:1px solid #E8EFF1;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#09131D;padding:20px 28px;">
                <img src="${LOGO_URL}" width="180" height="60" alt="New Wave IT" style="display:block;border:0;">
              </td>
            </tr>
            <tr><td style="height:4px;background:#31C6CF;line-height:4px;font-size:0;">&nbsp;</td></tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 6px;color:#317B92;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">New ticket · #${escapeHtml(ticket.displayId)}</p>
                <h1 style="margin:0 0 20px;color:#101E2D;font-size:22px;line-height:1.3;">${escapeHtml(ticket.subject)}</h1>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${detail}
                </table>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                  <tr>
                    <td style="background:#317B92;border-radius:8px;">
                      <a href="${appUrl}" style="display:inline-block;padding:12px 22px;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;">Open the board in SuperOps</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;background:#F7FAFB;border-top:1px solid #E8EFF1;color:#526271;font-size:12px;line-height:1.5;">
                Sent by newwaveitfl.com when a ticket reaches the SuperOps board.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function alertEmailText(ticket: AlertTicket): string {
  const details: Array<[string, string]> = [
    ['Requester', ticket.requester],
    ['Client', ticket.client],
    ['Site', ticket.site],
    ['Priority', ticket.priority],
    ['Status', ticket.status],
    ['Received', createdLabel(ticket)],
  ];
  return [
    `New ticket #${ticket.displayId}: ${ticket.subject}`,
    '',
    ...details.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`),
    '',
    `Open the board: ${superOpsAppUrl()}`,
  ].join('\n');
}
