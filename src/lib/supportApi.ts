/**
 * Client for the /api/support/* routes.
 *
 * Tokens live in sessionStorage rather than localStorage so a portal or chat
 * session ends when the tab does — support machines are often shared.
 */

export interface PortalTicket {
  id: string;
  displayId: string;
  subject: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  ticketType: string;
  createdAt: string;
  updatedAt: string;
  technician: string;
  resolutionDueAt: string | null;
}

export interface ChatMessage {
  id: string;
  sender: 'visitor' | 'agent' | 'system';
  body: string;
  createdAt: string;
}

export interface PortalSession {
  token: string;
  email: string;
  expiresAt: string;
}

export interface ChatSessionHandle {
  sessionId: string;
  token: string;
  code: string;
}

const PORTAL_KEY = 'nwit.support.portal';
const CHAT_KEY = 'nwit.support.chat';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body ?? {}),
    });
  } catch {
    throw new ApiError('We could not reach the server. Check your connection and try again.', 0);
  }

  let payload: { error?: string } & Record<string, unknown> = {};
  try {
    payload = await response.json();
  } catch {
    // Non-JSON body — fall through to the status-based message below.
  }

  if (!response.ok) {
    throw new ApiError(payload.error || 'Something went wrong. Please try again.', response.status);
  }

  return payload as unknown as T;
}

// --- Session storage -------------------------------------------------------

function readStored<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStored(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private-mode browsers can refuse writes; the feature still works for
    // the life of the page, it just will not survive a refresh.
  }
}

function clearStored(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function loadPortalSession(): PortalSession | null {
  const stored = readStored<PortalSession>(PORTAL_KEY);
  if (!stored?.token || !stored.expiresAt) return null;
  if (new Date(stored.expiresAt).getTime() <= Date.now()) {
    clearStored(PORTAL_KEY);
    return null;
  }
  return stored;
}

export function savePortalSession(session: PortalSession): void {
  writeStored(PORTAL_KEY, session);
}

export function clearPortalSession(): void {
  clearStored(PORTAL_KEY);
}

export function loadChatSession(): ChatSessionHandle | null {
  const stored = readStored<ChatSessionHandle>(CHAT_KEY);
  return stored?.sessionId && stored.token ? stored : null;
}

export function saveChatSession(session: ChatSessionHandle): void {
  writeStored(CHAT_KEY, session);
}

export function clearChatSession(): void {
  clearStored(CHAT_KEY);
}

// --- Email -----------------------------------------------------------------

export interface SupportEmailPayload {
  name: string;
  email: string;
  company: string;
  phone: string;
  subject: string;
  message: string;
  urgency: string;
  website: string;
}

export function sendSupportEmail(payload: SupportEmailPayload) {
  return post<{ success: true; id?: string }>('/api/support/send-email', payload);
}

// --- Customer portal -------------------------------------------------------

export function requestLoginCode(email: string) {
  return post<{ success: true; expiresInSeconds: number }>('/api/support/request-code', { email });
}

export function verifyLoginCode(email: string, code: string) {
  return post<{ success: true; token: string; email: string; expiresAt: string }>(
    '/api/support/verify-code',
    { email, code }
  );
}

export function fetchTickets(token: string) {
  return post<{
    success: true;
    email: string;
    tickets: PortalTicket[];
    count: number;
    totalCount: number;
    hasMore: boolean;
  }>('/api/support/tickets', {}, token);
}

export function endPortalSession(token: string) {
  return post<{ success: true }>('/api/support/logout', {}, token).catch(() => ({ success: true }));
}

// --- Live chat -------------------------------------------------------------

export function startChat(payload: {
  name: string;
  email: string;
  phone: string;
  message: string;
  website: string;
}) {
  return post<{
    success: true;
    sessionId: string;
    token: string;
    code: string;
    messages: ChatMessage[];
  }>('/api/support/chat/start', payload);
}

export function sendChatMessage(session: ChatSessionHandle, message: string) {
  return post<{ success: true; message: ChatMessage | null; deliveredToAgent: boolean }>(
    '/api/support/chat/send',
    { sessionId: session.sessionId, token: session.token, message }
  );
}

export function pollChatMessages(session: ChatSessionHandle, since?: string) {
  return post<{ success: true; status: 'open' | 'closed'; messages: ChatMessage[] }>(
    '/api/support/chat/messages',
    { sessionId: session.sessionId, token: session.token, since }
  );
}

export function closeChat(session: ChatSessionHandle) {
  return post<{ success: true }>('/api/support/chat/close', {
    sessionId: session.sessionId,
    token: session.token,
  }).catch(() => ({ success: true }));
}
