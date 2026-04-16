import { useEffect, useState } from 'react';
import { fetchSectionContent, ContentMap } from './content';

export function useContent(section: string): ContentMap {
  const [content, setContent] = useState<ContentMap>({});

  useEffect(() => {
    fetchSectionContent(section).then(setContent);
  }, [section]);

  return content;
}
