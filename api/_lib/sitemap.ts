/**
 * Builds the XML for /sitemap-content.xml: the URLs that come from the
 * database rather than the codebase (blog posts and the CMS-driven service
 * and threat detail pages). public/sitemap.xml keeps listing every static
 * page; robots.txt points crawlers at both.
 */

export const SITE_URL = 'https://www.newwaveitfl.com';

export interface SitemapEntry {
  /** Site-relative path, e.g. '/blog/my-post'. */
  path: string;
  /** Any date string Date can parse; written as YYYY-MM-DD. */
  lastmod?: string | null;
}

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

function isoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

/** A slug is usable when it is a non-empty string; it is percent-encoded into the URL. */
export const detailPath = (prefix: string, slug: unknown): string | null =>
  typeof slug === 'string' && slug.trim() ? `${prefix}/${encodeURIComponent(slug.trim())}` : null;

export function buildSitemapXml(entries: readonly SitemapEntry[]): string {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const entry of entries) {
    if (seen.has(entry.path)) continue;
    seen.add(entry.path);
    const lastmod = isoDate(entry.lastmod);
    urls.push(
      `  <url>\n    <loc>${escapeXml(SITE_URL + entry.path)}</loc>\n` +
        (lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : '') +
        '  </url>',
    );
  }
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    (urls.length ? `${urls.join('\n')}\n` : '') +
    '</urlset>\n'
  );
}

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
