import { useEffect, useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { listStaffCustomers, type StaffCustomer } from '../../lib/groundswellWorkspace';
import { AdminEmptyState, AdminPageHeader, PhaseLegend, StaffCustomerTable } from './AdminUi';

export default function GroundswellCustomers() {
  const [customers, setCustomers] = useState<StaffCustomer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [partner, setPartner] = useState('all');
  const [stage, setStage] = useState('all');

  useEffect(() => {
    let live = true;
    void listStaffCustomers()
      .then((value) => {
        if (live) setCustomers(value);
      })
      .catch((err) => {
        if (live) setError(err instanceof Error ? err.message : 'Could not load the customers.');
      });
    return () => {
      live = false;
    };
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
    return stage === 'all' || c.stage === stage;
  });
  const filtered = query !== '' || partner !== 'all' || stage !== 'all';

  return (
    <div className="gs-admin-page">
      <AdminPageHeader
        title="Customers"
        description="Every business, one workspace. Follow the journey from first audit to an integrated plan."
      />
      {error ? (
        <p className="gs-alert" role="alert">
          {error}
        </p>
      ) : null}
      <div className="gs-admin-directory-stats">
        <span>
          <strong>{customers?.length ?? '–'}</strong>Total customers
        </span>
        <span>
          <strong>{customers?.filter((c) => c.stage === 'client').length ?? '–'}</strong>Clients
        </span>
        <span>
          <strong>{customers?.filter((c) => c.stage === 'prospect').length ?? '–'}</strong>Prospects
        </span>
        <span>
          <strong>{partners.length}</strong>Partner agencies
        </span>
      </div>
      <section className="gs-card" aria-label="Customer directory">
        <div className="gs-admin-toolbar">
          <label className="gs-admin-search">
            <span className="gs-label">Search</span>
            <span>
              <Search size={15} aria-hidden="true" />
              <input type="search" placeholder="Business, city or partner" value={query} onChange={(e) => setQuery(e.target.value)} />
            </span>
          </label>
          <label>
            <span className="gs-label">Partner</span>
            <select value={partner} onChange={(e) => setPartner(e.target.value)}>
              <option value="all">All partners</option>
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
            <select value={stage} onChange={(e) => setStage(e.target.value)}>
              <option value="all">All stages</option>
              <option value="prospect">Prospects</option>
              <option value="client">Clients</option>
            </select>
          </label>
        </div>
        <div className="gs-admin-results">
          <span role="status">
            {customers ? (
              <>
                <strong>{shown.length}</strong> of {customers.length} customers
              </>
            ) : error ? (
              'Customer count unavailable.'
            ) : (
              'Loading customers…'
            )}
          </span>
          {filtered ? (
            <button
              type="button"
              className="gs-link"
              onClick={() => {
                setQuery('');
                setPartner('all');
                setStage('all');
              }}
            >
              Clear filters
            </button>
          ) : null}
        </div>
        {customers ? (
          shown.length ? (
            <StaffCustomerTable customers={shown} updated />
          ) : (
            <AdminEmptyState title={filtered ? 'No customers match.' : 'Your customer list starts here'} icon={Users}>
              {filtered
                ? 'Try a different search or clear the filters.'
                : 'Businesses added through GroundSwell appear here with their partner and phase progress.'}
            </AdminEmptyState>
          )
        ) : !error ? (
          <p className="gs-admin-loading" aria-busy="true">
            Loading customer workspaces…
          </p>
        ) : null}
      </section>
      <PhaseLegend />
    </div>
  );
}
