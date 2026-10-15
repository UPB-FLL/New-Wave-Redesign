import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePageMeta } from '../lib/usePageMeta';
import { useContent } from '../lib/useContent';
import CookiePolicyPage from './CookiePolicyPage';
import PrivacyPolicyPage from './PrivacyPolicyPage';
import TermsAndConditionsPage from './TermsAndConditionsPage';

vi.mock('../lib/usePageMeta', () => ({ usePageMeta: vi.fn() }));
vi.mock('../lib/useContent', () => ({ useContent: vi.fn() }));
vi.mock('../components/Navbar', () => ({ default: () => <nav aria-label="Primary">Navigation</nav> }));
vi.mock('../components/Footer', () => ({ default: () => <footer>Footer</footer> }));

const { default: Footer } = await vi.importActual<typeof import('../components/Footer')>('../components/Footer');

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useContent).mockReturnValue({});
});

describe('Footer legal links', () => {
  it('links to every public legal policy when CMS URLs are absent', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    [
      { name: 'Privacy Policy', href: '/privacy-policy' },
      { name: 'Terms and Conditions', href: '/terms-and-conditions' },
      { name: 'Cookie Policy', href: '/cookie-policy' },
    ].forEach(({ name, href }) => {
      const link = screen.getByRole('link', { name });
      expect(link).toHaveAttribute('href', href);
      expect(link).toHaveClass('text-[var(--nw-mist-gray)]', 'hover:text-[var(--nw-signal-cyan)]');
      expect(link).not.toHaveClass('text-white/30', 'hover:text-white/60');
      expect(link.style.color).toBe('');
      expect(link.parentElement).toHaveClass('pb-16', 'sm:pb-0');
    });
  });
});

describe('TermsAndConditionsPage', () => {
  it('identifies the operator, service-document precedence, and governing venue', () => {
    render(
      <MemoryRouter>
        <TermsAndConditionsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Terms and Conditions' })).toBeInTheDocument();
    expect(screen.getByText(/New Wave IT LLC/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Paid Services and Service Agreements/i })).toBeInTheDocument();
    expect(screen.getByText(/If a signed service agreement conflicts.*will control/i)).toBeInTheDocument();
    expect(screen.queryByText(/\$100/)).not.toBeInTheDocument();
    expect(screen.queryByText(/six months immediately before/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Broward County, Florida/i)).toBeInTheDocument();
    expect(screen.getByText('Effective date: August 11, 2026')).toBeInTheDocument();
    expect(screen.getByText(/710 NW 5th Ave, Suite 1072/)).toBeInTheDocument();
    expect(screen.getByText(/Fort Lauderdale, FL 33311/)).toBeInTheDocument();
    expect(vi.mocked(usePageMeta)).toHaveBeenCalledWith({
      title: 'Terms and Conditions — New Wave IT',
      description: 'Terms governing the New Wave IT website and IT services provided by New Wave IT LLC.',
      canonical: 'https://www.newwaveitfl.com/terms-and-conditions',
      breadcrumbs: [{ name: 'Terms and Conditions', path: '/terms-and-conditions' }],
    });
  });
});

describe('PrivacyPolicyPage', () => {
  it('discloses information, active providers, and bounded retention', () => {
    render(
      <MemoryRouter>
        <PrivacyPolicyPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Information We Collect/i })).toBeInTheDocument();
    expect(screen.getByText(/Vercel Analytics/i)).toBeInTheDocument();
    expect(screen.queryByText(/Elfsight/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Twilio/i)).toBeInTheDocument();
    expect(screen.getByText(/SuperOps/i)).toBeInTheDocument();
    expect(screen.getByText(/unless a law requires continued retention or deletion cannot be completed immediately because of backup or system constraints/i)).toBeInTheDocument();
    expect(screen.queryByText(/securely retain information when those purposes no longer require it/i)).not.toBeInTheDocument();
    expect(screen.getByText(/does not sell sensitive personal data/i)).toBeInTheDocument();
    expect(screen.getByText(/Pexels and its content-delivery provider Cloudflare/i)).toBeInTheDocument();
    expect(screen.getByText(/screen website submissions for spam and automated abuse/i)).toBeInTheDocument();
    expect(screen.getByText(/opt out of marketing email at any time/i)).toBeInTheDocument();
    const gpcSection = screen.getByRole('heading', { name: 'Do Not Track and Global Privacy Control' }).closest('section');
    expect(gpcSection).not.toHaveTextContent(/we honor/i);
    expect(gpcSection).toHaveTextContent(/does not respond to browser Do Not Track signals/i);
    expect(gpcSection).toHaveTextContent(/current practices described in this Policy do not involve the sale or sharing of personal information for cross-context behavioral advertising, so a Global Privacy Control signal does not presently change how this website behaves/i);
    expect(gpcSection).toHaveTextContent(/support@newwaveitfl\.com/i);
    expect(screen.getByText('Effective date: October 15, 2026')).toBeInTheDocument();
    expect(screen.getByText(/710 NW 5th Ave, Suite 1072/)).toBeInTheDocument();
    expect(screen.getByText(/Fort Lauderdale, FL 33311/)).toBeInTheDocument();
    expect(vi.mocked(usePageMeta)).toHaveBeenCalledWith({
      title: 'Privacy Policy — New Wave IT',
      description: 'How New Wave IT LLC collects, uses, discloses, and protects personal information.',
      canonical: 'https://www.newwaveitfl.com/privacy-policy',
      breadcrumbs: [{ name: 'Privacy Policy', path: '/privacy-policy' }],
    });
  });
});

describe('CookiePolicyPage', () => {
  it('states the U.S. scope, inactive analytics, the scanned inventory, and legal contact', () => {
    render(
      <MemoryRouter>
        <CookiePolicyPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Cookie Policy' })).toBeInTheDocument();
    expect(screen.getByText(/Google Analytics is not currently active/i)).toBeInTheDocument();
    expect(screen.getByText(/website and services are offered only in the United States/i)).toBeInTheDocument();
    expect(screen.getByText(/support@newwaveitfl\.com/i)).toBeInTheDocument();
    expect(screen.getByText('Effective date: October 15, 2026')).toBeInTheDocument();
    // The inventory lists what the production scan found: every first-party storage key,
    // the cookieless analytics, Pexels' Cloudflare cookies, and Google Fonts. The Elfsight chat
    // widget was removed from the site on October 15, 2026 and must not reappear in the inventory.
    expect(screen.getByText(/last scanned the live website on October 15, 2026/i)).toBeInTheDocument();
    ['nw_content_v2:*', 'nwit.support.portal, nwit.support.chat', 'nw-chunk-reload-at', 'Vercel Web Analytics', '__cf_bm, _cfuvid', 'Google Fonts'].forEach(
      (technology) => expect(screen.getByRole('rowheader', { name: technology })).toBeInTheDocument(),
    );
    expect(screen.getByText(/Visitors are identified by a hash of the request, which Vercel discards after 24 hours/i)).toBeInTheDocument();
    expect(screen.queryByText(/Elfsight/i)).not.toBeInTheDocument();
    expect(screen.getByText(/We do not use a chat widget/i)).toBeInTheDocument();
    expect(screen.getByText(/we do not show a cookie consent banner/i)).toBeInTheDocument();
    expect(screen.getByText(/Do Not Track/)).toBeInTheDocument();
    // Never describe a technology as active that the site does not load.
    expect(screen.queryByText(/Elfsight.*is active/i)).not.toBeInTheDocument();
    expect(screen.getByText(/710 NW 5th Ave, Suite 1072/)).toBeInTheDocument();
    expect(screen.getByText(/Fort Lauderdale, FL 33311/)).toBeInTheDocument();
    expect(vi.mocked(usePageMeta)).toHaveBeenCalledWith({
      title: 'Cookie Policy — New Wave IT',
      description: 'How New Wave IT uses cookies, storage, analytics, and embedded technologies on its website.',
      canonical: 'https://www.newwaveitfl.com/cookie-policy',
      breadcrumbs: [{ name: 'Cookie Policy', path: '/cookie-policy' }],
    });
  });
});
