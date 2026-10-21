import { useEffect, useState } from 'react';
import {
  Plus, Trash2, RefreshCw, Loader2, ExternalLink, FolderOpen, Instagram, Globe, X, Clock, CheckCircle2, XCircle, Play,
} from 'lucide-react';
import {
  addCompetitor,
  BENCHMARK_COMPETITORS,
  deleteAudit,
  isDriveLink,
  listAudits,
  listAuditSteps,
  listPartners,
  queueAudit,
  requeueAudit,
  startQueuedAudits,
  STEP_LABELS,
  type AuditDraft,
  type AuditStep,
  type CompetitorDraft,
  type GroundswellAudit,
} from '../../lib/groundswell';

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

const STEP_COLORS: Record<AuditStep['status'], string> = {
  pending: 'rgba(255,255,255,0.35)',
  running: '#39CCCC',
  done: '#5CC77A',
  skipped: '#F5C26B',
  failed: '#FF7A7A',
};

/** Groundswell's progress through one audit: each step, in order, with its state. */
function StepProgress({ steps }: { steps: AuditStep[] }) {
  return (
    <ol className="flex flex-wrap gap-1.5" aria-label="Audit progress">
      {steps.map((s) => (
        <li
          key={s.step}
          title={s.error ?? undefined}
          className="text-[11px] rounded-full px-2 py-0.5"
          style={{ color: STEP_COLORS[s.status], border: `1px solid ${STEP_COLORS[s.status]}` }}
        >
          {STEP_LABELS[s.step] ?? s.step}: {s.status === 'skipped' ? 'skipped' : s.status === 'pending' ? 'waiting' : s.status}
        </li>
      ))}
    </ol>
  );
}

const input =
  'w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 bg-white/5 border border-white/10 focus:outline-none focus:border-[#39CCCC]';

export default function GroundswellAudits() {
  const [audits, setAudits] = useState<GroundswellAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<AuditDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<{ id: string; competitor: CompetitorDraft } | null>(null);
  const [starting, setStarting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [steps, setSteps] = useState<Record<string, AuditStep[]>>({});
  const [partnerNames, setPartnerNames] = useState<Map<string, string>>(new Map());

  const refresh = async () => {
    try {
      const rows = await listAudits();
      setAudits(rows);
      // Progress is a nice-to-have: the list still shows if the steps can't be read.
      const watched = rows.filter((a) => a.status === 'running' || a.status === 'failed').map((a) => a.id);
      setSteps(await listAuditSteps(watched).catch(() => ({})));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load audits.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // Who submitted partner audits; the queue still shows without it.
    listPartners()
      .then((partners) => setPartnerNames(new Map(partners.map((p) => [p.id, p.company]))))
      .catch(() => {});
  }, []);

  const queued = audits.filter((a) => a.status === 'queued').length;
  const active = audits.some((a) => a.status === 'queued' || a.status === 'running');
  const running = audits.some((a) => a.status === 'running');

  // While audits are waiting or running, re-read the queue so progress and Drive links appear on their own.
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => void refresh(), running ? 15_000 : 30_000);
    return () => window.clearInterval(timer);
  }, [active, running]);

  const startRuns = async () => {
    setError(null);
    setNotice(null);
    setStarting(true);
    try {
      const started = await startQueuedAudits();
      setNotice(
        `Started ${started} audit${started === 1 ? '' : 's'}. Progress shows below; the Drive links appear when each one finishes.`
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the audits.');
    } finally {
      setStarting(false);
    }
  };

  const setField = (key: keyof Omit<AuditDraft, 'competitors' | 'kind'>, value: string) => setDraft((d) => ({ ...d, [key]: value }));
  const benchmark = draft.kind === 'benchmark';
  // A benchmark compares the first two competitors, so the form always shows two rows for them.
  const setBenchmark = (on: boolean) =>
    setDraft((d) => ({
      ...d,
      kind: on ? 'benchmark' : 'audit',
      competitors: on && d.competitors.length < BENCHMARK_COMPETITORS
        ? [...d.competitors, ...Array.from({ length: BENCHMARK_COMPETITORS - d.competitors.length }, () => ({ name: '', website: '', instagram: '' }))]
        : d.competitors,
    }));
  const competitorLabel = (i: number) => (benchmark && i === 0 ? 'Competitor 1 (top)' : `Competitor ${i + 1}`);
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
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Groundswell audits</h1>
          <p className="text-sm text-white/60 max-w-3xl">
            Add a business by its website or Instagram, with any competitors you want compared; adding a competitor
            later queues the audit again. Queued audits run on Groundswell when you press{' '}
            <span className="text-white/80">Run queued audits now</span>: it gathers each Current&rsquo;s data, writes the audit,
            and saves the summary, slide deck and full audit to Google Drive under <span className="text-white/80">Customers</span>,
            shared with anyone who has the link. You can leave this page; audits keep running.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void startRuns()}
          disabled={starting || queued === 0}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
          style={{ background: '#39CCCC', color: '#0f1923' }}
        >
          {starting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Run queued audits now
          {queued > 0 && <span className="rounded-full px-2 text-xs" style={{ background: 'rgba(15,25,35,0.2)' }}>{queued}</span>}
        </button>
      </header>

      {notice && (
        <div role="status" className="rounded-lg px-4 py-3 text-sm" style={{ background: 'rgba(57,204,204,0.12)', color: '#9EE7E7' }}>
          {notice}
        </div>
      )}

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

        <label className="flex items-start gap-3 text-sm text-white/80">
          <input type="checkbox" className="mt-1" checked={benchmark} onChange={(e) => setBenchmark(e.target.checked)} />
          <span>
            Benchmark against the top 2 competitors
            <span className="block text-xs text-white/50">
              Adds a competitive benchmark PDF: engagement per post, ads on record, published prices and authority, with a plan
              to close the gap. The first two competitors are compared, in the order entered.
            </span>
          </span>
        </label>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-white/80">{benchmark ? 'Competitors (the first two are required)' : 'Competitors (optional)'}</legend>
          {draft.competitors.map((c, i) => (
            <div key={i} className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] items-center">
              <input className={input} aria-label={`${competitorLabel(i)} name`} placeholder={benchmark && i < BENCHMARK_COMPETITORS ? competitorLabel(i) : 'Name'} value={c.name} onChange={(e) => setCompetitor(i, 'name', e.target.value)} />
              <input className={input} aria-label={`${competitorLabel(i)} website`} placeholder="Website" value={c.website} onChange={(e) => setCompetitor(i, 'website', e.target.value)} />
              <input className={input} aria-label={`${competitorLabel(i)} Instagram`} placeholder="Instagram" value={c.instagram} onChange={(e) => setCompetitor(i, 'instagram', e.target.value)} />
              <button
                type="button"
                aria-label={`Remove ${competitorLabel(i).toLowerCase()}`}
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
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} {benchmark ? 'Queue benchmark' : 'Queue audit'}
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
                ['Benchmark', a.benchmark_pdf_url ?? null, ExternalLink],
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
                        {a.partner_id && <span>via {partnerNames.get(a.partner_id) ?? 'a partner'}</span>}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-2">
                      {a.kind === 'benchmark' && (
                        <span className="text-xs font-semibold rounded-full px-2.5 py-1" style={{ color: '#F5C26B', background: 'rgba(255,255,255,0.05)' }}>
                          Benchmark
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1" style={{ color: s.color, background: 'rgba(255,255,255,0.05)' }}>
                        <s.Icon size={12} className={a.status === 'running' ? 'animate-spin' : ''} /> {s.label}
                      </span>
                    </span>
                  </div>
                  {steps[a.id]?.length ? <StepProgress steps={steps[a.id]} /> : null}
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
                        Add and queue again
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
                          <RefreshCw size={14} /> Queue again
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
