// Every New Wave IT page opens with the same header and titles its sections the
// same way: one H1 in the page header, a breadcrumb that names the page as its
// BreadcrumbList does, no label above a title, headings in order, and no title
// that repeats itself. Pages are rendered at their real App.tsx routes.

import { render, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { ComponentType } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { prerenderedItRoutes } from '../lib/routeMeta';

const cms: Record<string, Record<string, string>> = {};
vi.mock('../lib/usePageMeta', () => ({ usePageMeta: () => undefined }));
vi.mock('../lib/useContent', () => ({
  useContent: (section: string) => cms[section] ?? {},
  useContentWithStatus: (section: string) => ({ content: cms[section] ?? {}, loaded: true }),
}));
vi.mock('../components/Navbar', () => ({ default: () => null }));
vi.mock('../components/Footer', () => ({ default: () => null }));

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => vi.unstubAllGlobals());

const app = readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf8');
const imports = new Map([...app.matchAll(/import (\w+) from '\.\/pages\/(\w+)';/g)].map(([, name, file]) => [name, file]));
const routeElements = new Map([...app.matchAll(/<Route path="([^"]+)" element=\{<(\w+) \/>\} \/>/g)].map(([, routePath, name]) => [routePath, name]));

async function renderRoute(routePath: string, pattern = routePath) {
  const file = imports.get(routeElements.get(pattern) ?? '');
  if (!file) throw new Error(`No <Route> in App.tsx renders ${routePath}`);
  const Page = ((await import(`../pages/${file}.tsx`)) as { default: ComponentType }).default;
  return render(
    <MemoryRouter initialEntries={[routePath]}>
      <Routes>
        <Route path={pattern} element={<Page />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** A run of two or more words said twice in a row: "trusted IT partner trusted IT partner". */
const REPEATED_PHRASE = /\b([\w'’&-]+(?:\s+[\w'’&-]+)+)\s+\1\b/i;

function expectStandardLayout(container: HTMLElement) {
  const h1s = container.querySelectorAll('h1');
  expect(h1s).toHaveLength(1);
  expect(h1s[0].closest('header'), 'the H1 sits in the page header').not.toBeNull();

  // No label above a title: the breadcrumb and the title say it once.
  expect(container.querySelectorAll('.nw-kicker')).toHaveLength(0);
  expect(container.innerHTML).not.toMatch(/Staatliches/);

  const headings = [...container.querySelectorAll('h1, h2, h3, h4, h5, h6')];
  headings.forEach((heading, index) => {
    if (index === 0) return;
    const level = Number(heading.tagName[1]);
    const previous = Number(headings[index - 1].tagName[1]);
    expect(level, `"${heading.textContent}" follows an h${previous}`).toBeLessThanOrEqual(previous + 1);
    expect(heading.textContent ?? '').not.toMatch(REPEATED_PHRASE);
  });

  // Chips: a rounded-full element holding words. Numbered steps hold digits.
  const chips = [...container.querySelectorAll('.rounded-full')].filter((element) => /[A-Za-z]/.test(element.textContent ?? ''));
  expect(chips.map((chip) => chip.textContent)).toEqual([]);
}

const routes = prerenderedItRoutes().filter((route) => route.path !== '/groundswell');

describe('New Wave IT page layout', () => {
  it.each(routes.map((route) => [route.path, route] as const))('%s', async (routePath, route) => {
    const pattern = routeElements.has(routePath) ? routePath : '/l/:slug';
    const { container } = await renderRoute(routePath, pattern);
    await waitFor(() => expect(container.querySelector('h1')).not.toBeNull());

    expectStandardLayout(container);
    const trail = container.querySelector('nav[aria-label="Breadcrumb"]');
    expect(trail, 'breadcrumb').not.toBeNull();
    const crumbs = route.meta.breadcrumbs ?? [];
    expect(trail?.querySelector('[aria-current="page"]')?.textContent).toBe(crumbs[crumbs.length - 1]?.name);
  });

  it.each([
    ['/this-page-does-not-exist', '*'],
    ['/service/network-security', '/service/:slug'],
    ['/threat/ransomware', '/threat/:slug'],
  ])('%s', async (routePath, pattern) => {
    const { container } = await renderRoute(routePath, pattern);
    expectStandardLayout(container);
  });

  it('links a service page to its guide only when the guide exists', async () => {
    const withGuide = await renderRoute('/service-category/managed-it-services');
    expect(withGuide.container.querySelector('header a[href="/l/managed-it-guide"]')).not.toBeNull();
    withGuide.unmount();
    // /l/family-offices-guide is not a guide: production's button opened "Guide not found".
    const withoutGuide = await renderRoute('/service-category/family-offices');
    expect(withoutGuide.container.querySelector('a[href^="/l/"]')).toBeNull();
    expect(withoutGuide.container.querySelector('header a[href="/pricing"]')?.textContent).toBe('See pricing');
    withoutGuide.unmount();
  });

  it.each(routes.filter((route) => ['/service-category/', '-fort-lauderdale'].some((part) => route.path.includes(part))).map((route) => [route.path]))(
    '%s links back to the full list of services',
    async (routePath) => {
      // The Fort Lauderdale pages' breadcrumb does not pass through Services.
      const { container } = await renderRoute(routePath);
      expect(container.querySelector('main a[href="/services"]')?.textContent).toBe('See all IT services');
    },
  );

  it('lays out the home page sections the same way', async () => {
    Object.assign(cms, {
      hero: { headline_part1: 'When technology', headline_accent: 'matters most', headline_part2: ", make sure it's in the", headline_accent2: 'right hands.', cta_secondary: 'Call Us Now', phone: '+15615641846' },
      whyus: { headline: "Don't let your IT needs get lost in the current.", section_label: 'Why New Wave IT' },
      services: { headline: 'IT Services Built for Modern Business', section_label: 'What We Do' },
    });
    try {
      const [{ default: Hero }, { default: TrustBar }, { default: Services }, { default: WhyUs }] = await Promise.all([
        import('../components/Hero'),
        import('../components/TrustBar'),
        import('../components/Services'),
        import('../components/WhyUs'),
      ]);
      const { container } = render(
        <MemoryRouter>
          <Hero />
          <TrustBar />
          <Services />
          <WhyUs />
        </MemoryRouter>,
      );
      expect(container.querySelector('h1')?.textContent).toBe("When technology matters most, make sure it's in the right hands.");
      expect(container.querySelectorAll('h1')).toHaveLength(1);
      expect(container.querySelectorAll('.nw-kicker')).toHaveLength(0);
      expect([...container.querySelectorAll('h2')].map((h) => h.textContent)).toEqual([
        'Partners and commitments',
        'IT Services Built for Modern Business',
        'Industry solutions',
        "Don't let your IT needs get lost in the current.",
        'How it works',
      ]);
      expect(container.querySelector('a[href="tel:+15615641846"]')?.textContent).toBe('Call Us Now');
    } finally {
      for (const key of Object.keys(cms)) delete cms[key];
    }
  });

  it('prints the production CMS headlines once (the stored rows, 2026-10-27)', async () => {
    Object.assign(cms, {
      about: { headline: "Fort Lauderdale's trusted IT partner", section_label: 'About Us' },
      whyus: { headline: "Don't let your IT needs get lost in the current.", section_label: 'Why New Wave IT' },
      services: { headline: 'IT Services Built for Modern Business', section_label: 'What We Do' },
      contact: { headline: 'Ready to get started?', headline_accent: "Let's talk.", section_label: 'Get In Touch' },
      pricing: { headline: 'Simple, Scalable', section_label: 'Transparent Pricing' },
    });
    try {
      const expected: Record<string, string> = {
        '/about': "Fort Lauderdale's trusted IT partner",
        '/why-us': "Don't let your IT needs get lost in the current.",
        '/services': 'IT Services Built for Modern Business',
        '/contact': 'Ready to get started?',
        '/pricing': 'Simple, Scalable plans',
      };
      for (const [routePath, h1] of Object.entries(expected)) {
        const { container, unmount } = await renderRoute(routePath);
        expect(container.querySelector('h1')?.textContent).toBe(h1);
        expectStandardLayout(container);
        for (const label of ['About Us', 'Why New Wave IT', 'What We Do', 'Get In Touch', 'Transparent Pricing']) {
          expect(container.textContent).not.toContain(label);
        }
        unmount();
      }
    } finally {
      for (const key of Object.keys(cms)) delete cms[key];
    }
  });
});
