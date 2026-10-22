import { describe, expect, it } from 'vitest';
import { GROUNDSWELL_CONFIG } from '../groundswell.config';
import { UPB_ANGLES, UPB_INDUSTRY } from '../examples/uncommon-path-brewing';
import { repriceWithActuals, SPREAD } from '../src/actuals';
import { buildAdPlan } from '../src/adplan';
import { benchmarksFor } from '../src/config';

const config = GROUNDSWELL_CONFIG;
const industry = config.industries.find((i) => i.id === UPB_INDUSTRY)!;
const row = (plan: ReturnType<typeof buildAdPlan>, angle: string, platform: string) => plan.rows.find((r) => r.angle_id === angle && r.platform === platform)!;

describe('phase 3: the plan re-priced on the business’s own accounts', () => {
  it('prices Google Search at the account’s own cost per click, keeps the published conversion rate, and says so', () => {
    const r = repriceWithActuals(config, industry, UPB_ANGLES, { google: { clicks: 400, cost: 600, conversions: 30 }, meta: null }, 'Sep 22 – Oct 21, 2026');
    const plan = buildAdPlan(r.angles, industry, r.config);
    const events = row(plan, 'events', 'google_search');
    expect(events.scenarios.medium.cpc).toBeCloseTo(1.5, 5);
    expect(events.scenarios.low.cpc).toBeCloseTo(1.5 * (1 + SPREAD), 5);
    expect(events.scenarios.high.cpc).toBeCloseTo(1.5 * (1 - SPREAD), 5);
    // The published conversion rate stays: the account's 7.5% is reported, not used.
    const published = benchmarksFor(config.platforms.google_search, industry)!;
    expect(benchmarksFor(r.config.platforms.google_search, industry)!.cvr).toEqual(published.cvr);
    expect(r.notes.join(' ')).toMatch(/\$1\.50 a click \(400 clicks\)/);
    expect(r.notes.join(' ')).toMatch(/30 conversions \(7\.5% of clicks\); the plan keeps the published conversion rate/);
    expect(events.sources.join(' ')).toMatch(/business’s own Google Ads/);
    // The setup file itself is untouched.
    expect(benchmarksFor(config.platforms.google_search, industry)!.source).not.toMatch(/own Google Ads/);
  });

  it('prices Meta at its own cost per lead past the setup file’s count', () => {
    const r = repriceWithActuals(config, industry, UPB_ANGLES, { google: null, meta: { clicks: 900, spend: 450, leads: 15 } }, 'last 30 days');
    const plan = buildAdPlan(r.angles, industry, r.config);
    expect(row(plan, 'events', 'meta').scenarios.medium.leads).toBeCloseTo(row(plan, 'events', 'meta').scenarios.medium.spend / 30, 5);
    expect(r.meta).toMatchObject({ cpc: 0.5, cpl: 30 });
  });

  it('keeps the published figures below the counts', () => {
    const r = repriceWithActuals(config, industry, UPB_ANGLES, { google: { clicks: 12, cost: 30, conversions: 0 }, meta: { clicks: 10, spend: 20, leads: 1 } }, 'last 30 days');
    expect(r.config).toBe(config);
    expect(r.angles).toBe(UPB_ANGLES);
    expect(r.notes.join(' ')).toMatch(/12 clicks in the window, under the 50/);
  });
});
