import { waitUntil } from '@vercel/functions';
import { adminUser, requireAdmin } from '../_lib/adminKey.js';
import { decide, runAgentPass, type Decision } from '../_lib/groundswell/agent/agent.js';
import { agentBaseUrl, agentEmailAddress, decisionPage } from '../_lib/groundswell/agent/report.js';
import { RESOLVERS } from '../_lib/groundswell/agent/resolvers.js';
import { agentModel, isClaudeConfigured } from '../_lib/groundswell/agent/consult.js';
import { advisorFor } from '../_lib/groundswell/agent/propose.js';
import { topicsFromEnv } from '../_lib/groundswell/agent/research.js';
import { foldObservations, issueForToken, lastReport, NOT_READY, readConsultations, readIssue, readIssues, readLearnings, readLessons, summarizeLessons, updateIssue } from '../_lib/groundswell/agent/store.js';
import type { Observation, Severity } from '../_lib/groundswell/agent/types.js';
import { FUNCTION_SECONDS, runWorkerInBackground } from '../_lib/groundswell/background.js';
import { escapeHtml, methodGuard, queryParam, rateLimit, readJsonBody, clientIp, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { getSupabaseAdmin, isSupabaseConfigured } from '../_lib/supabaseAdmin.js';

/**
 * /api/groundswell/agent — the operations agent (api/_lib/groundswell/agent).
 *
 * From the email (no sign-in; the link's token is the credential):
 *   GET  ?token=&decision=approve|dismiss   the confirmation page
 *   POST ?token=&decision=                  the decision itself (the page's button)
 *
 * Staff (x-admin-key for pg_cron, or a signed-in admin's Bearer token):
 *   GET                                     every issue, the lessons, the last report, the setup
 *   POST { action: 'report', force? }       run a pass now (answers at once; the pass runs on)
 *   POST { action: 'observe', observations: [{ source, kind, title, detail, severity?, subject?, fingerprint? }] }
 *                                           an outside system's observations (a log drain, a
 *                                           deploy check, a Claude session); source becomes external:<source>
 *   POST { action: 'approve' | 'dismiss', id }
 */

const ID = /^[\w-]{1,64}$/;
const SEVERITIES: readonly Severity[] = ['info', 'warning', 'error'];
const slug = (v: unknown, n = 40) => (typeof v === 'string' ? v.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, n) : '');

function page(res: ApiResponse, status: number, html: string) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).send(html);
}

/** The observations an outside caller posted, checked and made ours. */
export function externalObservations(body: Record<string, unknown>): { observations: Observation[]; error?: string } {
  const raw = Array.isArray(body.observations) ? body.observations : [];
  if (!raw.length || raw.length > 50) return { observations: [], error: 'Send 1 to 50 observations.' };
  const out: Observation[] = [];
  for (const item of raw as Record<string, unknown>[]) {
    const source = slug(item?.source);
    const kind = slug(item?.kind, 60);
    const title = typeof item?.title === 'string' ? item.title.trim().slice(0, 200) : '';
    if (!source || !kind || !title) return { observations: [], error: 'Each observation needs a source, a kind and a title.' };
    const subject: Record<string, string | number | null> = {};
    if (item.subject && typeof item.subject === 'object') {
      for (const [k, v] of Object.entries(item.subject as Record<string, unknown>).slice(0, 12)) {
        if (typeof v === 'string') subject[slug(k, 40)] = v.slice(0, 200);
        else if (typeof v === 'number' || v === null) subject[slug(k, 40)] = v;
      }
    }
    const given = typeof item.fingerprint === 'string' ? item.fingerprint.trim().slice(0, 200) : '';
    out.push({
      source: `external:${source}`,
      kind,
      fingerprint: given ? `external:${source}:${given}` : `external:${source}:${kind}:${slug(title, 80)}`,
      severity: SEVERITIES.includes(item.severity as Severity) ? (item.severity as Severity) : 'warning',
      title,
      detail: typeof item.detail === 'string' ? item.detail.trim().slice(0, 1000) : title,
      subject,
      evidence: item.evidence && typeof item.evidence === 'object' && JSON.stringify(item.evidence).length <= 4000 ? (item.evidence as Record<string, unknown>) : undefined,
    });
  }
  return { observations: out };
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const startedAt = Date.now();
  if (!methodGuard(req, res, ['GET', 'POST'])) return;
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'The agent is not available right now.' });
  const db = getSupabaseAdmin();
  const base = agentBaseUrl();
  const now = new Date();
  const token = queryParam(req, 'token');

  // The email's links.
  if (token) {
    if (!rateLimit(`agent-token:${clientIp(req)}`, 30, 10 * 60_000)) return page(res, 429, decisionPage({ title: 'Too many tries', body: 'Wait a few minutes and open the link again.', base }));
    const decision = queryParam(req, 'decision') === 'dismiss' ? 'dismiss' : 'approve';
    let issue;
    try {
      issue = await issueForToken(db, token, now);
    } catch (err) {
      return page(res, 503, decisionPage({ title: 'Not ready', body: escapeHtml(err instanceof Error && err.message === 'NOT_READY' ? NOT_READY : 'The agent could not read its issues. Try again in a minute.'), base }));
    }
    if (!issue) return page(res, 404, decisionPage({ title: 'This link has expired', body: 'Links work for 7 days after the report that carried them, and only until a decision is made. The staff screen shows the issue’s current state.', base }));
    if (req.method === 'GET') {
      const url = `${base}/api/groundswell/agent?token=${encodeURIComponent(token)}&decision=${decision}`;
      return page(res, 200, decisionPage({
        title: decision === 'approve' ? 'Approve this resolution?' : 'Dismiss this issue for a week?',
        body: decision === 'approve' ? 'Press the button to apply the change below now. Nothing has changed yet.' : 'The issue goes quiet for seven days and is reported again if it is still seen.',
        issue,
        action: { url, label: decision === 'approve' ? 'Approve and apply' : 'Dismiss for a week', decision },
        base,
      }));
    }
    const result = await decide(db, issue, decision, `email:${agentEmailAddress()}`, now);
    if (result.ok && result.wakeWorker) runWorkerInBackground(startedAt);
    return page(res, result.ok ? 200 : 409, decisionPage({ title: result.ok ? (decision === 'approve' ? 'Applied' : 'Dismissed') : 'Not applied', body: escapeHtml(result.note), issue: result.ok && decision === 'approve' ? issue : null, base }));
  }

  if (!(await requireAdmin(req, res))) return;
  const by = `staff:${(await adminUser(req))?.email ?? 'cron'}`;

  try {
    if (req.method === 'GET') {
      const [issues, lessons, previous, consultations, learnings] = await Promise.all([readIssues(db), readLessons(db, 100), lastReport(db), readConsultations(db, 10), readLearnings(db, { limit: 40 })]);
      const advisor = advisorFor({});
      return res.status(200).json({
        issues: issues.sort((a, b) => (b.last_seen > a.last_seen ? 1 : -1)),
        lessons: summarizeLessons(lessons),
        last_report: previous,
        // The log, without the question and answer bodies (the screen shows the digest).
        learnings,
        topics: topicsFromEnv().map((t) => ({ key: t.key, label: t.label })),
        consultations: consultations.map((c) => ({ id: c.id, advisor: c.advisor, purpose: c.purpose ?? 'proposals', model: c.model, created_at: c.created_at, issues: c.issue_ids.length, kept: Object.values(c.kept).filter((k) => k.kept).length, rejected: Object.values(c.kept).filter((k) => !k.kept).map((k) => k.reason), outcomes: c.outcomes, usage: c.usage, latency_ms: c.latency_ms, error: c.error })),
        resolvers: RESOLVERS.map((r) => ({ key: r.key, label: r.label })),
        config: { email: agentEmailAddress(), email_ready: Boolean(process.env.RESEND_API_KEY), advisor, model: advisor === 'claude' ? agentModel() : advisor === 'openai' ? process.env.GROUNDSWELL_OPENAI_MODEL || 'gpt-4o' : null, claude_ready: isClaudeConfigured(), model_ready: Boolean(process.env.OPENAI_API_KEY), live_checks: (process.env.GROUNDSWELL_AGENT_LIVE_CHECKS ?? '').trim().toLowerCase() !== 'off', base },
      });
    }

    const body = readJsonBody(req);
    const action = typeof body.action === 'string' ? body.action : '';

    if (action === 'report') {
      const deadline = startedAt + FUNCTION_SECONDS * 1000 - 15_000;
      waitUntil(
        runAgentPass(db, { deadline, force: body.force === true, now })
          .then((report) => console.log('Agent pass:', JSON.stringify({ ...report, fold: { opened: report.fold.opened.length, seen: report.fold.seen.length, reopened: report.fold.reopened.length, cleared: report.fold.cleared.length, unread: report.fold.unread } })))
          .catch((err) => console.error('Agent pass failed:', err))
      );
      return res.status(202).json({ accepted: true });
    }

    if (action === 'observe') {
      const { observations, error } = externalObservations(body);
      if (error) return res.status(400).json({ error });
      const fold = await foldObservations(db, [...new Set(observations.map((o) => o.source))].map((source) => ({ source, observations: observations.filter((o) => o.source === source) })), now);
      return res.status(200).json({ opened: fold.opened.length, seen: fold.seen.length, reopened: fold.reopened.length });
    }

    if (action === 'approve' || action === 'dismiss') {
      const id = typeof body.id === 'string' && ID.test(body.id) ? body.id : '';
      if (!id) return res.status(400).json({ error: 'Which issue?' });
      const issue = await readIssue(db, id);
      if (!issue) return res.status(404).json({ error: 'No such issue.' });
      const result = await decide(db, issue, action as Decision, by, now);
      if (result.ok && result.wakeWorker) runWorkerInBackground(startedAt);
      return res.status(result.ok ? 200 : 409).json({ ok: result.ok, note: result.note, issue: await readIssue(db, id) });
    }

    if (action === 'reopen') {
      const id = typeof body.id === 'string' && ID.test(body.id) ? body.id : '';
      if (!id) return res.status(400).json({ error: 'Which issue?' });
      await updateIssue(db, id, { status: 'open', proposal: null, proposed_at: null, muted_until: null, approval_token_hash: null, approval_expires_at: null });
      return res.status(200).json({ ok: true, issue: await readIssue(db, id) });
    }

    return res.status(400).json({ error: 'Unknown action.' });
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_READY') return res.status(503).json({ error: NOT_READY });
    console.error('Agent route failed:', err);
    return res.status(500).json({ error: 'The agent could not answer.' });
  }
}
