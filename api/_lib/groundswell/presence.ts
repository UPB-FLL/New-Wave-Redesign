import { GROUNDSWELL_CONFIG } from '../../../packages/groundswell/groundswell.config.js';
import type { AdPlatformId } from '../../../packages/groundswell/src/config.js';
import { buildPresencePlan, type PresenceInput, type PresencePlan } from '../../../packages/groundswell/src/presence.js';
import { isAdplanOutput } from './adplan.js';
import { isAiAnswersOutput } from './currents/aiAnswers.js';
import { isCommunityOutput } from './currents/community.js';
import { isReviewsOutput } from './currents/reviews.js';
import { PermanentStepError, type StepContext } from './types.js';

/**
 * Presence step (after the plans): the plan for reviews, Reddit and AI
 * answers, from the reviews, community and ai_answers steps, in code
 * (packages/groundswell/src/presence.ts). Optional: with none of the three
 * read, there is nothing to plan and the step is skipped.
 */

export interface PresenceOutput extends PresencePlan {
  generated_at: string;
  /** Which reads the plan rests on. */
  based_on: ('reviews' | 'community' | 'ai_answers')[];
}

export const isPresenceOutput = (x: unknown): x is PresenceOutput => Boolean(x && typeof x === 'object' && Array.isArray((x as PresenceOutput).actions) && Array.isArray((x as PresenceOutput).based_on));

/** Whether a platform's self-serve ads are closed to the industry the ad plan picked (alcohol on Reddit and TikTok). */
export function salesTeamOnly(industryId: string | null | undefined, platform: AdPlatformId): boolean {
  const industry = GROUNDSWELL_CONFIG.industries.find((i) => i.id === industryId);
  const rules = GROUNDSWELL_CONFIG.platforms[platform]?.restricted_categories ?? {};
  return (industry?.restricted ?? []).some((c) => rules[c]?.blocks_self_serve === true);
}

export function presenceInput(ctx: StepContext): PresenceInput {
  const reviews = isReviewsOutput(ctx.outputs.reviews) ? ctx.outputs.reviews : null;
  const community = isCommunityOutput(ctx.outputs.community) ? ctx.outputs.community : null;
  const ai = isAiAnswersOutput(ctx.outputs.ai_answers) ? ctx.outputs.ai_answers : null;
  const maps = ctx.outputs.maps as { business?: { rating: number | null; reviews: number | null } | null } | undefined;
  const adplan = isAdplanOutput(ctx.outputs.adplan) ? ctx.outputs.adplan : null;
  const aiSearch = ctx.outputs.ai_search as { improvements?: { title: string }[] } | undefined;
  return {
    business: ctx.audit.business_name,
    google: maps?.business ? { rating: maps.business.rating, reviews: maps.business.reviews } : null,
    yelp: reviews
      ? {
          business: reviews.business && { rating: reviews.business.rating, reviews: reviews.business.reviews, claimed: reviews.business.claimed, url: reviews.business.url },
          error: reviews.business_error,
          competitors: reviews.competitors.filter((c) => c.listing).map((c) => ({ name: c.name, rating: c.listing!.rating, reviews: c.listing!.reviews })),
          newest_review_at: reviews.reviews[0]?.posted_at ?? null,
        }
      : null,
    reddit: community
      ? {
          mentions: community.business.mentions.map((m) => ({ subreddit: m.subreddit, title: m.title, url: m.url })),
          communities: community.business.communities,
          questions: community.category.questions.map((q) => ({ subreddit: q.subreddit, title: q.title, url: q.url })),
          category_communities: community.category.communities,
          competitors: community.competitors.map((c) => ({ name: c.name, mentions: c.mentions })),
        }
      : null,
    ai: ai ? { answers: ai.answers } : null,
    reddit_ads_sales_team: salesTeamOnly(adplan?.industry.id, 'reddit'),
    geo_improvements: (aiSearch?.improvements ?? []).map((i) => i.title).slice(0, 2),
  };
}

export async function runPresence(ctx: StepContext): Promise<PresenceOutput> {
  const input = presenceInput(ctx);
  const based_on = (['reviews', 'community', 'ai_answers'] as const).filter((k) => (k === 'reviews' ? input.yelp : k === 'community' ? input.reddit : input.ai));
  if (!based_on.length) throw new PermanentStepError('Neither Yelp, Reddit nor the AI answers were read, so there is no presence plan.');
  return { generated_at: new Date().toISOString(), based_on: [...based_on], ...buildPresencePlan(input) };
}
