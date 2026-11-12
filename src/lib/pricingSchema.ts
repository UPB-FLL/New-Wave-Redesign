// The JSON-LD /pricing hands to usePageMeta: the price list as an OfferCatalog.
// Pure data, no React or DOM. Names and prices come from the rows the page
// shows, never from PUBLISHED_RATES, so the schema and the table cannot state
// different prices; the constant only supplies the wording for one unit.

import { SITE_URL } from './pageMeta.js';
import { publishedRateFor, type PricedUnit } from './publishedRates.js';
import { BUSINESS_ID } from './structuredData.js';

export const PRICE_LIST_ID = `${SITE_URL}/pricing#price-list`;

/** A price-list row as the page holds it: the name already trimmed, cost_per_unit in cents. */
export type PriceListUnit = PricedUnit & { description?: string };

/**
 * One Offer per row, sold by the business the shell declares (#business).
 * Each price is for one unit for one month: the UnitPriceSpecification gives
 * the month (unitCode MON) and referenceQuantity says what one unit is. No
 * totals, ratings or reviews. A page without rows passes no node at all.
 */
export function priceListJsonLd(units: readonly PriceListUnit[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    '@id': PRICE_LIST_ID,
    name: 'New Wave IT monthly rates',
    url: `${SITE_URL}/pricing`,
    numberOfItems: units.length,
    itemListElement: units.map((unit) => {
      const price = Number(unit.cost_per_unit) / 100;
      return {
        '@type': 'Offer',
        name: unit.name,
        ...(unit.description ? { description: unit.description } : {}),
        price,
        priceCurrency: 'USD',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price,
          priceCurrency: 'USD',
          unitCode: 'MON',
          unitText: 'per month',
          // A row the published rates do not know is counted by its own name.
          referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitText: publishedRateFor(unit.name)?.per ?? unit.name },
        },
        seller: { '@id': BUSINESS_ID },
      };
    }),
  };
}
