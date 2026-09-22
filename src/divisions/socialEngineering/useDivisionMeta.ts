import { useEffect } from 'react';
import { usePageMeta } from '../../lib/usePageMeta';
import { DIVISION_JSONLD_ELEMENT_ID } from './prerender';
import { divisionJsonLdDocument, divisionPageMetaOptions } from './seo';
import { DIVISION_ASSETS } from './site';
import type { DivisionPageSeo } from './types';

/**
 * Runtime twin of the build-time prerender: keeps title, canonical, Open Graph,
 * and structured data identical whether a division page was loaded directly
 * (prerendered HTML) or reached by in-app navigation.
 */
export function useDivisionMeta(page: DivisionPageSeo) {
  usePageMeta(divisionPageMetaOptions(page));

  const jsonLd = divisionJsonLdDocument(page);

  useEffect(() => {
    // Reuse the prerendered block when present so the graph is never duplicated.
    let script = document.getElementById(DIVISION_JSONLD_ELEMENT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = DIVISION_JSONLD_ELEMENT_ID;
      document.head.appendChild(script);
    }
    script.textContent = jsonLd;
    return () => {
      document.getElementById(DIVISION_JSONLD_ELEMENT_ID)?.remove();
    };
  }, [jsonLd]);
}

// `parent` values mirror index.html. They are restored explicitly (not "whatever
// was there before") because a directly loaded division page starts with the
// division's icons already in its prerendered head.
const ICON_LINKS: { selector: string; division: string; parent: string }[] = [
  { selector: 'link[rel="icon"][type="image/svg+xml"]', division: DIVISION_ASSETS.faviconSvg, parent: '/favicon.svg' },
  { selector: 'link[rel="icon"][sizes="any"]', division: DIVISION_ASSETS.faviconIco, parent: '/favicon.ico' },
  { selector: 'link[rel="apple-touch-icon"]', division: DIVISION_ASSETS.appleTouchIcon, parent: '/apple-touch-icon.png' },
  { selector: 'link[rel="manifest"]', division: DIVISION_ASSETS.manifest, parent: '/site.webmanifest' },
];

/** Swaps favicon + manifest to the division's while a division page is mounted. */
export function useDivisionIcons() {
  useEffect(() => {
    ICON_LINKS.forEach(({ selector, division }) => {
      document.head.querySelector<HTMLLinkElement>(selector)?.setAttribute('href', division);
    });
    return () => {
      ICON_LINKS.forEach(({ selector, parent }) => {
        document.head.querySelector<HTMLLinkElement>(selector)?.setAttribute('href', parent);
      });
    };
  }, []);
}

/**
 * The shell's static JSON-LD describes New Wave IT (LocalBusiness). The
 * prerendered division HTML omits it; this keeps in-app navigation consistent
 * by detaching it while a division page is mounted and restoring it after.
 */
export function useParentJsonLdHidden() {
  useEffect(() => {
    const parentBlocks = [
      ...document.head.querySelectorAll<HTMLScriptElement>(
        `script[type="application/ld+json"]:not(#${DIVISION_JSONLD_ELEMENT_ID}):not([data-page-jsonld])`,
      ),
    ];
    parentBlocks.forEach((block) => block.remove());
    return () => parentBlocks.forEach((block) => document.head.appendChild(block));
  }, []);
}
