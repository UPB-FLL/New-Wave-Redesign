// Every prerendered New Wave IT page must describe itself in raw HTML, before
// any JavaScript runs, with exactly the values the app sets after hydration.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { BREADCRUMBS_ELEMENT_ID, headEntries, resolvePageMeta, SITE_URL } from '../../lib/pageMeta';
import { renderRouteHtml } from '../../lib/prerenderHead';
import { HOME_PAGE_META, IT_PAGE_META, prerenderedItRoutes } from '../../lib/routeMeta';
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
    breadcrumbs: all(`script#${BREADCRUMBS_ELEMENT_ID}`).map((el) => JSON.parse(el.textContent ?? '{}')),
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

    // Still a New Wave IT page: parent entity data and icons are untouched,
    // plus the page's own breadcrumb trail from Home.
    expect(h.jsonLd).toHaveLength(2);
    expect(h.jsonLd[0]).toContain('"LocalBusiness"');
    expect(h.breadcrumbs).toHaveLength(1);
    const trail = h.breadcrumbs[0].itemListElement as { name: string; item: string; position: number }[];
    expect(trail[0]).toMatchObject({ position: 1, name: 'New Wave IT', item: `${SITE_URL}/` });
    expect(trail.slice(1).map((c) => c.name)).toEqual(route.meta.breadcrumbs?.map((c) => c.name));
    expect(trail[trail.length - 1].item).toBe(url);
    expect(h.icon).toBe('/favicon.svg');
    // And none of the homepage's identity survives.
    expect(h.titles[0]).not.toBe('New Wave IT — 24/7 Managed IT, Cybersecurity & Cloud in Fort Lauderdale');
  });

  it('gives every page a title and description that fit in search results', () => {
    routes.forEach((route) => {
      const meta = resolvePageMeta(route.meta, route.path);
      // Title before the " | New Wave IT" suffix: what must survive truncation.
      expect(route.meta.title.length, route.path).toBeLessThanOrEqual(60);
      expect(meta.description.length, route.path).toBeLessThanOrEqual(160);
    });
  });

  it('serves the homepage a shell whose head already equals what the homepage sets at runtime', () => {
    const doc = new DOMParser().parseFromString(shell, 'text/html');
    const meta = resolvePageMeta(HOME_PAGE_META, '/');
    expect(doc.title).toBe(meta.title);
    headEntries(meta).forEach((entry) => {
      if (entry.kind === 'canonical') {
        expect(doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(entry.href);
      } else {
        expect(doc.head.querySelector(`meta[${entry.attr}="${entry.key}"]`)?.getAttribute('content'), entry.key).toBe(entry.value);
      }
    });
  });

  it('declares the WebSite, Organization, and LocalBusiness nodes every page links to', () => {
    const doc = new DOMParser().parseFromString(shell, 'text/html');
    const graph = JSON.parse(doc.head.querySelector('script[type="application/ld+json"]')?.textContent ?? '[]') as Record<string, unknown>[];
    const ids = graph.map((node) => node['@id']);
    expect(ids).toEqual([`${SITE_URL}/#business`, `${SITE_URL}/#organization`, `${SITE_URL}/#website`]);
    expect(graph[0].parentOrganization).toEqual({ '@id': `${SITE_URL}/#organization` });
    expect(graph[2].publisher).toEqual({ '@id': `${SITE_URL}/#organization` });
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
