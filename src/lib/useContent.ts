import { useEffect, useState } from 'react';
import { fetchSectionContent, ContentMap } from './content';

const CACHE_PREFIX = 'nw_content_v1:';

function readCache(section: string): ContentMap | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + section);
    return raw ? (JSON.parse(raw) as ContentMap) : null;
  } catch {
    return null;
  }
}

function writeCache(section: string, value: ContentMap) {
  try {
    localStorage.setItem(CACHE_PREFIX + section, JSON.stringify(value));
  } catch {
    /* ignore quota / private mode */
  }
}

export function useContent(section: string): ContentMap {
  const [content, setContent] = useState<ContentMap>(() => readCache(section) ?? {});

  useEffect(() => {
    fetchSectionContent(section).then((data) => {
      setContent(data);
      writeCache(section, data);
    });
  }, [section]);

  return content;
}
