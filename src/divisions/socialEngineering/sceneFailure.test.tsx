// A line-art scene is decorative: when its chunk fails to load (a flaky
// network, or a tab still on an old deploy), the page keeps its content and
// the scene's empty 3:2 box, never falls through to the route's "This page
// didn't load" boundary, and never reloads the page (which would wipe a
// half-filled form). Its own file, because the failing scene modules are
// mocked for the whole file.

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadDecorativeChunk } from '../../lib/chunkReload';
import { nextTask } from '../../test/vitePreload';
import { contactContent, hubContent } from './content';
import { SocialEngineeringContactRoute, SocialEngineeringHubRoute } from './routes';

// The contact scene's import rejects, as a failed chunk request does.
vi.mock('./motion/scenes/ContactDiscoveryScene', () => {
  throw new TypeError('Failed to fetch dynamically imported module: /assets/ContactDiscoveryScene-stale.js');
});
// The hub scene's module loads but has no component (a broken build).
vi.mock('./motion/scenes/HubGrowthScene', () => ({ default: undefined }));
vi.mock('../../lib/useContent', () => ({ useContent: vi.fn(() => ({})) }));
// In production Vite wraps every import() in its preload helper, so the
// registry's loadDecorativeChunk(() => import('./X')) receives
// () => __vitePreload(() => import('./X')). Vitest does not, so wrap it here:
// a failed scene chunk then reaches main.tsx's listener as it does in a build.
vi.mock('../../lib/chunkReload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/chunkReload')>();
  const { vitePreload } = await import('../../test/vitePreload');
  return {
    ...actual,
    loadDecorativeChunk: vi.fn(<T,>(load: () => Promise<T>) => actual.loadDecorativeChunk(() => vitePreload(load) as Promise<T>)),
  };
});
vi.mock('../../App.tsx', () => ({ default: () => null }));

// main.tsx's real `vite:preloadError` listener (App is mocked out).
beforeAll(async () => {
  const root = document.createElement('div');
  root.id = 'root';
  document.body.appendChild(root);
  await import('../../main');
});

/** An IntersectionObserver that reports every observed element in view, so each slot loads its scene. */
class InViewObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    this.callback([{ target, isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

/**
 * For a wait that includes loading a lazy chunk (the route's page or a scene):
 * transforming one cold can take a few seconds when the machine is busy.
 */
const CHUNK_LOAD = { timeout: 10_000 };

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal('IntersectionObserver', InViewObserver);
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ token: '1.test' }), { status: 200 })));
  // React reports errors its boundaries catch; the failure is the point here.
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

/** True once main.tsx's listener has reloaded the page (jsdom logs location.reload() as an unimplemented navigation). */
const reloaded = () =>
  sessionStorage.getItem('nw-chunk-reload-at') !== null ||
  consoleError.mock.calls.some((args) => args.some((arg) => /not implemented: navigation/i.test(String((arg as Error)?.message ?? arg))));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const failedBox = (container: HTMLElement, key: string) =>
  container.querySelector(`[data-page-scene="${key}"] [data-scene-slot="failed"]`) as HTMLElement | null;

describe('a scene that fails to load', () => {
  it('leaves its empty box on the contact page, which keeps its H1 and form', async () => {
    const { container } = render(
      <MemoryRouter>
        <SocialEngineeringContactRoute />
      </MemoryRouter>,
    );
    // Half-filled while the scene loads.
    await waitFor(() => expect(container.querySelector('#contact-name')).not.toBeNull(), CHUNK_LOAD);
    const name = container.querySelector('#contact-name') as HTMLInputElement;
    fireEvent.change(name, { target: { value: 'Jane typed this' } });
    await waitFor(() => expect(failedBox(container, 'contact')).not.toBeNull(), CHUNK_LOAD);
    await nextTask();
    // The failure went through main.tsx's listener, as a chunk failure does in a build, and did not reload.
    expect(vi.mocked(loadDecorativeChunk)).toHaveBeenCalled();
    expect(reloaded()).toBe(false);
    expect(name).toHaveValue('Jane typed this');
    const box = failedBox(container, 'contact')!;
    expect(box).toHaveAttribute('aria-hidden', 'true');
    expect(box.style.aspectRatio).toBe('3 / 2');
    expect(container.querySelector('[data-page-scene="contact"] [data-scene]')).toBeNull();

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(contactContent.headline);
    expect(container.querySelector('form')).not.toBeNull();
    expect(screen.getByRole('button', { name: /Send message/ })).toBeInTheDocument();
  }, 30_000);

  it('leaves its empty box in the hub hero, and the rest of the hub, band scene included, renders', async () => {
    const { container } = render(
      <MemoryRouter>
        <SocialEngineeringHubRoute />
      </MemoryRouter>,
    );
    await waitFor(() => expect(failedBox(container, 'hub')).not.toBeNull(), CHUNK_LOAD);
    expect(failedBox(container, 'hub')!.style.aspectRatio).toBe('3 / 2');
    expect(reloaded()).toBe(false);

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(hubContent.headline);
    // The other scene on the page is unaffected.
    await waitFor(() => expect(container.querySelector('[data-page-scene="hubSection"] [data-scene]')).not.toBeNull(), CHUNK_LOAD);
  }, 30_000);
});
