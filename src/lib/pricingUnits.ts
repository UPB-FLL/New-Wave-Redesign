import { useEffect, useState } from 'react';
import type { PricingUnit } from './publishedRates';
import { supabase } from './supabase';

export type { PricingUnit };

// The admin's names carry stray spaces ("Employees "); a description may be null.
const tidy = (unit: PricingUnit): PricingUnit => ({
  ...unit,
  name: String(unit.name ?? '').trim(),
  description: String(unit.description ?? '').trim(),
  cost_per_unit: Number(unit.cost_per_unit),
});

/**
 * The price list fixed for a build-time render. The prerender (vite.config.ts)
 * seeds it with the rows it read, so /pricing's static HTML carries the price
 * table; a browser never sets it. Same pattern as seedContentCache.
 */
let seededUnits: PricingUnit[] | null = null;

export function seedPricingUnits(units: readonly PricingUnit[] | null): void {
  seededUnits = units ? units.map(tidy) : null;
}

export function readSeededPricingUnits(): PricingUnit[] | null {
  return seededUnits;
}

async function loadPricingUnits(): Promise<PricingUnit[]> {
  const { data, error } = await supabase
    .from('pricing_units')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return ((data ?? []) as PricingUnit[]).map(tidy);
}

let inFlight: Promise<PricingUnit[]> | null = null;

/**
 * The active units in the admin's order. Callers that ask while a read is
 * under way share it: the pricing page and its quote builder mount together
 * and make one request, not two.
 */
export function fetchPricingUnits(): Promise<PricingUnit[]> {
  inFlight ??= loadPricingUnits()
    .catch((error: unknown) => {
      console.error('Failed to fetch pricing units:', error);
      throw error;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export interface PricingUnitsState {
  units: PricingUnit[];
  /**
   * loading: no read has finished, so an empty list says nothing yet.
   * loaded: the list is the price list, even when it is empty.
   * failed: the read failed; the list is whatever was there before.
   */
  status: 'loading' | 'loaded' | 'failed';
}

/**
 * The price list for a page. It starts from the build's seed when there is
 * one (the static render), otherwise empty and loading, and then reads the
 * table as the quote builder always has. A seed with no rows counts as not
 * read, so static HTML never states that the price list is empty.
 */
export function usePricingUnits(): PricingUnitsState {
  const [state, setState] = useState<PricingUnitsState>(() => {
    const seeded = readSeededPricingUnits();
    return seeded?.length ? { units: seeded, status: 'loaded' } : { units: [], status: 'loading' };
  });

  useEffect(() => {
    let cancelled = false;
    fetchPricingUnits().then(
      (units) => {
        if (!cancelled) setState({ units, status: 'loaded' });
      },
      () => {
        if (!cancelled) setState((previous) => ({ units: previous.units, status: 'failed' }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
