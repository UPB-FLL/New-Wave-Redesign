import { useEffect, useMemo, useState } from 'react';
import { fetchSectionContentResult, readContentCache, writeContentCache, setupContentListener, setupContentPolling, ContentMap } from './content';
import { isPreviewMode, readPreviewOverlay, setupPreviewListener } from './preview';

const CACHE_PREFIX = 'nw_content_v2:';

export function useContent(section: string): ContentMap {
  return useContentWithStatus(section).content;
}

/**
 * useContent plus `loaded`: true once the section has been read from the CMS,
 * even when it has no rows. Pages that go noindex for a missing entry need
 * it, because an empty map is also what they see before the read finishes.
 *
 * In preview mode (a tab the admin opened with "View on site") the admin's
 * unsaved edits are laid over the saved content and follow it as it changes;
 * the cache and the CMS only ever hold the saved content.
 */
export function useContentWithStatus(section: string): { content: ContentMap; loaded: boolean } {
  const [saved, setSaved] = useState<ContentMap>(() => readContentCache(section) ?? {});
  const [loaded, setLoaded] = useState(false);
  const [preview] = useState(() => isPreviewMode());
  const [overlay, setOverlay] = useState<ContentMap | null>(() => (preview ? readPreviewOverlay(section) : null));

  useEffect(() => {
    let cancelled = false;
    fetchSectionContentResult(section).then(({ ok, content: data }) => {
      if (cancelled) return;
      setSaved(data);
      writeContentCache(section, data);
      if (ok) setLoaded(true);
    });

    const onStorage = (e: StorageEvent) => {
      if (e.key !== CACHE_PREFIX + section || !e.newValue) return;
      try {
        setSaved(JSON.parse(e.newValue) as ContentMap);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('storage', onStorage);

    // Setup BroadcastChannel listener for real-time updates
    const cleanupListener = setupContentListener(section, (key, value) => {
      setSaved(prev => ({ ...prev, [key]: value }));
    });

    // Setup polling fallback (every 30 seconds)
    const cleanupPolling = setupContentPolling(section, (newContent) => {
      if (!cancelled) {
        setSaved(newContent);
      }
    }, 30000);

    const cleanupPreview = preview ? setupPreviewListener(section, setOverlay) : undefined;

    return () => {
      cancelled = true;
      window.removeEventListener('storage', onStorage);
      cleanupListener?.();
      cleanupPolling?.();
      cleanupPreview?.();
    };
  }, [section, preview]);

  const content = useMemo(() => (overlay ? { ...saved, ...overlay } : saved), [saved, overlay]);
  return { content, loaded };
}
