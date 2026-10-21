import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabase', async (orig) => {
  const mod = await orig<typeof import('../lib/supabase')>();
  const client = mod.createUnconfiguredSupabaseClient() as unknown as Record<string, unknown>;
  client.auth = { signOut: vi.fn().mockResolvedValue({}) };
  return { ...mod, supabase: client };
});

import AdminLayout from './AdminLayout';
import { contentManager } from './ContentManager';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<div>Overview body</div>} />
          <Route path="hero" element={<div>Hero editor body</div>} />
          <Route path="footer" element={<div>Footer editor body</div>} />
          <Route path="blog" element={<div>Blog body</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  contentManager.discardChanges();
});

describe('AdminLayout sidebar', () => {
  it('shows the four groups with site pages collapsed, and expands the current page', () => {
    renderAt('/admin/hero');
    const nav = screen.getByRole('navigation', { name: 'Admin' });
    for (const label of ['Site pages', 'Blog', 'SEO']) expect(within(nav).getByText(label)).toBeInTheDocument();
    // Home holds the current editor, so it is open; the others stay closed.
    expect(within(nav).getByRole('button', { name: 'Home' })).toHaveAttribute('aria-expanded', 'true');
    expect(within(nav).getByRole('link', { name: 'Hero' })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'Pricing' })).toHaveAttribute('aria-expanded', 'false');
    expect(within(nav).queryByRole('link', { name: 'Plans and tiers' })).not.toBeInTheDocument();
    expect(screen.getByText('Hero editor body')).toBeInTheDocument();
  });

  it('opens and closes a page, remembering the choice', () => {
    renderAt('/admin');
    const nav = screen.getByRole('navigation', { name: 'Admin' });
    fireEvent.click(within(nav).getByRole('button', { name: 'Pricing' }));
    expect(within(nav).getByRole('link', { name: 'Quote builder units' })).toHaveAttribute('href', '/admin/pricing-units');
    expect(within(nav).getByRole('link', { name: /View on site/ })).toHaveAttribute('href', '/pricing?preview=1');
    expect(JSON.parse(localStorage.getItem('nw_admin_open_pages') ?? '[]')).toEqual(['pricing']);
    fireEvent.click(within(nav).getByRole('button', { name: 'Pricing' }));
    expect(within(nav).queryByRole('link', { name: 'Quote builder units' })).not.toBeInTheDocument();
  });

  it('filters the sidebar by a field name and clears on pick', () => {
    renderAt('/admin');
    const search = screen.getByRole('searchbox', { name: 'Search the admin' });
    fireEvent.change(search, { target: { value: 'phone' } });
    const results = screen.getByRole('group', { name: 'Search results' });
    const fieldLinks = within(within(results).getByRole('group', { name: 'Fields' })).getAllByRole('link');
    const links = within(results).getAllByRole('link').filter((l) => !fieldLinks.includes(l));
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/admin/hero', '/admin/contact', '/admin/footer']);
    expect(fieldLinks.map((l) => l.getAttribute('href'))).toContain('/admin/footer?field=phone');
    expect(within(results).getAllByText('Contact and footer')).toHaveLength(2);
    expect(screen.queryByText('SEO')).not.toBeInTheDocument();
    fireEvent.click(links[2]);
    expect(screen.getByText('Footer editor body')).toBeInTheDocument();
    expect(search).toHaveValue('');
    expect(screen.getByText('SEO')).toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'zzz' } });
    expect(screen.getByText('Nothing matches "zzz".')).toBeInTheDocument();
  });

  it('shows the publish bar only while something is unsaved', () => {
    renderAt('/admin/hero');
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
    act(() => contentManager.updateField('hero', 'badge', 'New badge'));
    expect(screen.getByText('1 unsaved change')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
  });

  it('links to Groundswell’s own portal instead of carrying its pages', () => {
    renderAt('/admin');
    expect(screen.getByRole('link', { name: 'Open Groundswell' })).toHaveAttribute('href', '/groundswell/admin');
    expect(screen.queryByRole('group', { name: 'Groundswell' })).not.toBeInTheDocument();
  });
});
