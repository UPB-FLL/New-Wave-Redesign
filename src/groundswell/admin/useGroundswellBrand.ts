import { useEffect } from 'react';
import { GROUNDSWELL_BRAND } from './brand';

/** Staff routes own their browser identity only while the layout is mounted. */
export function useGroundswellBrand() {
  useEffect(() => {
    const previous = [
      ...document.head.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"], link[rel="manifest"], meta[name="theme-color"]'),
    ].map((node) => {
      const placeholder = document.createComment('GroundSwell browser identity');
      node.replaceWith(placeholder);
      return { node, placeholder };
    });
    const links = [
      { rel: 'icon', href: `${GROUNDSWELL_BRAND.digital}/favicon.ico`, sizes: 'any' },
      { rel: 'icon', href: `${GROUNDSWELL_BRAND.digital}/GroundSwell_Favicon_32.png`, type: 'image/png', sizes: '32x32' },
      { rel: 'apple-touch-icon', href: `${GROUNDSWELL_BRAND.digital}/GroundSwell_Favicon_180.png`, sizes: '180x180' },
      { rel: 'manifest', href: `${GROUNDSWELL_BRAND.digital}/site.webmanifest` },
      { rel: 'stylesheet', href: GROUNDSWELL_BRAND.fonts },
    ].map((attributes) => Object.assign(document.createElement('link'), attributes));
    const theme = Object.assign(document.createElement('meta'), { name: 'theme-color', content: '#09131D' });
    document.head.append(...links, theme);

    return () => {
      [...links, theme].forEach((node) => node.remove());
      previous.forEach(({ node, placeholder }) => placeholder.replaceWith(node));
    };
  }, []);
}
