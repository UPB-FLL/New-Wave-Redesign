import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Play } from 'lucide-react';
import { getPartnerCustomer, PartnerSignedOut, runPartnerAudit, type PartnerAudit, type PartnerCustomer, type PartnerStep } from '../../lib/groundswellPartner';
import { STEP_LABELS } from '../../lib/groundswellSteps';
import { isDriveLink } from '../../lib/groundswellValidation';
import { usePageMeta } from '../../lib/usePageMeta';
import { PartnerApp } from '../PartnerApp';
import { GROUNDSWELL_CUSTOMERS_PATH, GROUNDSWELL_NAME, GROUNDSWELL_PATH } from '../site';
import { CustomerForm } from './CustomerForm';
import { AUDIT_STATUS, customerStatus } from './customerStatus';

/**
 * One customer (noindex): its details with an Edit link, the one primary
 * action ("Run audit", or "Run again" once the last one finished; with the
 * benchmark when the customer has two competitors), then every audit of it,
 * newest first, as a card with its status and Drive links. A running audit
 * shows its steps by name and state, read again every 15 seconds; partners
 * never see error text. A cap (one running audit at a time, so many runs a
 * day) is explained in place with when the next run frees up.
 */

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-US') : null);
/** How often the page re-reads a queued or running audit. */
export const PROGRESS_INTERVAL_MS = 15_000;

const STEP_STATE: Record<PartnerStep['status'], { text: string; color: string }> = {
  pending: { text: 'waiting', color: 'var(--gs-wait)' },
  running: { text: 'running', color: 'var(--gs-accent-deep)' },
  done: { text: 'done', color: 'var(--gs-ok)' },
  skipped: { text: 'skipped', color: 'var(--gs-accent-deep)' },
  failed: { text: 'didn’t finish', color: 'var(--gs-bad)' },
};

/** A running audit's steps, by name and state only. */
function StepList({ steps }: { steps: PartnerStep[] }) {
  if (!steps.length) return <p className="mt-2 text-sm gs-muted">Starting…</p>;
  const done = steps.filter((s) => s.status === 'done' || s.status === 'skipped').length;
  return (
    <div className="mt-3">
      <p className="text-sm gs-muted">
        {done} of {steps.length} steps done
      </p>
      <ol className="mt-2 flex flex-wrap gap-1.5" aria-label="Audit progress">
        {steps.map((s) => {
          const state = STEP_STATE[s.status] ?? STEP_STATE.pending;
          return (
            <li key={s.step} className="gs-chip font-medium" style={{ color: state.color }}>
              {STEP_LABELS[s.step] ?? s.step}: {state.text}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** The primary action: start the queued audit, or queue and start a fresh one. */
function RunPanel({ customer, onRan }: { customer: PartnerCustomer; onRan: (result: { customer: PartnerCustomer; audits: PartnerAudit[] }) => void }) {
  const latest = customer.latest;
  const queued = latest?.status === 'queued';
  const canBenchmark = customer.competitors.length >= 2;
  const [benchmark, setBenchmark] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withBenchmark = queued ? latest.kind === 'benchmark' : benchmark && canBenchmark;
  const label = `${latest && !queued ? 'Run again' : 'Run audit'}${withBenchmark ? ' with the benchmark' : ''}`;

  const run = async () => {
    setError(null);
    setBusy(true);
    try {
      onRan(await runPartnerAudit(customer.id, queued ? {} : { kind: withBenchmark ? 'benchmark' : 'audit' }));
    } catch (err) {
      if (err instanceof PartnerSignedOut) throw err;
      setError(err instanceof Error ? err.message : 'Could not start the audit.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gs-card mt-6 p-5 sm:p-6">
      <p className="text-sm gs-muted">
        {queued
          ? `This ${latest.kind === 'benchmark' ? 'audit and benchmark' : 'audit'} is queued and hasn’t started. It starts as soon as you run it and takes about half an hour.`
          : latest
            ? 'A new run gathers everything again and delivers new reports. The old ones stay.'
            : 'The audit gathers public data about the business, writes it up and delivers three reports to Google Drive.'}
      </p>
      {!queued && canBenchmark ? (
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={benchmark} onChange={(e) => setBenchmark(e.target.checked)} />
          Also benchmark against the first two competitors
        </label>
      ) : null}
      {error ? (
        <p className="gs-alert mt-3" role="alert">
          {error}
        </p>
      ) : null}
      <button type="button" onClick={() => void run()} disabled={busy} className="gs-btn gs-btn-primary mt-4 disabled:opacity-60">
        <Play size={14} aria-hidden="true" /> {busy ? 'Starting…' : label}
      </button>
    </div>
  );
}

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

function AuditCard({ audit }: { audit: PartnerAudit }) {
  const status = AUDIT_STATUS[audit.status] ?? AUDIT_STATUS.queued;
  const links = [
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
      {audit.status === 'running' ? <StepList steps={audit.steps ?? []} /> : null}
      {audit.status === 'queued' ? <p className="mt-2 text-sm gs-muted">Waiting to start.</p> : null}
      {audit.status === 'done' && audit.completed_at ? <p className="mt-2 text-sm gs-muted">Reports delivered {when(audit.completed_at)}.</p> : null}
      {links.length ? (
        <p className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {links.map(([name, url]) => (
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
  const [data, setData] = useState<{ customer: PartnerCustomer; audits: PartnerAudit[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(state?.queued ? 'Added. Run the audit when you’re ready; its reports will appear here.' : null);

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

  const running = data?.customer.latest?.status === 'running';
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => void refresh(), PROGRESS_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [running, refresh]);

  const status = customerStatus(data?.customer.latest ?? null);

  return (
    <>
      <Link to={GROUNDSWELL_CUSTOMERS_PATH} className="gs-link inline-flex items-center gap-1 text-sm">
        <ArrowLeft size={14} aria-hidden="true" /> All customers
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
            <span className="gs-chip" style={{ color: status.color }}>
              {status.label}
            </span>
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
          {!running ? (
            <RunPanel
              customer={data.customer}
              onRan={(result) => {
                setData(result);
                setNotice('Started. This page follows the audit; its reports appear here when it finishes.');
              }}
            />
          ) : null}
          <section aria-labelledby="customer-audits-heading" className="mt-8">
            <h2 id="customer-audits-heading" className="text-xl font-bold">
              Audits
            </h2>
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
