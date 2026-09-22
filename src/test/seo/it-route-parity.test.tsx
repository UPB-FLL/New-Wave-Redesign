// The prerendered head for each route must equal what that route's page
// actually asks usePageMeta for at runtime. Each page is rendered at its real
// route with usePageMeta captured, and the resolved result is compared with
// the prerender input — so a page that switches to another registry key,
// overrides a field, or forgets the registry fails here.

import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { ComponentType } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { resolvePageMeta, type PageMetaOptions } from '../../lib/pageMeta';
import { prerenderedItRoutes } from '../../lib/routeMeta';

const captured: PageMetaOptions[] = [];
vi.mock('../../lib/usePageMeta', () => ({ usePageMeta: (options: PageMetaOptions) => void captured.push(options) }));
vi.mock('../../lib/useContent', () => ({ useContent: () => ({}) }));
vi.mock('../../components/Navbar', () => ({ default: () => null }));
vi.mock('../../components/Footer', () => ({ default: () => null }));

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => vi.unstubAllGlobals());

// Route table read from App.tsx itself, so this test follows the real router.
const app = readFileSync(path.resolve(__dirname, '../../App.tsx'), 'utf8');
const imports = new Map(
  [...app.matchAll(/import (\w+) from '\.\/pages\/(\w+)';/g)].map(([, name, file]) => [name, file]),
);
const routeElements = new Map(
  [...app.matchAll(/<Route path="([^"]+)" element=\{<(\w+) \/>\} \/>/g)].map(([, routePath, name]) => [routePath, name]),
);

function pageFor(routePath: string): { pattern: string; file: string } {
  const pattern = routeElements.has(routePath) ? routePath : routePath.startsWith('/l/') ? '/l/:slug' : '';
  const name = routeElements.get(pattern);
  const file = name ? imports.get(name) : undefined;
  if (!file) throw new Error(`No <Route> in App.tsx renders ${routePath}`);
  return { pattern, file };
}

describe('prerendered heads match what each page sets at runtime', () => {
  it.each(prerenderedItRoutes().map((route) => [route.path, route] as const))('%s', async (routePath, route) => {
    const { pattern, file } = pageFor(routePath);
    const Page = ((await import(`../../pages/${file}.tsx`)) as { default: ComponentType }).default;

    captured.length = 0;
    const { unmount } = render(
      <MemoryRouter initialEntries={[routePath]}>
        <Routes>
          <Route path={pattern} element={<Page />} />
        </Routes>
      </MemoryRouter>,
    );
    unmount();

    expect(captured.length, `${file} never called usePageMeta`).toBeGreaterThan(0);
    const { jsonLd: _runtimeOnly, ...runtime } = captured[captured.length - 1];
    void _runtimeOnly;
    expect(resolvePageMeta(runtime, routePath)).toEqual(resolvePageMeta(route.meta, routePath));
  });
});
