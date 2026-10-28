import { createHash, randomBytes } from 'node:crypto';
import type { CollectResult, ConsultationRow, Db, IssueRow, IssueStatus, LearningRow, LessonRow, LessonSummary, Observation, Outcome, PlaybookRow, Proposal } from './types.js';

/**
 * The agent's memory (migration 20261104120000): one issue per fingerprint,
 * and the lessons about what was tried and whether it held. Every pass folds
 * its observations in here: a new fingerprint opens an issue, a known one is
 * counted again, a resolved one that comes back reopens with a lesson, and
 * an open one that a healthy source no longer reports is cleared.
 */

export const ISSUE_COLUMNS = 'id,fingerprint,source,kind,severity,title,detail,subject,evidence,status,first_seen,last_seen,occurrences,recurrences,proposal,proposed_at,approval_token_hash,approval_expires_at,decided_by,decided_at,resolved_at,outcome,reported_at,muted_until,created_at,updated_at';
export const LESSON_COLUMNS = 'id,issue_id,source,kind,resolver,result,note,created_at';
/** An approval link works for this long after the report that carried it. */
export const APPROVAL_DAYS = 7;
/** A dismissed issue stays quiet for this long, then is reported again if still seen. */
export const MUTE_DAYS = 7;
export const NOT_READY = 'The agent is not set up in the database yet (migration 20261104120000).';

export const missingTable = (m: string | undefined) => /relation .* does not exist|42P01/i.test(m ?? '');
const sha = (value: string) => createHash('sha256').update(value).digest('hex');

export interface FoldReport {
  opened: string[];
  seen: string[];
  reopened: string[];
  cleared: string[];
  /** Sources whose collector failed: their issues were left as they were. */
  unread: string[];
}

async function list<T>(query: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const result = await query;
  if (result.error) throw new Error(missingTable(result.error.message) ? 'NOT_READY' : result.error.message);
  return (result.data ?? []) as T[];
}

export async function readIssues(db: Db, statuses?: readonly IssueStatus[]): Promise<IssueRow[]> {
  const q = db.from('groundswell_agent_issues').select(ISSUE_COLUMNS);
  return list<IssueRow>(statuses ? q.in('status', [...statuses]) : q);
}

export async function readIssue(db: Db, id: string): Promise<IssueRow | null> {
  const { data, error } = await db.from('groundswell_agent_issues').select(ISSUE_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw new Error(missingTable(error.message) ? 'NOT_READY' : error.message);
  return (data as IssueRow | null) ?? null;
}

export async function updateIssue(db: Db, id: string, patch: Partial<IssueRow>): Promise<void> {
  const { error } = await db.from('groundswell_agent_issues').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function addLesson(db: Db, lesson: Omit<LessonRow, 'id' | 'created_at'>): Promise<void> {
  const { error } = await db.from('groundswell_agent_lessons').insert({ ...lesson, note: lesson.note.slice(0, 600) });
  if (error) throw new Error(error.message);
}

export async function readLessons(db: Db, limit = 200): Promise<LessonRow[]> {
  return list<LessonRow>(db.from('groundswell_agent_lessons').select(LESSON_COLUMNS).order('created_at', { ascending: false }).limit(limit));
}

/** What the lessons say, per source, kind and resolver. */
export function summarizeLessons(lessons: LessonRow[]): LessonSummary[] {
  const map = new Map<string, LessonSummary>();
  for (const l of lessons) {
    const key = `${l.source}|${l.kind}|${l.resolver}`;
    const s = map.get(key) ?? { source: l.source, kind: l.kind, resolver: l.resolver, worked: 0, failed: 0, last: '' };
    if (l.result === 'worked') s.worked += 1;
    else s.failed += 1;
    if (!s.last) s.last = l.note;
    map.set(key, s);
  }
  return [...map.values()];
}

/** Folds one pass's observations into the issue table. */
export async function foldObservations(db: Db, results: CollectResult[], now: Date): Promise<FoldReport> {
  const report: FoldReport = { opened: [], seen: [], reopened: [], cleared: [], unread: [] };
  const stamp = now.toISOString();
  const observations: Observation[] = results.flatMap((r) => r.observations);
  const healthy = new Set(results.filter((r) => !r.error).map((r) => r.source));
  report.unread = results.filter((r) => r.error).map((r) => r.source);

  const existing = await readIssues(db);
  const byPrint = new Map(existing.map((i) => [i.fingerprint, i]));
  const seenPrints = new Set<string>();

  for (const o of observations) {
    if (seenPrints.has(o.fingerprint)) continue;
    seenPrints.add(o.fingerprint);
    const row = byPrint.get(o.fingerprint);
    const fresh = { severity: o.severity, title: o.title, detail: o.detail, subject: o.subject, evidence: o.evidence ?? {}, last_seen: stamp };
    if (!row) {
      const { error } = await db.from('groundswell_agent_issues').insert({ fingerprint: o.fingerprint, source: o.source, kind: o.kind, ...fresh, status: 'open', first_seen: stamp, occurrences: 1, recurrences: 0 });
      if (error) throw new Error(missingTable(error.message) ? 'NOT_READY' : error.message);
      report.opened.push(o.fingerprint);
      continue;
    }
    if (row.status === 'dismissed' && row.muted_until && row.muted_until > stamp) continue;
    if (row.status === 'resolved' || row.status === 'dismissed') {
      // History no newer than the decision is the same sighting, not a recurrence.
      const decidedAt = row.resolved_at ?? row.decided_at;
      if (o.observed_at && decidedAt && o.observed_at <= decidedAt) continue;
      // It came back. The resolution, if any, did not hold: a lesson for next time.
      const resolver = row.proposal?.resolver;
      if (row.status === 'resolved' && resolver && row.outcome?.ok && !row.outcome.verified) {
        await addLesson(db, { issue_id: row.id, source: row.source, kind: row.kind, resolver, result: 'failed', note: `Came back ${row.resolved_at ? 'after being resolved on ' + row.resolved_at.slice(0, 10) : 'after being resolved'}: ${o.detail.slice(0, 200)}` });
        await updateIssue(db, row.id, { outcome: { ...(row.outcome as Outcome), verified: 'failed', verified_at: stamp } });
      }
      await updateIssue(db, row.id, { ...fresh, status: 'open', occurrences: row.occurrences + 1, recurrences: row.recurrences + 1, proposal: null, proposed_at: null, approval_token_hash: null, approval_expires_at: null, decided_by: null, decided_at: null, resolved_at: null, outcome: null, muted_until: null });
      report.reopened.push(o.fingerprint);
      continue;
    }
    await updateIssue(db, row.id, { ...fresh, occurrences: row.occurrences + 1 });
    report.seen.push(o.fingerprint);
  }

  // Open issues of a healthy source that were not seen: gone on their own.
  for (const row of existing) {
    if (seenPrints.has(row.fingerprint) || !healthy.has(row.source)) continue;
    if (!['open', 'proposed', 'needs_developer', 'approved'].includes(row.status)) continue;
    await updateIssue(db, row.id, { status: 'resolved', resolved_at: stamp, outcome: { ok: true, note: 'No longer observed; cleared without a change from the agent.', verified: 'worked', verified_at: stamp }, approval_token_hash: null, approval_expires_at: null });
    report.cleared.push(row.fingerprint);
  }
  return report;
}

export async function saveProposal(db: Db, issue: IssueRow, proposal: Proposal, now: Date): Promise<void> {
  const status: IssueStatus = proposal.resolver === 'needs_developer' ? 'needs_developer' : 'proposed';
  await updateIssue(db, issue.id, { proposal, proposed_at: now.toISOString(), status });
}

/** A fresh approval token for the issue: the plain token goes in the email, its hash in the row. */
export async function issueApprovalToken(db: Db, issue: IssueRow, now: Date): Promise<string> {
  const token = randomBytes(24).toString('base64url');
  await updateIssue(db, issue.id, { approval_token_hash: sha(token), approval_expires_at: new Date(now.getTime() + APPROVAL_DAYS * 24 * 60 * 60_000).toISOString(), reported_at: now.toISOString() });
  return token;
}

/** The issue an approval token names, if the token is current. */
export async function issueForToken(db: Db, token: string, now: Date): Promise<IssueRow | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const { data, error } = await db.from('groundswell_agent_issues').select(ISSUE_COLUMNS).eq('approval_token_hash', sha(token)).maybeSingle();
  if (error) throw new Error(missingTable(error.message) ? 'NOT_READY' : error.message);
  const row = data as IssueRow | null;
  if (!row || !row.approval_expires_at || row.approval_expires_at < now.toISOString()) return null;
  return row;
}

export const CONSULTATION_COLUMNS = 'id,advisor,purpose,model,issue_ids,question,answer_text,answer,kept,outcomes,usage,latency_ms,error,created_at';
export const LEARNING_COLUMNS = 'id,topic,title,summary,why_it_matters,action,url,source,published_at,confidence,status,consultation_id,found_at';

/** The newest learnings, on one topic or all; empty before the migration. */
export async function readLearnings(db: Db, opts: { topic?: string; limit?: number; since?: string } = {}): Promise<LearningRow[]> {
  let q = db.from('groundswell_agent_learnings').select(LEARNING_COLUMNS);
  if (opts.topic) q = q.eq('topic', opts.topic);
  if (opts.since) q = q.gt('found_at', opts.since);
  const result = await q.order('found_at', { ascending: false }).limit(opts.limit ?? 50);
  if (result.error) {
    if (missingTable(result.error.message)) return [];
    throw new Error(result.error.message);
  }
  return (result.data ?? []) as LearningRow[];
}

/** Stores the learnings a pass kept; one the table already holds by link is skipped. Empty before the migration. */
export async function recordLearnings(db: Db, rows: Omit<LearningRow, 'id'>[]): Promise<LearningRow[]> {
  const out: LearningRow[] = [];
  for (const row of rows) {
    const { data, error } = await db.from('groundswell_agent_learnings').insert(row).select(LEARNING_COLUMNS).single();
    if (error) {
      if (missingTable(error.message)) return out;
      if (/duplicate key|23505/i.test(error.message)) continue;
      throw new Error(error.message);
    }
    if (data) out.push(data as LearningRow);
  }
  return out;
}

/** Logs one ask of the advisor; answers the row's id (null before the migration). */
export async function recordConsultation(db: Db, row: Omit<ConsultationRow, 'id' | 'created_at' | 'outcomes'>): Promise<string | null> {
  const { data, error } = await db.from('groundswell_agent_consultations').insert({ ...row, answer_text: row.answer_text.slice(0, 60_000), outcomes: {} }).select('id').single();
  if (error) {
    if (missingTable(error.message)) return null;
    throw new Error(error.message);
  }
  return (data as { id: string } | null)?.id ?? null;
}

export async function readConsultations(db: Db, limit = 20): Promise<ConsultationRow[]> {
  const result = await db.from('groundswell_agent_consultations').select(CONSULTATION_COLUMNS).order('created_at', { ascending: false }).limit(limit);
  if (result.error) {
    if (missingTable(result.error.message)) return [];
    throw new Error(result.error.message);
  }
  return (result.data ?? []) as ConsultationRow[];
}

/** How one piece of advice turned out, written back onto its consultation. */
export async function attachConsultationOutcome(db: Db, consultationId: string, issueId: string, outcome: ConsultationRow['outcomes'][string]): Promise<void> {
  const { data, error } = await db.from('groundswell_agent_consultations').select('id,outcomes').eq('id', consultationId).maybeSingle();
  if (error || !data) return;
  const outcomes = { ...((data as { outcomes?: ConsultationRow['outcomes'] }).outcomes ?? {}), [issueId]: outcome };
  await db.from('groundswell_agent_consultations').update({ outcomes }).eq('id', consultationId);
}

export interface ReportRow {
  id: string;
  sent_at: string;
  to_email: string;
  issue_ids: string[];
  subject: string;
  summary: string;
  email_id: string | null;
  status: 'sent' | 'skipped' | 'failed';
  created_at: string;
}

export async function recordReport(db: Db, row: Omit<ReportRow, 'id' | 'created_at'>): Promise<void> {
  const { error } = await db.from('groundswell_agent_reports').insert(row);
  if (error) throw new Error(missingTable(error.message) ? 'NOT_READY' : error.message);
}

export async function lastReport(db: Db): Promise<ReportRow | null> {
  const rows = await list<ReportRow>(db.from('groundswell_agent_reports').select('id,sent_at,to_email,issue_ids,subject,summary,email_id,status,created_at').order('sent_at', { ascending: false }).limit(1));
  return rows[0] ?? null;
}

export const PLAYBOOK_COLUMNS = 'source,kind,preferred,ruled_out,stats,trained_at,training_run_id';

/** The daily training's playbook (train.ts); empty before migration 20261106120000. */
export async function readPlaybook(db: Db): Promise<PlaybookRow[]> {
  const result = await db.from('groundswell_agent_playbook').select(PLAYBOOK_COLUMNS);
  if (result.error) {
    if (missingTable(result.error.message)) return [];
    throw new Error(result.error.message);
  }
  return (result.data ?? []) as PlaybookRow[];
}
