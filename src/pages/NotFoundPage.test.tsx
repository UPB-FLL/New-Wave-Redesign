import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { useContent, useContentWithStatus } from '../lib/useContent';
import ServiceDetailPage from './ServiceDetailPage';
import ThreatDetailPage from './ThreatDetailPage';

vi.mock('../lib/useContent', () => ({
  useContent: vi.fn(() => ({})),
  useContentWithStatus: vi.fn(() => ({ content: {}, loaded: false })),
}));
vi.mock('@vercel/analytics/react', () => ({ Analytics: () => null }));
vi.mock('../components/ElfsightChatbot', () => ({ default: () => null }));

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('scrollTo', () => {});
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
});
afterAll(() => vi.unstubAllGlobals());
afterEach(() => {
  vi.mocked(useContent).mockImplementation(() => ({}));
  vi.mocked(useContentWithStatus).mockImplementation(() => ({ content: {}, loaded: false }));
  window.history.replaceState({}, '', '/');
});

const robots = () => document.head.querySelector('meta[name="robots"]')?.getAttribute('content');

describe('unmatched URLs', () => {
  it.each(['/does-not-exist', '/services/typo', '/social-engineering/no-such-service'])(
    '%s renders a noindex "Page not found" page instead of a blank one',
    async (path) => {
      window.history.replaceState({}, '', path);
      render(<App />);

      expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
      await waitFor(() => expect(robots()).toBe('noindex, nofollow'));
      expect(document.title).toBe('Page not found | New Wave IT');
      expect(screen.getByRole('link', { name: /IT services/ })).toHaveAttribute('href', '/services');
    },
  );

  it('leaves real routes indexable', async () => {
    window.history.replaceState({}, '', '/pricing');
    render(<App />);
    await waitFor(() => expect(robots()).toBe('index, follow'));
    expect(screen.queryByRole('heading', { level: 1, name: 'Page not found' })).not.toBeInTheDocument();
  });
});

describe('CMS-driven detail pages', () => {
  const renderRoute = (pattern: string, path: string, element: React.ReactElement) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={pattern} element={element} />
        </Routes>
      </MemoryRouter>,
    );

  it.each([
    ['service', '/service/:slug', <ServiceDetailPage />, 'services-detail', 'services_list'],
    ['threat', '/threat/:slug', <ThreatDetailPage />, 'threats-detail', 'threats_list'],
  ] as const)('a %s slug stays indexable while content loads and goes noindex once it is known to be missing', async (_kind, pattern, element, section, key) => {
    const serve = (loaded: boolean, list?: object[]) =>
      vi.mocked(useContentWithStatus).mockImplementation((s: string) => ({ content: s === section && list ? { [key]: JSON.stringify(list) } : {}, loaded }));
    const at = pattern.replace(':slug', 'ransomware');

    serve(false);
    const loading = renderRoute(pattern, at, element);
    await waitFor(() => expect(robots()).toBe('index, follow'));
    loading.unmount();

    // Production today: the section loaded and has no entries at all.
    serve(true);
    const empty = renderRoute(pattern, at, element);
    await waitFor(() => expect(robots()).toBe('noindex, nofollow'));
    empty.unmount();

    serve(true, [{ name: 'Other', slug: 'other', description: 'x', features: [], benefits: [] }]);
    const missing = renderRoute(pattern, at, element);
    await waitFor(() => expect(robots()).toBe('noindex, nofollow'));
    missing.unmount();

    serve(true, [{ name: 'Ransomware', slug: 'ransomware', description: 'Encrypts files.', details: 'x', severity: 'HIGH', impact: 'x', mitigation_strategies: [], features: [], benefits: [], pricing_note: '' }]);
    renderRoute(pattern, at, element);
    await waitFor(() => expect(robots()).toBe('index, follow'));
  });
});
