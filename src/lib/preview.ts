import type { ContentMap } from './content';

/**
 * Preview mode: the public site showing the admin's unsaved edits.
 *
 * The admin keeps every unsaved edit in `localStorage` under
 * `nw_preview:<section>` (one map of key → value per section) and announces
 * each change on a BroadcastChannel. A site tab opened with `?preview=1`
 * remembers that in `sessionStorage` (so the whole tab stays in preview as
 * the visitor navigates), lays those edits over the content it reads, and
 * follows the channel so the page changes as the admin types. Nothing is
 * written to the CMS; a visitor who never opened a preview link sees no
 * difference, and only this browser's admin can fill the overlay.
 */

export const PREVIEW_PARAM = 'preview';
export const PREVIEW_SESSION_KEY = 'nw_preview';
export const PREVIEW_PREFIX = 'nw_preview:';
export const PREVIEW_CHANNEL = 'newwave_preview';

export interface PreviewChange {
  section: string;
  /** The section's unsaved edits, or null when it has none left. */
  pending: ContentMap | null;
}

/** The page's URL with `?preview=1` (and an anchor), for the admin's "View on site" links. */
export function previewUrl(url: string, anchor?: string): string {
  const [pathAndQuery, hash] = url.split('#');
  const [path, query] = pathAndQuery.split('?');
  const params = new URLSearchParams(query ?? '');
  params.set(PREVIEW_PARAM, '1');
  const fragment = anchor ?? hash;
  return `${path}?${params.toString()}${fragment ? `#${fragment}` : ''}`;
}

/**
 * Whether this tab is previewing. `?preview=1` in the address turns it on
 * for the tab (kept in sessionStorage, so it survives navigation); the
 * banner's "Exit preview" turns it off. Never true where storage is
 * unavailable, so a visitor can't end up in preview by accident.
 */
export function isPreviewMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get(PREVIEW_PARAM) === '1') {
      sessionStorage.setItem(PREVIEW_SESSION_KEY, '1');
      return true;
    }
    return sessionStorage.getItem(PREVIEW_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function exitPreview(): void {
  try {
    sessionStorage.removeItem(PREVIEW_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function readPreviewOverlay(section: string): ContentMap | null {
  try {
    const raw = localStorage.getItem(PREVIEW_PREFIX + section);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as ContentMap) : null;
  } catch {
    return null;
  }
}

/** The section's content with the preview overlay (if any) laid over it. */
export function withPreviewOverlay(section: string, content: ContentMap): ContentMap {
  const overlay = readPreviewOverlay(section);
  return overlay ? { ...content, ...overlay } : content;
}

let channel: BroadcastChannel | null = null;
function postPreview(change: PreviewChange): void {
  try {
    if (!channel) channel = new BroadcastChannel(PREVIEW_CHANNEL);
    channel.postMessage(change);
  } catch {
    /* BroadcastChannel unsupported: the preview tab picks the change up on its next load */
  }
}

/**
 * Store a section's unsaved edits for preview tabs (null or empty clears
 * them) and tell open preview tabs. Called by the admin's ContentManager
 * whenever its pending changes move.
 */
export function writePreviewOverlay(section: string, pending: ContentMap | null): void {
  const value = pending && Object.keys(pending).length > 0 ? pending : null;
  try {
    if (value) localStorage.setItem(PREVIEW_PREFIX + section, JSON.stringify(value));
    else localStorage.removeItem(PREVIEW_PREFIX + section);
  } catch {
    /* quota or private mode: the channel still carries it to open tabs */
  }
  postPreview({ section, pending: value });
}

/** Follow preview changes for one section. Returns the cleanup. */
export function setupPreviewListener(section: string, onChange: (pending: ContentMap | null) => void): () => void {
  let own: BroadcastChannel | null = null;
  try {
    own = new BroadcastChannel(PREVIEW_CHANNEL);
    own.addEventListener('message', (event: MessageEvent<PreviewChange>) => {
      if (event.data?.section === section) onChange(event.data.pending);
    });
  } catch {
    /* unsupported */
  }
  return () => own?.close();
}
