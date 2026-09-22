import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DIVISION_JSONLD_ELEMENT_ID, escapeJsonForScript, renderDivisionPageHtml } from './prerender';
import { allDivisionPages, hubPageSeo } from './seo';
import { DIVISION_ASSETS, DIVISION_NAME, SITE_URL } from './site';
import type { DivisionPageSeo } from './types';

const shell = readFileSync(path.resolve(__dirname, '../../../index.html'), 'utf8');

const count = (html: string, needle: string) => html.split(needle).length - 1;

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
    const noscript = html.slice(html.indexOf('<noscript>'), html.indexOf('</noscript>'));
    expect(noscript).toContain(`<h1>${page.h1.replace(/&/g, '&amp;')}</h1>`);
    expect(noscript).toContain('<a href="/">New Wave IT</a>');

    // The app bundle and root element survive untouched.
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain('<script type="module" src="/src/main.tsx"></script>');
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

  it('fails the build loudly when the shell no longer matches', () => {
    const withoutCanonical = shell.replace(/<link rel="canonical"[^>]*>/, '');
    expect(() => renderDivisionPageHtml(withoutCanonical, hubPageSeo())).toThrow(/canonical link/);

    const duplicated = shell.replace('</head>', '<meta name="description" content="x" /></head>');
    expect(() => renderDivisionPageHtml(duplicated, hubPageSeo())).toThrow(/meta description/);
  });
});
