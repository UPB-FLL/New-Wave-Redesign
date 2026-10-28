import { verifyResolutions } from './agent.js';
import { RULED_OUT_AFTER, playbookScore } from './propose.js';
import { resolverByKey } from './resolvers.js';
import { missingTable, readIssues, readLessons, readPlaybook, summarizeLessons } from './store.js';
import type { Db, LessonSummary, PlaybookRow, TrainedFix, TrainingChange, TrainingRunRow, TrainingStep } from './types.js';

/**
 * The agent's daily training (pg_cron `groundswell-agent-training`, migration
 * 20261106120000, or "Train now" on the dashboard). It trains on the day's
 * fixes, and logs what it trained on and how, one row per run in
 * groundswell_agent_training_runs:
 *
 *   1. check   every resolution applied and not yet checked: did it hold?
 *              (verifyResolutions, the same check the 4-hour pass makes; a
 *              lesson either way)
 *   2. gather  the fixes since the last training: resolutions approved and
 *              applied, issues cleared on their own, issues dismissed, and
 *              every lesson recorded in the window (each one listed in the log)
 *   3. recount every lesson the agent holds, per kind of issue and resolution
 *   4. playbook per kind of issue: how each resolution has held, the order the
 *              agent offers them in ((held + 1) / (tries + 2), best first), and
 *              the ones ruled out; every change against the last playbook is
 *              logged, and the rows that changed are written
 *
 * The 4-hour pass reads the playbook when it proposes (propose.ts). Nothing
 * here applies a resolution or calls a model: the training is the agent's
 * own record of what held, counted and ordered.
 */

export const PASS_JOB = { job: 'groundswell-agent-report', cron: '0 */4 * * *', label: 'Check, propose and report', when: 'Every 4 hours, on the hour (UTC)' } as const;
export const TRAINING_JOB = { job: 'groundswell-agent-training', cron: '17 4 * * *', label: 'Train on the day’s fixes', when: 'Daily at 04:17 UTC (after the 04:00 pass)' } as const;

/** With no earlier training, the first window is the last day. */
export const FIRST_WINDOW_MS = 24 * 60 * 60_000;
/** A window never reaches back further than this, however long training was off. */
export const MAX_WINDOW_MS = 7 * 24 * 60 * 60_000;
/** A run still marked running after this long is taken to have died; a new one may start. */
export const RUNNING_LEASE_MS = 15 * 60_000;
export const TRAINING_NOT_READY = 'The agent’s training is not set up in the database yet (migration 20261106120000).';
export const TRAINING_COLUMNS = 'id,trigger,status,window_start,window_end,started_at,finished_at,trained_on,steps,changes,counts,summary,error';

const label = (key: string) => resolverByKey(key)?.label ?? key;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export async function readTrainingRuns(db: Db, limit = 30): Promise<TrainingRunRow[]> {
  const result = await db.from('groundswell_agent_training_runs').select(TRAINING_COLUMNS).order('started_at', { ascending: false }).limit(limit);
  if (result.error) {
    if (missingTable(result.error.message)) return [];
    throw new Error(result.error.message);
  }
  return ((result.data ?? []) as TrainingRunRow[]).sort((a, b) => (b.started_at > a.started_at ? 1 : -1));
}

/** Whether migration 20261106120000 is applied (the log table answers). */
export async function isTrainingReady(db: Db): Promise<boolean> {
  const { error } = await db.from('groundswell_agent_training_runs').select('id').limit(1);
  return !error;
}

/** The window a new run trains on: from where the last finished run stopped, at most a week back. */
export function trainingWindow(runs: readonly TrainingRunRow[], now: Date): { start: string; end: string } {
  const lastDone = runs.find((r) => r.status === 'done');
  const floor = now.getTime() - MAX_WINDOW_MS;
  const from = lastDone ? Date.parse(lastDone.window_end) : now.getTime() - FIRST_WINDOW_MS;
  return { start: new Date(Math.max(from, floor)).toISOString(), end: now.toISOString() };
}

type PlaybookDraft = Omit<PlaybookRow, 'trained_at' | 'training_run_id'>;

/** The playbook the lessons give: per kind, the resolutions tried, best first, and the ones ruled out. */
export function buildPlaybook(summaries: readonly LessonSummary[]): PlaybookDraft[] {
  const byKind = new Map<string, PlaybookDraft>();
  for (const s of summaries) {
    const key = `${s.source}|${s.kind}`;
    const row = byKind.get(key) ?? { source: s.source, kind: s.kind, preferred: [], ruled_out: [], stats: {} };
    row.stats[s.resolver] = { worked: s.worked, failed: s.failed, last: s.last.slice(0, 300) };
    byKind.set(key, row);
  }
  for (const row of byKind.values()) {
    const keys = Object.keys(row.stats).sort();
    row.ruled_out = keys.filter((k) => row.stats[k].worked === 0 && row.stats[k].failed >= RULED_OUT_AFTER);
    row.preferred = keys.filter((k) => !row.ruled_out.includes(k)).sort((a, b) => playbookScore(row as PlaybookRow, b) - playbookScore(row as PlaybookRow, a) || row.stats[b].worked - row.stats[a].worked);
  }
  return [...byKind.values()].sort((a, b) => `${a.source}|${a.kind}`.localeCompare(`${b.source}|${b.kind}`));
}

/** Every change the new playbook makes against the old one, in words. */
export function diffPlaybook(previous: readonly PlaybookRow[], next: readonly PlaybookDraft[]): TrainingChange[] {
  const out: TrainingChange[] = [];
  for (const row of next) {
    const old = previous.find((p) => p.source === row.source && p.kind === row.kind);
    const base = { source: row.source, kind: row.kind };
    if (!old) {
      out.push({ ...base, resolver: row.preferred[0] ?? null, change: 'new_kind', before: null, after: null, note: `First training on ${row.source} / ${row.kind}: ${row.preferred.length ? row.preferred.map(label).join(', then ') : 'every resolution tried is ruled out'}${row.ruled_out.length ? `; ruled out: ${row.ruled_out.map(label).join(', ')}` : ''}.` });
      continue;
    }
    if (row.preferred[0] && row.preferred[0] !== old.preferred[0]) {
      const s = row.stats[row.preferred[0]];
      out.push({ ...base, resolver: row.preferred[0], change: 'first_choice', before: null, after: { worked: s.worked, failed: s.failed }, note: `${label(row.preferred[0])} is now the first choice (held ${s.worked} of ${s.worked + s.failed})${old.preferred[0] ? `, ahead of ${label(old.preferred[0])}` : ''}.` });
    }
    for (const key of Object.keys(row.stats).sort()) {
      const after = row.stats[key];
      const prior = old.stats[key];
      const before = prior ? { worked: prior.worked, failed: prior.failed } : null;
      const now = { worked: after.worked, failed: after.failed };
      if (row.ruled_out.includes(key) && !old.ruled_out.includes(key)) {
        out.push({ ...base, resolver: key, change: 'ruled_out', before, after: now, note: `${label(key)} is ruled out: it failed ${plural(after.failed, 'time')} and never held.` });
      } else if (!row.ruled_out.includes(key) && old.ruled_out.includes(key)) {
        out.push({ ...base, resolver: key, change: 'restored', before, after: now, note: `${label(key)} is back in: it has now held ${plural(after.worked, 'time')}.` });
      } else if (!prior || prior.worked !== after.worked || prior.failed !== after.failed) {
        out.push({ ...base, resolver: key, change: 'counts', before, after: now, note: `${label(key)}: held ${prior?.worked ?? 0} → ${after.worked}, did not hold ${prior?.failed ?? 0} → ${after.failed}.` });
      }
    }
  }
  return out;
}

export interface TrainingOptions {
  now?: Date;
  /** 'cron', or 'staff:<email>'. */
  trigger?: string;
}

export type StartResult = { run: TrainingRunRow; started: true } | { run: TrainingRunRow; started: false; reason: string };

/** Opens the run's log row (so the route can answer at once); `finishTraining` does the work. */
export async function startTraining(db: Db, opts: TrainingOptions = {}): Promise<StartResult> {
  const now = opts.now ?? new Date();
  const probe = await db.from('groundswell_agent_training_runs').select(TRAINING_COLUMNS).order('started_at', { ascending: false }).limit(10);
  if (probe.error) throw new Error(missingTable(probe.error.message) ? 'NOT_READY' : probe.error.message);
  const runs = ((probe.data ?? []) as TrainingRunRow[]).sort((a, b) => (b.started_at > a.started_at ? 1 : -1));
  const running = runs.find((r) => r.status === 'running' && now.getTime() - Date.parse(r.started_at) < RUNNING_LEASE_MS);
  if (running) return { run: running, started: false, reason: `A training run started at ${running.started_at} is still running.` };
  const window = trainingWindow(runs, now);
  const { data, error } = await db
    .from('groundswell_agent_training_runs')
    .insert({ trigger: (opts.trigger ?? 'cron').slice(0, 120), status: 'running', window_start: window.start, window_end: window.end, started_at: now.toISOString(), trained_on: {}, steps: [], changes: [], counts: {}, summary: '' })
    .select(TRAINING_COLUMNS)
    .single();
  if (error) throw new Error(missingTable(error.message) ? 'NOT_READY' : error.message);
  return { run: data as TrainingRunRow, started: true };
}

/** The training itself, logged step by step onto the run's row. */
export async function finishTraining(db: Db, run: TrainingRunRow, opts: TrainingOptions = {}): Promise<TrainingRunRow> {
  const now = opts.now ?? new Date();
  const steps: TrainingStep[] = [];
  const step = async <T>(name: TrainingStep['step'], title: string, work: () => Promise<{ value: T; detail: string }>): Promise<T> => {
    const started = Date.now();
    const { value, detail } = await work();
    steps.push({ step: name, label: title, detail, ms: Date.now() - started });
    return value;
  };
  const save = async (patch: Partial<TrainingRunRow>) => {
    const { error } = await db.from('groundswell_agent_training_runs').update(patch).eq('id', run.id);
    if (error) throw new Error(error.message);
    return { ...run, ...patch } as TrainingRunRow;
  };
  const inWindow = (iso: string | null | undefined) => Boolean(iso && iso > run.window_start && iso <= run.window_end);

  try {
    const checked = await step('check', 'Checked the fixes not yet checked', async () => {
      const v = await verifyResolutions(db, now);
      const n = v.worked.length + v.failed.length;
      return { value: v, detail: n ? `${plural(n, 'resolution')} checked by their own resolver: ${v.worked.length} held, ${v.failed.length} did not hold. Each became a lesson.` : 'No applied resolution was waiting to be checked.' };
    });

    const { fixes, lessons, all } = await step('gather', 'Gathered the day’s fixes', async () => {
      const [issues, held] = await Promise.all([readIssues(db), readLessons(db, 2000)]);
      const fixes: TrainedFix[] = [];
      for (const i of issues) {
        if (i.status === 'resolved' && inWindow(i.resolved_at)) {
          fixes.push({ issue_id: i.id, title: i.title, source: i.source, kind: i.kind, resolver: i.decided_by ? i.proposal?.resolver ?? null : null, how: i.decided_by ? 'approved' : 'cleared', verified: i.outcome?.verified ?? null, at: i.resolved_at! });
        } else if (i.status === 'dismissed' && inWindow(i.decided_at)) {
          fixes.push({ issue_id: i.id, title: i.title, source: i.source, kind: i.kind, resolver: null, how: 'dismissed', verified: null, at: i.decided_at! });
        }
      }
      fixes.sort((a, b) => (a.at < b.at ? 1 : -1));
      const lessons = held.filter((l) => inWindow(l.created_at)).map((l) => ({ id: l.id, issue_id: l.issue_id, source: l.source, kind: l.kind, resolver: l.resolver, result: l.result, note: l.note.slice(0, 300), created_at: l.created_at }));
      const by = (how: TrainedFix['how']) => fixes.filter((f) => f.how === how).length;
      const worked = lessons.filter((l) => l.result === 'worked').length;
      return {
        value: { fixes, lessons, all: held },
        detail: `${plural(fixes.length, 'fix', 'fixes')} (${by('approved')} approved and applied, ${by('cleared')} cleared on their own, ${by('dismissed')} dismissed) and ${plural(lessons.length, 'lesson')} (${worked} held, ${lessons.length - worked} did not hold).`,
      };
    });

    const summaries = await step('recount', 'Recounted every lesson', async () => {
      const s = summarizeLessons(all);
      const kinds = new Set(s.map((x) => `${x.source}|${x.kind}`)).size;
      return { value: s, detail: `${plural(all.length, 'lesson')} in the agent’s memory, across ${plural(kinds, 'kind')} of issue and ${plural(s.length, 'resolution')} tried on them.` };
    });

    const { changes, kinds } = await step('playbook', 'Updated the playbook', async () => {
      const [previous, next] = [await readPlaybook(db), buildPlaybook(summaries)];
      const changes = diffPlaybook(previous, next);
      const touched = next.filter((row) => changes.some((c) => c.source === row.source && c.kind === row.kind));
      for (const row of touched) {
        const { error } = await db.from('groundswell_agent_playbook').upsert({ ...row, trained_at: now.toISOString(), training_run_id: run.id }, { onConflict: 'source,kind' });
        if (error) throw new Error(missingTable(error.message) ? TRAINING_NOT_READY : error.message);
      }
      return { value: { changes, kinds: next.length }, detail: touched.length ? `${plural(touched.length, 'kind')} of issue updated (${plural(changes.length, 'change')}), ${next.length - touched.length} unchanged. The 4-hour pass offers resolutions in this order from now on.` : `No change: the ${plural(next.length, 'kind')} of issue in the playbook stand as they were.` };
    });

    const held = lessons.filter((l) => l.result === 'worked').length;
    const summary =
      fixes.length || lessons.length
        ? `Trained on ${plural(fixes.length, 'fix', 'fixes')} and ${plural(lessons.length, 'lesson')} (${held} held, ${lessons.length - held} did not hold); ${changes.length ? plural(changes.length, 'change') + ' to the playbook' : 'the playbook is unchanged'}.`
        : `No new fixes since the last training; ${changes.length ? plural(changes.length, 'change') + ' to the playbook from earlier lessons' : 'the playbook is unchanged'}.`;
    return await save({
      status: 'done',
      finished_at: new Date().toISOString(),
      trained_on: { fixes: fixes.slice(0, 200), lessons: lessons.slice(0, 200) },
      steps,
      changes,
      counts: { fixes: fixes.length, lessons: lessons.length, held, failed: lessons.length - held, kinds, changes: changes.length, checked: checked.worked.length + checked.failed.length },
      summary,
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Agent training failed:', message);
    return save({ status: 'failed', finished_at: new Date().toISOString(), steps, summary: `Stopped after ${plural(steps.length, 'step')}.`, error: message.slice(0, 1000) });
  }
}

/** Start and finish in one go (tests, and any caller that can wait). */
export async function runTraining(db: Db, opts: TrainingOptions = {}): Promise<StartResult> {
  const start = await startTraining(db, opts);
  if (!start.started) return start;
  return { run: await finishTraining(db, start.run, opts), started: true };
}
