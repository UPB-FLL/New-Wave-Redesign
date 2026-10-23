import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StepContext } from '../../../api/_lib/groundswell/types';

const mocks = vi.hoisted(() => ({ update: vi.fn(), next: vi.fn(), db: { from: vi.fn() } }));
vi.mock('../../../api/_lib/supabaseAdmin', () => ({ getSupabaseAdmin: () => mocks.db }));
vi.mock('../../../api/_lib/groundswell/phases', () => ({ queueNextPhase: mocks.next }));
import { runDeliverFinish } from '../../../api/_lib/groundswell/delivery';

const context = (outputs: Record<string, unknown> = {}, source: string | null = 'growth-audit'): StepContext => ({
  audit: { id: 'plan', phase: 'competitors', source_audit_id: source, business_name: 'WildlyPrimal', city: 'Jacksonville FL', website: 'https://wildlyprimal.com', instagram: 'wildlyprimal', competitors: [], notes: null },
  outputs, inherited: {}, steps: ['benchmark', 'adsets', 'deliver_finish'], deadline: Date.now() + 60_000, attempt: 1,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.db.from.mockReturnValue({ update: mocks.update });
  mocks.update.mockReturnValue({ eq: async () => ({ error: null }) });
  mocks.next.mockResolvedValue({ queued: null, phase: 'integrated', reason: 'No client account linked.' });
});

describe('competitor phase without deliverable reports', () => {
  it('holds an orphaned phase with a recovery action instead of failing at finish', async () => {
    const result = await runDeliverFinish(context({ creative: { images: [{ path: 'image.jpg' }] } }, null));
    expect(result).toMatchObject({ hold: expect.stringMatching(/growth audit.*missing/i), reports: [], exports: [] });
    expect(result.hold).toMatch(/run again/i);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.next).not.toHaveBeenCalled();
  });

  it('names missing competitor and plan inputs without claiming zero demand', async () => {
    const result = await runDeliverFinish(context());
    expect(result).toMatchObject({ hold: expect.stringMatching(/competitor/i), reports: [], exports: [] });
    expect(result.hold).toMatch(/verified ad plan/i);
    expect(result.hold).not.toMatch(/no (?:keyword )?demand|zero demand/i);
    expect(mocks.next).not.toHaveBeenCalled();
  });

  it('still completes a real benchmark report when ad sets could not be built', async () => {
    const ctx = context({ deliver_benchmark: { kind: 'benchmark', name: 'Benchmark.pdf', pages: 8, bytes: 1234 } });
    ctx.audit.competitors = [{ name: 'Coastal Health', website: 'https://coastal.example', instagram: null }];
    const result = await runDeliverFinish(ctx);
    expect(result.reports).toEqual([{ kind: 'benchmark', name: 'Benchmark.pdf', pages: 8, bytes: 1234 }]);
    expect(result).not.toHaveProperty('hold');
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'done', error: null }));
    expect(mocks.next).toHaveBeenCalledOnce();
  });

  it('does not count a report inherited from another run as a delivered file', async () => {
    const ctx = context({ deliver_benchmark: { kind: 'benchmark', name: 'Old benchmark.pdf', pages: 8, bytes: 1234 } });
    ctx.inherited = { deliver_benchmark: 'old-plan' };
    const result = await runDeliverFinish(ctx);
    expect(result).toMatchObject({ reports: [], hold: expect.any(String) });
    expect(mocks.next).not.toHaveBeenCalled();
  });
});
