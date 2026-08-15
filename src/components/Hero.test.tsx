import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Hero from './Hero';

const { navigate, reducedMotion } = vi.hoisted(() => ({
  navigate: vi.fn(),
  reducedMotion: vi.fn(),
}));

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return { ...actual, useReducedMotion: reducedMotion };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate };
});

vi.mock('../lib/useContent', () => ({ useContent: vi.fn() }));

vi.mock('./hero/HeroRibbonField', () => ({
  HeroRibbonField: ({
    disabled,
    onReady,
    onFailure,
  }: {
    disabled: boolean;
    onReady: () => void;
    onFailure: () => void;
  }) => (disabled ? null : (
    <div data-testid="hero-ribbon-field-mock">
      <canvas data-testid="hero-ribbon-canvas" aria-hidden="true" />
      <button type="button" onClick={onReady}>Signal first WebGL frame</button>
      <button type="button" onClick={onFailure}>Signal WebGL failure</button>
    </div>
  )),
}));

const { useContent } = await import('../lib/useContent');

function renderHero() {
  return render(
    <MemoryRouter>
      <Hero />
    </MemoryRouter>,
  );
}

describe('Hero', () => {
  beforeEach(() => {
    navigate.mockReset();
    reducedMotion.mockReturnValue(false);
    vi.mocked(useContent).mockReturnValue({});
  });

  it('preserves the default content, navigation, statistics, and hero structure', () => {
    renderHero();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Technology that keeps business moving.');
    const primary = screen.getByRole('button', { name: 'Request an assessment' });
    const secondary = screen.getByRole('button', { name: 'Get support' });
    expect(primary).toBeInTheDocument();
    expect(secondary).toBeInTheDocument();
    expect(screen.getByText('24/7')).toBeInTheDocument();
    expect(screen.getByText('Service and monitoring')).toBeInTheDocument();
    expect(screen.getByText('Certified')).toBeInTheDocument();
    expect(screen.getByText('Dedicated')).toBeInTheDocument();

    const section = screen.getByRole('heading', { level: 1 }).closest('section');
    expect(section).toHaveClass('min-h-[640px]', 'pb-16', 'pt-28', 'sm:min-h-[82vh]', 'sm:pb-20', 'sm:pt-32');

    fireEvent.click(primary);
    fireEvent.click(secondary);
    expect(navigate).toHaveBeenNthCalledWith(1, '/contact');
    expect(navigate).toHaveBeenNthCalledWith(2, '/support');
  });

  it('layers the fallback, canvas, veil, and foreground content in order', () => {
    renderHero();

    const fallback = screen.getByTestId('hero-current-fallback');
    const ribbonField = screen.getByTestId('hero-ribbon-field-mock');
    const veil = screen.getByTestId('hero-readability-veil');
    const section = screen.getByRole('heading', { level: 1 }).closest('section');
    if (!section) throw new Error('Hero section was not rendered');

    expect(section.children).toHaveLength(4);
    expect(section.children[0]).toBe(fallback);
    expect(section.children[1]).toBe(ribbonField);
    expect(section.children[2]).toBe(veil);
    expect(section.children[3]).toHaveClass('relative', 'z-10');

    expect(fallback).toHaveAttribute('aria-hidden', 'true');
    expect(fallback).toHaveClass(
      'transition-opacity',
      'duration-700',
      'motion-reduce:transition-none',
      'opacity-80',
    );
    const currentField = fallback.querySelector('[data-role="current-field"]');
    expect(currentField).toHaveAttribute('aria-hidden', 'true');
    expect(currentField).toHaveClass('h-full', 'w-full');
    expect(fallback.querySelectorAll('g')).toHaveLength(3);
    expect(Array.from(fallback.querySelectorAll('[data-role="current-field-stroke"]')).slice(0, 3).map((stroke) => stroke.getAttribute('stroke')))
      .toEqual(['#F7FBFA', '#F7FBFA', '#F7FBFA']);

    expect(veil).toHaveAttribute('aria-hidden', 'true');
    expect(veil).toHaveClass('pointer-events-none', 'absolute', 'inset-0');
    expect(veil.getAttribute('style')).toContain(
      'linear-gradient(90deg, rgba(9,19,29,0.96) 0%, rgba(9,19,29,0.78) 44%, rgba(9,19,29,0.18) 78%, rgba(9,19,29,0.08) 100%)',
    );
  });

  it('keeps the static field visible until WebGL is ready and unmounts a failed canvas', () => {
    const view = renderHero();

    const fallback = screen.getByTestId('hero-current-fallback');
    expect(fallback).toHaveClass('opacity-80');
    fireEvent.click(screen.getByRole('button', { name: 'Signal first WebGL frame' }));
    expect(fallback).toHaveClass('opacity-25');
    expect(screen.getByTestId('hero-ribbon-canvas')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Signal WebGL failure' }));
    expect(fallback).toHaveClass('opacity-80');
    expect(screen.queryByTestId('hero-ribbon-field-mock')).not.toBeInTheDocument();
    expect(screen.queryByTestId('hero-ribbon-canvas')).not.toBeInTheDocument();

    view.rerender(
      <MemoryRouter>
        <Hero />
      </MemoryRouter>,
    );
    expect(screen.queryByTestId('hero-ribbon-canvas')).not.toBeInTheDocument();
  });

  it('uses the CMS secondary action to scroll to services or navigate there when unavailable', () => {
    vi.mocked(useContent).mockReturnValue({ cta_secondary: 'Explore services' });
    const services = document.createElement('div');
    const scrollIntoView = vi.fn();
    services.id = 'services';
    Object.defineProperty(services, 'scrollIntoView', { value: scrollIntoView });
    document.body.append(services);
    const firstRender = renderHero();

    fireEvent.click(screen.getByRole('button', { name: 'Explore services' }));
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    expect(navigate).not.toHaveBeenCalled();

    firstRender.unmount();
    services.remove();
    renderHero();
    fireEvent.click(screen.getByRole('button', { name: 'Explore services' }));
    expect(navigate).toHaveBeenCalledWith('/services');
  });

  it('disables the ribbon field and restores the static fallback for reduced motion', () => {
    const view = renderHero();
    const fallback = screen.getByTestId('hero-current-fallback');
    fireEvent.click(screen.getByRole('button', { name: 'Signal first WebGL frame' }));
    expect(fallback).toHaveClass('opacity-25');

    reducedMotion.mockReturnValue(true);
    view.rerender(
      <MemoryRouter>
        <Hero />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('hero-ribbon-field-mock')).not.toBeInTheDocument();
    expect(fallback).toHaveClass('opacity-80');
  });

  it('renders custom CMS statistics', () => {
    vi.mocked(useContent).mockReturnValue({
      stats: '[{"value":"99.9%","label":"Uptime"},{"value":"15 min","label":"Response time"}]',
    });
    renderHero();

    expect(screen.getByText('99.9%')).toBeInTheDocument();
    expect(screen.getByText('Uptime')).toBeInTheDocument();
    expect(screen.getByText('15 min')).toBeInTheDocument();
    expect(screen.getByText('Response time')).toBeInTheDocument();
    expect(screen.queryByText('Service and monitoring')).not.toBeInTheDocument();
  });

  it('preserves default statistics when CMS statistics are malformed', () => {
    vi.mocked(useContent).mockReturnValue({ stats: 'not valid JSON' });
    renderHero();

    expect(screen.getByText('24/7')).toBeInTheDocument();
    expect(screen.getByText('Service and monitoring')).toBeInTheDocument();
    expect(screen.getByText('Certified')).toBeInTheDocument();
    expect(screen.getByText('Dedicated')).toBeInTheDocument();
  });
});
