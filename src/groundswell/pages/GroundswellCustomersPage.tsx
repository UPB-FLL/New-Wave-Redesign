import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
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
    intro: 'Businesses you are pitching. Groundswell reads their public data and builds the reports; there is nothing to connect.',
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
    <form onSubmit={save} className="gs-card mt-8 p-5 sm:p-6" aria-labelledby="partner-branding-heading">
      <h2 id="partner-branding-heading" className="text-xl font-bold">
        Your branding
      </h2>
      <p className="mt-1 text-sm gs-muted">Your reports say “Prepared by” your name, with your logo beside it. Each business keeps its own colours and logo.</p>
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
          <input id="pb-name" value={name} placeholder={state?.company ?? ''} onChange={(e) => setName(e.target.value)} className={field} />
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
        Save branding
      </button>
    </form>
  );
}

function CustomerTable({ customers, label }: { customers: PartnerCustomer[]; label: string }) {
  return (
    <div className="gs-card mt-4 overflow-x-auto">
      <table className="w-full text-sm" aria-label={label}>
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
                  <Link to={groundswellCustomerPath(c.id)} className="gs-link font-semibold">
                    {c.business_name}
                  </Link>
                  <span className="block text-xs gs-muted sm:hidden">{c.city ?? ''}</span>
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

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{copy.title}</h1>
          <p className="mt-1 text-sm gs-muted">{copy.intro}</p>
        </div>
        {!showForm ? (
          <button type="button" onClick={() => setAdding(true)} className="gs-btn gs-btn-primary">
            <Plus size={16} aria-hidden="true" /> {copy.add}
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="gs-alert mt-4" role="alert">
          {error}
        </p>
      ) : null}
      {showForm ? (
        <div className="mt-6">
          <CustomerForm
            mode="add"
            stage={stage}
            onSaved={({ customer }) => navigate(groundswellCustomerPath(customer.id), { state: { queued: true } })}
            onCancel={customers?.length || stage === 'client' ? () => setAdding(false) : undefined}
          />
        </div>
      ) : null}
      <section aria-labelledby="partner-customers-heading" className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="partner-customers-heading" className="text-xl font-bold">
            {copy.list}
          </h2>
          {customers && customers.length > 3 ? (
            <label className="relative block w-full sm:w-64">
              <span className="sr-only">Search {copy.title.toLowerCase()}</span>
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 gs-muted" aria-hidden="true" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Find a ${stage}…`} className={`${field} pl-9`} />
            </label>
          ) : null}
        </div>
        {!shown ? (
          <p aria-busy="true" className="mt-4 text-sm gs-muted">
            Loading…
          </p>
        ) : customers?.length === 0 ? (
          <p className="mt-4 text-sm gs-muted">{showForm ? copy.empty : copy.none}</p>
        ) : shown.length === 0 ? (
          <p className="mt-4 text-sm gs-muted">Nothing matches “{query.trim()}”.</p>
        ) : (
          <CustomerTable customers={shown} label={copy.list} />
        )}
      </section>
      {stage === 'prospect' ? <BrandingPanel /> : null}
    </>
  );
}

export function GroundswellProspectsPage() {
  usePageMeta({ title: `Prospects | ${GROUNDSWELL_NAME}`, includeSiteName: false, noindex: true });
  return <PartnerApp>{() => <Customers stage="prospect" />}</PartnerApp>;
}

export function GroundswellClientsPage() {
  usePageMeta({ title: `Clients | ${GROUNDSWELL_NAME}`, includeSiteName: false, noindex: true });
  return <PartnerApp>{() => <Customers stage="client" />}</PartnerApp>;
}
