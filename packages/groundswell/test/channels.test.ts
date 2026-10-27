import { describe, expect, it } from 'vitest';
import { GROUNDSWELL_CONFIG } from '../groundswell.config';
import { UPB_ANGLES, UPB_INDUSTRY } from '../examples/uncommon-path-brewing';
import { buildAdPlan } from '../src/adplan';
import { blockingRule, buildChannelSets, channelSpend, DATA_SET_WORDS, type ChannelInput } from '../src/channels';
import { SCENARIOS } from '../src/config';

const config = GROUNDSWELL_CONFIG;
const brewery = config.industries.find((i) => i.id === UPB_INDUSTRY)!;
const venue = config.industries.find((i) => i.id === 'event_venue')!;
const creative = [
  { path: 'a1/image/ig-1.jpg', name: 'ig-1.jpg', permalink: 'https://www.instagram.com/p/1/', likes: 210, comments: 14 },
  { path: 'a1/image/ig-2.jpg', name: 'ig-2.jpg', permalink: 'https://www.instagram.com/p/2/', likes: 120, comments: 9 },
];

function input(industry = brewery, over: Partial<ChannelInput> = {}): ChannelInput {
  return {
    business: { name: 'Harbor Light Brewing', code: 'HLB', area: 'Fort Lauderdale, FL', landing: 'https://harborlight.example/' },
    industry,
    rows: buildAdPlan(UPB_ANGLES, industry, config).rows,
    community: { communities: ['fortlauderdale', 'craftbeer'], questions: [{ community: 'fortlauderdale', question: 'Best brewery for a birthday party?' }] },
    creative,
    writing: {
      reddit_ads: [
        { headline: 'A taproom with a private room for birthday groups', text: 'Beer brewed on site and food from the kitchen.', call_to_action: 'Book a room', basis: 'reddit' },
        { headline: 'Brewed on NW 5th Ave', text: '', call_to_action: '', image_headline: 'Brewed on NW 5th Ave', basis: 'website' },
      ],
      tiktok_ads: [{ text: 'Your next party, in our taproom.', call_to_action: 'Learn more', basis: 'own_posts' }],
    },
    month: '2026-10',
    evidence: { website: 'The website: “Harbor Light Brewing”.', own_posts: 'The business’s own posts and photos (2 kept).' },
    ...over,
  };
}

describe('Reddit and TikTok sets', () => {
  it('prices Reddit at the test budget times the setup file’s multipliers, its return not modeled', () => {
    const { reddit } = buildChannelSets(input(venue), config);
    expect(reddit).toHaveLength(1);
    const set = reddit[0];
    const min = config.platforms.reddit.test_budget!.min_monthly;
    SCENARIOS.forEach((s, i) => expect(set.spend[s].monthly).toBeCloseTo(min * config.adsets.channel_multipliers![i], 2));
    expect(set.spend).toEqual(channelSpend(config, 'reddit'));
    expect(set.tiers).toBeNull();
    expect(set.modeled).toBe(false);
    expect(set.not_modeled).toBeTruthy();
    expect(set.availability).toBe('self_serve');
    expect(set.recommendation).toBe('test');
    expect(set.targeting.communities).toEqual(['r/fortlauderdale', 'r/craftbeer']);
  });

  it('ties each ad to the data it was written from, in the feed size, with a tagged link', () => {
    const [set] = buildChannelSets(input(venue), config).reddit;
    expect(set.ads.map((a) => a.basis.data)).toEqual(['reddit', 'website']);
    // A Reddit-based ad quotes the question it answers; any other names its data set's evidence.
    expect(set.ads[0].basis.evidence).toBe('Asked in r/fortlauderdale: “Best brewery for a birthday party?”');
    expect(set.ads[1].basis.evidence).toBe('The website: “Harbor Light Brewing”.');
    expect(set.ads.every((a) => a.format === 'feed')).toBe(true);
    expect(new URL(set.ads[0].link).searchParams.get('utm_source')).toBe('reddit');
    expect(set.ads[1].call_to_action).toBe('Learn More');
    // Words on the image: the writer's, else the headline when short enough.
    expect(set.ads[0].image_headline).toBe('A taproom with a private room for birthday groups');
    expect(set.ads[1].image_headline).toBe('Brewed on NW 5th Ave');
    expect(set.ads.map((a) => a.image?.path)).toEqual(['a1/image/ig-1.jpg', 'a1/image/ig-2.jpg']);
    expect(Object.keys(DATA_SET_WORDS)).toContain(set.ads[0].basis.data);
  });

  it('turns a set self-serve is closed to into the sales team’s plan, with the rule and an age floor of 21 for alcohol', () => {
    const { reddit, tiktok } = buildChannelSets(input(), config);
    const rule = blockingRule(config, brewery, 'reddit');
    expect(rule).toMatch(/managed sales team/);
    expect(reddit[0].availability).toBe('sales_team');
    expect(reddit[0].recommendation).toBe('sales_team');
    expect(reddit[0].availability_note).toBe(rule);
    expect(reddit[0].targeting.age_min).toBe(21);
    // TikTok's alcohol rule names 25 and older.
    expect(tiktok.every((t) => t.availability === 'sales_team' && t.targeting.age_min === 25)).toBe(true);
  });

  it('keeps the plan’s verdict on TikTok: only rows that pay back at the published rates get a set', () => {
    const rows = buildAdPlan(UPB_ANGLES, brewery, config).rows.filter((r) => r.platform === 'tiktok');
    const { tiktok } = buildChannelSets(input(), config);
    const paying = rows.filter((r) => r.roi_tier === 'strong' || r.roi_tier === 'pays back').map((r) => `tiktok-${r.angle_id}`);
    expect(tiktok.map((t) => t.id)).toEqual(paying.slice(0, 2));
    // The pizza row loses money: no sales-team plan is made for it.
    expect(tiktok.map((t) => t.id)).not.toContain('tiktok-pizza');
    for (const t of tiktok) {
      expect(t.tiers).not.toBeNull();
      expect(t.ads.every((a) => a.format === 'vertical' && a.text.length <= 100 && a.headline.length <= 20)).toBe(true);
    }
  });

  it('prices a self-serve TikTok row from the plan’s rates and names what is missing', () => {
    const { tiktok, notes } = buildChannelSets(input(venue), config);
    const live = buildAdPlan(UPB_ANGLES, venue, config).rows.filter((r) => r.platform === 'tiktok' && r.recommendation !== 'skip');
    expect(tiktok.map((t) => t.id)).toEqual(live.sort((x, y) => (y.scenarios.medium.roi ?? -9) - (x.scenarios.medium.roi ?? -9)).slice(0, 2).map((r) => `tiktok-${r.angle_id}`));
    expect(tiktok).toHaveLength(1);
    const [t] = tiktok;
    expect(t.availability).toBe('self_serve');
    expect(t.recommendation).toBe(live[0].recommendation);
    expect(t.modeled).toBe(true);
    expect(t.tiers!.medium.roi).toBeCloseTo(live[0].scenarios.medium.roi!, 2);
    expect(t.targeting.age_min).toBe(18);
    expect(notes.join(' ')).not.toMatch(/no TikTok row/);
  });

  it('leaves Reddit out, and says so, when no community talks about the business', () => {
    const { reddit, notes } = buildChannelSets(input(venue, { community: { communities: [], questions: [] } }), config);
    expect(reddit).toEqual([]);
    expect(notes.join(' ')).toMatch(/No Reddit community/);
  });

  it('builds no set for a platform the industry does not advertise on', () => {
    const law = config.industries.find((i) => !i.ad_platforms.includes('reddit') && !i.ad_platforms.includes('tiktok'))!;
    const out = buildChannelSets(input(law), config);
    expect(out.reddit).toEqual([]);
    expect(out.tiktok).toEqual([]);
  });

  it('keeps the set and its budgets, and says the ads are missing, when the writer wrote none', () => {
    const { reddit, notes } = buildChannelSets(input(venue, { writing: null }), config);
    expect(reddit[0].ads).toEqual([]);
    expect(notes.join(' ')).toMatch(/Reddit set has its communities and budgets but no ads/);
  });
});
