// After a deploy, a tab still running the previous build can request lazy
// chunks whose hashed filenames no longer exist, so the dynamic import fails.
// Vite reports that as a `vite:preloadError` event; reloading once fetches the
// current build. The timestamp guard stops a genuinely broken chunk from
// reload-looping — the second failure within the window is left to throw.
//
// Decorative chunks (the NW Social Engineering line-art scenes) are the
// exception: their importer shows an empty box when one fails, so reloading
// the whole page for it (and wiping a half-filled contact form) would cost far
// more than the missing drawing. They load through loadDecorativeChunk, and
// handleChunkPreloadError, main.tsx's listener, leaves their failures alone.
// A scene that failed stays an empty box until the next full page load: the
// browser keeps a module that failed to load for the document's lifetime, so a
// failed chunk the scenes share (the drawing primitives) also leaves later
// scenes in the same visit empty. That is accepted: they are decorative.

const STORAGE_KEY = 'nw-chunk-reload-at';
export const CHUNK_RELOAD_WINDOW_MS = 10_000;

type ReloadStorage = Pick<Storage, 'getItem' | 'setItem'>;

interface ReloadOptions {
  now?: number;
  storage?: ReloadStorage | null;
  reload?: () => void;
}

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
  { now = Date.now(), storage = sessionStore(), reload = () => window.location.reload() }: ReloadOptions = {},
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

// Decorative loads that have started and not settled yet, and the errors the
// failed ones rejected with. Vite dispatches `vite:preloadError` with the very
// error object it then rethrows to the importer, so an error found here is a
// decorative chunk's, whatever the browser's message says (Safari's names no
// URL, so the chunk's file name cannot be relied on).
let decorativeLoadsInFlight = 0;
const decorativeFailures = new WeakSet<object>();

/**
 * Loads a chunk whose importer copes with its failure on its own (a decorative
 * part of the page), so that failure never triggers the stale-chunk reload:
 * `loadDecorativeChunk(() => import('./Scene'))`. It resolves and rejects as
 * the import itself does.
 */
export function loadDecorativeChunk<T>(load: () => Promise<T>): Promise<T> {
  decorativeLoadsInFlight += 1;
  let pending: Promise<T>;
  try {
    pending = load();
  } catch (error) {
    pending = Promise.reject(error);
  }
  return pending.then(
    (module) => {
      decorativeLoadsInFlight -= 1;
      return module;
    },
    (error: unknown) => {
      decorativeLoadsInFlight -= 1;
      if (typeof error === 'object' && error !== null) decorativeFailures.add(error);
      throw error;
    },
  );
}

type PreloadErrorEvent = Pick<Event, 'preventDefault'> & { payload?: unknown };

/**
 * main.tsx's `vite:preloadError` listener. With no decorative load in flight
 * the failed chunk is an ordinary one: reload once (reloadOnceForStaleChunk),
 * as before. Otherwise it may be a decorative chunk's, and whose it is shows
 * only once Vite has rethrown it to its importer. So the event is left alone
 * (the error reaches its importer: a scene's slot shows its empty box), and a
 * task later the page reloads once unless a decorative load claimed the error.
 */
export function handleChunkPreloadError(event: PreloadErrorEvent, options: ReloadOptions = {}): void {
  if (decorativeLoadsInFlight === 0) {
    reloadOnceForStaleChunk(event, options);
    return;
  }
  const error = event.payload;
  // A macrotask, so every promise reaction (Vite's rethrow, then the
  // decorative load's rejection handler) has run first.
  setTimeout(() => {
    const decorative = typeof error === 'object' && error !== null && decorativeFailures.has(error);
    if (!decorative) reloadOnceForStaleChunk({ preventDefault() {} }, options);
  }, 0);
}
