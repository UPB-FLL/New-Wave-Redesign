// The quote builder says "not configured" only about a price list it has
// read: never while the read is under way, and never for a read that failed.

import { act, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DynamicPricingBuilder from './DynamicPricingBuilder';
import { seedPricingUnits, type PricingUnit } from '../lib/pricingUnits';

const db = vi.hoisted(() => ({ order: vi.fn() }));
vi.mock('../lib/supabase', () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ order: db.order }) }) }) },
}));

const NOT_CONFIGURED = 'Pricing units are not configured yet.';

const UNITS: PricingUnit[] = [
  { id: 'u1', name: 'Employees ', description: 'Cost per employee/user account', cost_per_unit: 500, min_quantity: 1, max_quantity: 10000 },
  { id: 'u2', name: 'Computers', description: 'Cost per computer/device', cost_per_unit: 10500, min_quantity: 1, max_quantity: 3 },
];

type ReadResult = { data: PricingUnit[] | null; error: unknown };

/** Renders the builder with its read still under way; the returned function finishes it. */
function renderLoading() {
  let finish!: (result: ReadResult) => void;
  db.order.mockReturnValueOnce(new Promise<ReadResult>((resolve) => (finish = resolve)));
  const view = render(<DynamicPricingBuilder />);
  return { ...view, finish: (result: ReadResult) => act(async () => finish(result)) };
}

beforeEach(() => {
  db.order.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  seedPricingUnits(null);
  vi.restoreAllMocks();
});

describe('DynamicPricingBuilder', () => {
  it('shows nothing while the price list is loading', async () => {
    const { container, finish } = renderLoading();
    expect(container.innerHTML).toBe('');
    expect(screen.queryByText(NOT_CONFIGURED)).toBeNull();
    // Finished here so the shared read is not left open for the next test.
    await finish({ data: [], error: null });
  });

  it('says the price list is not configured once a read comes back empty', async () => {
    const { finish } = renderLoading();
    await finish({ data: [], error: null });
    expect(screen.getByText(NOT_CONFIGURED)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Select your options' })).toBeNull();
  });

  it('says the list could not be loaded when the read fails, not that it is empty', async () => {
    const { finish } = renderLoading();
    await finish({ data: null, error: { message: 'offline' } });
    expect(screen.queryByText(NOT_CONFIGURED)).toBeNull();
    expect(screen.getByText(/could not be loaded/)).toBeInTheDocument();
  });

  it('builds the estimate from the units it read, with names trimmed', async () => {
    const { finish } = renderLoading();
    await finish({ data: UNITS, error: null });

    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['Employees', 'Computers']);
    expect(screen.getByText('$105.00')).toBeInTheDocument();
    const estimate = () => screen.getByText('Your first-look estimate').nextElementSibling?.textContent;
    expect(estimate()).toBe('$0.00');

    fireEvent.click(screen.getByRole('button', { name: 'Increase Computers quantity' }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase Employees quantity' }));
    expect(estimate()).toBe('$110.00');

    // A quantity stays within the unit's maximum.
    fireEvent.change(screen.getByLabelText('Computers quantity'), { target: { value: '50' } });
    expect(screen.getByLabelText('Computers quantity')).toHaveValue(3);
    expect(estimate()).toBe('$320.00');
  });

  it('renders the builder from the build’s seed, with no read', () => {
    seedPricingUnits(UNITS);
    const html = renderToString(<DynamicPricingBuilder />);
    expect(html).toContain('Select your options');
    expect(html).toMatch(/<h3[^>]*>Employees<\/h3>/);
    expect(html).not.toContain(NOT_CONFIGURED);
    expect(db.order).not.toHaveBeenCalled();
  });

  it('renders nothing in a static render without a seed, or with a seed that has no rows', () => {
    expect(renderToString(<DynamicPricingBuilder />)).toBe('');
    seedPricingUnits([]);
    expect(renderToString(<DynamicPricingBuilder />)).toBe('');
  });
});
