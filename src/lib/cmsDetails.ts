// The CMS detail lists (site_content services-detail.services_list and
// threats-detail.threats_list) that back /service/:slug and /threat/:slug.
// Pure: api/_lib/sitemap.ts re-exports it for the content sitemap.

/** Slugs from a site_content JSON list (services_list / threats_list); malformed JSON yields none. */
export function slugsFromContentList(raw: unknown): string[] {
  if (typeof raw !== 'string') return [];
  try {
    const items: unknown = JSON.parse(raw);
    if (!Array.isArray(items)) return [];
    return items.map((item) => (item && typeof item === 'object' ? (item as { slug?: unknown }).slug : undefined)).filter(
      (slug): slug is string => typeof slug === 'string' && slug.trim() !== '',
    );
  } catch {
    return [];
  }
}
