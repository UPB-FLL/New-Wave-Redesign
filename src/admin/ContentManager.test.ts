import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A fake `site_content` table: rows with updated_at, read by
 * select().eq() and select(), written by upsert().
 */
const db = vi.hoisted(() => {
  const rows: Array<{ section: string; key: string; value: string; updated_at: string }> = [];
  const result = (data: unknown) => Promise.resolve({ data, error: null });
  const from = (table: string) => {
    if (table !== 'site_content') throw new Error(`unexpected table ${table}`);
    return {
      select: () => ({
        eq: (_col: string, section: string) => result(rows.filter((r) => r.section === section)),
        then: (fn: (v: { data: unknown; error: null }) => unknown) => result(rows).then(fn),
      }),
      upsert: (incoming: typeof rows) => {
        for (const row of incoming) {
          const i = rows.findIndex((r) => r.section === row.section && r.key === row.key);
          if (i >= 0) rows[i] = row; else rows.push(row);
        }
        return result(null);
      },
    };
  };
  return { rows, from };
});

vi.mock('../lib/supabase', () => ({ supabase: { from: db.from } }));
const cache = vi.hoisted(() => ({ writeContentCache: vi.fn(), broadcastContentChange: vi.fn() }));
vi.mock('../lib/content', () => cache);

import { ContentManager, DRAFT_KEY, StaleSectionError } from './ContentManager';

beforeEach(() => {
  db.rows.length = 0;
  db.rows.push({ section: 'hero', key: 'badge', value: 'Old badge', updated_at: '2026-10-21T10:00:00Z' });
  db.rows.push({ section: 'hero', key: 'phone', value: '+1', updated_at: '2026-10-21T09:00:00Z' });
  sessionStorage.clear();
  cache.writeContentCache.mockReset();
  cache.broadcastContentChange.mockReset();
});

describe('ContentManager', () => {
  it('loads a section, tracks an edit, and publishes it to the cache and the channel', async () => {
    const cm = new ContentManager();
    const hero = await cm.loadSection('hero');
    expect(hero).toEqual({ badge: 'Old badge', phone: '+1' });
    expect(cm.getState().loaded.hero).toBe(true);

    cm.updateField('hero', 'badge', 'New badge');
    expect(cm.getPendingChangesCount()).toBe(1);
    expect(cm.isPending('hero', 'badge')).toBe(true);
    expect(JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? '{}')).toEqual({ hero: { badge: 'New badge' } });

    await cm.publishChanges();
    expect(db.rows.find((r) => r.key === 'badge')?.value).toBe('New badge');
    expect(cache.writeContentCache).toHaveBeenCalledWith('hero', { badge: 'New badge', phone: '+1' });
    expect(cache.broadcastContentChange).toHaveBeenCalledWith('hero', 'badge', 'New badge');
    expect(cm.getPendingChangesCount()).toBe(0);
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(cm.getState().publishStatus).toBe('saved');
  });

  it('restores an unsaved draft from sessionStorage over the server copy', async () => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ hero: { badge: 'Draft badge' } }));
    const cm = new ContentManager();
    expect(cm.getPendingChangesCount()).toBe(1);
    const hero = await cm.loadSection('hero');
    expect(hero.badge).toBe('Draft badge');
    expect(hero.phone).toBe('+1');
  });

  it('refuses to overwrite a section saved elsewhere since it was loaded, unless forced', async () => {
    const cm = new ContentManager();
    await cm.loadSection('hero');
    cm.updateField('hero', 'badge', 'Mine');
    // Another tab saves the same section after our load.
    db.rows[1] = { ...db.rows[1], updated_at: '2026-10-21T12:00:00Z' };

    await expect(cm.publishChanges()).rejects.toBeInstanceOf(StaleSectionError);
    expect(cm.getState().staleSections).toEqual(['hero']);
    expect(cm.getState().publishStatus).toBe('idle');
    expect(db.rows.find((r) => r.key === 'badge')?.value).toBe('Old badge');

    await cm.publishChanges({ force: true });
    expect(db.rows.find((r) => r.key === 'badge')?.value).toBe('Mine');
    expect(cm.getState().staleSections).toEqual([]);

    // After a save the section counts as fresh again.
    cm.updateField('hero', 'badge', 'Mine 2');
    await expect(cm.publishChanges()).resolves.toBeUndefined();
  });

  it('discards edits and the draft', async () => {
    const cm = new ContentManager();
    await cm.loadSection('hero');
    cm.updateField('hero', 'badge', 'Mine');
    cm.discardChanges();
    expect(cm.getPendingChangesCount()).toBe(0);
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
    await vi.waitFor(() => expect(cm.getSection('hero').badge).toBe('Old badge'));
  });
});
