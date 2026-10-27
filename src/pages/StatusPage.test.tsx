import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { STATUS_SERVICES, statusHost, statusServices } from '../lib/statusPages';
import { useContent } from '../lib/useContent';
import StatusPage from './StatusPage';

vi.mock('../lib/useContent', () => ({ useContent: vi.fn(() => ({})) }));
vi.mock('../lib/usePageMeta', () => ({ usePageMeta: () => undefined }));
vi.mock('../components/Navbar', () => ({ default: () => null }));
vi.mock('../components/Footer', () => ({ default: () => null }));

afterEach(() => vi.mocked(useContent).mockImplementation(() => ({})));

function renderPage(status: Record<string, string> = {}) {
  vi.mocked(useContent).mockImplementation((section: string) => (section === 'status' ? status : {}));
  return render(
    <MemoryRouter>
      <StatusPage />
    </MemoryRouter>,
  );
}

const links = (container: HTMLElement) => [...container.querySelectorAll<HTMLAnchorElement>('main a[target="_blank"]')];

describe('/status', () => {
  it("links each service to its provider's own status page and states no status of its own", () => {
    const { container } = renderPage();
    expect(links(container).map((a) => a.getAttribute('href'))).toEqual(STATUS_SERVICES.map((s) => s.url));
    for (const a of links(container)) {
      expect(a.getAttribute('rel')).toBe('noopener noreferrer');
      expect(a.textContent).toContain('(opens in a new tab)');
    }
    // Production printed made-up uptimes, "Last checked: 2 min ago", and Spectrum "Degraded".
    expect(container.textContent).not.toMatch(/uptime|last checked|last updated|operational|degraded|real-time|every 5 minutes|\d+(\.\d+)?%/i);
    expect([...container.querySelectorAll('h2')].map((h) => h.textContent)).toEqual(['Cloud services', 'Internet providers', 'Something not working?']);
    expect(container.querySelector('main a[href="/support"]')?.textContent).toBe('Get support');
  });

  it('shows the domain each link opens', () => {
    expect(STATUS_SERVICES.map((s) => statusHost(s.url))).toEqual([
      'status.cloud.microsoft', 'google.com', 'health.aws.amazon.com', 'slack-status.com', 'zoomstatus.com',
      'status.salesforce.com', 'status.hubspot.com', 'status.stripe.com', 'verizon.com', 'att.com', 'spectrum.net',
    ]);
  });

  it("takes the CMS's list, linking entries stored in the old shape by name", () => {
    const stored = JSON.stringify([
      { name: 'Microsoft 365', category: 'saas', status: 'operational', uptime: 99.95, lastChecked: '2 min ago' },
      { name: 'Comcast', category: 'isp', status: 'operational', uptime: 99.7, lastChecked: '5 min ago' },
      { name: 'Dropbox', category: 'saas', url: 'https://status.dropbox.com/' },
      { name: 'Bad link', category: 'saas', url: 'javascript:alert(1)' },
      { name: 'Plain http', category: 'isp', url: 'http://example.com/status' },
      { name: 'No category', url: 'https://example.com/status' },
    ]);
    const { container } = renderPage({ services: stored });
    expect(links(container).map((a) => [a.textContent?.replace('(opens in a new tab)', ''), a.getAttribute('href')])).toEqual([
      ['Microsoft 365status.cloud.microsoft', 'https://status.cloud.microsoft/'],
      ['Dropboxstatus.dropbox.com', 'https://status.dropbox.com/'],
    ]);
    // No internet provider is left, so that group is not drawn.
    expect(container.textContent).not.toContain('Internet providers');
    expect(container.innerHTML).not.toContain('javascript:');
  });

  it('falls back to the built-in list when the stored one is unreadable or empty', () => {
    expect(statusServices('not json')).toBe(STATUS_SERVICES);
    expect(statusServices('{"name":"x"}')).toBe(STATUS_SERVICES);
    expect(statusServices('[{"name":"Comcast","category":"isp"}]')).toBe(STATUS_SERVICES);
    expect(statusServices(undefined)).toBe(STATUS_SERVICES);
  });

  it('uses the CMS headline and lede when set', () => {
    const { container } = renderPage({ headline: 'Provider status', subheadline: 'Check here first.' });
    expect(container.querySelector('h1')?.textContent).toBe('Provider status');
    expect(container.querySelector('header')?.textContent).toContain('Check here first.');
  });
});
