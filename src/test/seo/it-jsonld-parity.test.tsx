// The JSON-LD in a static page's raw HTML must be the JSON-LD the page writes
// into the head once the app runs: a crawler that never runs the bundle and
// one that does read the same Service, FAQPage or Article node. Each page is
// rendered the way the build renders it (renderItPage, then renderRouteHtml),
// and then mounted at its real App.tsx route, with the real usePageMeta, over
// the head that raw HTML carries.

import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { ComponentType } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PAGE_JSONLD_ELEMENT_ID, type PageMetaOptions } from '../../lib/pageMeta';
import { isPrerenderedItPath, renderItPage } from '../../lib/prerenderBody';
import { renderRouteHtml } from '../../lib/prerenderHead';
import { HOME_PAGE_JSON_LD, HOME_PAGE_META, prerenderedItRoutes } from '../../lib/routeMeta';

vi.mock('../../lib/useContent', () => ({
  useContent: () => ({}),
  useContentWithStatus: () => ({ content: {}, loaded: true }),
}));
vi.mock('../../components/Navbar', () => ({ default: () => null }));
vi.mock('../../components/Footer', () => ({ default: () => null }));
// App.tsx's own chrome, which the homepage case mounts and does not need.
vi.mock('@vercel/analytics/react', () => ({ Analytics: () => null }));
vi.mock('../../components/WaveBackground', () => ({ default: () => null }));
vi.mock('../../components/FloatingNav', () => ({ default: () => null }));
vi.mock('../../components/PreviewBanner', () => ({ default: () => null }));

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
  vi.stubGlobal('scrollTo', () => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => vi.unstubAllGlobals());
beforeEach(() => {
  document.head.innerHTML = '';
});

const root = path.resolve(__dirname, '../../..');
const shell = readFileSync(path.join(root, 'index.html'), 'utf8');

// Route table read from App.tsx itself, so this test follows the real router.
const app = readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
const imports = new Map([...app.matchAll(/import (\w+) from '\.\/pages\/(\w+)';/g)].map(([, name, file]) => [name, file]));
const routeElements = new Map([...app.matchAll(/<Route path="([^"]+)" element=\{<(\w+) \/>\} \/>/g)].map(([, routePath, name]) => [routePath, name]));

const JSON_LD = 'script[type="application/ld+json"]';
/** The block usePageMeta writes at runtime. */
const RUNTIME_BLOCK = 'script[data-page-jsonld]';
const parsed = (element: Element | null) => (element ? (JSON.parse(element.textContent ?? 'null') as object[]) : null);
const types = (nodes: object[] | null) => (nodes ?? []).map((node) => (node as { '@type'?: string })['@type']);

/** The page as the build writes it, and the JSON-LD that raw HTML carries. */
function buildPage(routePath: string, meta: PageMetaOptions) {
  const page = renderItPage(routePath);
  const doc = new DOMParser().parseFromString(renderRouteHtml(shell, routePath, meta, page), 'text/html');
  const blocks = [...doc.head.querySelectorAll(`script#${PAGE_JSONLD_ELEMENT_ID}`)];
  expect(blocks.length, `${routePath} #page-jsonld blocks`).toBe(page.jsonLd ? 1 : 0);
  // By construction: the raw HTML holds exactly what the page passed to usePageMeta during the render.
  expect(parsed(blocks[0] ?? null)).toEqual(page.jsonLd);
  return { doc, rawNodes: page.jsonLd };
}

/** Starts the live document from the JSON-LD the raw HTML carries, as a visitor's browser does. */
function loadRawHead(doc: Document): number {
  const scripts = [...doc.head.querySelectorAll(JSON_LD)];
  document.head.innerHTML = scripts.map((script) => script.outerHTML).join('');
  return scripts.length;
}

function expectTakenOver(rawNodes: object[] | null, rawCount: number) {
  // The raw block is gone and the page's own copy says the same; nothing is listed twice.
  expect(document.getElementById(PAGE_JSONLD_ELEMENT_ID)).toBeNull();
  const runtime = [...document.head.querySelectorAll(RUNTIME_BLOCK)];
  expect(runtime).toHaveLength(rawNodes ? 1 : 0);
  expect(parsed(runtime[0] ?? null)).toEqual(rawNodes);
  expect(document.head.querySelectorAll(JSON_LD)).toHaveLength(rawCount);
}

const routes = prerenderedItRoutes().filter((route) => isPrerenderedItPath(route.path));

describe('raw-HTML JSON-LD matches what each page writes at runtime', () => {
  it.each(routes.map((route) => [route.path, route] as const))('%s', async (routePath, route) => {
    const pattern = routeElements.has(routePath) ? routePath : '/l/:slug';
    const file = imports.get(routeElements.get(pattern) ?? '');
    if (!file) throw new Error(`No <Route> in App.tsx renders ${routePath}`);
    const Page = ((await import(`../../pages/${file}.tsx`)) as { default: ComponentType }).default;

    const { doc, rawNodes } = buildPage(routePath, route.meta);
    const rawCount = loadRawHead(doc);
    const { unmount } = render(
      <MemoryRouter initialEntries={[routePath]}>
        <Routes>
          <Route path={pattern} element={<Page />} />
        </Routes>
      </MemoryRouter>,
    );
    expectTakenOver(rawNodes, rawCount);

    unmount();
    expect(document.head.querySelector(`${RUNTIME_BLOCK}, #${PAGE_JSONLD_ELEMENT_ID}`)).toBeNull();
  });

  it('the homepage, mounted by App.tsx itself', async () => {
    const { doc, rawNodes } = buildPage('/', HOME_PAGE_META);
    expect(rawNodes).toEqual([HOME_PAGE_JSON_LD]);
    const rawCount = loadRawHead(doc);

    window.history.replaceState(null, '', '/');
    const { default: App } = await import('../../App');
    const { unmount } = render(<App />);
    expectTakenOver(rawNodes, rawCount);
    unmount();
  });

  it('covers every kind of page that carries its own node, and one that carries none', () => {
    const built = (routePath: string) => {
      const route = routes.find((candidate) => candidate.path === routePath);
      if (!route) throw new Error(`${routePath} is not prerendered`);
      return types(buildPage(routePath, route.meta).rawNodes);
    };
    expect(built('/service-category/healthcare')).toContain('Service');
    expect(built('/it-support-fort-lauderdale')).toContain('Service');
    expect(built('/l/managed-it-guide')).toEqual(expect.arrayContaining(['Article', 'FAQPage']));
    expect(built('/contact')).toContain('ContactPage');
    // The legal pages pass no JSON-LD: nothing is written for them.
    expect(built('/privacy-policy')).toEqual([]);
  });
});
