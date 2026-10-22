import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Handshake } from 'lucide-react';
import { listStaffCustomers, type StaffCustomer } from '../../lib/groundswellWorkspace';
import { STAGE_LABELS } from '../pages/customerStatus';
import { GROUNDSWELL_ADMIN_CUSTOMERS_PATH } from '../site';
import { CustomerWorkspace } from '../workspace/CustomerWorkspace';

export default function GroundswellCustomer() {
  const { id = '' } = useParams();
  const [summary, setSummary] = useState<StaffCustomer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setSummary(null);
    setError(null);
    void listStaffCustomers()
      .then((all) => {
        if (live) setSummary(all.find((c) => c.id === id) ?? null);
      })
      .catch((err) => {
        if (live) setError(err instanceof Error ? err.message : 'Could not load customer details.');
      });
    return () => {
      live = false;
    };
  }, [id]);

  const stage = summary ? (STAGE_LABELS[summary.stage as keyof typeof STAGE_LABELS] ?? STAGE_LABELS.prospect) : null;
  return (
    <div>
      <header className="gs-admin-customer-header">
        <Link to={GROUNDSWELL_ADMIN_CUSTOMERS_PATH} className="gs-link">
          <ArrowLeft size={14} aria-hidden="true" />
          All customers
        </Link>
        <div className="gs-admin-customer-identity">
          <h1>{summary?.business_name ?? 'Customer'}</h1>
          {stage ? (
            <span className="gs-chip" data-stage={summary?.stage} style={{ color: stage.color }}>
              {stage.label}
            </span>
          ) : null}
        </div>
        <div className="gs-admin-customer-details">
          {summary ? (
            <span className="inline-flex items-center gap-2">
              <Handshake size={13} aria-hidden="true" />
              {summary.partner ? `Partner: ${summary.partner.company}` : 'New Wave’s own'}
            </span>
          ) : null}
          {summary?.city ? (
            <span className="inline-flex items-center gap-2">
              <MapPin size={13} aria-hidden="true" />
              {summary.city}
            </span>
          ) : null}
        </div>
      </header>
      {error ? (
        <p className="gs-alert mt-4" role="alert">
          {error}
        </p>
      ) : null}
      <div className="gs-admin-customer-workspace">
        <CustomerWorkspace key={id} viewer="admin" customerId={id} />
      </div>
    </div>
  );
}
