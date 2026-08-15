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

const pollIntervalMs = 4000;
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
  const sinceRef = useRef('');

  const mergeMessages = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((previous) => {
      const seen = new Set(previous.map((message) => message.id));
      const fresh = incoming.filter((message) => !seen.has(message.id));
      return fresh.length === 0
        ? previous
        : [...previous, ...fresh].sort((first, second) => first.createdAt.localeCompare(second.createdAt));
    });
  }, []);

  useEffect(() => {
    const stored = loadChatSession();
    if (stored) setSession(stored);
  }, []);

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
      } catch (requestError) {
        if (cancelled) return;
        if (requestError instanceof ApiError && requestError.status === 401) {
          clearChatSession();
          setSession(null);
          setMessages([]);
          sinceRef.current = '';
          setError('That chat session ended. Start a new one below.');
        }
      }
    };

    void tick();
    const timer = window.setInterval(() => void tick(), pollIntervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [mergeMessages, session, status]);

  useEffect(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [messages]);

  const handleStart = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setStarting(true);
    try {
      const result = await startChat(intro);
      const handle: ChatSessionHandle = { sessionId: result.sessionId, token: result.token, code: result.code };
      saveChatSession(handle);
      setSession(handle);
      setStatus('open');
      setMessages([]);
      sinceRef.current = '';
      mergeMessages(result.messages);
      setIntro(emptyIntro);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'We could not start the chat. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session || !draft.trim()) return;

    setError('');
    setSending(true);
    try {
      const result = await sendChatMessage(session, draft.trim());
      setDraft('');
      if (result.message) mergeMessages([result.message]);
      if (!result.deliveredToAgent) setError('Saved, but we could not text a technician just now. Call us if it is urgent.');
    } catch (requestError) {
      if (requestError instanceof ApiError && (requestError.status === 401 || requestError.status === 409)) {
        clearChatSession();
        setSession(null);
        setMessages([]);
        sinceRef.current = '';
      }
      setError(requestError instanceof ApiError ? requestError.message : 'That message did not send. Try again.');
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
    <div className="overflow-hidden rounded-lg nw-surface">
      <div className="flex items-start gap-4 border-b p-6 pb-5 sm:p-8 sm:pb-5" style={{ borderColor: 'var(--nw-mist-gray)' }}>
        <div className="nw-icon-signal h-11 w-11 shrink-0">
          <MessageCircle size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="nw-display text-xl text-brand-navy sm:text-2xl">Live chat</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--nw-slate)]">
            <Smartphone size={14} className="text-brand-tide-blue" />
            Your message texts an on-call technician. Their reply lands right here.
          </p>
        </div>
        {session ? (
          <button type="button" onClick={() => void handleEnd()} className="btn-secondary shrink-0 px-3 py-1.5 text-sm">
            <X size={14} />
            End
          </button>
        ) : null}
      </div>

      {!session ? (
        <form onSubmit={handleStart} className="space-y-4 p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="chat-name" className="mb-2 block text-sm font-medium text-brand-navy">Your name <span className="text-brand-cyan">*</span></label>
              <input id="chat-name" type="text" value={intro.name} onChange={(event) => setIntro({ ...intro, name: event.target.value })} placeholder="John Smith" maxLength={100} required className="input-light" />
            </div>
            <div>
              <label htmlFor="chat-email" className="mb-2 block text-sm font-medium text-brand-navy">Email <span className="text-brand-cyan">*</span></label>
              <input id="chat-email" type="email" value={intro.email} onChange={(event) => setIntro({ ...intro, email: event.target.value })} placeholder="john@company.com" maxLength={254} required className="input-light" />
            </div>
          </div>
          <div>
            <label htmlFor="chat-phone" className="mb-2 block text-sm font-medium text-brand-navy">Phone <span className="text-[var(--nw-slate)]">(optional)</span></label>
            <input id="chat-phone" type="tel" value={intro.phone} onChange={(event) => setIntro({ ...intro, phone: event.target.value })} placeholder="(954) 555-0100" maxLength={40} className="input-light" />
            <p className="mt-1.5 text-xs text-[var(--nw-slate)]">So the technician can call you if it is faster than typing.</p>
          </div>
          <div>
            <label htmlFor="chat-message" className="mb-2 block text-sm font-medium text-brand-navy">How can we help? <span className="text-brand-cyan">*</span></label>
            <textarea id="chat-message" value={intro.message} onChange={(event) => setIntro({ ...intro, message: event.target.value })} placeholder="Our office wifi keeps dropping every few minutes." rows={3} maxLength={1000} required className="input-light resize-none" />
          </div>
          <input type="text" name="website" value={intro.website} onChange={(event) => setIntro({ ...intro, website: event.target.value })} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          {error ? <ChatError message={error} /> : null}
          <button type="submit" disabled={starting} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">
            {starting ? 'Texting a technician...' : 'Start chat'}
          </button>
        </form>
      ) : (
        <div className="flex flex-col">
          <div ref={transcriptRef} className="space-y-3 overflow-y-auto p-5 sm:p-6" style={{ height: 360, background: 'var(--nw-cloud-white)' }} role="log" aria-live="polite" aria-label="Chat transcript">
            {messages.map((message) =>
              message.sender === 'system' ? (
                <p key={message.id} className="nw-meta py-1 text-center text-xs text-[var(--nw-slate)]">{message.body}</p>
              ) : (
                <div key={message.id} className={`flex ${message.sender === 'visitor' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[80%]">
                    <div
                      className="rounded-lg px-4 py-2.5 text-sm"
                      style={
                        message.sender === 'visitor'
                          ? { background: 'var(--nw-signal-cyan)', color: 'var(--nw-deep-current)' }
                          : { background: 'var(--nw-pure-white)', color: 'var(--nw-current-navy)', border: '1px solid var(--nw-mist-gray)' }
                      }
                    >
                      <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    </div>
                    <p className={`mt-1 text-[11px] text-[var(--nw-slate)] ${message.sender === 'visitor' ? 'text-right' : 'text-left'}`}>
                      {message.sender === 'visitor' ? 'You' : 'New Wave IT'} - {formatTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              ),
            )}
            {messages.length > 0 && messages[messages.length - 1].sender === 'visitor' && status === 'open' ? (
              <p className="pt-1 text-center text-xs text-[var(--nw-slate)]">Texted to an on-call technician. Replies appear here.</p>
            ) : null}
          </div>

          {status === 'closed' ? (
            <div className="border-t p-5 text-center sm:p-6" style={{ borderColor: 'var(--nw-mist-gray)' }}>
              <p className="mb-3 text-sm text-[var(--nw-slate)]">This chat has been closed.</p>
              <button type="button" onClick={() => void handleEnd()} className="btn-secondary text-sm">Start a new chat</button>
            </div>
          ) : (
            <form onSubmit={handleSend} className="border-t p-4 sm:p-5" style={{ borderColor: 'var(--nw-mist-gray)' }}>
              {error ? <div className="mb-3"><ChatError message={error} /></div> : null}
              <div className="flex gap-2">
                <label htmlFor="chat-draft" className="sr-only">Message</label>
                <input id="chat-draft" type="text" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Type your message..." maxLength={1000} className="input-light flex-1" />
                <button type="submit" disabled={sending || !draft.trim()} aria-label="Send message" title="Send message" className="btn-primary px-4 disabled:cursor-not-allowed disabled:opacity-50">
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
    <div className="flex items-start gap-2 rounded-md bg-[#fef3f2] p-3 text-sm text-[#b42318]" role="alert">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
