import { useEffect } from 'react';

const SITE_NAME = 'New Wave IT';
const SITE_URL = 'https://www.newwaveitfl.com';
const DEFAULT_DESCRIPTION =
  "Fort Lauderdale's trusted managed IT services partner. 24/7 support, cybersecurity, cloud migration, and network infrastructure for South Florida businesses.";
const DEFAULT_OG_IMAGE =
  'https://images.squarespace-cdn.com/content/v1/64c044f11baf2d14ebb899c6/fb59af7c-4a76-48a9-ab9d-88a58a54496e/new-wave-it-high-resolution-logo-transparent.png?format=1200w';

interface PageMetaOptions {
  title: string;
  description?: string;
  /** Appended to title as "| New Wave IT" unless false or title already contains SITE_NAME */
  includeSiteName?: boolean;
  /** Absolute canonical URL. Defaults to current href. */
  canonical?: string;
  /** Open Graph / Twitter image URL */
  ogImage?: string;
  /** Comma-separated keywords for meta[name="keywords"] */
  keywords?: string;
  /** JSON-LD object(s) to inject as <script type="application/ld+json"> */
  jsonLd?: object | object[];
}

type Restorer = () => void;

function upsertMeta(attr: 'name' | 'property', key: string, value: string): Restorer {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  const created = !tag;
  const prev = tag?.getAttribute('content') ?? null;
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', value);
  return () => {
    const current = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
    if (!current) return;
    if (created) current.remove();
    else if (prev !== null) current.setAttribute('content', prev);
  };
}

function upsertCanonical(href: string): Restorer {
  let tag = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const created = !tag;
  const prev = tag?.getAttribute('href') ?? null;
  if (!tag) {
    tag = document.createElement('link');
    tag.rel = 'canonical';
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', href);
  return () => {
    const current = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!current) return;
    if (created) current.remove();
    else if (prev !== null) current.setAttribute('href', prev);
  };
}

function injectJsonLd(data: object | object[]): Restorer {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(Array.isArray(data) ? data : [data]);
  script.setAttribute('data-page-jsonld', 'true');
  document.head.appendChild(script);
  return () => script.remove();
}

export function usePageMeta({
  title,
  description = DEFAULT_DESCRIPTION,
  includeSiteName = true,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  keywords,
  jsonLd,
}: PageMetaOptions) {
  useEffect(() => {
    const prevTitle = document.title;
    const fullTitle =
      includeSiteName && !title.includes(SITE_NAME) ? `${title} | ${SITE_NAME}` : title;
    document.title = fullTitle;

    const pageUrl = canonical ?? (SITE_URL + window.location.pathname);

    const restorers: Restorer[] = [
      upsertMeta('name', 'description', description),
      upsertMeta('property', 'og:title', fullTitle),
      upsertMeta('property', 'og:description', description),
      upsertMeta('property', 'og:url', pageUrl),
      upsertMeta('property', 'og:image', ogImage),
      upsertMeta('name', 'twitter:title', fullTitle),
      upsertMeta('name', 'twitter:description', description),
      upsertMeta('name', 'twitter:image', ogImage),
      upsertCanonical(pageUrl),
    ];

    if (keywords) restorers.push(upsertMeta('name', 'keywords', keywords));
    if (jsonLd) restorers.push(injectJsonLd(jsonLd));

    return () => {
      document.title = prevTitle;
      restorers.forEach((r) => r());
    };
  }, [title, description, includeSiteName, canonical, ogImage, keywords, jsonLd]);
}
