import { useEffect, useState } from 'react';
import { AdminEmptyState, AdminPageHeader } from './AdminUi';
import { Copy, Loader2, Mail, Palette, Power, UserPlus, Handshake } from 'lucide-react';
import {
  invitePartner,
  listPartners,
  setPartnerBranding,
  updatePartner,
  type GroundswellPartner,
  type PartnerDraft,
} from '../../lib/groundswell';

/**
 * Partner accounts for the Croissance partner portal: outside agencies and
 * resellers who submit businesses and see the audits they submitted. Accounts
 * are by invitation; the invite email carries a link to choose a password, and
 * the same link is shown here once in case the email does not arrive. A
 * partner's reports are white-labelled: "Prepared by" its name and logo (set
 * here or by the partner in the portal), never New Wave's.
 */

const emptyDraft = (): PartnerDraft => ({ company: '', contact_name: '', email: '', notes: '' });

const STATUS = {
  invited: { label: 'Invited', color: 'var(--gs-accent-deep)' },
  active: { label: 'Active', color: 'var(--gs-ok)' },
  disabled: { label: 'Turned off', color: 'var(--gs-bad)' },
} as const;

const input = 'input-light';

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-US') : 'never');

function BrandingEditor({ partner, onSaved }: { partner: GroundswellPartner; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(partner.display_name ?? '');
  const [logo, setLogo] = useState(partner.logo_url ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await setPartnerBranding(partner.id, { display_name: name, logo_url: logo });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the branding.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={save} className="w-full grid gap-2 md:grid-cols-[1fr_1fr_auto] items-start">
      <input
        className={input}
        aria-label={`Name on ${partner.company}'s reports`}
        placeholder={partner.company}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className={input}
        aria-label={`${partner.company}'s logo link`}
        placeholder="https://…/logo.png"
        value={logo}
        onChange={(e) => setLogo(e.target.value)}
      />
      <button type="submit" disabled={busy} className="gs-btn gs-btn-primary">
        Save branding
      </button>
      {error && (
        <p className="gs-alert md:col-span-3" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

export default function GroundswellPartners() {
  const [partners, setPartners] = useState<GroundswellPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<PartnerDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<{ company: string; url: string; emailed: boolean } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [brandingId, setBrandingId] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setPartners(await listPartners());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load partners.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLink(null);
    setSaving(true);
    try {
      const result = await invitePartner(draft);
      setLink({ company: result.partner.company, url: result.invite_url, emailed: result.emailed });
      setDraft(emptyDraft());
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the partner.');
    } finally {
      setSaving(false);
    }
  };

  const act = async (partner: GroundswellPartner, action: 'resend' | 'disable' | 'enable') => {
    if (
      action === 'disable' &&
      !window.confirm(`Turn off ${partner.company}'s account? They are signed out and can't sign in until you turn it back on.`)
    )
      return;
    setError(null);
    setLink(null);
    setBusyId(partner.id);
    try {
      const result = await updatePartner(partner.id, action);
      if ('invite_url' in result) setLink({ company: partner.company, url: result.invite_url, emailed: result.emailed });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="gs-admin-page">
      <AdminPageHeader
        title="Partners"
        description="The agencies behind your customer workspaces. Manage access, invitations, and the name on their reports."
        action={
          <a href="#gs-invite-heading" className="gs-btn gs-btn-secondary">
            <UserPlus size={15} aria-hidden="true" />
            Invite a partner
          </a>
        }
      />
      <div className="gs-admin-directory-stats">
        <span>
          <strong>{loading ? '–' : partners.filter((p) => p.status === 'active').length}</strong>Active partners
        </span>
        <span>
          <strong>{loading ? '–' : partners.filter((p) => p.status === 'invited').length}</strong>Invitations pending
        </span>
        <span>
          <strong>{loading ? '–' : partners.filter((p) => p.status === 'disabled').length}</strong>Turned off
        </span>
      </div>

      {error && (
        <p className="gs-alert" role="alert">
          {error}
        </p>
      )}

      {link && (
        <div className="gs-notice space-y-2" role="status">
          <p>
            {link.emailed
              ? `Emailed ${link.company} a link to choose a password.`
              : `The email to ${link.company} did not send (check RESEND_API_KEY). Send them this link yourself:`}{' '}
            The link is shown only now.
          </p>
          <div className="flex items-center gap-2">
            <code className="break-all text-xs">{link.url}</code>
            <button
              type="button"
              aria-label="Copy the link"
              className="gs-btn gs-btn-ghost shrink-0 px-2"
              onClick={() => void navigator.clipboard?.writeText(link.url)}
            >
              <Copy size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="gs-admin-partners-grid">
        <section className="gs-admin-partner-list space-y-3" aria-label="Partners">
          {loading ? (
            <p className="text-sm gs-muted">Loading…</p>
          ) : partners.length === 0 ? (
            <div className="gs-card">
              <AdminEmptyState title="Your partner network starts here" icon={Handshake}>
                Invite an agency to give its team a dedicated customer workspace.
              </AdminEmptyState>
            </div>
          ) : (
            <ul className="space-y-3">
              {partners.map((p) => {
                const s = STATUS[p.status];
                return (
                  <li key={p.id} className="gs-card gs-admin-partner-card flex flex-wrap items-center justify-between gap-4 p-5">
                    <div>
                      <div className="font-semibold">{p.company}</div>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs gs-muted">
                        <span>
                          {p.contact_name ? `${p.contact_name} · ` : ''}
                          {p.email}
                        </span>
                        <span>
                          {p.audit_count} audit{p.audit_count === 1 ? '' : 's'}
                        </span>
                        <span>last sign-in {when(p.last_sign_in_at)}</span>
                      </div>
                      {p.notes && <p className="mt-1 text-xs gs-muted">{p.notes}</p>}
                      <p className="mt-1 text-xs gs-muted">
                        Reports say “Prepared by {p.display_name || p.company}”{p.logo_url ? ', with their logo' : ''}.
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="gs-chip" style={{ color: s.color }}>
                        {s.label}
                      </span>
                      {p.status !== 'disabled' && (
                        <button
                          type="button"
                          disabled={busyId === p.id}
                          onClick={() => void act(p, 'resend')}
                          className="gs-btn gs-btn-ghost px-2"
                        >
                          <Mail size={14} /> {p.status === 'invited' ? 'Resend invite' : 'Send reset link'}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => void act(p, p.status === 'disabled' ? 'enable' : 'disable')}
                        className="gs-btn gs-btn-ghost px-2"
                      >
                        <Power size={14} /> {p.status === 'disabled' ? 'Turn on' : 'Turn off'}
                      </button>
                      <button
                        type="button"
                        aria-expanded={brandingId === p.id}
                        onClick={() => setBrandingId(brandingId === p.id ? null : p.id)}
                        className="gs-btn gs-btn-ghost px-2"
                      >
                        <Palette size={14} /> Branding
                      </button>
                    </div>
                    {brandingId === p.id && (
                      <BrandingEditor
                        partner={p}
                        onSaved={async () => {
                          setBrandingId(null);
                          await refresh();
                        }}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <form onSubmit={submit} className="gs-card gs-admin-invite-form space-y-4" aria-labelledby="gs-invite-heading">
          <h2 id="gs-invite-heading" className="text-lg font-bold" tabIndex={-1}>
            Invite a partner
          </h2>
          <p className="gs-admin-fine-print">Send a secure invitation to their own GroundSwell workspace.</p>
          <div className="grid gap-4">
            <label>
              <span className="gs-label">Company</span>
              <input
                className={input}
                autoComplete="organization"
                placeholder="Agency name"
                required
                value={draft.company}
                onChange={(e) => setDraft({ ...draft, company: e.target.value })}
              />
            </label>
            <label>
              <span className="gs-label">Contact name</span>
              <input
                className={input}
                autoComplete="name"
                placeholder="Full name"
                value={draft.contact_name}
                onChange={(e) => setDraft({ ...draft, contact_name: e.target.value })}
              />
            </label>
            <label>
              <span className="gs-label">Email</span>
              <input
                className={input}
                autoComplete="email"
                type="email"
                placeholder="name@agency.com"
                required
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
            </label>
          </div>
          <label className="block">
            <span className="gs-label">Notes</span>
            <textarea
              className={input}
              placeholder="For your team only"
              rows={3}
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </label>
          <button type="submit" disabled={saving} className="gs-btn gs-btn-primary">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} Send invite
          </button>
        </form>
      </div>
    </div>
  );
}
