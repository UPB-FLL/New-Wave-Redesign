import { GROUNDSWELL_CONFIG } from '../../../packages/groundswell/groundswell.config.js';
import { businessCode } from '../../../packages/groundswell/src/adsets.js';
import { PLATFORM_LABELS, type SocialPost } from '../../../packages/groundswell/src/plans.js';
import { claimsIn } from '../../../packages/groundswell/src/templates.js';
import { getSupabaseAdmin } from '../supabaseAdmin.js';
import { copyFacts } from './adcopy.js';
import { isAdplanOutput } from './adplan.js';
import { readAsset, storeAsset } from './assetStore.js';
import { withBrowser } from './browser.js';
import { imageSize, isCreativeOutput, type CreativeImage } from './creative.js';
import { dataUri, postImageHtml, renderImage, showWhole, type ImageSize } from './creativeRender.js';
import { isCommunityOutput } from './currents/community.js';
import { fileName } from './delivery.js';
import { toCsv, ZIP_TYPE, zipFiles } from './files.js';
import { aiImagesEnabled, generateImage, type GeneratedImage } from './imageGen.js';
import { buildFacts, numbersIn, unsupportedNumbers } from './model.js';
import { chatJson } from './openai.js';
import { isPlansOutput } from './plans.js';
import { PermanentStepError, type StepContext } from './types.js';

/**
 * Posts step (phase 2): the social plan's first week (phase 1's plans step)
 * made ready to post. Each post gets an image at its platform's shape (4:5
 * for feeds, 9:16 for reels, stories and TikTok), from the business's own
 * photos first (the creative step's; never a competitor's, never Yelp's or
 * Google's); where the photos run out, a new AI scene of the shot the plan
 * describes (imageGen.ts, at most AI_LIMIT a run), tagged "AI-generated
 * image" on the picture and in the sheet. Then up to three replies the
 * business can post, as itself, to the Reddit questions the community step
 * found, held to its own facts. Everything goes in one zip (the images,
 * posts.csv, reddit-replies.txt) and each image is stored with the run, so
 * Headway can publish the Instagram posts with them.
 */

export const AI_LIMIT = 3;
export const POSTS_NEEDS_MS = 150_000;
const REDDIT_LIMIT = 3;

export interface PostImageRef {
  path: string;
  name: string;
  size: ImageSize;
  origin: 'own' | 'ai_generated';
  /** The own photo it was made from, or null for an AI scene. */
  from: string | null;
  /** For an AI scene: what the model was asked, and who answered. */
  prompt: string | null;
  provider: string | null;
  model: string | null;
}

export interface PostDraft extends SocialPost {
  n: number;
  image: PostImageRef | null;
  note: string | null;
}

export interface RedditReply {
  community: string | null;
  question: string;
  url: string | null;
  reply: string;
}

export interface PostsOutput {
  generated_at: string;
  posts: PostDraft[];
  reddit: RedditReply[];
  ai: { enabled: boolean; asked: number; made: number; errors: string[] };
  export: { path: string; name: string } | null;
  dropped: string[];
  note: string;
}

export const isPostsOutput = (x: unknown): x is PostsOutput => Boolean(x && typeof x === 'object' && Array.isArray((x as PostsOutput).posts) && Array.isArray((x as PostsOutput).reddit));

/** Reels, stories, videos and anything on TikTok are vertical; the rest are 4:5 feed posts. A text post has no image. */
export function postSize(post: Pick<SocialPost, 'platform' | 'format'>): ImageSize | null {
  if (post.format === 'text') return null;
  return post.platform === 'tiktok' || post.format === 'reel' || post.format === 'story' || post.format === 'video' ? 'vertical' : 'feed';
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * What the model is asked for an AI scene: the plan's shot, the business's
 * kind and place, and the rules (no words or logos, no close-up faces; for
 * alcohol, adults over 25 and no one drinking). Handles, links, hashtags and
 * any competitor's name are taken out of the shot first.
 */
export function scenePrompt(visual: string, opts: { category: string | null; city: string | null; alcohol: boolean; avoid: string[] }): string {
  let shot = visual
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[@#][\w.]+/g, ' ')
    .replace(/["“”]/g, '');
  for (const name of opts.avoid.filter((n) => n.trim().length > 2)) shot = shot.replace(new RegExp(escapeRe(name.trim()), 'gi'), ' ');
  shot = shot.replace(/\s+/g, ' ').trim().replace(/[.;,\s]+$/, '');
  const place = [opts.category, opts.city ? `in ${opts.city}` : null].filter(Boolean).join(' ');
  return [
    `A realistic photograph${place ? ` for a ${place}` : ''}: ${shot.slice(0, 400)}.`,
    'Natural light, candid, true to life. No text, words, letters, logos or signage anywhere in the image. No close-up faces.',
    opts.alcohol ? 'Anyone shown is clearly an adult over 25, and no one is drinking.' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export const REDDIT_SYSTEM = `You draft replies a small business can post on Reddit as itself, answering questions people asked in local communities.
You get the business's own public facts and a numbered list of questions.
Return JSON only: {"replies": [{"question": the question's number, "reply": at most 600 characters}]}, at most ${REDDIT_LIMIT}, only for questions the business can honestly help with.
Rules:
- Open by saying who is writing, with the business's name ("I'm with <name>" or "<name> here"). Never pretend to be a customer.
- Answer the question helpfully first; mention what the business offers once, plainly. No links, no hashtags, no hype, no emoji.
- Use only the facts given. A number may appear only if it is in the facts.
- Never use these words or claims: ${GROUNDSWELL_CONFIG.unsupported_claims.join(', ')}. Never name or compare with another business.
- Alcohol: never suggest drinking to excess, drinking games, or anything that appeals to people under 21.`;

/** The writer's replies held to the facts: each must name the business (it speaks as itself), quote no number outside the facts, and make no banned claim. */
export function checkReplies(raw: unknown, questions: { community: string | null; question: string; url: string | null }[], business: string, allowed: Set<string>): { replies: RedditReply[]; dropped: string[] } {
  const dropped: string[] = [];
  const replies: RedditReply[] = [];
  const list = Array.isArray((raw as { replies?: unknown })?.replies) ? ((raw as { replies: unknown[] }).replies as Record<string, unknown>[]) : [];
  const seen = new Set<number>();
  const own = business.toLowerCase().replace(/\s*\(.*?\)\s*/g, ' ').trim();
  for (const r of list.slice(0, 10)) {
    if (replies.length >= REDDIT_LIMIT) break;
    const i = Number(r?.question) - 1;
    const text = typeof r?.reply === 'string' ? r.reply.replace(/\s+/g, ' ').trim().slice(0, 600) : '';
    const q = questions[i];
    if (!q || !text || seen.has(i)) continue;
    const numbers = unsupportedNumbers(text, allowed);
    const claims = claimsIn(text, GROUNDSWELL_CONFIG.unsupported_claims);
    if (!text.toLowerCase().includes(own)) dropped.push(`Reddit reply to "${q.question}": it does not say the business is writing.`);
    else if (numbers.length) dropped.push(`Reddit reply to "${q.question}": number not in the data (${numbers.join(', ')}).`);
    else if (claims.length) dropped.push(`Reddit reply to "${q.question}": claim not allowed (${claims.join(', ')}).`);
    else {
      seen.add(i);
      replies.push({ ...q, reply: text });
    }
  }
  return { replies, dropped };
}

const slugOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
const message = (err: unknown) => (err instanceof Error ? err.message : String(err)).slice(0, 240);

export async function runPosts(ctx: StepContext, fetchImpl: typeof fetch = fetch): Promise<PostsOutput> {
  const plans = isPlansOutput(ctx.outputs.plans) ? ctx.outputs.plans : null;
  if (!plans || !plans.social_plan.week.length) throw new PermanentStepError('There is no social plan with a first week to make posts from (the plans step did not run or wrote no posts).');
  const db = getSupabaseAdmin();
  const own: CreativeImage[] = isCreativeOutput(ctx.outputs.creative) ? ctx.outputs.creative.images.filter((i) => i.path) : [];
  const profile = (ctx.outputs.competitors as { profile?: { category?: string | null } } | undefined)?.profile;
  const listing = (ctx.outputs.maps as { business?: { category?: string | null } | null } | undefined)?.business;
  const category = (profile?.category ?? listing?.category ?? null)?.split(/[,/(]/)[0].trim().toLowerCase() ?? null;
  const industryId = isAdplanOutput(ctx.outputs.adplan) ? ctx.outputs.adplan.industry.id : null;
  const alcohol = (GROUNDSWELL_CONFIG.industries.find((i) => i.id === industryId)?.restricted ?? []).includes('alcohol');
  const code = businessCode(ctx.audit.business_name);
  const enabled = aiImagesEnabled();
  const ai: PostsOutput['ai'] = { enabled, asked: 0, made: 0, errors: [] };
  const dropped: string[] = [];

  // 1. Which picture each post gets: own photos first, each once; then AI scenes; then an own photo again.
  type Pick = { kind: 'own'; image: CreativeImage } | { kind: 'ai'; image: GeneratedImage; prompt: string };
  const picks = new Map<number, Pick>();
  const notes = new Map<number, string>();
  let nextOwn = 0;
  let aiOpen = enabled;
  for (const [i, post] of plans.social_plan.week.entries()) {
    const size = postSize(post);
    if (!size) continue;
    if (nextOwn < own.length) {
      picks.set(i, { kind: 'own', image: own[nextOwn++] });
      continue;
    }
    const left = ctx.deadline - Date.now() - 60_000;
    if (aiOpen && ai.asked < AI_LIMIT && left > 20_000) {
      const prompt = scenePrompt(post.visual, { category, city: ctx.audit.city, alcohol, avoid: ctx.audit.competitors.map((c) => c.name) });
      ai.asked++;
      try {
        const image = await generateImage(prompt, size, { timeoutMs: Math.min(60_000, left), fetchImpl });
        ai.made++;
        picks.set(i, { kind: 'ai', image, prompt });
        continue;
      } catch (err) {
        // The first failure closes generation for this run: the cause (no key, no credit) holds for the rest.
        ai.errors.push(message(err));
        aiOpen = false;
      }
    }
    if (own.length) {
      picks.set(i, { kind: 'own', image: own[i % own.length] });
      notes.set(i, 'Repeats a photo used earlier in the week; a new shot of the visual described would do better.');
    } else {
      notes.set(i, `No photo of the business could be used: take the shot described (${post.visual}).`);
    }
  }

  // 2. The images, printed at each post's shape.
  const posts: PostDraft[] = plans.social_plan.week.map((post, i) => ({ ...post, n: i + 1, image: null, note: notes.get(i) ?? null }));
  const zip: { name: string; data: Uint8Array | string }[] = [];
  const bytesOf = new Map<string, { data: string; width: number; height: number } | null>();
  const ownData = async (path: string) => {
    if (!bytesOf.has(path)) {
      const bytes = await readAsset(db, path).catch(() => null);
      const size = bytes ? imageSize(bytes) : null;
      bytesOf.set(path, bytes && size ? { data: dataUri(bytes, size.type), width: size.width, height: size.height } : null);
    }
    return bytesOf.get(path) ?? null;
  };
  if (picks.size) {
    await withBrowser(async (browser) => {
      for (const [i, pick] of picks) {
        const post = posts[i];
        const size = postSize(post)!;
        const photo = pick.kind === 'own' ? await ownData(pick.image.path) : { data: dataUri(pick.image.bytes, pick.image.type), width: pick.image.width, height: pick.image.height };
        if (!photo) {
          post.note = `The photo could not be read back; take the shot described (${post.visual}).`;
          continue;
        }
        const html = postImageHtml({ photo: photo.data, size, whole: showWhole(photo, size), ai: pick.kind === 'ai' });
        const name = `${code}_post_${String(post.n).padStart(2, '0')}_${slugOf(post.day)}_${slugOf(post.platform)}${pick.kind === 'ai' ? '_ai' : ''}.jpg`;
        const bytes = await renderImage(browser, html, 'jpeg', size);
        const meta = {
          post: post.n,
          day: post.day,
          platform: post.platform,
          format: post.format,
          size,
          origin: pick.kind === 'own' ? 'own' : 'ai_generated',
          ai_generated: pick.kind === 'ai',
          from: pick.kind === 'own' ? pick.image.path : null,
          ...(pick.kind === 'ai' ? { prompt: pick.prompt, provider: pick.image.provider, model: pick.image.model } : {}),
        };
        const row = await storeAsset(db, { audit_id: ctx.audit.id, kind: 'creative', name, content_type: 'image/jpeg', meta }, bytes);
        post.image = {
          path: row.path,
          name,
          size,
          origin: pick.kind === 'own' ? 'own' : 'ai_generated',
          from: pick.kind === 'own' ? pick.image.path : null,
          prompt: pick.kind === 'ai' ? pick.prompt : null,
          provider: pick.kind === 'ai' ? pick.image.provider : null,
          model: pick.kind === 'ai' ? pick.image.model : null,
        };
        zip.push({ name, data: bytes });
      }
    });
  }

  // 3. Replies to the Reddit questions, as the business.
  const community = isCommunityOutput(ctx.outputs.community) ? ctx.outputs.community : null;
  const questions = (community?.category.questions ?? []).filter((q) => q.title).slice(0, 6).map((q) => ({ community: q.subreddit, question: q.title!, url: q.url }));
  let reddit: RedditReply[] = [];
  if (questions.length && ctx.deadline - Date.now() > 40_000) {
    const facts = copyFacts(buildFacts(ctx.audit, ctx.outputs));
    try {
      const raw = await chatJson<unknown>(REDDIT_SYSTEM, `Facts (JSON):\n${JSON.stringify(facts)}\n\nQuestions:\n${questions.map((q, i) => `${i + 1}. ${q.question}${q.community ? ` (r/${q.community})` : ''}`).join('\n')}`, Math.min(60_000, ctx.deadline - Date.now() - 20_000));
      const checked = checkReplies(raw, questions, ctx.audit.business_name, numbersIn(facts));
      reddit = checked.replies;
      dropped.push(...checked.dropped);
    } catch (err) {
      if (err instanceof PermanentStepError) dropped.push(`Reddit replies were not drafted: ${err.message}`);
      else dropped.push(`Reddit replies were not drafted: the writer did not answer (${message(err)}).`);
    }
  }

  // 4. One zip: the images, the sheet and the replies.
  zip.push({
    name: 'posts.csv',
    data: toCsv([
      ['Post', 'Day', 'Platform', 'Format', 'Topic', 'Hook', 'Caption', 'Call to action', 'Hashtags', 'Image file', 'Image source', 'AI-generated', 'Note'],
      ...posts.map((p) => [
        p.n,
        p.day,
        PLATFORM_LABELS[p.platform],
        p.format,
        p.topic,
        p.hook,
        p.caption,
        p.cta,
        p.hashtags.join(' '),
        p.image?.name ?? '',
        p.image ? (p.image.origin === 'own' ? `The business’s own photo (${p.image.from?.split('/').pop() ?? ''})` : `AI-generated (${p.image.model ?? 'model'}), from the shot the plan describes`) : '',
        p.image?.origin === 'ai_generated' ? 'yes' : 'no',
        p.note ?? '',
      ]),
    ]),
  });
  if (reddit.length) {
    zip.push({
      name: 'reddit-replies.txt',
      data: [
        'Replies to post on Reddit as the business’s own account. Read each community’s rules first: some do not allow businesses to post.',
        '',
        ...reddit.flatMap((r) => [`${r.community ? `r/${r.community}` : 'Reddit'}: ${r.question}`, r.url ?? '', '', r.reply, '', '---', '']),
      ].join('\n'),
    });
  }
  const name = fileName(ctx, 'Posts', 'zip');
  const row = await storeAsset(db, { audit_id: ctx.audit.id, kind: 'export', name, content_type: ZIP_TYPE, meta: { format: 'posts', posts: posts.length, images: posts.filter((p) => p.image).length, ai_generated: ai.made, reddit: reddit.length } }, zipFiles(zip));

  const madeBy = ai.made ? ` ${ai.made} image${ai.made === 1 ? ' is' : 's are'} AI-generated, tagged as such on the picture and in posts.csv.` : '';
  return {
    generated_at: new Date().toISOString(),
    posts,
    reddit,
    ai,
    export: { path: row.path, name },
    dropped,
    note: `${posts.filter((p) => p.image?.origin === 'own').length} of ${posts.length} posts use the business’s own photos.${madeBy}${!enabled ? ' AI images are switched off (GROUNDSWELL_AI_IMAGES=off).' : ''}`,
  };
}
