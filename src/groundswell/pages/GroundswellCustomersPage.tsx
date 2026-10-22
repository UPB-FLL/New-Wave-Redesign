import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Building2, Plus, Search, SearchX } from 'lucide-react';
import {
  getPartnerBranding,
  listPartnerCustomers,
  PartnerSignedOut,
  savePartnerBranding,
  type PartnerBrandingState,
  type PartnerCustomer,
} from '../../lib/groundswellPartner';
import { buildPartnerBranding, type CustomerStage } from '../../lib/groundswellValidation';
import { usePageMeta } from '../../lib/usePageMeta';
import { PartnerApp } from '../PartnerApp';
import { GROUNDSWELL_NAME, GROUNDSWELL_PATH, groundswellCustomerPath } from '../site';
import { CustomerForm } from './CustomerForm';
import { customerStatus } from './customerStatus';

/**
 * A partner's customers (noindex), one list per stage: Prospects (leads whose
 * public data Groundswell reads) and Clients (businesses the partner works
 * for; "Became a client" on a prospect's page moves it here with everything
 * gathered). Each list shows the newest audit's status and the date of the
 * last reports, most recent activity first. "Add a prospect" / "Add a client"
 * is the one primary action; it queues the business's first Croissance audit
 * and opens its page. Below the prospects, the partner sets the name and logo
 * its reports carry (they never name New Wave).
 */

const STAGE_COPY: Record<CustomerStage, { title: string; intro: string; add: string; list: string; empty: string; none: string }> = {
  prospect: {
    title: 'Prospects',
    intro: 'Businesses you are pitching. GroundSwell builds their reports from public data. No account connections needed.',
    add: 'Add a prospect',
    list: 'Your prospects',
    empty: 'No prospects yet. Add your first one above.',
    none: 'No prospects yet.',
  },
  client: {
    title: 'Clients',
    intro: 'Businesses you work for. A client’s page keeps everything gathered while it was a prospect.',
    add: 'Add a client',
    list: 'Your clients',
    empty: 'No clients yet. Open a prospect and choose “Became a client”, or add one above.',
    none: 'No clients yet. Open a prospect and choose “Became a client”.',
  },
};

const field = 'input-light';
const th = 'px-4 py-3 text-xs font-semibold uppercase tracking-wide gs-muted';
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-US') : '—');

/** The name and logo a partner's reports carry ("Prepared by …"), never New Wave's. */
function BrandingPanel() {
  const [state, setState] = useState<PartnerBrandingState | null>(null);
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    getPartnerBranding()
      .then((b) => {
        if (!live) return;
        setState(b);
        setName(b.branding.display_name ?? '');
        setLogo(b.branding.logo_url ?? '');
      })
      .catch((err) => live && setError(err instanceof Error ? err.message : 'Could not load your branding.'));
    return () => {
      live = false;
    };
  }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      buildPartnerBranding({ display_name: name, logo_url: logo });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check the details.');
      return;
    }
    setBusy(true);
    try {
      const saved = await savePartnerBranding({ display_name: name, logo_url: logo });
      setState(saved);
      setNotice('Saved. Reports for audits that finish from now on carry it.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your branding.');
    } finally {
      setBusy(false);
    }
  };

  const shown = name.trim() || state?.company || '';
  return (
    <form onSubmit={save} className="gs-card gs-portal-branding" aria-labelledby="partner-branding-heading">
      <div className="gs-portal-settings-intro">
        <p className="gs-portal-eyebrow">Report identity</p>
        <h2 id="partner-branding-heading" className="text-xl font-bold">
          Your branding
        </h2>
        <p className="mt-1 text-sm gs-muted">
          Your reports say “Prepared by” your name, with your logo beside it. Each business keeps its own colours and logo.
        </p>
      </div>
      <div className="gs-portal-settings-fields">
        {state && !state.available ? (
          <p className="gs-notice mt-3" role="status">
            Branding isn’t switched on yet. Until it is, reports carry your company name.
          </p>
        ) : null}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pb-name" className="gs-label">
              Name on your reports
            </label>
            <input
              id="pb-name"
              value={name}
              placeholder={state?.company ?? ''}
              onChange={(e) => setName(e.target.value)}
              className={field}
            />
          </div>
          <div>
            <label htmlFor="pb-logo" className="gs-label">
              Logo link
            </label>
            <input id="pb-logo" value={logo} placeholder="https://…/logo.png" onChange={(e) => setLogo(e.target.value)} className={field} />
          </div>
        </div>
        {shown ? (
          <p className="mt-4 flex items-center gap-2 text-sm gs-muted">
            Preview: Prepared by {shown}
            {/^https:\/\//.test(logo.trim()) ? <img src={logo.trim()} alt="" className="h-6 max-w-[9rem] object-contain" /> : null}
          </p>
        ) : null}
        {error ? (
          <p className="gs-alert mt-3" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="gs-notice mt-3" role="status">
            {notice}
          </p>
        ) : null}
        <button type="submit" disabled={busy || !state?.available} className="gs-btn gs-btn-primary mt-5 disabled:opacity-60">
          {busy ? 'Saving…' : 'Save branding'}
        </button>
      </div>
    </form>
  );
}

function CustomerTable({ customers, label }: { customers: PartnerCustomer[]; label: string }) {
  return (
    <div className="gs-portal-table-scroll" role="region" aria-label={`${label} table, scroll for more columns`} tabIndex={0}>
      <table className="gs-portal-table w-full text-sm" aria-label={label}>
        <thead>
          <tr className="text-left">
            <th scope="col" className={th}>
              Business
            </th>
            <th scope="col" className={`${th} max-sm:hidden`}>
              City
            </th>
            <th scope="col" className={th}>
              Status
            </th>
            <th scope="col" className={`${th} max-sm:hidden`}>
              Last reports
            </th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => {
            const status = customerStatus(c.latest);
            return (
              <tr key={c.id} className="border-t border-[var(--nw-mist-gray)]">
                <td className="px-4 py-3">
                  <div className="gs-portal-business">
                    <span className="gs-portal-business-avatar" aria-hidden="true">
                      {c.business_name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((word) => word[0])
                        .join('')}
                    </span>
                    <div>
                      <Link to={groundswellCustomerPath(c.id)} className="gs-portal-business-name">
                        {c.business_name}
                        <ArrowUpRight size={13} aria-hidden="true" />
                      </Link>
                      <span className="gs-portal-business-meta">
                        {c.website?.replace(/^https?:\/\//, '').replace(/\/$/, '') ||
                          (c.instagram ? `@${c.instagram}` : (c.city ?? 'Business profile'))}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 gs-muted max-sm:hidden">{c.city ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="gs-chip" style={{ color: status.color }}>
                    {status.label}
                  </span>
                </td>
                <td className="px-4 py-3 gs-muted max-sm:hidden">{when(c.last_reports_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Customers({ stage }: { stage: CustomerStage }) {
  const copy = STAGE_COPY[stage];
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<PartnerCustomer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');

  const refresh = useCallback(async () => {
    try {
      setCustomers(await listPartnerCustomers(stage));
      setError(null);
    } catch (err) {
      if (err instanceof PartnerSignedOut) navigate(GROUNDSWELL_PATH, { replace: true });
      else setError(err instanceof Error ? err.message : `Could not load your ${copy.title.toLowerCase()}.`);
    }
  }, [navigate, stage, copy.title]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // While an audit is queued or running, the list follows it.
  const active = customers?.some((c) => c.latest && (c.latest.status === 'queued' || c.latest.status === 'running')) ?? false;
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(timer);
  }, [active, refresh]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!customers) return null;
    if (!q) return customers;
    return customers.filter((c) => [c.business_name, c.city, c.website, c.instagram].some((v) => v?.toLowerCase().includes(q)));
  }, [customers, query]);

  // A first prospect gets the form straight away; the clients list waits for the button (most clients were prospects first).
  const showForm = adding || (stage === 'prospect' && customers?.length === 0);

  const inProgress = customers?.filter((c) => c.latest && ['queued', 'running', 'review'].includes(c.latest.status)).length;
  const ready = customers?.filter((c) => c.latest?.status === 'done').length;

  return (
    <div className="gs-portal-page">
      <div className="gs-portal-page-heading">
        <div>
          <h1>{copy.title}</h1>
          <p>{copy.intro}</p>
        </div>
        {!showForm ? (
          <button type="button" onClick={() => setAdding(true)} className="gs-btn gs-btn-primary">
            <Plus size={17} aria-hidden="true" />
            {copy.add}
          </button>
        ) : null}
      </div>
      <dl className="gs-portal-stats" aria-label={`${copy.title} overview`}>
        {[
          [copy.title, customers?.length],
          ['In progress', inProgress],
          ['Reports ready', ready],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value ?? '—'}</dd>
          </div>
        ))}
      </dl>
      {error ? (
        <div className="gs-alert gs-portal-directory-error" role="alert">
          <p>{error}</p>
          <button type="button" className="gs-btn gs-btn-secondary" onClick={() => void refresh()}>
            Try again
          </button>
        </div>
      ) : null}
      {showForm ? (
        <CustomerForm
          mode="add"
          stage={stage}
          onSaved={({ customer }) => navigate(groundswellCustomerPath(customer.id), { state: { queued: true } })}
          onCancel={customers?.length || stage === 'client' ? () => setAdding(false) : undefined}
        />
      ) : null}
      <section aria-labelledby="partner-customers-heading" className="gs-card gs-portal-directory">
        <div className="gs-portal-directory-toolbar">
          <div>
            <h2 id="partner-customers-heading">{copy.list}</h2>
            <p className="gs-portal-fine-print">
              {customers ? `${shown?.length ?? 0} of ${customers.length} businesses` : 'Your customer directory'}
            </p>
          </div>
          <label className="gs-portal-search">
            <span className="sr-only">Search {copy.title.toLowerCase()}</span>
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Find a ${stage}…`}
              className={field}
            />
          </label>
        </div>
        {!shown ? (
          !error ? (
            <p aria-busy="true" className="gs-portal-loading">
              Loading…
            </p>
          ) : (
            <p className="gs-portal-loading">Your directory could not be loaded. Try again above.</p>
          )
        ) : customers?.length === 0 ? (
          <div className="gs-portal-empty">
            <Building2 size={28} aria-hidden="true" />
            <h3>{stage === 'client' ? 'Build your client list' : 'Start your first prospect'}</h3>
            <p>{showForm ? copy.empty : copy.none}</p>
          </div>
        ) : shown.length === 0 ? (
          <div className="gs-portal-empty">
            <SearchX size={28} aria-hidden="true" />
            <h3>No matching businesses</h3>
            <p>Nothing matches “{query.trim()}”.</p>
            <button type="button" className="gs-link" onClick={() => setQuery('')}>
              Clear search
            </button>
          </div>
        ) : (
          <CustomerTable customers={shown} label={copy.list} />
        )}
      </section>
      {stage === 'prospect' ? <BrandingPanel /> : null}
    </div>
  );
}

export function GroundswellProspectsPage() {
  usePageMeta({ title: `Prospects | ${GROUNDSWELL_NAME}`, includeSiteName: false, noindex: true });
  return <PartnerApp>{() => <Customers key="prospect" stage="prospect" />}</PartnerApp>;
}

export function GroundswellClientsPage() {
  usePageMeta({ title: `Clients | ${GROUNDSWELL_NAME}`, includeSiteName: false, noindex: true });
  return <PartnerApp>{() => <Customers key="client" stage="client" />}</PartnerApp>;
}
