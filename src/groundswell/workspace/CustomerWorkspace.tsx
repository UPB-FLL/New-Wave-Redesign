import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleDashed, Download, FileText, Loader2, Play, RotateCcw, XCircle } from 'lucide-react';
import { STEP_LABELS } from '../../lib/groundswell';
import { PartnerSignedOut, REPORT_LABELS, type ReportKind } from '../../lib/groundswellPartner';
import { PHASE_INFO, type Phase } from '../../lib/groundswellValidation';
import { getWorkspace, reportUrl, runFiles, startPhase, type DataPanel, type WorkspaceData, type WorkspaceFile, type WorkspacePhase, type WorkspaceRun, type WorkspaceViewer } from '../../lib/groundswellWorkspace';
import { AUDIT_STATUS, NOT_STARTED } from '../pages/customerStatus';
import { PhaseIcon } from '../PhaseIcon';

/**
 * A customer's three phases, the same screen for its partner and for New
 * Wave staff (the server decides what each sees: a partner gets no error
 * text). One card per phase with its state and a Start button (or why it
 * cannot start yet); under it, the chosen phase's newest run: its progress,
 * reports, downloads, ad images and carousel, and the data it gathered.
 * While a run waits or runs, the page asks again every POLL_MS.
 */

export const POLL_MS = 20_000;

const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null);

function runState(run: WorkspaceRun | undefined) {
  if (!run) return NOT_STARTED;
  return AUDIT_STATUS[run.status] ?? NOT_STARTED;
}

function progress(run: WorkspaceRun) {
  const finished = run.steps.filter((s) => s.status === 'done' || s.status === 'skipped').length;
  return { finished, total: run.steps.length };
}

function StepIcon({ status }: { status: string }) {
  if (status === 'done') return <CheckCircle2 size={14} aria-hidden="true" style={{ color: 'var(--gs-ok)' }} />;
  if (status === 'failed') return <XCircle size={14} aria-hidden="true" style={{ color: 'var(--gs-bad)' }} />;
  if (status === 'running') return <Loader2 size={14} aria-hidden="true" className="animate-spin" style={{ color: 'var(--gs-accent-deep)' }} />;
  return <CircleDashed size={14} aria-hidden="true" style={{ color: 'var(--nw-slate)' }} />;
}

const STEP_WORDS: Record<string, string> = { done: 'done', skipped: 'skipped', failed: 'failed', running: 'running', pending: 'waiting' };

function Steps({ run }: { run: WorkspaceRun }) {
  const { finished, total } = progress(run);
  const active = run.status === 'running' || run.status === 'queued';
  return (
    <details className="mt-4" open={active}>
      <summary className="cursor-pointer text-sm font-semibold">
        Progress: {finished} of {total} steps
      </summary>
      <div className="gs-progress mt-2" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={finished} aria-label="Steps finished">
        <span style={{ width: `${total ? (finished / total) * 100 : 0}%` }} />
      </div>
      <ol className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2" aria-label="Steps">
        {run.steps.map((s) => (
          <li key={s.step} className="flex items-start gap-2">
            <span className="mt-0.5">
              <StepIcon status={s.status} />
            </span>
            <span>
              {STEP_LABELS[s.step] ?? s.step}
              <span className="sr-only">: {STEP_WORDS[s.status] ?? s.status}</span>
              {s.status === 'skipped' ? <span className="gs-muted"> · skipped</span> : null}
              {s.error ? <span className="block text-xs text-red-700">{s.error}</span> : null}
            </span>
          </li>
        ))}
      </ol>
    </details>
  );
}

function Reports({ viewer, run }: { viewer: WorkspaceViewer; run: WorkspaceRun }) {
  const [busy, setBusy] = useState<ReportKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!run.reports.length) return null;
  const open = async (kind: ReportKind) => {
    setBusy(kind);
    setError(null);
    try {
      window.open(await reportUrl(viewer, run.id, kind), '_blank', 'noopener');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open that report.');
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="mt-4">
      <h4 className="gs-label">Reports</h4>
      <div className="mt-2 flex flex-wrap gap-2">
        {run.reports.map((r) => (
          <button key={r.kind} type="button" className="gs-btn gs-btn-secondary" disabled={busy !== null} onClick={() => void open(r.kind)}>
            <FileText size={14} aria-hidden="true" /> {REPORT_LABELS[r.kind] ?? r.kind} (PDF)
            {busy === r.kind ? '…' : ''}
          </button>
        ))}
      </div>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

const EXPORT_WORDS = (f: WorkspaceFile) =>
  /Meta Bulk Import/.test(f.name) ? 'Meta bulk import (Excel)' : /Google Ads Editor/.test(f.name) ? 'Google Ads Editor import (CSV)' : /Ad Images/.test(f.name) ? 'Ad images (zip)' : /Carousel/.test(f.name) ? 'Carousel slides and caption (zip)' : f.name;

function Files({ viewer, run }: { viewer: WorkspaceViewer; run: WorkspaceRun }) {
  const [files, setFiles] = useState<WorkspaceFile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const count = run.files.length;
  useEffect(() => {
    if (!count) return;
    let live = true;
    runFiles(viewer, run.id)
      .then((f) => live && setFiles(f))
      .catch((err) => live && setError(err instanceof Error ? err.message : 'Could not load the files.'));
    return () => {
      live = false;
    };
  }, [viewer, run.id, count]);
  if (!count) return null;
  if (error) return <p className="mt-4 text-sm text-red-700">{error}</p>;
  if (!files) return <p className="mt-4 text-sm gs-muted" aria-busy="true">Loading the files…</p>;
  const exports = files.filter((f) => f.kind === 'export');
  const creatives = files.filter((f) => f.kind === 'creative');
  const slides = files.filter((f) => f.kind === 'carousel' && f.content_type.startsWith('image/'));
  const caption = files.find((f) => f.kind === 'carousel' && f.content_type === 'text/plain');
  const photos = files.filter((f) => f.kind === 'image');
  const thumbs = (list: WorkspaceFile[], label: string) => (
    <ul className="gs-thumbs mt-2" aria-label={label}>
      {list.map((f) => (
        <li key={f.path}>
          <a href={f.url} target="_blank" rel="noreferrer" title={f.name}>
            <img src={f.url} alt={f.name} loading="lazy" />
          </a>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="mt-4 space-y-4">
      {exports.length ? (
        <div>
          <h4 className="gs-label">Downloads</h4>
          <ul className="mt-2 flex flex-wrap gap-2">
            {exports.map((f) => (
              <li key={f.path}>
                <a className="gs-btn gs-btn-secondary" href={f.url} download={f.name}>
                  <Download size={14} aria-hidden="true" /> {EXPORT_WORDS(f)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {creatives.length ? (
        <div>
          <h4 className="gs-label">Ad images</h4>
          {thumbs(creatives, 'Ad images')}
        </div>
      ) : null}
      {slides.length ? (
        <div>
          <h4 className="gs-label">Carousel</h4>
          {thumbs(slides, 'Carousel slides')}
          {caption ? (
            <a className="gs-link mt-1 inline-block text-sm" href={caption.url} target="_blank" rel="noreferrer">
              Caption
            </a>
          ) : null}
        </div>
      ) : null}
      {photos.length ? (
        <div>
          <h4 className="gs-label">The business’s own photos</h4>
          {thumbs(photos, 'Photos from the business’s Instagram')}
        </div>
      ) : null}
    </div>
  );
}

function Panel({ panel, open }: { panel: DataPanel; open: boolean }) {
  return (
    <details className="gs-panel" open={open}>
      <summary>
        <span className="font-semibold">{panel.title}</span>
        {panel.source ? <span className="gs-muted text-xs"> · {panel.source}</span> : null}
      </summary>
      <div className="mt-2 space-y-2 text-sm">
        {panel.rows?.length ? (
          <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-[12rem_1fr]">
            {panel.rows.map((r) => (
              <div key={r.label} className="contents">
                <dt className="gs-muted">{r.label}</dt>
                <dd className="break-words">{r.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {panel.list?.length ? (
          <ul className="list-disc space-y-1 pl-5">
            {panel.list.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        ) : null}
        {panel.table?.rows.length ? (
          <div className="overflow-x-auto">
            <table className="gs-table">
              <thead>
                <tr>
                  {panel.table.head.map((h, i) => (
                    <th key={i} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {panel.table.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((c, j) => (
                      <td key={j}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {panel.note ? <p className="gs-muted text-xs">{panel.note}</p> : null}
      </div>
    </details>
  );
}

function RunView({ viewer, run }: { viewer: WorkspaceViewer; run: WorkspaceRun }) {
  const state = runState(run);
  return (
    <div data-run={run.id}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="gs-chip" style={{ color: state.color }}>
          {state.label}
        </span>
        <span className="gs-muted">
          Queued {when(run.created_at)}
          {run.completed_at && run.status === 'done' ? ` · delivered ${when(run.completed_at)}` : ''}
        </span>
      </div>
      {run.status === 'failed' && viewer === 'partner' ? <p className="mt-2 text-sm gs-muted">This run didn’t finish. We’ve been notified and will follow up.</p> : null}
      {run.error ? <p className="gs-alert mt-2 text-sm">{run.error}</p> : null}
      <Steps run={run} />
      <Reports viewer={viewer} run={run} />
      <Files viewer={viewer} run={run} />
      {run.panels?.length ? (
        <div className="mt-5">
          <h4 className="gs-label">What this phase found</h4>
          <div className="mt-2 space-y-2">
            {run.panels.map((p, i) => (
              <Panel key={p.key} panel={p} open={i === 0} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PhaseCard({ phase, selected, onSelect }: { phase: WorkspacePhase; selected: boolean; onSelect: () => void }) {
  const latest = phase.runs[0];
  const state = runState(latest);
  const p = latest && (latest.status === 'running' || latest.status === 'queued') ? progress(latest) : null;
  return (
    <button type="button" className="gs-phase" aria-pressed={selected} aria-controls="gs-phase-panel" onClick={onSelect} data-phase={phase.phase}>
      <span className="gs-phase-icon" aria-hidden="true">
        <PhaseIcon phase={phase.phase} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-bold">
          {phase.title}
        </span>
        <span className="block text-xs gs-muted">{phase.source}</span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="gs-chip" style={{ color: state.color }}>
            {state.label}
          </span>
          {p ? (
            <span className="text-xs gs-muted">
              {p.finished} of {p.total}
            </span>
          ) : latest?.completed_at && latest.status === 'done' ? (
            <span className="text-xs gs-muted">{when(latest.completed_at)}</span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

export function CustomerWorkspace({ viewer, customerId, onSignedOut, poll = POLL_MS }: { viewer: WorkspaceViewer; customerId: string; onSignedOut?: () => void; poll?: number }) {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Phase | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await getWorkspace(viewer, customerId);
      setData(next);
      setError(null);
      return next;
    } catch (err) {
      if (err instanceof PartnerSignedOut) onSignedOut?.();
      else setError(err instanceof Error ? err.message : 'Could not load this customer’s phases.');
      return null;
    }
  }, [viewer, customerId, onSignedOut]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // The phase a person sees first: the furthest one with a run, else phase 1.
  const shown: Phase = useMemo(() => selected ?? ([...(data?.phases ?? [])].reverse().find((p) => p.runs.length)?.phase ?? 'audit'), [selected, data]);
  const active = data?.phases.some((p) => p.runs.some((r) => r.status === 'queued' || r.status === 'running')) ?? false;
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => void refresh(), poll);
    return () => window.clearInterval(timer);
  }, [active, refresh, poll]);

  const start = async (phase: WorkspacePhase) => {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const { reason } = await startPhase(viewer, customerId, phase.phase);
      setNotice(`${reason} It starts on its own within a minute; this page updates as it runs.`);
      setSelected(phase.phase);
      await refresh();
    } catch (err) {
      if (err instanceof PartnerSignedOut) onSignedOut?.();
      else setError(err instanceof Error ? err.message : 'Could not start that phase.');
    } finally {
      setBusy(false);
    }
  };

  const current = data?.phases.find((p) => p.phase === shown) ?? null;
  return (
    <section aria-labelledby="gs-phases-heading" className="mt-8">
      <h2 id="gs-phases-heading" className="text-xl font-bold">
        Phases
      </h2>
      <p className="mt-1 text-sm gs-muted">The {PHASE_INFO.audit.title.toLowerCase()} and {PHASE_INFO.competitors.title.toLowerCase()} read public data. The {PHASE_INFO.integrated.title.toLowerCase()} reads the client’s own accounts once they are linked. Each phase starts the next on its own when it delivers.</p>
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
      {!data && !error ? (
        <p className="mt-4 text-sm gs-muted" aria-busy="true">
          Loading…
        </p>
      ) : null}
      {data ? (
        <>
          <ol className="gs-phases mt-4" aria-label="Phases">
            {data.phases.map((p) => (
              <li key={p.phase}>
                <PhaseCard phase={p} selected={p.phase === shown} onSelect={() => setSelected(p.phase)} />
              </li>
            ))}
          </ol>
          {current ? (
            <div id="gs-phase-panel" className="gs-card mt-4 p-5 sm:p-6" aria-live="polite">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-bold">
                    {current.title}
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm gs-muted">{current.brings}</p>
                </div>
                {current.start.allowed ? (
                  <button type="button" className="gs-btn gs-btn-primary" disabled={busy} onClick={() => void start(current)}>
                    {current.runs.length ? <RotateCcw size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
                    {busy ? 'Starting…' : current.runs.length ? 'Run again' : `Start ${current.title.toLowerCase()}`}
                  </button>
                ) : null}
              </div>
              <p className="mt-2 text-xs gs-muted" data-role="start-reason">
                {current.start.reason}
              </p>
              <div className="mt-4 border-t border-[var(--nw-mist-gray)] pt-4">
                {current.runs[0] ? <RunView viewer={viewer} run={current.runs[0]} /> : <p className="text-sm gs-muted">Not started yet.</p>}
              </div>
              {current.runs.length > 1 ? (
                <details className="mt-5">
                  <summary className="cursor-pointer text-sm font-semibold">Earlier runs ({current.runs.length - 1})</summary>
                  <ul className="mt-2 space-y-4">
                    {current.runs.slice(1).map((r) => (
                      <li key={r.id} className="border-t border-[var(--nw-mist-gray)] pt-3">
                        <RunView viewer={viewer} run={{ ...r, panels: undefined }} />
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
