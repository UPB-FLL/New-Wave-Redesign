import { useEffect } from 'react';

const SITE_NAME = 'New Wave IT';
const DEFAULT_DESCRIPTION =
  "Fort Lauderdale's trusted managed IT services partner. 24/7 support, cybersecurity, cloud migration, and network infrastructure for South Florida businesses.";

interface PageMetaOptions {
  title: string;
  description?: string;
  /** If true (default), the title is suffixed with " | New Wave IT". */
  includeSiteName?: boolean;
  /** Absolute URL for the canonical tag. */
  canonical?: string;
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

export function usePageMeta({
  title,
  description = DEFAULT_DESCRIPTION,
  includeSiteName = true,
  canonical,
}: PageMetaOptions) {
  useEffect(() => {
    const prevTitle = document.title;
    const fullTitle = includeSiteName && !title.includes(SITE_NAME) ? `${title} | ${SITE_NAME}` : title;
    document.title = fullTitle;

    const restorers: Restorer[] = [
      upsertMeta('name', 'description', description),
      upsertMeta('property', 'og:title', fullTitle),
      upsertMeta('property', 'og:description', description),
      upsertMeta('name', 'twitter:title', fullTitle),
      upsertMeta('name', 'twitter:description', description),
    ];
    if (canonical) restorers.push(upsertCanonical(canonical));

    return () => {
      document.title = prevTitle;
      restorers.forEach((r) => r());
    };
  }, [title, description, includeSiteName, canonical]);
}
