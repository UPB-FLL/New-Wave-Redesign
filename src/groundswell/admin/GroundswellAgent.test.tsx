import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const lib = vi.hoisted(() => ({ loadAgent: vi.fn(), runAgentNow: vi.fn(), decideIssue: vi.fn() }));
vi.mock('../../lib/groundswellAgent', async (orig) => ({ ...(await orig<typeof import('../../lib/groundswellAgent')>()), ...lib }));

import GroundswellAgent from './GroundswellAgent';
import type { AgentIssue, AgentView } from '../../lib/groundswellAgent';

const issue = (over: Partial<AgentIssue> = {}): AgentIssue => ({
  id: 'i1',
  fingerprint: 'runs:run_failed:a',
  source: 'runs',
  kind: 'run_failed',
  severity: 'error',
  title: 'Uncommon Path Brewing: the audit run failed at "GEO developer brief"',
  detail: 'Could not store the brief.',
  subject: { audit_id: 'a', step: 'deliver_geo' },
  evidence: {},
  status: 'proposed',
  first_seen: '2026-10-27T04:00:00Z',
  last_seen: '2026-10-27T04:00:00Z',
  occurrences: 2,
  recurrences: 0,
  proposal: { resolver: 'requeue_step', summary: 'The developer file was not saved.', cause: 'A file type the storage refused.', rationale: 'The storage rule was fixed.', confidence: 'medium', by: 'rule' },
  proposed_at: '2026-10-27T04:00:00Z',
  decided_by: null,
  decided_at: null,
  resolved_at: null,
  outcome: null,
  reported_at: null,
  muted_until: null,
  ...over,
});

const view = (issues: AgentIssue[]): AgentView => ({
  issues,
  lessons: [{ source: 'runs', kind: 'run_failed', resolver: 'requeue_step', worked: 2, failed: 0, last: 'Run the failed step again: held.' }],
  last_report: { id: 'r1', sent_at: '2026-10-27T04:00:00Z', to_email: 'josh@newwaveitfl.com', issue_ids: ['i1'], subject: 'GroundSwell agent: 1 resolution waiting on you', summary: '', status: 'sent' },
  consultations: [{ id: 'c1', advisor: 'claude', model: 'claude-opus-5-5', created_at: '2026-10-27T04:00:00Z', issues: 3, kept: 2, rejected: ['Named "x", which is not an allowed resolver for this issue (allowed: requeue_step, needs_developer, none).'], outcomes: { i3: { resolver: 'requeue_step', result: 'worked', note: 'held', at: '2026-10-27T08:00:00Z' } }, usage: { input_tokens: 1200, output_tokens: 300, cache_read_input_tokens: 900 }, latency_ms: 2100, error: null }],
  resolvers: [{ key: 'requeue_step', label: 'Run the failed step again' }],
  config: { email: 'josh@newwaveitfl.com', email_ready: true, advisor: 'claude', model: 'claude-opus-5-5', claude_ready: true, model_ready: false, live_checks: true, base: 'https://www.newwaveitfl.com' },
});

beforeEach(() => {
  Object.values(lib).forEach((fn) => fn.mockReset());
});

describe('the agent screen', () => {
  it('shows the issues by what they need, the proposal with its confidence, and approves from the card', async () => {
    lib.loadAgent.mockResolvedValue(view([issue(), issue({ id: 'i2', status: 'needs_developer', kind: 'step_skipped', title: '"Instagram" was skipped on 3 delivered runs', proposal: { resolver: 'needs_developer', summary: 's', cause: 'c', rationale: 'r', confidence: 'low', brief: 'Look at the ScrapeCreators balance.', by: 'rule' } }), issue({ id: 'i3', status: 'resolved', outcome: { ok: true, note: 'Step queued again.', verified: 'worked' } })]));
    lib.decideIssue.mockResolvedValue({ ok: true, note: 'Step "deliver_geo" queued again; the run is running.', issue: issue({ status: 'resolved' }) });
    render(
      <MemoryRouter>
        <GroundswellAgent />
      </MemoryRouter>
    );
    await screen.findByText('Waiting for approval (1)');
    expect(screen.getByText('Needs a developer (1)')).toBeInTheDocument();
    expect(screen.getByText('Resolved (1)')).toBeInTheDocument();
    expect(screen.getByText('Look at the ScrapeCreators balance.')).toBeInTheDocument();
    expect(screen.getAllByText(/confidence medium, advised by the agent’s rule/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Advisor: Claude \(claude-opus-5-5\)/)).toBeInTheDocument();
    expect(screen.getByText(/asked about 3 issues, kept 2, rejected 1/)).toBeInTheDocument();
    expect(screen.getByText(/outcomes: 1 held, 0 did not/)).toBeInTheDocument();
    expect(screen.getByText(/held 2, did not hold 0/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Approve' })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(lib.decideIssue).toHaveBeenCalledWith('i1', 'approve'));
    expect(await screen.findByRole('status')).toHaveTextContent('queued again');
    expect(lib.loadAgent).toHaveBeenCalledTimes(2);
  });

  it('runs a pass now and says the screen re-reads', async () => {
    lib.loadAgent.mockResolvedValue(view([]));
    lib.runAgentNow.mockResolvedValue({ accepted: true });
    render(
      <MemoryRouter>
        <GroundswellAgent />
      </MemoryRouter>
    );
    await screen.findByText('Nothing open');
    fireEvent.click(screen.getByRole('button', { name: /Run and email the report/ }));
    await waitFor(() => expect(lib.runAgentNow).toHaveBeenCalledWith(true));
    expect(await screen.findByRole('status')).toHaveTextContent('the report is emailed when it finishes');
  });

  it('shows the route’s error', async () => {
    lib.loadAgent.mockRejectedValue(new Error('The agent is not set up in the database yet (migration 20261104120000).'));
    render(
      <MemoryRouter>
        <GroundswellAgent />
      </MemoryRouter>
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('migration 20261104120000');
  });
});
