import { useEffect, useState } from 'react';
import { Copy, Loader2, Mail, Palette, Power, UserPlus } from 'lucide-react';
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
  invited: { label: 'Invited', color: '#F5C26B' },
  active: { label: 'Active', color: '#5CC77A' },
  disabled: { label: 'Turned off', color: '#FF7A7A' },
} as const;

const input =
  'w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 bg-white/5 border border-white/10 focus:outline-none focus:border-[#39CCCC]';

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
      <input className={input} aria-label={`Name on ${partner.company}'s reports`} placeholder={partner.company} value={name} onChange={(e) => setName(e.target.value)} />
      <input className={input} aria-label={`${partner.company}'s logo link`} placeholder="https://…/logo.png" value={logo} onChange={(e) => setLogo(e.target.value)} />
      <button type="submit" disabled={busy} className="rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50" style={{ background: '#39CCCC', color: '#0f1923' }}>
        Save branding
      </button>
      {error && (
        <p className="md:col-span-3 text-xs" role="alert" style={{ color: '#FFB3B3' }}>
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
    if (action === 'disable' && !window.confirm(`Turn off ${partner.company}'s account? They are signed out and can't sign in until you turn it back on.`)) return;
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
    <div className="p-6 lg:p-8 max-w-6xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Groundswell partners</h1>
        <p className="text-sm text-white/60 max-w-3xl">
          Agencies and resellers who submit businesses for Croissance audits from the partner portal. They see only the
          audits they submitted. Partner accounts are separate from admin sign-in: a partner can never reach this portal.
        </p>
      </header>

      {error && (
        <p className="rounded-lg px-4 py-3 text-sm" role="alert" style={{ background: 'rgba(255,90,90,0.1)', color: '#FFB3B3' }}>
          {error}
        </p>
      )}

      {link && (
        <div className="rounded-lg px-4 py-3 text-sm space-y-2" role="status" style={{ background: 'rgba(57,204,204,0.1)', color: '#BFF2F2' }}>
          <p>
            {link.emailed
              ? `Emailed ${link.company} a link to choose a password.`
              : `The email to ${link.company} did not send (check RESEND_API_KEY). Send them this link yourself:`}{' '}
            The link is shown only now.
          </p>
          <div className="flex items-center gap-2">
            <code className="text-xs break-all text-white/80">{link.url}</code>
            <button
              type="button"
              aria-label="Copy the link"
              className="shrink-0 p-1.5 rounded text-white/60 hover:text-white"
              onClick={() => void navigator.clipboard?.writeText(link.url)}
            >
              <Copy size={14} />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="rounded-2xl p-6 space-y-4" style={{ background: '#111c27', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h2 className="text-lg font-semibold text-white">Invite a partner</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <input className={input} aria-label="Company" placeholder="Company" required value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} />
          <input className={input} aria-label="Contact name" placeholder="Contact name" value={draft.contact_name} onChange={(e) => setDraft({ ...draft, contact_name: e.target.value })} />
          <input className={input} aria-label="Email" type="email" placeholder="Email" required value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
        </div>
        <textarea className={input} aria-label="Notes" placeholder="Notes (only admins see these)" rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50" style={{ background: '#39CCCC', color: '#0f1923' }}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} Send invite
        </button>
      </form>

      <section className="space-y-3" aria-label="Partners">
        {loading ? (
          <p className="text-sm text-white/40">Loading…</p>
        ) : partners.length === 0 ? (
          <p className="text-sm text-white/40">No partners yet.</p>
        ) : (
          <ul className="space-y-3">
            {partners.map((p) => {
              const s = STATUS[p.status];
              return (
                <li key={p.id} className="rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4" style={{ background: '#111c27', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <div className="font-semibold text-white">{p.company}</div>
                    <div className="text-xs text-white/50 flex flex-wrap gap-3 mt-1">
                      <span>{p.contact_name ? `${p.contact_name} · ` : ''}{p.email}</span>
                      <span>
                        {p.audit_count} audit{p.audit_count === 1 ? '' : 's'}
                      </span>
                      <span>last sign-in {when(p.last_sign_in_at)}</span>
                    </div>
                    {p.notes && <p className="text-xs text-white/40 mt-1">{p.notes}</p>}
                    <p className="text-xs text-white/50 mt-1">Reports say “Prepared by {p.display_name || p.company}”{p.logo_url ? ', with their logo' : ''}.</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-xs font-semibold rounded-full px-2.5 py-1" style={{ color: s.color, background: 'rgba(255,255,255,0.05)' }}>
                      {s.label}
                    </span>
                    {p.status !== 'disabled' && (
                      <button type="button" disabled={busyId === p.id} onClick={() => void act(p, 'resend')} className="inline-flex items-center gap-1.5 text-white/60 hover:text-white disabled:opacity-50">
                        <Mail size={14} /> {p.status === 'invited' ? 'Resend invite' : 'Send reset link'}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => void act(p, p.status === 'disabled' ? 'enable' : 'disable')}
                      className="inline-flex items-center gap-1.5 text-white/40 hover:text-white disabled:opacity-50"
                    >
                      <Power size={14} /> {p.status === 'disabled' ? 'Turn on' : 'Turn off'}
                    </button>
                    <button
                      type="button"
                      aria-expanded={brandingId === p.id}
                      onClick={() => setBrandingId(brandingId === p.id ? null : p.id)}
                      className="inline-flex items-center gap-1.5 text-white/40 hover:text-white"
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
    </div>
  );
}
