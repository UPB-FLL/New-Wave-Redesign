import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import FormPrivacyNotice from '../../../components/legal/FormPrivacyNotice';
import {
  currentPartner,
  listPartnerAudits,
  partnerSignOut,
  PartnerSignedOut,
  setPartnerPassword,
  submitPartnerAudit,
  type PartnerAudit,
  type PartnerSummary,
} from '../../../lib/groundswellPartner';
import { buildAuditInsert, isDriveLink, type AuditDraft } from '../../../lib/groundswellValidation';
import { usePageMeta } from '../../../lib/usePageMeta';
import { DivisionLayout } from '../components/DivisionLayout';
import { Band, DivisionHero } from '../components/sections';
import { partnersContent } from '../content';
import { DIVISION_NAME, DIVISION_PARTNERS_PATH } from '../site';

/**
 * The partner portal's signed-in pages, both noindex and outside the sitemap:
 * - `dashboard`: queue a business for a Croissance audit and follow the
 *   partner's own audits to their Drive links.
 * - `set-password`: where invite and reset links land.
 */

const field = 'input-light';
const label = 'mb-1.5 block text-sm font-medium text-brand-navy';
const MAX_COMPETITORS = 6;

const emptyDraft = (): AuditDraft => ({
  business_name: '',
  city: '',
  website: '',
  instagram: '',
  notes: '',
  competitors: [{ name: '', website: '', instagram: '' }],
});

const STATUS: Record<PartnerAudit['status'], { label: string; color: string }> = {
  queued: { label: 'Waiting to start', color: 'var(--nw-slate)' },
  running: { label: 'In progress', color: 'var(--nwse-lure-amber-deep)' },
  done: { label: 'Reports ready', color: '#1f7a3a' },
  failed: { label: 'Didn’t finish; we’ll follow up', color: '#b42318' },
};

function usePartnerMeta(title: string) {
  usePageMeta({ title: `${title} | ${DIVISION_NAME}`, includeSiteName: false, noindex: true });
}

function SubmitForm({ onQueued }: { onQueued: () => void }) {
  const [draft, setDraft] = useState<AuditDraft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const set = (key: keyof Omit<AuditDraft, 'competitors'>, value: string) => setDraft((d) => ({ ...d, [key]: value }));
  const setCompetitor = (i: number, key: 'name' | 'website' | 'instagram', value: string) =>
    setDraft((d) => ({ ...d, competitors: d.competitors.map((c, j) => (j === i ? { ...c, [key]: value } : c)) }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      buildAuditInsert(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check the details.');
      return;
    }
    setBusy(true);
    try {
      const audit = await submitPartnerAudit(draft);
      setDraft(emptyDraft());
      setNotice(`${audit.business_name} is queued. We’ll start it shortly, and its reports will appear below.`);
      onQueued();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not queue the audit.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="nw-surface rounded-lg p-5 sm:p-6" aria-labelledby="partner-submit-heading">
      <h2 id="partner-submit-heading" className="nwse-type-title-1 text-[var(--nw-current-navy)]">
        Queue a business
      </h2>
      <p className="nwse-type-body-small mt-1 text-[var(--nw-slate)]">Add a website, an Instagram handle, or both.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pa-name" className={label}>
            Business name
          </label>
          <input id="pa-name" required value={draft.business_name} onChange={(e) => set('business_name', e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="pa-city" className={label}>
            City
          </label>
          <input id="pa-city" value={draft.city} placeholder="Fort Lauderdale, FL" onChange={(e) => set('city', e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="pa-website" className={label}>
            Website
          </label>
          <input id="pa-website" value={draft.website} placeholder="example.com" onChange={(e) => set('website', e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="pa-instagram" className={label}>
            Instagram
          </label>
          <input id="pa-instagram" value={draft.instagram} placeholder="@handle" onChange={(e) => set('instagram', e.target.value)} className={field} />
        </div>
      </div>
      <fieldset className="mt-5">
        <legend className={label}>Competitors (optional, up to {MAX_COMPETITORS})</legend>
        <div className="space-y-3">
          {draft.competitors.map((c, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-3">
              {(['name', 'website', 'instagram'] as const).map((key) => (
                <input
                  key={key}
                  aria-label={`Competitor ${i + 1} ${key === 'instagram' ? 'Instagram' : key}`}
                  placeholder={key === 'name' ? 'Name' : key === 'website' ? 'Website' : 'Instagram'}
                  value={c[key]}
                  onChange={(e) => setCompetitor(i, key, e.target.value)}
                  className={field}
                />
              ))}
            </div>
          ))}
        </div>
        {draft.competitors.length < MAX_COMPETITORS ? (
          <button
            type="button"
            className="mt-2 text-sm font-semibold text-[var(--nwse-lure-amber-deep)] underline-offset-4 hover:underline max-sm:min-h-11"
            onClick={() => setDraft((d) => ({ ...d, competitors: [...d.competitors, { name: '', website: '', instagram: '' }] }))}
          >
            Add another competitor
          </button>
        ) : null}
      </fieldset>
      <div className="mt-4">
        <label htmlFor="pa-notes" className={label}>
          Notes for our team (optional)
        </label>
        <textarea id="pa-notes" rows={3} value={draft.notes} onChange={(e) => set('notes', e.target.value)} className={field} />
      </div>
      {error ? (
        <p className="mt-3 text-sm text-[#b42318]" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mt-3 text-sm text-[var(--nw-slate)]" role="status">
          {notice}
        </p>
      ) : null}
      <button type="submit" disabled={busy} className="nwse-btn nwse-btn-amber-deep mt-5 disabled:opacity-60">
        Queue the audit
      </button>
      <FormPrivacyNotice action="Queuing an audit" />
    </form>
  );
}

function AuditList({ audits }: { audits: PartnerAudit[] }) {
  if (!audits.length) {
    return <p className="nwse-type-body-small mt-4 text-[var(--nw-slate)]">No audits yet. Queue your first business above.</p>;
  }
  return (
    <ul className="mt-4 space-y-3" aria-label="Your audits">
      {audits.map((a) => {
        const status = STATUS[a.status] ?? STATUS.queued;
        const links = [
          ['Summary', a.summary_pdf_url],
          ['Slides', a.deck_pdf_url],
          ['Full audit', a.audit_pdf_url],
          ['All files', a.drive_folder_url],
        ].filter((pair): pair is [string, string] => isDriveLink(pair[1]));
        return (
          <li key={a.id} className="nwse-card p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="nwse-type-title-2 text-[var(--nw-current-navy)]">{a.business_name}</h3>
              <span className="text-sm font-semibold" style={{ color: status.color }}>
                {status.label}
              </span>
            </div>
            <p className="nwse-type-body-small mt-1 text-[var(--nw-slate)]">
              {[a.city, a.website, a.instagram ? `@${a.instagram}` : null].filter(Boolean).join(' · ')}
              {' · '}queued {new Date(a.created_at).toLocaleDateString('en-US')}
            </p>
            {links.length ? (
              <p className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                {links.map(([name, url]) => (
                  <a key={name} href={url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[var(--nwse-lure-amber-deep)] underline-offset-4 hover:underline">
                    {name} (Google Drive)
                  </a>
                ))}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function Dashboard() {
  usePartnerMeta('Partner dashboard');
  const navigate = useNavigate();
  const [partner, setPartner] = useState<PartnerSummary | null>(null);
  const [audits, setAudits] = useState<PartnerAudit[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setAudits(await listPartnerAudits());
    } catch (err) {
      if (err instanceof PartnerSignedOut) navigate(DIVISION_PARTNERS_PATH, { replace: true });
      else setError(err instanceof Error ? err.message : 'Could not load your audits.');
    }
  }, [navigate]);

  useEffect(() => {
    let live = true;
    currentPartner()
      .then((p) => {
        if (!live) return;
        if (!p) navigate(DIVISION_PARTNERS_PATH, { replace: true });
        else {
          setPartner(p);
          void refresh();
        }
      })
      .catch((err) => live && setError(err instanceof Error ? err.message : 'Could not load the dashboard.'));
    return () => {
      live = false;
    };
  }, [navigate, refresh]);

  const active = audits.some((a) => a.status === 'queued' || a.status === 'running');
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(timer);
  }, [active, refresh]);

  const signOut = async () => {
    await partnerSignOut();
    navigate(DIVISION_PARTNERS_PATH);
  };

  return (
    <DivisionLayout>
      <DivisionHero
        kicker={partnersContent.headline}
        headline={partner ? partner.company : 'Partner dashboard'}
        summary="Queue businesses for a Croissance audit and download their reports here."
        actions={
          partner ? (
            <button type="button" onClick={() => void signOut()} className="nwse-btn nwse-btn-ghost-dark">
              Sign out
            </button>
          ) : null
        }
      />
      <Band tone="white">
        {error ? (
          <p className="mb-4 text-sm text-[#b42318]" role="alert">
            {error}
          </p>
        ) : null}
        {partner ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
            <SubmitForm onQueued={() => void refresh()} />
            <section aria-labelledby="partner-audits-heading">
              <h2 id="partner-audits-heading" className="nwse-type-title-1 text-[var(--nw-current-navy)]">
                Your audits
              </h2>
              <AuditList audits={audits} />
            </section>
          </div>
        ) : (
          <p aria-busy="true" className="text-sm text-[var(--nw-slate)]">
            Loading…
          </p>
        )}
      </Band>
    </DivisionLayout>
  );
}

function SetPassword() {
  usePartnerMeta('Choose your password');
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('The two passwords don’t match.');
      return;
    }
    setBusy(true);
    try {
      await setPartnerPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <DivisionLayout>
      <DivisionHero kicker={partnersContent.headline} headline="Choose your password" summary="Use at least 10 characters. A passphrase of a few words is easiest to remember." />
      <Band tone="white">
        <div className="max-w-md">
          {!token ? (
            <p className="text-sm text-[#b42318]" role="alert">
              This page needs the link from your invite or reset email.
            </p>
          ) : done ? (
            <div role="status">
              <p className="nwse-type-body text-[var(--nw-current-navy)]">Your password is saved.</p>
              <Link to={DIVISION_PARTNERS_PATH} className="nwse-btn nwse-btn-amber-deep mt-4">
                Sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="nw-surface rounded-lg p-5 sm:p-6">
              <div>
                <label htmlFor="pw-new" className={label}>
                  New password
                </label>
                <input id="pw-new" type="password" autoComplete="new-password" minLength={10} required value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
              </div>
              <div className="mt-4">
                <label htmlFor="pw-confirm" className={label}>
                  Type it again
                </label>
                <input id="pw-confirm" type="password" autoComplete="new-password" minLength={10} required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} />
              </div>
              {error ? (
                <p className="mt-3 text-sm text-[#b42318]" role="alert">
                  {error}
                </p>
              ) : null}
              <button type="submit" disabled={busy} className="nwse-btn nwse-btn-amber-deep mt-5 disabled:opacity-60">
                Save password
              </button>
            </form>
          )}
        </div>
      </Band>
    </DivisionLayout>
  );
}

export default function SocialEngineeringPartnerAppPage({ view }: { view: 'dashboard' | 'set-password' }) {
  return view === 'dashboard' ? <Dashboard /> : <SetPassword />;
}
