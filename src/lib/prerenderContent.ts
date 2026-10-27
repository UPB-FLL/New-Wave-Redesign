/** One section's rows, key → value (the shape useContent hands to a page). */
type ContentMap = Record<string, string>;

export interface CmsReadOptions {
  url?: string;
  key?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Every `site_content` row, grouped by section, for the build-time render of
 * the page bodies (vite.config.ts). Read with the public anon key through
 * PostgREST, the same read the browser makes. Without credentials (a local
 * build) it answers null and the pages render their code fallbacks; with
 * credentials a failed read throws, so a deploy never publishes stale copy to
 * crawlers without saying so.
 */
export async function readCmsContentForBuild(options: CmsReadOptions): Promise<Record<string, ContentMap> | null> {
  const { url, key, fetchImpl = fetch } = options;
  if (!url || !key) return null;
  const endpoint = `${url.replace(/\/$/, '')}/rest/v1/site_content?select=section,key,value`;
  const res = await fetchImpl(endpoint, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`prerender: site_content read failed with HTTP ${res.status}`);
  const rows = (await res.json()) as { section: string; key: string; value: string }[];
  const sections: Record<string, ContentMap> = {};
  for (const row of rows) (sections[row.section] ??= {})[row.key] = row.value;
  return sections;
}
