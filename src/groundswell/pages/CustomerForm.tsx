import { useState, type FormEvent } from 'react';
import FormPrivacyNotice from '../../components/legal/FormPrivacyNotice';
import { createPartnerCustomer, updatePartnerCustomer, type NewCustomerDraft, type PartnerAudit, type PartnerCustomer } from '../../lib/groundswellPartner';
import { buildAuditInsert, buildCustomerInsert, type CustomerStage } from '../../lib/groundswellValidation';
import { AUDIT_NAME } from '../site';
import { BusinessBrandPreview, BusinessDiscoveryStatus, CompetitorDiscoverySource } from '../components/BusinessDiscovery';
import { useBusinessDiscovery } from '../components/useBusinessDiscovery';

/**
 * The customer form, in two uses: adding a customer as a prospect or a client
 * (which also queues its first GroundSwell audit, as an audit or a benchmark,
 * with optional logo and colour overrides for the reports) and editing a
 * customer's details. The
 * checks are the shared ones from groundswellValidation, run before the call
 * so a mistake is explained inline.
 */

const field = 'input-light';
const MAX_COMPETITORS = 6;
const blankCompetitor = () => ({ name: '', website: '', instagram: '' });

const emptyDraft = (): NewCustomerDraft => ({
  business_name: '',
  city: '',
  website: '',
  instagram: '',
  facebook: '',
  notes: '',
  brand_logo_url: '',
  brand_color: '',
  competitors: [blankCompetitor()],
});

function draftOf(customer: PartnerCustomer): NewCustomerDraft {
  return {
    business_name: customer.business_name,
    city: customer.city ?? '',
    website: customer.website ?? '',
    instagram: customer.instagram ?? '',
    facebook: customer.facebook ?? '',
    notes: customer.notes ?? '',
    brand_logo_url: '',
    brand_color: '',
    competitors: customer.competitors.length
      ? customer.competitors.map((c) => ({ name: c.name, website: c.website ?? '', instagram: c.instagram ?? '', ...(c.facebook ? { facebook: c.facebook } : {}) }))
      : [blankCompetitor()],
  };
}

type Props =
  | { mode: 'add'; stage: CustomerStage; onSaved: (result: { customer: PartnerCustomer; audit: PartnerAudit }) => void; onCancel?: () => void }
  | { mode: 'edit'; customer: PartnerCustomer; onSaved: (customer: PartnerCustomer) => void; onCancel: () => void };

export function CustomerForm(props: Props) {
  const adding = props.mode === 'add';
  const [draft, setDraft] = useState<NewCustomerDraft>(() => (props.mode === 'edit' ? draftOf(props.customer) : emptyDraft()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const discovery = useBusinessDiscovery(draft, setDraft, 'partner', adding);

  const set = (key: keyof Omit<NewCustomerDraft, 'competitors' | 'kind' | 'stage'>, value: string) => {
    if (key !== 'notes') discovery.markEdited(key, value);
    setDraft((d) => ({ ...d, [key]: value }));
  };
  const benchmark = draft.kind === 'benchmark';
  // A benchmark compares the first two competitors, so the form shows two rows for them.
  const setBenchmark = (on: boolean) =>
    setDraft((d) => ({
      ...d,
      kind: on ? 'benchmark' : 'audit',
      competitors: on && d.competitors.length < 2 ? [...d.competitors, blankCompetitor()] : d.competitors,
    }));
  const setCompetitor = (i: number, key: 'name' | 'website' | 'instagram' | 'facebook', value: string) => {
    discovery.markEdited('competitors');
    setDraft((d) => ({ ...d, competitors: d.competitors.map((c, j) => (j === i ? { ...c, [key]: value } : c)) }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const ready = adding ? await discovery.resolve() : draft;
      if (adding) buildAuditInsert(ready);
      else buildCustomerInsert(ready);
      if (props.mode === 'add') props.onSaved(await createPartnerCustomer({ ...ready, stage: props.stage }));
      else props.onSaved(await updatePartnerCustomer(props.customer.id, ready));
    } catch (err) {
      setError(err instanceof Error ? err.message : adding ? 'Could not add the customer.' : 'Could not save the details.');
      setBusy(false);
    }
  };

  const noun = props.mode === 'add' ? props.stage : props.customer.stage;
  const heading = adding ? `Add a ${noun}` : `Edit ${noun}`;
  return (
    <form onSubmit={submit} className="gs-card gs-portal-customer-form p-5 sm:p-6" aria-labelledby="customer-form-heading">
      <h2 id="customer-form-heading" className="text-xl font-bold">
        {heading}
      </h2>
      <p className="mt-1 text-sm gs-muted">
        {adding ? `Start with a website, Instagram or Facebook profile. Review the details, then queue a ${AUDIT_NAME} audit.` : 'Audits already queued keep the details they were queued with.'}
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
          <input id="pa-instagram" value={draft.instagram} placeholder="@handle or profile link" onChange={(e) => set('instagram', e.target.value)} className={field} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="pa-facebook" className="gs-label">
            Facebook
          </label>
          <input id="pa-facebook" value={draft.facebook ?? ''} placeholder="Facebook page link" onChange={(e) => set('facebook', e.target.value)} className={field} />
        </div>
      </div>
      {adding ? <div className="mt-3"><BusinessDiscoveryStatus discovery={discovery} /></div> : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pa-name" className="gs-label">
            Business name
          </label>
          <input id="pa-name" required={!discovery.pending} aria-required="true" value={draft.business_name} onChange={(e) => set('business_name', e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="pa-city" className="gs-label">
            City
          </label>
          <input id="pa-city" value={draft.city} placeholder="City, State" onChange={(e) => set('city', e.target.value)} className={field} />
        </div>
      </div>
      {adding ? (
        <label className="mt-5 flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1" checked={benchmark} onChange={(e) => setBenchmark(e.target.checked)} />
          <span>
            Add a competitive benchmark against the top two competitors
            <span className="mt-0.5 block text-sm gs-muted">A fourth report: engagement per post, ads on record, published prices and authority, with a plan to close the gap.</span>
          </span>
        </label>
      ) : null}
      <fieldset className="mt-5">
        <legend className="gs-label">
          {benchmark ? `Competitors (the first two are compared; leave a slot blank and GroundSwell picks it from Google Places, one local and one country-wide; up to ${MAX_COMPETITORS})` : `Competitors (optional, up to ${MAX_COMPETITORS})`}
        </legend>
        <div className="space-y-3">
          {draft.competitors.map((c, i) => (
            <div key={i} className="space-y-1.5">
            <div className="grid gap-2 sm:grid-cols-2">
              {(['name', 'website', 'instagram', 'facebook'] as const).map((key) => (
                <input
                  key={key}
                  aria-label={`Competitor ${i + 1} ${key === 'instagram' ? 'Instagram' : key === 'facebook' ? 'Facebook' : key}`}
                  placeholder={key === 'name' ? 'Name' : key === 'website' ? 'Website' : key === 'facebook' ? 'Facebook page' : 'Instagram'}
                  value={c[key] ?? ''}
                  onChange={(e) => setCompetitor(i, key, e.target.value)}
                  className={field}
                />
              ))}
            </div>
            <CompetitorDiscoverySource result={discovery.result} competitor={c} />
            </div>
          ))}
        </div>
        {draft.competitors.length < MAX_COMPETITORS ? (
          <button type="button" className="gs-link mt-2 text-sm max-sm:min-h-11" onClick={() => { discovery.markEdited('competitors'); setDraft((d) => ({ ...d, competitors: [...d.competitors, blankCompetitor()] })); }}>
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
      {adding ? (
        <fieldset className="mt-4 space-y-3">
          <legend className="gs-label">This business’s logo and colour</legend>
          <BusinessBrandPreview name={draft.business_name} logo={draft.brand_logo_url} color={draft.brand_color} colors={discovery.result?.business.brand_colors} onColor={(value) => set('brand_color', value)} />
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
        </fieldset>
      ) : null}
      {error ? (
        <p className="gs-alert mt-3" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className="gs-btn gs-btn-primary">
          {busy ? (discovery.loading ? 'Finding business details…' : 'Saving…') : adding ? (benchmark ? 'Add and queue the audit and benchmark' : 'Add and queue the audit') : 'Save details'}
        </button>
        {props.onCancel ? (
          <button type="button" onClick={props.onCancel} className="gs-btn gs-btn-secondary">
            Cancel
          </button>
        ) : null}
      </div>
      {adding ? <FormPrivacyNotice action="Queuing an audit" /> : null}
    </form>
  );
}
