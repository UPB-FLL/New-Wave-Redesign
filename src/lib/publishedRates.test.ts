import { describe, expect, it } from 'vitest';
import { PUBLISHED_RATES, publishedRateFor, ratesDiffer, ratesSentence, usd, type PricedUnit } from './publishedRates';

// The price list as the live table returned it on 2026-11-12 (cost_per_unit in
// cents), stray space on "Employees " included.
const PRICE_LIST: PricedUnit[] = [
  { name: 'Employees ', cost_per_unit: 500 },
  { name: 'Server', cost_per_unit: 17500 },
  { name: 'Computers', cost_per_unit: 10500 },
  { name: 'Location Network Monitoring', cost_per_unit: 5000 },
  { name: 'Office 365 - Licensing Only', cost_per_unit: 3200 },
  { name: 'Office 365 - Licensing and Email', cost_per_unit: 3800 },
];

const without = (name: string) => PRICE_LIST.filter((unit) => unit.name !== name);
const priced = (name: string, cents: number) => PRICE_LIST.map((unit) => (unit.name === name ? { ...unit, cost_per_unit: cents } : unit));

describe('usd', () => {
  it('writes whole dollars without cents and anything else with both digits', () => {
    expect(usd(105)).toBe('$105');
    expect(usd(5)).toBe('$5');
    expect(usd(0)).toBe('$0');
    expect(usd(32.5)).toBe('$32.50');
    expect(usd(19.99)).toBe('$19.99');
    expect(usd(0.05)).toBe('$0.05');
    expect(usd(1299)).toBe('$1,299');
    expect(usd(1299.5)).toBe('$1,299.50');
  });
});

describe('PUBLISHED_RATES', () => {
  it('holds the six rates, each under the price-list name it restates', () => {
    expect(Object.keys(PUBLISHED_RATES)).toEqual(['computer', 'user', 'server', 'location', 'microsoft365License', 'microsoft365LicenseWithEmail']);
    expect(Object.fromEntries(Object.values(PUBLISHED_RATES).map((rate) => [rate.unitName, rate.dollars]))).toEqual({
      Computers: 105,
      Employees: 5,
      Server: 175,
      'Location Network Monitoring': 50,
      'Office 365 - Licensing Only': 32,
      'Office 365 - Licensing and Email': 38,
    });
  });

  it('finds the rate for a price-list name whatever its case or stray spaces', () => {
    expect(publishedRateFor('Employees ')).toBe(PUBLISHED_RATES.user);
    expect(publishedRateFor('  computers')).toBe(PUBLISHED_RATES.computer);
    expect(publishedRateFor('OFFICE 365 - LICENSING ONLY')).toBe(PUBLISHED_RATES.microsoft365License);
    expect(publishedRateFor('Backup storage')).toBeUndefined();
  });
});

describe('ratesSentence', () => {
  const sentence = ratesSentence();

  it('states every rate with its unit', () => {
    for (const rate of Object.values(PUBLISHED_RATES)) {
      expect(sentence).toContain(`${usd(rate.dollars)} per ${rate.per}`);
    }
    expect(sentence).toBe(
      "New Wave IT's published monthly rates are $105 per computer or device, $5 per employee or user account, " +
        '$175 per managed server, and $50 per location for network monitoring, with Office 365 at $32 per account ' +
        'for licensing only and $38 per account for licensing and email.',
    );
  });

  it('is one sentence of monthly per-unit rates, with no total and no promise', () => {
    expect(sentence.match(/[.!?](\s|$)/g)).toHaveLength(1);
    expect(sentence).toMatch(/monthly rates/);
    expect(sentence).not.toMatch(/total|starting at|from \$|contract|response|guarantee|best|trusted/i);
  });
});

describe('ratesDiffer', () => {
  it('finds nothing when the price list is the published rates, in any order', () => {
    expect(ratesDiffer(PRICE_LIST)).toEqual([]);
    expect(ratesDiffer([...PRICE_LIST].reverse())).toEqual([]);
  });

  it('matches a name with a trailing space or another case', () => {
    expect(PRICE_LIST[0].name).toBe('Employees ');
    expect(ratesDiffer(PRICE_LIST.map((unit) => ({ ...unit, name: ` ${unit.name.toUpperCase()} ` })))).toEqual([]);
  });

  it('names a rate whose price changed, with both prices', () => {
    expect(ratesDiffer(priced('Computers', 11000))).toEqual(['"Computers" is $105 in publishedRates.ts and $110 on the price list.']);
    expect(ratesDiffer(priced('Employees ', 550))).toEqual(['"Employees" is $5 in publishedRates.ts and $5.50 on the price list.']);
  });

  it('names a rate that is no longer on the price list', () => {
    expect(ratesDiffer(without('Server'))).toEqual(['"Server" is $175 in publishedRates.ts and is not on the price list.']);
    expect(ratesDiffer([])).toHaveLength(6);
  });

  it('names a row the published rates do not list', () => {
    expect(ratesDiffer([...PRICE_LIST, { name: 'Backup storage ', cost_per_unit: 2000 }])).toEqual([
      '"Backup storage" ($20) is on the price list and not in publishedRates.ts.',
    ]);
  });

  it('lists every difference at once', () => {
    const units = [...priced('Computers', 12000).filter((unit) => unit.name !== 'Server'), { name: 'Backup storage', cost_per_unit: 2000 }];
    expect(ratesDiffer(units)).toEqual([
      '"Computers" is $105 in publishedRates.ts and $120 on the price list.',
      '"Server" is $175 in publishedRates.ts and is not on the price list.',
      '"Backup storage" ($20) is on the price list and not in publishedRates.ts.',
    ]);
  });

  it('checks every row that carries a rate’s name', () => {
    expect(ratesDiffer([...PRICE_LIST, { name: 'computers', cost_per_unit: 9900 }])).toEqual([
      '"Computers" is $105 in publishedRates.ts and $99 on the price list.',
    ]);
  });

  it('reads a price PostgREST sent as text', () => {
    expect(ratesDiffer(PRICE_LIST.map((unit) => ({ ...unit, cost_per_unit: String(unit.cost_per_unit) as unknown as number })))).toEqual([]);
  });
});
