import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { GROUNDSWELL_BRAND } from '../../../groundswell/brand';
import { GROUNDSWELL_PATH } from '../../../groundswell/site';
import { divisionServices } from '../content';
import { DIVISION_BASE_PATH, DIVISION_GROUNDSWELL_PATH, DIVISION_NAME, divisionServicePath } from '../site';
import { DivisionFooter } from './DivisionFooter';
import { DivisionHeader } from './DivisionHeader';

vi.mock('../../../lib/useContent', () => ({ useContent: vi.fn(() => ({})) }));

function renderHeader(path = DIVISION_BASE_PATH) {
  return render(<MemoryRouter initialEntries={[path]}><DivisionHeader /></MemoryRouter>);
}

describe('GroundSwell division navigation', () => {
  it('keeps the division identity and separates the engine from the existing partner workspace', () => {
    renderHeader(`${DIVISION_GROUNDSWELL_PATH}/`);
    const nav = screen.getByRole('navigation', { name: DIVISION_NAME });
    const desktop = nav.querySelector('[data-role="desktop-links"]') as HTMLElement;
    const engine = within(desktop).getByRole('link', { name: 'GroundSwell' });
    expect(engine).toHaveAttribute('href', DIVISION_GROUNDSWELL_PATH);
    expect(engine).toHaveAttribute('aria-current', 'page');
    expect(engine.querySelector('img')).toHaveAttribute('src', GROUNDSWELL_BRAND.favicon);
    expect(screen.getByRole('link', { name: `${DIVISION_NAME} home` })).toHaveAttribute('href', DIVISION_BASE_PATH);
    expect(screen.getByRole('link', { name: 'Powered by GroundSwell' })).toHaveAttribute('href', DIVISION_GROUNDSWELL_PATH);
    expect(screen.getByRole('link', { name: 'Partner workspace' })).toHaveAttribute('href', GROUNDSWELL_PATH);
  });

  it('gives each service a readable summary, its own route, and a current page state', () => {
    const current = divisionServices[2];
    renderHeader(`${divisionServicePath(current.slug)}/`);
    const trigger = screen.getByRole('button', { name: 'Headway' });
    fireEvent.click(trigger);
    const panel = document.getElementById('nwse-services-menu')!;
    divisionServices.forEach((service) => {
      const link = within(panel).getByRole('link', { name: service.navLabel });
      expect(link).toHaveAttribute('href', divisionServicePath(service.slug));
      expect(link).toHaveTextContent(service.cardSummary);
      expect(link).toHaveAccessibleDescription(service.cardSummary);
      if (service === current) expect(link).toHaveAttribute('aria-current', 'page');
    });
    act(() => within(panel).getByRole('link', { name: current.navLabel }).focus());
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.getElementById('nwse-services-menu')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('provides the same engine and workspace destinations in the mobile menu, and restores focus on Escape', () => {
    renderHeader(`${DIVISION_GROUNDSWELL_PATH}/`);
    const toggle = screen.getByRole('button', { name: 'Open menu' });
    fireEvent.click(toggle);
    const menu = document.getElementById('nwse-mobile-menu')!;
    const engine = within(menu).getByRole('link', { name: 'GroundSwell' });
    expect(engine).toHaveAttribute('href', DIVISION_GROUNDSWELL_PATH);
    expect(engine).toHaveAttribute('aria-current', 'page');
    const workspace = within(menu).getByRole('link', { name: 'Existing partner workspace' });
    expect(workspace).toHaveAttribute('href', GROUNDSWELL_PATH);
    expect(workspace).toHaveClass('min-h-11');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.getElementById('nwse-mobile-menu')).toBeNull();
    expect(toggle).toHaveFocus();
  });

  it('releases the page when enlarged-text navigation becomes desktop navigation', () => {
    let onResize: (() => void) | undefined;
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: () => void) { onResize = callback; }
      observe() {}
      disconnect() {}
    });
    try {
      renderHeader();
      const toggle = screen.getByRole('button', { name: 'Open menu' });
      fireEvent.click(toggle);
      expect(document.documentElement.style.overflow).toBe('hidden');
      toggle.style.display = 'none';
      act(() => onResize?.());
      expect(document.getElementById('nwse-mobile-menu')).toBeNull();
      expect(document.documentElement.style.overflow).not.toBe('hidden');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('makes the footer engine handoff explicit and preserves both family home links', () => {
    render(<MemoryRouter><DivisionFooter /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'GroundSwell connects the work.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore GroundSwell' })).toHaveAttribute('href', DIVISION_GROUNDSWELL_PATH);
    expect(screen.getByRole('link', { name: /Already a partner\?\s*Open partner workspace/ })).toHaveAttribute('href', GROUNDSWELL_PATH);
    expect(screen.getByRole('link', { name: `${DIVISION_NAME} home` })).toHaveAttribute('href', DIVISION_BASE_PATH);
    expect(screen.getByRole('link', { name: 'New Wave IT home' })).toHaveAttribute('href', '/');
  });
});
