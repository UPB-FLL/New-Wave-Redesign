import { useEffect, useState } from 'react';
import { fetchSectionContent, readContentCache, writeContentCache, setupContentListener, setupContentPolling, ContentMap } from './content';

const CACHE_PREFIX = 'nw_content_v2:';

export function useContent(section: string): ContentMap {
  const [content, setContent] = useState<ContentMap>(() => readContentCache(section) ?? {});

  useEffect(() => {
    let cancelled = false;
    fetchSectionContent(section).then((data) => {
      if (cancelled) return;
      setContent(data);
      writeContentCache(section, data);
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

  return content;
}
