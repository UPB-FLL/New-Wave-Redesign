import { Resend } from 'resend';
import { clientIp, escapeHtml, isValidEmail, methodGuard, rateLimit, readJsonBody } from '../_lib/http.js';

/**
 * "Email support" section of /support.
 *
 * One Resend send to the support inbox, with the sender as reply-to so a
 * technician can just hit reply. Nothing else.
 */

const SUPPORT_INBOX = process.env.SUPPORT_INBOX_EMAIL || 'support@newwaveitfl.com';
const FROM_ADDRESS = process.env.SUPPORT_FROM_EMAIL || 'New Wave IT Support <support@newwaveitfl.com>';

export default async function handler(req: any, res: any) {
  if (!methodGuard(req, res, ['POST'])) return;

  const { name = '', email = '', subject = '', message = '', website = '' } = readJsonBody(req) as Record<
    string,
    string
  >;

  // Honeypot: hidden from people, filled in by bots. Kept because this form
  // posts straight into a real inbox.
  if (website) return res.status(200).json({ success: true });

  if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
    return res.status(400).json({ error: 'Please fill in every field.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (name.length > 100 || email.length > 254 || subject.length > 200 || message.length > 5000) {
    return res.status(400).json({ error: 'That message is too long.' });
  }

  if (!rateLimit(`support-email:${clientIp(req)}`, 5, 10 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many messages just now. Please try again shortly.' });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('support/send-email: RESEND_API_KEY is not configured');
    return res.status(503).json({ error: `Email is temporarily unavailable. Please write to ${SUPPORT_INBOX}.` });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to: SUPPORT_INBOX,
      replyTo: email,
      subject: `[Support] ${subject}`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; color: #152232;">
          <h2 style="border-bottom: 2px solid #39CCCC; padding-bottom: 10px;">New support email</h2>
          <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
          <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
          <div style="background: #f8fafb; padding: 16px; border-radius: 8px; margin-top: 16px; border-left: 4px solid #39CCCC;">
            <p style="white-space: pre-wrap; margin: 0; line-height: 1.6;">${escapeHtml(message)}</p>
          </div>
          <p style="font-size: 12px; color: #999; margin-top: 20px;">
            Sent from the support page at newwaveitfl.com. Reply to answer ${escapeHtml(name)} directly.
          </p>
        </div>
      `,
    });

    if (result.error) {
      console.error('support/send-email: delivery failed', result.error);
      return res.status(502).json({ error: 'We could not send your message. Please try again.' });
    }

    return res.status(200).json({ success: true, id: result.data?.id });
  } catch (error) {
    console.error('support/send-email: unexpected failure', error);
    return res.status(500).json({ error: 'We could not send your message. Please try again.' });
  }
}
