import { chatJson } from '../openai.js';
import { applicableResolvers } from './resolvers.js';
import type { Confidence, IssueRow, LessonSummary, Proposal, Resolver } from './types.js';

/**
 * One proposal per issue: what it means, the likely cause, and which of the
 * resolutions the registry allows for it, if any. The model writes the words
 * and picks among the resolvers the code already computed as applicable;
 * it cannot name a target, invent a resolver, or pick one the lessons have
 * ruled out. Without OpenAI (or when it fails) the agent's own rule proposes:
 * the first applicable resolver, or a developer brief.
 */

/** A resolver that failed this many times on a kind with no success is not proposed for it again. */
export const RULED_OUT_AFTER = 2;
const CONFIDENCES: readonly Confidence[] = ['low', 'medium', 'high'];
const MAX_ISSUES_PER_CALL = 25;

export function allowedResolvers(issue: Pick<IssueRow, 'source' | 'kind' | 'subject'>, lessons: LessonSummary[]): Resolver[] {
  return applicableResolvers(issue).filter((r) => {
    const l = lessons.find((s) => s.source === issue.source && s.kind === issue.kind && s.resolver === r.key);
    return !(l && l.worked === 0 && l.failed >= RULED_OUT_AFTER);
  });
}

/** The agent's own proposal, without a model. */
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

const SYSTEM = `You are the operations agent for GroundSwell, a marketing-audit engine run by New Wave, a small IT and growth company. You read issues the engine's own checks found, and for each one you write what it means for the owner, the likely cause, and which of the ALLOWED resolutions to propose. Rules:
- Plain words for a business owner. No jargon the evidence does not use. Never invent a figure, a cause or a name.
- "resolver" must be one of the allowed keys given for that issue, or "needs_developer" when a code or setup change is needed, or "none" when the right move is to wait and watch (say until when).
- Use the lessons: a resolution that failed before on the same kind of issue needs a reason to be tried again; one that worked is the first choice.
- For needs_developer, write a "brief": what to look at, the evidence, and what would show it is fixed, in at most six lines.
- confidence is "low", "medium" or "high".
Answer JSON only: { "proposals": [ { "id": "<issue id>", "summary": "...", "cause": "...", "resolver": "<key>", "rationale": "...", "confidence": "...", "brief": "..." } ] }.`;

interface ModelProposal {
  id?: string;
  summary?: string;
  cause?: string;
  resolver?: string;
  rationale?: string;
  confidence?: string;
  brief?: string;
}

const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

/** Keeps a model proposal only where it stayed within the rules; `null` means fall back to the rule. */
export function checkProposal(issue: IssueRow, raw: ModelProposal | undefined, allowed: Resolver[]): Proposal | null {
  if (!raw) return null;
  const resolver = clip(raw.resolver, 40);
  const permitted = resolver === 'needs_developer' || resolver === 'none' || allowed.some((r) => r.key === resolver);
  if (!permitted) return null;
  const summary = clip(raw.summary, 400) || issue.title;
  const cause = clip(raw.cause, 600) || issue.detail;
  const rationale = clip(raw.rationale, 600);
  if (!rationale) return null;
  const confidence = CONFIDENCES.includes(raw.confidence as Confidence) ? (raw.confidence as Confidence) : 'low';
  const brief = resolver === 'needs_developer' ? clip(raw.brief, 1200) || `${issue.title}. ${issue.detail}` : undefined;
  return { resolver, summary, cause, rationale, confidence, ...(brief ? { brief } : {}), by: 'model' };
}

export interface ProposeOptions {
  ask?: typeof chatJson;
  /** Without an OpenAI key the rule proposes; a test passes false to force it. */
  useModel?: boolean;
}

/** Proposals for every issue, by id. The model is asked once for up to 25; the rule covers the rest and any answer that broke the rules. */
export async function proposeAll(issues: IssueRow[], lessons: LessonSummary[], opts: ProposeOptions = {}): Promise<Map<string, Proposal>> {
  const out = new Map<string, Proposal>();
  if (!issues.length) return out;
  const useModel = opts.useModel ?? Boolean(process.env.OPENAI_API_KEY);
  const allowedBy = new Map(issues.map((i) => [i.id, allowedResolvers(i, lessons)]));
  let answers = new Map<string, ModelProposal>();
  if (useModel) {
    try {
      const ask = opts.ask ?? chatJson;
      const batch = issues.slice(0, MAX_ISSUES_PER_CALL);
      const user = JSON.stringify({
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
          allowed: (allowedBy.get(i.id) ?? []).map((r) => ({ key: r.key, label: r.label, change: r.describe(i).change })),
        })),
        lessons: lessons.filter((l) => batch.some((i) => i.source === l.source && i.kind === l.kind)),
      });
      const reply = await ask<{ proposals?: ModelProposal[] }>(SYSTEM, user, 90_000);
      answers = new Map((reply.proposals ?? []).filter((p) => typeof p?.id === 'string').map((p) => [p.id as string, p]));
    } catch (err) {
      console.error('Agent proposals: the model did not answer, the rule proposes instead:', err instanceof Error ? err.message : err);
    }
  }
  for (const issue of issues) {
    out.set(issue.id, checkProposal(issue, answers.get(issue.id), allowedBy.get(issue.id) ?? []) ?? ruleProposal(issue, lessons));
  }
  return out;
}
