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

const superOpsPortalUrl = import.meta.env.VITE_SUPEROPS_PORTAL_URL || 'https://super-ops.newwaveitfl.com';

const statusStyles: Record<PortalTicket['status'], { label: string; color: string; icon: typeof Clock }> = {
  open: { label: 'Open', color: 'var(--nw-signal-cyan)', icon: AlertCircle },
  'in-progress': { label: 'In progress', color: '#b54708', icon: Clock },
  resolved: { label: 'Resolved', color: 'var(--nw-continuity-green)', icon: CheckCircle },
  closed: { label: 'Closed', color: 'var(--nw-slate)', icon: MessageCircle },
};

const priorityColors: Record<PortalTicket['priority'], string> = {
  critical: '#b42318',
  high: '#b54708',
  medium: 'var(--nw-tide-blue)',
  low: 'var(--nw-slate)',
};

function formatDate(value: string): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function priorityTextColor(priority: PortalTicket['priority']): string {
  return priority === 'critical' || priority === 'high' ? 'var(--nw-cloud-white)' : 'var(--nw-current-navy)';
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
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        clearPortalSession();
        setSession(null);
        setStep('email');
        setError('Your session expired. Please sign in again.');
      } else {
        setError(requestError instanceof ApiError ? requestError.message : 'We could not load your tickets.');
      }
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  useEffect(() => {
    const stored = loadPortalSession();
    if (!stored) return;
    setSession(stored);
    setEmail(stored.email);
    setStep('signed-in');
    void loadTickets(stored);
  }, [loadTickets]);

  const handleRequestCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await requestLoginCode(email);
      setStep('code');
      setNotice(`We sent a 6-digit code to ${email}. It expires in 10 minutes.`);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'We could not send the code.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await verifyLoginCode(email, code);
      const next: PortalSession = { token: result.token, email: result.email, expiresAt: result.expiresAt };
      savePortalSession(next);
      setSession(next);
      setStep('signed-in');
      setCode('');
      setNotice('');
      void loadTickets(next);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'We could not verify that code.');
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
      <div className="rounded-lg p-6 sm:p-8 nw-surface">
        <div className="mb-6 flex items-start gap-4">
          <div className="nw-icon-signal h-11 w-11 shrink-0">
            <LogIn size={20} />
          </div>
          <div className="flex-1">
            <h3 className="nw-display text-xl text-brand-navy sm:text-2xl">Customer login</h3>
            <p className="mt-1 text-sm text-[var(--nw-slate)]">Sign in with your email to see your live SuperOps tickets.</p>
          </div>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div>
              <label htmlFor="portal-email" className="mb-2 block text-sm font-medium text-brand-navy">Work email</label>
              <input id="portal-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" autoComplete="email" required className="input-light" />
              <p className="mt-2 text-xs text-[var(--nw-slate)]">We email you a one-time code. Nobody can pull up your tickets by guessing your address.</p>
            </div>
            {error ? <InlineError message={error} /> : null}
            <button type="submit" disabled={busy || !email} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">
              {busy ? 'Sending code...' : 'Email me a sign-in code'}
            </button>
          </form>
        ) : null}

        {step === 'code' ? (
          <form onSubmit={handleVerify} className="space-y-4">
            {notice ? (
              <div className="flex items-start gap-2 rounded-md border p-3 text-sm text-brand-navy" style={{ background: 'var(--nw-cloud-white)', borderColor: 'var(--nw-tide-blue)' }}>
                <CheckCircle size={16} className="mt-0.5 shrink-0 text-brand-tide-blue" />
                <span>{notice}</span>
              </div>
            ) : null}
            <div>
              <label htmlFor="portal-code" className="mb-2 block text-sm font-medium text-brand-navy">6-digit code</label>
              <input
                id="portal-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                required
                className="w-full rounded-md px-4 py-3 text-center font-technical text-2xl outline-none transition-colors"
                style={{ background: 'var(--nw-pure-white)', border: `1px solid ${code.length === 6 ? 'var(--nw-signal-cyan)' : 'var(--nw-mist-gray)'}`, color: 'var(--nw-current-navy)' }}
              />
            </div>
            {error ? <InlineError message={error} /> : null}
            <button type="submit" disabled={busy || code.length !== 6} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">
              {busy ? 'Verifying...' : 'View my tickets'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setCode('');
                setError('');
                setNotice('');
              }}
              className="flex w-full items-center justify-center gap-1.5 py-2 text-sm text-[var(--nw-slate)] transition-colors hover:text-brand-tide-blue"
            >
              <ArrowLeft size={14} />
              Use a different email
            </button>
          </form>
        ) : null}

        {step === 'signed-in' && session ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md p-3" style={{ background: 'color-mix(in srgb, var(--nw-continuity-green) 14%, transparent)' }}>
              <span className="flex items-center gap-2 text-sm text-brand-navy">
                <ShieldCheck size={16} className="text-brand-green" />
                Signed in as <strong>{session.email}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => void loadTickets(session)} disabled={loadingTickets} className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-60">
                  <RefreshCw size={14} className={loadingTickets ? 'animate-spin' : ''} />
                  Refresh
                </button>
                <button type="button" onClick={() => void handleSignOut()} className="btn-secondary px-3 py-1.5 text-sm">Sign out</button>
              </div>
            </div>

            {error ? <InlineError message={error} /> : null}

            {loadingTickets && tickets.length === 0 ? (
              <TicketSkeleton />
            ) : tickets.length === 0 && !error ? (
              <div className="rounded-md p-8 text-center nw-panel-muted">
                <Ticket size={28} className="mx-auto mb-3 text-[var(--nw-slate)]" />
                <p className="font-medium text-brand-navy">No tickets on file</p>
                <p className="mt-1 text-sm text-[var(--nw-slate)]">Nothing open under {session.email}. Email us or start a chat and we will open one.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {tickets.map((ticket) => {
                  const status = statusStyles[ticket.status] ?? statusStyles.open;
                  const StatusIcon = status.icon;
                  const priorityColor = priorityColors[ticket.priority] ?? 'var(--nw-slate)';
                  return (
                    <li key={ticket.id} className="rounded-md p-5 nw-panel-muted">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <StatusIcon size={18} style={{ color: status.color }} className="mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <h4 className="truncate font-semibold text-brand-navy">{ticket.subject}</h4>
                            <p className="nw-meta mt-0.5 text-xs text-[var(--nw-slate)]">
                              {ticket.displayId ? `#${ticket.displayId}` : `#${ticket.id}`}
                              {ticket.technician ? ` - ${ticket.technician}` : ''}
                            </p>
                          </div>
                        </div>
                        <span className="rounded-md px-2.5 py-1 text-xs font-semibold capitalize" style={{ background: priorityColor, color: priorityTextColor(ticket.priority) }}>
                          {ticket.priority}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t pt-2 text-xs text-[var(--nw-slate)]" style={{ borderColor: 'var(--nw-mist-gray)' }}>
                        <span className="font-semibold" style={{ color: status.color }}>{status.label}</span>
                        <span>Opened {formatDate(ticket.createdAt)}</span>
                        <span>Updated {formatDate(ticket.updatedAt)}</span>
                        {ticket.resolutionDueAt ? <span>Due {formatDate(ticket.resolutionDueAt)}</span> : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      <a href={superOpsPortalUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-4 rounded-lg p-5 transition-colors hover:bg-[var(--nw-pure-white)] nw-panel-muted">
        <span>
          <span className="block font-semibold text-brand-navy">Open the full SuperOps portal</span>
          <span className="mt-0.5 block text-sm text-[var(--nw-slate)]">Reply on a ticket, upload files, view invoices, and manage your assets.</span>
        </span>
        <ExternalLink size={20} className="shrink-0 text-brand-tide-blue" />
      </a>
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-[#fef3f2] p-3 text-sm text-[#b42318]" role="alert">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function TicketSkeleton() {
  return (
    <ul className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <li key={index} className="rounded-md p-5 nw-panel-muted">
          <div className="mb-3 h-4 w-2/3 rounded" style={{ background: 'var(--nw-mist-gray)' }} />
          <div className="h-3 w-1/3 rounded" style={{ background: 'var(--nw-mist-gray)' }} />
        </li>
      ))}
    </ul>
  );
}
