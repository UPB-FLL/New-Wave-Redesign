import { existsSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from './fixtures/fakeSupabase';

const store = vi.hoisted(() => ({ current: null as null | ReturnType<typeof import('./fixtures/fakeSupabase').fakeSupabase> }));

vi.mock('../../../api/_lib/supabaseAdmin', () => ({ isSupabaseConfigured: () => true, getSupabaseAdmin: () => store.current!.client }));

import { checkWriting, proofFor, type AdsetsOutput } from '../../../api/_lib/groundswell/adsets';
import { ASSETS_BUCKET } from '../../../api/_lib/groundswell/assetStore';
import { brandFrom } from '../../../api/_lib/groundswell/brand';
import { imageSize } from '../../../api/_lib/groundswell/creative';
import { adImageHtml } from '../../../api/_lib/groundswell/creativeRender';
import type { Facts } from '../../../api/_lib/groundswell/model';
import { buildAdsetsHtml, channelAdRows, channelForecastRows, channelSetupRows } from '../../../api/_lib/groundswell/reportsAdsets';
import type { StepContext } from '../../../api/_lib/groundswell/types';
import { GROUNDSWELL_CONFIG } from '../../../packages/groundswell/groundswell.config';
import { UPB_ANGLES, UPB_INDUSTRY } from '../../../packages/groundswell/examples/uncommon-path-brewing';
import { buildAdPlan } from '../../../packages/groundswell/src/adplan';
import { buildChannelSets, type ChannelInput } from '../../../packages/groundswell/src/channels';
import { sampleAudit } from './fixtures/groundswell-report';

/**
 * The Reddit and TikTok sets as handed over (the writer's words held to the
 * facts, the plan workbook's rows, the PDF's cards, the vertical images), and
 * the rating an ad may state. Made-up business: Harbor Light Brewing.
 */

const config = GROUNDSWELL_CONFIG;
const industryOf = (id: string) => config.industries.find((i) => i.id === id)!;

function channelInput(industry = industryOf(UPB_INDUSTRY), over: Partial<ChannelInput> = {}): ChannelInput {
  return {
    business: { name: 'Harbor Light Brewing', code: 'HLB', area: 'Fort Lauderdale, FL', landing: 'https://harborlight.example/' },
    industry,
    rows: buildAdPlan(UPB_ANGLES, industry, config).rows,
    community: { communities: ['fortlauderdale'], questions: [{ community: 'fortlauderdale', question: 'Where can I host a birthday at a brewery?' }] },
    creative: [{ path: 'run-2/image/ig-A.jpg', name: 'ig-A.jpg', permalink: null, likes: 5, comments: 1 }],
    writing: {
      reddit_ads: [{ headline: 'A taproom with a private room for birthday groups', text: 'Beer brewed here, food from the kitchen.', call_to_action: 'Book a room', basis: 'reddit' }],
      tiktok_ads: [{ text: 'Your next party, in our taproom.', call_to_action: 'Learn more', image_headline: 'Your party, our taproom', basis: 'own_posts' }],
    },
    month: '2026-10',
    evidence: { own_posts: 'The business’s own posts and photos (1 kept).' },
    ...over,
  };
}

function adsetsWith(industry = industryOf(UPB_INDUSTRY)): AdsetsOutput {
  const channels = buildChannelSets(channelInput(industry), config);
  const zero = { monthly: 0, daily: 0, net: 0, year_net: 0, roi: null, modeled_spend: 0 };
  return {
    model: 'm',
    generated_at: '2026-10-27T12:00:00.000Z',
    basis: 'public',
    code: 'HLB',
    month: '2026-10',
    dropped: [],
    sets: { meta: [], google: null, carousel: null, totals: { low: zero, medium: zero, high: zero }, goals: { leads: 0, engagement: 0, rankings: 0 }, notes: channels.notes, reddit: channels.reddit, tiktok: channels.tiktok },
  };
}

beforeEach(() => {
  store.current = fakeSupabase();
});

describe('the writer’s Reddit, TikTok and proof ads, held to the facts', () => {
  const allowed = new Set(['4.7', '89']);
  const raw = {
    proof_ads: [
      { primary_text: '4.7 stars from 89 reviews on Yelp.', headline: 'Rated 4.7 on Yelp', image_headline: '4.7 stars on Yelp' },
      { primary_text: '4.9 stars from 300 reviews.', headline: 'Top rated', image_headline: 'Top rated' },
    ],
    reddit_ads: [
      { headline: 'A taproom with a private room for groups', text: 'Food from the kitchen, beer brewed here.', call_to_action: 'Book a room', image_headline: 'The best taproom in town', basis: 'reddit' },
      { headline: 'Party for 40 people', text: '', call_to_action: '', basis: 'reddit' },
      { headline: 'Brewed in Flagler Village', text: '', call_to_action: '', basis: 'made_up' },
    ],
    tiktok_ads: [{ text: 'Your next party, in our taproom.', call_to_action: 'Learn more', basis: 'own_posts' }, { text: 'The #1 brewery.', call_to_action: '', basis: 'website' }],
  };
  const { writing, channels, dropped } = checkWriting(raw, allowed, [], config);

  it('keeps a proof ad that states the rating as read, and drops one with figures not in the data', () => {
    expect(writing.proof_ads?.map((a) => a.primary_text)).toEqual(['4.7 stars from 89 reviews on Yelp.']);
    expect(dropped.join('\n')).toMatch(/Proof ad 2: "4.9 stars from 300 reviews\." \(number not in the data: 4\.9, 300\)/);
  });

  it('keeps Reddit ads that pass, names their basis, and clears image words that make a banned claim', () => {
    expect(channels.reddit_ads.map((a) => a.headline)).toEqual(['A taproom with a private room for groups', 'Brewed in Flagler Village']);
    // "best" is a banned claim on the image only: the ad stays, its image falls back to the headline.
    expect(channels.reddit_ads[0].image_headline).toBe('');
    // A basis the writer made up becomes the website.
    expect(channels.reddit_ads[1].basis).toBe('website');
    expect(dropped.join('\n')).toMatch(/Reddit ad 2: "Party for 40 people" \(number not in the data: 40\)/);
    expect(dropped.join('\n')).toMatch(/Reddit ad 1 image: "The best taproom in town"/);
  });

  it('drops a TikTok ad with a ranking claim', () => {
    expect(channels.tiktok_ads.map((a) => a.text)).toEqual(['Your next party, in our taproom.']);
    expect(dropped.join('\n')).toMatch(/TikTok ad 2/);
  });
});

describe('the rating an ad may state', () => {
  const facts = (yelp: [number, number] | null, google: [number, number] | null) =>
    ({
      reviews: yelp ? { business: { rating: yelp[0], reviews: yelp[1] } } : undefined,
      maps: google ? { business: { rating: google[0], reviews: google[1] } } : undefined,
    }) as unknown as Facts;

  it('takes the platform with more reviews of those that clear the setup file’s rule', () => {
    expect(proofFor(facts([4.7, 89], [4.6, 212]), config)).toEqual({ platform: 'Google', rating: 4.6, reviews: 212 });
    expect(proofFor(facts([4.7, 89], [4.2, 400]), config)).toEqual({ platform: 'Yelp', rating: 4.7, reviews: 89 });
  });

  it('states no rating under the rule’s floor', () => {
    expect(proofFor(facts([4.4, 900], [4.9, 12]), config)).toBeNull();
    expect(proofFor(facts(null, null), config)).toBeNull();
  });
});

describe('the Reddit and TikTok plan as handed over', () => {
  it('writes one row per ad with the data it was written from, its image and size, every ad paused', () => {
    const out = adsetsWith();
    const rows = channelAdRows(out, { RD_COMMUNITY_V1: { file: 'HLB_RD_COMMUNITY_V1.jpg' } });
    const head = rows[0] as string[];
    const at = (r: unknown[], col: string) => r[head.indexOf(col)];
    const reddit = rows.find((r) => at(r, 'Ad name') === 'RD_COMMUNITY_V1')!;
    expect(at(reddit, 'Availability')).toBe('Through the platform’s sales team');
    expect(at(reddit, 'Status')).toBe('PAUSED');
    expect(at(reddit, 'Image file')).toBe('reddit/HLB_RD_COMMUNITY_V1.jpg');
    expect(at(reddit, 'Image size')).toBe('1080 × 1350');
    expect(at(reddit, 'Built on')).toBe('Reddit questions and communities');
    expect(at(reddit, 'Evidence')).toBe('Asked in r/fortlauderdale: “Where can I host a birthday at a brewery?”');
    const tiktok = rows.find((r) => at(r, 'Platform') === 'TikTok')!;
    expect(at(tiktok, 'Image size')).toBe('1080 × 1920');
    expect(at(tiktok, 'Words on the image')).toBe('Your party, our taproom');
  });

  it('writes each set’s settings with the platform’s rule, and its spend at three budgets', () => {
    const out = adsetsWith();
    const setup = channelSetupRows(out);
    const head = setup[0] as string[];
    const reddit = setup.find((r) => r[0] === 'Reddit')!;
    expect(reddit[head.indexOf('Platform rule')]).toMatch(/managed sales team/);
    expect(reddit[head.indexOf('Recommendation')]).toBe('sales team');
    expect(reddit[head.indexOf('Age min')]).toBe(21);
    expect(reddit[head.indexOf('Communities')]).toBe('r/fortlauderdale');
    const min = config.platforms.reddit.test_budget!.min_monthly;
    const forecast = channelForecastRows(out).filter((r) => r[0] === 'Reddit');
    expect(forecast.map((r) => [r[2], r[3], r[9]])).toEqual([
      ['low', min, 'not modeled'],
      ['medium', min * 2, 'not modeled'],
      ['high', min * 4, 'not modeled'],
    ]);
    // TikTok has published rates: clicks are shown, and the return where the row is modeled.
    const tiktok = channelForecastRows(out).filter((r) => r[0] === 'TikTok');
    expect(tiktok.length).toBe(3 * (out.sets.tiktok?.length ?? 0));
    expect(tiktok.every((r) => typeof r[5] === 'number')).toBe(true);
  });

  it('prints a card per set with each ad’s basis, the sales-team route, and the sets outside the totals', () => {
    const html = buildAdsetsHtml({ business: 'Harbor Light Brewing', brand: brandFrom(null), date: 'October 27, 2026', phase: 'competitors', adsets: adsetsWith(), images: {}, carousel: [], carouselCaption: null, siteChanges: [] });
    expect(html).toContain('The Reddit and TikTok sets');
    expect(html.match(/data-platform="reddit"/g)).toHaveLength(1);
    expect(html).toMatch(/data-role="sales-team"/);
    expect(html).toMatch(/data-role="basis"><b>Built on:<\/b> Reddit questions and communities/);
    expect(html).toContain('are not in the totals above');
    // The sales-team route in the hand-over, not Ads Manager steps.
    expect(html).toMatch(/Send the “Reddit and TikTok Ad Plan” workbook/);
    expect(html).not.toMatch(/In Reddit Ads Manager, create a Traffic campaign/);
  });

  it('gives a self-serve set its Ads Manager steps instead', () => {
    const html = buildAdsetsHtml({ business: 'Harbor Light Hall', brand: brandFrom(null), date: 'October 27, 2026', phase: 'competitors', adsets: adsetsWith(industryOf('event_venue')), images: {}, carousel: [], carouselCaption: null, siteChanges: [] });
    expect(html).toMatch(/In Reddit Ads Manager, create a Traffic campaign/);
    expect(html).toMatch(/In TikTok Ads Manager, create a Traffic campaign/);
    expect(html).not.toMatch(/data-role="sales-team"/);
  });

  it('lays the vertical image out at 1080 × 1920 with the words clear of the bottom quarter', () => {
    const html = adImageHtml(brandFrom(null), { headline: 'Your party, our taproom', handle: 'harborlight', photo: 'data:image/jpeg;base64,AA==', size: 'vertical' });
    expect(html).toContain('width:1080px;height:1920px');
    expect(html).toContain('padding:56px 180px 480px 80px');
    expect(adImageHtml(brandFrom(null), { headline: 'h', handle: null, photo: null })).toContain('width:1080px;height:1350px');
  });
});

const chromium = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';

describe('printing the Reddit and TikTok ads', () => {
  it.skipIf(!existsSync(chromium))('renders Reddit’s ads at 1080 × 1350 and TikTok’s at 1080 × 1920, and ships the plan workbook and the images by platform', async () => {
    process.env.CHROMIUM_PATH = chromium;
    const { runDeliverAdsets, runDeliverCreatives } = await import('../../../api/_lib/groundswell/adsetsDelivery');
    // A 1×1 white JPEG is enough for the page to lay out.
    store.current!.objects[ASSETS_BUCKET] = new Map([['run-2/image/ig-A.jpg', new Uint8Array([0xff, 0xd8, 0xff, 0xd9])]]);
    const out = adsetsWith();
    const ctx = (outputs: Record<string, unknown>): StepContext => ({ audit: { ...sampleAudit, id: 'run-2', phase: 'competitors', business_name: 'Harbor Light Brewing' }, outputs, deadline: Date.now() + 120_000, attempt: 1 });
    const creatives = await runDeliverCreatives(ctx({ adsets: out }));
    const reddit = creatives.ads.RD_COMMUNITY_V1;
    expect(reddit).toMatchObject({ platform: 'reddit', size: 'feed' });
    expect(imageSize(store.current!.objects[ASSETS_BUCKET].get(reddit.path)!)).toMatchObject({ width: 1080, height: 1350 });
    const tiktok = Object.values(creatives.ads).find((a) => a.platform === 'tiktok');
    expect(tiktok).toMatchObject({ size: 'vertical' });
    expect(imageSize(store.current!.objects[ASSETS_BUCKET].get(tiktok!.path)!)).toMatchObject({ width: 1080, height: 1920 });
    const delivered = await runDeliverAdsets(ctx({ adsets: out, deliver_creatives: creatives, deliver_prepare: { bucket: 'groundswell-reports', prefix: 'run-2' } }));
    const names = delivered.exports.map((e) => e.name.replace(/ \(\d{4}-\d{2}-\d{2}\)/, ''));
    expect(names).toEqual(['Harbor Light Brewing - Reddit and TikTok Ad Plan.xlsx', 'Harbor Light Brewing - Ad Images.zip']);
    const zip = Buffer.from(store.current!.objects[ASSETS_BUCKET].get(delivered.exports[1].path)!);
    expect(zip.includes('reddit/HLB_RD_COMMUNITY_V1.jpg')).toBe(true);
    expect(zip.includes(`tiktok/${tiktok!.name}`)).toBe(true);
    expect(delivered.report.pages).toBeGreaterThan(1);
  }, 180_000);
});
