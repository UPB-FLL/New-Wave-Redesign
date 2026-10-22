import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRightLeft, Link2, Link2Off, Pencil } from 'lucide-react';
import {
  getPartnerCustomer,
  linkClientAccount,
  listClientAccounts,
  partnerReportUrl,
  PartnerSignedOut,
  REPORT_LABELS,
  setPartnerCustomerStage,
  unlinkClientAccount,
  type ClientAccount,
  type PartnerAudit,
  type PartnerCustomer,
  type PartnerCustomerDetail,
  type ReportKind,
} from '../../lib/groundswellPartner';
import { isDriveLink, type ClientService } from '../../lib/groundswellValidation';
import { usePageMeta } from '../../lib/usePageMeta';
import { PartnerApp } from '../PartnerApp';
import { GROUNDSWELL_NAME, GROUNDSWELL_PATH, groundswellStagePath } from '../site';
import { CustomerWorkspace } from '../workspace/CustomerWorkspace';
import { CustomerForm } from './CustomerForm';
import { AUDIT_STATUS, customerStatus, STAGE_LABELS } from './customerStatus';

/**
 * One customer (noindex), a prospect or a client: its stage, its details with
 * an Edit link, "Became a client" (or the way back), a client's linked
 * accounts (one Link button per service, through Composio's hosted sign-in;
 * the browser comes back here with ?linked=<service>), then its three phases
 * (workspace/CustomerWorkspace.tsx): the audit, the plan against competitors
 * with its ad sets, and the integrated plan, each with its progress, reports,
 * downloads and data, started on their own one after another. Audits
 * delivered before reports moved into the app keep their Drive links below.
 * Everything gathered as a prospect stays on the page when it becomes a client.
 */

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-US') : null);

function Details({ customer, onEdit }: { customer: PartnerCustomer; onEdit: () => void }) {
  const rows: [string, string | null][] = [
    ['City', customer.city],
    ['Website', customer.website],
    ['Instagram', customer.instagram ? `@${customer.instagram}` : null],
    ['Competitors', customer.competitors.length ? customer.competitors.map((c) => c.name).join(', ') : null],
    ['Notes', customer.notes],
  ];
  return (
    <div className="gs-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-xl font-bold">Details</h2>
        <button type="button" onClick={onEdit} className="gs-btn gs-btn-secondary">
          <Pencil size={14} aria-hidden="true" /> Edit
        </button>
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[8rem_1fr] sm:gap-y-2">
        {rows
          .filter((pair): pair is [string, string] => Boolean(pair[1]))
          .map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-xs font-semibold uppercase tracking-wide gs-muted sm:pt-0.5">{label}</dt>
              <dd className="break-words">
                {label === 'Website' ? (
                  <a href={value} target="_blank" rel="noreferrer" className="gs-link">
                    {value.replace(/^https?:\/\//, '')}
                  </a>
                ) : (
                  value
                )}
              </dd>
            </div>
          ))}
      </dl>
    </div>
  );
}

/** Opens one stored report in a new tab through a short-lived link. */
export function ReportButtons({ reports, open }: { reports: { kind: ReportKind; name: string }[]; open: (kind: ReportKind) => Promise<string> }) {
  const [busy, setBusy] = useState<ReportKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const show = async (kind: ReportKind) => {
    setBusy(kind);
    setError(null);
    try {
      const url = await open(kind);
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open that report.');
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      {reports.map((r) => (
        <button key={r.kind} type="button" className="gs-link text-sm" disabled={busy !== null} onClick={() => void show(r.kind)}>
          {REPORT_LABELS[r.kind]} (PDF){busy === r.kind ? '…' : ''}
        </button>
      ))}
      {error ? <span className="text-sm text-red-700">{error}</span> : null}
    </div>
  );
}

function AuditCard({ audit }: { audit: PartnerAudit }) {
  const status = AUDIT_STATUS[audit.status] ?? AUDIT_STATUS.queued;
  const reports = audit.reports ?? [];
  // Audits delivered before reports moved into the app still carry Drive links.
  const legacy = reports.length
    ? []
    : [
        ['Summary', audit.summary_pdf_url],
        ['Slides', audit.deck_pdf_url],
        ['Full audit', audit.audit_pdf_url],
        ['Competitive benchmark', audit.benchmark_pdf_url ?? null],
        ['All files', audit.drive_folder_url],
      ].filter((pair): pair is [string, string] => isDriveLink(pair[1]));
  return (
    <li className="gs-card p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-bold">
          {audit.kind === 'benchmark' ? 'Audit and benchmark' : 'Audit'} · queued {when(audit.created_at)}
        </h3>
        <span className="gs-chip" style={{ color: status.color }}>
          {status.label}
        </span>
      </div>
      {audit.status === 'failed' ? <p className="mt-2 text-sm gs-muted">This audit didn’t finish. We’ve been notified and will follow up.</p> : null}
      {audit.status === 'done' && audit.completed_at ? <p className="mt-2 text-sm gs-muted">Reports delivered {when(audit.completed_at)}.</p> : null}
      {reports.length ? <ReportButtons reports={reports} open={(kind) => partnerReportUrl(audit.id, kind)} /> : null}
      {legacy.length ? (
        <p className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {legacy.map(([name, url]) => (
            <a key={name} href={url} target="_blank" rel="noreferrer" className="gs-link text-sm">
              {name} (Google Drive)
            </a>
          ))}
        </p>
      ) : null}
    </li>
  );
}

const ACCOUNT_STATUS: Record<ClientAccount['status'], { label: string; color: string }> = {
  none: { label: 'Not linked', color: 'var(--nw-slate)' },
  pending: { label: 'Waiting for sign-in', color: 'var(--gs-wait)' },
  active: { label: 'Linked', color: 'var(--gs-ok)' },
  failed: { label: 'Sign-in failed', color: 'var(--gs-bad)' },
  expired: { label: 'Sign-in expired', color: 'var(--gs-bad)' },
  disabled: { label: 'Turned off', color: 'var(--gs-bad)' },
};

/** How often, and for how long, a pending sign-in is asked about after the browser comes back. */
const PENDING_POLL_MS = 5_000;
const PENDING_POLLS = 24;

/** The calls the card makes: the partner portal's by default, the staff route's on the staff customer page. */
export interface AccountsApi {
  list: (customerId: string) => Promise<{ accounts: ClientAccount[]; available: boolean }>;
  link: (customerId: string, service: ClientService) => Promise<{ redirect_url: string; accounts: ClientAccount[] }>;
  unlink: (customerId: string, service: ClientService) => Promise<ClientAccount[]>;
}
const PARTNER_ACCOUNTS: AccountsApi = { list: listClientAccounts, link: linkClientAccount, unlink: unlinkClientAccount };

/** A client's accounts: one row per service with its state and a Link / Unlink button. */
export function AccountsCard({ customerId, poll = PENDING_POLL_MS, api = PARTNER_ACCOUNTS }: { customerId: string; poll?: number; api?: AccountsApi }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [accounts, setAccounts] = useState<ClientAccount[] | null>(null);
  const [available, setAvailable] = useState(true);
  const [busy, setBusy] = useState<ClientService | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const polls = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const result = await api.list(customerId);
      setAccounts(result.accounts);
      setAvailable(result.available);
      return result.accounts;
    } catch (err) {
      if (err instanceof PartnerSignedOut) navigate(GROUNDSWELL_PATH, { replace: true });
      else setError(err instanceof Error ? err.message : 'Could not load the linked accounts.');
      return null;
    }
  }, [customerId, navigate, api]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Back from a sign-in: say so once and clear the mark from the address.
  const linked = params.get('linked');
  useEffect(() => {
    if (!linked) return;
    setNotice('Back from the sign-in. Checking the connection…');
    polls.current = 0;
    const next = new URLSearchParams(params);
    next.delete('linked');
    setParams(next, { replace: true });
  }, [linked, params, setParams]);

  // While a sign-in is pending, ask again every few seconds for a couple of minutes.
  const pending = accounts?.some((a) => a.status === 'pending') ?? false;
  useEffect(() => {
    if (!pending || polls.current >= PENDING_POLLS) return;
    const timer = window.setTimeout(async () => {
      polls.current += 1;
      const next = await refresh();
      if (next && !next.some((a) => a.status === 'pending')) setNotice(next.some((a) => a.status === 'active') ? 'Linked.' : null);
    }, poll);
    return () => window.clearTimeout(timer);
  }, [pending, accounts, refresh, poll]);

  const link = async (service: ClientService) => {
    setBusy(service);
    setError(null);
    try {
      const { redirect_url } = await api.link(customerId, service);
      window.location.assign(redirect_url);
    } catch (err) {
      if (err instanceof PartnerSignedOut) navigate(GROUNDSWELL_PATH, { replace: true });
      else setError(err instanceof Error ? err.message : 'Could not start the sign-in.');
      setBusy(null);
    }
  };

  const unlink = async (service: ClientService) => {
    setBusy(service);
    setError(null);
    try {
      setAccounts(await api.unlink(customerId, service));
      setNotice('Unlinked.');
    } catch (err) {
      if (err instanceof PartnerSignedOut) navigate(GROUNDSWELL_PATH, { replace: true });
      else setError(err instanceof Error ? err.message : 'Could not unlink the account.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby="client-accounts-heading" className="gs-card mt-8 p-5 sm:p-6">
      <h2 id="client-accounts-heading" className="text-xl font-bold">
        Linked accounts
      </h2>
      <p className="mt-1 text-sm gs-muted">
        Sign in to the client’s own accounts with them, and its reports read real figures instead of public data. Credentials stay with the
        sign-in service; nothing is stored here.
      </p>
      {!available ? (
        <p className="gs-notice mt-3" role="status">
          Account linking isn’t switched on yet.
        </p>
      ) : null}
      {notice ? (
        <p className="gs-notice mt-3" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="gs-alert mt-3" role="alert">
          {error}
        </p>
      ) : null}
      {!accounts ? (
        <p aria-busy="true" className="mt-4 text-sm gs-muted">
          Loading…
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-[var(--nw-mist-gray)]" aria-label="Accounts">
          {accounts.map((a) => {
            const st = ACCOUNT_STATUS[a.status];
            return (
              <li key={a.service} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{a.label}</span>
                    <span className="gs-chip" style={{ color: st.color }}>
                      {st.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm gs-muted">{a.reason ?? a.brings}</p>
                </div>
                {a.status === 'active' ? (
                  <button type="button" className="gs-btn gs-btn-ghost" disabled={busy !== null} onClick={() => void unlink(a.service)} aria-label={`Unlink ${a.label}`}>
                    <Link2Off size={14} aria-hidden="true" /> Unlink
                  </button>
                ) : (
                  <button type="button" className="gs-btn gs-btn-secondary" disabled={busy !== null || !available} onClick={() => void link(a.service)} aria-label={`${a.status === 'none' ? 'Link' : 'Link again'} ${a.label}`}>
                    <Link2 size={14} aria-hidden="true" /> {busy === a.service ? 'Starting…' : a.status === 'none' ? 'Link' : 'Link again'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Customer({ id }: { id: string }) {
  const navigate = useNavigate();
  const { state } = useLocation() as { state?: { queued?: boolean } };
  const [data, setData] = useState<PartnerCustomerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [moving, setMoving] = useState(false);
  const [notice, setNotice] = useState<string | null>(state?.queued ? 'Queued. Phase 1 starts on its own within a minute; its reports will appear below.' : null);

  const refresh = useCallback(async () => {
    try {
      setData(await getPartnerCustomer(id));
    } catch (err) {
      if (err instanceof PartnerSignedOut) navigate(GROUNDSWELL_PATH, { replace: true });
      else setError(err instanceof Error ? err.message : 'Could not load this customer.');
    }
  }, [id, navigate]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const active = data?.audits.some((a) => a.status === 'queued' || a.status === 'running') ?? false;
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(timer);
  }, [active, refresh]);

  const signedOut = useCallback(() => navigate(GROUNDSWELL_PATH, { replace: true }), [navigate]);
  // Only audits delivered before reports moved into the app: they carry Drive links and no stored reports.
  const legacy = (data?.audits ?? []).filter((a) => !(a.reports ?? []).length && [a.summary_pdf_url, a.deck_pdf_url, a.audit_pdf_url, a.benchmark_pdf_url ?? null, a.drive_folder_url].some((u) => isDriveLink(u)));
  const status = customerStatus(data?.customer.latest ?? null);
  const stage = data?.customer.stage ?? 'prospect';
  const stageLabel = STAGE_LABELS[stage];

  const move = async () => {
    if (!data) return;
    const next = stage === 'client' ? 'prospect' : 'client';
    setMoving(true);
    setError(null);
    try {
      const customer = await setPartnerCustomerStage(data.customer.id, next);
      setData((d) => (d ? { ...d, customer } : d));
      setNotice(next === 'client' ? 'Now a client. Everything gathered as a prospect stays here.' : 'Back with the prospects.');
    } catch (err) {
      if (err instanceof PartnerSignedOut) navigate(GROUNDSWELL_PATH, { replace: true });
      else setError(err instanceof Error ? err.message : 'Could not move this customer.');
    } finally {
      setMoving(false);
    }
  };

  return (
    <>
      <Link to={groundswellStagePath(stage)} className="gs-link inline-flex items-center gap-1 text-sm">
        <ArrowLeft size={14} aria-hidden="true" /> {stage === 'client' ? 'All clients' : 'All prospects'}
      </Link>
      {error ? (
        <p className="gs-alert mt-4" role="alert">
          {error}
        </p>
      ) : null}
      {!data && !error ? (
        <p aria-busy="true" className="mt-4 text-sm gs-muted">
          Loading…
        </p>
      ) : null}
      {data ? (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{data.customer.business_name}</h1>
            <span className="gs-chip" style={{ color: stageLabel.color }} data-stage={stage}>
              {stageLabel.label}
            </span>
            <span className="gs-chip" style={{ color: status.color }}>
              {status.label}
            </span>
            {data.stages_available !== false ? (
              <button type="button" onClick={() => void move()} disabled={moving} className={stage === 'client' ? 'gs-btn gs-btn-ghost' : 'gs-btn gs-btn-secondary'}>
                <ArrowRightLeft size={14} aria-hidden="true" /> {stage === 'client' ? 'Move back to prospects' : 'Became a client'}
              </button>
            ) : null}
          </div>
          {notice ? (
            <p className="gs-notice mt-4" role="status">
              {notice}
            </p>
          ) : null}
          <div className="mt-6">
            {editing ? (
              <CustomerForm
                mode="edit"
                customer={data.customer}
                onSaved={(customer) => {
                  setData((d) => (d ? { ...d, customer } : d));
                  setEditing(false);
                  setNotice('Details saved.');
                }}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <Details
                customer={data.customer}
                onEdit={() => {
                  setNotice(null);
                  setEditing(true);
                }}
              />
            )}
          </div>
          {stage === 'client' ? <AccountsCard customerId={data.customer.id} /> : null}
          <CustomerWorkspace viewer="partner" customerId={data.customer.id} onSignedOut={signedOut} />
          {legacy.length ? (
            <section aria-labelledby="customer-audits-heading" className="mt-8">
              <h2 id="customer-audits-heading" className="text-xl font-bold">
                Earlier audits (Google Drive)
              </h2>
              <p className="mt-1 text-sm gs-muted">Delivered before reports moved into Groundswell; their files stay in Google Drive.</p>
              <ul className="mt-4 space-y-3" aria-label="Earlier audits of this customer">
                {legacy.map((a) => (
                  <AuditCard key={a.id} audit={a} />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </>
  );
}

export default function GroundswellCustomerPage() {
  usePageMeta({ title: `Customer | ${GROUNDSWELL_NAME}`, includeSiteName: false, noindex: true });
  const { id = '' } = useParams();
  return <PartnerApp>{() => <Customer id={id} />}</PartnerApp>;
}
