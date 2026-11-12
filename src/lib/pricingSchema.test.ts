import { describe, expect, it } from 'vitest';
import { priceListJsonLd, PRICE_LIST_ID, type PriceListUnit } from './pricingSchema';

const units: PriceListUnit[] = [
  { name: 'Employees', description: 'Cost per employee/user account', cost_per_unit: 500 },
  { name: 'Server', description: 'Managed Server', cost_per_unit: 17500 },
  { name: 'Computers', description: 'Cost per computer/device', cost_per_unit: 10500 },
  { name: 'Office 365 - Licensing and Email', description: '', cost_per_unit: 3800 },
  { name: 'Backup storage', cost_per_unit: 1999 },
];

type Node = Record<string, unknown>;
const catalog = priceListJsonLd(units);
const offers = catalog.itemListElement as Node[];

describe('priceListJsonLd', () => {
  it('is one OfferCatalog for the pricing page', () => {
    expect(catalog).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'OfferCatalog',
      '@id': 'https://www.newwaveitfl.com/pricing#price-list',
      url: 'https://www.newwaveitfl.com/pricing',
      numberOfItems: units.length,
    });
    expect(PRICE_LIST_ID).toBe(catalog['@id']);
  });

  it('carries one Offer per row, in the rows’ order, priced in dollars', () => {
    expect(offers.map((offer) => [offer['@type'], offer.name, offer.price, offer.priceCurrency])).toEqual([
      ['Offer', 'Employees', 5, 'USD'],
      ['Offer', 'Server', 175, 'USD'],
      ['Offer', 'Computers', 105, 'USD'],
      ['Offer', 'Office 365 - Licensing and Email', 38, 'USD'],
      ['Offer', 'Backup storage', 19.99, 'USD'],
    ]);
  });

  it('prices each offer per month for one unit, and says what the unit is', () => {
    expect(offers[2].priceSpecification).toEqual({
      '@type': 'UnitPriceSpecification',
      price: 105,
      priceCurrency: 'USD',
      unitCode: 'MON',
      unitText: 'per month',
      referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitText: 'computer or device' },
    });
    const one = (offer: Node) => ((offer.priceSpecification as Node).referenceQuantity as Node).unitText;
    expect(offers.map(one)).toEqual(['employee or user account', 'managed server', 'computer or device', 'account', 'Backup storage']);
    for (const offer of offers) expect((offer.priceSpecification as Node).price).toBe(offer.price);
  });

  it('names the business the shell declares as the seller of every offer', () => {
    for (const offer of offers) expect(offer.seller).toEqual({ '@id': 'https://www.newwaveitfl.com/#business' });
  });

  it('keeps a row’s description and leaves the key out when the row has none', () => {
    expect(offers[0].description).toBe('Cost per employee/user account');
    expect('description' in offers[3]).toBe(false);
    expect('description' in offers[4]).toBe(false);
  });

  it('states no rating, review or product', () => {
    expect(JSON.stringify(catalog)).not.toMatch(/AggregateRating|Review|"Product"|ratingValue/);
  });
});
