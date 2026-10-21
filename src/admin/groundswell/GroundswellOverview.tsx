import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, ClipboardList, Handshake, ExternalLink } from 'lucide-react';
import { getSetupStatus, listAudits, listPartners, type GroundswellAudit, type GroundswellPartner, type SetupStatus } from '../../lib/groundswell';
import { DIVISION_CROISSANCE_PATH, DIVISION_PARTNERS_PATH } from '../../divisions/socialEngineering/site';

/**
 * The Groundswell section's front page: whether the engine is set up
 * (which Vercel variables are present; never their values), how many audits
 * are where, and the partner accounts at a glance.
 */

const card = { background: '#111c27', border: '1px solid rgba(255,255,255,0.06)' };

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
    <div className="p-6 lg:p-8 max-w-6xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Groundswell</h1>
        <p className="text-sm text-white/60 max-w-3xl">
          The engine behind Croissance audits. It gathers each Current&rsquo;s public data, writes the audit, and saves the
          three reports to Google Drive. Partners submit businesses from the{' '}
          <a href={DIVISION_PARTNERS_PATH} target="_blank" rel="noreferrer" className="text-[#39CCCC] hover:underline">
            partner portal
          </a>
          ; the public page is{' '}
          <a href={DIVISION_CROISSANCE_PATH} target="_blank" rel="noreferrer" className="text-[#39CCCC] hover:underline">
            Croissance
          </a>
          .
        </p>
      </header>

      {errors.length > 0 && (
        <div className="rounded-lg px-4 py-3 text-sm" role="alert" style={{ background: 'rgba(255,90,90,0.1)', color: '#FFB3B3' }}>
          {errors.map((e) => (
            <p key={e}>{e}</p>
          ))}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Audits by status">
        {(
          [
            ['Queued', count('queued')],
            ['Running', count('running')],
            ['Done', count('done')],
            ['Failed', count('failed')],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-2xl p-5" style={card}>
            <div className="text-3xl font-bold text-white">{value}</div>
            <div className="text-xs text-white/50 mt-1">{label}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl p-6 space-y-4" style={card}>
          <h2 className="text-lg font-semibold text-white">Setup</h2>
          {!setup ? (
            <p className="text-sm text-white/40">Checking…</p>
          ) : (
            <>
              <p className="text-sm" style={{ color: setup.ready ? '#5CC77A' : '#F5C26B' }}>
                {setup.ready ? 'Ready to run audits.' : 'Not ready: add the missing variables in Vercel, then redeploy.'}
              </p>
              <ul className="space-y-2" aria-label="Setup checks">
                {setup.checks.map((c) => (
                  <li key={c.key} className="flex items-start gap-2 text-sm">
                    {c.ok ? (
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0" style={{ color: '#5CC77A' }} aria-label="Set" />
                    ) : (
                      <XCircle size={16} className="mt-0.5 shrink-0" style={{ color: c.required ? '#FF7A7A' : 'rgba(255,255,255,0.35)' }} aria-label="Missing" />
                    )}
                    <span className="text-white/80">
                      {c.label} <code className="text-xs text-white/40">{c.key}</code>
                      {!c.required && <span className="text-xs text-white/40"> (optional)</span>}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-white/40">Reports go to Google Drive as {setup.drive_owner}, under Customers/&lt;Business&gt;.</p>
            </>
          )}
        </div>

        <div className="rounded-2xl p-6 space-y-4" style={card}>
          <h2 className="text-lg font-semibold text-white">Partners</h2>
          <p className="text-sm text-white/60">
            {partners
              ? `${partners.filter((p) => p.status === 'active').length} active, ${partners.filter((p) => p.status === 'invited').length} invited, ${partners.filter((p) => p.status === 'disabled').length} turned off. ${fromPartners} audits came from partners.`
              : 'Loading…'}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/admin/groundswell/audits" className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold" style={{ background: '#39CCCC', color: '#0f1923' }}>
              <ClipboardList size={16} /> Audit queue
            </Link>
            <Link to="/admin/groundswell/partners" className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <Handshake size={16} /> Manage partners
            </Link>
            <a href={DIVISION_PARTNERS_PATH} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white/70 hover:text-white">
              <ExternalLink size={16} /> Partner sign-in page
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
