// The published monthly rates, written once for the copy that quotes them.
//
// The price list itself is the Supabase table pricing_units, edited in the
// admin. A sentence cannot read a table, so pages that state a price in prose
// take it from PUBLISHED_RATES, and ratesDiffer() names every place the
// constant and the table no longer agree: the build warns with that list, and
// /pricing drops the sentences that state a rate until they agree again (its table is
// always the table's own rows). Pure data, no React or DOM: vite.config.ts
// imports it at build time.

/** What a rate is charged for. */
export type RateKey = 'computer' | 'user' | 'server' | 'location' | 'microsoft365License' | 'microsoft365LicenseWithEmail';

export type PublishedRate = {
  /** US dollars for one unit, per month. */
  dollars: number;
  /** The pricing_units row this rate restates, by its name there. */
  unitName: string;
  /** What one unit is, as it reads after "per": "$105 per computer or device". */
  per: string;
};

/**
 * The six rates on the price list (docs/geo/fact-sheet.md, section 5). The
 * two licensing rows are named "Office 365" on the list; the first is
 * described there as per email address account, and the second has no
 * description, so it is taken to be counted the same way.
 */
export const PUBLISHED_RATES: Readonly<Record<RateKey, PublishedRate>> = {
  computer: { dollars: 105, unitName: 'Computers', per: 'computer or device' },
  user: { dollars: 5, unitName: 'Employees', per: 'employee or user account' },
  server: { dollars: 175, unitName: 'Server', per: 'managed server' },
  location: { dollars: 50, unitName: 'Location Network Monitoring', per: 'location' },
  microsoft365License: { dollars: 32, unitName: 'Office 365 - Licensing Only', per: 'account' },
  microsoft365LicenseWithEmail: { dollars: 38, unitName: 'Office 365 - Licensing and Email', per: 'account' },
};

/** "$105", "$1,299", "$32.50": whole dollars without cents, anything else with both digits. */
export function usd(dollars: number): string {
  const cents = Math.round(dollars * 100);
  const whole = Math.trunc(cents / 100).toLocaleString('en-US');
  const rest = cents % 100;
  return rest ? `$${whole}.${String(rest).padStart(2, '0')}` : `$${whole}`;
}

/**
 * The rates in one sentence, each with its unit. It states monthly rates per
 * unit, never a total, so it is true for a business of any size.
 */
export function ratesSentence(): string {
  const rate = (key: RateKey) => `${usd(PUBLISHED_RATES[key].dollars)} per ${PUBLISHED_RATES[key].per}`;
  return (
    `New Wave IT's published monthly rates are ${rate('computer')}, ${rate('user')}, ${rate('server')}, ` +
    `and ${rate('location')} for network monitoring, with Office 365 at ${rate('microsoft365License')} ` +
    `for licensing only and ${rate('microsoft365LicenseWithEmail')} for licensing and email.`
  );
}

/** The two fields of a pricing_units row a rate is checked against. */
export type PricedUnit = {
  name: string;
  /** Cents for one unit, per month. */
  cost_per_unit: number;
};

/**
 * One row of the published price list (Supabase table pricing_units). Declared
 * here, in the module without imports, so the build's reader can name it
 * without loading the browser Supabase client; pricingUnits.ts re-exports it.
 */
export interface PricingUnit extends PricedUnit {
  id: string;
  description: string;
  min_quantity: number;
  max_quantity: number;
}

// The admin's names carry stray spaces ("Employees ") and may change case.
const nameKey = (name: string) => name.trim().toLowerCase();

/** The published rate a price-list row restates, matched on its name; undefined for a row the constant does not know. */
export function publishedRateFor(unitName: string): PublishedRate | undefined {
  return Object.values(PUBLISHED_RATES).find((rate) => nameKey(rate.unitName) === nameKey(unitName));
}

/**
 * Every difference between PUBLISHED_RATES and a set of price-list rows
 * (cost_per_unit in cents), one sentence each: a rate whose row is missing, a
 * row at another price, and a row the constant does not list. Empty when
 * they agree.
 */
export function ratesDiffer(units: readonly PricedUnit[]): string[] {
  const differences: string[] = [];
  for (const rate of Object.values(PUBLISHED_RATES)) {
    const rows = units.filter((unit) => nameKey(unit.name) === nameKey(rate.unitName));
    if (!rows.length) differences.push(`"${rate.unitName}" is ${usd(rate.dollars)} in publishedRates.ts and is not on the price list.`);
    for (const row of rows) {
      if (Math.round(Number(row.cost_per_unit)) === Math.round(rate.dollars * 100)) continue;
      differences.push(`"${rate.unitName}" is ${usd(rate.dollars)} in publishedRates.ts and ${usd(Number(row.cost_per_unit) / 100)} on the price list.`);
    }
  }
  for (const unit of units) {
    if (publishedRateFor(unit.name)) continue;
    differences.push(`"${unit.name.trim()}" (${usd(Number(unit.cost_per_unit) / 100)}) is on the price list and not in publishedRates.ts.`);
  }
  return differences;
}
