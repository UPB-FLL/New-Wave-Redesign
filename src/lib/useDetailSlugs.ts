import { useMemo } from 'react';
import { slugsFromContentList } from './cmsDetails';
import { useContent } from './useContent';

/**
 * Slugs that have a detail page in the CMS (e.g. 'services-detail' /
 * 'services_list'), so a card links only to a page that exists. Empty until
 * the section loads, and while the CMS has no entries.
 */
export function useDetailSlugs(section: string, key: string): ReadonlySet<string> {
  const raw = useContent(section)[key];
  return useMemo(() => new Set(slugsFromContentList(raw)), [raw]);
}
