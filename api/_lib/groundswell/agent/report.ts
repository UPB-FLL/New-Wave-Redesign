import { escapeHtml } from '../../http.js';
import { resolverByKey } from './resolvers.js';
import type { IssueRow, LearningRow, LessonSummary } from './types.js';

/**
 * The 4-hour report: what needs the owner's approval (with the change, its
 * rollback and an Approve or Dismiss link each), what needs a developer, what
 * was resolved since the last report and whether it held, and what is still
 * open. Links open a confirmation page; nothing changes until the button on
 * that page is pressed, so a mail client that opens links ahead of the
 * reader cannot approve anything.
 */

export const DEFAULT_AGENT_EMAIL = 'josh@newwaveitfl.com';
export const AGENT_FROM = 'GroundSwell agent <support@newwaveitfl.com>';
export const DEFAULT_BASE_URL = 'https://www.newwaveitfl.com';

export const agentEmailAddress = () => (process.env.GROUNDSWELL_AGENT_EMAIL || DEFAULT_AGENT_EMAIL).trim();
export const agentBaseUrl = () => (process.env.GROUNDSWELL_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
export const approvalUrl = (base: string, token: string, decision: 'approve' | 'dismiss') => `${base}/api/groundswell/agent?token=${encodeURIComponent(token)}&decision=${decision}`;

export interface ReportInput {
  now: Date;
  base: string;
  /** Issues waiting on the owner, each with the token its links carry. */
  approvals: { issue: IssueRow; token: string }[];
  developer: IssueRow[];
  /** Resolved since the last report (by the agent, or cleared on their own). */
  resolved: IssueRow[];
  /** Open with no proposal yet, or proposed "none". */
  watching: IssueRow[];
  lessons: LessonSummary[];
  /** Sources whose collector failed this pass. */
  unread: string[];
  /** What the research found this pass that the agent did not know. */
  learned?: LearningRow[];
  /** Topics not researched, and why. */
  researchSkipped?: Record<string, string>;
}

export interface Report {
  subject: string;
  html: string;
  text: string;
  summary: string;
}

const when = (iso: string | null | undefined) => (iso ? iso.slice(0, 16).replace('T', ' ') + ' UTC' : 'unknown');
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const SEVERITY_WORD = { error: 'Failure', warning: 'Warning', info: 'Note' } as const;
export const ADVISOR_WORD = { claude: 'Claude', openai: 'OpenAI', rule: 'the agent’s rule' } as const;

function describeChange(issue: IssueRow): { change: string; rollback: string } {
  const key = issue.proposal?.resolver;
  const r = resolverByKey(key);
  if (r) return r.describe(issue);
  if (key === 'none') return { change: 'Nothing yet: watch it and report again.', rollback: 'Nothing to undo.' };
  return { change: 'A developer looks at it; the brief is below.', rollback: 'Nothing to undo.' };
}

function issueText(issue: IssueRow): string[] {
  const p = issue.proposal;
  const lines = [
    `${SEVERITY_WORD[issue.severity]}: ${issue.title}`,
    `  Seen ${plural(issue.occurrences, 'time')} since ${when(issue.first_seen)}${issue.recurrences ? `, came back ${plural(issue.recurrences, 'time')}` : ''}.`,
    `  What happened: ${issue.detail}`,
  ];
  if (p) {
    lines.push(`  In plain words: ${p.summary}`, `  Likely cause: ${p.cause}`);
    const d = describeChange(issue);
    lines.push(`  Proposed: ${d.change}`, `  If it does not help: ${d.rollback}`, `  Why: ${p.rationale} (confidence ${p.confidence}, advised by ${ADVISOR_WORD[p.by]})`);
    if (p.brief) lines.push(`  Developer brief: ${p.brief}`);
  }
  return lines;
}

function issueHtml(issue: IssueRow, links?: { approve: string; dismiss: string }): string {
  const p = issue.proposal;
  const d = p ? describeChange(issue) : null;
  const colour = issue.severity === 'error' ? '#B42318' : issue.severity === 'warning' ? '#B54708' : '#526271';
  return `<div style="border:1px solid #D9E2EA;border-radius:10px;padding:16px 18px;margin:0 0 14px">
<p style="margin:0 0 6px;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:${colour}">${SEVERITY_WORD[issue.severity]} · ${escapeHtml(issue.source)}</p>
<p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#09131D">${escapeHtml(issue.title)}</p>
<p style="margin:0 0 8px;font-size:13px;color:#526271">Seen ${plural(issue.occurrences, 'time')} since ${when(issue.first_seen)}${issue.recurrences ? `, came back ${plural(issue.recurrences, 'time')}` : ''}.</p>
<p style="margin:0 0 8px;font-size:14px"><strong>What happened:</strong> ${escapeHtml(issue.detail)}</p>
${p ? `<p style="margin:0 0 8px;font-size:14px"><strong>In plain words:</strong> ${escapeHtml(p.summary)}</p>
<p style="margin:0 0 8px;font-size:14px"><strong>Likely cause:</strong> ${escapeHtml(p.cause)}</p>
<p style="margin:0 0 8px;font-size:14px"><strong>Proposed:</strong> ${escapeHtml(d!.change)}</p>
<p style="margin:0 0 8px;font-size:14px"><strong>If it does not help:</strong> ${escapeHtml(d!.rollback)}</p>
<p style="margin:0 0 8px;font-size:13px;color:#526271"><strong>Why:</strong> ${escapeHtml(p.rationale)} <em>(confidence ${p.confidence}, advised by ${ADVISOR_WORD[p.by]})</em></p>
${p.brief ? `<p style="margin:0 0 8px;font-size:13px;white-space:pre-wrap;background:#F4F7FA;padding:10px;border-radius:6px"><strong>Developer brief</strong><br>${escapeHtml(p.brief)}</p>` : ''}` : ''}
${links ? `<p style="margin:14px 0 0"><a href="${escapeHtml(links.approve)}" style="background:#F2A33A;color:#09131D;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;margin-right:10px">Approve</a> <a href="${escapeHtml(links.dismiss)}" style="color:#526271;padding:10px 12px;text-decoration:underline">Dismiss for a week</a></p>` : ''}
</div>`;
}

function section(title: string, body: string): string {
  return `<h2 style="font-family:Plus Jakarta Sans,Arial,sans-serif;font-size:18px;border-bottom:2px solid #31C6CF;padding-bottom:8px;margin:28px 0 14px">${escapeHtml(title)}</h2>${body}`;
}

export function buildReport(input: ReportInput): Report {
  const { approvals, developer, resolved, watching, unread } = input;
  const learned = input.learned ?? [];
  const researchSkipped = input.researchSkipped ?? {};
  const date = input.now.toISOString().slice(0, 16).replace('T', ' ');
  const open = approvals.length + developer.length + watching.length;
  const subjectParts = [
    approvals.length ? `${plural(approvals.length, 'resolution')} waiting on you` : null,
    developer.length ? `${plural(developer.length, 'developer brief')}` : null,
    resolved.length ? `${resolved.length} resolved` : null,
    learned.length ? `${plural(learned.length, 'new learning')}` : null,
  ].filter(Boolean);
  const subject = `GroundSwell agent: ${subjectParts.length ? subjectParts.join(', ') : open ? `${plural(open, 'issue')} open` : 'all clear'} (${date} UTC)`;
  const summary = subjectParts.length ? subjectParts.join('; ') : open ? `${plural(open, 'issue')} open, nothing to approve.` : 'All clear.';

  const text: string[] = [`GroundSwell agent report, ${date} UTC`, ''];
  const html: string[] = [];

  if (approvals.length) {
    text.push(`NEEDS YOUR APPROVAL (${approvals.length})`, '');
    html.push(
      section(
        `Needs your approval (${approvals.length})`,
        `<p style="font-size:13px;color:#526271;margin:0 0 12px">Each link opens a page that shows the change again; nothing happens until you press the button there. Links work for 7 days.</p>` +
          approvals.map(({ issue, token }) => issueHtml(issue, { approve: approvalUrl(input.base, token, 'approve'), dismiss: approvalUrl(input.base, token, 'dismiss') })).join('')
      )
    );
    for (const { issue, token } of approvals) text.push(...issueText(issue), `  Approve: ${approvalUrl(input.base, token, 'approve')}`, `  Dismiss for a week: ${approvalUrl(input.base, token, 'dismiss')}`, '');
  }
  if (developer.length) {
    text.push(`NEEDS A DEVELOPER (${developer.length})`, '');
    html.push(section(`Needs a developer (${developer.length})`, developer.map((i) => issueHtml(i)).join('')));
    for (const issue of developer) text.push(...issueText(issue), '');
  }
  if (resolved.length) {
    const line = (i: IssueRow) => {
      const o = i.outcome;
      const held = o?.verified === 'worked' ? 'held' : o?.verified === 'failed' ? 'did not hold' : 'not checked yet';
      return `${i.title}: ${o?.note ?? 'resolved'} (${held})`;
    };
    text.push(`RESOLVED SINCE THE LAST REPORT (${resolved.length})`, ...resolved.map((i) => `- ${line(i)}`), '');
    html.push(section(`Resolved since the last report (${resolved.length})`, `<ul style="padding-left:18px;font-size:14px">${resolved.map((i) => `<li style="margin:0 0 6px">${escapeHtml(line(i))}</li>`).join('')}</ul>`));
  }
  if (watching.length) {
    text.push(`WATCHING (${watching.length})`, ...watching.map((i) => `- ${i.title} (seen ${plural(i.occurrences, 'time')})`), '');
    html.push(section(`Watching (${watching.length})`, `<ul style="padding-left:18px;font-size:14px">${watching.map((i) => `<li style="margin:0 0 6px">${escapeHtml(i.title)} <span style="color:#526271">(seen ${plural(i.occurrences, 'time')})</span></li>`).join('')}</ul>`));
  }
  if (learned.length) {
    const byTopic = new Map<string, LearningRow[]>();
    for (const l of learned) byTopic.set(l.topic, [...(byTopic.get(l.topic) ?? []), l]);
    text.push(`WHAT THE AGENT LEARNED (${learned.length})`, '');
    const blocks: string[] = [];
    for (const [topic, rows] of byTopic) {
      text.push(topic.replace(/-/g, ' ').toUpperCase());
      for (const l of rows) {
        text.push(`- ${l.title}${l.published_at ? ` (${l.published_at})` : ''}`, `  ${l.summary}`, l.why_it_matters ? `  Why it matters: ${l.why_it_matters}` : '', l.action ? `  What to do: ${l.action}` : '', `  Source: ${l.url}`);
      }
      text.push('');
      blocks.push(`<h3 style="font-size:14px;letter-spacing:.04em;text-transform:uppercase;color:#526271;margin:16px 0 8px">${escapeHtml(topic.replace(/-/g, ' '))}</h3>` + rows.map((l) => `<div style="border-left:3px solid #31C6CF;padding:4px 0 4px 14px;margin:0 0 12px">
<p style="margin:0 0 4px;font-size:15px;font-weight:600">${escapeHtml(l.title)}${l.published_at ? ` <span style="font-weight:400;color:#526271;font-size:12px">${escapeHtml(l.published_at)}</span>` : ''}</p>
<p style="margin:0 0 4px;font-size:14px">${escapeHtml(l.summary)}</p>
${l.why_it_matters ? `<p style="margin:0 0 4px;font-size:14px"><strong>Why it matters:</strong> ${escapeHtml(l.why_it_matters)}</p>` : ''}
${l.action ? `<p style="margin:0 0 4px;font-size:14px"><strong>What to do:</strong> ${escapeHtml(l.action)}</p>` : ''}
<p style="margin:0;font-size:12px"><a href="${escapeHtml(l.url)}" style="color:#0B6E73">${escapeHtml(l.source || l.url)}</a> · confidence ${l.confidence}</p>
</div>`).join(''));
    }
    html.push(section(`What the agent learned (${learned.length})`, `<p style="font-size:13px;color:#526271;margin:0 0 12px">New since the last pass, from Claude's web search; each has the page it was read on. The agent keeps every learning and reports each one once.</p>` + blocks.join('')));
  }
  const skippedTopics = Object.entries(researchSkipped);
  if (skippedTopics.length) {
    text.push(`RESEARCH NOT DONE: ${skippedTopics.map(([k, v]) => `${k}: ${v}`).join('; ')}`, '');
    html.push(section('Research not done', `<p style="font-size:14px">${skippedTopics.map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(v)}`).join('<br>')}</p>`));
  }
  if (unread.length) {
    text.push(`NOT READ THIS PASS: ${unread.join(', ')}`, '');
    html.push(section('Not read this pass', `<p style="font-size:14px">These sources could not be read, so their issues were left as they were: ${escapeHtml(unread.join(', '))}.</p>`));
  }
  if (!html.length) {
    text.push('All clear: nothing open, nothing resolved, every source read.');
    html.push(`<p style="font-size:15px">All clear: nothing open, nothing resolved, every source read.</p>`);
  }
  const lessonLine = input.lessons.length ? `The agent has ${plural(input.lessons.reduce((n, l) => n + l.worked + l.failed, 0), 'lesson')} from earlier resolutions; ${input.lessons.filter((l) => l.worked > l.failed).length} resolution${input.lessons.filter((l) => l.worked > l.failed).length === 1 ? '' : 's'} have held more often than not.` : 'No lessons yet: this is the agent’s first record of what works.';
  text.push(lessonLine, '', `Staff screen: ${input.base}/groundswell/admin/agent`);

  const page = `<div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#09131D">
<p style="margin:0 0 4px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#526271">GroundSwell agent</p>
<h1 style="font-family:Plus Jakarta Sans,Arial,sans-serif;font-size:22px;margin:0 0 6px">${escapeHtml(summary)}</h1>
<p style="margin:0 0 20px;font-size:13px;color:#526271">${escapeHtml(date)} UTC · every 4 hours while there is something to say</p>
${html.join('')}
<p style="margin:28px 0 0;font-size:13px;color:#526271">${escapeHtml(lessonLine)}</p>
<p style="font-size:13px;color:#526271"><a href="${escapeHtml(input.base)}/groundswell/admin/agent" style="color:#0B6E73">Open the staff screen</a> · GroundSwell · by New Wave</p>
</div>`;
  return { subject, html: page, text: text.join('\n'), summary };
}

/** The confirmation page an email link opens, and the page after a decision. */
export function decisionPage(opts: { title: string; body: string; issue?: IssueRow | null; action?: { url: string; label: string; decision: 'approve' | 'dismiss' } | null; base: string }): string {
  const d = opts.issue?.proposal ? describeChange(opts.issue) : null;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(opts.title)} · GroundSwell agent</title>
<style>body{font-family:Inter,Arial,sans-serif;background:#F4F7FA;color:#09131D;margin:0;padding:24px}main{max-width:560px;margin:0 auto;background:#fff;border:1px solid #D9E2EA;border-radius:12px;padding:24px}h1{font-family:Plus Jakarta Sans,Arial,sans-serif;font-size:20px;margin:0 0 12px}p{font-size:15px;line-height:1.55}.muted{color:#526271;font-size:13px}button{background:#F2A33A;color:#09131D;border:0;border-radius:8px;padding:12px 20px;font-size:15px;font-weight:600;cursor:pointer}.quiet{background:#E8EEF3}</style></head>
<body><main><p class="muted">GroundSwell agent</p><h1>${escapeHtml(opts.title)}</h1><p>${opts.body}</p>
${opts.issue ? `<p><strong>${escapeHtml(opts.issue.title)}</strong></p><p class="muted">${escapeHtml(opts.issue.detail)}</p>${d ? `<p><strong>What will change:</strong> ${escapeHtml(d.change)}</p><p><strong>If it does not help:</strong> ${escapeHtml(d.rollback)}</p>` : ''}` : ''}
${opts.action ? `<form method="post" action="${escapeHtml(opts.action.url)}"><button type="submit" class="${opts.action.decision === 'dismiss' ? 'quiet' : ''}">${escapeHtml(opts.action.label)}</button></form>` : ''}
<p class="muted"><a href="${escapeHtml(opts.base)}/groundswell/admin/agent">Open the staff screen</a></p></main></body></html>`;
}
