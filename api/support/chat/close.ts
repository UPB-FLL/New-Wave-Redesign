import { methodGuard, readJsonBody } from '../../_lib/http';
import { isSupabaseConfigured } from '../../_lib/supabaseAdmin';
import { appendMessage, closeChatSession, notifyAgents, resolveChatSession } from '../../_lib/chatSession';

/** Ends a chat from the visitor's side and tells the technician it is over. */
export default async function handler(req: any, res: any) {
  if (!methodGuard(req, res, ['POST'])) return;

  const { sessionId = '', token = '' } = readJsonBody(req) as Record<string, string>;

  if (!sessionId || !token) {
    return res.status(400).json({ error: 'Missing chat session.' });
  }
  if (!isSupabaseConfigured()) {
    return res.status(200).json({ success: true });
  }

  try {
    const session = await resolveChatSession(String(sessionId), String(token));
    if (!session) return res.status(200).json({ success: true });

    if (session.status === 'open') {
      await closeChatSession(session.id);
      await appendMessage(session.id, {
        sender: 'system',
        body: 'The visitor ended this chat.',
      }).catch(() => null);
      await notifyAgents(session, 'Visitor ended the chat.').catch(() => null);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('support/chat/close: unexpected failure', error);
    return res.status(200).json({ success: true });
  }
}
