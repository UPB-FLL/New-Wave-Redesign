import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TrustBar from './TrustBar';

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

const serviceCardAccents = ['#31C6CF', '#62BE68'];

function expectServiceCardSurface(card: HTMLElement, index: number) {
  const accent = serviceCardAccents[index % serviceCardAccents.length];

  expect(card).toHaveClass('rounded-2xl', 'border');
  expect(card).toHaveStyle({
    background: 'rgba(26, 47, 63, 0.8)',
    borderColor: `${accent}40`,
    boxShadow: `0 2px 12px ${accent}10`,
    color: 'var(--nw-mist-gray)',
  });
}

describe('TrustBar layout', () => {
  it('normalizes legacy five-item CMS content to the approved six-card layout', () => {
    vi.mocked(useContent).mockReturnValue({
      items: JSON.stringify([
        { icon: 'Shield', label: 'SOC 2 Type II', sub: 'Audited and certified' },
        { icon: 'Award', label: 'Microsoft Gold', sub: 'Cloud solutions partner' },
        { icon: 'Users', label: 'Cisco Premier', sub: 'Network solutions' },
        { icon: 'Star', label: 'CompTIA', sub: 'Authorized partner' },
        { icon: 'TrendingUp', label: 'HIPAA Compliant', sub: 'Healthcare ready' },
      ]),
    });

    render(
      <MemoryRouter>
        <TrustBar />
      </MemoryRouter>,
    );

    expect(screen.getAllByTestId('trusted-proof-card')).toHaveLength(6);
    expect(screen.getByText('24/7 Support')).toBeInTheDocument();
    expect(screen.getByText('Always available')).toBeInTheDocument();
  });

  it('uses balanced six-card grids without changing the carousel height', async () => {
    render(
      <MemoryRouter>
        <TrustBar />
      </MemoryRouter>,
    );

    const viewport = screen.getByTestId('carousel-viewport');
    expect(viewport).toHaveAttribute('data-stable-height', 'true');
    expect(viewport).toHaveClass('h-[660px]', 'sm:h-[620px]', 'lg:h-[500px]');

    const trustedGrid = screen.getByTestId('trusted-proof-grid');
    expect(trustedGrid).toHaveClass('mx-auto', 'w-full', 'max-w-5xl', 'grid-cols-2', 'md:grid-cols-3');
    expect(screen.getAllByTestId('trusted-proof-card')).toHaveLength(6);
    expect(screen.getByText('24/7 Support')).toBeInTheDocument();
    expect(screen.getByText('Always available')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 3' }));

    const cards = await waitFor(() => screen.getAllByTestId('trust-service-card'));
    const servicesGrid = screen.getByTestId('services-slide-grid');
    expect(servicesGrid).toHaveClass('mx-auto', 'w-full', 'max-w-5xl', 'grid-cols-2', 'md:grid-cols-3');
    expect(cards).toHaveLength(6);
    cards.forEach((card) => expect(card).toHaveClass('h-full'));
    expect(cards.map((card) => card.getAttribute('href'))).toEqual([
      '/service-category/cybersecurity',
      '/service-category/live-it-support',
      '/service-category/it-repair-upgrades',
      '/service-category/managed-it-services',
      '/service-category/cloud-solutions',
      '/service-category/network-infrastructure',
    ]);
  });

  it('uses white slide backgrounds and service-style dark cards throughout the carousel', async () => {
    render(
      <MemoryRouter>
        <TrustBar />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('trusted-slide')).toHaveClass('bg-[var(--nw-pure-white)]');
    screen.getAllByTestId('trusted-proof-card').forEach((card, index) => {
      expectServiceCardSurface(card, index);
      expect(card).toHaveClass('flex', 'items-center');
    });
    expect(screen.getAllByTestId('partner-logo-tile')).toHaveLength(6);

    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 2' }));
    const toolCards = await waitFor(() => screen.getAllByTestId('trust-tool-card'));
    expect(screen.getByTestId('tools-slide')).toHaveClass('bg-[var(--nw-pure-white)]');
    expect(screen.getByTestId('tools-slide-grid')).toHaveClass(
      'mx-auto',
      'w-full',
      'max-w-5xl',
      'grid-cols-2',
      'md:grid-cols-4',
      'md:auto-rows-[104px]',
      'lg:auto-rows-[108px]',
    );
    expect(toolCards).toHaveLength(8);
    expect(screen.getByText('Azure & Entra ID')).toBeInTheDocument();
    toolCards.forEach((card) => expect(card).toHaveClass('items-center'));
    screen.getAllByTestId('trust-tool-title').forEach((title) => {
      expect(title).toHaveClass('overflow-hidden', 'text-ellipsis', 'whitespace-nowrap');
    });
    screen.getAllByTestId('trust-tool-role').forEach((role) => {
      expect(role).toHaveClass('h-8', 'overflow-hidden');
    });
    const toolIcons = screen.getAllByTestId('trust-tool-icon');
    expect(toolIcons).toHaveLength(8);
    toolIcons.forEach((icon, index) => {
      const expectedAccent = index % 2 === 0 ? '#31C6CF' : '#62BE68';
      expect(icon).toHaveStyle({ background: `${expectedAccent}25`, color: expectedAccent });
    });
    toolCards.forEach(expectServiceCardSurface);

    fireEvent.click(screen.getByRole('button', { name: 'Go to slide 3' }));
    const serviceCards = await waitFor(() => screen.getAllByTestId('trust-service-card'));
    expect(screen.getByTestId('services-slide')).toHaveClass('bg-[var(--nw-pure-white)]');
    expect(screen.getByTestId('services-slide-grid')).toHaveClass('md:auto-rows-[112px]', 'lg:auto-rows-[112px]');
    expect(serviceCards).toHaveLength(6);
    serviceCards.forEach((card, index) => {
      expectServiceCardSurface(card, index);
      expect(card).toHaveClass('justify-center', 'sm:items-center');
    });
    screen.getAllByTestId('trust-service-title').forEach((title) => {
      expect(title).toHaveClass('overflow-hidden', 'text-ellipsis', 'whitespace-nowrap');
    });
    screen.getAllByTestId('trust-service-blurb').forEach((blurb) => {
      expect(blurb).toHaveClass('h-8', 'overflow-hidden');
    });
  });
});
