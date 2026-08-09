import { methodGuard, readJsonBody } from '../../_lib/http.js';
import { isSupabaseConfigured } from '../../_lib/supabaseAdmin.js';
import { listMessages, resolveChatSession } from '../../_lib/chatSession.js';

/**
 * Polling endpoint for the chat transcript.
 *
 * The widget passes `since` (the timestamp of the newest message it already
 * has) so a poll is normally an empty response.
 */
export default async function handler(req: any, res: any) {
  if (!methodGuard(req, res, ['POST'])) return;

  const { sessionId = '', token = '', since = '' } = readJsonBody(req) as Record<string, string>;

  if (!sessionId || !token) {
    return res.status(400).json({ error: 'Missing chat session.' });
  }
  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: 'Chat is temporarily unavailable.' });
  }

  try {
    const session = await resolveChatSession(String(sessionId), String(token));
    if (!session) {
      return res.status(401).json({ error: 'This chat session has ended.' });
    }

    const messages = await listMessages(session.id, since ? String(since) : undefined);

    return res.status(200).json({
      success: true,
      status: session.status,
      messages,
    });
  } catch (error) {
    console.error('support/chat/messages: unexpected failure', error);
    return res.status(500).json({ error: 'We could not load the conversation.' });
  }
}
