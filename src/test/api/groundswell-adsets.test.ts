import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from './fixtures/fakeSupabase';

const store = vi.hoisted(() => ({ current: null as null | ReturnType<typeof import('./fixtures/fakeSupabase').fakeSupabase> }));
const tools = vi.hoisted(() => ({ executeTool: vi.fn() }));
const ai = vi.hoisted(() => ({ chatJson: vi.fn() }));

vi.mock('../../../api/_lib/supabaseAdmin', () => ({ isSupabaseConfigured: () => true, getSupabaseAdmin: () => store.current!.client }));
vi.mock('../../../api/_lib/groundswell/composio', async (original) => ({ ...(await original<object>()), executeTool: tools.executeTool }));
vi.mock('../../../api/_lib/groundswell/openai', async (original) => ({ ...(await original<object>()), chatJson: ai.chatJson }));

import { checkWriting, runAdsets, writerInput, type AdsetsOutput } from '../../../api/_lib/groundswell/adsets';
import { ASSETS_BUCKET } from '../../../api/_lib/groundswell/assetStore';
import { download, imageSize, MIN_SIDE, rankMedia, runCreative } from '../../../api/_lib/groundswell/creative';
import { mediaFrom } from '../../../api/_lib/groundswell/currents/social';
import { buildXlsx, crc32, toCsv, zipFiles } from '../../../api/_lib/groundswell/files';
import { forecastRows, googleEditorRows, META_COLUMNS, metaBulkRows, metaSetupRows } from '../../../api/_lib/groundswell/reportsAdsets';
import { buildFacts, numbersIn } from '../../../api/_lib/groundswell/model';
import type { StepContext } from '../../../api/_lib/groundswell/types';
import { GROUNDSWELL_CONFIG } from '../../../packages/groundswell/groundswell.config';
import { sampleAdplanOutput, sampleAudit, sampleOutputs } from './fixtures/groundswell-report';

/**
 * Phase 2's ad sets: the business's own Instagram images, the sets built from
 * the plan with spend and return at three budgets, and the files a person
 * imports (Meta's bulk sheet in the columns of New Wave's own Wildly Primal
 * import, Google Ads Editor's CSV).
 */

/** A JPEG header of the given size (SOI, a JFIF segment, SOF0). */
function jpeg(width: number, height: number): Uint8Array {
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, height >> 8, height & 255, width >> 8, width & 255, 0x03, 0x01, 0x22, 0x00, 0xff, 0xd9]);
}
function png(width: number, height: number): Uint8Array {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, width);
  new DataView(b.buffer).setUint32(20, height);
  return b;
}

/** A post as the live trimmed ScrapeCreators page lists it (fields read on 2026-10-22). */
const livePost = (code: string, likes: number, comments: number, type = 1) => ({
  code,
  url: `https://www.instagram.com/p/${code}/`,
  taken_at: 1792512391,
  media_type: type,
  like_count: likes,
  comment_count: comments,
  caption: { text: `Post ${code}` },
  display_uri: `https://cdn.example/${code}-640.jpg`,
  image_versions2: { candidates: [{ url: `https://cdn.example/${code}-orig.jpg` }, { url: `https://cdn.example/${code}-crop.jpg`, width: 640, height: 640 }] },
});

function ctxWith(outputs: Record<string, unknown>, over: Partial<StepContext> = {}): StepContext {
  return { audit: { ...sampleAudit, id: 'run-2', phase: 'competitors' }, outputs, deadline: Date.now() + 120_000, attempt: 1, ...over };
}

beforeEach(() => {
  store.current = fakeSupabase();
  tools.executeTool.mockReset();
  ai.chatJson.mockReset();
});

describe('the business’s own images', () => {
  it('reads the size of a JPEG, a PNG or a WebP, and nothing else', () => {
    expect(imageSize(jpeg(1080, 1350))).toEqual({ width: 1080, height: 1350, type: 'image/jpeg' });
    expect(imageSize(png(640, 480))).toEqual({ width: 640, height: 480, type: 'image/png' });
    const webp = new Uint8Array(32);
    webp.set([...'RIFF'].map((c) => c.charCodeAt(0)), 0);
    webp.set([...'WEBPVP8X'].map((c) => c.charCodeAt(0)), 8);
    webp.set([0x37, 0x04, 0x00, 0x45, 0x05, 0x00], 24);
    expect(imageSize(webp)).toEqual({ width: 1080, height: 1350, type: 'image/webp' });
    expect(imageSize(new TextEncoder().encode('<html>blocked</html>'))).toBeNull();
  });

  it('lists posts from ScrapeCreators and from Apify, the original image first, best performers first', () => {
    const sc = mediaFrom({ items: [livePost('A', 10, 0), livePost('B', 50, 5, 2), { code: 'noimg', like_count: 900 }] });
    expect(sc.map((m) => [m.code, m.image_url, m.type])).toEqual([
      ['A', 'https://cdn.example/A-orig.jpg', 'image'],
      ['B', 'https://cdn.example/B-orig.jpg', 'video'],
    ]);
    const apify = mediaFrom([{ shortCode: 'C', url: 'https://www.instagram.com/p/C/', displayUrl: 'https://cdn.example/C.jpg', likesCount: 30, commentsCount: 20, type: 'Sidecar', timestamp: '2026-10-01T00:00:00.000Z', caption: 'Apify post' }]);
    expect(apify[0]).toMatchObject({ code: 'C', image_url: 'https://cdn.example/C.jpg', type: 'carousel', likes: 30, comments: 20, caption: 'Apify post' });
    expect(rankMedia([...sc, ...apify]).map((m) => m.code)).toEqual(['C', 'B', 'A']);
  });

  it('keeps only real images big enough for a 1080 × 1350 ad', async () => {
    const answer = (bytes: Uint8Array, ok = true) => vi.fn(async () => ({ ok, arrayBuffer: async () => bytes.buffer })) as unknown as typeof fetch;
    expect(await download('https://x/a.jpg', answer(jpeg(1080, 1080)))).toMatchObject({ width: 1080, height: 1080 });
    expect(await download('https://x/a.jpg', answer(jpeg(MIN_SIDE - 1, 900)))).toBeNull();
    expect(await download('https://x/a.jpg', answer(jpeg(1080, 1080), false))).toBeNull();
    expect(await download('https://x/a.jpg', answer(new TextEncoder().encode('not an image')))).toBeNull();
  });

  it('stores phase 1’s images first, falls back to a fresh read when those links expired, and never a competitor’s', async () => {
    const outputs = sampleOutputs();
    (outputs.social as { business: Record<string, unknown> }).business.media = mediaFrom({ items: [livePost('OLD', 99, 9)] });
    tools.executeTool.mockImplementation(async (slug: string) => {
      if (slug === 'SCRAPECREATORS_LIST_INSTAGRAM_USER_POSTS') return { items: [livePost('NEW1', 40, 2), livePost('NEW2', 20, 1)] };
      throw new Error(`unexpected ${slug}`);
    });
    const fetchImpl = vi.fn(async (url: string) => (url.includes('OLD') ? { ok: false, arrayBuffer: async () => new ArrayBuffer(0) } : { ok: true, arrayBuffer: async () => jpeg(1080, 1350).buffer })) as unknown as typeof fetch;
    const out = await runCreative(ctxWith(outputs), fetchImpl);
    expect(out.images.map((i) => i.name)).toEqual(['ig-NEW1.jpg', 'ig-NEW2.jpg']);
    expect(out.images[0]).toMatchObject({ origin: 'instagram', width: 1080, height: 1350, permalink: 'https://www.instagram.com/p/NEW1/', likes: 40 });
    expect(out.tried[0]).toMatch(/Growth audit’s Instagram read: 1 post listed, 0 images kept/);
    expect([...store.current!.objects[ASSETS_BUCKET].keys()]).toEqual(['run-2/image/ig-NEW1.jpg', 'run-2/image/ig-NEW2.jpg']);
    expect(store.current!.tables.groundswell_assets.map((r) => r.kind)).toEqual(['image', 'image']);
    // Only the business's handle is ever read.
    expect(tools.executeTool.mock.calls.every(([, args]) => (args as { handle?: string }).handle === 'harborautocare')).toBe(true);
  });

  it('with Instagram unreadable, the images on the business’s Facebook posts (phase 1’s read) come before the website’s share image', async () => {
    const outputs = sampleOutputs();
    (outputs.social as { facebook?: unknown }).facebook = {
      url: 'https://www.facebook.com/harborauto', page_id: '1', page_name: 'Harbor Auto Care', exists: true, followers: 1900, likes: null, category: null, intro: null, rating: null, rating_count: null, ad_library_status: null, restricted: true, error: null,
      posts: [
        { url: 'https://www.facebook.com/harborauto/posts/1', text: 'New lift installed.', posted_at: '2026-10-20T16:06:31.000Z', reactions: 44, comments: 5, shares: null, video_views: null, image_url: 'https://scontent.example/p1.jpg' },
        { url: 'https://www.facebook.com/harborauto/posts/2', text: 'Closed Monday.', posted_at: '2026-10-18T16:06:31.000Z', reactions: 4, comments: 0, shares: null, video_views: 120, image_url: null },
      ],
    };
    tools.executeTool.mockRejectedValue(new Error('Instagram blocked access to this user’s public posts.'));
    const fetchImpl = vi.fn(async () => ({ ok: true, arrayBuffer: async () => jpeg(1080, 1080).buffer })) as unknown as typeof fetch;
    const out = await runCreative(ctxWith(outputs), fetchImpl);
    // One Facebook image is fewer than two, so the website's share image still follows it.
    expect(out.images.map((i) => [i.name, i.origin, i.permalink, i.likes, i.caption])).toEqual([
      ['fb-1.jpg', 'facebook', 'https://www.facebook.com/harborauto/posts/1', 44, 'New lift installed.'],
      ['site-share-image.jpg', 'website', null, null, null],
    ]);
    expect(out.source).toBe('The business’s own Facebook posts');
    expect(out.tried).toContain('The business’s Facebook posts: 1 with an image, 1 kept.');
    expect(tools.executeTool.mock.calls.map(([slug]) => slug)).toEqual(['SCRAPECREATORS_LIST_INSTAGRAM_USER_POSTS', 'APIFY_SCRAPE_INSTAGRAM_POSTS']);
  });

  it('tries Apify, then the website’s share image; with nothing usable the step is skipped, saying what was tried', async () => {
    tools.executeTool.mockRejectedValue(new Error('Instagram blocked access to this user’s public posts.'));
    const nothing = vi.fn(async () => ({ ok: false, arrayBuffer: async () => new ArrayBuffer(0) })) as unknown as typeof fetch;
    const err = await runCreative(ctxWith(sampleOutputs()), nothing).catch((e: Error) => e);
    expect((err as Error).message).toMatch(/No usable image of the business’s own was found/);
    expect((err as Error).message).toMatch(/Apify: Instagram blocked/);
    expect(tools.executeTool.mock.calls.map(([slug]) => slug)).toEqual(['SCRAPECREATORS_LIST_INSTAGRAM_USER_POSTS', 'APIFY_SCRAPE_INSTAGRAM_POSTS']);
  });
});

describe('the writer’s words, held to the facts', () => {
  const plan = sampleAdplanOutput();
  const facts = buildFacts(sampleAudit, sampleOutputs());
  const input = writerInput(facts, plan, ['Brakes done same day.'], GROUNDSWELL_CONFIG);
  const allowed = numbersIn(input.facts, input.best_post_captions, input.angles);

  it('drops an invented number, a banned claim, and a negative that would block a bought keyword', () => {
    const { writing, dropped } = checkWriting(
      {
        engagement_ads: [
          { primary_text: 'Brakes checked while you wait.', headline: 'Brakes, same day', image_headline: 'Your brakes, checked today' },
          { primary_text: 'Save 20% this week.', headline: 'Deal', image_headline: 'Deal' },
          { primary_text: 'The best shop in town.', headline: 'Best', image_headline: 'Best' },
        ],
        image_headlines: { 'brake-repair': 'Brakes that stop on time', x: 'Rated 4.6 by 212 drivers' },
        carousel: { title: 'Brake care', slides: [{ headline: 'Squeal is a signal', body: 'It means the pads are worn.' }, { headline: 'Book a check', body: 'Online or by phone.' }], caption: 'Save this. When did you last check yours? 90% skip it.' },
        negatives: [{ text: 'brake repair', reason: 'blocks' }, { text: 'diy brake', reason: 'Do-it-yourself.' }, { text: 'jobs!!', reason: 'bad' }],
        interests: ['Cars', 'Automobile repair shop'],
      },
      allowed,
      input.plan_keywords,
      GROUNDSWELL_CONFIG
    );
    expect(writing.engagement_ads.map((a) => a.headline)).toEqual(['Brakes, same day']);
    // 4.6 and 212 are the business's own Google rating and review count: allowed.
    expect(writing.image_headlines).toEqual({ 'brake-repair': 'Brakes that stop on time', x: 'Rated 4.6 by 212 drivers' });
    expect(writing.carousel?.slides).toHaveLength(2);
    expect(writing.carousel?.caption).toBe('Save this. When did you last check yours?');
    expect(writing.negatives).toEqual([{ text: 'diy brake', reason: 'Do-it-yourself.' }]);
    expect(dropped.join('\n')).toMatch(/number not in the data: 20/);
    expect(dropped.join('\n')).toMatch(/claim not allowed: best/);
    expect(dropped.join('\n')).toMatch(/Negative "brake repair": it would block a keyword the plan buys/);
  });

  it('builds the sets from phase 1’s plan with the business’s images, and keeps going if the writer is down', async () => {
    const outputs = { ...sampleOutputs(), adplan: plan, creative: { source: 's', fetched_at: '', handle: 'harborautocare', tried: [], images: [{ path: 'run-2/image/ig-A.jpg', name: 'ig-A.jpg', permalink: null, likes: 5, comments: 1, origin: 'instagram', type: 'image', taken_at: null, caption: 'Brakes done same day.', content_type: 'image/jpeg' }] } };
    ai.chatJson.mockRejectedValue(new Error('OpenAI answered 503'));
    const out = await runAdsets(ctxWith(outputs));
    // "Harbor Auto Care (sample)": the initials of every word.
    expect(out).toMatchObject({ basis: 'public', code: 'HACS', model: null });
    expect(out.dropped[0]).toMatch(/The writer did not answer/);
    const live = plan.plan.rows.filter((r) => r.recommendation !== 'skip');
    expect(out.sets.meta.filter((m) => m.goal === 'leads')).toHaveLength(live.filter((r) => r.platform === 'meta').length);
    expect((out.sets.google?.ad_groups ?? []).filter((g) => g.goal === 'leads')).toHaveLength(live.filter((r) => r.platform === 'google_search').length);
    expect(out.sets.totals.low.monthly).toBeLessThanOrEqual(out.sets.totals.high.monthly);
    for (const set of out.sets.meta) for (const ad of set.ads) expect(ad.image?.path).toBe('run-2/image/ig-A.jpg');
  });

  it('a run with no plan has no ad sets, and says why', async () => {
    await expect(runAdsets(ctxWith(sampleOutputs()))).rejects.toThrow(/There is no ad plan/);
  });
});

describe('the import files', () => {
  const sets = (): AdsetsOutput => ({
    model: 'm',
    generated_at: '2026-10-22T12:00:00.000Z',
    basis: 'public',
    code: 'HAC',
    month: '2026-10',
    dropped: [],
    sets: {
      meta: [
        {
          id: 'meta-brake-repair',
          campaign: 'HAC_LEADS_TRAFFIC_2026-10',
          name: 'HAC_BRAKE-REPAIR_FORT-LAUDERDALE_2026-10',
          goal: 'leads',
          angle: 'Brake repair',
          objective: 'OUTCOME_TRAFFIC',
          optimization_goal: 'LANDING_PAGE_VIEWS',
          recommendation: 'fund',
          why: 'w',
          mechanism: 'm',
          kpi: 'k',
          audience: { location: 'Fort Lauderdale, FL', radius_miles: 15, age_min: 18, age_max: 65, interests: ['Cars'] },
          placements: ['Instagram feed'],
          tiers: {
            low: { monthly: 150, daily: 4.93, clicks: 250, leads: 4, customers: 1, revenue: 400, net: 50, year_net: 300, roi: 0.33 },
            medium: { monthly: 300, daily: 9.87, clicks: 500, leads: 8, customers: 2, revenue: 800, net: 100, year_net: 900, roi: 0.33 },
            high: { monthly: 600, daily: 19.74, clicks: 1000, leads: 16, customers: 4, revenue: 1600, net: 200, year_net: 2000, roi: 0.33 },
          },
          range: null,
          modeled: true,
          stop_loss: 'Pause above $50 a lead.',
          ads: [{ name: 'IMG_BRAKE-REPAIR_V1', primary_text: 'Brakes, same day.', headline: 'Brakes, same day', description: 'Fort Lauderdale', call_to_action: 'BOOK_NOW', image_headline: 'h', image: null, link: 'https://harbor-auto.example/?utm_source=meta', display_link: 'harbor-auto.example' }],
          sources: [],
        },
      ],
      google: {
        name: 'HAC_SEARCH_2026-10',
        bid_strategy: 'Maximize clicks',
        networks: 'Google Search',
        location: 'Fort Lauderdale, FL',
        ad_groups: [
          {
            id: 'google-brake-repair',
            name: 'Brake repair',
            goal: 'leads',
            angle: 'Brake repair',
            recommendation: 'fund',
            why: '',
            mechanism: '',
            kpi: '',
            keywords: [
              { text: 'brake repair near me', match: 'exact', monthly_searches: 900, low_bid_usd: 5, high_bid_usd: 14, position: null },
              { text: 'brake repair near me', match: 'phrase', monthly_searches: 900, low_bid_usd: 5, high_bid_usd: 14, position: null },
            ],
            final_url: 'https://harbor-auto.example/',
            headlines: ['Brake Repair Today', 'Book Online', 'Fort Lauderdale Shop'],
            descriptions: ['Brakes checked while you wait.', 'Book online in a minute.'],
            path1: 'brakes',
            path2: '',
            tiers: {
              low: { monthly: 200, daily: 6.58, clicks: 30, leads: 2, customers: 1, revenue: 500, net: 100, year_net: 800, roi: 0.5 },
              medium: { monthly: 300, daily: 9.87, clicks: 45, leads: 3, customers: 1.5, revenue: 750, net: 150, year_net: 1200, roi: 0.5 },
              high: { monthly: 400, daily: 13.16, clicks: 60, leads: 4, customers: 2, revenue: 1000, net: 200, year_net: 1600, roi: 0.5 },
            },
            range: null,
            modeled: true,
            stop_loss: null,
            sources: [],
          },
        ],
        negatives: [{ text: 'jobs', match: 'phrase', reason: 'r' }],
      },
      carousel: null,
      totals: {
        low: { monthly: 350, daily: 11.5, net: 150, year_net: 1100, roi: 0.43, modeled_spend: 350 },
        medium: { monthly: 600, daily: 19.7, net: 250, year_net: 2100, roi: 0.42, modeled_spend: 600 },
        high: { monthly: 1000, daily: 32.9, net: 400, year_net: 3600, roi: 0.4, modeled_spend: 1000 },
      },
      goals: { leads: 2, engagement: 0, rankings: 0 },
      notes: [],
    },
  });

  it('writes Meta’s bulk sheet in the columns of New Wave’s own import, every ad paused, with its image file', () => {
    const rows = metaBulkRows(sets(), { 'IMG_BRAKE-REPAIR_V1': { file: 'HAC_IMG_BRAKE-REPAIR_V1.jpg' } });
    // The Wildly Primal import's columns, in its order.
    expect(rows[0]).toEqual([...META_COLUMNS]);
    expect(META_COLUMNS).toEqual(['Campaign ID', 'Campaign Name', 'Ad Set ID', 'Ad Set Name', 'Ad Name', 'Ad Status', 'Title', 'Body', 'Link Description', 'Display Link', 'Link', 'Call to Action', 'Image Hash', 'Image File Name', 'Creative Type', 'Link Object ID', 'Instagram Account ID', 'URL Tags']);
    expect(rows[1]).toEqual(['', 'HAC_LEADS_TRAFFIC_2026-10', '', 'HAC_BRAKE-REPAIR_FORT-LAUDERDALE_2026-10', 'IMG_BRAKE-REPAIR_V1', 'PAUSED', 'Brakes, same day', 'Brakes, same day.', 'Fort Lauderdale', 'harbor-auto.example', 'https://harbor-auto.example/?utm_source=meta', 'BOOK_NOW', '', 'HAC_IMG_BRAKE-REPAIR_V1.jpg', 'Link Page Post Ad', '', '', '']);
    expect(metaSetupRows(sets())[1].slice(7, 10)).toEqual([4.93, 9.87, 19.74]);
    expect(forecastRows(sets()).filter((r) => r[1] === 'Brake repair').map((r) => [r[3], r[11]])).toEqual([['low', 0.5], ['medium', 0.5], ['high', 0.5]]);
    expect(forecastRows(sets())[0][12]).toBe('Note');
  });

  it('writes Google Ads Editor rows: the campaign paused at the medium budget, keywords by match type, the ad, the negatives', () => {
    const rows = googleEditorRows(sets());
    const head = rows[0] as string[];
    const at = (r: unknown[], col: string) => r[head.indexOf(col)];
    expect(head.slice(0, 11)).toEqual(['Campaign', 'Campaign Type', 'Campaign Status', 'Campaign Daily Budget', 'Bid Strategy Type', 'Networks', 'Ad Group', 'Ad Group Status', 'Keyword', 'Criterion Type', 'Final URL']);
    expect(at(rows[1], 'Campaign Daily Budget')).toBe(9.87);
    expect(at(rows[1], 'Campaign Status')).toBe('Paused');
    expect(rows.filter((r) => at(r, 'Keyword') === 'brake repair near me').map((r) => at(r, 'Criterion Type'))).toEqual(['Exact', 'Phrase']);
    const ad = rows.find((r) => at(r, 'Ad Type') === 'Responsive search ad')!;
    expect([at(ad, 'Headline 1'), at(ad, 'Headline 3'), at(ad, 'Description 2'), at(ad, 'Path 1')]).toEqual(['Brake Repair Today', 'Fort Lauderdale Shop', 'Book online in a minute.', 'brakes']);
    const negative = rows.find((r) => at(r, 'Keyword') === 'jobs')!;
    expect([at(negative, 'Campaign'), at(negative, 'Criterion Type')]).toEqual(['HAC_SEARCH_2026-10', 'Campaign Negative Phrase']);
    expect(toCsv([['a,b', 'say "hi"'], ['x', null]])).toBe('﻿"a,b","say ""hi"""\r\nx,\r\n');
  });

  it('writes a zip any tool can read, and an XLSX workbook with a sheet per table', () => {
    const zip = zipFiles([{ name: 'caption.txt', data: 'Save this.'.repeat(50) }, { name: 'a.jpg', data: jpeg(1080, 1350) }]);
    const view = new DataView(zip.buffer, zip.byteOffset);
    const end = zip.length - 22;
    expect(view.getUint32(end, true)).toBe(0x06054b50);
    expect(view.getUint16(end + 10, true)).toBe(2);
    // The first entry inflates back to its text, and its checksum matches.
    const nameLength = view.getUint16(26, true);
    const size = view.getUint32(18, true);
    const body = zip.slice(30 + nameLength, 30 + nameLength + size);
    const text = view.getUint16(8, true) === 8 ? new Uint8Array(inflateRawSync(body)) : body;
    expect(new TextDecoder().decode(text)).toBe('Save this.'.repeat(50));
    expect(view.getUint32(14, true)).toBe(crc32(text));
    const xlsx = new TextDecoder('latin1').decode(buildXlsx([{ name: 'Ads', rows: [['Title', 3]] }, { name: 'Ad sets', rows: [] }]));
    for (const part of ['[Content_Types].xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml']) expect(xlsx).toContain(part);
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });
});

const chromium = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
describe('printing the ad sets', () => {
  it.skipIf(!existsSync(chromium))('renders each ad image and the carousel at 1080 × 1350 and prints the ad-sets PDF with no links', async () => {
    process.env.CHROMIUM_PATH = chromium;
    const { runDeliverAdsets, runDeliverCreatives } = await import('../../../api/_lib/groundswell/adsetsDelivery');
    const plan = sampleAdplanOutput();
    const photo = jpeg(1080, 1350);
    store.current!.objects[ASSETS_BUCKET] = new Map([['run-2/image/ig-A.jpg', photo]]);
    const outputs: Record<string, unknown> = { ...sampleOutputs(), adplan: plan };
    ai.chatJson.mockResolvedValue({
      engagement_ads: [{ primary_text: 'Brakes checked while you wait.', headline: 'Same-day brakes', image_headline: 'Brakes checked while you wait' }],
      image_headlines: {},
      carousel: { title: 'Brake care', slides: [{ headline: 'Squeal is a signal', body: 'It usually means the pads are worn.' }, { headline: 'Book a check', body: 'Online or by phone.' }], caption: 'When did you last check yours?' },
      negatives: [{ text: 'diy brake', reason: 'Do-it-yourself.' }],
      interests: ['Cars'],
    });
    outputs.creative = { source: 's', fetched_at: '', handle: 'harborautocare', tried: [], images: [{ path: 'run-2/image/ig-A.jpg', name: 'ig-A.jpg', permalink: null, likes: 5, comments: 1, origin: 'instagram', type: 'image', taken_at: null, caption: null, content_type: 'image/jpeg' }] };
    outputs.adsets = await runAdsets(ctxWith(outputs));
    outputs.deliver_prepare = { bucket: 'groundswell-reports', prefix: 'run-2' };
    const creatives = await runDeliverCreatives(ctxWith(outputs));
    outputs.deliver_creatives = creatives;
    const delivered = await runDeliverAdsets(ctxWith(outputs));

    const firstAd = Object.values(creatives.ads)[0];
    const image = store.current!.objects[ASSETS_BUCKET].get(firstAd.path)!;
    expect(imageSize(image)).toMatchObject({ width: 1080, height: 1350, type: 'image/jpeg' });
    expect(creatives.carousel.slides).toHaveLength(2);
    expect(imageSize(store.current!.objects[ASSETS_BUCKET].get(creatives.carousel.slides[0].path)!)).toMatchObject({ width: 1080, height: 1350, type: 'image/png' });
    expect(delivered.report).toMatchObject({ kind: 'adsets' });
    expect(delivered.report.pages).toBeGreaterThan(1);
    const hasGoogle = Boolean((outputs.adsets as AdsetsOutput).sets.google);
    expect(delivered.exports.map((e) => e.name.replace(/ \(\d{4}-\d{2}-\d{2}\)/, ''))).toEqual([
      'Harbor Auto Care (sample) - Meta Bulk Import.xlsx',
      ...(hasGoogle ? ['Harbor Auto Care (sample) - Google Ads Editor.csv'] : []),
      'Harbor Auto Care (sample) - Ad Images.zip',
      'Harbor Auto Care (sample) - Carousel.zip',
    ]);
    // Saved for a look by eye when asked (GS_SAVE_DIR).
    if (process.env.GS_SAVE_DIR) {
      mkdirSync(process.env.GS_SAVE_DIR, { recursive: true });
      for (const [key, bytes] of store.current!.objects[ASSETS_BUCKET]) writeFileSync(path.join(process.env.GS_SAVE_DIR, key.replace(/\//g, '__')), bytes);
      for (const [key, bytes] of store.current!.objects['groundswell-reports'] ?? []) writeFileSync(path.join(process.env.GS_SAVE_DIR, key.replace(/\//g, '__')), bytes);
    }
  }, 180_000);
});
