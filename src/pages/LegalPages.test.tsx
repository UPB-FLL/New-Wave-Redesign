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
    expect(screen.getByText(/Elfsight/i)).toBeInTheDocument();
    expect(screen.getByText(/Twilio/i)).toBeInTheDocument();
    expect(screen.getByText(/SuperOps/i)).toBeInTheDocument();
    expect(screen.getByText(/unless a law requires continued retention or deletion cannot be completed immediately because of backup or system constraints/i)).toBeInTheDocument();
    expect(screen.queryByText(/securely retain information when those purposes no longer require it/i)).not.toBeInTheDocument();
    const gpcSection = screen.getByRole('heading', { name: 'Global Privacy Control' }).closest('section');
    expect(gpcSection).not.toHaveTextContent(/we honor/i);
    expect(gpcSection).toHaveTextContent(/current practices described in this Policy do not involve the sale or sharing of personal information for cross-context behavioral advertising, so a Global Privacy Control signal does not presently change how this website behaves/i);
    expect(gpcSection).toHaveTextContent(/support@newwaveitfl\.com/i);
    expect(screen.getByText('Effective date: August 11, 2026')).toBeInTheDocument();
    expect(screen.getByText(/710 NW 5th Ave, Suite 1072/)).toBeInTheDocument();
    expect(screen.getByText(/Fort Lauderdale, FL 33311/)).toBeInTheDocument();
    expect(vi.mocked(usePageMeta)).toHaveBeenCalledWith({
      title: 'Privacy Policy — New Wave IT',
      description: 'How New Wave IT LLC collects, uses, discloses, and protects personal information.',
      canonical: 'https://www.newwaveitfl.com/privacy-policy',
    });
  });
});

describe('CookiePolicyPage', () => {
  it('states the U.S. scope, inactive analytics, and legal contact', () => {
    render(
      <MemoryRouter>
        <CookiePolicyPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Cookie Policy' })).toBeInTheDocument();
    expect(screen.getByText(/Google Analytics is not currently active/i)).toBeInTheDocument();
    expect(screen.getByText(/website and services are offered only in the United States/i)).toBeInTheDocument();
    expect(screen.getByText(/support@newwaveitfl\.com/i)).toBeInTheDocument();
    expect(screen.getByText('Effective date: August 11, 2026')).toBeInTheDocument();
    expect(screen.getByText(/710 NW 5th Ave, Suite 1072/)).toBeInTheDocument();
    expect(screen.getByText(/Fort Lauderdale, FL 33311/)).toBeInTheDocument();
    expect(vi.mocked(usePageMeta)).toHaveBeenCalledWith({
      title: 'Cookie Policy — New Wave IT',
      description: 'How New Wave IT uses cookies, storage, analytics, and embedded technologies on its website.',
      canonical: 'https://www.newwaveitfl.com/cookie-policy',
    });
  });
});
