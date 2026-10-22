import { useEffect, useState } from 'react';
import {
  Plus, Trash2, RefreshCw, Loader2, ExternalLink, FolderOpen, Instagram, Globe, X, Clock, CheckCircle2, XCircle, Play, AlertTriangle, Send,
} from 'lucide-react';
import {
  addCompetitor,
  answerReview,
  listHeldChecks,
  type HeldCheck,
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
  brand_logo_url: '',
  brand_color: '',
  competitors: [{ name: '', website: '', instagram: '' }],
});

const STATUS = {
  queued: { label: 'Queued', color: 'var(--gs-wait)', Icon: Clock },
  running: { label: 'Running', color: 'var(--gs-accent-deep)', Icon: Loader2 },
  done: { label: 'Done', color: 'var(--gs-ok)', Icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'var(--gs-bad)', Icon: XCircle },
  review: { label: 'Needs review', color: 'var(--gs-accent-deep)', Icon: AlertTriangle },
} as const;

const STEP_COLORS: Record<AuditStep['status'], string> = {
  pending: 'var(--gs-wait)',
  running: 'var(--gs-accent-deep)',
  done: 'var(--gs-ok)',
  skipped: 'var(--gs-accent-deep)',
  failed: 'var(--gs-bad)',
};

/** Groundswell's progress through one audit: each step, in order, with its state. */
function StepProgress({ steps }: { steps: AuditStep[] }) {
  return (
    <ol className="flex flex-wrap gap-1.5" aria-label="Audit progress">
      {steps.map((s) => (
        <li
          key={s.step}
          title={s.error ?? undefined}
          className="gs-chip font-medium"
          style={{ color: STEP_COLORS[s.status] }}
        >
          {STEP_LABELS[s.step] ?? s.step}: {s.status === 'skipped' ? 'skipped' : s.status === 'pending' ? 'waiting' : s.status}
        </li>
      ))}
    </ol>
  );
}

const shown = (v: number | string | null) => (v === null ? 'not read' : typeof v === 'number' ? v.toLocaleString('en-US') : v);

/**
 * An audit held before delivery: what the checks found (each figure that moved
 * between the first read and the latest, and what the reviewer changed), and
 * the two ways on: deliver as it stands, or read the figures again.
 */
function ReviewPanel({ name, check, onAnswer }: { name: string; check: HeldCheck | undefined; onAnswer: (action: 'deliver' | 'recheck') => void }) {
  const moved = check?.disagreements ?? [];
  const listed = moved.slice(0, 8);
  const review = check?.review;
  return (
    <div className="gs-notice space-y-3">
      <p>Nothing has been delivered. Look at what the checks found, then deliver it as it stands or read the figures again.</p>
      {listed.length > 0 && (
        <ul className="space-y-1 gs-muted" aria-label={`What moved for ${name}`}>
          {listed.map((d) => (
            <li key={d.key}>
              <span className="font-semibold" style={{ color: 'var(--nw-current-navy)' }}>{d.label}</span>:{' '}
              {d.kind === 'unread' && d.later === null ? 'could not be read again' : `${shown(d.earlier)} on the first read, ${shown(d.later)} on the latest`}
            </li>
          ))}
          {moved.length > listed.length && <li>and {moved.length - listed.length} more</li>}
        </ul>
      )}
      {review && (review.corrected.length > 0 || review.dropped.length > 0) && (
        <p className="gs-muted">
          The reviewer checked {review.checked} sentences: corrected {review.corrected.length}, dropped {review.dropped.length}.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => window.confirm(`Deliver ${name} as it stands? The reports use the first read, with the reviewer's corrections.`) && onAnswer('deliver')}
          className="gs-btn gs-btn-primary"
        >
          <Send size={14} /> Deliver anyway
        </button>
        <button type="button" onClick={() => onAnswer('recheck')} className="gs-btn gs-btn-secondary">
          <RefreshCw size={14} /> Run the checks again
        </button>
      </div>
    </div>
  );
}

const input = 'input-light';

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
  const [held, setHeld] = useState<Record<string, HeldCheck>>({});
  const [partnerNames, setPartnerNames] = useState<Map<string, string>>(new Map());

  const refresh = async () => {
    try {
      const rows = await listAudits();
      setAudits(rows);
      // Progress is a nice-to-have: the list still shows if the steps can't be read.
      const watched = rows.filter((a) => a.status === 'running' || a.status === 'failed' || a.status === 'review').map((a) => a.id);
      setSteps(await listAuditSteps(watched).catch(() => ({})));
      const inReview = rows.filter((a) => a.status === 'review').map((a) => a.id);
      setHeld(await listHeldChecks(inReview).catch(() => ({})));
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
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Audits</h1>
          <p className="max-w-3xl text-sm gs-muted">
            Add a business by its website or Instagram, with any competitors you want compared; adding a competitor
            later queues the audit again. Queued audits run on Groundswell when you press{' '}
            <span className="font-semibold text-[var(--nw-current-navy)]">Run queued audits now</span>: it gathers each Current&rsquo;s data, writes the audit,
            and saves the summary, slide deck and full audit to Google Drive under <span className="font-semibold text-[var(--nw-current-navy)]">Customers</span>,
            shared with anyone who has the link. You can leave this page; audits keep running.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void startRuns()}
          disabled={starting || queued === 0}
          className="gs-btn gs-btn-primary"
        >
          {starting ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Play size={16} aria-hidden="true" />} Run queued audits now
          {queued > 0 && <span className="rounded-full bg-white/25 px-2 text-xs">{queued}</span>}
        </button>
      </header>

      {notice && (
        <div role="status" className="gs-notice">
          {notice}
        </div>
      )}

      {error && (
        <div role="alert" className="gs-alert">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="gs-card space-y-5 p-6" aria-labelledby="queue-heading">
        <h2 id="queue-heading" className="text-lg font-bold">
          Queue a business
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm font-medium">
            <span>Business name</span>
            <input className={input} value={draft.business_name} onChange={(e) => setField('business_name', e.target.value)} required />
          </label>
          <label className="space-y-1 text-sm font-medium">
            <span>City</span>
            <input className={input} value={draft.city} placeholder="Delray Beach, FL" onChange={(e) => setField('city', e.target.value)} />
          </label>
          <label className="space-y-1 text-sm font-medium">
            <span>Website</span>
            <input className={input} value={draft.website} placeholder="example.com" onChange={(e) => setField('website', e.target.value)} />
          </label>
          <label className="space-y-1 text-sm font-medium">
            <span>Instagram</span>
            <input className={input} value={draft.instagram} placeholder="@handle or profile link" onChange={(e) => setField('instagram', e.target.value)} />
          </label>
        </div>

        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1" checked={benchmark} onChange={(e) => setBenchmark(e.target.checked)} />
          <span>
            Benchmark against the top 2 competitors
            <span className="block text-xs font-normal gs-muted">
              Adds a competitive benchmark PDF: engagement per post, ads on record, published prices and authority, with a plan
              to close the gap. The first two competitors are compared, in the order entered.
            </span>
          </span>
        </label>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">{benchmark ? 'Competitors (leave a slot blank and Groundswell picks it from Google Places: one local, one country-wide)' : 'Competitors (optional)'}</legend>
          {draft.competitors.map((c, i) => (
            <div key={i} className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] items-center">
              <input className={input} aria-label={`${competitorLabel(i)} name`} placeholder={benchmark && i < BENCHMARK_COMPETITORS ? competitorLabel(i) : 'Name'} value={c.name} onChange={(e) => setCompetitor(i, 'name', e.target.value)} />
              <input className={input} aria-label={`${competitorLabel(i)} website`} placeholder="Website" value={c.website} onChange={(e) => setCompetitor(i, 'website', e.target.value)} />
              <input className={input} aria-label={`${competitorLabel(i)} Instagram`} placeholder="Instagram" value={c.instagram} onChange={(e) => setCompetitor(i, 'instagram', e.target.value)} />
              <button
                type="button"
                aria-label={`Remove ${competitorLabel(i).toLowerCase()}`}
                className="gs-btn gs-btn-ghost px-2"
                onClick={() => setDraft((d) => ({ ...d, competitors: d.competitors.filter((_, j) => j !== i) }))}
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="gs-link inline-flex items-center gap-2 text-sm"
            onClick={() => setDraft((d) => ({ ...d, competitors: [...d.competitors, { name: '', website: '', instagram: '' }] }))}
          >
            <Plus size={14} /> Add competitor
          </button>
        </fieldset>

        <label className="block space-y-1 text-sm font-medium">
          <span>Notes for the audit (optional)</span>
          <textarea className={input} rows={2} value={draft.notes} onChange={(e) => setField('notes', e.target.value)} />
        </label>

        <details className="text-sm">
          <summary className="cursor-pointer">The business’s logo and colour (optional; the reports use its website’s otherwise)</summary>
          <div className="grid gap-3 md:grid-cols-2 mt-2">
            <input className={input} aria-label="The business’s logo link" placeholder="https://…/logo.png" value={draft.brand_logo_url ?? ''} onChange={(e) => setField('brand_logo_url', e.target.value)} />
            <input className={input} aria-label="The business’s main colour" placeholder="#1a2b3c" value={draft.brand_color ?? ''} onChange={(e) => setField('brand_color', e.target.value)} />
          </div>
        </details>

        <button
          type="submit"
          disabled={saving}
          className="gs-btn gs-btn-primary"
        >
          {saving ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />} {benchmark ? 'Queue benchmark' : 'Queue audit'}
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Requests</h2>
        {loading ? (
          <p className="text-sm gs-muted">Loading…</p>
        ) : audits.length === 0 ? (
          <p className="text-sm gs-muted">No audits yet.</p>
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
                <li key={a.id} className="gs-card space-y-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">{a.business_name}</div>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs gs-muted">
                        {a.city && <span>{a.city}</span>}
                        {a.website && <span className="inline-flex items-center gap-1"><Globe size={12} />{a.website}</span>}
                        {a.instagram && <span className="inline-flex items-center gap-1"><Instagram size={12} />@{a.instagram}</span>}
                        <span>{a.competitors.length} competitor{a.competitors.length === 1 ? '' : 's'}</span>
                        {a.partner_id && <span>via {partnerNames.get(a.partner_id) ?? 'a partner'}</span>}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-2">
                      {a.kind === 'benchmark' && (
                        <span className="gs-chip" style={{ color: 'var(--gs-accent-deep)' }}>
                          Benchmark
                        </span>
                      )}
                      <span className="gs-chip" style={{ color: s.color }}>
                        <s.Icon size={12} className={a.status === 'running' ? 'animate-spin' : ''} /> {s.label}
                      </span>
                    </span>
                  </div>
                  {steps[a.id]?.length ? <StepProgress steps={steps[a.id]} /> : null}
                  {a.error && <p className="text-xs" style={{ color: a.status === 'review' ? 'var(--gs-accent-deep)' : 'var(--gs-bad)' }}>{a.error}</p>}
                  {a.status === 'review' && (
                    <ReviewPanel name={a.business_name} check={held[a.id]} onAnswer={(action) => void act(() => answerReview(a.id, action))} />
                  )}
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
                      <button type="submit" className="gs-btn gs-btn-primary">
                        Add and queue again
                      </button>
                      <button type="button" aria-label="Cancel" className="gs-btn gs-btn-ghost px-2" onClick={() => setAdding(null)}>
                        <X size={16} />
                      </button>
                    </form>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    {links.filter(([, url]) => isDriveLink(url)).map(([label, url, Icon]) => (
                      <a key={label} href={url as string} target="_blank" rel="noreferrer" className="gs-link inline-flex items-center gap-1.5">
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
                          className="gs-btn gs-btn-ghost px-2"
                        >
                          <Plus size={14} /> Add competitor
                        </button>
                        <button type="button" onClick={() => act(() => requeueAudit(a.id))} className="gs-btn gs-btn-ghost px-2">
                          <RefreshCw size={14} /> Queue again
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => window.confirm(`Delete the audit request for ${a.business_name}? Files already in Drive stay there.`) && act(() => deleteAudit(a.id))}
                      className="gs-btn gs-btn-danger px-2"
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
