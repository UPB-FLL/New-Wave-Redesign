import { useEffect, useState } from 'react';
import { fetchSectionContentResult, readContentCache, writeContentCache, setupContentListener, setupContentPolling, ContentMap } from './content';

const CACHE_PREFIX = 'nw_content_v2:';

export function useContent(section: string): ContentMap {
  return useContentWithStatus(section).content;
}

/**
 * useContent plus `loaded`: true once the section has been read from the CMS,
 * even when it has no rows. Pages that go noindex for a missing entry need
 * it, because an empty map is also what they see before the read finishes.
 */
export function useContentWithStatus(section: string): { content: ContentMap; loaded: boolean } {
  const [content, setContent] = useState<ContentMap>(() => readContentCache(section) ?? {});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchSectionContentResult(section).then(({ ok, content: data }) => {
      if (cancelled) return;
      setContent(data);
      writeContentCache(section, data);
      if (ok) setLoaded(true);
    });

    const onStorage = (e: StorageEvent) => {
      if (e.key !== CACHE_PREFIX + section || !e.newValue) return;
      try {
        setContent(JSON.parse(e.newValue) as ContentMap);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('storage', onStorage);

    // Setup BroadcastChannel listener for real-time updates
    const cleanupListener = setupContentListener(section, (key, value) => {
      setContent(prev => ({ ...prev, [key]: value }));
    });

    // Setup polling fallback (every 30 seconds)
    const cleanupPolling = setupContentPolling(section, (newContent) => {
      if (!cancelled) {
        setContent(newContent);
      }
    }, 30000);

    return () => {
      cancelled = true;
      window.removeEventListener('storage', onStorage);
      cleanupListener?.();
      cleanupPolling?.();
    };
  }, [section]);

  return { content, loaded };
}
