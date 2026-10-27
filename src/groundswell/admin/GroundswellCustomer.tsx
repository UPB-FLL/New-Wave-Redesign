import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRightLeft, MapPin, Handshake } from 'lucide-react';
import { listStaffCustomers, setStaffCustomerStage, staffAccountsApi, type StaffCustomer } from '../../lib/groundswellWorkspace';
import { STAGE_LABELS } from '../pages/customerStatus';
import { AccountsCard } from '../pages/GroundswellCustomerPage';
import { GROUNDSWELL_ADMIN_CUSTOMERS_PATH } from '../site';
import { CustomerWorkspace } from '../workspace/CustomerWorkspace';
import { HeadwayPanel } from '../workspace/HeadwayPanel';
import { PHASE_INFO } from '../../lib/groundswellValidation';

/** Staff customer workspace, including stage controls and client account linking. */
export default function GroundswellCustomer() {
  const { id = '' } = useParams();
  const [summary, setSummary] = useState<StaffCustomer | null>(null);
  const [busy, setBusy] = useState(false);
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
  const isClient = summary?.stage === 'client';

  const move = async () => {
    if (!summary) return;
    setBusy(true);
    setError(null);
    try {
      const moved = await setStaffCustomerStage(summary.id, isClient ? 'prospect' : 'client');
      setSummary({ ...summary, stage: moved.stage });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the stage.');
    } finally {
      setBusy(false);
    }
  };

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
        {summary ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={isClient ? 'gs-btn gs-btn-ghost' : 'gs-btn gs-btn-secondary'}
              onClick={() => void move()}
              disabled={busy}
            >
              <ArrowRightLeft size={14} aria-hidden="true" />
              {isClient ? 'Move back to prospects' : 'Became a client'}
            </button>
            <span className="gs-admin-fine-print">
              {isClient
                ? `Its linked accounts feed the ${PHASE_INFO.integrated.title.toLowerCase()}, and Instagram feeds every phase.`
                : 'A client can have its own accounts linked below.'}
            </span>
          </div>
        ) : null}
      </header>
      {error ? (
        <p className="gs-alert mt-4" role="alert">
          {error}
        </p>
      ) : null}
      {isClient ? <AccountsCard key={id} customerId={id} api={staffAccountsApi} /> : null}
      <div className="gs-admin-customer-workspace">
        <CustomerWorkspace key={id} viewer="admin" customerId={id} />
      </div>
      {/* Headway: what the customer pays for, its setup checklist, and the actions to approve (staff switch the services on). */}
      {summary ? <HeadwayPanel key={`headway-${id}`} viewer="admin" customerId={id} /> : null}
    </div>
  );
}
