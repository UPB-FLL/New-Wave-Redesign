import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderRouteHtml } from '../../lib/prerenderHead';
import { prerenderedItRoutes } from '../../lib/routeMeta';
import {
  DIVISION_CRITICAL_FONTS,
  DIVISION_JSONLD_ELEMENT_ID,
  escapeJsonForScript,
  renderDivisionPageHtml,
} from './prerender';
import { allDivisionPages, contactPageSeo, contactUsPageSeo, customersPageSeo, hubPageSeo } from './seo';
import { DIVISION_ASSETS, DIVISION_CONTACT_US_PATH, DIVISION_CUSTOMERS_PATH, DIVISION_NAME, SITE_URL } from './site';
import type { DivisionPageSeo } from './types';

const shell = readFileSync(path.resolve(__dirname, '../../../index.html'), 'utf8');
const publicDir = path.resolve(__dirname, '../../../public');
const typeCss = readFileSync(path.resolve(__dirname, 'type.css'), 'utf8');

/** The parent shell's Google Fonts <link>, exactly as index.html writes it. */
const shellGoogleFontsLinks = shell.match(/<link\b[^>]*https:\/\/fonts\.googleapis\.com\/css2[^>]*>/g) ?? [];
const googleFontsLink = shellGoogleFontsLinks[0] ?? '';
const googleFontsHref = googleFontsLink.match(/href="([^"]+)"/)?.[1] ?? '';

const count = (html: string, needle: string) => html.split(needle).length - 1;

/** The body's no-JS fallback (the head also has a <noscript> for the Google Fonts link). */
function noJsFallback(html: string) {
  const start = html.indexOf('<noscript><main>');
  return html.slice(start, html.indexOf('</noscript>', start));
}

function parseHead(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const content = (selector: string) => doc.head.querySelector(selector)?.getAttribute('content');
  return {
    doc,
    title: doc.title,
    description: content('meta[name="description"]'),
    canonical: doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ogUrl: content('meta[property="og:url"]'),
    ogTitle: content('meta[property="og:title"]'),
    ogSiteName: content('meta[property="og:site_name"]'),
    ogImage: content('meta[property="og:image"]'),
    twitterTitle: content('meta[name="twitter:title"]'),
    icon: doc.head.querySelector('link[rel="icon"][type="image/svg+xml"]')?.getAttribute('href'),
    manifest: doc.head.querySelector('link[rel="manifest"]')?.getAttribute('href'),
    jsonLd: [...doc.head.querySelectorAll('script[type="application/ld+json"]')],
  };
}

describe('renderDivisionPageHtml', () => {
  it.each(allDivisionPages().map((page) => [page.path, page] as const))('prerenders %s', (_path, page) => {
    const html = renderDivisionPageHtml(shell, page);
    const head = parseHead(html);
    const url = `${SITE_URL}${page.path}`;

    expect(head.title).toBe(page.title);
    expect(head.description).toBe(page.description);
    expect(head.canonical).toBe(url);
    expect(head.ogUrl).toBe(url);
    expect(head.ogTitle).toBe(page.title);
    expect(head.twitterTitle).toBe(page.title);
    expect(head.ogSiteName).toBe(DIVISION_NAME);
    expect(head.ogImage).toBe(`${SITE_URL}${DIVISION_ASSETS.ogImage}`);
    expect(head.icon).toBe(DIVISION_ASSETS.faviconSvg);
    expect(head.manifest).toBe(DIVISION_ASSETS.manifest);

    // Exactly one JSON-LD block, the division's — the parent's LocalBusiness is gone.
    expect(head.jsonLd).toHaveLength(1);
    expect(head.jsonLd[0].id).toBe(DIVISION_JSONLD_ELEMENT_ID);
    const graph = JSON.parse(head.jsonLd[0].textContent ?? '')['@graph'];
    expect(graph.some((node: { '@type': string }) => node['@type'] === 'Organization')).toBe(true);
    expect(html).not.toContain('LocalBusiness');

    // None of the IT homepage's identity leaks into the division page head.
    expect(count(html, '<link rel="canonical"')).toBe(1);
    expect(html).not.toContain('href="https://www.newwaveitfl.com/" />');
    expect(html).not.toContain('24/7 Managed IT, Cybersecurity &amp; Cloud');
    expect(html).not.toContain('24/7 Managed IT, Cybersecurity & Cloud');

    // Crawlers that never run JS still get the H1 and a path back to the parent.
    const noscript = noJsFallback(html);
    expect(noscript).toContain(`<h1>${page.h1.replace(/&/g, '&amp;')}</h1>`);
    expect(noscript).toContain('<a href="/">New Wave IT</a>');

    // The app bundle and root element survive untouched.
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain('<script type="module" src="/src/main.tsx"></script>');
  });

  it.each([
    ['customers', customersPageSeo(), DIVISION_CUSTOMERS_PATH, 'CollectionPage'],
    ['contact-us', contactUsPageSeo(), DIVISION_CONTACT_US_PATH, 'ContactPage'],
  ] as const)('gives the %s page its own head and structured data', (_name, page, pagePath, pageType) => {
    const html = renderDivisionPageHtml(shell, page);
    const head = parseHead(html);
    const url = `${SITE_URL}${pagePath}`;
    expect(page.path).toBe(pagePath);
    expect(head.canonical).toBe(url);
    expect(head.doc.head.querySelector('meta[name="twitter:description"]')?.getAttribute('content')).toBe(page.description);
    expect(head.doc.head.querySelector('meta[property="og:description"]')?.getAttribute('content')).toBe(page.description);
    expect(head.doc.head.querySelector('meta[name="keywords"]')?.getAttribute('content')).toBe(page.keywords);
    // Unique among division pages (the discovery-call page is the nearest neighbour).
    const others = allDivisionPages().filter((other) => other.path !== pagePath);
    others.forEach((other) => {
      expect(head.title).not.toBe(other.title);
      expect(head.description).not.toBe(other.description);
    });

    const graph = JSON.parse(head.jsonLd[0].textContent ?? '')['@graph'];
    expect(graph.map((node: { '@type': string }) => node['@type'])).toEqual(
      pageType === 'CollectionPage'
        ? ['Organization', 'CollectionPage', 'ItemList', 'BreadcrumbList']
        : ['Organization', 'ContactPage', 'BreadcrumbList'],
    );
    const crumbs = graph.find((node: { '@type': string }) => node['@type'] === 'BreadcrumbList');
    expect(crumbs.itemListElement.at(-1)).toMatchObject({ name: page.breadcrumbs[page.breadcrumbs.length - 1].name, item: url });
    // The no-JS fallback carries the page's own H1.
    expect(noJsFallback(html)).toContain(`<h1>${page.h1}</h1>`);
  });

  it('links Customers and both contact pages, by their crumbs, in every no-JS fallback', () => {
    const noscript = noJsFallback(renderDivisionPageHtml(shell, hubPageSeo()));
    expect(noscript).toContain(`<a href="${DIVISION_CONTACT_US_PATH}">Contact us</a>`);
    expect(noscript).toContain(`<a href="${contactPageSeo().path}">Contact</a>`);
    expect(noscript).toContain(`<a href="${DIVISION_CUSTOMERS_PATH}">Customers</a>`);
  });

  it('leaves the shell itself untouched (IT pages keep their head)', () => {
    const before = shell;
    renderDivisionPageHtml(shell, hubPageSeo());
    expect(shell).toBe(before);
    expect(shell).toContain('<link rel="canonical" href="https://www.newwaveitfl.com/" />');
  });

  it('escapes attribute values and keeps JSON-LD from closing its script', () => {
    const hostile: DivisionPageSeo = {
      ...hubPageSeo(),
      title: 'A "quoted" <title> & more',
      description: 'Desc with "quotes" & <tags> '.padEnd(130, '.'),
      jsonLd: [{ '@type': 'Thing', name: '</script><script>alert(1)</script>' }],
    };
    const html = renderDivisionPageHtml(shell, hostile);
    expect(html).toContain('<title>A "quoted" &lt;title&gt; &amp; more</title>');
    expect(html).toContain('content="A &quot;quoted&quot; &lt;title&gt; &amp; more"');
    expect(html).not.toContain('</script><script>alert(1)');
    expect(escapeJsonForScript('</script>')).toBe('\\u003c/script>');

    const head = parseHead(html);
    const graph = JSON.parse(head.jsonLd[0].textContent ?? '')['@graph'];
    expect(graph[0].name).toBe('</script><script>alert(1)</script>');
  });

  it('fails the build loudly only when a page-identity tag is missing or ambiguous', () => {
    const withoutCanonical = shell.replace(/<link rel="canonical"[^>]*>/, '');
    expect(() => renderDivisionPageHtml(withoutCanonical, hubPageSeo())).toThrow(/canonical link/);

    const duplicated = shell.replace('</head>', '<meta name="description" content="x" /></head>');
    expect(() => renderDivisionPageHtml(duplicated, hubPageSeo())).toThrow(/meta description/);
  });

  it('tolerates routine edits to the parent shell', () => {
    const edited = shell
      // an extra parent JSON-LD block with attributes
      .replace('</head>', '<script type="application/ld+json" data-extra="1">{"@type":"WebSite"}</script></head>')
      // a dropped optional tag
      .replace(/<meta name="keywords"[^>]*>/, '')
      // reordered attributes and single quotes
      .replace('<link rel="icon" href="/favicon.ico" sizes="any" />', "<link sizes='any' href='/favicon.ico' rel='icon'>")
      .replace(/<meta name="description" content="([^"]*)" \/>/, '<meta content="$1" name="description">');

    const page = hubPageSeo();
    const head = parseHead(renderDivisionPageHtml(edited, page));
    expect(head.description).toBe(page.description);
    expect(head.doc.head.querySelector('meta[name="keywords"]')?.getAttribute('content')).toBe(page.keywords);
    expect(head.doc.head.querySelector('link[rel="icon"][sizes="any"]')?.getAttribute('href')).toBe(DIVISION_ASSETS.faviconIco);
    expect(head.doc.head.querySelectorAll('link[rel="icon"][sizes="any"]')).toHaveLength(1);
    expect(head.jsonLd).toHaveLength(1);
    expect(head.jsonLd[0].id).toBe(DIVISION_JSONLD_ELEMENT_ID);
  });

  it('links every other division page from the no-JS fallback', () => {
    const pages = allDivisionPages();
    const html = renderDivisionPageHtml(shell, hubPageSeo());
    const noscript = noJsFallback(html);
    pages
      .filter((page) => page.path !== '/social-engineering')
      .forEach((page) => expect(noscript).toContain(`<a href="${page.path}">`));
  });

  it('adds head extras such as preload links', () => {
    const html = renderDivisionPageHtml(shell, hubPageSeo(), {
      headExtras: ['<link rel="modulepreload" crossorigin href="/assets/Hub.js">'],
    });
    const head = html.slice(0, html.indexOf('</head>'));
    expect(head).toContain('<link rel="modulepreload" crossorigin href="/assets/Hub.js">');
  });
});

describe('division fonts in the prerendered head', () => {
  const headOf = (html: string) => new DOMParser().parseFromString(html, 'text/html').head;
  const outsideNoscript = (elements: Iterable<Element>) => [...elements].filter((el) => !el.closest('noscript'));

  it('finds exactly one Google Fonts stylesheet in the parent shell', () => {
    expect(shellGoogleFontsLinks).toHaveLength(1);
    expect(googleFontsLink).toMatch(/rel="stylesheet"/);
    expect(googleFontsLink).not.toMatch(/\smedia=/);
  });

  it('points the critical-font preloads at files that exist and that type.css serves', () => {
    expect(DIVISION_CRITICAL_FONTS).toHaveLength(2);
    for (const href of DIVISION_CRITICAL_FONTS) {
      expect(href).toMatch(/^\/brand\/social-engineering\/fonts\/[a-z0-9-]+\.woff2$/);
      expect(existsSync(path.join(publicDir, href))).toBe(true);
      // Same URL as the @font-face src, or the browser downloads the file twice.
      expect(typeCss).toContain(`url('${href}') format('woff2')`);
    }
    expect(DIVISION_CRITICAL_FONTS.some((href) => href.includes('plus-jakarta-sans'))).toBe(true);
    expect(DIVISION_CRITICAL_FONTS.some((href) => href.includes('inter'))).toBe(true);
  });

  it.each(allDivisionPages().map((page) => [page.path, page] as const))(
    'preloads both critical fonts and defers the Google stylesheet on %s',
    (_path, page) => {
      const html = renderDivisionPageHtml(shell, page);
      const head = headOf(html);

      const preloads = [...head.querySelectorAll('link[rel="preload"][as="font"]')];
      expect(preloads.map((el) => el.getAttribute('href'))).toEqual([...DIVISION_CRITICAL_FONTS]);
      for (const preload of preloads) {
        expect(preload.getAttribute('type')).toBe('font/woff2');
        // Fonts are always fetched in CORS mode; without crossorigin the preload goes unused.
        expect(preload.hasAttribute('crossorigin')).toBe(true);
        expect(preload.getAttribute('crossorigin')).toBe('');
      }

      // Still present (IT pages reached by client-side navigation need it), but
      // fetched as print media and switched to all media once loaded.
      const google = outsideNoscript(head.querySelectorAll('link[href^="https://fonts.googleapis.com/"]'));
      expect(google).toHaveLength(1);
      expect(google[0].getAttribute('rel')).toBe('stylesheet');
      expect(google[0].getAttribute('href')).toBe(googleFontsHref);
      expect(google[0].getAttribute('media')).toBe('print');
      expect(google[0].getAttribute('onload')).toBe("this.media='all'");

      // No-JS fallback: the original, unmodified link.
      expect(html).toContain(`<noscript>${googleFontsLink}</noscript>`);
      expect(count(html, googleFontsHref)).toBe(2);

      // Preloads come first, ahead of every stylesheet.
      const firstPreload = html.indexOf('<link rel="preload" as="font"');
      expect(firstPreload).toBeGreaterThan(-1);
      expect(firstPreload).toBeLessThan(html.search(/<link\b[^>]*rel="stylesheet"/));

      // The preconnects stay for the deferred stylesheet.
      expect(html).toContain('<link rel="preconnect" href="https://fonts.googleapis.com" />');
    },
  );

  it('keeps chunk preloads from headExtras alongside the font preloads', () => {
    const html = renderDivisionPageHtml(shell, hubPageSeo(), {
      headExtras: ['<link rel="stylesheet" crossorigin href="/assets/Hub.css">'],
    });
    expect(count(html, 'rel="preload" as="font"')).toBe(2);
    expect(html).toContain('<link rel="stylesheet" crossorigin href="/assets/Hub.css">');
  });

  it('leaves New Wave IT pages with the render-blocking Google stylesheet and no division fonts', () => {
    const routes = prerenderedItRoutes();
    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) {
      const html = renderRouteHtml(shell, route.path, route.meta);
      expect(html).toContain(googleFontsLink);
      expect(count(html, googleFontsHref)).toBe(1);
      expect(html).not.toContain('media="print"');
      expect(html).not.toContain('rel="preload" as="font"');
      expect(html).not.toContain('/brand/social-engineering/fonts/');
    }
    // Rendering a division page never mutates the shell the IT routes share.
    const before = shell;
    allDivisionPages().forEach((page) => renderDivisionPageHtml(shell, page));
    expect(shell).toBe(before);
    expect(shell).not.toContain('rel="preload" as="font"');
  });

  it('fails the build loudly when the Google Fonts link is missing, duplicated, or already deferred', () => {
    const without = shell.replace(googleFontsLink, '');
    expect(() => renderDivisionPageHtml(without, hubPageSeo())).toThrow(/exactly one Google Fonts stylesheet link.*found 0/);

    const doubled = shell.replace(googleFontsLink, `${googleFontsLink}\n${googleFontsLink}`);
    expect(() => renderDivisionPageHtml(doubled, hubPageSeo())).toThrow(/exactly one Google Fonts stylesheet link.*found 2/);

    const alreadyDeferred = shell.replace(googleFontsLink, googleFontsLink.replace('rel="stylesheet"', 'rel="stylesheet" media="print"'));
    expect(() => renderDivisionPageHtml(alreadyDeferred, hubPageSeo())).toThrow(/already has a media or onload attribute/);
  });

  it('tolerates a reformatted Google Fonts link', () => {
    const oneLine = shell.replace(googleFontsLink, `<link href='${googleFontsHref}' rel='stylesheet'>`);
    const html = renderDivisionPageHtml(oneLine, hubPageSeo());
    expect(html).toContain(`<link href='${googleFontsHref}' rel='stylesheet' media="print" onload="this.media='all'">`);
    expect(html).toContain(`<noscript><link href='${googleFontsHref}' rel='stylesheet'></noscript>`);
  });
});
