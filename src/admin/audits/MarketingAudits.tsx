import { useEffect, useState } from 'react';
import {
  Plus, Trash2, RefreshCw, Loader2, ExternalLink, FolderOpen, Instagram, Globe, X, Clock, CheckCircle2, XCircle,
} from 'lucide-react';
import {
  addCompetitor,
  deleteAudit,
  isDriveLink,
  listAudits,
  queueAudit,
  requeueAudit,
  type AuditDraft,
  type CompetitorDraft,
  type MarketingAudit,
} from '../../lib/marketingAudits';

const emptyDraft = (): AuditDraft => ({
  business_name: '',
  city: '',
  website: '',
  instagram: '',
  notes: '',
  competitors: [{ name: '', website: '', instagram: '' }],
});

const STATUS = {
  queued: { label: 'Queued', color: '#F5C26B', Icon: Clock },
  running: { label: 'Running', color: '#39CCCC', Icon: Loader2 },
  done: { label: 'Done', color: '#5CC77A', Icon: CheckCircle2 },
  failed: { label: 'Failed', color: '#FF7A7A', Icon: XCircle },
} as const;

const input =
  'w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 bg-white/5 border border-white/10 focus:outline-none focus:border-[#39CCCC]';

export default function MarketingAudits() {
  const [audits, setAudits] = useState<MarketingAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<AuditDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<{ id: string; competitor: CompetitorDraft } | null>(null);

  const refresh = async () => {
    try {
      setAudits(await listAudits());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load audits.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const setField = (key: keyof Omit<AuditDraft, 'competitors'>, value: string) => setDraft((d) => ({ ...d, [key]: value }));
  const setCompetitor = (i: number, key: 'name' | 'website' | 'instagram', value: string) =>
    setDraft((d) => ({ ...d, competitors: d.competitors.map((c, j) => (j === i ? { ...c, [key]: value } : c)) }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await queueAudit(draft);
      setDraft(emptyDraft());
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not queue the audit.');
    } finally {
      setSaving(false);
    }
  };

  const act = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Marketing audits</h1>
        <p className="text-sm text-white/60 max-w-3xl">
          Add a business by its website or Instagram, with any competitors you want compared; adding a competitor
          later runs the audit again. The audit routine checks this queue every hour, builds the summary, slide deck and full audit, and saves them to Google
          Drive under <span className="text-white/80">Customers</span>, shared with anyone who has the link.
        </p>
      </header>

      {error && (
        <div role="alert" className="rounded-lg px-4 py-3 text-sm" style={{ background: 'rgba(255,122,122,0.12)', color: '#FFB3B3' }}>
          {error}
        </div>
      )}

      <form onSubmit={submit} className="rounded-2xl p-6 space-y-5" style={{ background: '#111c27', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm text-white/70">
            <span>Business name</span>
            <input className={input} value={draft.business_name} onChange={(e) => setField('business_name', e.target.value)} required />
          </label>
          <label className="space-y-1 text-sm text-white/70">
            <span>City</span>
            <input className={input} value={draft.city} placeholder="Delray Beach, FL" onChange={(e) => setField('city', e.target.value)} />
          </label>
          <label className="space-y-1 text-sm text-white/70">
            <span>Website</span>
            <input className={input} value={draft.website} placeholder="example.com" onChange={(e) => setField('website', e.target.value)} />
          </label>
          <label className="space-y-1 text-sm text-white/70">
            <span>Instagram</span>
            <input className={input} value={draft.instagram} placeholder="@handle or profile link" onChange={(e) => setField('instagram', e.target.value)} />
          </label>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-white/80">Competitors (optional)</legend>
          {draft.competitors.map((c, i) => (
            <div key={i} className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] items-center">
              <input className={input} aria-label={`Competitor ${i + 1} name`} placeholder="Name" value={c.name} onChange={(e) => setCompetitor(i, 'name', e.target.value)} />
              <input className={input} aria-label={`Competitor ${i + 1} website`} placeholder="Website" value={c.website} onChange={(e) => setCompetitor(i, 'website', e.target.value)} />
              <input className={input} aria-label={`Competitor ${i + 1} Instagram`} placeholder="Instagram" value={c.instagram} onChange={(e) => setCompetitor(i, 'instagram', e.target.value)} />
              <button
                type="button"
                aria-label={`Remove competitor ${i + 1}`}
                className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5"
                onClick={() => setDraft((d) => ({ ...d, competitors: d.competitors.filter((_, j) => j !== i) }))}
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="inline-flex items-center gap-2 text-sm text-[#39CCCC] hover:underline"
            onClick={() => setDraft((d) => ({ ...d, competitors: [...d.competitors, { name: '', website: '', instagram: '' }] }))}
          >
            <Plus size={14} /> Add competitor
          </button>
        </fieldset>

        <label className="block space-y-1 text-sm text-white/70">
          <span>Notes for the audit (optional)</span>
          <textarea className={input} rows={2} value={draft.notes} onChange={(e) => setField('notes', e.target.value)} />
        </label>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
          style={{ background: '#39CCCC', color: '#0f1923' }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Queue audit
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Requests</h2>
        {loading ? (
          <p className="text-sm text-white/50">Loading…</p>
        ) : audits.length === 0 ? (
          <p className="text-sm text-white/50">No audits yet.</p>
        ) : (
          <ul className="space-y-3">
            {audits.map((a) => {
              const s = STATUS[a.status] ?? STATUS.queued;
              const links = [
                ['Drive folder', a.drive_folder_url, FolderOpen],
                ['Summary PDF', a.summary_pdf_url, ExternalLink],
                ['Slide deck', a.deck_pdf_url, ExternalLink],
                ['Full audit', a.audit_pdf_url, ExternalLink],
              ] as const;
              return (
                <li key={a.id} className="rounded-2xl p-5 space-y-3" style={{ background: '#111c27', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-white">{a.business_name}</div>
                      <div className="text-xs text-white/50 flex flex-wrap gap-3 mt-1">
                        {a.city && <span>{a.city}</span>}
                        {a.website && <span className="inline-flex items-center gap-1"><Globe size={12} />{a.website}</span>}
                        {a.instagram && <span className="inline-flex items-center gap-1"><Instagram size={12} />@{a.instagram}</span>}
                        <span>{a.competitors.length} competitor{a.competitors.length === 1 ? '' : 's'}</span>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1" style={{ color: s.color, background: 'rgba(255,255,255,0.05)' }}>
                      <s.Icon size={12} className={a.status === 'running' ? 'animate-spin' : ''} /> {s.label}
                    </span>
                  </div>
                  {a.error && <p className="text-xs" style={{ color: '#FFB3B3' }}>{a.error}</p>}
                  {adding?.id === a.id && (
                    <form
                      className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto_auto] items-center"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const competitor = adding.competitor;
                        void act(async () => {
                          await addCompetitor(a, competitor);
                          setAdding(null);
                        });
                      }}
                    >
                      {(['name', 'website', 'instagram'] as const).map((key) => (
                        <input
                          key={key}
                          className={input}
                          aria-label={`New competitor ${key === 'instagram' ? 'Instagram' : key}`}
                          placeholder={key === 'name' ? 'Name' : key === 'website' ? 'Website' : 'Instagram'}
                          value={adding.competitor[key]}
                          onChange={(e) => setAdding({ id: a.id, competitor: { ...adding.competitor, [key]: e.target.value } })}
                        />
                      ))}
                      <button type="submit" className="rounded-lg px-3 py-2 text-sm font-semibold" style={{ background: '#39CCCC', color: '#0f1923' }}>
                        Add and run again
                      </button>
                      <button type="button" aria-label="Cancel" className="p-2 rounded-lg text-white/40 hover:text-white" onClick={() => setAdding(null)}>
                        <X size={16} />
                      </button>
                    </form>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    {links.filter(([, url]) => isDriveLink(url)).map(([label, url, Icon]) => (
                      <a key={label} href={url as string} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[#39CCCC] hover:underline">
                        <Icon size={14} /> {label}
                      </a>
                    ))}
                    <span className="flex-1" />
                    {a.status !== 'running' && (
                      <>
                        <button
                          type="button"
                          aria-label={`Add a competitor to ${a.business_name}`}
                          onClick={() => setAdding({ id: a.id, competitor: { name: '', website: '', instagram: '' } })}
                          className="inline-flex items-center gap-1.5 text-white/60 hover:text-white"
                        >
                          <Plus size={14} /> Add competitor
                        </button>
                        <button type="button" onClick={() => act(() => requeueAudit(a.id))} className="inline-flex items-center gap-1.5 text-white/60 hover:text-white">
                          <RefreshCw size={14} /> Run again
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => window.confirm(`Delete the audit request for ${a.business_name}? Files already in Drive stay there.`) && act(() => deleteAudit(a.id))}
                      className="inline-flex items-center gap-1.5 text-white/40 hover:text-[#FF7A7A]"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
