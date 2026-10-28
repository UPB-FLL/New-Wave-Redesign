import { GROUNDSWELL_CONFIG } from '../../../packages/groundswell/groundswell.config.js';
import { PHASE_INFO } from '../../../src/lib/groundswellValidation.js';
import { buildAdSets, businessCode, type AdSetsPlan, type AdSetsWriting } from '../../../packages/groundswell/src/adsets.js';
import { buildChannelSets, type ChannelWriting, type DataSet } from '../../../packages/groundswell/src/channels.js';
import type { GroundswellConfig } from '../../../packages/groundswell/src/config.js';
import { claimsIn } from '../../../packages/groundswell/src/templates.js';
import { isAdcopyOutput, copyFacts } from './adcopy.js';
import { isAdplanOutput, type AdplanOutput } from './adplan.js';
import { isCreativeOutput } from './creative.js';
import { buildFacts, numbersIn, unsupportedNumbers, type Facts } from './model.js';
import { chatJson, GROUNDSWELL_MODEL } from './openai.js';
import { PermanentStepError, type StepContext } from './types.js';
import { isCommunityOutput } from './currents/community.js';
import { isAiAnswersOutput } from './currents/aiAnswers.js';
import { isReviewsOutput } from './currents/reviews.js';

/**
 * Ad-sets step (phase 2, and again in phase 3 on the client's own figures):
 * the plan's rows arranged as Meta ad sets and Google ad groups
 * (packages/groundswell/src/adsets.ts), each with its goal (leads,
 * engagement, rankings), how it works, what to watch, and its spend and
 * return at the plan's low, medium and high budgets, with the business's own
 * Instagram images (creative.ts).
 *
 * One OpenAI call writes only words: the engagement ads, the words set on
 * each image, a carousel for the engagement set, the business's negative
 * keywords and Meta interests. Code holds them to the business's own facts:
 * a line quoting a number not in those facts, or making a claim from the
 * setup file's `unsupported_claims`, is dropped; lengths are cut to the
 * formats; a negative may never block a keyword the plan buys.
 */

export interface AdsetsOutput {
  model: string | null;
  generated_at: string;
  /** public: phase 2, from public data; linked: phase 3, re-priced on the client's own figures. */
  basis: 'public' | 'linked';
  code: string;
  month: string;
  sets: AdSetsPlan;
  dropped: string[];
}

export const isAdsetsOutput = (x: unknown): x is AdsetsOutput => Boolean(x && (x as AdsetsOutput).sets && Array.isArray((x as AdsetsOutput).sets.meta));

/** The plan the sets are built from: phase 3's re-priced plan when there is one, else phase 1's. */
export function planFor(outputs: Record<string, unknown>): { plan: AdplanOutput; basis: 'public' | 'linked' } | null {
  const integrated = (outputs.integrated as { adplan?: unknown } | undefined)?.adplan;
  if (isAdplanOutput(integrated)) return { plan: integrated, basis: 'linked' };
  return isAdplanOutput(outputs.adplan) ? { plan: outputs.adplan, basis: 'public' } : null;
}

/** The rating an ad may state: the platform with more reviews of those that clear the setup file's proof rule. */
export function proofFor(f: Facts, config: GroundswellConfig): { platform: 'Yelp' | 'Google'; rating: number; reviews: number } | null {
  const rule = config.adsets.proof;
  if (!rule) return null;
  const options = [
    f.reviews?.business && f.reviews.business.rating !== null && f.reviews.business.reviews !== null ? { platform: 'Yelp' as const, rating: f.reviews.business.rating, reviews: f.reviews.business.reviews } : null,
    f.maps?.business && f.maps.business.rating !== null && f.maps.business.reviews !== null ? { platform: 'Google' as const, rating: f.maps.business.rating, reviews: f.maps.business.reviews } : null,
  ].filter((x): x is { platform: 'Yelp' | 'Google'; rating: number; reviews: number } => Boolean(x) && x!.rating >= rule.min_rating && x!.reviews >= rule.min_reviews);
  return options.sort((a, b) => b.reviews - a.reviews)[0] ?? null;
}

/** The business's own offers and prices from its pages (the pricing step), for ads that name them. */
export function offersFor(outputs: Record<string, unknown>): { name: string; price: string }[] {
  const offers = ((outputs.pricing as { business?: { offers?: { name?: string; context?: string; price_low?: number | null }[] } } | undefined)?.business?.offers ?? []);
  return offers.filter((o) => o.name && o.price_low !== null && o.price_low !== undefined).slice(0, 6).map((o) => ({ name: String(o.name), price: String(o.context ?? '') }));
}

export interface ChannelContext {
  proof: ReturnType<typeof proofFor>;
  reddit: { communities: string[]; questions: string[] } | null;
  tiktok: boolean;
  ai_questions: string[];
  offers: { name: string; price: string }[];
}

export function writerInput(f: Facts, plan: AdplanOutput, captions: string[], config: GroundswellConfig, channels: ChannelContext | null = null) {
  const live = plan.plan.rows.filter((r) => r.recommendation !== 'skip');
  return {
    ...(channels ? { proof: channels.proof, reddit: channels.reddit, tiktok: channels.tiktok, ai_questions: channels.ai_questions, offers: channels.offers } : {}),
    facts: copyFacts(f),
    angles: plan.angles
      .filter((a) => live.some((r) => r.angle_id === a.id))
      .map((a) => ({ angle_id: a.id, name: a.name, why: a.why, meta: live.some((r) => r.angle_id === a.id && r.platform === 'meta') })),
    plan_keywords: [...new Set(plan.angles.flatMap((a) => a.keywords.map((k) => k.keyword)))],
    keyword_ideas: (f.keywords?.ideas ?? []).slice(0, 50).map((k) => k.keyword),
    best_post_captions: captions.slice(0, 6),
    carousel_slides: config.adsets.carousel.max_slides,
  };
}

export const ADSETS_SYSTEM = `You write ad-set creative for a small business for New Wave: Social Engineering's Groundswell engine.
You get the business's own public facts, the angles its ad plan runs, the keywords the plan buys, Keyword Planner's other ideas, and captions from its best Instagram posts.
Return JSON only:
{"engagement_ads": up to 3 of {"primary_text": at most 125 characters, "headline": at most 27 characters, "image_headline": at most 60 characters, the words set on the business's own photo},
 "image_headlines": {"<angle_id>": at most 60 characters, the words on the photo for that angle's Meta ad; only for angles with "meta": true},
 "meta_ads": {"<angle_id>": {"primary_text": at most 125 characters, "headline": at most 27, "description": at most 25, "call_to_action": a few words}; only for angles with "meta": true},
 "carousel": {"title": at most 60 characters, "slides": 4 to carousel_slides of {"headline": at most 90 characters, "body": at most 220 characters}, "caption": at most 1500 characters, ending with one question that invites a comment},
 "negatives": up to 15 of {"text": 1 to 3 words, a search the business does not serve, "reason": one short sentence},
 "interests": up to 6 Meta interest names that fit the business's customers,
 "proof_ads": only when proof is given, up to 2 of {"primary_text": at most 125 characters stating proof.rating and proof.reviews with proof.platform named, "headline": at most 27, "image_headline": at most 60},
 "reddit_ads": only when reddit is given, up to 3 of {"headline": at most 150 characters, a plain answer to one of reddit.questions or a plain line for those communities, "text": at most 500 characters, "call_to_action": a few words, "image_headline": at most 60 characters, the words on the photo, "basis": one of "reddit","offers","website","ai_answers","yelp"},
 "tiktok_ads": only when tiktok is true, up to 3 of {"text": at most 100 characters, "call_to_action": a few words, "image_headline": at most 60 characters, the words on the vertical photo, "basis": one of "own_posts","offers","website","reddit","ai_answers"}}
Rules:
- Use only the facts given. Name what the business shows: its services, place, booking, its own posts' subjects. Never mention a competitor.
- Use a number only if it appears in the facts (a published price, the Google rating and review count). No discounts, prices, years or counts that are not given.
- Never use these words or claims: ${GROUNDSWELL_CONFIG.unsupported_claims.join(', ')}.
- Engagement ads and the carousel aim at saves, shares and comments: useful and specific to this business, no hard sell. Each carousel slide teaches one thing the business knows; the last slide says how to book or reach it.
- Proof ads state the rating and count exactly as given, with the platform named ("4.7 stars from 89 reviews on Yelp"); never quote a review's words, never add "best" or a ranking.
- Reddit readers dislike hype: say plainly what the business is and does, as if answering the question in the thread; never pretend to be a customer.
- basis names the data the ad is written from: reddit (a question in reddit.questions), offers (offers), ai_answers (ai_questions, the questions Google's AI did not name the business for), yelp (proof), website or own_posts (the facts and captions).
- Alcohol: never show or suggest drinking to excess, drinking games, or anything that appeals to people under 21.
- Negatives: searches from keyword_ideas the business does not serve (jobs, do-it-yourself, other services, other cities), or common searches of that kind. Never a word or phrase inside a keyword in plan_keywords.`;

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/[ \t]+/g, ' ').slice(0, max).trim() : '');

/** The writer's answer held to the facts: anything with an invented number or a banned claim is dropped, with the reason. */
export function checkWriting(raw: Record<string, unknown>, allowed: Set<string>, planKeywords: string[], config: GroundswellConfig): { writing: AdSetsWriting; channels: ChannelWriting; dropped: string[] } {
  const dropped: string[] = [];
  const ok = (text: string, where: string) => {
    if (!text) return false;
    const numbers = unsupportedNumbers(text, allowed);
    if (numbers.length) {
      dropped.push(`${where}: "${text}" (number not in the data: ${numbers.join(', ')})`);
      return false;
    }
    const claims = claimsIn(text, config.unsupported_claims);
    if (claims.length) {
      dropped.push(`${where}: "${text}" (claim not allowed: ${claims.join(', ')})`);
      return false;
    }
    return true;
  };

  const engagement_ads = (Array.isArray(raw.engagement_ads) ? raw.engagement_ads : [])
    .slice(0, 3)
    .map((a) => a as Record<string, unknown>)
    .map((a) => ({ primary_text: str(a.primary_text, 125), headline: str(a.headline, 40), image_headline: str(a.image_headline, 60) }))
    .filter((a, i) => ok(a.primary_text, `Engagement ad ${i + 1}`) && ok(a.headline, `Engagement ad ${i + 1} headline`) && ok(a.image_headline, `Engagement ad ${i + 1} image`));

  const image_headlines: Record<string, string> = {};
  for (const [id, v] of Object.entries((raw.image_headlines ?? {}) as Record<string, unknown>)) {
    const text = str(v, 60);
    if (ok(text, `Image words for ${id}`)) image_headlines[id] = text;
  }

  const meta_ads: NonNullable<AdSetsWriting['meta_ads']> = {};
  for (const [id, v] of Object.entries((raw.meta_ads ?? {}) as Record<string, Record<string, unknown>>)) {
    const ad = { primary_text: str(v?.primary_text, 125), headline: str(v?.headline, 40), description: str(v?.description, 25), call_to_action: str(v?.call_to_action, 30) };
    if (ok(ad.primary_text, `Meta ad for ${id}`) && ok(ad.headline, `Meta ad for ${id} headline`) && (!ad.description || ok(ad.description, `Meta ad for ${id} description`))) meta_ads[id] = ad;
  }

  let carousel: AdSetsWriting['carousel'] = null;
  const c = (raw.carousel ?? null) as Record<string, unknown> | null;
  if (c && Array.isArray(c.slides)) {
    const slides = (c.slides as Record<string, unknown>[])
      .slice(0, config.adsets.carousel.max_slides)
      .map((s) => ({ headline: str(s?.headline, 90), body: str(s?.body, 220) }))
      .filter((s, i) => ok(s.headline, `Carousel slide ${i + 1}`) && (!s.body || ok(s.body, `Carousel slide ${i + 1} text`)));
    const caption = (str(c.caption, config.adsets.carousel.caption_max_chars).match(/[^.!?\n]+[.!?]*\n*/g) ?? [])
      .filter((sentence) => ok(sentence.trim(), 'Carousel caption'))
      .join('')
      .trim();
    const title = str(c.title, 60);
    if (slides.length >= 2) carousel = { title: ok(title, 'Carousel title') ? title : slides[0].headline, slides, caption };
    else dropped.push('Carousel: fewer than two slides survived the checks.');
  }

  const bought = planKeywords.map((k) => k.toLowerCase());
  const negatives = (Array.isArray(raw.negatives) ? raw.negatives : [])
    .map((n) => n as Record<string, unknown>)
    .map((n) => ({ text: str(n.text, 40).toLowerCase(), reason: str(n.reason, 160) }))
    .filter((n) => {
      if (!/^[\p{L}\p{N}][\p{L}\p{N}'&-]*(\s[\p{L}\p{N}'&-]+){0,2}$/u.test(n.text)) return false;
      if (bought.some((k) => k.includes(n.text))) {
        dropped.push(`Negative "${n.text}": it would block a keyword the plan buys.`);
        return false;
      }
      return true;
    })
    .slice(0, 15);

  const interests = (Array.isArray(raw.interests) ? raw.interests : [])
    .map((i) => str(i, 40))
    .filter((i) => i && ok(i, 'Interest'))
    .slice(0, 6);

  const proof_ads = (Array.isArray(raw.proof_ads) ? raw.proof_ads : [])
    .slice(0, 2)
    .map((a) => a as Record<string, unknown>)
    .map((a) => ({ primary_text: str(a.primary_text, 125), headline: str(a.headline, 40), image_headline: str(a.image_headline, 60) }))
    .filter((a, i) => ok(a.primary_text, `Proof ad ${i + 1}`) && ok(a.headline, `Proof ad ${i + 1} headline`) && ok(a.image_headline, `Proof ad ${i + 1} image`));

  const basisOf = (v: unknown, allowedSets: DataSet[], fallback: DataSet): DataSet => (allowedSets.includes(v as DataSet) ? (v as DataSet) : fallback);
  const reddit_ads = (Array.isArray(raw.reddit_ads) ? raw.reddit_ads : [])
    .slice(0, 3)
    .map((a) => a as Record<string, unknown>)
    .map((a) => ({ headline: str(a.headline, 150), text: str(a.text, 500), call_to_action: str(a.call_to_action, 30), image_headline: str(a.image_headline, 60), basis: basisOf(a.basis, ['reddit', 'offers', 'website', 'ai_answers', 'yelp'], 'website') }))
    .filter((a, i) => ok(a.headline, `Reddit ad ${i + 1}`) && (!a.text || ok(a.text, `Reddit ad ${i + 1} text`)))
    .map((a, i) => (a.image_headline && !ok(a.image_headline, `Reddit ad ${i + 1} image`) ? { ...a, image_headline: '' } : a));
  const tiktok_ads = (Array.isArray(raw.tiktok_ads) ? raw.tiktok_ads : [])
    .slice(0, 3)
    .map((a) => a as Record<string, unknown>)
    .map((a) => ({ text: str(a.text, 100), call_to_action: str(a.call_to_action, 30), image_headline: str(a.image_headline, 60), basis: basisOf(a.basis, ['own_posts', 'offers', 'website', 'reddit', 'ai_answers'], 'own_posts') }))
    .filter((a, i) => ok(a.text, `TikTok ad ${i + 1}`))
    .map((a, i) => (a.image_headline && !ok(a.image_headline, `TikTok ad ${i + 1} image`) ? { ...a, image_headline: '' } : a));

  return { writing: { engagement_ads, image_headlines, meta_ads, carousel, negatives, interests, proof_ads }, channels: { reddit_ads, tiktok_ads } satisfies ChannelWriting, dropped };
}

const MONTH = () => new Date().toISOString().slice(0, 7);

export async function runAdsets(ctx: StepContext): Promise<AdsetsOutput> {
  const config = GROUNDSWELL_CONFIG;
  const found = planFor(ctx.outputs);
  if (!found) throw new PermanentStepError(`No verified ad plan is available from the ${PHASE_INFO.audit.title.toLowerCase()}, so budgeted ad sets cannot be built. Recover the audit and measured keyword demand first; missing data does not establish zero demand.`);
  const { plan, basis } = found;
  const f = buildFacts(ctx.audit, ctx.outputs);
  const creative = isCreativeOutput(ctx.outputs.creative) ? ctx.outputs.creative.images : [];
  const copy = isAdcopyOutput(ctx.outputs.adcopy) ? ctx.outputs.adcopy.ads : [];

  const industry = config.industries.find((i) => i.id === plan.industry.id) ?? config.industries.find((i) => i.id === 'general')!;
  const community = isCommunityOutput(ctx.outputs.community) ? ctx.outputs.community : null;
  const ai = isAiAnswersOutput(ctx.outputs.ai_answers) ? ctx.outputs.ai_answers : null;
  const communities = community ? [...new Set([...community.business.communities, ...community.category.communities].map((c) => c.name))] : [];
  const channelContext: ChannelContext = {
    proof: proofFor(f, config),
    reddit: industry.ad_platforms.includes('reddit') && communities.length ? { communities, questions: (community?.category.questions ?? []).map((q) => q.title ?? '').filter(Boolean).slice(0, 6) } : null,
    tiktok: industry.ad_platforms.includes('tiktok') && plan.plan.rows.some((r) => r.platform === 'tiktok'),
    ai_questions: (ai?.answers ?? []).filter((a) => !a.error && !a.named && a.purpose !== 'brand').map((a) => a.prompt),
    offers: offersFor(ctx.outputs),
  };
  const input = writerInput(
    f,
    plan,
    creative.map((i) => i.caption ?? '').filter(Boolean),
    config,
    channelContext
  );
  // The numbers the words may use: the business's own facts, its post captions, its rating and its own published prices.
  const allowed = numbersIn(input.facts, input.best_post_captions, input.angles, channelContext.proof, channelContext.offers);
  let channelWriting: ChannelWriting | null = null;
  let writing: AdSetsWriting | null = null;
  let dropped: string[] = [];
  let model: string | null = null;
  try {
    const timeout = Math.max(20_000, Math.min(120_000, ctx.deadline - Date.now() - 10_000));
    const raw = await chatJson<Record<string, unknown>>(ADSETS_SYSTEM, `Data (JSON):\n${JSON.stringify(input)}`, timeout);
    let channels: ChannelWriting;
    ({ writing, channels, dropped } = checkWriting(raw, allowed, input.plan_keywords, config));
    channelWriting = channels;
    model = GROUNDSWELL_MODEL();
  } catch (err) {
    if (err instanceof PermanentStepError) throw err;
    // The sets still stand on the plan and the copy step's ads; the words for images fall back to the ads' headlines.
    dropped.push(`The writer did not answer (${(err instanceof Error ? err.message : String(err)).slice(0, 160)}); engagement ads, carousel and negatives were left out.`);
  }

  const site = f.site?.business;
  const code = businessCode(ctx.audit.business_name);
  const month = MONTH();
  const sets = buildAdSets(
    {
      business: {
        name: ctx.audit.business_name,
        code,
        website: site?.final_url ?? ctx.audit.website,
        // The site scan names booking tools, not their pages, so the ads land on the website itself.
        landing: null,
        city: ctx.audit.city,
        instagram: f.social?.business?.handle ?? ctx.audit.instagram,
      },
      plan: plan.plan,
      angles: plan.angles,
      industry,
      copy,
      ranking: (f.search?.business?.top_keywords ?? []).map((k) => ({ keyword: k.keyword, volume: k.volume, position: k.position, url: k.url })),
      ideas: (f.keywords?.ideas ?? []).map((k) => ({ keyword: k.keyword, monthly_searches: k.monthly_searches ?? 0, low_bid_usd: k.low_bid_usd, high_bid_usd: k.high_bid_usd })),
      creative,
      meta_pixel: Boolean(site?.tracking.meta_pixel),
      writing,
      month,
      proof: channelContext.proof,
    },
    config
  );
  // Reddit and TikTok, beside the Meta and Google sets; each ad names the data it was written from.
  const landing = site?.final_url ?? ctx.audit.website ?? (ctx.audit.instagram ? `https://www.instagram.com/${ctx.audit.instagram}/` : '');
  const reviews = isReviewsOutput(ctx.outputs.reviews) ? ctx.outputs.reviews : null;
  const channels = buildChannelSets(
    {
      business: { name: ctx.audit.business_name, code, area: ctx.audit.city ?? 'the business’s area', landing },
      industry,
      rows: plan.plan.rows,
      community: channelContext.reddit ? { communities: channelContext.reddit.communities, questions: (community?.category.questions ?? []).map((q) => ({ community: q.subreddit, question: q.title ?? '' })).filter((q) => q.question) } : null,
      creative,
      writing: channelWriting,
      month,
      evidence: {
        reddit: channelContext.reddit ? `Communities that talk about the business or its category: ${channelContext.reddit.communities.slice(0, 4).map((c) => `r/${c}`).join(', ')}.` : undefined,
        offers: channelContext.offers.length ? `The business’s own published offers: ${channelContext.offers.map((o) => `${o.name} (${o.price})`).join('; ')}.` : undefined,
        ai_answers: channelContext.ai_questions.length ? `Not named when Google’s AI is asked: ${channelContext.ai_questions.map((q) => `“${q}”`).join(', ')}.` : undefined,
        yelp: reviews?.business ? `${reviews.business.rating}★ from ${reviews.business.reviews} reviews on Yelp.` : undefined,
        own_posts: creative.length ? `The business’s own posts and photos (${creative.length} kept).` : 'The business’s own posts.',
        website: site?.title ? `The website: “${site.title}”.` : 'The business’s website.',
      },
    },
    config
  );
  sets.reddit = channels.reddit;
  sets.tiktok = channels.tiktok;
  sets.notes.push(...channels.notes);
  return { model, generated_at: new Date().toISOString(), basis, code, month, sets, dropped };
}
