import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Services from './Services';
import Stats from './Stats';

vi.mock('../lib/useContent', () => ({ useContent: vi.fn() }));

const { useContent } = await import('../lib/useContent');

beforeEach(() => {
  vi.mocked(useContent).mockReturnValue({});
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('original home-page sections', () => {
  it('keeps the compact four-metric proof strip', () => {
    render(<Stats />);

    const strip = screen.getByRole('region', { name: 'Operational proof points' });
    expect(strip.querySelectorAll('[data-role="proof-point"]')).toHaveLength(4);
    expect(screen.getByText('Avg Response Time')).toBeInTheDocument();
    expect(screen.getByText('Endpoints Managed')).toBeInTheDocument();
    expect(screen.getByText('Uptime Guarantee')).toBeInTheDocument();
    expect(screen.getByText('Years Serving South Florida')).toBeInTheDocument();
  });

  it('keeps the original animated Cybersecurity bento and four-card industry row', () => {
    render(
      <MemoryRouter>
        <Services />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /IT services built for modern business/i })).toBeInTheDocument();

    const serviceGrid = screen.getByTestId('service-bento-grid');
    expect(serviceGrid).toHaveClass('lg:grid-cols-3');

    const cyberCard = screen.getByTestId('cybersecurity-bento-card');
    expect(cyberCard).toHaveClass('md:col-span-2', 'lg:col-span-2', 'lg:row-span-2');
    expect(within(cyberCard).getByText('Your Business')).toBeInTheDocument();
    expect(within(cyberCard).getByText('New Wave SOC')).toBeInTheDocument();
    expect(within(cyberCard).getByText('Managed EDR & Antivirus')).toBeInTheDocument();
    expect(within(cyberCard).getByText('99.9%')).toBeInTheDocument();
    expect(within(cyberCard).getByTestId('cybersecurity-beam')).toHaveAttribute('data-motion', 'animated');

    expect(screen.getAllByTestId('supporting-service-card')).toHaveLength(5);
    expect(screen.getByRole('heading', { name: /Industry-specific solutions/i })).toBeInTheDocument();
    expect(screen.getByTestId('industry-service-grid')).toHaveClass('lg:grid-cols-4');
    expect(screen.getAllByTestId('industry-service-card')).toHaveLength(4);
    expect(screen.getAllByRole('link', { name: /Family Offices/i })[0]).toHaveAttribute('href', '/service-category/family-offices');
  });
});
