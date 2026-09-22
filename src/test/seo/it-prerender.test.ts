// Every prerendered New Wave IT page must describe itself in raw HTML, before
// any JavaScript runs, with exactly the values the app sets after hydration.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolvePageMeta, SITE_URL } from '../../lib/pageMeta';
import { renderRouteHtml } from '../../lib/prerenderHead';
import { IT_PAGE_META, prerenderedItRoutes } from '../../lib/routeMeta';
import { SERVICE_GUIDE_SUMMARIES } from '../../lib/serviceGuides';

const shell = readFileSync(path.resolve(__dirname, '../../../index.html'), 'utf8');
const routes = prerenderedItRoutes();

function head(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const all = (selector: string) => [...doc.head.querySelectorAll(selector)];
  const content = (selector: string) => all(selector).map((el) => el.getAttribute('content'));
  return {
    titles: all('title').map((el) => el.textContent),
    canonicals: all('link[rel="canonical"]').map((el) => el.getAttribute('href')),
    descriptions: content('meta[name="description"]'),
    ogUrls: content('meta[property="og:url"]'),
    ogTitles: content('meta[property="og:title"]'),
    ogDescriptions: content('meta[property="og:description"]'),
    twitterTitles: content('meta[name="twitter:title"]'),
    siteNames: content('meta[property="og:site_name"]'),
    jsonLd: all('script[type="application/ld+json"]').map((el) => el.textContent ?? ''),
    icon: doc.head.querySelector('link[rel="icon"][type="image/svg+xml"]')?.getAttribute('href'),
  };
}

describe('prerendered New Wave IT routes', () => {
  it('covers every static route and every service guide, but never the homepage', () => {
    const paths = routes.map((route) => route.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).not.toContain('/');
    Object.keys(IT_PAGE_META).forEach((p) => expect(paths).toContain(p));
    Object.keys(SERVICE_GUIDE_SUMMARIES).forEach((slug) => expect(paths).toContain(`/l/${slug}`));
    expect(paths).toHaveLength(29);
  });

  it.each(routes.map((route) => [route.path, route] as const))('%s describes itself in raw HTML', (routePath, route) => {
    const expected = resolvePageMeta(route.meta, routePath);
    const h = head(renderRouteHtml(shell, routePath, route.meta));
    const url = `${SITE_URL}${routePath}`;

    expect(h.canonicals).toEqual([url]);
    expect(h.ogUrls).toEqual([url]);
    expect(expected.canonical).toBe(url);
    expect(h.titles).toEqual([expected.title]);
    expect(h.ogTitles).toEqual([expected.title]);
    expect(h.twitterTitles).toEqual([expected.title]);
    expect(h.descriptions).toEqual([expected.description]);
    expect(h.ogDescriptions).toEqual([expected.description]);
    expect(h.siteNames).toEqual(['New Wave IT']);

    // Still a New Wave IT page: parent entity data and icons are untouched.
    expect(h.jsonLd).toHaveLength(1);
    expect(h.jsonLd[0]).toContain('"LocalBusiness"');
    expect(h.icon).toBe('/favicon.svg');
    // And none of the homepage's identity survives.
    expect(h.titles[0]).not.toBe('New Wave IT — 24/7 Managed IT, Cybersecurity & Cloud in Fort Lauderdale');
  });

  it('never writes over the shell itself (the homepage)', () => {
    // vite.config.ts writes each route to dist/<path>/index.html; none may resolve to dist/index.html.
    routes.forEach((route) => expect(path.join(route.path.replace(/^\//, ''), 'index.html'), route.path).not.toBe('index.html'));
    expect(head(shell).canonicals).toEqual([`${SITE_URL}/`]);
  });
});

describe('prerender tag scanner', () => {
  const meta = IT_PAGE_META['/pricing'];
  const withGt = (tag: string) => shell.replace(/<meta name="twitter:title"[^>]*>/, tag);

  it.each([
    ['name first', '<meta name="twitter:title" content="Downtime -> uptime" />'],
    ['content first', '<meta content="Response < 1h > SLA" name="twitter:title" />'],
  ])('treats a ">" inside a quoted attribute as part of the tag (%s)', (_order, tag) => {
    const shellWithGt = withGt(tag);
    expect(shellWithGt).toContain(tag);
    const doc = new DOMParser().parseFromString(renderRouteHtml(shellWithGt, '/pricing', meta), 'text/html');
    const title = resolvePageMeta(meta, '/pricing').title;
    expect([...doc.head.querySelectorAll('meta[name="twitter:title"]')].map((el) => el.getAttribute('content'))).toEqual([title]);
    expect(doc.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(doc.body.querySelector('link[rel="canonical"], meta')).toBeNull();
  });
});
