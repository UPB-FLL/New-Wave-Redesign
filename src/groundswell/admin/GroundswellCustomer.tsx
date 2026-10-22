import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { listStaffCustomers, type StaffCustomer } from '../../lib/groundswellWorkspace';
import { STAGE_LABELS } from '../pages/customerStatus';
import { GROUNDSWELL_ADMIN_CUSTOMERS_PATH } from '../site';
import { CustomerWorkspace } from '../workspace/CustomerWorkspace';

/**
 * One customer for New Wave staff (/groundswell/admin/customers/:id): who it
 * belongs to, its stage, and its workspace: the three phases with every run,
 * its progress (with each step's error, which partners never see), reports,
 * downloads, ad images and the data each phase gathered.
 */

export default function GroundswellCustomer() {
  const { id = '' } = useParams();
  const [summary, setSummary] = useState<StaffCustomer | null>(null);

  useEffect(() => {
    listStaffCustomers()
      .then((all) => setSummary(all.find((c) => c.id === id) ?? null))
      .catch(() => setSummary(null));
  }, [id]);

  const stage = summary ? (STAGE_LABELS[summary.stage as keyof typeof STAGE_LABELS] ?? STAGE_LABELS.prospect) : null;
  return (
    <>
      <Link to={GROUNDSWELL_ADMIN_CUSTOMERS_PATH} className="gs-link inline-flex items-center gap-1 text-sm">
        <ArrowLeft size={14} aria-hidden="true" /> All customers
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{summary?.business_name ?? 'Customer'}</h1>
        {stage ? (
          <span className="gs-chip" style={{ color: stage.color }}>
            {stage.label}
          </span>
        ) : null}
        {summary ? <span className="text-sm gs-muted">{summary.partner ? `Partner: ${summary.partner.company}` : 'New Wave’s own'}</span> : null}
      </div>
      {summary?.city ? <p className="mt-1 text-sm gs-muted">{summary.city}</p> : null}
      <CustomerWorkspace viewer="admin" customerId={id} />
    </>
  );
}
