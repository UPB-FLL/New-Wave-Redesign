import { useEffect } from 'react';
import { BREADCRUMBS_ELEMENT_ID, headEntries, PAGE_JSONLD_ELEMENT_ID, resolvePageMeta, type PageMetaOptions } from './pageMeta';
import { breadcrumbListNode } from './structuredData';

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

/** The server-written copy of a page's JSON-LD (see PAGE_JSONLD_ELEMENT_ID), if still in the head. */
const removeServerJsonLd = () => document.getElementById(PAGE_JSONLD_ELEMENT_ID)?.remove();

function injectJsonLd(data: object | object[]): Restorer {
  removeServerJsonLd();
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(Array.isArray(data) ? data : [data]);
  script.setAttribute('data-page-jsonld', 'true');
  document.head.appendChild(script);
  return () => script.remove();
}

/**
 * Writes the page's BreadcrumbList into the block the prerender left (or a new
 * one). Cleanup always removes it: the next page writes its own, and a page
 * without breadcrumbs must not inherit the previous page's trail.
 */
function upsertBreadcrumbs(json: string): Restorer {
  let script = document.getElementById(BREADCRUMBS_ELEMENT_ID) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = BREADCRUMBS_ELEMENT_ID;
    document.head.appendChild(script);
  }
  script.textContent = json;
  return () => document.getElementById(BREADCRUMBS_ELEMENT_ID)?.remove();
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
  breadcrumbs,
}: PageMetaOptions) {
  // Serialised here so a new array with the same trail doesn't re-run the effect.
  const breadcrumbJson = breadcrumbs?.length ? JSON.stringify(breadcrumbListNode(breadcrumbs)) : null;

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
    if (breadcrumbJson) restorers.push(upsertBreadcrumbs(breadcrumbJson));

    return () => {
      document.title = prevTitle;
      restorers.forEach((r) => r());
      // A post page that never loaded its data client-side must not leave its
      // server-written graph behind for the next page.
      removeServerJsonLd();
    };
  }, [title, description, includeSiteName, canonical, ogImage, keywords, jsonLd, ogType, noindex, siteName, breadcrumbJson]);
}
