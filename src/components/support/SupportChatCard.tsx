import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, MessageCircle, Send, Smartphone, X } from 'lucide-react';
import {
  ApiError,
  ChatMessage,
  ChatSessionHandle,
  clearChatSession,
  closeChat,
  loadChatSession,
  pollChatMessages,
  saveChatSession,
  sendChatMessage,
  startChat,
} from '../../lib/supportApi';

/** How often the open transcript checks for a technician's reply. */
const POLL_INTERVAL_MS = 4000;

const emptyIntro = { name: '', email: '', phone: '', message: '', website: '' };

function formatTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function SupportChatCard() {
  const [intro, setIntro] = useState(emptyIntro);
  const [session, setSession] = useState<ChatSessionHandle | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<'open' | 'closed'>('open');
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const transcriptRef = useRef<HTMLDivElement | null>(null);
  /**
   * Poll cursor. Only ever advanced from a poll response, never from a message
   * we added locally: a technician's reply can be written a moment *before* the
   * message we just sent, and advancing past our own send would step over it.
   * Re-fetching a message we already have is harmless — merge dedupes by id.
   */
  const sinceRef = useRef<string>('');

  const mergeMessages = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const fresh = incoming.filter((m) => !seen.has(m.id));
      if (fresh.length === 0) return prev;
      return [...prev, ...fresh].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    });
  }, []);

  // Restore a conversation from earlier in this tab.
  useEffect(() => {
    const stored = loadChatSession();
    if (stored) setSession(stored);
  }, []);

  // Poll for technician replies while the chat is open and the tab is visible.
  useEffect(() => {
    if (!session || status === 'closed') return;

    let cancelled = false;

    const tick = async () => {
      if (document.hidden) return;
      try {
        const result = await pollChatMessages(session, sinceRef.current || undefined);
        if (cancelled) return;
        mergeMessages(result.messages);
        const newest = result.messages[result.messages.length - 1];
        if (newest && newest.createdAt > sinceRef.current) sinceRef.current = newest.createdAt;
        setStatus(result.status);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          clearChatSession();
          setSession(null);
          setMessages([]);
          sinceRef.current = '';
          setError('That chat session ended. Start a new one below.');
        }
        // Transient network blips are ignored — the next tick retries.
      }
    };

    void tick();
    const timer = window.setInterval(() => void tick(), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [session, status, mergeMessages]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStarting(true);
    try {
      const result = await startChat(intro);
      const handle: ChatSessionHandle = {
        sessionId: result.sessionId,
        token: result.token,
        code: result.code,
      };
      saveChatSession(handle);
      setSession(handle);
      setStatus('open');
      setMessages([]);
      sinceRef.current = '';
      mergeMessages(result.messages);
      setIntro(emptyIntro);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'We could not start the chat. Please try again.'
      );
    } finally {
      setStarting(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !draft.trim()) return;

    const body = draft.trim();
    setError('');
    setSending(true);
    try {
      const result = await sendChatMessage(session, body);
      setDraft('');
      if (result.message) mergeMessages([result.message]);
      if (!result.deliveredToAgent) {
        setError('Saved, but we could not text a technician just now. Call us if it is urgent.');
      }
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 409)) {
        clearChatSession();
        setSession(null);
        setMessages([]);
        sinceRef.current = '';
      }
      setError(err instanceof ApiError ? err.message : 'That message did not send. Try again.');
    } finally {
      setSending(false);
    }
  };

  const handleEnd = async () => {
    if (session) await closeChat(session);
    clearChatSession();
    setSession(null);
    setMessages([]);
    setDraft('');
    setStatus('open');
    setError('');
    sinceRef.current = '';
  };

  return (
    <div
      className="bg-white rounded-2xl shadow-lg overflow-hidden"
      style={{ border: '1px solid rgba(21,34,50,0.07)' }}
    >
      <div
        className="flex items-start gap-4 p-6 sm:p-8 pb-5"
        style={{ borderBottom: '1px solid rgba(21,34,50,0.07)' }}
      >
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(94,188,103,0.14)' }}
        >
          <MessageCircle size={20} style={{ color: '#5EBC67' }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className="text-xl sm:text-2xl leading-tight"
            style={{ fontFamily: "'Staatliches', 'Impact', sans-serif", color: '#152232' }}
          >
            Live chat
          </h3>
          <p className="text-sm mt-1 flex items-center gap-1.5" style={{ color: 'rgba(21,34,50,0.6)' }}>
            <Smartphone size={14} style={{ color: '#5EBC67' }} />
            Your message texts an on-call technician. Their reply lands right here.
          </p>
        </div>
        {session && (
          <button
            type="button"
            onClick={() => void handleEnd()}
            className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg transition-colors shrink-0"
            style={{ color: 'rgba(21,34,50,0.6)', border: '1px solid rgba(21,34,50,0.15)' }}
          >
            <X size={14} />
            End
          </button>
        )}
      </div>

      {!session ? (
        <form onSubmit={handleStart} className="p-6 sm:p-8 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="chat-name" className="block text-sm font-medium mb-2" style={{ color: 'rgba(21,34,50,0.75)' }}>
                Your name <span style={{ color: '#39CCCC' }}>*</span>
              </label>
              <input
                id="chat-name"
                type="text"
                value={intro.name}
                onChange={(e) => setIntro({ ...intro, name: e.target.value })}
                placeholder="John Smith"
                maxLength={100}
                required
                className="input-light"
              />
            </div>
            <div>
              <label htmlFor="chat-email" className="block text-sm font-medium mb-2" style={{ color: 'rgba(21,34,50,0.75)' }}>
                Email <span style={{ color: '#39CCCC' }}>*</span>
              </label>
              <input
                id="chat-email"
                type="email"
                value={intro.email}
                onChange={(e) => setIntro({ ...intro, email: e.target.value })}
                placeholder="john@company.com"
                maxLength={254}
                required
                className="input-light"
              />
            </div>
          </div>

          <div>
            <label htmlFor="chat-phone" className="block text-sm font-medium mb-2" style={{ color: 'rgba(21,34,50,0.75)' }}>
              Phone <span style={{ color: 'rgba(21,34,50,0.4)' }}>(optional)</span>
            </label>
            <input
              id="chat-phone"
              type="tel"
              value={intro.phone}
              onChange={(e) => setIntro({ ...intro, phone: e.target.value })}
              placeholder="(954) 555-0100"
              maxLength={40}
              className="input-light"
            />
            <p className="text-xs mt-1.5" style={{ color: 'rgba(21,34,50,0.5)' }}>
              So the technician can call you if it is faster than typing.
            </p>
          </div>

          <div>
            <label htmlFor="chat-message" className="block text-sm font-medium mb-2" style={{ color: 'rgba(21,34,50,0.75)' }}>
              How can we help? <span style={{ color: '#39CCCC' }}>*</span>
            </label>
            <textarea
              id="chat-message"
              value={intro.message}
              onChange={(e) => setIntro({ ...intro, message: e.target.value })}
              placeholder="Our office wifi keeps dropping every few minutes."
              rows={3}
              maxLength={1000}
              required
              className="input-light resize-none"
            />
          </div>

          {/* Honeypot */}
          <input
            type="text"
            name="website"
            value={intro.website}
            onChange={(e) => setIntro({ ...intro, website: e.target.value })}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
          />

          {error && <ChatError message={error} />}

          <button
            type="submit"
            disabled={starting}
            className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5"
            style={{ background: '#5EBC67', boxShadow: '0 4px 12px rgba(94,188,103,0.3)' }}
          >
            {starting ? 'Texting a technician…' : 'Start chat'}
          </button>
        </form>
      ) : (
        <div className="flex flex-col">
          <div
            ref={transcriptRef}
            className="p-5 sm:p-6 space-y-3 overflow-y-auto"
            style={{ height: 360, background: '#f8fafb' }}
            role="log"
            aria-live="polite"
            aria-label="Chat transcript"
          >
            {messages.map((message) =>
              message.sender === 'system' ? (
                <p
                  key={message.id}
                  className="text-center text-xs py-1"
                  style={{ color: 'rgba(21,34,50,0.45)' }}
                >
                  {message.body}
                </p>
              ) : (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'visitor' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="max-w-[80%]">
                    <div
                      className="rounded-2xl px-4 py-2.5 text-sm"
                      style={
                        message.sender === 'visitor'
                          ? { background: '#39CCCC', color: 'white', borderBottomRightRadius: 4 }
                          : {
                              background: 'white',
                              color: '#152232',
                              border: '1px solid rgba(21,34,50,0.08)',
                              borderBottomLeftRadius: 4,
                            }
                      }
                    >
                      <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    </div>
                    <p
                      className={`text-[11px] mt-1 ${message.sender === 'visitor' ? 'text-right' : 'text-left'}`}
                      style={{ color: 'rgba(21,34,50,0.4)' }}
                    >
                      {message.sender === 'visitor' ? 'You' : 'New Wave IT'} · {formatTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              )
            )}

            {messages.length > 0 && messages[messages.length - 1].sender === 'visitor' && status === 'open' && (
              <p className="text-center text-xs pt-1" style={{ color: 'rgba(21,34,50,0.45)' }}>
                Texted to an on-call technician — replies appear here.
              </p>
            )}
          </div>

          {status === 'closed' ? (
            <div className="p-5 sm:p-6 text-center" style={{ borderTop: '1px solid rgba(21,34,50,0.07)' }}>
              <p className="text-sm mb-3" style={{ color: 'rgba(21,34,50,0.6)' }}>
                This chat has been closed.
              </p>
              <button
                type="button"
                onClick={() => void handleEnd()}
                className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{ color: '#39CCCC', border: '1px solid #39CCCC' }}
              >
                Start a new chat
              </button>
            </div>
          ) : (
            <form onSubmit={handleSend} className="p-4 sm:p-5" style={{ borderTop: '1px solid rgba(21,34,50,0.07)' }}>
              {error && (
                <div className="mb-3">
                  <ChatError message={error} />
                </div>
              )}
              <div className="flex gap-2">
                <label htmlFor="chat-draft" className="sr-only">
                  Message
                </label>
                <input
                  id="chat-draft"
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type your message…"
                  maxLength={1000}
                  className="input-light flex-1"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  aria-label="Send message"
                  className="px-4 rounded-lg text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: '#39CCCC' }}
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function ChatError({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-2 p-3 rounded-lg text-sm"
      style={{ background: 'rgba(255,68,68,0.08)', color: '#c53030' }}
      role="alert"
    >
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
