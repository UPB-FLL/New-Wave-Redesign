import { describe, expect, it } from 'vitest';
import { buildAdPlan, searchCpc, type AngleInput } from '../src/adplan';
import { validateConfig, type IndustryProfile } from '../src/config';
import { claimsIn, templateProblems } from '../src/templates';

import { config } from './fixture';

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
    (bad as { rival_ads_test: unknown }).rival_ads_test = { enabled: true, basis: '' };
    expect(() => validateConfig(bad)).toThrow(/needs a source[\s\S]*cpc must fall[\s\S]*"general" profile[\s\S]*rival_ads_test needs/);
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

  describe('a row the benchmarks say loses money', () => {
    // A $20 ticket closes a tenth of its leads: every click costs more than it brings back.
    const thin: AngleInput = { ...events, id: 'thin', name: 'Puppy classes', value: { per_customer: [20, 20, 20], close: [0.1, 0.1, 0.1], gross_margin: [0.5, 0.5, 0.5], basis: 'The write-up’s estimate.' } };

    it('is skipped when no competitor is on record advertising there', () => {
      const p = buildAdPlan([thin], industry(['google_search', 'meta']), config);
      expect(p.rows.map((r) => [r.platform, r.recommendation, r.reason]).sort()).toEqual([
        ['google_search', 'skip', 'Loses money in the medium case.'],
        ['meta', 'skip', 'Loses money in the medium case.'],
      ]);
      expect(p.rival_ads).toEqual({});
      expect(p.budget.medium).toBe(0);
    });

    it('becomes a stop-lossed test on the platform where rivals are advertising, naming them', () => {
      const p = buildAdPlan([thin], industry(['google_search', 'meta']), config, { rival_ads: { meta: ['Angel Paws', 'K9 Advisors', 'Angel Paws'], google_search: [] } });
      const meta = p.rows.find((r) => r.platform === 'meta')!;
      const google = p.rows.find((r) => r.platform === 'google_search')!;
      expect(meta.recommendation).toBe('test');
      expect(meta.reason).toBe('Loses money at the estimated ticket and close rate, but Angel Paws and K9 Advisors are on record advertising on Meta: a small test with a stop-loss, to measure the real cost per lead before deciding.');
      expect(meta.roi_tier).toBe('loses money');
      expect(meta.stop_loss_cost_per_lead).toBe(1); // $20 × 0.1 × 0.5
      expect(meta.sources[meta.sources.length - 1]).toBe('Test despite the benchmarks: Test rule.');
      expect(google.recommendation).toBe('skip');
      expect(p.rival_ads).toEqual({ meta: ['Angel Paws', 'K9 Advisors'] });
      // The test's spend counts in the budget; its (negative) return counts in the year's net.
      expect(p.budget.medium).toBe(meta.scenarios.medium.spend);
      expect(p.year_net.medium).toBe(meta.scenarios.medium.year_net);
      expect(p.rows[0]).toBe(meta); // tests sort before skips
    });

    it('names two rivals and counts the rest when many advertise, and stays a skip when the rule is off', () => {
      const p = buildAdPlan([thin], industry(['meta']), config, { rival_ads: { meta: ['A', 'B', 'C', 'D', 'E'] } });
      expect(p.rows[0].reason).toContain('A, B and 3 more are on record advertising on Meta');
      const off = structuredClone(config);
      off.rival_ads_test.enabled = false;
      const q = buildAdPlan([thin], industry(['meta']), off, { rival_ads: { meta: ['A'] } });
      expect(q.rows[0]).toMatchObject({ recommendation: 'skip', reason: 'Loses money in the medium case.' });
    });

    it('never turns a self-serve block or a row that pays back into something else', () => {
      const blocked = buildAdPlan([{ ...thin, category: 'alcohol' }], industry(['reddit']), config, { rival_ads: { reddit: ['A'] } });
      expect(blocked.rows[0]).toMatchObject({ recommendation: 'skip', reason: 'Alcohol needs a sales rep.' });
      const fine = buildAdPlan([events], industry(['google_search']), config, { rival_ads: { google_search: ['A'] } });
      expect(fine.rows[0].recommendation).toBe('fund');
    });
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
