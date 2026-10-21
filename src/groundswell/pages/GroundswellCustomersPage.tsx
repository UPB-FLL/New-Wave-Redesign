import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import FormPrivacyNotice from '../../components/legal/FormPrivacyNotice';
import {
  getPartnerBranding,
  listPartnerAudits,
  PartnerSignedOut,
  savePartnerBranding,
  submitPartnerAudit,
  type PartnerAudit,
  type PartnerBrandingState,
} from '../../lib/groundswellPartner';
import { buildAuditInsert, buildPartnerBranding, isDriveLink, type AuditDraft } from '../../lib/groundswellValidation';
import { usePageMeta } from '../../lib/usePageMeta';
import { PartnerApp } from '../PartnerApp';
import { AUDIT_NAME, GROUNDSWELL_NAME, GROUNDSWELL_PATH } from '../site';

/**
 * A partner's customers (noindex): add a business for a Croissance audit, and
 * follow each one to its Drive links. Each submission is an audit row the
 * partner owns; New Wave starts it from the staff queue. Below the list, the
 * partner sets the name and logo its reports carry (they never name New Wave).
 */

const field = 'input-light';
const MAX_COMPETITORS = 6;

const emptyDraft = (): AuditDraft => ({
  business_name: '',
  city: '',
  website: '',
  instagram: '',
  notes: '',
  brand_logo_url: '',
  brand_color: '',
  competitors: [{ name: '', website: '', instagram: '' }],
});

const STATUS: Record<PartnerAudit['status'], { label: string; color: string }> = {
  queued: { label: 'Waiting to start', color: 'var(--gs-wait)' },
  running: { label: 'In progress', color: 'var(--gs-accent-deep)' },
  done: { label: 'Reports ready', color: 'var(--gs-ok)' },
  failed: { label: 'Didn’t finish; we’ll follow up', color: 'var(--gs-bad)' },
};

function AddCustomerForm({ onQueued, onCancel }: { onQueued: () => void; onCancel?: () => void }) {
  const [draft, setDraft] = useState<AuditDraft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const set = (key: keyof Omit<AuditDraft, 'competitors' | 'kind'>, value: string) => setDraft((d) => ({ ...d, [key]: value }));
  const benchmark = draft.kind === 'benchmark';
  // A benchmark compares the first two competitors, so the form shows two rows for them.
  const setBenchmark = (on: boolean) =>
    setDraft((d) => ({
      ...d,
      kind: on ? 'benchmark' : 'audit',
      competitors: on && d.competitors.length < 2 ? [...d.competitors, { name: '', website: '', instagram: '' }] : d.competitors,
    }));
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
      setNotice(`${audit.business_name} is queued. We’ll start it shortly, and its reports will appear in your customers.`);
      onQueued();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not queue the audit.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="gs-card p-5 sm:p-6" aria-labelledby="partner-submit-heading">
      <h2 id="partner-submit-heading" className="text-xl font-bold">
        Add a customer
      </h2>
      <p className="mt-1 text-sm gs-muted">Add a website, an Instagram handle, or both. We queue a {AUDIT_NAME} audit for it.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pa-name" className="gs-label">
            Business name
          </label>
          <input id="pa-name" required value={draft.business_name} onChange={(e) => set('business_name', e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="pa-city" className="gs-label">
            City
          </label>
          <input id="pa-city" value={draft.city} placeholder="City, State" onChange={(e) => set('city', e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="pa-website" className="gs-label">
            Website
          </label>
          <input id="pa-website" value={draft.website} placeholder="example.com" onChange={(e) => set('website', e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="pa-instagram" className="gs-label">
            Instagram
          </label>
          <input id="pa-instagram" value={draft.instagram} placeholder="@handle" onChange={(e) => set('instagram', e.target.value)} className={field} />
        </div>
      </div>
      <label className="mt-5 flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-1" checked={benchmark} onChange={(e) => setBenchmark(e.target.checked)} />
        <span>
          Add a competitive benchmark against the top two competitors
          <span className="mt-0.5 block text-sm gs-muted">A fourth report: engagement per post, ads on record, published prices and authority, with a plan to close the gap.</span>
        </span>
      </label>
      <fieldset className="mt-5">
        <legend className="gs-label">
          {benchmark ? `Competitors (the first two are compared; up to ${MAX_COMPETITORS})` : `Competitors (optional, up to ${MAX_COMPETITORS})`}
        </legend>
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
          <button type="button" className="gs-link mt-2 text-sm max-sm:min-h-11" onClick={() => setDraft((d) => ({ ...d, competitors: [...d.competitors, { name: '', website: '', instagram: '' }] }))}>
            Add another competitor
          </button>
        ) : null}
      </fieldset>
      <div className="mt-4">
        <label htmlFor="pa-notes" className="gs-label">
          Notes for our team (optional)
        </label>
        <textarea id="pa-notes" rows={3} value={draft.notes} onChange={(e) => set('notes', e.target.value)} className={field} />
      </div>
      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-semibold max-sm:min-h-11">This business’s logo and colour (optional)</summary>
        <p className="mt-2 text-sm gs-muted">The reports use the business’s own logo and colours from its website. Set them here if the website’s are wrong or missing.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pa-brand-logo" className="gs-label">
              Logo link
            </label>
            <input id="pa-brand-logo" value={draft.brand_logo_url ?? ''} placeholder="https://…/logo.png" onChange={(e) => set('brand_logo_url', e.target.value)} className={field} />
          </div>
          <div>
            <label htmlFor="pa-brand-color" className="gs-label">
              Main colour
            </label>
            <input id="pa-brand-color" value={draft.brand_color ?? ''} placeholder="#1a2b3c" onChange={(e) => set('brand_color', e.target.value)} className={field} />
          </div>
        </div>
      </details>
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
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className="gs-btn gs-btn-primary">
          {benchmark ? 'Queue the audit and benchmark' : 'Queue the audit'}
        </button>
        {onCancel ? (
          <button type="button" onClick={onCancel} className="gs-btn gs-btn-secondary">
            Close
          </button>
        ) : null}
      </div>
      <FormPrivacyNotice action="Queuing an audit" />
    </form>
  );
}

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

function CustomerList({ audits }: { audits: PartnerAudit[] }) {
  if (!audits.length) {
    return <p className="mt-4 text-sm gs-muted">No customers yet. Add your first one above.</p>;
  }
  return (
    <ul className="mt-4 space-y-3" aria-label="Your customers">
      {audits.map((a) => {
        const status = STATUS[a.status] ?? STATUS.queued;
        const links = [
          ['Summary', a.summary_pdf_url],
          ['Slides', a.deck_pdf_url],
          ['Full audit', a.audit_pdf_url],
          ['Competitive benchmark', a.benchmark_pdf_url ?? null],
          ['All files', a.drive_folder_url],
        ].filter((pair): pair is [string, string] => isDriveLink(pair[1]));
        return (
          <li key={a.id} className="gs-card p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-lg font-bold">{a.business_name}</h3>
              <span className="gs-chip" style={{ color: status.color }}>
                {status.label}
              </span>
            </div>
            <p className="mt-1 text-sm gs-muted">
              {[a.city, a.website, a.instagram ? `@${a.instagram}` : null].filter(Boolean).join(' · ')}
              {' · '}queued {new Date(a.created_at).toLocaleDateString('en-US')}
            </p>
            {links.length ? (
              <p className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                {links.map(([name, url]) => (
                  <a key={name} href={url} target="_blank" rel="noreferrer" className="gs-link text-sm">
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

function Customers() {
  const navigate = useNavigate();
  const [audits, setAudits] = useState<PartnerAudit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setAudits(await listPartnerAudits());
    } catch (err) {
      if (err instanceof PartnerSignedOut) navigate(GROUNDSWELL_PATH, { replace: true });
      else setError(err instanceof Error ? err.message : 'Could not load your customers.');
    }
  }, [navigate]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const active = audits?.some((a) => a.status === 'queued' || a.status === 'running') ?? false;
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(timer);
  }, [active, refresh]);

  const showForm = adding || audits?.length === 0;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="mt-1 text-sm gs-muted">Every business you’ve submitted, with its reports once they are ready.</p>
        </div>
        {!showForm ? (
          <button type="button" onClick={() => setAdding(true)} className="gs-btn gs-btn-primary">
            <Plus size={16} aria-hidden="true" /> Add a customer
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
          <AddCustomerForm onQueued={() => void refresh()} onCancel={audits?.length ? () => setAdding(false) : undefined} />
        </div>
      ) : null}
      <section aria-labelledby="partner-customers-heading" className="mt-8">
        <h2 id="partner-customers-heading" className="text-xl font-bold">
          Your customers
        </h2>
        {audits ? (
          <CustomerList audits={audits} />
        ) : (
          <p aria-busy="true" className="mt-4 text-sm gs-muted">
            Loading…
          </p>
        )}
      </section>
      <BrandingPanel />
    </>
  );
}

export default function GroundswellCustomersPage() {
  usePageMeta({ title: `Customers | ${GROUNDSWELL_NAME}`, includeSiteName: false, noindex: true });
  return <PartnerApp>{() => <Customers />}</PartnerApp>;
}
