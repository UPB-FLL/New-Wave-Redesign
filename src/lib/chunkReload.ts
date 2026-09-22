// After a deploy, a tab still running the previous build can request lazy
// chunks whose hashed filenames no longer exist, so the dynamic import fails.
// Vite reports that as a `vite:preloadError` event; reloading once fetches the
// current build. The timestamp guard stops a genuinely broken chunk from
// reload-looping — the second failure within the window is left to throw.

const STORAGE_KEY = 'nw-chunk-reload-at';
export const CHUNK_RELOAD_WINDOW_MS = 10_000;

type ReloadStorage = Pick<Storage, 'getItem' | 'setItem'>;

function sessionStore(): ReloadStorage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Returns true when it scheduled a reload (and suppressed the error). */
export function reloadOnceForStaleChunk(
  event: Pick<Event, 'preventDefault'>,
  {
    now = Date.now(),
    storage = sessionStore(),
    reload = () => window.location.reload(),
  }: { now?: number; storage?: ReloadStorage | null; reload?: () => void } = {},
): boolean {
  // Without storage there is no loop guard, so let the error surface instead.
  if (!storage) return false;
  try {
    const last = Number(storage.getItem(STORAGE_KEY) ?? 0);
    if (now - last < CHUNK_RELOAD_WINDOW_MS) return false;
    storage.setItem(STORAGE_KEY, String(now));
  } catch {
    return false;
  }
  event.preventDefault();
  reload();
  return true;
}
