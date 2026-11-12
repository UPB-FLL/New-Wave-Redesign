import { ratesDiffer, type PricingUnit } from './publishedRates';

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

/**
 * The published price list for the build-time render of /pricing: the active
 * `pricing_units` rows in the admin's order, the same PostgREST read the
 * quote builder makes in the browser. Rows come back as stored (a name may
 * carry a stray space; seedPricingUnits tidies them). Null without
 * credentials; with credentials a failed read throws, as the CMS read does.
 */
export async function readPricingUnitsForBuild(options: CmsReadOptions): Promise<PricingUnit[] | null> {
  const { url, key, fetchImpl = fetch } = options;
  if (!url || !key) return null;
  const endpoint = `${url.replace(/\/$/, '')}/rest/v1/pricing_units?select=*&active=eq.true&order=sort_order.asc`;
  const res = await fetchImpl(endpoint, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`prerender: pricing_units read failed with HTTP ${res.status}`);
  const rows: unknown = await res.json();
  if (!Array.isArray(rows)) throw new Error('prerender: pricing_units read did not return a list of rows');
  return rows as PricingUnit[];
}

/**
 * What the build says about the price list it read, or null when there is
 * nothing to say. None of these fails a deploy: without rows /pricing renders
 * with no price table (never a line saying the list is empty), and when a
 * price changed in the admin, /pricing shows its table without the prose
 * sentence until src/lib/publishedRates.ts follows. The differences are named
 * so the change is noticed at the next deploy.
 */
export function priceListWarning(units: readonly PricingUnit[] | null): string | null {
  if (!units) return 'prerender: no Supabase credentials; /pricing carries no price table.';
  if (!units.length) return 'prerender: pricing_units has no active rows; /pricing carries no price table.';
  const differences = ratesDiffer(units);
  if (!differences.length) return null;
  return [
    'prerender: src/lib/publishedRates.ts differs from the price list (pricing_units), so /pricing shows its table without the prose sentence:',
    ...differences.map((difference) => `  - ${difference}`),
  ].join('\n');
}
