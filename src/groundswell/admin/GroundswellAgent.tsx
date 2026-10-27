import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Bot, CheckCircle2, Loader2, Mail, RefreshCw, RotateCcw, XCircle } from 'lucide-react';
import { ADVISOR_LABELS, AGENT_STATUS_LABELS, decideIssue, loadAgent, runAgentNow, type AgentIssue, type AgentIssueStatus, type AgentView } from '../../lib/groundswellAgent';
import { AdminEmptyState, AdminPageHeader } from './AdminUi';

/**
 * The operations agent's staff screen: every issue it found, grouped by what
 * it needs; the proposal and the Approve / Dismiss buttons the email also
 * offers; what was resolved and whether it held; the lessons; the last
 * report. "Run a pass now" does what the 4-hour job does.
 */

const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString() : '—');
const GROUPS: { title: string; statuses: AgentIssueStatus[]; blurb: string }[] = [
  { title: 'Waiting for approval', statuses: ['proposed'], blurb: 'Each has a proposed resolution. Approve applies it now; Dismiss keeps it quiet for a week.' },
  { title: 'Needs a developer', statuses: ['needs_developer'], blurb: 'No automatic resolution applies; the brief says what to look at.' },
  { title: 'New, not yet proposed', statuses: ['open', 'approved', 'resolving'], blurb: 'Seen on the last pass; the next pass proposes a resolution.' },
  { title: 'Resolved', statuses: ['resolved'], blurb: 'Applied or cleared; the next pass checks whether each held.' },
  { title: 'Dismissed', statuses: ['dismissed'], blurb: 'Quiet for a week, then reported again if still seen.' },
];
const SEVERITY_COLOUR: Record<AgentIssue['severity'], string> = { error: 'var(--gs-bad)', warning: 'var(--gs-accent-deep)', info: 'var(--nw-slate)' };

function IssueCard({ issue, resolvers, busy, onDecide }: { issue: AgentIssue; resolvers: Record<string, string>; busy: boolean; onDecide: (action: 'approve' | 'dismiss' | 'reopen') => void }) {
  const p = issue.proposal;
  const canDecide = issue.status === 'proposed' || issue.status === 'needs_developer' || issue.status === 'open';
  const canApprove = issue.status === 'proposed' && p && p.resolver !== 'none';
  return (
    <li className="gs-card gs-admin-partner-card flex flex-wrap items-start justify-between gap-4 p-5" data-role="agent-issue" data-status={issue.status}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="gs-chip" style={{ color: SEVERITY_COLOUR[issue.severity] }}>
            {issue.severity}
          </span>
          <span className="gs-chip">{issue.source}</span>
          <span className="gs-chip">{AGENT_STATUS_LABELS[issue.status]}</span>
        </div>
        <div className="mt-2 font-semibold">{issue.title}</div>
        <p className="mt-1 text-xs gs-muted">
          Seen {issue.occurrences} time{issue.occurrences === 1 ? '' : 's'} since {when(issue.first_seen)}, last {when(issue.last_seen)}
          {issue.recurrences ? `, came back ${issue.recurrences} time${issue.recurrences === 1 ? '' : 's'}` : ''}.
        </p>
        <p className="mt-2 text-sm">
          <strong>What happened:</strong> {issue.detail}
        </p>
        {p ? (
          <div className="mt-2 space-y-1 text-sm">
            <p>
              <strong>In plain words:</strong> {p.summary}
            </p>
            <p>
              <strong>Likely cause:</strong> {p.cause}
            </p>
            <p>
              <strong>Proposed:</strong> {resolvers[p.resolver] ?? (p.resolver === 'none' ? 'Watch it' : 'A developer looks at it')}
              <span className="gs-muted"> · confidence {p.confidence}, advised by {ADVISOR_LABELS[p.by]}</span>
            </p>
            <p className="text-xs gs-muted">{p.rationale}</p>
            {p.brief ? <pre className="whitespace-pre-wrap rounded-md p-3 text-xs" style={{ background: 'var(--gs-admin-canvas)' }}>{p.brief}</pre> : null}
          </div>
        ) : null}
        {issue.outcome ? (
          <p className="mt-2 text-sm">
            {issue.outcome.ok ? <CheckCircle2 size={14} className="mr-1 inline" aria-hidden="true" /> : <XCircle size={14} className="mr-1 inline" aria-hidden="true" />}
            <strong>Outcome:</strong> {issue.outcome.note}{' '}
            <span className="gs-muted">({issue.outcome.verified === 'worked' ? 'held' : issue.outcome.verified === 'failed' ? 'did not hold' : 'not checked yet'})</span>
          </p>
        ) : null}
        {issue.decided_by ? (
          <p className="mt-1 text-xs gs-muted">
            Decided by {issue.decided_by} on {when(issue.decided_at)}.
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-2 text-sm">
        {canApprove ? (
          <button type="button" className="gs-btn gs-btn-primary" disabled={busy} onClick={() => onDecide('approve')}>
            Approve
          </button>
        ) : null}
        {canDecide ? (
          <button type="button" className="gs-btn gs-btn-secondary" disabled={busy} onClick={() => onDecide('dismiss')}>
            Dismiss for a week
          </button>
        ) : null}
        {issue.status === 'dismissed' || issue.status === 'resolved' ? (
          <button type="button" className="gs-btn gs-btn-secondary" disabled={busy} onClick={() => onDecide('reopen')}>
            <RotateCcw size={14} aria-hidden="true" /> Reopen
          </button>
        ) : null}
      </div>
    </li>
  );
}

export default function GroundswellAgent() {
  const [view, setView] = useState<AgentView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setView(await loadAgent());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the agent.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (force: boolean) => {
    setRunning(true);
    setNotice(null);
    try {
      await runAgentNow(force);
      setNotice(force ? 'Pass started; the report is emailed when it finishes. This screen re-reads in a moment.' : 'Pass started. This screen re-reads in a moment.');
      window.setTimeout(() => void load(), 8000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the pass.');
    } finally {
      setRunning(false);
    }
  };

  const decide = async (issue: AgentIssue, action: 'approve' | 'dismiss' | 'reopen') => {
    setBusy(issue.id);
    setNotice(null);
    try {
      const result = await decideIssue(issue.id, action);
      setNotice(result.note ?? (action === 'reopen' ? 'Reopened; the next pass proposes again.' : 'Done.'));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record that.');
    } finally {
      setBusy(null);
    }
  };

  const resolvers = Object.fromEntries((view?.resolvers ?? []).map((r) => [r.key, r.label]));
  const issues = view?.issues ?? [];

  return (
    <div className="gs-admin-page">
      <AdminPageHeader
        eyebrow="Operations"
        title="Agent"
        description="Every 4 hours the agent reads the runs, Headway and the live checks, proposes a resolution for each issue, and emails the report. Nothing is applied until someone approves it, here or from the email."
        action={
          <div className="flex gap-2">
            <button type="button" className="gs-btn gs-btn-secondary" disabled={running} onClick={() => run(false)}>
              {running ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={16} aria-hidden="true" />} Run a pass now
            </button>
            <button type="button" className="gs-btn gs-btn-primary" disabled={running} onClick={() => run(true)}>
              <Mail size={16} aria-hidden="true" /> Run and email the report
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

      {view ? (
        <div className="gs-card p-5 text-sm" data-role="agent-config">
          <div className="flex flex-wrap gap-4">
            <span>
              Reports go to <strong>{view.config.email}</strong>
              {view.config.email_ready ? '' : ' (RESEND_API_KEY is not set, so none can be sent)'}
            </span>
            <span>
              {view.config.advisor === 'claude' ? `Advisor: Claude (${view.config.model}), checked by the rules` : view.config.advisor === 'openai' ? `Advisor: OpenAI (${view.config.model}) standing in; set ANTHROPIC_API_KEY for Claude` : 'Advisor: the agent’s rules only (no ANTHROPIC_API_KEY or OPENAI_API_KEY)'}
            </span>
            <span>{view.config.live_checks ? 'Live service checks on' : 'Live service checks off'}</span>
          </div>
          <p className="mt-2 gs-muted">
            Last report: {view.last_report ? `${when(view.last_report.sent_at)} · ${view.last_report.subject} (${view.last_report.status})` : 'none yet'}
          </p>
        </div>
      ) : null}

      {!view && !error ? (
        <p className="text-sm gs-muted">Loading…</p>
      ) : view && issues.length === 0 ? (
        <div className="gs-card">
          <AdminEmptyState title="Nothing open" icon={Bot}>
            The agent has nothing to report. Run a pass to read every source now.
          </AdminEmptyState>
        </div>
      ) : null}

      {view
        ? GROUPS.map((g) => {
            const rows = issues.filter((i) => g.statuses.includes(i.status));
            if (!rows.length) return null;
            return (
              <section key={g.title} aria-label={g.title} className="space-y-3">
                <div>
                  <h2 className="font-semibold">
                    {g.title} ({rows.length})
                  </h2>
                  <p className="text-xs gs-muted">{g.blurb}</p>
                </div>
                <ul className="space-y-3">
                  {rows.map((issue) => (
                    <IssueCard key={issue.id} issue={issue} resolvers={resolvers} busy={busy === issue.id} onDecide={(action) => decide(issue, action)} />
                  ))}
                </ul>
              </section>
            );
          })
        : null}

      {view ? (
        <section aria-label="Learnings" className="gs-card p-5 text-sm">
          <h2 className="font-semibold">What the agent learned</h2>
          <p className="text-xs gs-muted">
            Every pass asks Claude, with web search, what is new in {view.topics.map((t) => t.label).join(' and ') || 'its topics'}; only what the agent did not already know is kept and reported, each with the page it was read on.
          </p>
          {view.learnings.length ? (
            <ul className="mt-3 space-y-3">
              {view.learnings.map((l) => (
                <li key={l.id} data-role="agent-learning">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="gs-chip">{l.topic.replace(/-/g, ' ')}</span>
                    <strong>{l.title}</strong>
                    {l.published_at ? <span className="gs-muted text-xs">{l.published_at}</span> : null}
                  </div>
                  <p className="mt-1">{l.summary}</p>
                  {l.why_it_matters ? (
                    <p className="mt-1">
                      <strong>Why it matters:</strong> {l.why_it_matters}
                    </p>
                  ) : null}
                  {l.action ? (
                    <p className="mt-1">
                      <strong>What to do:</strong> {l.action}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs gs-muted">
                    <a href={l.url} target="_blank" rel="noreferrer" className="gs-link">
                      {l.source || l.url}
                    </a>{' '}
                    · found {when(l.found_at)} · confidence {l.confidence}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 gs-muted">Nothing learned yet. The first pass with ANTHROPIC_API_KEY set fills this in.</p>
          )}
        </section>
      ) : null}

      {view?.consultations.length ? (
        <section aria-label="Consultations" className="gs-card p-5 text-sm">
          <h2 className="font-semibold">What Claude was asked, and how its advice turned out</h2>
          <p className="text-xs gs-muted">Every ask is logged with the question, the answer, what the rules kept or rejected, and the outcome once known. The next ask carries this record back.</p>
          <ul className="mt-3 space-y-2">
            {view.consultations.map((c) => {
              const outcomes = Object.values(c.outcomes);
              const held = outcomes.filter((o) => o.result === 'worked').length;
              const failed = outcomes.filter((o) => o.result !== 'worked').length;
              return (
                <li key={c.id} data-role="agent-consultation">
                  <strong>{ADVISOR_LABELS[c.advisor]}</strong> ({c.model}) on {when(c.created_at)}: {c.purpose === 'research' ? `research, ${c.kept} new learning${c.kept === 1 ? '' : 's'} kept` : `asked about ${c.issues} issue${c.issues === 1 ? '' : 's'}, kept ${c.kept}, rejected ${c.rejected.length}`}
                  {outcomes.length ? ` · outcomes: ${held} held, ${failed} did not` : ' · outcomes not known yet'}
                  {c.latency_ms !== null ? ` · ${(c.latency_ms / 1000).toFixed(1)} s` : ''}
                  {c.usage ? ` · ${c.usage.input_tokens + c.usage.output_tokens} tokens` : ''}
                  {c.error ? <span style={{ color: 'var(--gs-bad)' }}> · {c.error}</span> : null}
                  {c.rejected.filter(Boolean).length ? <span className="gs-muted"> · {c.rejected.filter(Boolean).join(' ')}</span> : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {view?.lessons.length ? (
        <section aria-label="Lessons" className="gs-card p-5 text-sm">
          <h2 className="font-semibold">What has worked</h2>
          <p className="text-xs gs-muted">From the resolutions applied so far, checked on a later pass. A resolution that failed twice with no success is not proposed again for that kind of issue.</p>
          <ul className="mt-3 space-y-1">
            {view.lessons.map((l) => (
              <li key={`${l.source}|${l.kind}|${l.resolver}`}>
                {l.worked > l.failed ? <CheckCircle2 size={14} className="mr-1 inline" aria-hidden="true" /> : <AlertTriangle size={14} className="mr-1 inline" aria-hidden="true" />}
                <strong>{resolvers[l.resolver] ?? l.resolver}</strong> on {l.source} / {l.kind}: held {l.worked}, did not hold {l.failed}
                {l.last ? <span className="gs-muted"> · {l.last}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
