import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { PHASE_INFO, PHASES } from '../../lib/groundswellValidation';
import { listStaffCustomers, type StaffCustomer } from '../../lib/groundswellWorkspace';
import { AUDIT_STATUS, STAGE_LABELS } from '../pages/customerStatus';
import { groundswellAdminCustomerPath } from '../site';

/**
 * Every customer, for New Wave staff (/groundswell/admin/customers): New
 * Wave's own and every partner's, each with its partner, stage, and where its
 * three phases stand. A search box, and filters by partner and stage. A row
 * opens the customer's workspace.
 */

const when = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

function PhaseChips({ c }: { c: StaffCustomer }) {
  return (
    <span className="flex flex-wrap gap-1">
      {PHASES.map((p) => {
        const run = c.phases[p];
        const state = run ? (AUDIT_STATUS[run.status as keyof typeof AUDIT_STATUS] ?? null) : null;
        return (
          <span key={p} className="gs-chip" style={{ color: state?.color ?? 'var(--nw-slate)', opacity: run ? 1 : 0.55 }} title={`Phase ${PHASE_INFO[p].number}: ${PHASE_INFO[p].title}`}>
            {PHASE_INFO[p].number} · {state ? state.label : 'Not started'}
          </span>
        );
      })}
    </span>
  );
}

export default function GroundswellCustomers() {
  const [customers, setCustomers] = useState<StaffCustomer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [partner, setPartner] = useState('all');
  const [stage, setStage] = useState('all');

  useEffect(() => {
    listStaffCustomers()
      .then(setCustomers)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load the customers.'));
  }, []);

  const partners = useMemo(() => {
    const seen = new Map<string, string>();
    for (const c of customers ?? []) if (c.partner) seen.set(c.partner.id, c.partner.company);
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [customers]);

  const shown = (customers ?? []).filter((c) => {
    const q = query.trim().toLowerCase();
    if (q && !`${c.business_name} ${c.city ?? ''} ${c.partner?.company ?? 'New Wave'}`.toLowerCase().includes(q)) return false;
    if (partner === 'new-wave' && c.partner) return false;
    if (partner !== 'all' && partner !== 'new-wave' && c.partner?.id !== partner) return false;
    if (stage !== 'all' && c.stage !== stage) return false;
    return true;
  });

  return (
    <>
      <h1 className="text-2xl font-bold">Customers</h1>
      <p className="mt-1 text-sm gs-muted">Every business in Groundswell, New Wave’s and every partner’s, with where its three phases stand.</p>
      {error ? (
        <p className="gs-alert mt-4" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <label className="min-w-[14rem] flex-1">
          <span className="gs-label">Search</span>
          <span className="relative block">
            <Search size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 gs-muted" />
            <input type="search" className="w-full rounded-lg border border-[var(--nw-mist-gray)] bg-white py-2.5 pl-9 pr-3 text-sm" placeholder="Business, city or partner" value={query} onChange={(e) => setQuery(e.target.value)} />
          </span>
        </label>
        <label>
          <span className="gs-label">Partner</span>
          <select className="rounded-lg border border-[var(--nw-mist-gray)] bg-white px-3 py-2.5 text-sm" value={partner} onChange={(e) => setPartner(e.target.value)}>
            <option value="all">All</option>
            <option value="new-wave">New Wave’s own</option>
            {partners.map(([id, company]) => (
              <option key={id} value={id}>
                {company}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="gs-label">Stage</span>
          <select className="rounded-lg border border-[var(--nw-mist-gray)] bg-white px-3 py-2.5 text-sm" value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="all">All</option>
            <option value="prospect">Prospects</option>
            <option value="client">Clients</option>
          </select>
        </label>
      </div>
      {!customers && !error ? (
        <p className="mt-6 text-sm gs-muted" aria-busy="true">
          Loading…
        </p>
      ) : null}
      {customers ? (
        shown.length ? (
          <div className="gs-card mt-5 overflow-x-auto">
            <table className="gs-table" aria-label="Customers">
              <thead>
                <tr>
                  <th scope="col">Business</th>
                  <th scope="col">Partner</th>
                  <th scope="col">Stage</th>
                  <th scope="col">Phases</th>
                  <th scope="col">Updated</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((c) => {
                  const st = STAGE_LABELS[c.stage as keyof typeof STAGE_LABELS] ?? STAGE_LABELS.prospect;
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link to={groundswellAdminCustomerPath(c.id)} className="gs-link">
                          {c.business_name}
                        </Link>
                        {c.city ? <span className="block text-xs gs-muted">{c.city}</span> : null}
                      </td>
                      <td>{c.partner?.company ?? 'New Wave'}</td>
                      <td>
                        <span className="gs-chip" style={{ color: st.color }}>
                          {st.label}
                        </span>
                      </td>
                      <td>
                        <PhaseChips c={c} />
                      </td>
                      <td className="whitespace-nowrap">{when(c.updated_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-6 text-sm gs-muted">No customers match.</p>
        )
      ) : null}
    </>
  );
}
