import { describe, expect, it } from 'vitest';
import { buildAdPlan, searchCpc, type AngleInput } from '../src/adplan';
import { validateConfig, type GroundswellConfig, type IndustryProfile } from '../src/config';
import { claimsIn, templateProblems } from '../src/templates';

// A small setup file with round numbers, so the arithmetic can be checked by hand.
const spec = (format: string) => ({ source: 'test', as_of: '2026', format, fields: { headline: { max_chars: 30, min_count: 1, max_count: 3 }, body: { max_chars: 90 } } });
const config: GroundswellConfig = validateConfig({
  version: 1,
  incrementality: { source: 'test', as_of: '2026', ranks_first: 0.5, ranks_2_to_4: 0.8, ranks_5_plus: 1 },
  platforms: {
    google_search: {
      id: 'google_search',
      label: 'Google Search',
      buying: 'search',
      benchmarks: { source: 'Search bench', as_of: '2026', cpc: [4, 3, 2], ctr: [0.1, 0.1, 0.1], cvr: [0.1, 0.1, 0.1] },
      template: spec('Search ad'),
    },
    meta: {
      id: 'meta',
      label: 'Meta',
      buying: 'social',
      benchmarks: { source: 'Meta bench', as_of: '2026', cpc: [2, 1, 0.5], ctr: [0.01, 0.01, 0.01], cvr: [0.05, 0.05, 0.05] },
      template: spec('Feed ad'),
      test_budget: { min_monthly: 100, share_of_search_spend: 0.5, basis: 'test rule' },
      restricted_categories: { alcohol: { rule: 'Target 21+ only.', blocks_self_serve: false, source: 'test' } },
    },
    reddit: {
      id: 'reddit',
      label: 'Reddit',
      buying: 'social',
      benchmarks: { source: 'Reddit bench', as_of: '2026', cpc: [2, 1, 0.5], ctr: [0.01, 0.01, 0.01], cvr: [0.05, 0.05, 0.05] },
      template: spec('Promoted post'),
      test_budget: { min_monthly: 100, share_of_search_spend: 0.5, basis: 'test rule' },
      restricted_categories: { alcohol: { rule: 'Alcohol needs a sales rep.', blocks_self_serve: true, source: 'test' } },
    },
    tiktok: {
      id: 'tiktok',
      label: 'TikTok',
      buying: 'social',
      benchmarks: { source: 'TikTok bench', as_of: '2026', cpc: [2, 1, 0.5], ctr: [0.01, 0.01, 0.01], cvr: [0.05, 0.05, 0.05] },
      template: spec('In-feed ad'),
      test_budget: { min_monthly: 100, share_of_search_spend: 0.5, basis: 'test rule' },
    },
    linkedin: {
      id: 'linkedin',
      label: 'LinkedIn',
      buying: 'social',
      benchmarks: null,
      benchmarks_missing: 'No credible LinkedIn benchmark.',
      template: spec('Sponsored content'),
      test_budget: { min_monthly: 300, share_of_search_spend: 0, basis: 'test rule' },
    },
  },
  industries: [{ id: 'general', label: 'General', match: [], audit_platforms: ['google_maps'], ad_platforms: ['google_search', 'meta'] }],
  search: { impression_share: [1, 1, 1], ctr_factor: [1, 1, 1], cvr_factor: [1, 1, 1], ramp: [] },
  tiers: { cpc: [1, 3], clicks: [20, 100], roi_strong: 1 },
  min_angle_searches: 100,
  unsupported_claims: ['best', '#1', 'number one'],
  verification: { tolerance: 0.1, max_rounds: 2 },
});

const industry = (ad_platforms: IndustryProfile['ad_platforms'], extra: Partial<IndustryProfile> = {}): IndustryProfile => ({
  id: 'test',
  label: 'Test',
  match: [],
  audit_platforms: [],
  ad_platforms,
  ...extra,
});

const events: AngleInput = {
  id: 'events',
  name: 'Private events',
  why: 'Published packages; no rival advertises them.',
  keywords: [
    { keyword: 'event space', monthly_searches: 600, low_bid_usd: 2, high_bid_usd: 4 },
    { keyword: 'party venue', monthly_searches: 400, low_bid_usd: 2, high_bid_usd: 4 },
  ],
  value: { per_customer: [1000, 1000, 1000], close: [0.5, 0.5, 0.5], gross_margin: [0.5, 0.5, 0.5], basis: 'Published minimums.' },
  incrementality: 1,
  incrementality_basis: 'Does not rank.',
};

describe('the setup file check', () => {
  it('accepts a valid file and lists every problem in a bad one', () => {
    expect(() => validateConfig(config)).not.toThrow();
    const bad = structuredClone(config);
    bad.platforms.meta.benchmarks!.cpc = [0.5, 1, 2]; // cheapest clicks in the low scenario
    bad.platforms.meta.benchmarks!.source = '';
    bad.industries = [];
    expect(() => validateConfig(bad)).toThrow(/needs a source[\s\S]*cpc must fall[\s\S]*"general" profile/);
  });
});

describe('search cost per click', () => {
  it('uses the median bids: the high bid in the low scenario, between low and mid in the high one', () => {
    expect(searchCpc(events.keywords, [9, 9, 9])).toEqual({ cpc: [4, 3, 2.5], from_bids: true });
  });

  it('falls back to the benchmark without bids', () => {
    expect(searchCpc([{ keyword: 'x', monthly_searches: 10, low_bid_usd: null, high_bid_usd: null }], [9, 8, 7])).toEqual({ cpc: [9, 8, 7], from_bids: false });
  });
});

describe('the ad plan', () => {
  const plan = buildAdPlan([events], industry(['google_search', 'meta']), config);
  const google = plan.rows.find((r) => r.platform === 'google_search')!;
  const meta = plan.rows.find((r) => r.platform === 'meta')!;

  it('sizes search by demand: 1,000 searches → 100 clicks → $300 at $3, 10 leads, 5 bookings, $2,500 margin', () => {
    expect(google.demand).toBe(1000);
    expect(google.scenarios.medium).toMatchObject({ cpc: 3, clicks: 100, spend: 300, leads: 10, customers: 5, revenue: 5000, net: 2200 });
    expect(google.scenarios.medium.roi).toBeCloseTo(2200 / 300);
    expect(google.scenarios.medium.year_net).toBeCloseTo(2200 * 12); // no ramp in this setup file
  });

  it('sizes social by a test budget: half the medium search spend, at least the minimum', () => {
    expect(meta.scenarios.medium.spend).toBe(150); // 0.5 × $300 > $100 minimum
    expect(meta.scenarios.medium.clicks).toBe(150); // $150 at $1
    expect(meta.scenarios.low.clicks).toBe(75); // same budget, dearer clicks
  });

  it('sorts rows into tiers by cost per click, clicks and return', () => {
    expect(google).toMatchObject({ cpc_tier: 'high', clicks_tier: 'high', roi_tier: 'strong', recommendation: 'fund' });
    expect(meta.cpc_tier).toBe('medium');
    // The stop-loss is the cost per lead where the medium scenario breaks even.
    expect(google.stop_loss_cost_per_lead).toBe(1000 * 0.5 * 0.5);
  });

  it('never models a return without a published value, and only tests cheap search clicks then', () => {
    const noPrice: AngleInput = { ...events, id: 'nights', name: 'Nights out', value: null };
    const p = buildAdPlan([noPrice], industry(['google_search', 'meta']), config);
    const g = p.rows.find((r) => r.platform === 'google_search')!;
    expect(g.roi_tier).toBe('not modeled');
    expect(g.scenarios.medium.roi).toBeNull();
    expect(g.recommendation).toBe('skip'); // $3 is not below the $3 "high" line
    expect(p.year_net.medium).toBe(0); // unmodeled rows add nothing to the return
  });

  it('leaves out search for angles below the minimum demand, and names them', () => {
    const tiny: AngleInput = { ...events, id: 'tiny', name: 'Tiny', keywords: [{ keyword: 't', monthly_searches: 50, low_bid_usd: 1, high_bid_usd: 2 }] };
    const p = buildAdPlan([tiny], industry(['google_search']), config);
    expect(p.rows).toHaveLength(0);
    expect(p.too_small).toEqual([{ angle: 'Tiny', demand: 50 }]);
  });

  it('adds a platform’s rule for a restricted category, or skips the row when the rule rules out self-serve', () => {
    const p = buildAdPlan([events], industry(['google_search', 'meta', 'reddit'], { restricted: ['alcohol'] }), config);
    expect(p.rows.find((r) => r.platform === 'meta')!.conditions).toEqual(['Target 21+ only.']);
    expect(p.rows.find((r) => r.platform === 'reddit')).toMatchObject({ recommendation: 'skip', reason: 'Alcohol needs a sales rep.' });
    // An angle can carry the category itself.
    const q = buildAdPlan([{ ...events, category: 'alcohol' }], industry(['meta']), config);
    expect(q.rows[0].conditions).toEqual(['Target 21+ only.']);
  });

  it('lists a platform with no published benchmark instead of guessing its numbers', () => {
    const p = buildAdPlan([events], industry(['google_search', 'linkedin']), config);
    expect(p.rows.map((r) => r.platform)).toEqual(['google_search']);
    expect(p.unmodeled).toEqual([{ angle: 'Private events', platform: 'linkedin', reason: 'No credible LinkedIn benchmark.' }]);
  });

  it('prefers the industry’s own benchmarks', () => {
    const withIndustry = structuredClone(config);
    withIndustry.platforms.meta.by_industry = {
      Food: { source: 'Meta food bench', as_of: '2026', cpc: [1, 0.5, 0.25], ctr: null, cvr: null },
    };
    const p = buildAdPlan([events], industry(['google_search', 'meta'], { benchmark_industry: 'Food' }), withIndustry);
    const meta = p.rows.find((r) => r.platform === 'meta')!;
    expect(meta.scenarios.medium.clicks).toBe(300); // $150 at $0.50
    // No published conversion rate: clicks and cost only.
    expect(meta).toMatchObject({ roi_tier: 'not modeled' });
    expect(meta.scenarios.medium.leads).toBe(0);
  });

  it('totals the budget and return over funded and tested rows', () => {
    expect(plan.budget.medium).toBeCloseTo(google.scenarios.medium.spend + meta.scenarios.medium.spend);
  });
});

describe('ad templates', () => {
  it('finds unsupported claims as whole words only', () => {
    expect(claimsIn('The best pizza in town', ['best'])).toEqual(['best']);
    expect(claimsIn('Bestow a gift', ['best'])).toEqual([]);
    expect(claimsIn('Rated #1 by locals', ['#1'])).toEqual(['#1']);
  });

  it('checks counts, character limits, claims, targeting and the call to action', () => {
    const problems = templateProblems(
      {
        platform: 'google_search',
        angle_id: 'events',
        fields: { headline: ['Best event space in town', 'A headline that runs well past thirty characters'], extra: 'x' },
        targeting: '',
        call_to_action: 'Book',
      },
      config
    );
    expect(problems).toEqual([
      'Google Search headline 2: 48 characters, limit 30.',
      'Google Search body: needs at least 1, has 0.',
      'Google Search: "extra" is not a field of the Search ad format.',
      'Google Search: claims "best" with no third-party proof named.',
      'Google Search: no targeting.',
    ]);
  });

  it('accepts a comparative claim when its proof is named', () => {
    expect(
      templateProblems(
        { platform: 'meta', angle_id: 'events', fields: { headline: 'Best in town', body: 'Short.' }, targeting: '21+, 3 miles', call_to_action: 'Book', proof: ['Named by a city guide'] },
        config
      )
    ).toEqual([]);
  });
});
