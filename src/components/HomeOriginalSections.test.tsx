import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Services from './Services';

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
  it('keeps the original animated Cybersecurity bento and a two-card industry row', () => {
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
    expect(within(cyberCard).getByText('24/7')).toBeInTheDocument();
    expect(cyberCard).not.toHaveTextContent(/500\+|99\.9%/);
    expect(within(cyberCard).getByTestId('cybersecurity-beam')).toHaveAttribute('data-motion', 'animated');

    expect(screen.getAllByTestId('supporting-service-card')).toHaveLength(5);
    expect(screen.getByRole('heading', { name: /Industry-specific solutions/i })).toBeInTheDocument();
    const industryGrid = screen.getByTestId('industry-service-grid');
    expect(industryGrid).toHaveClass('md:grid-cols-2', 'items-stretch');
    expect(screen.getAllByTestId('industry-service-card')).toHaveLength(2);
    expect(screen.queryByTestId('other-specialties')).toBeNull();
    expect(screen.queryByRole('link', { name: /Luxury|Cellular DAS/i })).toBeNull();
    screen.getAllByTestId('industry-service-card').forEach((card) => {
      expect(within(card).getByRole('link')).toHaveClass('h-full', 'min-h-[16rem]', 'sm:min-h-[17.25rem]');
    });
    expect(screen.getAllByRole('link', { name: /Family Offices/i })[0]).toHaveAttribute('href', '/service-category/family-offices');
  });

  it('lists Luxury and Cellular DAS as other specialties on the services page only', () => {
    render(
      <MemoryRouter>
        <Services showOtherSpecialties />
      </MemoryRouter>,
    );
    const other = screen.getByTestId('other-specialties');
    expect(within(other).getByRole('link', { name: 'Luxury' })).toHaveAttribute('href', '/service-category/luxury');
    expect(within(other).getByRole('link', { name: 'Cellular DAS & Public Safety' })).toHaveAttribute(
      'href',
      '/service-category/cellular-das-and-public-safety',
    );
  });
});
