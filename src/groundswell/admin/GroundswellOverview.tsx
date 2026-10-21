import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, ClipboardList, Handshake, ExternalLink } from 'lucide-react';
import { getSetupStatus, listAudits, listPartners, type GroundswellAudit, type GroundswellPartner, type SetupStatus } from '../../lib/groundswell';
import { DIVISION_CROISSANCE_PATH } from '../../divisions/socialEngineering/site';
import { GROUNDSWELL_ADMIN_AUDITS_PATH, GROUNDSWELL_ADMIN_PARTNERS_PATH, GROUNDSWELL_PATH } from '../site';

/**
 * The staff front page: whether the engine is set up (which Vercel variables
 * are present; never their values), how many audits are where, and the
 * partner accounts at a glance.
 */

export default function GroundswellOverview() {
  const [setup, setSetup] = useState<SetupStatus | null>(null);
  const [audits, setAudits] = useState<GroundswellAudit[] | null>(null);
  const [partners, setPartners] = useState<GroundswellPartner[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const fail = (what: string) => (err: unknown) =>
      setErrors((e) => [...e, `${what}: ${err instanceof Error ? err.message : 'failed'}`]);
    getSetupStatus().then(setSetup).catch(fail('Setup status'));
    listAudits().then(setAudits).catch(fail('Audits'));
    listPartners().then(setPartners).catch(fail('Partners'));
  }, []);

  const count = (status: GroundswellAudit['status']) => audits?.filter((a) => a.status === status).length ?? '–';
  const fromPartners = audits?.filter((a) => a.partner_id).length ?? '–';

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="max-w-3xl text-sm gs-muted">
          Groundswell is the engine behind Croissance audits. It gathers each Current&rsquo;s public data, writes the audit, and saves the
          reports to Google Drive. Partners add customers from{' '}
          <a href={GROUNDSWELL_PATH} target="_blank" rel="noreferrer" className="gs-link">
            the partner sign-in
          </a>
          ; the public page is{' '}
          <a href={DIVISION_CROISSANCE_PATH} target="_blank" rel="noreferrer" className="gs-link">
            Croissance
          </a>
          .
        </p>
      </header>

      {errors.length > 0 && (
        <div className="gs-alert" role="alert">
          {errors.map((e) => (
            <p key={e}>{e}</p>
          ))}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5" aria-label="Audits by status">
        {(
          [
            ['Queued', count('queued')],
            ['Running', count('running')],
            ['Done', count('done')],
            ['Failed', count('failed')],
            ['Benchmarks', audits?.filter((a) => a.kind === 'benchmark').length ?? '–'],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="gs-card p-5">
            <div className="text-3xl font-bold">{value}</div>
            <div className="mt-1 text-xs gs-muted">{label}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="gs-card space-y-4 p-6">
          <h2 className="text-lg font-bold">Setup</h2>
          {!setup ? (
            <p className="text-sm gs-muted">Checking…</p>
          ) : (
            <>
              <p className="text-sm font-medium" style={{ color: setup.ready ? 'var(--gs-ok)' : 'var(--gs-accent-deep)' }}>
                {setup.ready ? 'Ready to run audits.' : 'Not ready: add the missing variables in Vercel, then redeploy.'}
              </p>
              <ul className="space-y-2" aria-label="Setup checks">
                {setup.checks.map((c) => (
                  <li key={c.key} className="flex items-start gap-2 text-sm">
                    {c.ok ? (
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--gs-ok)' }} aria-label="Set" />
                    ) : (
                      <XCircle size={16} className="mt-0.5 shrink-0" style={{ color: c.required ? 'var(--gs-bad)' : 'var(--nw-slate)' }} aria-label="Missing" />
                    )}
                    <span>
                      {c.label} <code className="text-xs gs-muted">{c.key}</code>
                      {!c.required && <span className="text-xs gs-muted"> (optional)</span>}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs gs-muted">Reports go to Google Drive as {setup.drive_owner}, under Customers/&lt;Business&gt;.</p>
            </>
          )}
        </div>

        <div className="gs-card space-y-4 p-6">
          <h2 className="text-lg font-bold">Partners</h2>
          <p className="text-sm gs-muted">
            {partners
              ? `${partners.filter((p) => p.status === 'active').length} active, ${partners.filter((p) => p.status === 'invited').length} invited, ${partners.filter((p) => p.status === 'disabled').length} turned off. ${fromPartners} audits came from partners.`
              : 'Loading…'}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to={GROUNDSWELL_ADMIN_AUDITS_PATH} className="gs-btn gs-btn-primary">
              <ClipboardList size={16} aria-hidden="true" /> Audit queue
            </Link>
            <Link to={GROUNDSWELL_ADMIN_PARTNERS_PATH} className="gs-btn gs-btn-secondary">
              <Handshake size={16} aria-hidden="true" /> Manage partners
            </Link>
            <a href={GROUNDSWELL_PATH} target="_blank" rel="noreferrer" className="gs-btn gs-btn-ghost">
              <ExternalLink size={16} aria-hidden="true" /> Partner sign-in page
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
