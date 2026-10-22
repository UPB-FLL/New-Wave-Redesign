import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  RadioTower,
  AlertCircle,
  Users,
  Handshake,
  Loader2,
  CircleDashed,
} from 'lucide-react';
import {
  getSetupStatus,
  listAudits,
  listPartners,
  type GroundswellAudit,
  type GroundswellPartner,
  type SetupStatus,
} from '../../lib/groundswell';
import { listStaffCustomers, type StaffCustomer } from '../../lib/groundswellWorkspace';
import { DIVISION_GROUNDSWELL_PATH } from '../../divisions/socialEngineering/site';
import { GROUNDSWELL_ADMIN_AUDITS_PATH, GROUNDSWELL_ADMIN_CUSTOMERS_PATH, GROUNDSWELL_ADMIN_PARTNERS_PATH } from '../site';
import { AdminEmptyState, AdminPageHeader, PhaseLegend, StaffCustomerTable } from './AdminUi';

const STATUSES = [
  { label: 'Queued', status: 'queued' },
  { label: 'Running', status: 'running' },
  { label: 'Needs review', status: 'review' },
  { label: 'Done', status: 'done' },
  { label: 'Failed', status: 'failed' },
  { label: 'Benchmarks', status: 'benchmark' },
] as const;

export default function GroundswellOverview() {
  const [setup, setSetup] = useState<SetupStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [audits, setAudits] = useState<GroundswellAudit[] | null>(null);
  const [partners, setPartners] = useState<GroundswellPartner[] | null>(null);
  const [customers, setCustomers] = useState<StaffCustomer[] | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fail = (what: string) => (err: unknown) =>
    setErrors((e) => ({ ...e, [what]: err instanceof Error ? err.message : `Could not load ${what.toLowerCase()}.` }));

  useEffect(() => {
    let live = true;
    const failed = (what: string) => (err: unknown) => {
      if (live) fail(what)(err);
    };
    void getSetupStatus()
      .then((value) => {
        if (live) setSetup(value);
      })
      .catch(failed('Setup status'));
    void listAudits()
      .then((value) => {
        if (live) setAudits(value);
      })
      .catch(failed('Audits'));
    void listPartners()
      .then((value) => {
        if (live) setPartners(value);
      })
      .catch(failed('Partners'));
    void listStaffCustomers()
      .then((value) => {
        if (live) setCustomers(value);
      })
      .catch(failed('Customers'));
    return () => {
      live = false;
    };
  }, []);

  const checkLive = () => {
    setChecking(true);
    setErrors((e) => {
      const next = { ...e };
      delete next['Connection check'];
      delete next['Setup status'];
      return next;
    });
    void getSetupStatus(true)
      .then(setSetup)
      .catch(fail('Connection check'))
      .finally(() => setChecking(false));
  };

  const attention = audits?.filter((a) => a.status === 'review' || a.status === 'failed') ?? [];
  const recent = [...(customers ?? [])].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5);
  const fromPartners = audits?.filter((a) => a.partner_id).length ?? '–';
  const verdict = setup
    ? setup.live
      ? (setup.summary ?? '')
      : setup.ready
        ? 'Variables set. Check the connections before partners run audits.'
        : 'Not ready: add the missing variables in Vercel, then redeploy.'
    : '';
  const healthy = setup?.ready && (!setup.live || setup.complete);
  const passed = setup?.checks.filter((c) => c.ok).length ?? 0;
  const activePartners = partners?.filter((p) => p.status === 'active').length;
  const setupError = errors['Setup status'] ?? errors['Connection check'];

  return (
    <div className="gs-admin-page">
      <AdminPageHeader
        title="Overview"
        description="A clear view of your customers and their next steps."
        action={
          <button type="button" className="gs-btn gs-btn-secondary" onClick={checkLive} disabled={checking}>
            {checking ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <RadioTower size={16} aria-hidden="true" />}
            {checking ? 'Checking…' : 'Check connections'}
          </button>
        }
      />
      {Object.entries(errors)
        .filter(([key]) => key !== 'Customers')
        .map(([key, error]) => (
          <p key={key} className="gs-alert" role="alert">
            {key}: {error}
          </p>
        ))}
      <section className="gs-admin-stats" aria-label="Audits by status">
        {STATUSES.map(({ label, status }) => (
          <Link
            key={status}
            to={`${GROUNDSWELL_ADMIN_AUDITS_PATH}?${status === 'benchmark' ? 'kind=benchmark' : `status=${status}`}`}
            className="gs-admin-stat"
            data-status={status}
          >
            <span className="gs-admin-stat-dot" aria-hidden="true" />
            <div className="gs-admin-stat-number">
              {audits
                ? audits.filter((a) => (status === 'benchmark' ? a.kind === 'benchmark' : a.status === status)).length.toLocaleString()
                : '–'}
            </div>
            <div className="gs-admin-stat-label">{label}</div>
            <ArrowUpRight size={13} className="gs-admin-stat-arrow" aria-hidden="true" />
          </Link>
        ))}
      </section>
      <div className="gs-admin-overview-grid">
        <div className="gs-admin-column">
          <section className="gs-card gs-admin-progress-card" aria-labelledby="gs-customer-progress">
            <div className="gs-admin-section-header">
              <h2 id="gs-customer-progress">Customer progress</h2>
              <Link to={GROUNDSWELL_ADMIN_CUSTOMERS_PATH} className="gs-link">
                View customers <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
            <PhaseLegend />
            {errors.Customers ? (
              <p className="gs-alert m-5" role="alert">
                {errors.Customers}
              </p>
            ) : !customers ? (
              <p className="gs-admin-loading" aria-busy="true">
                Loading customers…
              </p>
            ) : recent.length ? (
              <StaffCustomerTable customers={recent} />
            ) : (
              <AdminEmptyState title="Your customers will appear here" icon={Users}>
                Add a business from the partner portal to follow its three phases.
              </AdminEmptyState>
            )}
          </section>
          <section className="gs-card gs-admin-attention" aria-labelledby="gs-attention-heading">
            <div className="gs-admin-section-header">
              <h2 id="gs-attention-heading">
                <AlertCircle size={18} aria-hidden="true" />
                Needs attention
              </h2>
              {attention.length ? <span className="gs-admin-count">{attention.length}</span> : null}
            </div>
            {errors.Audits ? (
              <AdminEmptyState title="Run status unavailable">Refresh the page to try loading the queue again.</AdminEmptyState>
            ) : !audits ? (
              <p className="gs-admin-loading" aria-busy="true">
                Loading runs…
              </p>
            ) : attention.length ? (
              <ul>
                {attention.slice(0, 4).map((a) => (
                  <li key={a.id}>
                    <span className="gs-admin-attention-marker" data-status={a.status} />
                    <div>
                      <strong>{a.business_name || 'Audit request'}</strong>
                      <p>{a.status === 'review' ? 'Ready for your review before delivery.' : 'This run needs a closer look.'}</p>
                    </div>
                    <Link to={`${GROUNDSWELL_ADMIN_AUDITS_PATH}?status=${a.status}#run-${a.id}`} className="gs-btn gs-btn-secondary">
                      Open run
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="gs-admin-all-clear">
                <CheckCircle2 size={20} aria-hidden="true" />
                <div>
                  <strong>All clear for now</strong>
                  <p>No runs are waiting for review or reporting a failure.</p>
                </div>
              </div>
            )}
          </section>
        </div>
        <div className="gs-admin-column">
          <section className="gs-card gs-admin-health" aria-labelledby="gs-health-heading">
            <div className="gs-admin-section-header">
              <h2 id="gs-health-heading">Engine health</h2>
              <RadioTower size={17} className="gs-muted" aria-hidden="true" />
            </div>
            {!setup ? (
              <p className="gs-admin-loading" aria-busy={setupError ? undefined : true}>
                {setupError ? 'Connection status unavailable.' : 'Checking configuration…'}
              </p>
            ) : (
              <div className="gs-admin-health-content">
                <div className="gs-admin-health-verdict" data-healthy={healthy ? 'true' : 'false'}>
                  {healthy ? <CheckCircle2 size={28} aria-hidden="true" /> : <AlertCircle size={28} aria-hidden="true" />}
                  <div>
                    <strong>
                      {setup.live
                        ? setup.ready
                          ? setup.complete
                            ? 'Ready to run'
                            : 'Some sources unavailable'
                          : 'Action needed'
                        : setup.ready
                          ? 'Configured'
                          : 'Setup needs attention'}
                    </strong>
                    <span>
                      {passed} of {setup.checks.length} checks passed{setup.live ? ' · Live check' : ' · Configuration check'}
                    </span>
                  </div>
                </div>
                <p className="gs-admin-health-summary" data-live={setup.live ? 'true' : undefined}>
                  {verdict}
                </p>
                <details className="gs-admin-diagnostics">
                  <summary>View connection details</summary>
                  <ul aria-label="Setup checks">
                    {setup.checks.map((c) => (
                      <li key={c.key}>
                        {c.ok ? (
                          <CheckCircle2 size={15} style={{ color: 'var(--gs-ok)' }} aria-label="Set" />
                        ) : (
                          <XCircle size={15} style={{ color: c.required ? 'var(--gs-bad)' : 'var(--nw-slate)' }} aria-label="Missing" />
                        )}
                        <div>
                          <span>{c.label}</span>
                          {!c.required ? <small>Optional</small> : null}
                          <code>{c.key}</code>
                          {c.detail ? <p>{c.detail}</p> : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="gs-admin-fine-print">
                    A missing data source never stops an audit: the run goes on and the reports say what could not be read. Reports are
                    stored privately in the app. Partners open their own; {setup.report_admins.join(', ')} can open all.
                  </p>
                </details>
              </div>
            )}
          </section>
          <section className="gs-card gs-admin-partner-summary" aria-labelledby="gs-partner-heading">
            <div className="gs-admin-section-header">
              <h2 id="gs-partner-heading">Partners</h2>
              <Handshake size={17} className="gs-muted" aria-hidden="true" />
            </div>
            <div className="gs-admin-partner-numbers">
              <strong>{activePartners ?? '–'}</strong>
              <span>Active partners</span>
            </div>
            <p className="gs-admin-fine-print">
              {partners
                ? `${partners.filter((p) => p.status === 'active').length} active, ${partners.filter((p) => p.status === 'invited').length} invited, ${partners.filter((p) => p.status === 'disabled').length} turned off. ${fromPartners} audits came from partners.`
                : errors.Partners
                  ? 'Partner accounts unavailable.'
                  : 'Loading partner accounts…'}
            </p>
            <Link to={GROUNDSWELL_ADMIN_PARTNERS_PATH} className="gs-link">
              Manage partners
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </section>
          <a href={DIVISION_GROUNDSWELL_PATH} target="_blank" rel="noreferrer" className="gs-admin-product-link">
            <CircleDashed size={19} aria-hidden="true" />
            <div>
              <strong>GroundSwell</strong>
              <span>Growth audits and the partner workspace.</span>
            </div>
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}
