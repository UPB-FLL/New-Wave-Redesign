// Moving between service pages client-side. App.tsx renders every service
// route with the same element type (<SocialEngineeringServiceRoute slug>), so
// React keeps the page's component tree and only the slug changes: the hero's
// scene slot must still start afresh on each page. Otherwise the next page's
// scene suspends inside the previous page's visible Suspense, and React holds
// the whole navigation (a transition) until that chunk arrives; and a scene
// that failed on one page stays failed on every later one. Its own file,
// because scene modules are mocked for the whole file.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findDivisionService } from './content';
import { SocialEngineeringServiceRoute } from './routes';
import { DIVISION_SERVICE_SLUGS, divisionServicePath } from './site';

const { marketingChunk } = vi.hoisted(() => {
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { marketingChunk: { ready, release } };
});

// The marketing scene's chunk is slow: it arrives only when the test releases it.
vi.mock('./motion/scenes/MarketingReachScene', async (importOriginal) => {
  await marketingChunk.ready;
  return importOriginal();
});
// The brand development scene's chunk fails.
vi.mock('./motion/scenes/BrandAlignScene', () => {
  throw new TypeError('Failed to fetch dynamically imported module: /assets/BrandAlignScene-stale.js');
});
vi.mock('../../lib/useContent', () => ({ useContent: vi.fn(() => ({})) }));

/**
 * For a wait that includes loading a lazy chunk (the route's page or a scene):
 * transforming one cold can take a few seconds when the machine is busy. (The
 * one wait that must be quick, the next page's H1 while its scene chunk is
 * held back, keeps its own 1s bound.)
 */
const CHUNK_LOAD = { timeout: 10_000 };

/** An IntersectionObserver that reports every observed element fully in view, so each slot loads and plays. */
class InViewObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    const entry = { target, isIntersecting: true, intersectionRatio: 1, rootBounds: { height: 800 }, intersectionRect: { height: 320 } };
    this.callback([entry as unknown as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', InViewObserver);
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ token: '1.test' }), { status: 200 })));
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** The division's service routes as App.tsx declares them: one route per slug, one element type. */
function renderServiceRoutes(start: string) {
  return render(
    <MemoryRouter initialEntries={[divisionServicePath(start)]}>
      <Routes>
        {DIVISION_SERVICE_SLUGS.map((slug) => (
          <Route key={slug} path={divisionServicePath(slug)} element={<SocialEngineeringServiceRoute slug={slug} />} />
        ))}
      </Routes>
    </MemoryRouter>,
  );
}

const heroScene = (container: HTMLElement, slug: string) => container.querySelector(`main > section [data-page-scene="${slug}"]`);
const headline = (slug: string) => findDivisionService(slug)!.headline;

/** Follows the page's own link to another service (the "Works best alongside" list), as a reader does. */
function clickServiceLink(container: HTMLElement, slug: string) {
  const link = [...container.querySelectorAll(`main a[href="${divisionServicePath(slug)}"]`)].pop();
  expect(link, `a link to ${slug}`).toBeDefined();
  fireEvent.click(link!);
}

describe('moving between service pages', () => {
  it('mirrors App.tsx, which renders every service route with the same element type', () => {
    const app = readFileSync(path.resolve(__dirname, '../../App.tsx'), 'utf8');
    expect(app).toMatch(
      /DIVISION_SERVICE_SLUGS\.map\(\(slug\) => \(\s*<Route key=\{slug\} path=\{divisionServicePath\(slug\)\} element=\{<SocialEngineeringServiceRoute slug=\{slug\} \/>\} \/>/,
    );
  });

  it('shows the next page at once while its scene chunk is still loading, then its scene', async () => {
    const { container } = renderServiceRoutes('social-media');
    await waitFor(() => expect(heroScene(container, 'social-media')?.querySelector('[data-scene]')).toBeTruthy(), CHUNK_LOAD);

    clickServiceLink(container, 'marketing');
    // The page changes straight away; the scene's box holds its place.
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(headline('marketing')), { timeout: 1000 });
    const slot = heroScene(container, 'marketing')!.querySelector('[data-scene-slot]');
    expect(slot).not.toBeNull();
    expect(['waiting', 'loading']).toContain(slot!.getAttribute('data-scene-slot'));
    expect(heroScene(container, 'marketing')!.querySelector('[data-scene]')).toBeNull();

    await act(async () => marketingChunk.release());
    await waitFor(() => expect(heroScene(container, 'marketing')!.querySelector('[data-scene]')).not.toBeNull(), CHUNK_LOAD);
  }, 30_000);

  it('gives the next page its own scene after a scene failed on the previous one', async () => {
    const { container } = renderServiceRoutes('brand-development');
    await waitFor(() => expect(heroScene(container, 'brand-development')?.querySelector('[data-scene-slot="failed"]')).toBeTruthy(), CHUNK_LOAD);

    clickServiceLink(container, 'integration');
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(headline('integration')));
    await waitFor(() => expect(heroScene(container, 'integration')!.querySelector('[data-scene]')).not.toBeNull(), CHUNK_LOAD);
    expect(container.querySelector('[data-scene-slot="failed"]')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  }, 30_000);
});
