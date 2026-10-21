import { describe, expect, it } from 'vitest';
import type { AngleInput } from '../src/adplan';
import { bestPosition, incrementalityFor, NOT_MODELED_FIX, planAudit, rankingPageChange, type SortedFix } from '../src/audit';
import { config } from './fixture';

// The fixture: organic CTR 40 / 20 / 10 / 5 in 100 for positions 1 to 4, target positions [4, 2, 1],
// search CVR 1 in 10 with no new-account discount, team hours at $100, no ramps.
const general = config.industries[0];
const events: AngleInput = {
  id: 'events',
  name: 'Events',
  why: 'Published packages no rival advertises.',
  keywords: [{ keyword: 'Event Space', monthly_searches: 1000, low_bid_usd: 2, high_bid_usd: 4 }],
  value: { per_customer: [100, 100, 100], close: [0.5, 0.5, 0.5], gross_margin: [0.5, 0.5, 0.5], basis: 'test' },
  incrementality: 1,
  incrementality_basis: 'test',
};
const fixes: SortedFix[] = [
  { id: '1', area: 'website', effort: 'site_fix', title: 'Add a booking link', evidence: 'No booking link was found.' },
  { id: '2', area: 'ads', effort: 'search_campaign', title: 'Run search ads', evidence: 'No ads.' },
  { id: '3', area: 'google', effort: 'not_in_the_setup_file', title: 'Something else', evidence: 'x' },
];

describe('rank and incrementality', () => {
  it('reads the best known position for an angle, ignoring case', () => {
    expect(bestPosition(events, { 'event space': 3 })).toBe(3);
    expect(bestPosition(events, {})).toBeNull();
  });

  it('uses the cautious rank-2-to-4 figure when the rank is not confirmed', () => {
    expect(incrementalityFor(null, config).value).toBe(0.8);
    expect(incrementalityFor(1, config).value).toBe(0.5);
    expect(incrementalityFor(3, config).value).toBe(0.8);
    expect(incrementalityFor(7, config).value).toBe(1);
    expect(incrementalityFor(null, config).basis).toMatch(/not confirmed/);
  });
});

describe('a page that ranks for an angle', () => {
  it('models the climb to the setup file targets from where the business ranks now', () => {
    const page = rankingPageChange(events, null, general, config)!;
    expect(page.impact).toMatchObject({ kind: 'ranking', from_position: null, to_position: [4, 2, 1], monthly_searches: 1000 });
    expect(page.evidence).toContain('not confirmed');
    expect(rankingPageChange(events, 3, general, config)!.impact).toMatchObject({ from_position: 3 });
  });

  it('is left out when the business already ranks at the best case, or the angle has no value', () => {
    expect(rankingPageChange(events, 1, general, config)).toBeNull();
    expect(rankingPageChange({ ...events, value: null }, null, general, config)).toBeNull();
    expect(rankingPageChange({ ...events, keywords: [{ ...events.keywords[0], monthly_searches: 50 }] }, null, general, config)).toBeNull();
  });
});

describe('planning one audit', () => {
  const result = planAudit({ angles: [events], industry: general, positions: {}, fixes, baseline: { monthly_ad_spend: null, ad_spend_basis: 'Not public.' } }, config);

  it('ranks the ranking page, the ad rows worth running, then sorted findings; covered and unknown findings are left out', () => {
    // Search: 100 clicks at $3 → 5 customers → $250 profit for $300: skipped. Meta: $150 test → 3.75 customers → $187.50: tested.
    expect(result.plan.rows.map((r) => [r.platform, r.recommendation])).toEqual([
      ['meta', 'test'],
      ['google_search', 'skip'],
    ]);
    expect(result.ranked.map((c) => c.id)).toEqual(['seo-events', 'ads-events-meta', 'fix-1']);
    expect(result.ranked[2]).toMatchObject({ modeled: false, impact: { kind: 'not_modeled', reason: NOT_MODELED_FIX } });
  });

  it('models the page: 1,000 searches × 20 in 100 × 1 in 10 → 20 leads → 10 customers → $500 a month', () => {
    const m = result.ranked[0].scenarios!.medium;
    expect(m.benefit_year).toBeCloseTo(6000);
    expect(m.net_year).toBeCloseTo(5000);
  });

  it('compares today with every change that pays back', () => {
    expect(result.comparison.included).toEqual(['seo-events', 'ads-events-meta']);
    expect(result.comparison.with_plan.added_monthly_spend.medium).toBeCloseTo(150);
    expect(result.comparison.with_plan.monthly_ad_spend).toBeNull();
  });
});
