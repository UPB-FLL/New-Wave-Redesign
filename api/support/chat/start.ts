import {
  clientIp,
  isValidEmail,
  methodGuard,
  rateLimit,
  readJsonBody,
  sweepRateLimits,
  toE164,
} from '../../_lib/http';
import { isSupabaseConfigured } from '../../_lib/supabaseAdmin';
import { isTwilioConfigured } from '../../_lib/twilio';
import {
  MAX_MESSAGE_LENGTH,
  appendMessage,
  createChatSession,
  notifyAgents,
} from '../../_lib/chatSession';

/**
 * Opens a live chat conversation and texts the first message to the on-call
 * technician's cell phone.
 */
export default async function handler(req: any, res: any) {
  if (!methodGuard(req, res, ['POST'])) return;

  const {
    name = '',
    email = '',
    phone = '',
    message = '',
    website = '',
  } = readJsonBody(req) as Record<string, string>;

  if (website) return res.status(200).json({ success: true });

  const trimmedName = String(name).trim();
  const trimmedEmail = String(email).trim().toLowerCase();
  const trimmedMessage = String(message).trim();

  if (!trimmedName || !trimmedEmail || !trimmedMessage) {
    return res.status(400).json({ error: 'Name, email, and a first message are required.' });
  }
  if (!isValidEmail(trimmedEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (trimmedName.length > 100 || trimmedEmail.length > 254) {
    return res.status(400).json({ error: 'Name or email is too long.' });
  }
  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    return res
      .status(400)
      .json({ error: `Please keep the first message under ${MAX_MESSAGE_LENGTH} characters.` });
  }

  sweepRateLimits();
  if (!rateLimit(`chat-start:${clientIp(req)}`, 5, 60 * 60 * 1000)) {
    return res
      .status(429)
      .json({ error: 'You have started several chats recently. Please email or call us instead.' });
  }

  if (!isSupabaseConfigured()) {
    console.error('support/chat/start: Supabase is not configured');
    return res.status(503).json({ error: 'Chat is temporarily unavailable. Please email or call us.' });
  }
  if (!isTwilioConfigured()) {
    console.error('support/chat/start: Twilio or the agent number is not configured');
    return res.status(503).json({ error: 'Chat is temporarily unavailable. Please email or call us.' });
  }

  try {
    const normalizedPhone = phone ? toE164(String(phone)) ?? '' : '';
    const { session, token } = await createChatSession({
      name: trimmedName,
      email: trimmedEmail,
      phone: normalizedPhone,
    });

    const saved = await appendMessage(session.id, { sender: 'visitor', body: trimmedMessage });

    const { delivered } = await notifyAgents(session, trimmedMessage, { isFirstMessage: true });

    if (delivered.length === 0) {
      return res.status(502).json({
        error: 'We could not reach an on-call technician. Please call us or send an email.',
      });
    }

    return res.status(200).json({
      success: true,
      sessionId: session.id,
      token,
      code: session.code,
      messages: saved ? [saved] : [],
    });
  } catch (error) {
    console.error('support/chat/start: unexpected failure', error);
    return res.status(500).json({ error: 'We could not start the chat. Please try again.' });
  }
}
