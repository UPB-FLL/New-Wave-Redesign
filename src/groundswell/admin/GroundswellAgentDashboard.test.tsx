import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const lib = vi.hoisted(() => ({ loadAgentDashboard: vi.fn(), trainAgentNow: vi.fn() }));
vi.mock('../../lib/groundswellAgent', async (orig) => ({ ...(await orig<typeof import('../../lib/groundswellAgent')>()), ...lib }));

import GroundswellAgentDashboard from './GroundswellAgentDashboard';
import type { AgentDashboard, AgentTrainingRun } from '../../lib/groundswellAgent';

const run = (over: Partial<AgentTrainingRun> = {}): AgentTrainingRun => ({
  id: 'r1',
  trigger: 'cron',
  status: 'done',
  window_start: '2026-10-27T04:17:00Z',
  window_end: '2026-10-28T04:17:00Z',
  started_at: '2026-10-28T04:17:00Z',
  finished_at: '2026-10-28T04:17:01Z',
  trained_on: {
    fixes: [{ issue_id: 'i1', title: 'Uncommon Path Brewing: the audit run failed at "GEO developer brief"', source: 'runs', kind: 'run_failed', resolver: 'requeue_step', how: 'approved', verified: 'worked', at: '2026-10-28T01:00:00Z' }],
    lessons: [{ id: 'l1', issue_id: 'i1', source: 'runs', kind: 'run_failed', resolver: 'requeue_step', result: 'worked', note: 'Run the failed step again: held.', created_at: '2026-10-28T04:17:00Z' }],
  },
  steps: [
    { step: 'check', label: 'Checked the fixes not yet checked', detail: '1 resolution checked by their own resolver: 1 held, 0 did not hold.', ms: 4 },
    { step: 'gather', label: 'Gathered the day’s fixes', detail: '1 fix and 1 lesson.', ms: 3 },
    { step: 'recount', label: 'Recounted every lesson', detail: '3 lessons in the agent’s memory.', ms: 1 },
    { step: 'playbook', label: 'Updated the playbook', detail: '1 kind of issue updated (1 change), 1 unchanged.', ms: 2 },
  ],
  changes: [{ source: 'runs', kind: 'run_failed', resolver: 'requeue_step', change: 'new_kind', note: 'First training on runs / run_failed: Run the failed step again.' }],
  counts: { fixes: 1, lessons: 1, held: 1, failed: 0, kinds: 2, changes: 1, checked: 1 },
  summary: 'Trained on 1 fix and 1 lesson (1 held, 0 did not hold); 1 change to the playbook.',
  error: null,
  ...over,
});

const view = (over: Partial<AgentDashboard> = {}): AgentDashboard => ({
  counts: { approvals: 2, developer: 1, watching: 3, resolved_30d: 4, held_30d: 3, failed_30d: 1, lessons_total: 9, learnings_7d: 5, days: Array.from({ length: 14 }, (_, n) => ({ date: `2026-10-${String(15 + n).padStart(2, '0')}`, held: n === 13 ? 1 : 0, failed: 0 })) },
  schedule: [
    { job: 'groundswell-agent-report', cron: '0 */4 * * *', label: 'Check, propose and report', when: 'Every 4 hours, on the hour (UTC)', last_at: '2026-10-28T04:00:00Z', last_status: 'sent' },
    { job: 'groundswell-agent-training', cron: '17 4 * * *', label: 'Train on the day’s fixes', when: 'Daily at 04:17 UTC (after the 04:00 pass)', last_at: '2026-10-28T04:17:00Z', last_status: 'done' },
  ],
  last_report: null,
  training_runs: [run(), run({ id: 'r0', status: 'failed', trigger: 'staff:josh@newwaveitfl.com', summary: 'Stopped after 3 steps.', error: 'The agent’s training is not set up in the database yet (migration 20261106120000).', changes: [], trained_on: {}, steps: [] })],
  playbook: [{ source: 'runs', kind: 'run_held', preferred: ['recheck_review'], ruled_out: ['release_review'], stats: { recheck_review: { worked: 2, failed: 0, last: '' }, release_review: { worked: 0, failed: 2, last: '' } }, trained_at: '2026-10-28T04:17:00Z', training_run_id: 'r1' }],
  resolvers: [
    { key: 'requeue_step', label: 'Run the failed step again' },
    { key: 'release_review', label: 'Deliver the held run as it was first read' },
    { key: 'recheck_review', label: 'Read the sources again and re-check the held run' },
  ],
  training_ready: true,
  ...over,
});

const show = () =>
  render(
    <MemoryRouter>
      <GroundswellAgentDashboard />
    </MemoryRouter>
  );

beforeEach(() => {
  Object.values(lib).forEach((fn) => fn.mockReset());
});

describe('the agent dashboard', () => {
  it('shows the counts, both jobs, the training log step by step, and the playbook', async () => {
    lib.loadAgentDashboard.mockResolvedValue(view());
    show();
    await screen.findByText('Training log');
    expect(within(screen.getByRole('region', { name: 'The agent at a glance' })).getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('Daily at 04:17 UTC (after the 04:00 pass)')).toBeInTheDocument();
    expect(screen.getByText('17 4 * * *')).toBeInTheDocument();

    const [done, failed] = screen.getAllByRole('listitem').filter((li) => li.getAttribute('data-role') === 'agent-training-run');
    expect(within(done).getByText('Scheduled (daily)')).toBeInTheDocument();
    expect(within(done).getByText(/Trained on 1 fix and 1 lesson/)).toBeInTheDocument();
    expect(within(done).getAllByText(/Checked the fixes not yet checked|Gathered the day’s fixes|Recounted every lesson|Updated the playbook/)).toHaveLength(4);
    expect(within(done).getByText(/First training on runs \/ run_failed/)).toBeInTheDocument();
    expect(within(done).getByText('What it trained on: 1 fix, 1 lesson')).toBeInTheDocument();
    expect(within(done).getByText(/approved and applied with Run the failed step again/)).toBeInTheDocument();
    expect(within(failed).getByText('Train now, by josh@newwaveitfl.com')).toBeInTheDocument();
    expect(within(failed).getByText(/not set up in the database yet/)).toBeInTheDocument();

    const playbook = screen.getByRole('region', { name: 'Playbook' });
    expect(within(playbook).getByText('Read the sources again and re-check the held run')).toBeInTheDocument();
    expect(within(playbook).getByText('Deliver the held run as it was first read')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Over the last 14 days, 1 resolutions held and 0 did not.' })).toBeInTheDocument();
  });

  it('trains now and re-reads; the button waits while a run is in progress or before the migration', async () => {
    lib.loadAgentDashboard.mockResolvedValue(view());
    lib.trainAgentNow.mockResolvedValue({ accepted: true, run_id: 'r2', window: { start: '2026-10-28T04:17:00Z', end: '2026-10-28T10:00:00Z' } });
    show();
    fireEvent.click(await screen.findByRole('button', { name: /Train now/ }));
    await waitFor(() => expect(lib.trainAgentNow).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('status')).toHaveTextContent('Training started');

    lib.loadAgentDashboard.mockResolvedValue(view({ training_runs: [run({ status: 'running' })] }));
    const { unmount } = show();
    await waitFor(() => expect(screen.getAllByRole('button', { name: /Train now/ })[1]).toBeDisabled());
    unmount();

    lib.loadAgentDashboard.mockResolvedValue(view({ training_ready: false, training_runs: [], playbook: [] }));
    show();
    expect(await screen.findByText(/apply migration 20261106120000/)).toBeInTheDocument();
    expect(screen.getByText('No training yet')).toBeInTheDocument();
  });
});
