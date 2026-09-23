// main.tsx's `vite:preloadError` listener, exercised as production reaches it:
// a chunk import wrapped the way Vite's build wraps every import() (see
// test/vitePreload.ts), with the real listener, sessionStorage and
// location.reload (jsdom reports a reload as a "not implemented: navigation"
// error instead of navigating).
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadDecorativeChunk } from './lib/chunkReload';
import { CHUNK_ERROR_MESSAGES, nextTask, vitePreload } from './test/vitePreload';

vi.mock('./App.tsx', () => ({ default: () => null }));

const RELOAD_KEY = 'nw-chunk-reload-at';
let consoleError: ReturnType<typeof vi.spyOn>;

/** True once main.tsx's listener has called location.reload() (jsdom logs it as an unimplemented navigation). */
const reloaded = () =>
  consoleError.mock.calls.some((args) => args.some((arg) => /not implemented: navigation/i.test(String((arg as Error)?.message ?? arg))));

beforeAll(async () => {
  const root = document.createElement('div');
  root.id = 'root';
  document.body.appendChild(root);
  await import('./main');
});

beforeEach(() => {
  sessionStorage.clear();
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("main.tsx's stale-chunk listener", () => {
  it('reloads once when an ordinary chunk fails', async () => {
    await expect(vitePreload(() => Promise.reject(new TypeError(CHUNK_ERROR_MESSAGES.safari)))).resolves.toBeUndefined();
    expect(sessionStorage.getItem(RELOAD_KEY)).not.toBeNull();
    expect(reloaded()).toBe(true);
  });

  it.each(Object.entries(CHUNK_ERROR_MESSAGES))('never reloads when a decorative chunk fails (%s message)', async (_browser, message) => {
    const error = new TypeError(message);
    await expect(loadDecorativeChunk(() => vitePreload(() => Promise.reject(error)))).rejects.toBe(error);
    await nextTask();
    expect(sessionStorage.getItem(RELOAD_KEY)).toBeNull();
    expect(reloaded()).toBe(false);
  });

  it('still reloads for an ordinary chunk that fails while a decorative chunk is loading', async () => {
    let finish!: (module: { default: null }) => void;
    const scene = loadDecorativeChunk(() => vitePreload(() => new Promise<{ default: null }>((resolve) => (finish = resolve))));
    await expect(vitePreload(() => Promise.reject(new TypeError(CHUNK_ERROR_MESSAGES.safari)))).rejects.toThrow();
    await nextTask();
    expect(sessionStorage.getItem(RELOAD_KEY)).not.toBeNull();
    expect(reloaded()).toBe(true);
    finish({ default: null });
    await scene;
  });
});
