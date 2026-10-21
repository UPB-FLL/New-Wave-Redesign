import { describe, expect, it } from 'vitest';
import { GROUNDSWELL_CONFIG } from '../groundswell.config';
import { UPB_ANGLES, UPB_BASELINE, UPB_INDUSTRY, UPB_TEMPLATES, upbChanges } from '../examples/uncommon-path-brewing';
import { buildAdPlan } from '../src/adplan';
import { compareWithToday, rankChanges } from '../src/changes';
import { templateProblems } from '../src/templates';

// The documented use case, run through the real setup file. If a benchmark or
// rule in groundswell.config.ts changes, these pins say what moved.
const industry = GROUNDSWELL_CONFIG.industries.find((i) => i.id === UPB_INDUSTRY)!;
const plan = buildAdPlan(UPB_ANGLES, industry, GROUNDSWELL_CONFIG);
const row = (angle: string, platform: string) => plan.rows.find((r) => r.angle_id === angle && r.platform === platform)!;

describe('use case: Uncommon Path Brewing', () => {
  it('funds private events on Meta and Google first, highest return first', () => {
    expect(plan.rows.slice(0, 2).map((r) => [r.angle_id, r.platform, r.recommendation])).toEqual([
      ['events', 'meta', 'fund'],
      ['events', 'google_search', 'fund'],
    ]);
    // 620 searches a month; bids $0.96 to $5.27; about 27.5 clicks for about $76 in the medium scenario.
    const google = row('events', 'google_search');
    expect(google.demand).toBe(620);
    expect(google.scenarios.medium.clicks).toBeCloseTo(620 * 0.65 * 0.0683, 5);
    expect(google.scenarios.medium.spend).toBeCloseTo(76, 0);
    // Meta: a $150 test buys about 5.5 leads at the published $27.39 cost per lead.
    expect(row('events', 'meta').scenarios.medium.leads).toBeCloseTo(150 / 27.39, 5);
  });

  it('shows pizza losing money on ads, at a $22 pie', () => {
    expect(row('pizza', 'google_search')).toMatchObject({ recommendation: 'skip', roi_tier: 'loses money' });
    expect(row('pizza', 'meta')).toMatchObject({ recommendation: 'skip', roi_tier: 'loses money' });
  });

  it('tests the cheap, unpriced searches and models no return for them', () => {
    for (const angle of ['nights', 'brewery']) {
      expect(row(angle, 'google_search')).toMatchObject({ recommendation: 'test', roi_tier: 'not modeled' });
      expect(row(angle, 'google_search').scenarios.medium.roi).toBeNull();
    }
  });

  it('rules TikTok and Reddit out for alcohol, and never invents Reddit numbers', () => {
    for (const angle of ['events', 'pizza', 'nights', 'brewery']) {
      expect(row(angle, 'tiktok')).toMatchObject({ recommendation: 'skip' });
      expect(row(angle, 'tiktok').reason).toMatch(/sales representative/);
    }
    expect(plan.rows.some((r) => r.platform === 'reddit')).toBe(false);
    expect(plan.unmodeled.map((u) => u.platform)).toEqual(['reddit', 'reddit', 'reddit', 'reddit']);
  });

  it('totals about $425 a month across the funded and tested rows in the medium scenario', () => {
    expect(plan.budget.medium).toBeCloseTo(424.6, 0);
  });

  it('every template is ready to use', () => {
    for (const t of UPB_TEMPLATES) expect(templateProblems(t, GROUNDSWELL_CONFIG), `${t.platform} ${t.angle_id}`).toEqual([]);
  });
});

describe('use case: Uncommon Path Brewing, every change ranked', () => {
  const ranked = rankChanges(upbChanges(plan, GROUNDSWELL_CONFIG), GROUNDSWELL_CONFIG);
  const cmp = compareWithToday(ranked, UPB_BASELINE);

  it('ranks Meta events ads first, then the events page, and shows the small Google campaign losing money on team time', () => {
    expect(ranked.slice(0, 3).map((c) => c.id)).toEqual(['ads-events-meta', 'seo-events-page', 'ads-events-google_search']);
    const google = ranked.find((c) => c.id === 'ads-events-google_search')!;
    // About $76 a month of spend cannot carry 6 setup hours and 3 a month at $75.
    expect(google.hours).toBe(6 + 3 * 12);
    expect(google.scenarios!.medium.net_year).toBeLessThan(0);
  });

  it('ranks every unmodeled change after the modeled ones, with its reason', () => {
    const unmodeled = ranked.filter((c) => !c.modeled);
    expect(ranked.slice(3).every((c) => !c.modeled)).toBe(true);
    for (const c of unmodeled) {
      if (c.impact.kind === 'not_modeled') expect(c.impact.reason.length).toBeGreaterThan(20);
    }
  });

  it('compares today (spend not public) with the plan: the changes that pay back in the medium case', () => {
    expect(cmp.today.monthly_ad_spend).toBeNull();
    expect(cmp.included).toEqual(['ads-events-meta', 'seo-events-page']);
    expect(cmp.with_plan.added_monthly_spend.medium).toBe(150);
    expect(cmp.with_plan.team_hours).toBe(28 + 8);
    expect(cmp.with_plan.net_year.medium).toBeGreaterThan(0);
    expect(cmp.with_plan.net_year.low).toBeLessThan(0);
  });
});
