import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ executeTool: vi.fn() }));
vi.mock('../../../api/_lib/groundswell/composio', async (original) => ({ ...(await original<object>()), executeTool: mocks.executeTool }));

import { runSocial } from '../../../api/_lib/groundswell/currents/social';

/** The Social Current when Instagram turns the scraper away: one more try, then the gap is recorded, never a failed audit. */

const profile = (followers: number) => ({ data: { follower_count: followers, biography: 'Beer', media_count: 10 } });
const posts = { items: [{ like_count: 10, comment_count: 1, taken_at: 1_760_000_000 }] };
const audit = { id: 'a1', business_name: 'Harbor Auto Care', city: 'Fort Lauderdale, FL', website: null, instagram: 'harborautocare', competitors: [{ name: 'Bayside', website: null, instagram: 'bayside' }], notes: null };
const ctx = { audit, outputs: {}, deadline: Date.now() + 250_000, attempt: 1 };

// A function returned from beforeEach is a cleanup hook to vitest, so the reset stays inside braces.
beforeEach(() => {
  mocks.executeTool.mockReset();
});

describe('Social Current: blocked profiles', () => {
  it('tries a blocked profile once more and keeps the second read', async () => {
    let own = 0;
    mocks.executeTool.mockImplementation(async (slug: string, args: { handle: string }) => {
      if (slug === 'SCRAPECREATORS_GET_INSTAGRAM_PROFILE' && args.handle === 'harborautocare' && own++ === 0) {
        throw new Error('SCRAPECREATORS_GET_INSTAGRAM_PROFILE failed (200): Instagram blocked access to this public profile.');
      }
      return slug === 'SCRAPECREATORS_GET_INSTAGRAM_PROFILE' ? profile(args.handle === 'bayside' ? 500 : 1200) : posts;
    });
    const out = await runSocial(ctx, 0);
    expect(out.business).toMatchObject({ handle: 'harborautocare', followers: 1200, error: null });
    expect(out.competitors[0]).toMatchObject({ name: 'Bayside', followers: 500, error: null });
    expect(mocks.executeTool.mock.calls.filter(([slug, a]) => slug === 'SCRAPECREATORS_GET_INSTAGRAM_PROFILE' && a.handle === 'harborautocare')).toHaveLength(2);
  });

  it('records the block when the second read is turned away too, and still reads the competitors', async () => {
    mocks.executeTool.mockImplementation(async (slug: string, args: { handle: string }) => {
      if (args.handle === 'harborautocare') throw new Error('Instagram blocked access to this public profile.');
      return slug === 'SCRAPECREATORS_GET_INSTAGRAM_PROFILE' ? profile(500) : posts;
    });
    const out = await runSocial(ctx, 0);
    expect(out.business).toMatchObject({ exists: false, followers: null });
    expect(out.business?.error).toMatch(/blocked/);
    expect(out.competitors[0]).toMatchObject({ followers: 500 });
  });

  it('does not retry other failures, and still stops the step for a refused key', async () => {
    mocks.executeTool.mockRejectedValue(new Error('Composio refused the API key (401).'));
    await expect(runSocial(ctx, 0)).rejects.toThrow(/refused/);
    expect(mocks.executeTool.mock.calls.filter(([, a]) => a.handle === 'harborautocare')).toHaveLength(2);
  });
});
