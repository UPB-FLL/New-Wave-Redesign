import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, CircleDashed, type LucideIcon } from 'lucide-react';
import { PHASE_INFO, PHASES } from '../../lib/groundswellValidation';
import type { StaffCustomer } from '../../lib/groundswellWorkspace';
import { AUDIT_STATUS, STAGE_LABELS } from '../pages/customerStatus';
import { groundswellAdminCustomerPath } from '../site';

export function AdminPageHeader({
  title,
  description,
  action,
  eyebrow,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <header className="gs-admin-page-header">
      <div>
        {eyebrow ? <p className="gs-admin-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        <p className="gs-admin-description">{description}</p>
      </div>
      {action ? <div className="gs-admin-page-actions">{action}</div> : null}
    </header>
  );
}

export function AdminEmptyState({
  title,
  children,
  icon: Icon = CircleDashed,
}: {
  title: string;
  children?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="gs-admin-empty">
      <Icon size={24} aria-hidden="true" />
      <strong>{title}</strong>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

export function CustomerPhaseTrack({ customer }: { customer: StaffCustomer }) {
  const latest = [...PHASES].reverse().find((p) => customer.phases[p]);
  const status = latest ? customer.phases[latest]?.status : null;
  const state = status ? AUDIT_STATUS[status as keyof typeof AUDIT_STATUS] : null;
  return (
    <div className="gs-admin-phase-progress">
      <ol className="gs-admin-phase-track" aria-label={`Phases for ${customer.business_name}`}>
        {PHASES.map((p) => {
          const run = customer.phases[p];
          const label = run ? (AUDIT_STATUS[run.status as keyof typeof AUDIT_STATUS]?.label ?? 'Not started') : 'Not started';
          return (
            <li key={p} data-status={run?.status ?? 'idle'} title={`Phase ${PHASE_INFO[p].number}: ${PHASE_INFO[p].title} · ${label}`}>
              <span className="gs-admin-phase-node" aria-hidden="true">
                {run?.status === 'done' ? <Check size={12} /> : PHASE_INFO[p].number}
              </span>
              <span className="sr-only">
                Phase {PHASE_INFO[p].number}: {PHASE_INFO[p].title} · {label}
              </span>
            </li>
          );
        })}
      </ol>
      <span className="gs-admin-phase-caption" style={{ color: state?.color }}>
        {latest ? PHASE_INFO[latest].title : 'Audit'} · {state?.label ?? 'Not started'}
      </span>
    </div>
  );
}

export function PhaseLegend() {
  return (
    <ol className="gs-admin-phase-legend" aria-label="The three phases">
      {PHASES.map((p) => (
        <li key={p}>
          <span>{String(PHASE_INFO[p].number).padStart(2, '0')}</span>
          {PHASE_INFO[p].title}
        </li>
      ))}
    </ol>
  );
}

export function StaffCustomerTable({ customers, updated = false }: { customers: StaffCustomer[]; updated?: boolean }) {
  return (
    <div className="gs-admin-table-scroll" tabIndex={0} role="region" aria-label="Customer list">
      <table className="gs-table gs-admin-customer-table" aria-label="Customers">
        <thead>
          <tr>
            <th scope="col">Business</th>
            <th scope="col">Partner</th>
            <th scope="col">Stage</th>
            <th scope="col">Phase progress</th>
            {updated ? <th scope="col">Updated</th> : null}
            <th scope="col">
              <span className="sr-only">Open workspace</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => {
            const stage = STAGE_LABELS[c.stage as keyof typeof STAGE_LABELS] ?? STAGE_LABELS.prospect;
            return (
              <tr key={c.id}>
                <td>
                  <div className="gs-admin-business">
                    <span className="gs-admin-business-avatar" aria-hidden="true">
                      {c.business_name
                        .trim()
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join('')
                        .toUpperCase()}
                    </span>
                    <div>
                      <Link to={groundswellAdminCustomerPath(c.id)} className="gs-admin-business-name">
                        {c.business_name}
                      </Link>
                      {c.city ? <span className="gs-admin-business-meta">{c.city}</span> : null}
                    </div>
                  </div>
                </td>
                <td>{c.partner?.company ?? 'New Wave'}</td>
                <td>
                  <span className="gs-chip" data-stage={c.stage} style={{ color: stage.color }}>
                    {stage.label}
                  </span>
                </td>
                <td>
                  <CustomerPhaseTrack customer={c} />
                </td>
                {updated ? (
                  <td className="gs-admin-date">
                    {new Date(c.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                ) : null}
                <td>
                  <Link
                    to={groundswellAdminCustomerPath(c.id)}
                    className="gs-admin-row-action"
                    aria-label={`Open ${c.business_name} workspace`}
                  >
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
