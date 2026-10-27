import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => {
  const rows: Array<{ section: string; key: string; value: string; updated_at: string }> = [];
  const result = (data: unknown) => Promise.resolve({ data, error: null });
  return {
    rows,
    from: () => ({
      select: () => ({
        eq: (_c: string, section: string) => result(rows.filter((r) => r.section === section)),
        then: (fn: (v: unknown) => unknown) => result(rows).then(fn),
      }),
      upsert: () => result(null),
    }),
  };
});
vi.mock('../lib/supabase', () => ({ supabase: { from: db.from } }));

import SectionPage from './SectionPage';
import { contentManager } from './ContentManager';

const at = '2026-10-21T10:00:00Z';

function renderAt(path: string, section: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/*" element={<SectionPage section={section} />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  sessionStorage.clear();
  contentManager.discardChanges();
  db.rows.length = 0;
  db.rows.push(
    { section: 'hero', key: 'badge', value: 'Fort Lauderdale IT', updated_at: at },
    { section: 'hero', key: 'phone', value: '+15615641846', updated_at: at },
    { section: 'hero', key: 'feature_cards', value: JSON.stringify([{ title: 'Fast help', desc: 'Real people' }, { title: 'Flat rate', desc: 'No surprises' }]), updated_at: at },
  );
});

describe('SectionPage', () => {
  it('shows the blocks collapsed with previews, opening one at a time', async () => {
    renderAt('/admin/hero', 'hero');
    expect(await screen.findByRole('heading', { name: 'Hero' })).toBeInTheDocument();
    const headline = screen.getByRole('button', { name: /^Headline/ });
    expect(headline).toHaveAttribute('aria-expanded', 'true');
    const cards = screen.getByRole('button', { name: /^Feature cards/ });
    expect(cards).toHaveAttribute('aria-expanded', 'false');
    expect(within(cards).getByText('Fast help · Flat rate')).toBeInTheDocument();
    expect(within(cards).getByText('2 fields')).toBeInTheDocument();

    fireEvent.click(cards);
    expect(cards).toHaveAttribute('aria-expanded', 'true');
    expect(headline).toHaveAttribute('aria-expanded', 'false');
    expect(within(headline).getByText('Fort Lauderdale IT')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View on site/ })).toHaveAttribute('href', '/?preview=1');
    expect(screen.getByRole('link', { name: 'View Feature cards on the site' })).toHaveAttribute('href', '/?preview=1#hero');
  });

  it('writes an edit to the content manager and marks the block', async () => {
    renderAt('/admin/hero', 'hero');
    const badge = await screen.findByLabelText('Badge text');
    fireEvent.change(badge, { target: { value: 'South Florida IT' } });
    expect(contentManager.getState().pendingChanges.hero).toEqual({ badge: 'South Florida IT' });
    expect(within(screen.getByRole('button', { name: /^Headline/ })).getByLabelText('unsaved changes')).toBeInTheDocument();
  });

  it('edits a list item in the side panel and reorders rows', async () => {
    renderAt('/admin/hero', 'hero');
    fireEvent.click(await screen.findByRole('button', { name: /^Feature cards/ }));
    const list = screen.getByRole('list', { name: 'Feature cards' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    fireEvent.click(within(list).getByRole('button', { name: /Fast help/ }));
    const panel = screen.getByRole('dialog', { name: 'Edit Fast help' });
    fireEvent.change(within(panel).getByLabelText('Title'), { target: { value: 'Fast, human help' } });
    expect(JSON.parse(contentManager.getState().pendingChanges.hero?.feature_cards as string)[0]).toEqual({ title: 'Fast, human help', desc: 'Real people' });
    fireEvent.click(within(panel).getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(within(list).getByRole('button', { name: 'Move card 2 up' }));
    expect(JSON.parse(contentManager.getState().pendingChanges.hero?.feature_cards as string).map((c: { title: string }) => c.title)).toEqual(['Flat rate', 'Fast, human help']);
    fireEvent.click(within(list).getByRole('button', { name: 'Duplicate card 1' }));
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    fireEvent.click(within(list).getByRole('button', { name: 'Delete card 3' }));
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
  });

  it('opens on the field a search link names and focuses it', async () => {
    renderAt('/admin/hero?field=phone', 'hero');
    const phone = await screen.findByLabelText('Phone number');
    await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
    expect(screen.getByRole('button', { name: /^Buttons and phone/ })).toHaveAttribute('aria-expanded', 'true');
    expect(document.activeElement).toBe(phone);
  });

  it('shows a stored list it cannot read instead of resetting it', async () => {
    db.rows.push({ section: 'trustbar', key: 'items', value: '{not a list', updated_at: at });
    renderAt('/admin/trustbar', 'trustbar');
    fireEvent.click(await screen.findByRole('button', { name: /^Trust items/ }));
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/could not be read/);
    expect(alert).toHaveTextContent('{not a list');
    expect(contentManager.getPendingChangesCount()).toBe(0);
    fireEvent.click(within(alert).getByRole('button', { name: /Replace it with an empty list/ }));
    expect(contentManager.getState().pendingChanges.trustbar).toEqual({ items: '[]' });
    expect(screen.getByRole('button', { name: /Start from the site's defaults \(5\)/ })).toBeInTheDocument();
  });

  it('offers the site defaults for an empty list', async () => {
    renderAt('/admin/trustbar', 'trustbar');
    fireEvent.click(await screen.findByRole('button', { name: /^Trust items/ }));
    fireEvent.click(screen.getByRole('button', { name: /Start from the site's defaults \(5\)/ }));
    expect(JSON.parse(contentManager.getState().pendingChanges.trustbar?.items as string)).toHaveLength(5);
    expect(within(screen.getByRole('list', { name: 'Trust items' })).getByText('Huntress Partner')).toBeInTheDocument();
  });
});
