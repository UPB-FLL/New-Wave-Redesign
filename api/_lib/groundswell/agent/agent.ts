import { Resend } from 'resend';
import { COLLECTORS, collectAll } from './collectors.js';
import { proposeAll, type ProposeOptions } from './propose.js';
import { AGENT_FROM, agentBaseUrl, agentEmailAddress, buildReport, type Report } from './report.js';
import { resolverByKey } from './resolvers.js';
import { addLesson, attachConsultationOutcome, foldObservations, issueApprovalToken, lastReport, MUTE_DAYS, readConsultations, readIssues, readLessons, recordReport, saveProposal, summarizeLessons, updateIssue, type FoldReport } from './store.js';
import type { Collector, Db, IssueRow, Outcome, ResolveResult } from './types.js';

/**
 * One pass of the agent, every 4 hours from pg_cron (migration
 * 20261104120000) or from the staff screen:
 *
 *   1. check the resolutions applied earlier: did each hold? (a lesson either way)
 *   2. read every source and fold what was seen into the issue table
 *   3. ask the advisor (Claude) for a resolution for every issue that has
 *      none, with the log of its earlier advice and outcomes; log the ask
 *   4. email the report when there is something to say (every 24 hours when
 *      there is not), with an Approve and a Dismiss link per proposal
 *
 * Nothing is applied here. A resolution runs only from `decide`, after the
 * owner approves it on the page the email link opens, or staff approve it on
 * the screen.
 */

/** With nothing to say, one report a day still goes out, so silence means "all clear" and not "the agent stopped". */
export const QUIET_REPORT_MS = 24 * 60 * 60_000;

export interface SendResult {
  id: string | null;
  error: string | null;
}
export type Sender = (message: { to: string; subject: string; html: string; text: string }) => Promise<SendResult>;

export interface PassOptions extends ProposeOptions {
  now?: Date;
  deadline: number;
  collectors?: readonly Collector[];
  send?: Sender;
  /** Email even when nothing changed. */
  force?: boolean;
  base?: string;
  to?: string;
}

export interface PassReport {
  fold: FoldReport;
  verified: { worked: string[]; failed: string[] };
  proposed: number;
  sent: boolean;
  reason: string;
  subject: string | null;
  counts: { approvals: number; developer: number; resolved: number; watching: number };
}

export async function resendSender(message: { to: string; subject: string; html: string; text: string }): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { id: null, error: 'RESEND_API_KEY is not set, so the report could not be emailed.' };
  try {
    const result = await new Resend(key).emails.send({ from: AGENT_FROM, to: message.to, subject: message.subject, html: message.html, text: message.text });
    if (result.error) return { id: null, error: result.error.message };
    return { id: result.data?.id ?? null, error: null };
  } catch (err) {
    return { id: null, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Step 1: the resolutions applied earlier, checked by their own resolver. */
export async function verifyResolutions(db: Db, now: Date): Promise<{ worked: string[]; failed: string[] }> {
  const out = { worked: [] as string[], failed: [] as string[] };
  const resolved = (await readIssues(db, ['resolved'])).filter((i) => i.outcome?.ok && !i.outcome.verified && i.proposal?.resolver);
  for (const issue of resolved) {
    const resolver = resolverByKey(issue.proposal!.resolver);
    if (!resolver) continue;
    let verdict: 'worked' | 'failed' | 'pending' = 'pending';
    try {
      verdict = await resolver.verify(db, issue);
    } catch (err) {
      console.error('Agent verify failed:', issue.fingerprint, err instanceof Error ? err.message : err);
    }
    if (verdict === 'pending') continue;
    await updateIssue(db, issue.id, { outcome: { ...(issue.outcome as Outcome), verified: verdict, verified_at: now.toISOString() } });
    const note = verdict === 'worked' ? `${resolver.label}: held. ${issue.outcome?.note ?? ''}` : `${resolver.label}: did not hold. ${issue.title}`;
    await addLesson(db, { issue_id: issue.id, source: issue.source, kind: issue.kind, resolver: resolver.key, result: verdict, note });
    if (issue.proposal?.consultation_id) await attachConsultationOutcome(db, issue.proposal.consultation_id, issue.id, { resolver: resolver.key, result: verdict, note, at: now.toISOString() });
    out[verdict].push(issue.fingerprint);
  }
  return out;
}

export async function runAgentPass(db: Db, opts: PassOptions): Promise<PassReport> {
  const now = opts.now ?? new Date();
  const base = opts.base ?? agentBaseUrl();
  const to = opts.to ?? agentEmailAddress();

  const verified = await verifyResolutions(db, now);
  const results = await collectAll({ db, now, deadline: opts.deadline }, opts.collectors ?? COLLECTORS);
  // A collector that failed is an issue of the agent's own.
  for (const r of results) {
    if (r.error) results.push({ source: 'agent', observations: [{ source: 'agent', kind: 'collector_failed', fingerprint: `agent:collector_failed:${r.source}`, severity: 'warning', title: `The agent could not read its "${r.source}" source`, detail: r.error, subject: { collector: r.source } }] });
  }
  if (!results.some((r) => r.source === 'agent')) results.push({ source: 'agent', observations: [] });
  const fold = await foldObservations(db, results, now);

  const lessons = summarizeLessons(await readLessons(db));
  const all = await readIssues(db);
  const unproposed = all.filter((i) => i.status === 'open' && !i.proposal);
  const proposals = await proposeAll(db, unproposed, lessons, { ...opts, consultations: opts.consultations ?? (unproposed.length ? await readConsultations(db) : []) });
  for (const issue of unproposed) {
    const p = proposals.get(issue.id);
    if (p) {
      await saveProposal(db, issue, p, now);
      issue.proposal = p;
      issue.status = p.resolver === 'needs_developer' ? 'needs_developer' : 'proposed';
    }
  }

  const previous = await lastReport(db);
  const sinceIso = previous?.sent_at ?? new Date(now.getTime() - 4 * 60 * 60_000).toISOString();
  const approvals = all.filter((i) => i.status === 'proposed' && i.proposal && i.proposal.resolver !== 'none');
  const developer = all.filter((i) => i.status === 'needs_developer');
  const resolved = all.filter((i) => i.status === 'resolved' && (i.resolved_at ?? '') > sinceIso);
  const watching = all.filter((i) => (i.status === 'open' && !i.proposal) || (i.status === 'proposed' && i.proposal?.resolver === 'none'));
  const counts = { approvals: approvals.length, developer: developer.length, resolved: resolved.length, watching: watching.length };

  // Every 4 hours while anything is open or was resolved since the last report; otherwise once a day.
  const something = approvals.length > 0 || developer.length > 0 || watching.length > 0 || resolved.length > 0 || fold.unread.length > 0 || verified.failed.length > 0;
  const quietDue = !previous || now.getTime() - Date.parse(previous.sent_at) >= QUIET_REPORT_MS;
  if (!opts.force && !something && !quietDue) {
    return { fold, verified, proposed: unproposed.length, sent: false, reason: 'Nothing new since the last report.', subject: null, counts };
  }

  const tokens: { issue: IssueRow; token: string }[] = [];
  for (const issue of approvals) tokens.push({ issue, token: await issueApprovalToken(db, issue, now) });
  for (const issue of [...developer, ...watching]) await updateIssue(db, issue.id, { reported_at: now.toISOString() });
  const report: Report = buildReport({ now, base, approvals: tokens, developer, resolved, watching, lessons, unread: fold.unread });
  const sent = await (opts.send ?? resendSender)({ to, subject: report.subject, html: report.html, text: report.text });
  await recordReport(db, { sent_at: now.toISOString(), to_email: to, issue_ids: [...approvals, ...developer, ...resolved, ...watching].map((i) => i.id), subject: report.subject, summary: report.summary, email_id: sent.id, status: sent.error ? 'failed' : 'sent' });
  if (sent.error) console.error('Agent report email failed:', sent.error);
  return { fold, verified, proposed: unproposed.length, sent: !sent.error, reason: sent.error ?? (something ? 'Sent.' : 'Sent the daily all-clear.'), subject: report.subject, counts };
}

export type Decision = 'approve' | 'dismiss';

export interface DecisionResult extends ResolveResult {
  decision: Decision;
  issue: IssueRow;
}

/** The owner's (or staff's) decision on a proposal: apply the resolution now, or mute the issue for a week. */
export async function decide(db: Db, issue: IssueRow, decision: Decision, by: string, now: Date): Promise<DecisionResult> {
  const stamp = now.toISOString();
  if (!['proposed', 'needs_developer', 'open'].includes(issue.status)) {
    return { ok: false, note: `This issue is ${issue.status === 'resolved' ? 'already resolved' : issue.status === 'dismissed' ? 'already dismissed' : issue.status} now.`, decision, issue };
  }
  if (decision === 'dismiss') {
    await updateIssue(db, issue.id, { status: 'dismissed', decided_by: by, decided_at: stamp, muted_until: new Date(now.getTime() + MUTE_DAYS * 24 * 60 * 60_000).toISOString(), approval_token_hash: null, approval_expires_at: null });
    return { ok: true, note: `Dismissed for ${MUTE_DAYS} days; reported again if still seen after that.`, decision, issue };
  }
  const resolver = resolverByKey(issue.proposal?.resolver);
  if (!resolver) return { ok: false, note: 'This issue has no resolution to approve; it needs a developer, or a wait.', decision, issue };
  if (!resolver.applies(issue)) return { ok: false, note: 'That resolution no longer applies to this issue.', decision, issue };
  await updateIssue(db, issue.id, { status: 'resolving', decided_by: by, decided_at: stamp, approval_token_hash: null, approval_expires_at: null });
  let result: ResolveResult;
  try {
    result = await resolver.apply(db, issue);
  } catch (err) {
    result = { ok: false, note: err instanceof Error ? err.message : String(err) };
  }
  if (result.ok) {
    await updateIssue(db, issue.id, { status: 'resolved', resolved_at: stamp, outcome: { ok: true, note: result.note, verified: null } });
  } else {
    // Back to open without the proposal: the next pass proposes again with this lesson in hand.
    await addLesson(db, { issue_id: issue.id, source: issue.source, kind: issue.kind, resolver: resolver.key, result: 'failed', note: `Could not be applied: ${result.note}` });
    if (issue.proposal?.consultation_id) await attachConsultationOutcome(db, issue.proposal.consultation_id, issue.id, { resolver: resolver.key, result: 'not_applied', note: result.note, at: stamp });
    await updateIssue(db, issue.id, { status: 'open', proposal: null, proposed_at: null, outcome: { ok: false, note: result.note, verified: 'failed', verified_at: stamp } });
  }
  return { ...result, decision, issue };
}
