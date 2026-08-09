import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  ExternalLink,
  LogIn,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Ticket,
} from 'lucide-react';
import {
  ApiError,
  PortalSession,
  PortalTicket,
  clearPortalSession,
  endPortalSession,
  fetchTickets,
  loadPortalSession,
  requestLoginCode,
  savePortalSession,
  verifyLoginCode,
} from '../../lib/supportApi';

/** Full SuperOps client portal — everything the embedded ticket list does not cover. */
const SUPEROPS_PORTAL_URL =
  import.meta.env.VITE_SUPEROPS_PORTAL_URL || 'https://super-ops.newwaveitfl.com';

const STATUS_STYLES: Record<PortalTicket['status'], { label: string; color: string; icon: typeof Clock }> = {
  open: { label: 'Open', color: '#39CCCC', icon: AlertCircle },
  'in-progress': { label: 'In progress', color: '#FFA500', icon: Clock },
  resolved: { label: 'Resolved', color: '#5EBC67', icon: CheckCircle },
  closed: { label: 'Closed', color: '#8a94a0', icon: MessageCircle },
};

const PRIORITY_COLORS: Record<PortalTicket['priority'], string> = {
  critical: '#FF4444',
  high: '#FF8800',
  medium: '#39CCCC',
  low: '#5EBC67',
};

function formatDate(value: string): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

type Step = 'email' | 'code' | 'signed-in';

export default function CustomerPortalCard() {
  const [step, setStep] = useState<Step>('email');
  const [session, setSession] = useState<PortalSession | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [tickets, setTickets] = useState<PortalTicket[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadTickets = useCallback(async (activeSession: PortalSession) => {
    setLoadingTickets(true);
    setError('');
    try {
      const result = await fetchTickets(activeSession.token);
      setTickets(result.tickets);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearPortalSession();
        setSession(null);
        setStep('email');
        setError('Your session expired. Please sign in again.');
      } else {
        setError(err instanceof ApiError ? err.message : 'We could not load your tickets.');
      }
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  // Restore a session left over from earlier in this tab.
  useEffect(() => {
    const stored = loadPortalSession();
    if (!stored) return;
    setSession(stored);
    setEmail(stored.email);
    setStep('signed-in');
    void loadTickets(stored);
  }, [loadTickets]);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await requestLoginCode(email);
      setStep('code');
      setNotice(`We sent a 6-digit code to ${email}. It expires in 10 minutes.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not send the code.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await verifyLoginCode(email, code);
      const next: PortalSession = {
        token: result.token,
        email: result.email,
        expiresAt: result.expiresAt,
      };
      savePortalSession(next);
      setSession(next);
      setStep('signed-in');
      setCode('');
      setNotice('');
      void loadTickets(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not verify that code.');
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    if (session) await endPortalSession(session.token);
    clearPortalSession();
    setSession(null);
    setTickets([]);
    setCode('');
    setError('');
    setNotice('');
    setStep('email');
  };

  return (
    <div className="space-y-5">
      <div
        className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg"
        style={{ border: '1px solid rgba(21,34,50,0.07)' }}
      >
        <div className="flex items-start gap-4 mb-6">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(57,204,204,0.12)' }}
          >
            <LogIn size={20} style={{ color: '#39CCCC' }} />
          </div>
          <div className="flex-1">
            <h3
              className="text-xl sm:text-2xl leading-tight"
              style={{ fontFamily: "'Staatliches', 'Impact', sans-serif", color: '#152232' }}
            >
              Customer login
            </h3>
            <p className="text-sm mt-1" style={{ color: 'rgba(21,34,50,0.6)' }}>
              Sign in with your email to see your live SuperOps tickets.
            </p>
          </div>
        </div>

        {step === 'email' && (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div>
              <label
                htmlFor="portal-email"
                className="block text-sm font-medium mb-2"
                style={{ color: 'rgba(21,34,50,0.75)' }}
              >
                Work email
              </label>
              <input
                id="portal-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                required
                className="input-light"
              />
              <p className="text-xs mt-2" style={{ color: 'rgba(21,34,50,0.5)' }}>
                We email you a one-time code — no password to remember, and nobody can pull up your
                tickets by guessing your address.
              </p>
            </div>

            {error && <InlineError message={error} />}

            <button
              type="submit"
              disabled={busy || !email}
              className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5"
              style={{ background: '#39CCCC', boxShadow: '0 4px 12px rgba(57,204,204,0.3)' }}
            >
              {busy ? 'Sending code…' : 'Email me a sign-in code'}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={handleVerify} className="space-y-4">
            {notice && (
              <div
                className="flex items-start gap-2 p-3 rounded-lg text-sm"
                style={{ background: 'rgba(57,204,204,0.1)', color: '#0f7b7b' }}
              >
                <CheckCircle size={16} className="mt-0.5 shrink-0" />
                <span>{notice}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="portal-code"
                className="block text-sm font-medium mb-2"
                style={{ color: 'rgba(21,34,50,0.75)' }}
              >
                6-digit code
              </label>
              <input
                id="portal-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                required
                className="w-full rounded-lg px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] outline-none transition-colors"
                style={{
                  background: 'white',
                  border: `1.5px solid ${code.length === 6 ? '#39CCCC' : 'rgba(21,34,50,0.12)'}`,
                  color: '#152232',
                }}
              />
            </div>

            {error && <InlineError message={error} />}

            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5"
              style={{ background: '#39CCCC', boxShadow: '0 4px 12px rgba(57,204,204,0.3)' }}
            >
              {busy ? 'Verifying…' : 'View my tickets'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('email');
                setCode('');
                setError('');
                setNotice('');
              }}
              className="w-full flex items-center justify-center gap-1.5 text-sm py-2 transition-colors"
              style={{ color: 'rgba(21,34,50,0.6)' }}
            >
              <ArrowLeft size={14} />
              Use a different email
            </button>
          </form>
        )}

        {step === 'signed-in' && session && (
          <div className="space-y-4">
            <div
              className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg"
              style={{ background: 'rgba(94,188,103,0.08)' }}
            >
              <span className="flex items-center gap-2 text-sm" style={{ color: '#152232' }}>
                <ShieldCheck size={16} style={{ color: '#5EBC67' }} />
                Signed in as <strong>{session.email}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void loadTickets(session)}
                  disabled={loadingTickets}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                  style={{ color: '#39CCCC', border: '1px solid #39CCCC' }}
                >
                  <RefreshCw size={14} className={loadingTickets ? 'animate-spin' : ''} />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="text-sm px-3 py-1.5 rounded-lg transition-colors"
                  style={{ color: 'rgba(21,34,50,0.6)', border: '1px solid rgba(21,34,50,0.15)' }}
                >
                  Sign out
                </button>
              </div>
            </div>

            {error && <InlineError message={error} />}

            {loadingTickets && tickets.length === 0 ? (
              <TicketSkeleton />
            ) : tickets.length === 0 && !error ? (
              <div className="rounded-2xl p-8 text-center" style={{ background: '#f8fafb' }}>
                <Ticket size={28} style={{ color: 'rgba(21,34,50,0.3)' }} className="mx-auto mb-3" />
                <p className="font-medium" style={{ color: '#152232' }}>
                  No tickets on file
                </p>
                <p className="text-sm mt-1" style={{ color: 'rgba(21,34,50,0.55)' }}>
                  Nothing open under {session.email}. Email us or start a chat and we will open one.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {tickets.map((ticket) => {
                  const status = STATUS_STYLES[ticket.status] ?? STATUS_STYLES.open;
                  const StatusIcon = status.icon;
                  return (
                    <li
                      key={ticket.id}
                      className="rounded-2xl p-5 transition-shadow hover:shadow-md"
                      style={{ border: '1px solid rgba(21,34,50,0.1)' }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-start gap-3 min-w-0">
                          <StatusIcon size={18} style={{ color: status.color }} className="mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <h4 className="font-semibold truncate" style={{ color: '#152232' }}>
                              {ticket.subject}
                            </h4>
                            <p className="text-xs mt-0.5" style={{ color: 'rgba(21,34,50,0.5)' }}>
                              {ticket.displayId ? `#${ticket.displayId}` : `#${ticket.id}`}
                              {ticket.technician ? ` · ${ticket.technician}` : ''}
                            </p>
                          </div>
                        </div>
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-semibold text-white shrink-0 capitalize"
                          style={{ background: PRIORITY_COLORS[ticket.priority] ?? '#39CCCC' }}
                        >
                          {ticket.priority}
                        </span>
                      </div>
                      <div
                        className="flex flex-wrap gap-x-4 gap-y-1 text-xs pt-2"
                        style={{ color: 'rgba(21,34,50,0.55)', borderTop: '1px solid rgba(21,34,50,0.06)' }}
                      >
                        <span style={{ color: status.color, fontWeight: 600 }}>{status.label}</span>
                        <span>Opened {formatDate(ticket.createdAt)}</span>
                        <span>Updated {formatDate(ticket.updatedAt)}</span>
                        {ticket.resolutionDueAt && <span>Due {formatDate(ticket.resolutionDueAt)}</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      <a
        href={SUPEROPS_PORTAL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between gap-4 rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5"
        style={{
          background: 'linear-gradient(135deg, rgba(57,204,204,0.1) 0%, rgba(94,188,103,0.1) 100%)',
          border: '1px solid rgba(57,204,204,0.25)',
        }}
      >
        <div>
          <p className="font-semibold" style={{ color: '#152232' }}>
            Open the full SuperOps portal
          </p>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(21,34,50,0.6)' }}>
            Reply on a ticket, upload files, view invoices, and manage your assets.
          </p>
        </div>
        <ExternalLink size={20} style={{ color: '#39CCCC' }} className="shrink-0" />
      </a>
    </div>
  );
}

function InlineError({ message }: { message: string }) {
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

function TicketSkeleton() {
  return (
    <ul className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="rounded-2xl p-5 animate-pulse"
          style={{ border: '1px solid rgba(21,34,50,0.08)' }}
        >
          <div className="h-4 w-2/3 rounded mb-3" style={{ background: 'rgba(21,34,50,0.08)' }} />
          <div className="h-3 w-1/3 rounded" style={{ background: 'rgba(21,34,50,0.06)' }} />
        </li>
      ))}
    </ul>
  );
}
