/**
 * What Vite's build does to every `import('./x')` in app code (Vite 5.4's
 * `__vitePreload`, for a chunk with no CSS dependencies): run the import and,
 * if it fails, dispatch a cancelable `vite:preloadError` on window whose
 * `payload` is the error. If a listener calls preventDefault() the import
 * resolves to undefined; otherwise the same error is rethrown to the importer.
 * Vitest does not apply that transform, so tests wrap an import in this to
 * reach main.tsx's listener the way a production chunk failure does.
 */
export function vitePreload<T>(baseModule: () => Promise<T>): Promise<T | undefined> {
  function handlePreloadError(error: unknown): undefined {
    const event = new Event('vite:preloadError', { cancelable: true }) as Event & { payload?: unknown };
    event.payload = error;
    window.dispatchEvent(event);
    if (!event.defaultPrevented) throw error;
    return undefined;
  }
  return Promise.resolve().then(() => baseModule().catch(handlePreloadError));
}

/** Resolves after pending timers of 0ms, i.e. once a macrotask has run. */
export const nextTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** The messages each browser gives a failed dynamic import (Safari's names no URL). */
export const CHUNK_ERROR_MESSAGES = {
  chrome: 'Failed to fetch dynamically imported module: https://example.test/assets/Chunk-abc123.js',
  firefox: 'error loading dynamically imported module: https://example.test/assets/Chunk-abc123.js',
  safari: 'Importing a module script failed.',
} as const;
