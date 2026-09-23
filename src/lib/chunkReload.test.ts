import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CHUNK_RELOAD_WINDOW_MS, handleChunkPreloadError, loadDecorativeChunk, reloadOnceForStaleChunk } from './chunkReload';
import { CHUNK_ERROR_MESSAGES, nextTask, vitePreload } from '../test/vitePreload';

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

describe('handleChunkPreloadError, with decorative chunks', () => {
  let storage: ReturnType<typeof memoryStorage>;
  let reload: ReturnType<typeof vi.fn>;
  let listener: (event: Event) => void;

  beforeEach(() => {
    storage = memoryStorage();
    reload = vi.fn();
    listener = (event) => handleChunkPreloadError(event, { storage, reload });
    window.addEventListener('vite:preloadError', listener);
  });

  afterEach(() => {
    window.removeEventListener('vite:preloadError', listener);
  });

  /** A deferred chunk: settle it later with `resolve` or `reject`. */
  function deferredChunk<T>() {
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { load: () => promise, resolve, reject };
  }

  it('reloads once for an ordinary chunk failure, as before: the error is suppressed', async () => {
    await expect(vitePreload(() => Promise.reject(new TypeError(CHUNK_ERROR_MESSAGES.chrome)))).resolves.toBeUndefined();
    expect(reload).toHaveBeenCalledOnce();
    expect(storage.getItem('nw-chunk-reload-at')).not.toBeNull();
  });

  it.each(Object.entries(CHUNK_ERROR_MESSAGES))(
    'never reloads for a decorative chunk (%s message), and its import rejects with the error',
    async (_browser, message) => {
      const error = new TypeError(message);
      await expect(loadDecorativeChunk(() => vitePreload(() => Promise.reject(error)))).rejects.toBe(error);
      await nextTask();
      expect(reload).not.toHaveBeenCalled();
      expect(storage.getItem('nw-chunk-reload-at')).toBeNull();
    },
  );

  it('resolves a decorative chunk that loads with its module', async () => {
    const module = { default: () => null };
    await expect(loadDecorativeChunk(() => vitePreload(() => Promise.resolve(module)))).resolves.toBe(module);
    // Nothing is left in flight: the next ordinary failure reloads straight away.
    await expect(vitePreload(() => Promise.reject(new TypeError(CHUNK_ERROR_MESSAGES.safari)))).resolves.toBeUndefined();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('still reloads once for an ordinary chunk that fails while a decorative chunk is loading', async () => {
    const scene = deferredChunk<{ default: unknown }>();
    const loading = loadDecorativeChunk(() => vitePreload(scene.load));
    const error = new TypeError(CHUNK_ERROR_MESSAGES.safari);
    // Not suppressed this time (whose error it is shows only after Vite rethrows it) ...
    await expect(vitePreload(() => Promise.reject(error))).rejects.toBe(error);
    expect(reload).not.toHaveBeenCalled();
    // ... and the reload follows a task later.
    await nextTask();
    expect(reload).toHaveBeenCalledOnce();
    scene.resolve({ default: null });
    await loading;
  });

  it('reloads once, for the ordinary chunk, when it and a decorative chunk fail together with URL-less (Safari) errors', async () => {
    const scene = deferredChunk<never>();
    const route = deferredChunk<never>();
    const sceneLoad = loadDecorativeChunk(() => vitePreload(scene.load));
    const routeLoad = vitePreload(route.load);
    const sceneError = new TypeError(CHUNK_ERROR_MESSAGES.safari);
    const routeError = new TypeError(CHUNK_ERROR_MESSAGES.safari);
    scene.reject(sceneError);
    route.reject(routeError);
    await expect(sceneLoad).rejects.toBe(sceneError);
    await expect(routeLoad).rejects.toBe(routeError);
    await nextTask();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('counts a decorative load that throws before returning its promise: it rejects, and nothing stays in flight', async () => {
    const error = new TypeError(CHUNK_ERROR_MESSAGES.firefox);
    await expect(
      loadDecorativeChunk(() => {
        throw error;
      }),
    ).rejects.toBe(error);
    // Nothing is left in flight: the next ordinary failure reloads straight away.
    await expect(vitePreload(() => Promise.reject(new TypeError(CHUNK_ERROR_MESSAGES.chrome)))).resolves.toBeUndefined();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('leaves a decorative failure alone even when it is the only failure and no reload has happened yet this session', async () => {
    // The first failure of a session is the one the stale-chunk reload would take.
    expect(storage.getItem('nw-chunk-reload-at')).toBeNull();
    const error = new TypeError(CHUNK_ERROR_MESSAGES.chrome);
    await expect(loadDecorativeChunk(() => vitePreload(() => Promise.reject(error)))).rejects.toBe(error);
    await nextTask();
    await nextTask();
    expect(reload).not.toHaveBeenCalled();
  });
});
