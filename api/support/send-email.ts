import { Resend } from 'resend';
import {
  clientIp,
  escapeHtml,
  isValidEmail,
  methodGuard,
  rateLimit,
  readJsonBody,
  sweepRateLimits,
} from '../_lib/http.js';

/**
 * "Email support" section of /support.
 *
 * Delivers the message to the support inbox with the customer set as
 * reply-to, then sends the customer a receipt so they know it landed.
 */

const SUPPORT_INBOX = process.env.SUPPORT_INBOX_EMAIL || 'support@newwaveitfl.com';
const FROM_ADDRESS = process.env.SUPPORT_FROM_EMAIL || 'New Wave IT Support <support@newwaveitfl.com>';
const SUPPORT_PHONE = process.env.SUPPORT_PHONE || '(954) 372-5100';

const LIMITS = {
  name: 100,
  email: 254,
  company: 120,
  phone: 40,
  subject: 200,
  message: 5000,
};

const URGENCY_LABELS: Record<string, string> = {
  low: 'Low — general question',
  normal: 'Normal — affecting one person',
  high: 'High — affecting the team',
  critical: 'Critical — business down',
};

export default async function handler(req: any, res: any) {
  if (!methodGuard(req, res, ['POST'])) return;

  const body = readJsonBody(req);
  const {
    name = '',
    email = '',
    company = '',
    phone = '',
    subject = '',
    message = '',
    urgency = 'normal',
    website = '',
  } = body as Record<string, string>;

  // Honeypot: a real person never fills this in, bots fill in everything.
  if (website) {
    return res.status(200).json({ success: true });
  }

  if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
    return res.status(400).json({ error: 'Name, email, subject, and message are required.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  for (const [field, max] of Object.entries(LIMITS)) {
    const value = (body as Record<string, string>)[field];
    if (typeof value === 'string' && value.length > max) {
      return res.status(400).json({ error: `${field} is too long (max ${max} characters).` });
    }
  }

  sweepRateLimits();
  if (!rateLimit(`support-email:${clientIp(req)}`, 5, 10 * 60 * 1000)) {
    return res
      .status(429)
      .json({ error: 'Too many messages sent from this connection. Please try again shortly.' });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('support/send-email: RESEND_API_KEY is not configured');
    return res.status(503).json({
      error: `Email is temporarily unavailable. Please call ${SUPPORT_PHONE} or write to ${SUPPORT_INBOX}.`,
    });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const safe = {
    name: escapeHtml(name),
    email: escapeHtml(email),
    company: escapeHtml(company),
    phone: escapeHtml(phone),
    subject: escapeHtml(subject),
    message: escapeHtml(message),
    // Own-property check so a body of {"urgency":"__proto__"} cannot reach
    // Object.prototype and stringify into the email.
    urgency: escapeHtml(
      Object.prototype.hasOwnProperty.call(URGENCY_LABELS, urgency)
        ? URGENCY_LABELS[urgency]
        : URGENCY_LABELS.normal
    ),
  };

  try {
    const inbound = await resend.emails.send({
      from: FROM_ADDRESS,
      to: SUPPORT_INBOX,
      replyTo: email,
      subject: `[Support] ${safe.subject}`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; color: #152232;">
          <h2 style="border-bottom: 2px solid #39CCCC; padding-bottom: 10px; margin-bottom: 20px;">
            New support email
          </h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 6px 0; width: 120px;"><strong>From</strong></td><td style="padding: 6px 0;">${safe.name} &lt;${safe.email}&gt;</td></tr>
            ${safe.company ? `<tr><td style="padding: 6px 0;"><strong>Company</strong></td><td style="padding: 6px 0;">${safe.company}</td></tr>` : ''}
            ${safe.phone ? `<tr><td style="padding: 6px 0;"><strong>Phone</strong></td><td style="padding: 6px 0;">${safe.phone}</td></tr>` : ''}
            <tr><td style="padding: 6px 0;"><strong>Urgency</strong></td><td style="padding: 6px 0;">${safe.urgency}</td></tr>
            <tr><td style="padding: 6px 0;"><strong>Subject</strong></td><td style="padding: 6px 0;">${safe.subject}</td></tr>
          </table>
          <div style="background: #f8fafb; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #39CCCC;">
            <p style="white-space: pre-wrap; margin: 0; line-height: 1.6;">${safe.message}</p>
          </div>
          <p style="font-size: 12px; color: #999; border-top: 1px solid #e0e0e0; padding-top: 16px;">
            Sent from the support page at newwaveitfl.com. Reply to this email to answer ${safe.name} directly.
          </p>
        </div>
      `,
    });

    if (inbound.error) {
      console.error('support/send-email: inbound delivery failed', inbound.error);
      return res.status(502).json({ error: 'We could not send your message. Please try again.' });
    }

    // Receipt to the customer. A failure here is logged but does not fail the
    // request — the message the customer cares about already reached support.
    const receipt = await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      replyTo: SUPPORT_INBOX,
      subject: `We received your message — ${subject.slice(0, 120)}`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; color: #152232;">
          <h2 style="border-bottom: 2px solid #39CCCC; padding-bottom: 10px;">We got your message</h2>
          <p style="line-height: 1.6; color: #555;">Hi ${safe.name},</p>
          <p style="line-height: 1.6; color: #555;">
            Thanks for reaching out to New Wave IT support. Your message is in our queue and a
            technician will reply to this email address. Critical issues get a response within
            4 business hours; everything else within one business day.
          </p>
          <div style="background: #f8fafb; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 8px; font-size: 13px; color: #666;"><strong>Subject:</strong> ${safe.subject}</p>
            <p style="margin: 0; font-size: 13px; color: #666; white-space: pre-wrap;">${safe.message}</p>
          </div>
          <div style="background: #e8f5f4; padding: 16px; border-radius: 8px; border-left: 4px solid #39CCCC;">
            <p style="margin: 0; font-size: 14px;">
              <strong>Business down right now?</strong> Call ${escapeHtml(SUPPORT_PHONE)} — we answer 24/7.
            </p>
          </div>
          <p style="font-size: 12px; color: #999; border-top: 1px solid #e0e0e0; padding-top: 16px; margin-top: 24px;">
            New Wave IT · newwaveitfl.com · ${escapeHtml(SUPPORT_PHONE)}
          </p>
        </div>
      `,
    });

    if (receipt.error) {
      console.error('support/send-email: receipt delivery failed', receipt.error);
    }

    return res.status(200).json({ success: true, id: inbound.data?.id });
  } catch (error) {
    console.error('support/send-email: unexpected failure', error);
    return res.status(500).json({ error: 'We could not send your message. Please try again.' });
  }
}
