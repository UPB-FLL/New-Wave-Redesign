import { describe, expect, it } from 'vitest';
import { GROUNDSWELL_CONFIG } from '../groundswell.config';
import { UPB_ANGLES, UPB_INDUSTRY, UPB_TEMPLATES } from '../examples/uncommon-path-brewing';
import { buildAdPlan } from '../src/adplan';
import type { CheckedAd } from '../src/adcopy';
import { budgetTiers, buildAdSets, businessCode, metaCta, withUtm, type AdSetsInput } from '../src/adsets';
import { SCENARIOS } from '../src/config';

// The brewery's documented plan, turned into ad sets through the real setup file.
const config = GROUNDSWELL_CONFIG;
const industry = config.industries.find((i) => i.id === UPB_INDUSTRY)!;
const plan = buildAdPlan(UPB_ANGLES, industry, config);
const copy: CheckedAd[] = UPB_TEMPLATES.map((t) => ({
  ...t,
  angle: UPB_ANGLES.find((a) => a.id === t.angle_id)!.name,
  platform_label: config.platforms[t.platform].label,
  recommendation: 'fund',
  format: config.platforms[t.platform].template.format,
  limits_source: 'test',
}));
const creative = [
  { path: 'a1/image/ig-1.jpg', name: 'ig-1.jpg', permalink: 'https://www.instagram.com/p/1/', likes: 210, comments: 14 },
  { path: 'a1/image/ig-2.jpg', name: 'ig-2.jpg', permalink: 'https://www.instagram.com/p/2/', likes: 120, comments: 9 },
];

function input(over: Partial<AdSetsInput> = {}): AdSetsInput {
  return {
    business: { name: 'Uncommon Path Brewing', code: 'UPB', website: 'https://uncommonpathbrewing.com/', landing: 'https://uncommonpathbrewing.com/private-events', city: 'Fort Lauderdale, FL', instagram: 'uncommonpathbrewing' },
    plan,
    angles: UPB_ANGLES,
    industry,
    copy,
    ranking: [
      // Already in the brewery angle's ad group: never bought twice.
      { keyword: 'brewery fort lauderdale', volume: 880, position: 7, url: 'https://uncommonpathbrewing.com/' },
      { keyword: 'taproom fort lauderdale', volume: 480, position: 6, url: 'https://uncommonpathbrewing.com/taproom' },
      { keyword: 'craft beer flagler village', volume: 90, position: 12, url: 'https://uncommonpathbrewing.com/beer' },
      { keyword: 'uncommon path brewing', volume: 400, position: 1, url: 'https://uncommonpathbrewing.com/' },
      { keyword: 'tiny search', volume: 10, position: 9, url: null },
    ],
    ideas: [{ keyword: 'taproom fort lauderdale', monthly_searches: 480, low_bid_usd: 0.8, high_bid_usd: 2.4 }],
    creative,
    meta_pixel: false,
    writing: {
      engagement_ads: [{ primary_text: 'Brewed here, poured here.', headline: 'On tap this week', image_headline: 'Brewed on NW 5th Ave' }],
      image_headlines: { events: 'Your party, our taproom' },
      carousel: { title: 'Plan a private event', slides: [{ headline: 'Room for your group', body: 'A private room with food and beer brewed on site.' }], caption: 'Save this for your next party.' },
      negatives: [{ text: 'homebrew kit', reason: 'Shoppers for brewing gear, not a night out.' }, { text: 'Party Venue', reason: 'would block a keyword the plan buys' }],
      interests: ['Craft beer', 'Live music'],
    },
    month: '2026-10',
    ...over,
  };
}

describe('ad sets from the plan', () => {
  const sets = buildAdSets(input(), config);

  it('turns every funded or tested row into a Meta ad set or Google ad group, priced at three budgets', () => {
    const live = plan.rows.filter((r) => r.recommendation !== 'skip');
    const metaRows = live.filter((r) => r.platform === 'meta');
    const leadsMeta = sets.meta.filter((m) => m.goal === 'leads');
    expect(leadsMeta.map((m) => m.angle)).toEqual(metaRows.map((r) => r.angle));
    const events = leadsMeta.find((m) => m.id === 'meta-events')!;
    const row = plan.rows.find((r) => r.angle_id === 'events' && r.platform === 'meta')!;
    // Low is half the plan's base-case spend, high double it; each at the base case's rates, so Meta's return per dollar holds.
    SCENARIOS.forEach((s, i) => {
      expect(events.tiers[s].monthly).toBeCloseTo(row.scenarios.medium.spend * config.adsets.budget_multipliers[i], 2);
      expect(events.tiers[s].daily).toBeCloseTo((row.scenarios.medium.spend * config.adsets.budget_multipliers[i]) / 30.4, 2);
      expect(events.tiers[s].roi).toBeCloseTo(row.scenarios.medium.roi!, 2);
      expect(events.tiers[s].leads).toBeCloseTo(row.scenarios.medium.leads * config.adsets.budget_multipliers[i], 2);
    });
    expect(events.tiers.medium.net).toBeCloseTo(row.scenarios.medium.net, 2);
    expect(events.tiers.medium.year_net).toBeCloseTo(row.scenarios.medium.year_net, 2);
    // How far the medium budget's return can move: the plan's conservative to upside cases.
    expect(events.range).toEqual({
      conservative: { net: Math.round(row.scenarios.low.net * 100) / 100, year_net: Math.round(row.scenarios.low.year_net * 100) / 100, roi: Math.round(row.scenarios.low.roi! * 100) / 100 },
      base: { net: Math.round(row.scenarios.medium.net * 100) / 100, year_net: Math.round(row.scenarios.medium.year_net * 100) / 100, roi: Math.round(row.scenarios.medium.roi! * 100) / 100 },
      upside: { net: Math.round(row.scenarios.high.net * 100) / 100, year_net: Math.round(row.scenarios.high.year_net * 100) / 100, roi: Math.round(row.scenarios.high.roi! * 100) / 100 },
    });
    const googleRows = live.filter((r) => r.platform === 'google_search');
    expect(sets.google!.ad_groups.filter((g) => g.goal === 'leads').map((g) => g.angle)).toEqual(googleRows.map((r) => r.angle));
  });

  it('stops search spend at the clicks the area’s searches can supply', () => {
    const row = plan.rows.find((r) => r.angle_id === 'events' && r.platform === 'google_search')!;
    const t = budgetTiers(row, config);
    const cpc = row.scenarios.medium.spend / row.scenarios.medium.clicks;
    // Double the base budget would buy more clicks than the upside case finds.
    expect(row.scenarios.medium.clicks * 2).toBeGreaterThan(row.scenarios.high.clicks);
    expect(t.high.capped).toBe(true);
    expect(t.high.clicks).toBe(Math.round(row.scenarios.high.clicks));
    expect(t.high.monthly).toBeCloseTo(row.scenarios.high.clicks * cpc, 2);
    expect(t.low.capped).toBeUndefined();
    expect(t.low.monthly).toBeCloseTo(row.scenarios.medium.spend / 2, 2);
  });

  it('writes Meta ads from the checked copy, with the business\'s own image and UTM-tagged link', () => {
    const ad = sets.meta.find((m) => m.id === 'meta-events')!.ads[0];
    expect(ad.name).toBe('IMG_PRIVATE-EVENTS_V1');
    expect(ad.image?.path).toBe('a1/image/ig-1.jpg');
    expect(ad.image_headline).toBe('Your party, our taproom');
    expect(ad.link).toBe('https://uncommonpathbrewing.com/private-events?utm_source=meta&utm_medium=paid_social&utm_campaign=upb_leads_traffic_2026-10&utm_content=img_private-events_v1');
    expect(ad.display_link).toBe('uncommonpathbrewing.com');
    // No pixel on the site: traffic first, and the plan says why.
    expect(sets.meta.find((m) => m.id === 'meta-events')).toMatchObject({ objective: 'OUTCOME_TRAFFIC', optimization_goal: 'LANDING_PAGE_VIEWS', audience: { age_min: 21 } });
    expect(sets.notes.join(' ')).toMatch(/No Meta pixel was found/);
    expect(buildAdSets(input({ meta_pixel: true }), config).meta.find((m) => m.id === 'meta-events')).toMatchObject({ objective: 'OUTCOME_LEADS' });
  });

  it('adds an engagement set sized by the setup file\'s share, never under Meta\'s test minimum at the medium budget, with its return not modeled', () => {
    const e = sets.meta.find((m) => m.goal === 'engagement')!;
    expect(e).toMatchObject({ objective: 'OUTCOME_ENGAGEMENT', optimization_goal: 'POST_ENGAGEMENT', modeled: false, range: null, audience: { age_min: 21 } });
    const min = config.platforms.meta.test_budget!.min_monthly;
    const base = Math.max(min, plan.budget.medium * config.adsets.engagement_share[1]);
    expect(e.tiers.medium.monthly).toBeCloseTo(base, 2);
    expect(e.tiers.low.monthly).toBeCloseTo(Math.max(min / 2, base / 2), 2);
    expect(e.tiers.high.monthly).toBeCloseTo(base * 2, 2);
    for (const s of SCENARIOS) expect(e.tiers[s].roi).toBeNull();
    expect(e.ads[0]).toMatchObject({ name: 'IMG_ENGAGE_V1', image_headline: 'Brewed on NW 5th Ave' });
    expect(e.mechanism).toMatch(/saves, shares and follows/);
    expect(sets.notes.join(' ')).toMatch(/On Meta the low budget is under New Wave’s smallest useful test/);
  });

  it('uses the writer’s Meta ad where the copy step wrote none', () => {
    const noCopy = buildAdSets(
      input({ copy: copy.filter((c) => c.platform !== 'meta'), writing: { ...input().writing!, meta_ads: { events: { primary_text: 'Book the taproom for your group.', headline: 'Private events', description: 'Flagler Village', call_to_action: 'Check dates and book' } } } }),
      config
    );
    expect(noCopy.meta.find((m) => m.id === 'meta-events')!.ads[0]).toMatchObject({ primary_text: 'Book the taproom for your group.', headline: 'Private events', call_to_action: 'BOOK_NOW' });
  });

  it('prices a rankings ad group on the searches the site ranks 4 to 20 for, and says ads do not move rankings', () => {
    const r = sets.google!.ad_groups.find((g) => g.goal === 'rankings')!;
    expect(r.keywords.filter((k) => k.match === 'exact').map((k) => [k.text, k.position])).toEqual([
      ['taproom fort lauderdale', 6],
      ['craft beer flagler village', 12],
    ]);
    expect(r.keywords.find((k) => k.text === 'taproom fort lauderdale')).toMatchObject({ low_bid_usd: 0.8, high_bid_usd: 2.4 });
    expect(r.mechanism).toMatch(/Paid clicks do not move an organic position/);
    expect(r.final_url).toBe('https://uncommonpathbrewing.com/taproom');
    // Priced by the plan's own model as one more angle.
    const priced = buildAdPlan(
      [{ id: 'rankings', name: 'x', why: '', keywords: [{ keyword: 'taproom fort lauderdale', monthly_searches: 480, low_bid_usd: 0.8, high_bid_usd: 2.4 }, { keyword: 'craft beer flagler village', monthly_searches: 90, low_bid_usd: null, high_bid_usd: null }], value: UPB_ANGLES.find((a) => a.value)!.value, incrementality: config.incrementality.ranks_5_plus, incrementality_basis: '', platforms: ['google_search'] }],
      industry,
      config
    ).rows[0];
    expect(r.tiers.medium.monthly).toBeCloseTo(priced.scenarios.medium.spend, 2);
  });

  it('keeps negatives that never block a keyword the plan buys', () => {
    const negatives = sets.google!.negatives.map((n) => n.text);
    expect(negatives).toEqual(expect.arrayContaining(['jobs', 'diy', 'homebrew kit']));
    expect(negatives).not.toContain('party venue');
    expect(sets.google!.negatives.every((n) => n.match === 'phrase')).toBe(true);
  });

  it('totals spend across every set and return across the modeled ones', () => {
    const all = [...sets.meta, ...sets.google!.ad_groups];
    for (const s of SCENARIOS) {
      expect(sets.totals[s].monthly).toBeCloseTo(all.reduce((a, x) => a + x.tiers[s].monthly, 0), 1);
      const modeled = all.filter((x) => x.modeled);
      expect(sets.totals[s].modeled_spend).toBeCloseTo(modeled.reduce((a, x) => a + x.tiers[s].monthly, 0), 1);
    }
    expect(sets.totals.low.monthly).toBeLessThan(sets.totals.high.monthly);
    expect(sets.goals).toEqual({ leads: sets.meta.filter((m) => m.goal === 'leads').length + sets.google!.ad_groups.filter((g) => g.goal === 'leads').length, engagement: 1, rankings: 1 });
  });

  it('names the rankings group\'s absence when the searches close to page one are too few', () => {
    const few = buildAdSets(input({ ranking: [{ keyword: 'craft beer flagler village', volume: 90, position: 12, url: null }] }), config);
    expect(few.google!.ad_groups.some((g) => g.goal === 'rankings')).toBe(false);
    expect(few.notes.join(' ')).toMatch(/No rankings ad group: .* fewer than 100 a month/);
  });

  it('says what is missing rather than inventing it', () => {
    const bare = buildAdSets(input({ creative: [], writing: null, business: { ...input().business, website: null, landing: null } }), config);
    expect(bare.notes.join(' ')).toMatch(/No usable Instagram image/);
    expect(bare.notes.join(' ')).toMatch(/no website/);
    expect(bare.meta.find((m) => m.goal === 'engagement')!.ads).toEqual([]);
    expect(bare.meta.find((m) => m.id === 'meta-events')!.ads[0].link).toMatch(/^https:\/\/www\.instagram\.com\/uncommonpathbrewing\/\?utm_source=meta/);
  });

  it('names and buttons', () => {
    expect(businessCode('Transmissions Unlimited')).toBe('TU');
    expect(businessCode('Flow & Mills Signature Detailing')).toBe('FMSD');
    expect(businessCode('Windy City Auto Repair and Body Shop LLC')).toBe('WCAR');
    expect(businessCode('Zap')).toBe('ZAP');
    expect(metaCta('Call the shop')).toBe('CALL_NOW');
    expect(metaCta('Check dates and book')).toBe('BOOK_NOW');
    expect(metaCta('Get a free estimate')).toBe('GET_QUOTE');
    expect(metaCta('See the menu')).toBe('LEARN_MORE');
    expect(withUtm('https://a.com/x?y=1', { utm_source: 'meta' })).toBe('https://a.com/x?y=1&utm_source=meta');
  });
});
