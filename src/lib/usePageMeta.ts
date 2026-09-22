import { useEffect } from 'react';
import { headEntries, resolvePageMeta, type PageMetaOptions } from './pageMeta';

export type { PageMetaOptions } from './pageMeta';

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
  description,
  includeSiteName,
  canonical,
  ogImage,
  keywords,
  jsonLd,
  ogType,
  noindex,
  siteName,
}: PageMetaOptions) {
  useEffect(() => {
    const prevTitle = document.title;
    // Same resolver and tag list as the build-time prerender (src/lib/prerenderHead.ts).
    const meta = resolvePageMeta(
      { title, description, includeSiteName, canonical, ogImage, keywords, ogType, noindex, siteName },
      window.location.pathname,
    );
    document.title = meta.title;

    const restorers: Restorer[] = headEntries(meta).map((entry) =>
      entry.kind === 'canonical' ? upsertCanonical(entry.href) : upsertMeta(entry.attr, entry.key, entry.value),
    );
    if (jsonLd) restorers.push(injectJsonLd(jsonLd));

    return () => {
      document.title = prevTitle;
      restorers.forEach((r) => r());
    };
  }, [title, description, includeSiteName, canonical, ogImage, keywords, jsonLd, ogType, noindex, siteName]);
}
