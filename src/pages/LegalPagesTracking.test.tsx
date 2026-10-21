// The policies when a build sets the Google tag IDs: they must describe the tags
// and the Global Privacy Control / Do Not Track behavior that analytics.ts enforces.
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../lib/usePageMeta', () => ({ usePageMeta: vi.fn() }));
vi.mock('../lib/analytics', () => ({
  ANALYTICS_ACTIVE: true,
  ADS_ACTIVE: true,
  ANALYTICS_CONFIG: { ga4Id: 'G-TEST123', adsId: 'AW-123456', adsLeadLabel: 'Lead_1' },
}));

const { default: CookiePolicyPage } = await import('./CookiePolicyPage');
const { default: PrivacyPolicyPage } = await import('./PrivacyPolicyPage');

describe('policies with Google Analytics and Google Ads active', () => {
  it('Cookie Policy lists the Google cookies and the opt-out signals, and drops the no-cookie claims', () => {
    render(<MemoryRouter><CookiePolicyPage /></MemoryRouter>);
    expect(screen.getByRole('rowheader', { name: '_ga, _ga_*' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: '_gcl_au, _gcl_aw' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Google Analytics and Google Ads' })).toBeInTheDocument();
    expect(screen.getByText(/We honor browser/i)).toBeInTheDocument();
    expect(screen.queryByText(/sets no cookies of its own/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/we do not show a cookie consent banner/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Google Analytics is not currently active/i)).not.toBeInTheDocument();
  });

  it('Privacy Policy discloses ads sharing and honors GPC and Do Not Track', () => {
    render(<MemoryRouter><PrivacyPolicyPage /></MemoryRouter>);
    expect(screen.getByText(/Google Ads conversion tracking shares the visit/i)).toBeInTheDocument();
    const gpc = screen.getByRole('heading', { name: 'Do Not Track and Global Privacy Control' }).closest('section');
    expect(gpc).toHaveTextContent(/honors Global Privacy Control and browser Do Not Track signals/i);
    expect(gpc).not.toHaveTextContent(/does not respond to browser Do Not Track signals/i);
    expect(screen.queryByText(/does not use or share personal information for targeted/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Google Analytics is planned but remains disabled/i)).not.toBeInTheDocument();
  });
});
