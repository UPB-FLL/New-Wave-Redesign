import { chatJson } from '../openai.js';
import { agentModel, consultClaude, isClaudeConfigured, type Consultation } from './consult.js';
import { applicableResolvers } from './resolvers.js';
import { recordConsultation } from './store.js';
import type { Confidence, ConsultationRow, Db, IssueRow, LessonSummary, Proposal, Resolver } from './types.js';

/**
 * One proposal per issue: what it means, the likely cause, and which of the
 * resolutions the registry allows for it, if any. The agent asks Claude
 * (consult.ts) with the issues, the allowed resolver keys, the lessons, and
 * its own log of what Claude advised before and how each advice turned out;
 * Claude writes the words and picks among the allowed keys. The agent checks
 * every answer against the registry (`checkProposal`): it cannot name a
 * target, invent a resolver, or pick one the lessons have ruled out. Every
 * ask is logged (groundswell_agent_consultations) with what was kept or
 * rejected and why, and the next ask carries that log back, so the advice
 * adapts to its own record. Without Claude, OpenAI stands in; without
 * either (or when the answer breaks the rules) the agent's own rule
 * proposes: the first applicable resolver, or a developer brief.
 */

/** A resolver that failed this many times on a kind with no success is not proposed for it again. */
export const RULED_OUT_AFTER = 2;
const CONFIDENCES: readonly Confidence[] = ['low', 'medium', 'high'];
const MAX_ISSUES_PER_CALL = 25;
/** How many earlier consultations the question carries back. */
const PRIOR_ADVICE = 12;

export function allowedResolvers(issue: Pick<IssueRow, 'source' | 'kind' | 'subject'>, lessons: LessonSummary[]): Resolver[] {
  return applicableResolvers(issue).filter((r) => {
    const l = lessons.find((s) => s.source === issue.source && s.kind === issue.kind && s.resolver === r.key);
    return !(l && l.worked === 0 && l.failed >= RULED_OUT_AFTER);
  });
}

/** The agent's own proposal, without an advisor. */
export function ruleProposal(issue: IssueRow, lessons: LessonSummary[]): Proposal {
  const allowed = allowedResolvers(issue, lessons);
  const recurred = issue.recurrences > 0 ? ` It has come back ${issue.recurrences} time${issue.recurrences === 1 ? '' : 's'} after being resolved.` : '';
  if (!allowed.length) {
    return {
      resolver: 'needs_developer',
      summary: issue.title,
      cause: issue.detail,
      rationale: `No automatic resolution applies to this kind of issue${issue.recurrences ? ', or the ones that do have not held' : ''}.${recurred}`,
      confidence: 'low',
      brief: `Source ${issue.source}, kind ${issue.kind}. Seen ${issue.occurrences} time${issue.occurrences === 1 ? '' : 's'} since ${issue.first_seen.slice(0, 10)}. ${issue.detail}`,
      by: 'rule',
    };
  }
  const first = allowed[0];
  const history = lessons.find((s) => s.source === issue.source && s.kind === issue.kind && s.resolver === first.key);
  return {
    resolver: first.key,
    summary: issue.title,
    cause: issue.detail,
    rationale: `${first.label}: the usual first move for this kind of issue.${history ? ` It has worked ${history.worked} time${history.worked === 1 ? '' : 's'} and failed ${history.failed} before.` : ''}${recurred}`,
    confidence: history && history.failed > history.worked ? 'low' : issue.recurrences ? 'low' : 'medium',
    by: 'rule',
  };
}

export const SYSTEM = `You are the operations advisor for GroundSwell, a marketing-audit engine run by New Wave, a small IT and growth company. An agent in the engine asks you about the issues its own checks found. For each one you write what it means for the owner, the likely cause, and which of the ALLOWED resolutions to propose; the agent applies a resolution only after the owner approves it from an email, and later checks whether it held.

Rules:
- Plain words for a business owner. No jargon the evidence does not use. Never invent a figure, a cause or a name.
- "resolver" must be one of the allowed keys given for that issue, or "needs_developer" when a code or setup change is needed, or "none" when the right move is to wait and watch (say until when). An answer naming any other key is discarded and the agent's own rule proposes instead, so stay within the keys.
- Learn from the record you are given: "lessons" count how each resolution held per kind of issue, and "prior_advice" is what you advised before on the same kinds, whether the agent kept it, and how it turned out. A resolution that did not hold needs a reason to be tried again; one that held is the first choice; advice the agent rejected tells you what not to repeat.
- For needs_developer, write a "brief": what to look at, the evidence, and what would show it is fixed, in at most six lines.
- confidence is "low", "medium" or "high".
Answer with JSON only: { "proposals": [ { "id": "<issue id>", "summary": "...", "cause": "...", "resolver": "<key>", "rationale": "...", "confidence": "...", "brief": "..." } ] }.`;

export interface ModelProposal {
  id?: string;
  summary?: string;
  cause?: string;
  resolver?: string;
  rationale?: string;
  confidence?: string;
  brief?: string;
}

const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

/** Keeps an advisor's proposal only where it stayed within the rules; otherwise the reason it was rejected. */
export function checkProposal(issue: IssueRow, raw: ModelProposal | undefined, allowed: Resolver[], by: Proposal['by'] = 'claude'): { proposal: Proposal | null; reason: string | null } {
  if (!raw) return { proposal: null, reason: 'No answer for this issue.' };
  const resolver = clip(raw.resolver, 40);
  const permitted = resolver === 'needs_developer' || resolver === 'none' || allowed.some((r) => r.key === resolver);
  if (!permitted) return { proposal: null, reason: `Named "${resolver || '(empty)'}", which is not an allowed resolver for this issue (allowed: ${allowed.map((r) => r.key).join(', ') || 'none'}, needs_developer, none).` };
  const summary = clip(raw.summary, 400) || issue.title;
  const cause = clip(raw.cause, 600) || issue.detail;
  const rationale = clip(raw.rationale, 600);
  if (!rationale) return { proposal: null, reason: 'No rationale was given.' };
  const confidence = CONFIDENCES.includes(raw.confidence as Confidence) ? (raw.confidence as Confidence) : 'low';
  const brief = resolver === 'needs_developer' ? clip(raw.brief, 1200) || `${issue.title}. ${issue.detail}` : undefined;
  return { proposal: { resolver, summary, cause, rationale, confidence, ...(brief ? { brief } : {}), by }, reason: null };
}

/** What earlier consultations said about the same kinds, with how each advice turned out: the record the advisor learns from. */
export function priorAdvice(consultations: ConsultationRow[], issues: IssueRow[]): unknown[] {
  const kinds = new Set(issues.map((i) => `${i.source}|${i.kind}`));
  const out: unknown[] = [];
  for (const c of consultations.slice(0, PRIOR_ADVICE)) {
    const asked = (c.question.issues as { id: string; source: string; kind: string; title: string }[] | undefined) ?? [];
    const answers = ((c.answer?.proposals as ModelProposal[] | undefined) ?? []).filter((p): p is ModelProposal & { id: string } => typeof p?.id === 'string');
    for (const a of answers) {
      const issue = asked.find((i) => i.id === a.id);
      if (!issue || !kinds.has(`${issue.source}|${issue.kind}`)) continue;
      const kept = c.kept[a.id];
      const outcome = c.outcomes[a.id];
      out.push({
        when: c.created_at.slice(0, 16),
        source: issue.source,
        kind: issue.kind,
        issue: issue.title,
        advised: { resolver: a.resolver, cause: clip(a.cause, 200), rationale: clip(a.rationale, 200), confidence: a.confidence },
        kept: kept ? kept.kept : null,
        rejected_because: kept && !kept.kept ? kept.reason : null,
        outcome: outcome ? { result: outcome.result, note: clip(outcome.note, 200) } : 'not known yet',
      });
    }
    if (c.error) out.push({ when: c.created_at.slice(0, 16), error: c.error });
  }
  return out;
}

export interface ProposeOptions {
  /** A stand-in for the Claude call (tests). */
  consult?: (system: string, question: string) => Promise<Consultation>;
  /** The OpenAI stand-in (tests). */
  ask?: typeof chatJson;
  /** Which advisor to use; the default follows the keys set: Claude, else OpenAI, else the rule. */
  advisor?: 'claude' | 'openai' | 'rule';
  /** The earlier consultations the question carries back (the caller reads them). */
  consultations?: ConsultationRow[];
}

export function advisorFor(opts: ProposeOptions): 'claude' | 'openai' | 'rule' {
  if (opts.advisor) return opts.advisor;
  const forced = (process.env.GROUNDSWELL_AGENT_ADVISOR ?? '').trim().toLowerCase();
  if (forced === 'claude' || forced === 'openai' || forced === 'rule') return forced;
  if (isClaudeConfigured() || opts.consult) return 'claude';
  if (process.env.OPENAI_API_KEY || opts.ask) return 'openai';
  return 'rule';
}

/**
 * Proposals for every issue, by id. The advisor is asked once for up to 25
 * issues; the rule covers the rest and any answer that broke the rules. The
 * ask is logged whether it answered or not.
 */
export async function proposeAll(db: Db, issues: IssueRow[], lessons: LessonSummary[], opts: ProposeOptions = {}): Promise<Map<string, Proposal>> {
  const out = new Map<string, Proposal>();
  if (!issues.length) return out;
  const advisor = advisorFor(opts);
  const allowedBy = new Map(issues.map((i) => [i.id, allowedResolvers(i, lessons)]));
  let answers = new Map<string, ModelProposal>();
  let consultationId: string | null = null;
  if (advisor !== 'rule') {
    const batch = issues.slice(0, MAX_ISSUES_PER_CALL);
    const question = {
      issues: batch.map((i) => ({
        id: i.id,
        source: i.source,
        kind: i.kind,
        severity: i.severity,
        title: i.title,
        detail: i.detail,
        evidence: i.evidence,
        first_seen: i.first_seen,
        occurrences: i.occurrences,
        recurrences: i.recurrences,
        last_outcome: i.outcome ? { ok: i.outcome.ok, note: clip(i.outcome.note, 200), verified: i.outcome.verified } : null,
        allowed: (allowedBy.get(i.id) ?? []).map((r) => ({ key: r.key, label: r.label, change: r.describe(i).change })),
      })),
      lessons: lessons.filter((l) => batch.some((i) => i.source === l.source && i.kind === l.kind)),
      prior_advice: priorAdvice(opts.consultations ?? [], batch),
    };
    const questionText = JSON.stringify(question);
    let result: Consultation;
    if (advisor === 'claude') {
      result = await (opts.consult ?? consultClaude)(SYSTEM, questionText);
    } else {
      const started = Date.now();
      try {
        const reply = await (opts.ask ?? chatJson)<Record<string, unknown>>(SYSTEM, questionText, 90_000);
        result = { model: process.env.GROUNDSWELL_OPENAI_MODEL || 'gpt-4o', text: JSON.stringify(reply), parsed: reply, usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: null }, latency_ms: Date.now() - started, stop_reason: null, error: null };
      } catch (err) {
        result = { model: process.env.GROUNDSWELL_OPENAI_MODEL || 'gpt-4o', text: '', parsed: null, usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: null }, latency_ms: Date.now() - started, stop_reason: null, error: err instanceof Error ? err.message : String(err) };
      }
    }
    if (result.error) console.error(`Agent proposals: ${advisor === 'claude' ? 'Claude' : 'OpenAI'} did not answer, the rule proposes instead:`, result.error);
    answers = new Map(((result.parsed?.proposals as ModelProposal[] | undefined) ?? []).filter((p) => p && typeof p.id === 'string').map((p) => [p.id as string, p]));

    // Log the ask whole, with what was kept of it.
    const kept: ConsultationRow['kept'] = {};
    for (const issue of batch) {
      const { proposal, reason } = checkProposal(issue, answers.get(issue.id), allowedBy.get(issue.id) ?? [], advisor);
      kept[issue.id] = { kept: Boolean(proposal), resolver: proposal?.resolver ?? (clip(answers.get(issue.id)?.resolver, 40) || null), reason };
    }
    try {
      consultationId = await recordConsultation(db, { advisor, purpose: 'proposals', model: result.model || agentModel(), issue_ids: batch.map((i) => i.id), question, answer_text: result.text, answer: result.parsed, kept, usage: result.usage, latency_ms: result.latency_ms, error: result.error });
    } catch (err) {
      console.error('Agent consultation log failed:', err instanceof Error ? err.message : err);
    }
  }
  for (const issue of issues) {
    const { proposal } = checkProposal(issue, answers.get(issue.id), allowedBy.get(issue.id) ?? [], advisor === 'rule' ? 'rule' : advisor);
    out.set(issue.id, proposal ? { ...proposal, ...(consultationId ? { consultation_id: consultationId } : {}) } : ruleProposal(issue, lessons));
  }
  return out;
}
