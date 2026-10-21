import { describe, expect, it } from 'vitest';
import { buildAdPlan } from '../src/adplan';
import { compareWithToday, ctrAt, rankChanges, type ChangeInput } from '../src/changes';
import { config } from './fixture';

// The fixture's team hour costs $100; organic CTR is 40 / 20 / 10 / 5 per cent for positions 1 to 4; no ramps.
const value = { per_customer: [100, 100, 100] as const, close: [0.5, 0.5, 0.5] as const, gross_margin: [0.5, 0.5, 0.5] as const, basis: 'test' };

const seo: ChangeInput = {
  id: 'seo',
  area: 'seo',
  title: 'Rank the events page',
  evidence: 'Not in the top results.',
  cost: { hours: [10, 10, 10], basis: 'test' },
  impact: { kind: 'ranking', curve: 'organic', monthly_searches: 1000, from_position: null, to_position: [4, 2, 1], visit_to_lead: [0.1, 0.1, 0.1], basis: 'test' },
  value,
};
const popups: ChangeInput = {
  id: 'popups',
  area: 'website',
  title: 'One step for age and cookies',
  evidence: 'Three layers before the page.',
  cost: { hours: [2, 2, 2], basis: 'test' },
  impact: { kind: 'not_modeled', reason: 'No published figure for the lift.' },
};
const lists: ChangeInput = { ...popups, id: 'lists', area: 'listings', title: 'Pitch the best-of lists', cost: { hours: [6, 6, 6], basis: 'test' } };
const speed: ChangeInput = {
  id: 'speed',
  area: 'website',
  title: 'Faster pages',
  evidence: 'Slow on phones.',
  cost: { hours: [5, 5, 5], monthly_hours: [1, 1, 1], basis: 'test' },
  impact: { kind: 'conversion', monthly_visits: 1000, visit_to_lead: [0.05, 0.05, 0.05], lift: [0.1, 0.2, 0.3], basis: 'test' },
  value,
};

describe('the click-through curve', () => {
  it('reads a position, and counts unranked or off-curve positions as no clicks', () => {
    expect(ctrAt([0.4, 0.2], 2)).toBe(0.2);
    expect(ctrAt([0.4, 0.2], null)).toBe(0);
    expect(ctrAt([0.4, 0.2], 7)).toBe(0);
  });
});

describe('ranking every change by return', () => {
  const ranked = rankChanges([lists, popups, speed, seo], config);
  const get = (id: string) => ranked.find((c) => c.id === id)!;

  it('models a ranking gain: 1,000 searches × 20 in 100 at position 2 × 1 in 10 → 20 leads → 10 customers → $500 a month', () => {
    const m = get('seo').scenarios!.medium;
    expect(m.customers_month).toBeCloseTo(10);
    expect(m.benefit_year).toBeCloseTo(500 * 12);
    expect(m.cost_year).toBe(1000); // 10 hours at $100
    expect(m.roi).toBeCloseTo(5);
  });

  it('models a conversion lift and counts a year of upkeep hours', () => {
    const m = get('speed').scenarios!.medium;
    expect(m.customers_month).toBeCloseTo(1000 * 0.05 * 0.2 * 0.5);
    expect(m.cost_year).toBe((5 + 12) * 100);
    expect(get('speed').hours).toBe(17);
  });

  it('puts modeled changes first by return, then unmodeled ones cheapest first, numbered', () => {
    expect(ranked.map((c) => [c.rank, c.id, c.modeled])).toEqual([
      [1, 'seo', true],
      [2, 'speed', true],
      [3, 'popups', false],
      [4, 'lists', false],
    ]);
    expect(get('popups').scenarios).toBeNull();
  });

  it('ranks an ad-plan row with its own spend in the cost', () => {
    const plan = buildAdPlan(
      [
        {
          id: 'events',
          name: 'Events',
          why: 'x',
          keywords: [{ keyword: 'e', monthly_searches: 1000, low_bid_usd: 2, high_bid_usd: 4 }],
          value: { per_customer: [1000, 1000, 1000], close: [0.5, 0.5, 0.5], gross_margin: [0.5, 0.5, 0.5], basis: 'x' },
          incrementality: 1,
          incrementality_basis: 'x',
        },
      ],
      { id: 't', label: 't', match: [], audit_platforms: [], ad_platforms: ['google_search'] },
      config
    );
    const row = plan.rows[0];
    const [ads] = rankChanges(
      [{ id: 'ads', area: 'ads', title: 'Search ads', evidence: 'x', cost: { hours: [4, 4, 4], basis: 'x' }, impact: { kind: 'ads', row } }],
      config
    );
    const m = ads.scenarios!.medium;
    expect(m.cost_year).toBeCloseTo(400 + row.scenarios.medium.spend * 12);
    expect(m.benefit_year).toBeCloseTo(row.scenarios.medium.year_net + row.scenarios.medium.spend * 12);
    expect(m.net_year).toBeCloseTo(row.scenarios.medium.year_net - 400);
  });
});

describe('today against the plan', () => {
  it('takes every modeled change that pays back in the medium case, and keeps unknown spend unknown', () => {
    const ranked = rankChanges([seo, speed, popups], config);
    const cmp = compareWithToday(ranked, { monthly_ad_spend: null, ad_spend_basis: 'Not public.' });
    // Speed: 5 customers a month × $50 margin × 12 = $3,000 for $1,700 of team time, so it is in; the pop-ups change is not modeled.
    expect(cmp.included).toEqual(['seo', 'speed']);
    expect(cmp.today.monthly_ad_spend).toBeNull();
    expect(cmp.with_plan.monthly_ad_spend).toBeNull();
    expect(cmp.with_plan.net_year.medium).toBeCloseTo(6000 - 1000 + (3000 - 1700));
    expect(cmp.with_plan.team_hours).toBe(10 + 17);
  });
});
