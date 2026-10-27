import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, GraduationCap, Loader2, XCircle } from 'lucide-react';
import { loadAgentDashboard, trainAgentNow, type AgentDashboard, type AgentTrainingRun } from '../../lib/groundswellAgent';
import { GROUNDSWELL_ADMIN_AGENT_PATH } from '../site';
import { AdminEmptyState, AdminPageHeader } from './AdminUi';

/**
 * The operations agent's dashboard: what is open, how the fixes have held,
 * the two scheduled jobs and when each last ran, the training log (each
 * daily run: what it trained on, every step it took, what it changed), and
 * the playbook the training keeps. The issues themselves, with Approve and
 * Dismiss, stay on the Agent screen.
 */

const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString() : '—');
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const RUN_STATUS = { running: 'Running', done: 'Done', failed: 'Failed' } as const;
const HOW = { approved: 'approved and applied', cleared: 'cleared on its own', dismissed: 'dismissed' } as const;
const CHANGE = { new_kind: 'New kind', first_choice: 'First choice', ruled_out: 'Ruled out', restored: 'Back in', counts: 'Counts' } as const;

function triggerLabel(trigger: string) {
  if (trigger === 'cron') return 'Scheduled (daily)';
  return `Train now, by ${trigger.replace(/^staff:/, '')}`;
}

function HeldChart({ days }: { days: AgentDashboard['counts']['days'] }) {
  const max = Math.max(1, ...days.map((d) => d.held + d.failed));
  const held = days.reduce((n, d) => n + d.held, 0);
  const failed = days.reduce((n, d) => n + d.failed, 0);
  return (
    <section className="gs-card p-5 text-sm" aria-labelledby="gs-agent-held">
      <h2 id="gs-agent-held" className="font-semibold">
        Fixes checked, last 14 days
      </h2>
      <p className="text-xs gs-muted">Each lesson is one resolution checked by its own resolver: did it hold? Days are UTC.</p>
      <div className="mt-3 flex flex-wrap gap-4 text-xs" aria-hidden="true">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--gs-ok)' }} /> Held ({held})
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--gs-bad)' }} /> Did not hold ({failed})
        </span>
      </div>
      <div role="img" aria-label={`Over the last 14 days, ${held} resolutions held and ${failed} did not.`} className="mt-3 flex h-32 items-end gap-1 border-b" style={{ borderColor: 'var(--gs-admin-line)' }} data-role="agent-held-chart">
        {days.map((d) => (
          <div key={d.date} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-0.5 rounded-t hover:opacity-80" title={`${d.date}: ${d.held} held, ${d.failed} did not hold`}>
            {d.failed ? <div className="rounded-t" style={{ height: `${(d.failed / max) * 100}%`, background: 'var(--gs-bad)' }} /> : null}
            {d.held ? <div className={d.failed ? '' : 'rounded-t'} style={{ height: `${(d.held / max) * 100}%`, background: 'var(--gs-ok)' }} /> : null}
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs gs-muted" aria-hidden="true">
        <span>{days[0]?.date.slice(5)}</span>
        <span>{days[days.length - 1]?.date.slice(5)}</span>
      </div>
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer">As a table</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Held</th>
              <th scope="col">Did not hold</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.date}>
                <td>{d.date}</td>
                <td>{d.held}</td>
                <td>{d.failed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

function TrainingRun({ run, label }: { run: AgentTrainingRun; label: (key: string | null) => string }) {
  const fixes = run.trained_on.fixes ?? [];
  const lessons = run.trained_on.lessons ?? [];
  return (
    <li className="gs-card p-5 text-sm" data-role="agent-training-run" data-status={run.status}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="gs-chip" style={{ color: run.status === 'failed' ? 'var(--gs-bad)' : run.status === 'done' ? 'var(--gs-ok)' : 'var(--gs-wait)' }}>
          {RUN_STATUS[run.status]}
        </span>
        <strong>{when(run.started_at)}</strong>
        <span className="gs-muted text-xs">{triggerLabel(run.trigger)}</span>
      </div>
      {run.summary ? <p className="mt-2">{run.summary}</p> : null}
      {run.error ? (
        <p className="mt-1" style={{ color: 'var(--gs-bad)' }}>
          {run.error}
        </p>
      ) : null}
      <p className="mt-1 text-xs gs-muted">
        Trained on the fixes from {when(run.window_start)} to {when(run.window_end)}
        {run.finished_at ? `; finished ${when(run.finished_at)}` : ''}.
      </p>

      {run.steps.length ? (
        <div className="mt-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide gs-muted">How it trained</h3>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            {run.steps.map((s) => (
              <li key={s.step}>
                <strong>{s.label}.</strong> {s.detail} <span className="gs-muted text-xs">({s.ms} ms)</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="mt-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide gs-muted">What changed</h3>
        {run.changes.length ? (
          <ul className="mt-1 space-y-1">
            {run.changes.map((c, n) => (
              <li key={`${c.source}|${c.kind}|${c.resolver}|${c.change}|${n}`} data-role="agent-training-change">
                <span className="gs-chip">{CHANGE[c.change]}</span> {c.source} / {c.kind}: {c.note}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 gs-muted">Nothing: the playbook stands as it was.</p>
        )}
      </div>

      {fixes.length || lessons.length ? (
        <details className="mt-3">
          <summary className="cursor-pointer font-semibold">
            What it trained on: {plural(fixes.length, 'fix', 'fixes')}, {plural(lessons.length, 'lesson')}
          </summary>
          {fixes.length ? (
            <ul className="mt-2 space-y-1">
              {fixes.map((f) => (
                <li key={`${f.issue_id}|${f.at}`}>
                  {f.verified === 'worked' ? <CheckCircle2 size={14} className="mr-1 inline" aria-label="held" /> : f.verified === 'failed' ? <XCircle size={14} className="mr-1 inline" aria-label="did not hold" /> : null}
                  <strong>{f.title}</strong> <span className="gs-muted">({f.source} / {f.kind})</span>: {HOW[f.how]}
                  {f.resolver ? ` with ${label(f.resolver)}` : ''} on {when(f.at)}
                  {f.verified ? ` · ${f.verified === 'worked' ? 'held' : 'did not hold'}` : f.how === 'approved' ? ' · not checked yet' : ''}
                </li>
              ))}
            </ul>
          ) : null}
          {lessons.length ? (
            <ul className="mt-2 space-y-1">
              {lessons.map((l) => (
                <li key={l.id}>
                  {l.result === 'worked' ? <CheckCircle2 size={14} className="mr-1 inline" aria-label="held" /> : <XCircle size={14} className="mr-1 inline" aria-label="did not hold" />}
                  Lesson: <strong>{label(l.resolver)}</strong> on {l.source} / {l.kind} {l.result === 'worked' ? 'held' : 'did not hold'}
                  <span className="gs-muted"> · {l.note}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </details>
      ) : null}
    </li>
  );
}

export default function GroundswellAgentDashboard() {
  const [view, setView] = useState<AgentDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [training, setTraining] = useState(false);

  const load = useCallback(async () => {
    try {
      setView(await loadAgentDashboard());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the dashboard.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // While a run is in progress, read again every few seconds.
  const running = view?.training_runs.some((r) => r.status === 'running') ?? false;
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(id);
  }, [running, load]);

  const train = async () => {
    setTraining(true);
    setNotice(null);
    try {
      const started = await trainAgentNow();
      setNotice(`Training started on the fixes since ${when(started.window.start)}. The log below updates when it finishes.`);
      window.setTimeout(() => void load(), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the training.');
    } finally {
      setTraining(false);
    }
  };

  const resolvers = Object.fromEntries((view?.resolvers ?? []).map((r) => [r.key, r.label]));
  const label = (key: string | null) => (key ? resolvers[key] ?? key : '—');
  const c = view?.counts;
  const checked = c ? c.held_30d + c.failed_30d : 0;
  const stats = c
    ? [
        { label: 'Waiting for approval', value: String(c.approvals), status: 'review' },
        { label: 'Needs a developer', value: String(c.developer), status: 'failed' },
        { label: 'Watching', value: String(c.watching), status: 'queued' },
        { label: 'Resolved, 30 days', value: String(c.resolved_30d), status: 'done' },
        { label: checked ? `Held, 30 days (${c.held_30d} of ${checked})` : 'Held, 30 days', value: checked ? `${Math.round((c.held_30d / checked) * 100)}%` : '–', status: 'done' },
        { label: 'Learnings, 7 days', value: String(c.learnings_7d), status: 'running' },
      ]
    : [];

  return (
    <div className="gs-admin-page">
      <AdminPageHeader
        eyebrow="Operations"
        title="Agent dashboard"
        description="What the agent has open, how its fixes have held, when its two jobs last ran, and the log of its daily training: what it trained on, how, and what it changed."
        action={
          <div className="flex gap-2">
            <Link to={GROUNDSWELL_ADMIN_AGENT_PATH} className="gs-btn gs-btn-secondary">
              Open issues <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <button type="button" className="gs-btn gs-btn-primary" disabled={training || running || view?.training_ready === false} onClick={train}>
              {training || running ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <GraduationCap size={16} aria-hidden="true" />} Train now
            </button>
          </div>
        }
      />

      {error ? (
        <p role="alert" className="gs-card p-4 text-sm" style={{ color: 'var(--gs-bad)' }}>
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="gs-card p-4 text-sm">
          {notice}
        </p>
      ) : null}
      {view && !view.training_ready ? (
        <p className="gs-card p-4 text-sm" data-role="agent-training-not-ready">
          Training is not set up in the database yet: apply migration 20261106120000 (the training log, the playbook, and the daily job).
        </p>
      ) : null}

      {!view && !error ? <p className="text-sm gs-muted">Loading…</p> : null}

      {view ? (
        <>
          <section className="gs-admin-stats" aria-label="The agent at a glance">
            {stats.map((s) => (
              <div key={s.label} className="gs-admin-stat" data-status={s.status}>
                <span className="gs-admin-stat-dot" aria-hidden="true" />
                <div className="gs-admin-stat-number">{s.value}</div>
                <div className="gs-admin-stat-label">{s.label}</div>
              </div>
            ))}
          </section>

          <section className="gs-card p-5 text-sm" aria-labelledby="gs-agent-schedule">
            <h2 id="gs-agent-schedule" className="font-semibold">
              Schedule
            </h2>
            <p className="text-xs gs-muted">Both jobs run in the database (pg_cron) and call the agent with the admin key.</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left" data-role="agent-schedule">
                <thead className="text-xs gs-muted">
                  <tr>
                    <th scope="col" className="py-1 pr-4">Job</th>
                    <th scope="col" className="py-1 pr-4">When</th>
                    <th scope="col" className="py-1 pr-4">Last ran</th>
                  </tr>
                </thead>
                <tbody>
                  {view.schedule.map((s) => (
                    <tr key={s.job} className="border-t" style={{ borderColor: 'var(--gs-admin-line)' }}>
                      <td className="py-2 pr-4">
                        <strong>{s.label}</strong>
                        <div className="text-xs gs-muted">
                          {s.job} · <code>{s.cron}</code>
                        </div>
                      </td>
                      <td className="py-2 pr-4">{s.when}</td>
                      <td className="py-2 pr-4">
                        {s.last_at ? `${when(s.last_at)}${s.last_status ? ` (${s.last_status})` : ''}` : 'Not yet'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <HeldChart days={view.counts.days} />

          <section aria-labelledby="gs-agent-training" className="space-y-3">
            <div>
              <h2 id="gs-agent-training" className="font-semibold">
                Training log
              </h2>
              <p className="text-xs gs-muted">
                Once a day the agent trains on the fixes since its last training: it checks the resolutions not yet checked, gathers the day’s fixes and lessons, recounts every lesson, and updates the playbook the 4-hour pass proposes from. Every run is logged here, step by step.
              </p>
            </div>
            {view.training_runs.length ? (
              <ul className="space-y-3">
                {view.training_runs.map((run) => (
                  <TrainingRun key={run.id} run={run} label={label} />
                ))}
              </ul>
            ) : (
              <div className="gs-card">
                <AdminEmptyState title="No training yet" icon={GraduationCap}>
                  The first scheduled run is at 04:17 UTC, or press Train now.
                </AdminEmptyState>
              </div>
            )}
          </section>

          <section className="gs-card p-5 text-sm" aria-labelledby="gs-agent-playbook">
            <h2 id="gs-agent-playbook" className="font-semibold">
              Playbook
            </h2>
            <p className="text-xs gs-muted">
              Per kind of issue: the resolutions tried, in the order the agent now offers them (the one that held most often relative to its tries first; one never tried sits at even odds), and the ones ruled out after failing twice without holding.
            </p>
            {view.playbook.length ? (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left" data-role="agent-playbook">
                  <thead className="text-xs gs-muted">
                    <tr>
                      <th scope="col" className="py-1 pr-4">Kind of issue</th>
                      <th scope="col" className="py-1 pr-4">Offered in this order</th>
                      <th scope="col" className="py-1 pr-4">Ruled out</th>
                      <th scope="col" className="hidden py-1 pr-4 sm:table-cell">Trained</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.playbook.map((p) => (
                      <tr key={`${p.source}|${p.kind}`} className="border-t align-top" style={{ borderColor: 'var(--gs-admin-line)' }}>
                        <td className="py-2 pr-4">
                          {p.source} / {p.kind}
                        </td>
                        <td className="py-2 pr-4">
                          {p.preferred.length ? (
                            <ol className="list-decimal pl-4">
                              {p.preferred.map((k) => (
                                <li key={k}>
                                  {label(k)} <span className="gs-muted text-xs">held {p.stats[k]?.worked ?? 0}, did not hold {p.stats[k]?.failed ?? 0}</span>
                                </li>
                              ))}
                            </ol>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-2 pr-4">{p.ruled_out.length ? p.ruled_out.map(label).join(', ') : '—'}</td>
                        <td className="hidden py-2 pr-4 text-xs sm:table-cell">{when(p.trained_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-2 gs-muted">Empty until a training run has lessons to count.</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
