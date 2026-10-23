import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { divisionServices } from '../content';
import { GroundswellEngine } from './GroundswellEngine';

describe('GroundSwell inside the division', () => {
  it('explains the existing engine phases without starting a run or reading client accounts', () => {
    const request = vi.spyOn(globalThis, 'fetch');
    render(<MemoryRouter><GroundswellEngine /></MemoryRouter>);
    const engine = screen.getByRole('region', { name: 'One engine. A clearer next move.' });
    const tabs = within(engine).getAllByRole('tab');
    expect(tabs.map(tab => tab.textContent)).toEqual(['Growth audit', 'Competitor plan', 'Integrated plan']);
    expect(within(engine).getByRole('tabpanel')).toHaveTextContent('No client account access is needed');
    fireEvent.click(tabs[1]);
    expect(within(engine).getByRole('tabpanel')).toHaveTextContent('The team reviews the plan before work or campaign changes begin.');
    fireEvent.click(tabs[2]);
    expect(within(engine).getByRole('tabpanel')).toHaveTextContent('Client account data is read only after the accounts are connected.');
    expect(engine).not.toHaveTextContent(/\b(?:Step|Phase)\s+\d/);
    expect(request).not.toHaveBeenCalled();
    request.mockRestore();
  });

  it('keeps keyboard selection, evidence, and outputs together', () => {
    render(<MemoryRouter><GroundswellEngine /></MemoryRouter>);
    const tabs = screen.getAllByRole('tab');
    fireEvent.keyDown(tabs[0], { key: 'End' });
    expect(tabs[2]).toHaveFocus();
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveTextContent('Authorized analytics and search data');
    expect(panel).toHaveTextContent('Revised costs and forecasts');
    fireEvent.keyDown(tabs[2], { key: 'Home' });
    expect(tabs[0]).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('The full audit and ranked changes');
  });

  it('takes visitors to the real example and existing private workspace', () => {
    render(<MemoryRouter><GroundswellEngine /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'See a real audit' })).toHaveAttribute('href', '/social-engineering/groundswell#sample');
    expect(screen.getByRole('link', { name: 'Open the partner workspace' })).toHaveAttribute('href', '/groundswell');
    expect(screen.getByRole('link', { name: 'Explore the GroundSwell engine' })).toHaveAttribute('href', '/social-engineering/groundswell');
  });

  it.each(divisionServices)('connects $navLabel to the same engine with a service-specific application', service => {
    render(<MemoryRouter><GroundswellEngine service={service} /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(`${service.navLabel}, informed by GroundSwell.`);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('region')).toHaveTextContent('team');
  });
});
