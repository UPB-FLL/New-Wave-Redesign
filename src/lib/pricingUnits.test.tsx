import { act, render, renderHook, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPricingUnits, readSeededPricingUnits, seedPricingUnits, usePricingUnits, type PricingUnit } from './pricingUnits';

// The query chain the hook runs; `order` is the call that resolves it.
const db = vi.hoisted(() => {
  const order = vi.fn();
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { from, select, eq, order };
});
vi.mock('./supabase', () => ({ supabase: { from: db.from } }));

const row = (name: string, cents: number, description: string | null = ''): PricingUnit =>
  ({ id: name.trim().toLowerCase(), name, description, cost_per_unit: cents, min_quantity: 1, max_quantity: 100 }) as PricingUnit;

const STORED = [row('Employees ', 500, 'Cost per employee/user account'), row('Server', 17500, null)];
const TIDY = [row('Employees', 500, 'Cost per employee/user account'), row('Server', 17500, '')];

/** A read the test finishes by hand. */
function pendingRead() {
  let finish!: (result: { data: PricingUnit[] | null; error: unknown }) => void;
  db.order.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
  return (result: { data: PricingUnit[] | null; error: unknown }) => act(async () => finish(result));
}

function Probe() {
  const { units, status } = usePricingUnits();
  return <p>{`${status}:${units.map((unit) => unit.name).join('|')}`}</p>;
}

beforeEach(() => {
  db.order.mockReset();
  db.order.mockResolvedValue({ data: [], error: null });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  seedPricingUnits(null);
  vi.restoreAllMocks();
});

describe('seedPricingUnits', () => {
  it('holds the build’s rows with names and descriptions tidied, until cleared', () => {
    expect(readSeededPricingUnits()).toBeNull();
    seedPricingUnits(STORED);
    expect(readSeededPricingUnits()).toEqual(TIDY);
    seedPricingUnits(null);
    expect(readSeededPricingUnits()).toBeNull();
  });
});

describe('fetchPricingUnits', () => {
  it('reads the active units in the admin’s order and tidies them', async () => {
    db.order.mockResolvedValueOnce({ data: STORED, error: null });
    expect(await fetchPricingUnits()).toEqual(TIDY);
    expect(db.from).toHaveBeenCalledWith('pricing_units');
    expect(db.select).toHaveBeenCalledWith('*');
    expect(db.eq).toHaveBeenCalledWith('active', true);
    expect(db.order).toHaveBeenCalledWith('sort_order', { ascending: true });
  });

  it('shares one read between callers that ask while it is under way, then reads again', async () => {
    const [first, second] = [fetchPricingUnits(), fetchPricingUnits()];
    expect(second).toBe(first);
    await first;
    expect(db.order).toHaveBeenCalledTimes(1);
    await fetchPricingUnits();
    expect(db.order).toHaveBeenCalledTimes(2);
  });

  it('rejects, and logs once, when the read fails', async () => {
    const failure = { message: 'permission denied' };
    db.order.mockResolvedValueOnce({ data: null, error: failure });
    await expect(fetchPricingUnits()).rejects.toBe(failure);
    expect(console.error).toHaveBeenCalledTimes(1);
    // A failed read is not kept: the next caller reads again.
    await expect(fetchPricingUnits()).resolves.toEqual([]);
  });
});

describe('usePricingUnits', () => {
  it('starts empty and loading in a browser, then holds the price list', async () => {
    const finish = pendingRead();
    const { result } = renderHook(() => usePricingUnits());
    expect(result.current).toEqual({ units: [], status: 'loading' });
    await finish({ data: STORED, error: null });
    expect(result.current).toEqual({ units: TIDY, status: 'loaded' });
  });

  it('is loaded and empty only once a read has come back with no rows', async () => {
    const finish = pendingRead();
    const { result } = renderHook(() => usePricingUnits());
    expect(result.current.status).toBe('loading');
    await finish({ data: [], error: null });
    expect(result.current).toEqual({ units: [], status: 'loaded' });
  });

  it('says so when the read fails, and does not call the list empty', async () => {
    const finish = pendingRead();
    const { result } = renderHook(() => usePricingUnits());
    await finish({ data: null, error: { message: 'offline' } });
    expect(result.current).toEqual({ units: [], status: 'failed' });
  });

  it('makes one request for the page and the builder mounting together', async () => {
    const { container } = render(
      <>
        <Probe />
        <Probe />
      </>,
    );
    await waitFor(() => expect(container.textContent).toBe('loaded:loaded:'));
    expect(db.order).toHaveBeenCalledTimes(1);
  });

  it('renders the build’s seed on the server, where no effect runs', () => {
    seedPricingUnits(STORED);
    expect(renderToString(<Probe />)).toContain('loaded:Employees|Server');
    expect(db.order).not.toHaveBeenCalled();
  });

  it('treats no seed, and a seed without rows, as not read yet', () => {
    expect(renderToString(<Probe />)).toContain('loading:');
    seedPricingUnits([]);
    expect(renderToString(<Probe />)).toContain('loading:');
  });

  it('ignores a read that lands after the component is gone', async () => {
    const finish = pendingRead();
    const { result, unmount } = renderHook(() => usePricingUnits());
    unmount();
    await finish({ data: STORED, error: null });
    expect(result.current).toEqual({ units: [], status: 'loading' });
  });
});
