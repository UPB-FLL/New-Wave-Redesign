import { clientIp, methodGuard, rateLimit, readJsonBody, sweepRateLimits } from '../../_lib/http.js';
import { isSupabaseConfigured } from '../../_lib/supabaseAdmin.js';
import {
  MAX_MESSAGES_PER_SESSION,
  MAX_MESSAGE_LENGTH,
  appendMessage,
  notifyAgents,
  resolveChatSession,
} from '../../_lib/chatSession.js';

/** Sends a follow-up visitor message and forwards it to the technician by SMS. */
export default async function handler(req: any, res: any) {
  if (!methodGuard(req, res, ['POST'])) return;

  const { sessionId = '', token = '', message = '' } = readJsonBody(req) as Record<string, string>;
  const body = String(message).trim();

  if (!sessionId || !token) {
    return res.status(400).json({ error: 'Missing chat session.' });
  }
  if (!body) {
    return res.status(400).json({ error: 'Type a message first.' });
  }
  if (body.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: `Please keep messages under ${MAX_MESSAGE_LENGTH} characters.` });
  }

  sweepRateLimits();
  if (!rateLimit(`chat-send:${clientIp(req)}`, 30, 5 * 60 * 1000)) {
    return res.status(429).json({ error: 'You are sending messages too quickly.' });
  }

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: 'Chat is temporarily unavailable.' });
  }

  try {
    const session = await resolveChatSession(String(sessionId), String(token));
    if (!session) {
      return res.status(401).json({ error: 'This chat session has ended. Start a new one.' });
    }
    if (session.status === 'closed') {
      return res.status(409).json({ error: 'This chat has been closed. Start a new one.' });
    }
    if (session.messageCount >= MAX_MESSAGES_PER_SESSION) {
      return res.status(429).json({
        error: 'This conversation has hit its message limit. Please continue by email or phone.',
      });
    }

    const saved = await appendMessage(session.id, { sender: 'visitor', body });
    const { delivered } = await notifyAgents(session, body);

    return res.status(200).json({
      success: true,
      message: saved,
      // Surfaced so the UI can warn that the text did not go through.
      deliveredToAgent: delivered.length > 0,
    });
  } catch (error) {
    console.error('support/chat/send: unexpected failure', error);
    return res.status(500).json({ error: 'We could not send that message. Please try again.' });
  }
}
