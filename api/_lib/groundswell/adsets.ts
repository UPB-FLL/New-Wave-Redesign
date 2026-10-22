import { GROUNDSWELL_CONFIG } from '../../../packages/groundswell/groundswell.config.js';
import { buildAdSets, businessCode, type AdSetsPlan, type AdSetsWriting } from '../../../packages/groundswell/src/adsets.js';
import type { GroundswellConfig } from '../../../packages/groundswell/src/config.js';
import { claimsIn } from '../../../packages/groundswell/src/templates.js';
import { isAdcopyOutput, copyFacts } from './adcopy.js';
import { isAdplanOutput, type AdplanOutput } from './adplan.js';
import { isCreativeOutput } from './creative.js';
import { buildFacts, numbersIn, unsupportedNumbers, type Facts } from './model.js';
import { chatJson, GROUNDSWELL_MODEL } from './openai.js';
import { PermanentStepError, type StepContext } from './types.js';

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

export function writerInput(f: Facts, plan: AdplanOutput, captions: string[], config: GroundswellConfig) {
  const live = plan.plan.rows.filter((r) => r.recommendation !== 'skip');
  return {
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
 "interests": up to 6 Meta interest names that fit the business's customers}
Rules:
- Use only the facts given. Name what the business shows: its services, place, booking, its own posts' subjects. Never mention a competitor.
- Use a number only if it appears in the facts (a published price, the Google rating and review count). No discounts, prices, years or counts that are not given.
- Never use these words or claims: ${GROUNDSWELL_CONFIG.unsupported_claims.join(', ')}.
- Engagement ads and the carousel aim at saves, shares and comments: useful and specific to this business, no hard sell. Each carousel slide teaches one thing the business knows; the last slide says how to book or reach it.
- Negatives: searches from keyword_ideas the business does not serve (jobs, do-it-yourself, other services, other cities), or common searches of that kind. Never a word or phrase inside a keyword in plan_keywords.`;

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/[ \t]+/g, ' ').slice(0, max).trim() : '');

/** The writer's answer held to the facts: anything with an invented number or a banned claim is dropped, with the reason. */
export function checkWriting(raw: Record<string, unknown>, allowed: Set<string>, planKeywords: string[], config: GroundswellConfig): { writing: AdSetsWriting; dropped: string[] } {
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

  return { writing: { engagement_ads, image_headlines, meta_ads, carousel, negatives, interests }, dropped };
}

const MONTH = () => new Date().toISOString().slice(0, 7);

export async function runAdsets(ctx: StepContext): Promise<AdsetsOutput> {
  const config = GROUNDSWELL_CONFIG;
  const found = planFor(ctx.outputs);
  if (!found) throw new PermanentStepError('There is no ad plan (phase 1 found no keyword demand), so no ad sets were built.');
  const { plan, basis } = found;
  const f = buildFacts(ctx.audit, ctx.outputs);
  const creative = isCreativeOutput(ctx.outputs.creative) ? ctx.outputs.creative.images : [];
  const copy = isAdcopyOutput(ctx.outputs.adcopy) ? ctx.outputs.adcopy.ads : [];

  const input = writerInput(
    f,
    plan,
    creative.map((i) => i.caption ?? '').filter(Boolean),
    config
  );
  // The numbers the words may use: the business's own facts and its post captions only.
  const allowed = numbersIn(input.facts, input.best_post_captions, input.angles);
  let writing: AdSetsWriting | null = null;
  let dropped: string[] = [];
  let model: string | null = null;
  try {
    const timeout = Math.max(20_000, Math.min(120_000, ctx.deadline - Date.now() - 10_000));
    const raw = await chatJson<Record<string, unknown>>(ADSETS_SYSTEM, `Data (JSON):\n${JSON.stringify(input)}`, timeout);
    ({ writing, dropped } = checkWriting(raw, allowed, input.plan_keywords, config));
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
      industry: config.industries.find((i) => i.id === plan.industry.id) ?? config.industries.find((i) => i.id === 'general')!,
      copy,
      ranking: (f.search?.business?.top_keywords ?? []).map((k) => ({ keyword: k.keyword, volume: k.volume, position: k.position, url: k.url })),
      ideas: (f.keywords?.ideas ?? []).map((k) => ({ keyword: k.keyword, monthly_searches: k.monthly_searches ?? 0, low_bid_usd: k.low_bid_usd, high_bid_usd: k.high_bid_usd })),
      creative,
      meta_pixel: Boolean(site?.tracking.meta_pixel),
      writing,
      month,
    },
    config
  );
  return { model, generated_at: new Date().toISOString(), basis, code, month, sets, dropped };
}
