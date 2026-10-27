/**
 * The presence plan: what to do about reviews, Reddit and AI answers, from
 * what was read, in code. Every action names its evidence (the figures and
 * links it rests on) and nothing is written that the data does not show:
 * no model writes these lines, so no number can be invented. New Wave's
 * rules, each stated where it applies:
 *
 * - Reviews: an unclaimed or missing Yelp listing comes first (claiming is
 *   free and lets the owner answer reviews and correct hours); fewer reviews
 *   than the competitors' median asks for a review drive; a rating below the
 *   best competitor's is named, never argued with.
 * - Reddit: the business takes part as itself, saying who it is, where it is
 *   already mentioned and where its category's questions are asked; nothing
 *   builds on a thread about politics or boycotts (the community step leaves
 *   those out before this sees them).
 * - AI answers: each question where Google's AI Mode did not name the
 *   business is a high priority, with what it named instead and the sources
 *   it cited; named but not first is medium; what the AI says about the
 *   business by name is shown for the owner to correct at the source.
 */

export type PresencePriority = 'high' | 'medium' | 'low';
export type PresenceArea = 'reviews' | 'reddit' | 'ai_answers';

export interface PresenceAction {
  area: PresenceArea;
  priority: PresencePriority;
  action: string;
  reason: string;
  evidence: string[];
  /** Links behind the evidence (listings, threads, cited pages). */
  links: string[];
}

export interface PresenceInput {
  business: string;
  google: { rating: number | null; reviews: number | null } | null;
  yelp: {
    business: { rating: number | null; reviews: number | null; claimed: boolean | null; url: string | null } | null;
    error: string | null;
    competitors: { name: string; rating: number | null; reviews: number | null }[];
    newest_review_at: string | null;
  } | null;
  reddit: {
    mentions: { subreddit: string | null; title: string | null; url: string | null }[];
    communities: { name: string; count: number }[];
    questions: { subreddit: string | null; title: string | null; url: string | null }[];
    category_communities: { name: string; count: number }[];
    competitors: { name: string; mentions: number | null }[];
  } | null;
  ai: {
    answers: { prompt: string; purpose: string; named: boolean; position: number | null; top: string | null; businesses_named: string[]; description: string | null; references: { title: string; link: string | null }[]; error: string | null }[];
  } | null;
  /** Reddit's self-serve ads do not take this industry (alcohol): the community plan says so. */
  reddit_ads_sales_team?: boolean;
  /** The developer brief's top improvements (the ai_search step), named beside the AI-answer actions. */
  geo_improvements?: string[];
  now?: number;
}

export interface PresencePlan {
  actions: PresenceAction[];
  measures: string[];
  summary: string;
}

const fmtRating = (r: number | null, n: number | null) => (r !== null ? `${r}★${n !== null ? ` from ${n.toLocaleString('en-US')} reviews` : ''}` : n !== null ? `${n.toLocaleString('en-US')} reviews` : 'no rating shown');
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const ORDER: Record<PresencePriority, number> = { high: 0, medium: 1, low: 2 };
const DAY = 86_400_000;

function reviewActions(i: PresenceInput): PresenceAction[] {
  const out: PresenceAction[] = [];
  const y = i.yelp;
  if (!y) return out;
  const listing = y.business;
  const rivals = y.competitors.filter((c) => c.reviews !== null || c.rating !== null);
  const rivalLine = rivals.map((c) => `${c.name}: ${fmtRating(c.rating, c.reviews)}`);
  if (!listing) {
    out.push({ area: 'reviews', priority: 'high', action: 'Create or claim the business’s Yelp listing, with the same name, phone, address and hours as the Google listing.', reason: 'No Yelp listing matched the business, so people searching Yelp, and the AI answers that read it, do not find it.', evidence: [y.error ?? 'No Yelp listing matched.', ...rivalLine], links: [] });
    return out;
  }
  if (listing.claimed === false) {
    out.push({ area: 'reviews', priority: 'high', action: 'Claim the Yelp listing (free at biz.yelp.com) so the owner can answer reviews and correct the hours and photos.', reason: 'Yelp shows the listing as unclaimed.', evidence: [`Yelp: ${fmtRating(listing.rating, listing.reviews)}, unclaimed.`], links: listing.url ? [listing.url] : [] });
  }
  const mid = median(rivals.map((c) => c.reviews).filter((x): x is number => x !== null));
  if (listing.reviews !== null && mid !== null && listing.reviews < mid) {
    out.push({ area: 'reviews', priority: 'medium', action: 'Ask happy customers for a Yelp review at the moment they are happiest (at the table, or in a follow-up), and answer every review as the owner.', reason: 'The business has fewer Yelp reviews than the competitors’ median; the count is what people and AI answers weigh first.', evidence: [`${i.business}: ${fmtRating(listing.rating, listing.reviews)}.`, ...rivalLine], links: listing.url ? [listing.url] : [] });
  }
  const best = rivals.filter((c) => c.rating !== null).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];
  if (listing.rating !== null && best && best.rating !== null && best.rating > listing.rating) {
    out.push({ area: 'reviews', priority: 'low', action: 'Read the lower-rated reviews for the one thing that comes up most, fix it, and say so in the reply.', reason: `${best.name} is rated higher on Yelp.`, evidence: [`${i.business}: ${fmtRating(listing.rating, listing.reviews)}; ${best.name}: ${fmtRating(best.rating, best.reviews)}.`], links: [] });
  }
  if (i.google?.reviews !== null && i.google?.reviews !== undefined && listing.reviews !== null && i.google.reviews >= 2 * Math.max(1, listing.reviews)) {
    out.push({ area: 'reviews', priority: 'low', action: 'Give the Yelp listing a place beside Google wherever reviews are asked for (the receipt, the table card, the follow-up message).', reason: 'Most of the business’s reviews are on Google; Yelp lags far behind.', evidence: [`Google: ${fmtRating(i.google.rating, i.google.reviews)}; Yelp: ${fmtRating(listing.rating, listing.reviews)}.`], links: listing.url ? [listing.url] : [] });
  }
  const now = i.now ?? Date.now();
  const newest = y.newest_review_at ? Date.parse(y.newest_review_at.replace(' ', 'T')) : NaN;
  if (Number.isFinite(newest) && now - newest > 90 * DAY) {
    out.push({ area: 'reviews', priority: 'medium', action: 'Restart the flow of Yelp reviews: the newest one Yelp shows is more than three months old.', reason: 'Recent reviews tell people (and the AI answers) the business is active.', evidence: [`Newest Yelp review shown: ${y.newest_review_at!.slice(0, 10)}.`], links: listing.url ? [listing.url] : [] });
  }
  return out;
}

function redditActions(i: PresenceInput): PresenceAction[] {
  const out: PresenceAction[] = [];
  const r = i.reddit;
  if (!r) return out;
  const top = r.communities[0];
  if (r.mentions.length && top) {
    out.push({
      area: 'reddit',
      priority: 'medium',
      action: `Take part in r/${top.name} as the business, saying who you are: share events and releases where the community already lists them, and answer when the business comes up.`,
      reason: `The business is already mentioned there, mostly by others.`,
      evidence: [`${r.mentions.length} Reddit post${r.mentions.length === 1 ? '' : 's'} or comment${r.mentions.length === 1 ? '' : 's'} name the business; communities: ${r.communities.slice(0, 4).map((c) => `r/${c.name} (${c.count})`).join(', ')}.`],
      links: r.mentions.slice(0, 3).map((m) => m.url).filter((u): u is string => Boolean(u)),
    });
  } else {
    const where = r.category_communities[0];
    out.push({ area: 'reddit', priority: 'low', action: where ? `Introduce the business in r/${where.name} the way its rules allow (most local communities welcome events and openings, not ads).` : 'Find the city’s own subreddit and introduce the business the way its rules allow (events and openings, not ads).', reason: 'No Reddit post or comment found names the business.', evidence: ['Reddit search found no mention of the business.'], links: [] });
  }
  if (r.questions.length) {
    out.push({
      area: 'reddit',
      priority: 'medium',
      action: 'Answer the category questions people ask on Reddit, as the owner and saying so; never post a review of the business, and never ask others to.',
      reason: 'These are the questions people ask before choosing, in public, where the answers stay findable (and are read by the AI assistants).',
      evidence: r.questions.slice(0, 3).map((q) => `${q.subreddit ? `r/${q.subreddit}: ` : ''}${q.title ?? ''}`),
      links: r.questions.slice(0, 3).map((q) => q.url).filter((u): u is string => Boolean(u)),
    });
  }
  const louder = r.competitors.filter((c) => c.mentions !== null && c.mentions > r.mentions.length);
  if (louder.length) {
    out.push({ area: 'reddit', priority: 'low', action: 'Give regulars a reason to mention the business (a release, an event, a collaboration) rather than asking for mentions.', reason: 'Competitors come up more often on Reddit.', evidence: [`${i.business}: ${r.mentions.length}; ${louder.map((c) => `${c.name}: ${c.mentions}`).join('; ')} (posts found in one page of search each).`], links: [] });
  }
  if (i.reddit_ads_sales_team) {
    out.push({ area: 'reddit', priority: 'low', action: 'For Reddit ads, talk to Reddit’s sales team: the industry is not open to self-serve ads, and the ad sets name the communities to target.', reason: 'Reddit restricts this category’s advertising to managed accounts.', evidence: ['Platform rule in the setup file.'], links: [] });
  }
  return out;
}

function aiActions(i: PresenceInput): PresenceAction[] {
  const out: PresenceAction[] = [];
  if (!i.ai) return out;
  for (const a of i.ai.answers.filter((x) => !x.error)) {
    const cited = a.references.slice(0, 4);
    if (a.purpose !== 'brand' && !a.named) {
      out.push({
        area: 'ai_answers',
        priority: 'high',
        action: `Be named when Google’s AI is asked “${a.prompt}”: get the business onto the sources it cites, and make the website say plainly what it is and where.`,
        reason: 'The answer did not name the business.',
        evidence: [a.businesses_named.length ? `It named: ${a.businesses_named.slice(0, 5).join(', ')}.` : 'It named no business.', ...(cited.length ? [`Sources it cited: ${cited.map((c) => c.title).join('; ')}.`] : []), ...(i.geo_improvements?.slice(0, 2).map((g) => `Developer brief: ${g}`) ?? [])],
        links: cited.map((c) => c.link).filter((u): u is string => Boolean(u)),
      });
    } else if (a.purpose !== 'brand' && a.position !== null && a.position > 1) {
      out.push({
        area: 'ai_answers',
        priority: 'medium',
        action: `Move up when Google’s AI is asked “${a.prompt}”: the reviews, the Yelp listing and the site’s own description are what it reads.`,
        reason: `Named, but not first${a.top ? `: it led with ${a.top}` : ''}.`,
        evidence: [`Named ${a.position}${a.position === 2 ? 'nd' : a.position === 3 ? 'rd' : 'th'} of ${a.businesses_named.length}.`, ...(cited.length ? [`Sources it cited: ${cited.map((c) => c.title).join('; ')}.`] : [])],
        links: cited.map((c) => c.link).filter((u): u is string => Boolean(u)),
      });
    }
    if (a.purpose === 'brand' && a.description) {
      out.push({ area: 'ai_answers', priority: 'low', action: 'Check what Google’s AI says about the business by name, and correct anything wrong where it comes from (the website, the Google and Yelp listings).', reason: 'What the AI repeats is what people read before they visit.', evidence: [`“${a.description}”`], links: [] });
    }
  }
  return out;
}

export function buildPresencePlan(i: PresenceInput): PresencePlan {
  const actions = [...reviewActions(i), ...redditActions(i), ...aiActions(i)].sort((a, b) => ORDER[a.priority] - ORDER[b.priority]);
  const measures = [
    i.yelp ? 'Each month: the Yelp rating and review count beside Google’s, and the competitors’.' : null,
    i.reddit ? 'Each month: Reddit posts and comments naming the business, and the questions answered.' : null,
    i.ai ? 'Each month: ask the same AI questions again and note who is named, in what order, and which sources are cited.' : null,
  ].filter((x): x is string => Boolean(x));
  const high = actions.filter((a) => a.priority === 'high').length;
  const summary = actions.length
    ? `${actions.length} action${actions.length === 1 ? '' : 's'} across reviews, Reddit and AI answers${high ? `, ${high} of them high priority` : ''}.`
    : 'Reviews, Reddit and AI answers were read and show nothing to act on this time.';
  return { actions, measures, summary };
}
