import { GROUNDSWELL_CONFIG } from '../../../packages/groundswell/groundswell.config.js';
import { checkPlans, hasPlans, type PlansResult } from '../../../packages/groundswell/src/plans.js';
import { isAdplanOutput } from './adplan.js';
import { allowedNumbers, buildFacts, unsupportedNumbers, type Facts } from './model.js';
import { chatJson, GROUNDSWELL_MODEL } from './openai.js';
import { PermanentStepError, type StepContext } from './types.js';
import { isSitePagesOutput, type SitePagesOutput } from './currents/sitePages.js';
import type { BusinessProfile } from './businessProfile.js';
import type { CompetitorsOutput } from './currents/competitors.js';

/**
 * Plans step: from the data gathered and the write-up, one OpenAI call writes
 * (1) the website optimization plan, page by page, from the pages Firecrawl
 * read, the technical SEO checks, the keyword demand and the observed search
 * results; and (2) the social media plan with a first week of posts, Monday
 * to Sunday, ready to paste, in the business's own voice (its site's words and
 * its own captions), with the hashtags its market uses.
 *
 * Held to the data in code (packages/groundswell/src/plans.ts): a change names
 * a page that was read; no number that is not in the data; no unsupported
 * claim and no competitor's name in a caption; one post a day. Optional: an
 * audit without it reads as before.
 */

export interface PlansOutput extends PlansResult {
  model: string;
  generated_at: string;
  /** What the plans rest on, in words (for the reports' sources list). */
  sources: string[];
}

export function isPlansOutput(x: unknown): x is PlansOutput {
  const o = x as Partial<PlansOutput> | null | undefined;
  return Boolean(o && o.website_plan && Array.isArray(o.website_plan.changes) && o.social_plan && Array.isArray(o.social_plan.week));
}

export { hasPlans };

/** The pages a website change may name: every page read, by URL and by path, and the homepage. */
export function pagesAllowed(f: Facts, pages: SitePagesOutput | null): string[] {
  const out = new Set<string>();
  const home = f.site?.business?.final_url ?? f.site?.business?.url ?? f.business.website;
  if (home) { out.add(home); out.add('/'); }
  for (const p of pages?.pages ?? []) if (!p.error) { out.add(p.url); out.add(p.path); }
  return [...out];
}

/** What the writer sees: the business's own facts in full, its market as observation, never a competitor's words as copy. */
export function plansInput(f: Facts, pages: SitePagesOutput | null, profile: BusinessProfile | null, writeup: { findings?: { area: string; title: string; action: string }[]; areas?: Record<string, { fixes: string[] }> } | null, angles: string[]) {
  const site = f.site?.business;
  const ig = f.social?.business;
  const fb = f.social?.facebook;
  return {
    business: {
      name: f.business.name,
      city: f.business.city,
      website: site?.final_url ?? f.business.website,
      category: profile?.category ?? f.maps?.business?.category ?? null,
      offer: profile?.offer ?? null,
      services: profile?.services ?? [],
      audience: profile?.audience ?? null,
      service_area: profile?.service_area ?? null,
      content_topics: profile?.content_topics ?? [],
      google_listing: f.maps?.business ? { rating: f.maps.business.rating, reviews: f.maps.business.reviews, hours: f.maps.business.hours } : null,
    },
    website: {
      homepage: site ? { url: site.final_url ?? site.url, title: site.title, description: site.meta_description, h1: site.h1.slice(0, 3), word_count: site.word_count, booking: site.booking, tracking: site.tracking } : null,
      technical_seo: site?.technical_seo?.findings.map((x) => ({ severity: x.severity, title: x.title, evidence: x.evidence, recommendation: x.recommendation })) ?? [],
      pages: (pages?.pages ?? []).filter((p) => !p.error).map((p) => ({ url: p.url, path: p.path, title: p.title, description: p.description, h1: p.h1, headings: p.headings.slice(0, 12), word_count: p.word_count, ctas: p.ctas.map((c) => c.text), prices: p.prices, excerpt: p.excerpt.slice(0, 600) })),
      pages_not_read: (pages?.pages ?? []).filter((p) => p.error).map((p) => p.path),
    },
    search: {
      keywords: (f.keywords?.ideas ?? []).slice(0, 25).map((k) => ({ keyword: k.keyword, monthly_searches: k.monthly_searches })),
      demand_measured: f.keywords?.demand_status !== 'unavailable',
      ranks: (f.search?.business?.top_keywords ?? []).slice(0, 10),
      observed: (f.search?.serp?.queries ?? []).filter((q) => !q.error).map((q) => ({ query: q.query, top: q.organic.slice(0, 5).map((o) => ({ position: o.position, domain: o.domain, title: o.title })), questions: q.questions ?? [], related_searches: q.related_searches })),
    },
    social: {
      instagram: ig ? { handle: ig.handle, read: ig.exists, note: ig.note ?? null, followers: ig.followers, posts_last_30_days: ig.posts_last_30_days, avg_likes_recent: ig.avg_likes_recent, biography: ig.biography, bio_links: ig.bio_links ?? [], recent_captions: ig.recent_captions ?? [], hashtags: ig.hashtags ?? [], posts: (ig.media ?? []).slice(0, 12).map((m) => ({ permalink: m.permalink, type: m.type, caption: m.caption, likes: m.likes, comments: m.comments })) } : null,
      facebook: fb ? { url: fb.url, read: fb.exists, followers: fb.followers, posts: fb.posts.map((p) => ({ text: p.text, posted_at: p.posted_at, reactions: p.reactions })) } : null,
      competitors: (f.social?.competitors ?? []).map((c) => ({ name: c.name, handle: c.handle, followers: c.followers, posts_last_30_days: c.posts_last_30_days, avg_likes_recent: c.avg_likes_recent, hashtags: c.hashtags ?? [], recent_captions: c.recent_captions ?? [] })),
      hashtags_seen: f.social?.hashtags_seen ?? null,
    },
    findings: (writeup?.findings ?? []).map((x) => ({ area: x.area, title: x.title, action: x.action })),
    website_fixes: writeup?.areas?.website?.fixes ?? [],
    ad_angles: angles,
  };
}

export const PLANS_SYSTEM = `You write two plans for a small business from a marketing audit's data, for New Wave: Social Engineering's Groundswell engine: a website optimization plan and a social media plan with its first week of posts.
Rules for both:
- Use ONLY the data given. Every number you write must appear in the data; never invent prices, percentages, counts, dates or results.
- Never use these words or claims: ${GROUNDSWELL_CONFIG.unsupported_claims.join(', ')}. Never name a competitor in a post. Never promise outcomes.
- Plain words for a busy owner; they/them for people; no decorative numbering.
Website plan (website_plan):
- changes: page by page, from the pages read (website.pages, website.homepage) and the technical SEO findings. Each change names the page's url or path exactly as given (or "site-wide"), what to change (specific: the title, the heading, the opening sentence, the call to action, the words a search uses, the booking link), why, and the evidence seen. Priority high/medium/low. At most 12.
- new_pages: pages to add for searches with measured demand that no page answers (path, purpose, the searches). Only when the keyword data supports it. At most 4.
- measurement: how to tell it worked (Search Console, the booking form, calls), without forecasts. At most 5.
Social plan (social_plan):
- platforms: where to post and why, from where the business and its market are active (the Instagram and Facebook reads; when neither could be read, plan for Instagram and Facebook). role and cadence in words.
- pillars: 3 to 5 content pillars drawn from the business's services, content_topics, the questions people ask (search.observed.questions, related_searches) and its own recent posts.
- week: seven posts, "Monday" to "Sunday", one each. Each: platform, format (post, reel, carousel, story, text, video; include at least one reel and one carousel), pillar, topic, hook (the first line), caption (ready to paste, in the business's own voice from its site's words and its own captions; 60 to 150 words; no competitor; no number not in the data), cta (one line), visual (name one of the business's own posts by its permalink when one fits, else describe the photo or clip to take), hashtags (3 to 10, from the business's and its market's observed hashtags plus plain category words, without the # sign).
Answer with JSON: {"website_plan":{"summary":"...","changes":[{"page":"...","priority":"high|medium|low","change":"...","reason":"...","evidence":"..."}],"new_pages":[{"path":"/...","purpose":"...","searches":["..."]}],"measurement":["..."]},"social_plan":{"summary":"...","platforms":[{"platform":"instagram|facebook|tiktok|linkedin|google_business|youtube","role":"...","cadence":"..."}],"pillars":[{"name":"...","why":"..."}],"week":[{"day":"Monday","platform":"instagram","format":"reel","pillar":"...","topic":"...","hook":"...","caption":"...","cta":"...","visual":"...","hashtags":["..."]}]}}`;

export async function runPlans(ctx: StepContext): Promise<PlansOutput> {
  const facts = buildFacts(ctx.audit, ctx.outputs);
  const model = ctx.outputs.model as { writeup?: { findings?: { area: string; title: string; action: string }[]; areas?: Record<string, { fixes: string[] }> } } | undefined;
  if (!model?.writeup) throw new PermanentStepError('There is no write-up, so the plans were not written.');
  if (!facts.site?.business && !facts.social?.business && !facts.social?.facebook) throw new PermanentStepError('Neither the website nor a social profile was read, so the plans were not written.');
  const pages = isSitePagesOutput(ctx.outputs.site_pages) ? ctx.outputs.site_pages : null;
  const competitors = ctx.outputs.competitors as CompetitorsOutput | undefined;
  const profile = competitors?.profile ?? null;
  const adplan = isAdplanOutput(ctx.outputs.adplan) ? ctx.outputs.adplan : null;
  const input = plansInput(facts, pages, profile, model.writeup, adplan?.angles.map((a) => a.name) ?? []);
  const allowed = allowedNumbers(input);
  const timeout = Math.max(30_000, Math.min(150_000, ctx.deadline - Date.now() - 5_000));
  const raw = await chatJson<Record<string, unknown>>(PLANS_SYSTEM, `Data (JSON):\n${JSON.stringify(input)}`, timeout);
  const checked = checkPlans(raw, {
    unsupported: (text) => unsupportedNumbers(text, allowed),
    claims: GROUNDSWELL_CONFIG.unsupported_claims,
    competitors: ctx.audit.competitors.map((c) => c.name),
    pages: pagesAllowed(facts, pages),
  });
  if (!hasPlans(checked)) throw new Error(`The plans came back with nothing the rules allow. ${checked.dropped.slice(0, 3).join(' ')}`.trim());
  const sources = [
    pages?.pages.length ? `${pages.pages.filter((p) => !p.error).length} website pages read as main content (Firecrawl, ${pages.fetched_at.slice(0, 10)})` : 'The website’s homepage scan',
    facts.keywords?.source ? `Keyword demand: ${facts.keywords.source}` : null,
    facts.search?.serp?.queries.some((q) => !q.error) ? 'Observed public Google results, with the questions people ask' : null,
    facts.social?.business?.exists ? `The business’s own Instagram posts (@${facts.social.business.handle})` : null,
    facts.social?.competitors?.some((c) => c.exists) ? 'Competitors’ public posting cadence and hashtags (observation only)' : null,
  ].filter((s): s is string => Boolean(s));
  return { model: GROUNDSWELL_MODEL(), generated_at: new Date().toISOString(), ...checked, sources };
}
