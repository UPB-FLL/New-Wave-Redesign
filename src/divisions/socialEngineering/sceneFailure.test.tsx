// A line-art scene is decorative: when its chunk fails to load (a flaky
// network, or a tab still on an old deploy), the page keeps its content and
// the scene's empty 3:2 box, and never falls through to the route's
// "This page didn't load" boundary. Its own file, because the failing scene
// modules are mocked for the whole file.

import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { contactContent, hubContent } from './content';
import { SocialEngineeringContactRoute, SocialEngineeringHubRoute } from './routes';

// The contact scene's import rejects, as a failed chunk request does.
vi.mock('./motion/scenes/ContactDiscoveryScene', () => {
  throw new TypeError('Failed to fetch dynamically imported module: /assets/ContactDiscoveryScene-stale.js');
});
// The hub scene's import resolves without a component, as Vite's does once the
// stale-chunk reload (main.tsx) has already been used this session.
vi.mock('./motion/scenes/HubGrowthScene', () => ({ default: undefined }));
vi.mock('../../lib/useContent', () => ({ useContent: vi.fn(() => ({})) }));

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

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', InViewObserver);
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ token: '1.test' }), { status: 200 })));
  // React reports errors its boundaries catch; the failure is the point here.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

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
    await waitFor(() => expect(failedBox(container, 'contact')).not.toBeNull());
    const box = failedBox(container, 'contact')!;
    expect(box).toHaveAttribute('aria-hidden', 'true');
    expect(box.style.aspectRatio).toBe('3 / 2');
    expect(container.querySelector('[data-page-scene="contact"] [data-scene]')).toBeNull();

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(contactContent.headline);
    expect(container.querySelector('form')).not.toBeNull();
    expect(screen.getByRole('button', { name: /Send message/ })).toBeInTheDocument();
  });

  it('leaves its empty box in the hub hero, and the rest of the hub, band scene included, renders', async () => {
    const { container } = render(
      <MemoryRouter>
        <SocialEngineeringHubRoute />
      </MemoryRouter>,
    );
    await waitFor(() => expect(failedBox(container, 'hub')).not.toBeNull());
    expect(failedBox(container, 'hub')!.style.aspectRatio).toBe('3 / 2');

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(hubContent.headline);
    // The other scene on the page is unaffected.
    await waitFor(() => expect(container.querySelector('[data-page-scene="hubSection"] [data-scene]')).not.toBeNull());
  });
});
