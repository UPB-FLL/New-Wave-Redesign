// Pure page-metadata model shared by the runtime hook (usePageMeta) and the
// build-time prerenderer (prerenderHead.ts). Both resolve options with
// resolvePageMeta() and write exactly the tags headEntries() lists, so the
// head a crawler reads in the raw HTML and the head the app sets after
// hydration cannot drift apart. No React or DOM access in this module:
// vite.config.ts imports it at build time.

export const SITE_NAME = 'New Wave IT';
export const SITE_URL = 'https://www.newwaveitfl.com';
export const DEFAULT_DESCRIPTION =
  "Fort Lauderdale's trusted managed IT services partner. 24/7 support, cybersecurity, cloud migration, and network infrastructure for South Florida businesses.";
export const DEFAULT_OG_IMAGE = 'https://www.newwaveitfl.com/brand/og/open-graph-1200x630.png';
/** The shell's (index.html) keywords; a test keeps the two identical. */
export const DEFAULT_KEYWORDS =
  'managed IT services Fort Lauderdale, MSP South Florida, cybersecurity Fort Lauderdale, cloud migration South Florida, IT support Fort Lauderdale, network infrastructure, HIPAA compliance IT, 24/7 IT support';

export interface PageMetaOptions {
  title: string;
  description?: string;
  /** Appended to title as "| New Wave IT" unless false or title already contains SITE_NAME */
  includeSiteName?: boolean;
  /** Absolute canonical URL. Defaults to the site URL plus the current path. */
  canonical?: string;
  /** Open Graph / Twitter image URL */
  ogImage?: string;
  /** Comma-separated keywords for meta[name="keywords"]. Defaults to the site keywords. */
  keywords?: string;
  /** JSON-LD object(s) to inject as <script type="application/ld+json"> (runtime only) */
  jsonLd?: object | object[];
  /** Open Graph type, e.g. 'website' or 'article' */
  ogType?: string;
  /** Set true to add <meta name="robots" content="noindex, nofollow"> */
  noindex?: boolean;
  /** Brand for the title suffix and og:site_name. Defaults to "New Wave IT"; divisions pass their own. */
  siteName?: string;
}

export interface ResolvedPageMeta {
  /** Full document title, including the site-name suffix when it applies. */
  title: string;
  description: string;
  /** Absolute canonical URL (also og:url). */
  canonical: string;
  ogImage: string;
  ogType: string;
  siteName: string;
  robots: string;
  keywords: string;
}

export function resolvePageMeta(
  {
    title,
    description = DEFAULT_DESCRIPTION,
    includeSiteName = true,
    canonical,
    ogImage = DEFAULT_OG_IMAGE,
    keywords,
    ogType = 'website',
    noindex = false,
    siteName = SITE_NAME,
  }: PageMetaOptions,
  pathname: string,
): ResolvedPageMeta {
  return {
    title: includeSiteName && !title.includes(siteName) ? `${title} | ${siteName}` : title,
    description,
    canonical: canonical ?? SITE_URL + pathname,
    ogImage,
    ogType,
    siteName,
    robots: noindex ? 'noindex, nofollow' : 'index, follow',
    keywords: keywords || DEFAULT_KEYWORDS,
  };
}

export type HeadEntry =
  | { kind: 'meta'; attr: 'name' | 'property'; key: string; value: string }
  | { kind: 'canonical'; href: string };

/** Every head tag a page owns besides <title>, in the order the runtime writes them. */
export function headEntries(meta: ResolvedPageMeta): HeadEntry[] {
  const tag = (attr: 'name' | 'property', key: string, value: string): HeadEntry => ({ kind: 'meta', attr, key, value });
  const entries: HeadEntry[] = [
    tag('name', 'description', meta.description),
    tag('property', 'og:type', meta.ogType),
    tag('property', 'og:site_name', meta.siteName),
    tag('property', 'og:title', meta.title),
    tag('property', 'og:description', meta.description),
    tag('property', 'og:url', meta.canonical),
    tag('property', 'og:image', meta.ogImage),
    tag('name', 'twitter:card', 'summary_large_image'),
    tag('name', 'twitter:title', meta.title),
    tag('name', 'twitter:description', meta.description),
    tag('name', 'twitter:image', meta.ogImage),
    tag('name', 'robots', meta.robots),
    { kind: 'canonical', href: meta.canonical },
    // Every page writes keywords (the site default when it has none), so the
    // value after client-side navigation never depends on the entry URL.
    tag('name', 'keywords', meta.keywords),
  ];
  return entries;
}
