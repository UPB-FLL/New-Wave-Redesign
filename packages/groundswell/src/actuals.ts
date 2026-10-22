import type { AngleInput } from './adplan.js';
import { benchmarksFor, type GroundswellConfig, type IndustryProfile, type PlatformBenchmarks, type Triple } from './config.js';

/**
 * Phase 3: the plan re-priced on the business's own accounts. Past the setup
 * file's counts (`adsets.actuals`), the account's own cost per click replaces
 * the published one on Google Search and Meta, and Meta's own cost per lead
 * replaces the published one. Google's conversion rate stays the published
 * figure: a Google Ads conversion is whatever the account counts (a page view
 * can be one), so it is shown beside the plan, never used to price it.
 *
 * Search cost per click comes from Keyword Planner bids when an angle has
 * them; with an actual cost per click, the bids are set aside so the account's
 * own figure prices every row. The low case pays SPREAD more than the account
 * did and the high case SPREAD less (New Wave's rule).
 */

export const SPREAD = 0.15;

export interface AccountActuals {
  google: { clicks: number; cost: number; conversions: number } | null;
  meta: { clicks: number; spend: number; leads: number } | null;
}

export interface Repriced {
  config: GroundswellConfig;
  angles: AngleInput[];
  google: { cpc: number; clicks: number } | null;
  meta: { cpc: number | null; cpl: number | null; clicks: number; leads: number } | null;
  /** What was replaced and what was not, one sentence each. */
  notes: string[];
}

const falling = (x: number): Triple => [x * (1 + SPREAD), x, x * (1 - SPREAD)];
const cents = (x: number) => `$${x.toFixed(2)}`;

function override(config: GroundswellConfig, id: 'google_search' | 'meta', industry: IndustryProfile, patch: Partial<PlatformBenchmarks>): GroundswellConfig {
  const p = config.platforms[id];
  const current = benchmarksFor(p, industry);
  if (!current) return config;
  const replaced: PlatformBenchmarks = { ...current, ...patch };
  const key = industry.benchmark_industry;
  return {
    ...config,
    platforms: {
      ...config.platforms,
      [id]: { ...p, benchmarks: key ? p.benchmarks : replaced, by_industry: key ? { ...(p.by_industry ?? {}), [key]: replaced } : p.by_industry },
    },
  };
}

export function repriceWithActuals(config: GroundswellConfig, industry: IndustryProfile, angles: AngleInput[], actuals: AccountActuals, window: string): Repriced {
  const { min_clicks, min_leads } = config.adsets.actuals;
  const notes: string[] = [];
  let out = config;
  let outAngles = angles;
  let google: Repriced['google'] = null;
  let meta: Repriced['meta'] = null;

  const g = actuals.google;
  if (g && g.clicks >= min_clicks && g.cost > 0) {
    const cpc = g.cost / g.clicks;
    out = override(out, 'google_search', industry, {
      cpc: falling(cpc),
      source: `The business’s own Google Ads (${window}): ${cents(cpc)} a click over ${g.clicks.toLocaleString('en-US')} clicks`,
      as_of: window,
    });
    outAngles = outAngles.map((a) => ({ ...a, keywords: a.keywords.map((k) => ({ ...k, low_bid_usd: null, high_bid_usd: null })) }));
    google = { cpc, clicks: g.clicks };
    notes.push(`Google Search is priced at the account’s own ${cents(cpc)} a click (${g.clicks.toLocaleString('en-US')} clicks), not Keyword Planner’s bids.`);
    if (g.conversions > 0) {
      notes.push(`The account counted ${g.conversions.toLocaleString('en-US')} conversions (${((g.conversions / g.clicks) * 100).toFixed(1)}% of clicks); the plan keeps the published conversion rate until those are confirmed as leads.`);
    }
  } else if (g) {
    notes.push(`Google Ads has ${g.clicks} clicks in the window, under the ${min_clicks} the plan needs to use its own cost per click; the published figures stay.`);
  }

  const m = actuals.meta;
  if (m && (m.clicks >= min_clicks || m.leads >= min_leads) && m.spend > 0) {
    const patch: Partial<PlatformBenchmarks> = { source: `The business’s own Meta ads (${window})`, as_of: window };
    const cpc = m.clicks >= min_clicks ? m.spend / m.clicks : null;
    const cpl = m.leads >= min_leads ? m.spend / m.leads : null;
    if (cpc) patch.cpc = falling(cpc);
    if (cpl) patch.cpl = falling(cpl);
    out = override(out, 'meta', industry, patch);
    meta = { cpc, cpl, clicks: m.clicks, leads: m.leads };
    notes.push(
      [cpc ? `Meta is priced at the account’s own ${cents(cpc)} a click` : null, cpl ? `${cents(cpl)} a lead (${m.leads} leads)` : null].filter(Boolean).join(' and ') + '.'
    );
  } else if (m) {
    notes.push(`Meta has ${m.clicks} clicks and ${m.leads} leads in the window, under the plan’s counts; the published figures stay.`);
  }
  if (!g && !m) notes.push('No ad account was read, so the plan keeps the published figures.');
  return { config: out, angles: outAngles, google, meta, notes };
}
