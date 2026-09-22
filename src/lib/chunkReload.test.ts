import { describe, expect, it, vi } from 'vitest';
import { CHUNK_RELOAD_WINDOW_MS, reloadOnceForStaleChunk } from './chunkReload';

function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => void data.set(key, value) };
}

describe('reloadOnceForStaleChunk', () => {
  it('reloads once and suppresses the error for a stale-deploy chunk failure', () => {
    const storage = memoryStorage();
    const reload = vi.fn();
    const event = { preventDefault: vi.fn() };

    expect(reloadOnceForStaleChunk(event, { now: 1_000_000, storage, reload })).toBe(true);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('lets a repeat failure inside the window throw instead of reload-looping', () => {
    const storage = memoryStorage();
    const reload = vi.fn();
    reloadOnceForStaleChunk({ preventDefault: vi.fn() }, { now: 1_000_000, storage, reload });

    const second = { preventDefault: vi.fn() };
    expect(reloadOnceForStaleChunk(second, { now: 1_000_000 + CHUNK_RELOAD_WINDOW_MS - 1, storage, reload })).toBe(false);
    expect(second.preventDefault).not.toHaveBeenCalled();
    expect(reload).toHaveBeenCalledOnce();

    expect(reloadOnceForStaleChunk({ preventDefault: vi.fn() }, { now: 1_000_000 + CHUNK_RELOAD_WINDOW_MS + 1, storage, reload })).toBe(true);
  });

  it('does not reload when storage is unavailable (no loop guard)', () => {
    const reload = vi.fn();
    expect(reloadOnceForStaleChunk({ preventDefault: vi.fn() }, { storage: null, reload })).toBe(false);
    const throwing = { getItem: () => { throw new Error('blocked'); }, setItem: () => {} };
    expect(reloadOnceForStaleChunk({ preventDefault: vi.fn() }, { storage: throwing, reload })).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
