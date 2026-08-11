import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CookiePolicyPage from './CookiePolicyPage';
import PrivacyPolicyPage from './PrivacyPolicyPage';
import TermsAndConditionsPage from './TermsAndConditionsPage';

vi.mock('../lib/usePageMeta', () => ({ usePageMeta: vi.fn() }));
vi.mock('../components/Navbar', () => ({ default: () => <nav aria-label="Primary">Navigation</nav> }));
vi.mock('../components/Footer', () => ({ default: () => <footer>Footer</footer> }));

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
    expect(screen.getByText(/signed.*service agreement.*control/i)).toBeInTheDocument();
    expect(screen.getByText(/Broward County, Florida/i)).toBeInTheDocument();
  });
});

describe('PrivacyPolicyPage', () => {
  it('discloses the information collected and the active service providers', () => {
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
  });
});

describe('CookiePolicyPage', () => {
  it('states that Google Analytics is inactive and provides the legal contact', () => {
    render(
      <MemoryRouter>
        <CookiePolicyPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Cookie Policy' })).toBeInTheDocument();
    expect(screen.getByText(/Google Analytics is not currently active/i)).toBeInTheDocument();
    expect(screen.getByText(/support@newwaveitfl\.com/i)).toBeInTheDocument();
  });
});
