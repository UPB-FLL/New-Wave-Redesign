import { getSupabaseAdmin } from './supabaseAdmin';
import { hashToken, randomChatCode, randomToken } from './tokens';
import { getAgentNumbers, sendSms } from './twilio';

/**
 * Live chat <-> SMS bridge.
 *
 * A visitor conversation on /support is mirrored to a technician's cell phone
 * over SMS. Each session carries a short `code`; the technician replies with
 * that code as a prefix so an answer lands in the right conversation. Nothing
 * about the visitor's identity leaves the database except what we put in the
 * outbound SMS.
 */

export const MAX_MESSAGE_LENGTH = 1000;
/** Per-conversation flood ceiling, enforced in Postgres so it survives cold starts. */
export const MAX_MESSAGES_PER_SESSION = 80;
/** A conversation older than this stops accepting SMS replies without a code. */
export const SESSION_IDLE_MS = 24 * 60 * 60 * 1000;
/** Longest text we will put in one SMS body before truncating. */
const SMS_BODY_LIMIT = 1200;

export interface ChatSession {
  id: string;
  code: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  status: 'open' | 'closed';
  messageCount: number;
  agentNumber: string;
}

export interface ChatMessage {
  id: string;
  sender: 'visitor' | 'agent' | 'system';
  body: string;
  createdAt: string;
}

interface SessionRow {
  id: string;
  code: string;
  visitor_name: string;
  visitor_email: string;
  visitor_phone: string;
  status: string;
  message_count: number;
  agent_number: string;
}

function toSession(row: SessionRow): ChatSession {
  return {
    id: row.id,
    code: row.code,
    visitorName: row.visitor_name,
    visitorEmail: row.visitor_email,
    visitorPhone: row.visitor_phone,
    status: row.status === 'closed' ? 'closed' : 'open',
    messageCount: row.message_count,
    agentNumber: row.agent_number,
  };
}

const SESSION_COLUMNS =
  'id, code, visitor_name, visitor_email, visitor_phone, status, message_count, agent_number';

export async function createChatSession(visitor: {
  name: string;
  email: string;
  phone: string;
}): Promise<{ session: ChatSession; token: string }> {
  const supabase = getSupabaseAdmin();
  const token = randomToken();

  // `code` is unique; retry a few times in the (unlikely) event of a collision.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .from('support_chat_sessions')
      .insert({
        code: randomChatCode(),
        token_hash: hashToken(token),
        visitor_name: visitor.name,
        visitor_email: visitor.email,
        visitor_phone: visitor.phone,
      })
      .select(SESSION_COLUMNS)
      .single();

    if (!error && data) return { session: toSession(data as SessionRow), token };

    // 23505 = unique_violation. Anything else is a real failure.
    if (error && error.code !== '23505') {
      throw new Error(`Could not start chat session: ${error.message}`);
    }
  }

  throw new Error('Could not allocate a chat session code');
}

export async function resolveChatSession(
  sessionId: string,
  token: string
): Promise<ChatSession | null> {
  if (!sessionId || !token) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('support_chat_sessions')
    .select(SESSION_COLUMNS)
    .eq('id', sessionId)
    .eq('token_hash', hashToken(token))
    .maybeSingle();

  if (error || !data) return null;
  return toSession(data as SessionRow);
}

export async function findSessionByCode(code: string): Promise<ChatSession | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('support_chat_sessions')
    .select(SESSION_COLUMNS)
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (error || !data) return null;
  return toSession(data as SessionRow);
}

/**
 * Open conversations that are still recent enough for a technician to answer.
 * Used to decide whether an uncoded SMS reply can be routed unambiguously.
 */
export async function listRoutableSessions(limit = 5): Promise<ChatSession[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('support_chat_sessions')
    .select(SESSION_COLUMNS)
    .eq('status', 'open')
    .gte('last_message_at', new Date(Date.now() - SESSION_IDLE_MS).toISOString())
    .order('last_message_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as SessionRow[]).map(toSession);
}

export async function appendMessage(
  sessionId: string,
  message: { sender: 'visitor' | 'agent' | 'system'; body: string; smsSid?: string; agentNumber?: string }
): Promise<ChatMessage | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('support_chat_messages')
    .insert({
      session_id: sessionId,
      sender: message.sender,
      body: message.body,
      sms_sid: message.smsSid ?? '',
      agent_number: message.agentNumber ?? '',
    })
    .select('id, sender, body, created_at')
    .single();

  if (error) {
    // A duplicate SID means Twilio retried a webhook we already handled.
    if (error.code === '23505') return null;
    throw new Error(`Could not save chat message: ${error.message}`);
  }

  const update: Record<string, unknown> = { last_message_at: new Date().toISOString() };
  if (message.agentNumber) update.agent_number = message.agentNumber;

  await supabase.from('support_chat_sessions').update(update).eq('id', sessionId);

  // Kept as a separate statement so the counter is incremented atomically in
  // Postgres rather than read-modify-written from here.
  await supabase.rpc('increment_support_chat_message_count', { session_uuid: sessionId });

  return {
    id: data.id,
    sender: data.sender,
    body: data.body,
    createdAt: data.created_at,
  };
}

export async function listMessages(sessionId: string, since?: string): Promise<ChatMessage[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('support_chat_messages')
    .select('id, sender, body, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(200);

  if (since) query = query.gt('created_at', since);

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    sender: row.sender,
    body: row.body,
    createdAt: row.created_at,
  }));
}

export async function closeChatSession(sessionId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase
    .from('support_chat_sessions')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', sessionId);
}

function truncate(text: string, limit = SMS_BODY_LIMIT): string {
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
}

/**
 * Pushes a visitor message out to every configured technician number.
 * Returns the numbers that accepted it; a partial failure is not fatal because
 * the transcript is already durable in Postgres.
 */
export async function notifyAgents(
  session: ChatSession,
  body: string,
  { isFirstMessage = false }: { isFirstMessage?: boolean } = {}
): Promise<{ delivered: string[]; failed: string[] }> {
  const numbers = getAgentNumbers();
  const delivered: string[] = [];
  const failed: string[] = [];

  const who = session.visitorName || 'Website visitor';
  const header = isFirstMessage
    ? `New chat [#${session.code}] — ${who}` +
      (session.visitorEmail ? `\n${session.visitorEmail}` : '') +
      (session.visitorPhone ? `\n${session.visitorPhone}` : '')
    : `[#${session.code}] ${who}`;

  const footer = isFirstMessage ? `\n\nReply "#${session.code} your message" to answer.` : '';
  const text = truncate(`${header}\n\n${body}${footer}`);

  for (const number of numbers) {
    try {
      await sendSms(number, text);
      delivered.push(number);
    } catch (error) {
      failed.push(number);
      console.error(`chat: SMS to ${number} failed`, error);
    }
  }

  return { delivered, failed };
}
