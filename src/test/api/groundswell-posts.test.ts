import { existsSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from './fixtures/fakeSupabase';

const store = vi.hoisted(() => ({ current: null as null | ReturnType<typeof import('./fixtures/fakeSupabase').fakeSupabase> }));
const tools = vi.hoisted(() => ({ executeTool: vi.fn() }));
const ai = vi.hoisted(() => ({ chatJson: vi.fn() }));

vi.mock('../../../api/_lib/supabaseAdmin', () => ({ isSupabaseConfigured: () => true, getSupabaseAdmin: () => store.current!.client }));
vi.mock('../../../api/_lib/groundswell/composio', async (original) => ({ ...(await original<object>()), executeTool: tools.executeTool }));
vi.mock('../../../api/_lib/groundswell/openai', async (original) => ({ ...(await original<object>()), chatJson: ai.chatJson }));

import { ASSETS_BUCKET } from '../../../api/_lib/groundswell/assetStore';
import { imageSize } from '../../../api/_lib/groundswell/creative';
import { postImageHtml, showWhole } from '../../../api/_lib/groundswell/creativeRender';
import { falImageUrl, generateImage, GENERATION_SIZES } from '../../../api/_lib/groundswell/imageGen';
import { AI_LIMIT, checkReplies, postSize, runPosts, scenePrompt, type PostsOutput } from '../../../api/_lib/groundswell/posts';
import { PermanentStepError, type StepContext } from '../../../api/_lib/groundswell/types';
import { sampleAudit } from './fixtures/groundswell-report';

/**
 * Phase 2's posts: the social plan's week with images (the business's own
 * photos first, AI scenes where they run out, tagged), the image generator's
 * paths (Composio's fal tool, then fal with FAL_KEY), and the Reddit replies
 * held to the facts. Made-up business: Harbor Auto Care (sample).
 */

/** A JPEG header of the given size (SOI, a JFIF segment, SOF0). */
function jpeg(width: number, height: number): Uint8Array {
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, height >> 8, height & 255, width >> 8, width & 255, 0x03, 0x01, 0x22, 0x00, 0xff, 0xd9]);
}
const imageFetch = (width: number, height: number) => vi.fn(async () => new Response(jpeg(width, height), { status: 200, headers: { 'content-type': 'image/jpeg' } })) as unknown as typeof fetch;

const post = (day: string, platform = 'instagram', format = 'post', visual = 'The service bay with a car on the lift') => ({ day, platform, format, pillar: 'In the shop', topic: `${day} topic`, hook: 'Stop by', caption: `A ${day} caption.`, cta: 'Book a check', visual, hashtags: ['brakes'] });
const plans = (week = [post('Monday'), post('Tuesday', 'instagram', 'reel'), post('Wednesday', 'linkedin', 'text'), post('Thursday', 'tiktok', 'video')]) => ({
  model: 'gpt',
  generated_at: '2026-10-27T10:00:00.000Z',
  sources: [],
  website_plan: { summary: '', changes: [], new_pages: [], measurement: [] },
  social_plan: { summary: 'Four posts.', platforms: [], pillars: [], week },
  dropped: [],
});
const ownPhoto = { path: 'run-2/image/ig-A.jpg', name: 'ig-A.jpg', permalink: null, likes: 5, comments: 1, origin: 'instagram', type: 'image', taken_at: null, caption: null, content_type: 'image/jpeg' };
const community = {
  source: 's',
  fetched_at: '',
  queries: [],
  business: { mentions: [], communities: [], topics: [] },
  category: { term: 'auto repair', questions: [{ kind: 'post', subreddit: 'fortlauderdale', title: 'Any honest mechanic near downtown?', excerpt: '', score: 12, comments: 30, posted_at: null, url: 'https://www.reddit.com/r/fortlauderdale/comments/x/' }], communities: [{ name: 'fortlauderdale', count: 1 }] },
  competitors: [],
  tags: [],
  left_out: 0,
  note: '',
};

function ctxWith(outputs: Record<string, unknown>): StepContext {
  return { audit: { ...sampleAudit, id: 'run-2', phase: 'competitors' }, outputs, deadline: Date.now() + 240_000, attempt: 1 };
}

/** The entries of a zip the engine wrote, by name. */
function unzip(zip: Uint8Array): Map<string, Uint8Array> {
  const out = new Map<string, Uint8Array>();
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let at = 0;
  while (at + 30 <= zip.length && view.getUint32(at, true) === 0x04034b50) {
    const size = view.getUint32(at + 18, true);
    const nameLength = view.getUint16(at + 26, true);
    const name = new TextDecoder().decode(zip.slice(at + 30, at + 30 + nameLength));
    const body = zip.slice(at + 30 + nameLength, at + 30 + nameLength + size);
    out.set(name, view.getUint16(at + 8, true) === 8 ? new Uint8Array(inflateRawSync(body)) : body);
    at += 30 + nameLength + size;
  }
  return out;
}

beforeEach(() => {
  store.current = fakeSupabase();
  store.current.objects[ASSETS_BUCKET] = new Map([[ownPhoto.path, jpeg(1080, 1350)]]);
  tools.executeTool.mockReset();
  ai.chatJson.mockReset();
  delete process.env.FAL_KEY;
  delete process.env.GROUNDSWELL_AI_IMAGES;
});
afterEach(() => {
  delete process.env.FAL_KEY;
  delete process.env.GROUNDSWELL_AI_IMAGES;
});

describe('each post’s shape and the AI scene asked for', () => {
  it('prints reels, stories, videos and TikTok vertical, the rest at 4:5, and a text post without an image', () => {
    expect(postSize({ platform: 'instagram', format: 'post' })).toBe('feed');
    expect(postSize({ platform: 'instagram', format: 'carousel' })).toBe('feed');
    expect(postSize({ platform: 'instagram', format: 'reel' })).toBe('vertical');
    expect(postSize({ platform: 'facebook', format: 'story' })).toBe('vertical');
    expect(postSize({ platform: 'tiktok', format: 'post' })).toBe('vertical');
    expect(postSize({ platform: 'linkedin', format: 'text' })).toBeNull();
  });

  it('shows a photo whole over its own blur when its shape is far from the post’s, and tags an AI image', () => {
    expect(showWhole({ width: 1080, height: 1350 }, 'vertical')).toBe(true);
    expect(showWhole({ width: 1080, height: 1350 }, 'feed')).toBe(false);
    expect(showWhole({ width: 1080, height: 1080 }, 'feed')).toBe(false);
    expect(showWhole({ width: 1920, height: 1080 }, 'feed')).toBe(true);
    expect(postImageHtml({ photo: 'data:image/jpeg;base64,AA==', size: 'vertical', whole: true, ai: true })).toMatch(/class="back"[\s\S]*class="front"[\s\S]*AI-generated image/);
    expect(postImageHtml({ photo: 'data:image/jpeg;base64,AA==', size: 'feed', whole: false, ai: false })).not.toContain('AI-generated');
  });

  it('asks for the plan’s shot with the rules, never a handle, a link or a competitor’s name', () => {
    const prompt = scenePrompt('Bayside Garage-style “before and after” of the bay, tag @harborautocare https://x.example #brakes', { category: 'auto repair shop', city: 'Fort Lauderdale, FL', alcohol: false, avoid: ['Bayside Garage'] });
    expect(prompt).toMatch(/^A realistic photograph for a auto repair shop in Fort Lauderdale, FL: /);
    expect(prompt).not.toMatch(/Bayside|@|https|#|“/);
    expect(prompt).toContain('No text, words, letters, logos or signage');
    expect(prompt).not.toContain('over 25');
    expect(scenePrompt('The taproom at golden hour', { category: 'brewery', city: null, alcohol: true, avoid: [] })).toContain('Anyone shown is clearly an adult over 25, and no one is drinking.');
  });
});

describe('the image generator', () => {
  it('takes the first image the model did not flag', () => {
    expect(falImageUrl({ data: { images: [{ url: 'https://fal.media/a.jpg' }, { url: 'https://fal.media/b.jpg' }], has_nsfw_concepts: [true, false] } })).toBe('https://fal.media/b.jpg');
    expect(falImageUrl({ images: [{ url: 'http://insecure.example/a.jpg' }] })).toBeNull();
    expect(falImageUrl({})).toBeNull();
  });

  it('runs fal through Composio first, asking for the post’s shape', async () => {
    tools.executeTool.mockResolvedValue({ images: [{ url: 'https://fal.media/scene.jpg' }], has_nsfw_concepts: [false] });
    const got = await generateImage('a scene', 'vertical', { timeoutMs: 30_000, fetchImpl: imageFetch(864, 1536) });
    expect(got).toMatchObject({ provider: 'composio', model: 'fal-ai/flux/dev', width: 864, height: 1536, url: 'https://fal.media/scene.jpg' });
    expect(tools.executeTool).toHaveBeenCalledWith('FAL_AI_RUN_MODEL_SYNC', expect.objectContaining({ model_id: 'fal-ai/flux/dev', input: expect.objectContaining({ prompt: 'a scene', image_size: GENERATION_SIZES.vertical }) }), expect.any(Number));
  });

  it('falls back to fal with FAL_KEY when Composio has no fal connection', async () => {
    tools.executeTool.mockRejectedValue(new PermanentStepError('Composio has no active connection for fal_ai in this project (any user id).'));
    process.env.FAL_KEY = 'fal-test';
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.startsWith('https://fal.run/')) return new Response(JSON.stringify({ images: [{ url: 'https://fal.media/direct.jpg' }] }), { status: 200 });
      return new Response(jpeg(1024, 1280), { status: 200 });
    }) as unknown as typeof fetch;
    const got = await generateImage('a scene', 'feed', { timeoutMs: 30_000, fetchImpl });
    expect(got).toMatchObject({ provider: 'fal', width: 1024, height: 1280 });
    expect(calls[0].url).toBe('https://fal.run/fal-ai/flux/dev');
    expect((calls[0].init?.headers as Record<string, string>).Authorization).toBe('Key fal-test');
  });

  it('names what each path answered when neither gives an image', async () => {
    tools.executeTool.mockRejectedValue(new PermanentStepError('Composio has no active connection for fal_ai in this project (any user id).'));
    await expect(generateImage('a scene', 'feed', { timeoutMs: 30_000, fetchImpl: imageFetch(1024, 1280) })).rejects.toThrow(/No image generator answered \(Composio: Composio has no active connection for fal_ai.*; fal: FAL_KEY is not set\)/);
  });
});

describe('Reddit replies, held to the facts', () => {
  const questions = [
    { community: 'fortlauderdale', question: 'Any honest mechanic near downtown?', url: 'https://www.reddit.com/r/a' },
    { community: 'fortlauderdale', question: 'Where to get brakes done?', url: null },
  ];
  it('keeps a reply that says who is writing, and drops one that hides it, invents a number or makes a banned claim', () => {
    const { replies, dropped } = checkReplies(
      {
        replies: [
          { question: 1, reply: "I'm with Harbor Auto Care: we check brakes while you wait, and the quote comes before any work." },
          { question: 1, reply: 'Harbor Auto Care here again.' },
          { question: 2, reply: 'Great shop, my car was fixed in an hour.' },
          { question: 2, reply: 'Harbor Auto Care here: 30 years of experience.' },
          { question: 2, reply: 'Harbor Auto Care here: the best brakes in town.' },
          { question: 9, reply: 'Harbor Auto Care here.' },
        ],
      },
      questions,
      'Harbor Auto Care (sample)',
      new Set(['4.6'])
    );
    expect(replies).toEqual([{ ...questions[0], reply: "I'm with Harbor Auto Care: we check brakes while you wait, and the quote comes before any work." }]);
    expect(dropped.join('\n')).toMatch(/does not say the business is writing/);
    expect(dropped.join('\n')).toMatch(/number not in the data \(30\)/);
    expect(dropped.join('\n')).toMatch(/claim not allowed \(best\)/);
  });
});

describe('the posts step', () => {
  it('needs the social plan’s week', async () => {
    await expect(runPosts(ctxWith({}))).rejects.toThrow(PermanentStepError);
  });

  it('with no photo and AI images off, names the shot to take for each post and still ships the sheet', async () => {
    process.env.GROUNDSWELL_AI_IMAGES = 'off';
    const out = await runPosts(ctxWith({ plans: plans([post('Monday'), post('Wednesday', 'linkedin', 'text')]) }));
    expect(out.posts[0]).toMatchObject({ image: null, note: 'No photo of the business could be used: take the shot described (The service bay with a car on the lift).' });
    expect(out.posts[1]).toMatchObject({ image: null, note: null });
    expect(out.ai).toEqual({ enabled: false, asked: 0, made: 0, errors: [] });
    expect(tools.executeTool).not.toHaveBeenCalled();
    const csv = new TextDecoder().decode(unzip(store.current!.objects[ASSETS_BUCKET].get(out.export!.path)!).get('posts.csv'));
    expect(csv.split(/\r?\n/)[0]).toBe('Post,Day,Platform,Format,Topic,Hook,Caption,Call to action,Hashtags,Image file,Image source,AI-generated,Note');
    expect(out.note).toContain('AI images are switched off');
  });
});

const chromium = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';

describe('printing the posts', () => {
  it.skipIf(!existsSync(chromium))('uses the own photo first, AI scenes where the photos run out (tagged, at the post’s shape), and drafts the Reddit replies', async () => {
    process.env.CHROMIUM_PATH = chromium;
    tools.executeTool.mockResolvedValue({ images: [{ url: 'https://fal.media/scene.jpg' }] });
    ai.chatJson.mockResolvedValue({ replies: [{ question: 1, reply: "I'm with Harbor Auto Care: we check brakes while you wait, and the quote comes before any work." }] });
    const out: PostsOutput = await runPosts(ctxWith({ plans: plans(), creative: { source: 's', fetched_at: '', handle: 'harborautocare', tried: [], images: [ownPhoto] }, community }), imageFetch(864, 1536));
    const bucket = store.current!.objects[ASSETS_BUCKET];
    // Monday: the business's own photo at 4:5.
    expect(out.posts[0].image).toMatchObject({ origin: 'own', from: ownPhoto.path, size: 'feed' });
    expect(imageSize(bucket.get(out.posts[0].image!.path)!)).toMatchObject({ width: 1080, height: 1350 });
    // Tuesday's reel and Thursday's TikTok: AI scenes, vertical, named and stored as such.
    for (const i of [1, 3]) {
      expect(out.posts[i].image).toMatchObject({ origin: 'ai_generated', size: 'vertical', provider: 'composio', model: 'fal-ai/flux/dev' });
      expect(out.posts[i].image!.name).toMatch(/_ai\.jpg$/);
      expect(imageSize(bucket.get(out.posts[i].image!.path)!)).toMatchObject({ width: 1080, height: 1920 });
    }
    const rows = store.current!.tables.groundswell_assets as { name: string; kind: string; meta: Record<string, unknown> }[];
    expect(rows.find((r) => r.name === out.posts[1].image!.name)!.meta).toMatchObject({ post: 2, ai_generated: true, origin: 'ai_generated' });
    // Wednesday's LinkedIn text post has no image.
    expect(out.posts[2].image).toBeNull();
    expect(out.ai).toEqual({ enabled: true, asked: 2, made: 2, errors: [] });
    expect(out.ai.asked).toBeLessThanOrEqual(AI_LIMIT);
    expect(out.reddit).toHaveLength(1);
    const files = unzip(bucket.get(out.export!.path)!);
    expect([...files.keys()]).toEqual([...out.posts.filter((p) => p.image).map((p) => p.image!.name), 'posts.csv', 'reddit-replies.txt']);
    const csv = new TextDecoder().decode(files.get('posts.csv'));
    expect(csv.split(/\r?\n/).filter((l) => /,yes,/.test(l))).toHaveLength(2);
    expect(new TextDecoder().decode(files.get('reddit-replies.txt'))).toContain('r/fortlauderdale: Any honest mechanic near downtown?');
    expect(out.note).toBe('1 of 4 posts use the business’s own photos. 2 images are AI-generated, tagged as such on the picture and in posts.csv.');
  }, 120_000);

  it.skipIf(!existsSync(chromium))('stops asking after the generator fails once, and repeats the own photo with a note', async () => {
    process.env.CHROMIUM_PATH = chromium;
    tools.executeTool.mockRejectedValue(new PermanentStepError('Composio has no active connection for fal_ai in this project (any user id).'));
    const out = await runPosts(ctxWith({ plans: plans(), creative: { source: 's', fetched_at: '', handle: 'harborautocare', tried: [], images: [ownPhoto] } }), imageFetch(864, 1536));
    expect(out.ai.asked).toBe(1);
    expect(out.ai.errors[0]).toMatch(/No image generator answered/);
    for (const i of [1, 3]) {
      expect(out.posts[i].image).toMatchObject({ origin: 'own', size: 'vertical' });
      expect(out.posts[i].note).toMatch(/Repeats a photo used earlier in the week/);
    }
    expect(out.reddit).toEqual([]);
  }, 120_000);
});
