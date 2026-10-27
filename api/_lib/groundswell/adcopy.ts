import { GROUNDSWELL_CONFIG } from '../../../packages/groundswell/groundswell.config.js';
import { checkCopy, copyTargets, type CheckedAd, type CopyResult, type CopyTarget } from '../../../packages/groundswell/src/adcopy.js';
import type { GroundswellConfig } from '../../../packages/groundswell/src/config.js';
import { isAdplanOutput } from './adplan.js';
import { buildFacts, numbersIn, unsupportedNumbers, type Facts } from './model.js';
import { chatJson, GROUNDSWELL_MODEL } from './openai.js';
import type { StepContext } from './types.js';

/**
 * Ad-copy step: one ad for each row the ad plan funds or tests
 * (packages/groundswell/src/adcopy.ts), written by one OpenAI call from the
 * business's own public facts and held to them in code:
 * - only the business's facts go in (its website's words, its Google listing,
 *   its Instagram bio), never a competitor's;
 * - a line quoting a number that is not in the business's facts or the ad's
 *   angle, keywords and platform rules (not even a small count: no invented
 *   "10% off"), or making a claim from the setup file's `unsupported_claims`,
 *   is dropped;
 * - lines over the platform's limit are dropped, and an ad left short of the
 *   format's minimum is listed as not written, with the reason.
 *
 * Optional. Without an ad plan, or when the plan runs no rows (every row is
 * a skip, as when the searches lose money at the published rates), there is
 * nothing to write: the step finishes with no ads and a `note` saying why, the
 * full audit shows the plan without copy, and the run card shows no fault.
 */

export interface AdcopyOutput extends CopyResult {
  model: string;
  generated_at: string;
  /** Why no ad was written, when nothing was asked of the model. */
  note?: string | null;
}

/** The step's output when the plan asks for no copy. */
export const noCopy = (note: string): AdcopyOutput => ({ model: GROUNDSWELL_MODEL(), generated_at: new Date().toISOString(), ads: [], not_written: [], dropped: [], note });

/** True for a usable ad-copy step output (an audit started before the step existed has none). */
export function isAdcopyOutput(x: unknown): x is AdcopyOutput {
  const o = x as Partial<AdcopyOutput> | null | undefined;
  return Boolean(o && Array.isArray(o.ads) && Array.isArray(o.not_written));
}

/** The business's own facts the copy may draw on: no competitors, no search data. */
export function copyFacts(f: Facts) {
  const site = f.site?.business;
  const place = f.maps?.business;
  const ig = f.social?.business;
  return {
    business: { name: f.business.name, city: f.business.city, website: f.business.website },
    website: site && { title: site.title, meta_description: site.meta_description, h1: site.h1.slice(0, 3), booking: site.booking },
    google_listing: place && { name: place.name, rating: place.rating, reviews: place.reviews, category: place.category, address: place.address, hours: place.hours },
    instagram: ig && ig.exists ? { handle: ig.handle, biography: ig.biography } : null,
  };
}

/** What the model is asked to write: each ad's format and limits, its angle, keywords and platform rules. */
export function copyInput(f: Facts, targets: CopyTarget[], config: GroundswellConfig) {
  return {
    facts: copyFacts(f),
    ads: targets.map((t) => {
      const spec = config.platforms[t.platform].template;
      return {
        angle_id: t.angle_id,
        platform: t.platform,
        angle: t.angle,
        why: t.why,
        keywords: t.keywords,
        format: spec.format,
        fields: Object.fromEntries(
          Object.entries(spec.fields).map(([name, r]) => [name, { max_chars: r.max_chars, min: r.min_count ?? 1, max: r.max_count ?? 1 }])
        ),
        platform_rules: t.conditions,
      };
    }),
  };
}

export const COPY_SYSTEM = `You write ready-to-paste ads for a small business for New Wave: Social Engineering's Groundswell engine.
You get the business's own public facts and the ads to write: one per angle and platform, with each field's character limit and how many lines it takes (min to max).
Rules:
- Write only from the facts and the angle given. Name what the business shows: its services, menu, packages, place, booking. Never mention or compare with a competitor.
- Never use these words or claims, even in quotes or with a rating: ${GROUNDSWELL_CONFIG.unsupported_claims.join(', ')}.
- Use a number only if it appears in the facts or the keywords (a published price, the Google rating and review count). No discounts, prices, years or counts that are not given.
- Stay within every character limit, counting spaces. For a field that takes several lines, write as many as its max so the weaker ones can be cut, and make them different from each other.
- Follow each ad's platform_rules in the copy and the targeting (for example an age limit).
- targeting: one line on who should see a social ad (area and interests). Search ads are targeted by their keywords; write "" for them.
- call_to_action: the button or next step, in a few words.
Answer with JSON: {"ads":[{"angle_id":"...","platform":"...","fields":{"<field>":"text" or ["line","line"]},"targeting":"...","call_to_action":"..."}]}`;

export async function runAdcopy(ctx: StepContext): Promise<AdcopyOutput> {
  const plan = isAdplanOutput(ctx.outputs.adplan) ? ctx.outputs.adplan : null;
  if (!plan) return noCopy('There is no ad plan, so no ad copy was written.');
  const config = GROUNDSWELL_CONFIG;
  const targets = copyTargets(plan.plan, plan.angles);
  if (!targets.length) return noCopy('The ad plan runs no rows (none is funded or tested), so no ad copy was written.');
  const input = copyInput(buildFacts(ctx.audit, ctx.outputs), targets, config);
  // The numbers the copy may use: the facts' and each ad's own, never the format's limits.
  const allowed = numbersIn(input.facts, input.ads.map(({ angle, why, keywords, platform_rules }) => ({ angle, why, keywords, platform_rules })));
  const timeout = Math.max(20_000, Math.min(120_000, ctx.deadline - Date.now() - 5_000));
  const raw = await chatJson<Record<string, unknown>>(COPY_SYSTEM, `Data (JSON):\n${JSON.stringify(input)}`, timeout);
  return {
    model: GROUNDSWELL_MODEL(),
    generated_at: new Date().toISOString(),
    ...checkCopy(raw, targets, config, (text) => unsupportedNumbers(text, allowed)),
  };
}

export type { CheckedAd };
