import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRightLeft, Pencil } from 'lucide-react';
import {
  getPartnerCustomer,
  partnerReportUrl,
  PartnerSignedOut,
  REPORT_LABELS,
  setPartnerCustomerStage,
  type PartnerAudit,
  type PartnerCustomer,
  type PartnerCustomerDetail,
  type ReportKind,
} from '../../lib/groundswellPartner';
import { isDriveLink } from '../../lib/groundswellValidation';
import { usePageMeta } from '../../lib/usePageMeta';
import { PartnerApp } from '../PartnerApp';
import { GROUNDSWELL_NAME, GROUNDSWELL_PATH, groundswellStagePath } from '../site';
import { CustomerForm } from './CustomerForm';
import { AUDIT_STATUS, customerStatus, STAGE_LABELS } from './customerStatus';

/**
 * One customer (noindex), a prospect or a client: its stage, its details with
 * an Edit link, "Became a client" (or the way back), then every audit of it,
 * newest first, as a card with its status and its reports (opened through
 * short-lived links from /api/groundswell/report; Drive links for audits
 * delivered before reports moved into the app). Everything gathered as a
 * prospect stays on the page when it becomes a client. New Wave starts queued
 * audits from its own queue.
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

function Customer({ id }: { id: string }) {
  const navigate = useNavigate();
  const { state } = useLocation() as { state?: { queued?: boolean } };
  const [data, setData] = useState<PartnerCustomerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [moving, setMoving] = useState(false);
  const [notice, setNotice] = useState<string | null>(state?.queued ? 'Queued. We’ll start the audit shortly; its reports will appear here.' : null);

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
          <section aria-labelledby="customer-audits-heading" className="mt-8">
            <h2 id="customer-audits-heading" className="text-xl font-bold">
              Audits from public data
            </h2>
            <p className="mt-1 text-sm gs-muted">
              {stage === 'client'
                ? 'What Groundswell gathered from the web, as a prospect and since. It stays here for as long as the client does.'
                : 'What Groundswell gathers from the web: the business’s site, Google listing, Instagram, search rankings and ads.'}
            </p>
            {data.audits.length ? (
              <ul className="mt-4 space-y-3" aria-label="Audits of this customer">
                {data.audits.map((a) => (
                  <AuditCard key={a.id} audit={a} />
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm gs-muted">No audits yet.</p>
            )}
          </section>
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
