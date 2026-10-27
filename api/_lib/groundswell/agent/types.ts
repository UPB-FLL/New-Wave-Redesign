import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * The operations agent: what it sees, what it keeps, what it may do.
 *
 * It is agnostic on both sides. A *collector* turns any source (the audit
 * engine, Headway, the live readiness checks, or anything that posts an
 * observation to the route) into Observations with a stable fingerprint. A
 * *resolver* is one operational change the agent may make once a person has
 * approved it, with its own precondition, description, rollback and a check
 * that it held. Neither side knows the other; the agent joins them through
 * the issue table and the lessons it keeps about what worked.
 */

export type Severity = 'info' | 'warning' | 'error';

export interface Observation {
  /** Which collector saw it: `runs`, `headway`, `readiness`, `agent`, or `external:<name>`. */
  source: string;
  /** The kind of thing within the source (`run_failed`, `action_failed`, …); the resolvers key on it. */
  kind: string;
  /** Stable across passes for the same thing, so the agent counts it once. */
  fingerprint: string;
  severity: Severity;
  /** One line, plain words. */
  title: string;
  /** What happened, with the error text as the system gave it. */
  detail: string;
  /** The ids a resolver needs (audit_id, step, action_id, toolkit…); never free text. */
  subject: Record<string, string | number | null>;
  /** Anything else worth showing in the report or giving the model; trimmed. */
  evidence?: Record<string, unknown>;
  /**
   * When the newest underlying event happened (a run's last change, a step's
   * finish), for sources that report history rather than a live state: a
   * sighting no newer than the decision on the issue is old news, not a
   * recurrence. Absent for live states, which recur whenever seen again.
   */
  observed_at?: string;
}

export type IssueStatus = 'open' | 'proposed' | 'approved' | 'resolving' | 'resolved' | 'dismissed' | 'needs_developer';
export const ISSUE_STATUSES: readonly IssueStatus[] = ['open', 'proposed', 'approved', 'resolving', 'resolved', 'dismissed', 'needs_developer'];

export type Confidence = 'low' | 'medium' | 'high';

export interface Proposal {
  /** A resolver key, `needs_developer` (a brief for a person) or `none` (watch it). */
  resolver: string;
  /** The issue in the owner's words: what it means for the business. */
  summary: string;
  /** The likely cause, from the evidence and the lessons. */
  cause: string;
  /** Why this resolution, and what else was weighed. */
  rationale: string;
  confidence: Confidence;
  /** For `needs_developer`: what a developer should look at, in a few lines. */
  brief?: string;
  /** Who advised: Claude (the advisor), OpenAI (the stand-in), or the agent's own rule. */
  by: 'claude' | 'openai' | 'rule';
  /** The logged consultation this proposal came from (groundswell_agent_consultations). */
  consultation_id?: string;
}

export interface Outcome {
  ok: boolean;
  note: string;
  /** Set by the resolver's check on a later pass: whether the change held. */
  verified: 'worked' | 'failed' | null;
  verified_at?: string | null;
}

export interface IssueRow {
  id: string;
  fingerprint: string;
  source: string;
  kind: string;
  severity: Severity;
  title: string;
  detail: string;
  subject: Record<string, string | number | null>;
  evidence: Record<string, unknown>;
  status: IssueStatus;
  first_seen: string;
  last_seen: string;
  /** How many collection passes saw it. */
  occurrences: number;
  /** How many times it came back after being resolved. */
  recurrences: number;
  proposal: Proposal | null;
  proposed_at: string | null;
  approval_token_hash: string | null;
  approval_expires_at: string | null;
  decided_by: string | null;
  decided_at: string | null;
  resolved_at: string | null;
  outcome: Outcome | null;
  reported_at: string | null;
  muted_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface LessonRow {
  id: string;
  issue_id: string | null;
  source: string;
  kind: string;
  resolver: string;
  result: 'worked' | 'failed';
  note: string;
  created_at: string;
}

/** What the lessons say about one resolver on one kind of issue. */
export interface LessonSummary {
  source: string;
  kind: string;
  resolver: string;
  worked: number;
  failed: number;
  /** The newest note, so the model sees the last thing that happened. */
  last: string;
}

/**
 * One ask of the advisor, logged whole: the question as sent, the answer as
 * it came back, what the agent kept or rejected of it and why, and later the
 * outcome of each advice that was applied. The next question carries this
 * log back, so the advice adapts to what held.
 */
export interface ConsultationRow {
  id: string;
  advisor: 'claude' | 'openai';
  model: string;
  issue_ids: string[];
  question: Record<string, unknown>;
  answer_text: string;
  answer: Record<string, unknown> | null;
  /** Per issue id: kept, or rejected with the reason. */
  kept: Record<string, { kept: boolean; resolver: string | null; reason: string | null }>;
  /** Per issue id, filled on a later pass: how the advice turned out. */
  outcomes: Record<string, { resolver: string; result: 'worked' | 'failed' | 'not_applied'; note: string; at: string }>;
  usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens: number | null } | null;
  latency_ms: number | null;
  error: string | null;
  created_at: string;
}

export type Db = Pick<SupabaseClient, 'from'>;

export interface CollectContext {
  db: Db;
  now: Date;
  /** Epoch ms the pass must finish by; a slow collector stops early and says so. */
  deadline: number;
}

export interface CollectResult {
  source: string;
  observations: Observation[];
  /** Set when the collector could not finish: the agent reports that itself and does not clear this source's issues. */
  error?: string;
}

export interface Collector {
  name: string;
  /** The sources this collector is the authority on: an issue of one of them not seen on a successful pass is cleared. */
  sources: string[];
  collect(ctx: CollectContext): Promise<Observation[]>;
}

export interface ResolveResult {
  ok: boolean;
  note: string;
  /** The change needs the heartbeat to pick something up (a re-queued step): the route wakes the worker. */
  wakeWorker?: boolean;
}

export interface Resolver {
  key: string;
  label: string;
  /** Whether this resolver can act on the issue at all (source, kind and the ids it needs). */
  applies(issue: Pick<IssueRow, 'source' | 'kind' | 'subject'>): boolean;
  /** For the report: what will change, and how it is undone. Plain words; no ids the owner does not know. */
  describe(issue: Pick<IssueRow, 'source' | 'kind' | 'subject' | 'title'>): { change: string; rollback: string };
  apply(db: Db, issue: IssueRow): Promise<ResolveResult>;
  /** On a later pass: did the change hold? `pending` means not yet known. */
  verify(db: Db, issue: IssueRow): Promise<'worked' | 'failed' | 'pending'>;
}

/** Every agent-side status a proposal may still be acted on from. */
export const ACTIONABLE: readonly IssueStatus[] = ['open', 'proposed', 'needs_developer'];

export const NO_RESOLVER = ['needs_developer', 'none'] as const;
