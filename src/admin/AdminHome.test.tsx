import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const rows = vi.hoisted(() => ({ data: [] as Array<{ section: string; updated_at: string }>, error: null as { message: string } | null }));
const lib = vi.hoisted(() => ({ listAudits: vi.fn() }));

vi.mock('../lib/supabase', () => ({
  supabase: { from: () => ({ select: () => Promise.resolve(rows) }) },
}));
vi.mock('../lib/groundswell', async (orig) => ({ ...(await orig<typeof import('../lib/groundswell')>()), ...lib }));

import AdminHome from './AdminHome';
import { formatEdited } from './adminHomeData';

beforeEach(() => {
  rows.data = [
    { section: 'hero', updated_at: '2026-10-20T15:00:00Z' },
    { section: 'hero', updated_at: '2026-10-21T09:00:00Z' },
    { section: 'footer', updated_at: '2026-09-01T09:00:00Z' },
  ];
  rows.error = null;
  lib.listAudits.mockReset();
  lib.listAudits.mockResolvedValue([{ status: 'queued' }, { status: 'queued' }, { status: 'running' }, { status: 'done' }]);
});

describe('AdminHome', () => {
  it('shows one card per site page with its editors and last edit, and the audit queue', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-21T18:00:00Z'), toFake: ['Date'] });
    render(<MemoryRouter><AdminHome /></MemoryRouter>);
    const pages = screen.getByRole('region', { name: 'Site pages' });
    const cards = within(pages).getAllByRole('listitem').filter((li) => li.querySelector('ul'));
    expect(cards).toHaveLength(6);
    expect(await within(cards[0]).findByText('Edited today')).toBeInTheDocument();
    expect(within(cards[0]).getByRole('link', { name: /Trust bar/ })).toHaveAttribute('href', '/admin/trustbar');
    expect(within(cards[4]).getByText('Edited Sep 1, 2026')).toBeInTheDocument();
    expect(within(cards[5]).getByText('Not edited yet')).toBeInTheDocument();
    expect(await screen.findByText('2 queued, 1 running')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('reports a failed read instead of guessing', async () => {
    rows.error = { message: 'permission denied' };
    render(<MemoryRouter><AdminHome /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Last edits: permission denied');
  });

  it('words the last edit relative to today', () => {
    const now = new Date('2026-10-21T18:00:00Z');
    expect(formatEdited(undefined, now)).toBe('Not edited yet');
    expect(formatEdited('2026-10-21T01:00:00Z', now)).toBe('Edited today');
    expect(formatEdited('2026-10-20T01:00:00Z', now)).toBe('Edited yesterday');
    expect(formatEdited('2026-10-10T01:00:00Z', now)).toBe('Edited 11 days ago');
    expect(formatEdited('2026-08-10T01:00:00Z', now)).toBe('Edited Aug 10, 2026');
  });
});
