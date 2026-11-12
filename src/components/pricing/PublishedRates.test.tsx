import { render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PublishedRates, RATES_NOTE, RATES_QUESTION } from './PublishedRates';
import type { PricingUnit } from '../../lib/pricingUnits';
import { ratesSentence } from '../../lib/publishedRates';

const unit = (id: string, name: string, description: string, cents: number): PricingUnit => ({
  id,
  name,
  description,
  cost_per_unit: cents,
  min_quantity: 1,
  max_quantity: 1000,
});

// The live price list of 2026-11-12, in the admin's order, names as the page holds them (trimmed).
const PRICE_LIST = [
  unit('u1', 'Employees', 'Cost per employee/user account', 500),
  unit('u2', 'Server', 'Managed Server', 17500),
  unit('u3', 'Computers', 'Cost per computer/device', 10500),
  unit('u4', 'Location Network Monitoring', 'Cost per physical location', 5000),
  unit('u5', 'Office 365 - Licensing Only', 'Cost per email address account', 3200),
  unit('u6', 'Office 365 - Licensing and Email', '', 3800),
];

const rows = (container: HTMLElement) =>
  [...container.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((cell) => cell.textContent));

describe('PublishedRates', () => {
  it('asks the question in an h2 and answers it in one paragraph with every rate', () => {
    const { container } = render(<PublishedRates units={PRICE_LIST} />);

    expect([...container.querySelectorAll('h1, h2, h3, h4')].map((heading) => `${heading.tagName}:${heading.textContent}`)).toEqual([`H2:${RATES_QUESTION}`]);
    expect(RATES_QUESTION).toMatch(/\?$/);
    const paragraphs = [...container.querySelectorAll('p')].map((paragraph) => paragraph.textContent);
    expect(paragraphs).toEqual([`${ratesSentence()} ${RATES_NOTE}`]);
    for (const price of ['$105', '$5', '$175', '$50', '$32', '$38']) expect(paragraphs[0]).toContain(`${price} per `);
    expect(paragraphs[0]).toMatch(/not a total/);
    expect(paragraphs[0]).toMatch(/written quote/);
  });

  it('lists every unit in a real table: caption, column and row headers, what it covers, the monthly price', () => {
    const { container } = render(<PublishedRates units={PRICE_LIST} />);
    const table = container.querySelector('table');

    expect(container.querySelectorAll('table')).toHaveLength(1);
    expect(table?.querySelector('caption')?.textContent).toMatch(/monthly rates in US dollars/);
    expect([...container.querySelectorAll('thead th')].map((th) => [th.getAttribute('scope'), th.textContent])).toEqual([
      ['col', 'Item'],
      ['col', 'What it covers'],
      ['col', 'Price per month'],
    ]);
    expect([...container.querySelectorAll('tbody th')].every((th) => th.getAttribute('scope') === 'row')).toBe(true);
    expect(rows(container)).toEqual([
      ['Employees', 'Cost per employee/user account', '$5'],
      ['Server', 'Managed Server', '$175'],
      ['Computers', 'Cost per computer/device', '$105'],
      ['Location Network Monitoring', 'Cost per physical location', '$50'],
      ['Office 365 - Licensing Only', 'Cost per email address account', '$32'],
      // No description on the price list: what one unit is, from the published rates.
      ['Office 365 - Licensing and Email', 'Cost per account', '$38'],
    ]);
  });

  it('shows the table alone when a price on the list no longer matches the published rates', () => {
    const changed = PRICE_LIST.map((row) => (row.name === 'Computers' ? { ...row, cost_per_unit: 11000 } : row));
    const { container } = render(<PublishedRates units={changed} />);

    expect(container.querySelector('h2')?.textContent).toBe(RATES_QUESTION);
    expect(container.querySelectorAll('p')).toHaveLength(0);
    expect(container.textContent).not.toContain('$105');
    expect(rows(container)[2]).toEqual(['Computers', 'Cost per computer/device', '$110']);
  });

  it('shows the table alone when the list gains or loses a unit', () => {
    const extra = render(<PublishedRates units={[...PRICE_LIST, unit('u7', 'Backup storage', '', 1999)]} />);
    expect(extra.container.querySelectorAll('p')).toHaveLength(0);
    expect(rows(extra.container)[6]).toEqual(['Backup storage', '', '$19.99']);
    extra.unmount();

    const fewer = render(<PublishedRates units={PRICE_LIST.slice(0, 4)} />);
    expect(fewer.container.querySelectorAll('p')).toHaveLength(0);
    expect(rows(fewer.container)).toHaveLength(4);
  });

  it('renders nothing without units', () => {
    const { container } = render(<PublishedRates units={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('is plain markup in a server render: no script, no chip, nothing hidden', () => {
    const html = renderToString(<PublishedRates units={PRICE_LIST} />);
    expect(html).toContain('<table');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('rounded-full');
    expect(html).not.toMatch(/opacity:\s*0[;"]/);
  });
});
