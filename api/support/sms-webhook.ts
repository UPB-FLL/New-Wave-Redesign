import { getAgentNumbers, validateTwilioSignature, webhookUrl } from '../_lib/twilio';
import { isSupabaseConfigured } from '../_lib/supabaseAdmin';
import {
  MAX_MESSAGE_LENGTH,
  appendMessage,
  closeChatSession,
  findSessionByCode,
  listRoutableSessions,
} from '../_lib/chatSession';

/**
 * Twilio inbound-SMS webhook. Point the messaging service or phone number at
 * POST https://<your-domain>/api/support/sms-webhook.
 *
 * A technician answers a visitor by texting back. Because one phone number
 * serves every conversation, the reply must say which conversation it belongs
 * to: "#A1B2 on my way". When exactly one conversation is open we route an
 * uncoded reply to it; when several are open we ask rather than guess, since
 * guessing wrong would show one customer another customer's message.
 */

const CODE_PATTERN = /^\s*#?\s*([A-Za-z0-9]{4})\b[\s:,.-]*/;

function twiml(message?: string): string {
  const body = message
    ? `<Message>${message.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string))}</Message>`
    : '';
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`;
}

function respond(res: any, message?: string) {
  res.setHeader('Content-Type', 'text/xml; charset=utf-8');
  return res.status(200).send(twiml(message));
}

/**
 * Twilio signs `url + <each POST param, key-sorted, concatenated as key+value>`,
 * so we need the parameter map rather than the exact raw bytes. Vercel hands us
 * a parsed object for `application/x-www-form-urlencoded`, but a string or
 * Buffer shows up if the content type is unusual — handle all three.
 */
function formParams(req: any): Record<string, string> {
  const body = req.body;

  if (!body) return {};

  if (typeof body === 'string' || Buffer.isBuffer(body)) {
    return Object.fromEntries(new URLSearchParams(body.toString()));
  }

  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    params[key] = Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');
  }
  return params;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const params = formParams(req);
  const signature = String(req.headers['x-twilio-signature'] || '');
  if (!validateTwilioSignature(webhookUrl(req), params, signature)) {
    console.warn('sms-webhook: rejected a request with an invalid Twilio signature');
    return res.status(403).json({ error: 'Invalid signature' });
  }

  if (!isSupabaseConfigured()) {
    console.error('sms-webhook: Supabase is not configured');
    return respond(res);
  }

  const from = String(params.From || '');
  const rawBody = String(params.Body || '').trim();
  const smsSid = String(params.MessageSid || params.SmsSid || '');

  // Only numbers we deliberately text can inject messages into a transcript.
  // Fails closed: with no allow-list configured nothing is accepted, rather
  // than letting any inbound number write into a customer's chat.
  const agentNumbers = getAgentNumbers();
  if (!agentNumbers.includes(from)) {
    console.warn(`sms-webhook: ignoring SMS from unrecognised number ${from}`);
    return respond(res, 'This number only accepts replies from New Wave IT technicians.');
  }

  if (!rawBody) return respond(res);

  try {
    const match = rawBody.match(CODE_PATTERN);
    let session = match ? await findSessionByCode(match[1]) : null;
    let body = session ? rawBody.slice(match![0].length).trim() : rawBody;

    if (!session) {
      const open = await listRoutableSessions();

      if (open.length === 0) {
        return respond(res, 'No chat is waiting for a reply right now.');
      }
      if (open.length > 1) {
        const codes = open.map((s) => `#${s.code} (${s.visitorName || 'visitor'})`).join(', ');
        return respond(
          res,
          `Several chats are open — start your reply with the code so it reaches the right person: ${codes}`
        );
      }

      session = open[0];
      body = rawBody;
    }

    if (session.status === 'closed') {
      return respond(res, `Chat #${session.code} is already closed.`);
    }

    if (/^\/close\b/i.test(body)) {
      await closeChatSession(session.id);
      await appendMessage(session.id, {
        sender: 'system',
        body: 'A technician closed this chat.',
        smsSid,
        agentNumber: from,
      }).catch(() => null);
      return respond(res, `Closed chat #${session.code}.`);
    }

    if (!body) {
      return respond(res, `Add a message after #${session.code} and we will pass it along.`);
    }

    // A duplicate SID (Twilio retrying a webhook we already handled) resolves
    // to null and is simply acknowledged.
    await appendMessage(session.id, {
      sender: 'agent',
      body: body.slice(0, MAX_MESSAGE_LENGTH),
      smsSid,
      agentNumber: from,
    });

    return respond(res);
  } catch (error) {
    console.error('sms-webhook: unexpected failure', error);
    return respond(res, 'We could not deliver that reply. Please try again.');
  }
}
