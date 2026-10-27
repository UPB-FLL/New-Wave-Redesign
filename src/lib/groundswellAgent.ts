import { adminAuthHeaders } from './adminAuth';

/**
 * The browser side of the operations agent (api/groundswell/agent.ts), for
 * the staff screen at /groundswell/admin/agent.
 */

export type AgentSeverity = 'info' | 'warning' | 'error';
export type AgentIssueStatus = 'open' | 'proposed' | 'approved' | 'resolving' | 'resolved' | 'dismissed' | 'needs_developer';

export interface AgentProposal {
  resolver: string;
  summary: string;
  cause: string;
  rationale: string;
  confidence: 'low' | 'medium' | 'high';
  brief?: string;
  by: 'claude' | 'openai' | 'rule';
  consultation_id?: string;
}

export interface AgentIssue {
  id: string;
  fingerprint: string;
  source: string;
  kind: string;
  severity: AgentSeverity;
  title: string;
  detail: string;
  subject: Record<string, string | number | null>;
  evidence: Record<string, unknown>;
  status: AgentIssueStatus;
  first_seen: string;
  last_seen: string;
  occurrences: number;
  recurrences: number;
  proposal: AgentProposal | null;
  proposed_at: string | null;
  decided_by: string | null;
  decided_at: string | null;
  resolved_at: string | null;
  outcome: { ok: boolean; note: string; verified: 'worked' | 'failed' | null; verified_at?: string | null } | null;
  reported_at: string | null;
  muted_until: string | null;
}

export interface AgentLesson {
  source: string;
  kind: string;
  resolver: string;
  worked: number;
  failed: number;
  last: string;
}

export interface AgentReport {
  id: string;
  sent_at: string;
  to_email: string;
  issue_ids: string[];
  subject: string;
  summary: string;
  status: 'sent' | 'skipped' | 'failed';
}

/** One ask of the advisor, as the screen shows it: the digest, never the bodies. */
export interface AgentLearning {
  id: string;
  topic: string;
  title: string;
  summary: string;
  why_it_matters: string | null;
  action: string | null;
  url: string;
  source: string;
  published_at: string | null;
  confidence: 'low' | 'medium' | 'high';
  status: 'new' | 'kept' | 'dismissed';
  found_at: string;
}

export interface AgentConsultation {
  id: string;
  advisor: 'claude' | 'openai';
  purpose: 'proposals' | 'research';
  model: string;
  created_at: string;
  issues: number;
  kept: number;
  rejected: (string | null)[];
  outcomes: Record<string, { resolver: string; result: 'worked' | 'failed' | 'not_applied'; note: string; at: string }>;
  usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens: number | null } | null;
  latency_ms: number | null;
  error: string | null;
}

export const ADVISOR_LABELS = { claude: 'Claude', openai: 'OpenAI', rule: 'the agent’s rule' } as const;

export interface AgentView {
  issues: AgentIssue[];
  lessons: AgentLesson[];
  last_report: AgentReport | null;
  consultations: AgentConsultation[];
  learnings: AgentLearning[];
  topics: { key: string; label: string }[];
  resolvers: { key: string; label: string }[];
  config: { email: string; email_ready: boolean; advisor: 'claude' | 'openai' | 'rule'; model: string | null; claude_ready: boolean; model_ready: boolean; live_checks: boolean; base: string };
}

export const AGENT_STATUS_LABELS: Record<AgentIssueStatus, string> = {
  open: 'New',
  proposed: 'Waiting for approval',
  approved: 'Approved',
  resolving: 'Applying',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
  needs_developer: 'Needs a developer',
};

const PATH = '/api/groundswell/agent';

async function call<T>(init: RequestInit = {}, query = ''): Promise<T> {
  const response = await fetch(`${PATH}${query}`, { ...init, headers: { 'Content-Type': 'application/json', ...(await adminAuthHeaders()), ...(init.headers ?? {}) } });
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || 'Something went wrong; try again.');
  return body;
}

export const loadAgent = () => call<AgentView>();

/** Runs a pass now; the route answers at once and the pass runs on, so the screen re-reads after a moment. */
export const runAgentNow = (force = false) => call<{ accepted: boolean }>({ method: 'POST', body: JSON.stringify({ action: 'report', force }) });

export const decideIssue = (id: string, action: 'approve' | 'dismiss' | 'reopen') => call<{ ok: boolean; note?: string; issue: AgentIssue | null }>({ method: 'POST', body: JSON.stringify({ action, id }) });

/* The dashboard (/groundswell/admin/agent/dashboard): GET ?view=dashboard, POST { action: 'train' }. */

export interface AgentPlaybookEntry {
  source: string;
  kind: string;
  preferred: string[];
  ruled_out: string[];
  stats: Record<string, { worked: number; failed: number; last: string }>;
  trained_at: string;
  training_run_id: string | null;
}

export interface AgentTrainingRun {
  id: string;
  trigger: string;
  status: 'running' | 'done' | 'failed';
  window_start: string;
  window_end: string;
  started_at: string;
  finished_at: string | null;
  trained_on: {
    fixes?: { issue_id: string | null; title: string; source: string; kind: string; resolver: string | null; how: 'approved' | 'cleared' | 'dismissed'; verified: 'worked' | 'failed' | null; at: string }[];
    lessons?: { id: string; issue_id: string | null; source: string; kind: string; resolver: string; result: 'worked' | 'failed'; note: string; created_at: string }[];
  };
  steps: { step: string; label: string; detail: string; ms: number }[];
  changes: { source: string; kind: string; resolver: string | null; change: 'new_kind' | 'first_choice' | 'ruled_out' | 'restored' | 'counts'; note: string }[];
  counts: { fixes?: number; lessons?: number; held?: number; failed?: number; kinds?: number; changes?: number; checked?: number };
  summary: string;
  error: string | null;
}

export interface AgentScheduleEntry {
  job: string;
  cron: string;
  label: string;
  when: string;
  last_at: string | null;
  last_status: string | null;
}

export interface AgentDashboard {
  counts: { approvals: number; developer: number; watching: number; resolved_30d: number; held_30d: number; failed_30d: number; lessons_total: number; learnings_7d: number; days: { date: string; held: number; failed: number }[] };
  schedule: AgentScheduleEntry[];
  last_report: AgentReport | null;
  training_runs: AgentTrainingRun[];
  playbook: AgentPlaybookEntry[];
  resolvers: { key: string; label: string }[];
  training_ready: boolean;
}

export const loadAgentDashboard = () => call<AgentDashboard>({}, '?view=dashboard');

/** Trains now on the fixes since the last training; the route answers at once and trains on. */
export const trainAgentNow = () => call<{ accepted: boolean; run_id: string; window: { start: string; end: string } }>({ method: 'POST', body: JSON.stringify({ action: 'train' }) });
