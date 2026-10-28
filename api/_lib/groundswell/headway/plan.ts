import { PLATFORM_LABELS, type SocialPost } from '../../../../packages/groundswell/src/plans.js';
import type { GoogleCampaign, MetaAdSet } from '../../../../packages/groundswell/src/adsets.js';
import { HEADWAY_SERVICE_INFO, type ChecklistItem, type HeadwayService } from '../../../../src/lib/headway.js';
import { isAdsetsOutput } from '../adsets.js';
import { isBenchmarkOutput } from '../benchmark.js';
import { isCreativeOutput, type CreativeImage } from '../creative.js';
import { isPlansOutput } from '../plans.js';
import { isPostsOutput } from '../posts.js';
import type { SiteScan } from '../currents/site.js';
import { missingAmong } from './checklist.js';
import type { ActionDraft } from './store.js';

/**
 * Headway's planner: from a delivered run's outputs (the website and social
 * plans, the ad sets, the business's own images, the site scan, the
 * benchmark, the write-up) to a list of actions, one per thing to do, for
 * the services the customer pays for. Nothing here calls a provider or a
 * model: every action is a plain restatement of what the engine already
 * wrote, so what a person approves is exactly what will be done.
 *
 * - `automatic`: a tool runs it as the client's linked account once it is
 *   approved and its setup is in place (apply.ts names the tools).
 * - `handoff`: a brief for the team, marked done by hand.
 */

export interface PlanInput {
  customer: { id: string; business_name: string; website: string | null; instagram: string | null; city: string | null };
  /** The run the plan comes from, and its outputs laid over its sources'. */
  audit: { id: string; phase: string; completed_at: string | null } | null;
  outputs: Record<string, unknown>;
  /** A delivered competitor-plan run the measurement builds phase 3 on when an account is linked; null falls back to a public re-read. */
  measureSource: string | null;
  enabled: HeadwayService[];
  checklist: ChecklistItem[];
  now?: Date;
}

export interface PlanResult {
  summary: string;
  drafts: ActionDraft[];
}

type O = Record<string, unknown>;
const obj = (x: unknown): O => (x && typeof x === 'object' ? (x as O) : {});
const str = (x: unknown) => (typeof x === 'string' && x.trim() ? x.trim() : null);
const DAY_INDEX: Record<string, number> = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
/** Posts go out mid-morning on the US East Coast. */
const POST_HOUR_UTC = 15;
export const MEASURE_AFTER_DAYS = 30;

/** The next date (after today) that falls on `day`, at POST_HOUR_UTC. */
export function nextDay(day: string, now: Date): string {
  const target = DAY_INDEX[day] ?? 1;
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), POST_HOUR_UTC, 0, 0));
  let ahead = (target - d.getUTCDay() + 7) % 7;
  if (ahead === 0) ahead = 7;
  d.setUTCDate(d.getUTCDate() + ahead);
  return d.toISOString();
}

const captionWithTags = (post: SocialPost) => [post.caption, post.hashtags.length ? post.hashtags.map((h) => `#${h}`).join(' ') : ''].filter(Boolean).join('\n\n');

/** The five-digit ZIP in a US address, when the Google listing has one. */
export const zipOf = (address: string | null | undefined) => address?.match(/\b(\d{5})(?:-\d{4})?\b(?![^,]*,)/)?.[1] ?? address?.match(/\b(\d{5})\b/)?.[1] ?? null;

const usd = (x: number) => `$${Math.round(x).toLocaleString('en-US')}`;

export function planActions(input: PlanInput): PlanResult {
  const now = input.now ?? new Date();
  const { outputs, enabled, checklist } = input;
  const blocked = (keys: string[]) => missingAmong(checklist, keys);
  const drafts: ActionDraft[] = [];
  const on = (s: HeadwayService) => enabled.includes(s);

  const site = obj(outputs.site).business as SiteScan | null | undefined;
  const maps = obj(obj(outputs.maps).business);
  const facebookPageId = str(obj(obj(outputs.social).facebook).page_id);
  const zip = zipOf(str(maps.address));
  const images: CreativeImage[] = isCreativeOutput(outputs.creative) ? outputs.creative.images.filter((i) => i.path) : [];
  // Instagram takes JPEG only; Meta's creatives take JPEG or PNG.
  const jpegs = images.filter((i) => i.content_type === 'image/jpeg');
  const plans = isPlansOutput(outputs.plans) ? outputs.plans : null;
  const made = isPostsOutput(outputs.posts) ? outputs.posts.posts : [];
  const adsets = isAdsetsOutput(outputs.adsets) ? outputs.adsets : null;

  // Social media: the week's posts. Instagram image posts go out through the
  // linked account; every other platform or format is a brief.
  if (on('social-media') && plans) {
    plans.social_plan.week.forEach((post, i) => {
      const when = nextDay(post.day, now);
      // The posts step's image for this post (printed at the feed's 4:5) first, else the business's own photos in turn.
      const ready = made[i] && made[i].day === post.day && made[i].topic === post.topic && made[i].image?.size === 'feed' ? made[i].image : null;
      const image = ready ? { path: ready.path, name: ready.origin === 'ai_generated' ? `${ready.name}, an AI-generated image` : ready.name } : jpegs.length ? jpegs[i % jpegs.length] : null;
      const text = captionWithTags(post);
      const detail = [`${post.day} · ${PLATFORM_LABELS[post.platform]} ${post.format}`, `Topic: ${post.topic}`, `Hook: ${post.hook}`, '', text, '', `Call to action: ${post.cta}`, `Visual: ${post.visual}${image ? ` (using ${image.name})` : ''}`].join('\n');
      const instagramImage = post.platform === 'instagram' && (post.format === 'post' || post.format === 'carousel') && image;
      if (instagramImage) {
        drafts.push({
          service: 'social-media',
          kind: 'automatic',
          tool: 'instagram.publish',
          title: `Publish ${post.day}’s Instagram post: ${post.topic}`,
          detail,
          payload: { day: post.day, caption: text, image_path: image.path, image_name: image.name, alt_text: post.visual.slice(0, 900), ...(ready?.origin === 'ai_generated' ? { ai_generated: true } : {}) },
          blocked_by: blocked(['link:instagram']),
          scheduled_for: when,
        });
      } else {
        drafts.push({
          service: 'social-media',
          kind: 'handoff',
          tool: null,
          title: `Post ${post.day}’s ${PLATFORM_LABELS[post.platform]} ${post.format}: ${post.topic}`,
          detail: image || post.platform !== 'instagram' ? detail : `${detail}\n\nNo usable image was gathered for the business, so the team takes the shot and posts it.`,
          payload: { day: post.day, platform: post.platform, format: post.format },
          blocked_by: post.platform === 'instagram' ? blocked(['link:instagram']) : [],
          scheduled_for: when,
        });
      }
    });
  }

  // Smart advertising: the Google search campaign and each Meta set, built
  // paused; switching each on is a second action that waits on the first.
  if (on('marketing') && adsets) {
    const google: GoogleCampaign | null = adsets.sets.google;
    if (google && google.ad_groups.length) {
      const daily = google.ad_groups.reduce((sum, g) => sum + g.tiers.medium.daily, 0);
      const rows = google.ad_groups.map((g) => `• ${g.name} (${g.recommendation}): ${g.keywords.length} keywords, ${usd(g.tiers.medium.monthly)} a month at the medium budget, lands on ${g.final_url}`);
      const create = drafts.push({
        service: 'marketing',
        kind: 'automatic',
        tool: 'googleads.campaign',
        title: `Build the Google search campaign “${google.name}”, paused`,
        detail: [`${google.ad_groups.length} ad group${google.ad_groups.length === 1 ? '' : 's'}, ${google.negatives.length} negative keywords, ${google.bid_strategy}, ${google.networks} only, ${usd(daily)} a day (the medium budget).`, `Location: ${google.location}.`, ...rows, '', 'Everything is created paused; a second approval turns it on.'].join('\n'),
        payload: { campaign: google, tier: 'medium', daily_budget_usd: Math.round(daily * 100) / 100 },
        blocked_by: blocked(['link:googleads']),
        scheduled_for: null,
      }) - 1;
      drafts.push({
        service: 'marketing',
        kind: 'automatic',
        tool: 'googleads.enable',
        title: `Turn on the Google search campaign “${google.name}”`,
        detail: `Sets the campaign, its ad groups and ads to enabled, at ${usd(daily)} a day. Approve this only after the location targeting and the ads have been checked in Google Ads.`,
        payload: {},
        blocked_by: [],
        scheduled_for: null,
        depends_on_index: create,
      });
    }
    for (const set of adsets.sets.meta as MetaAdSet[]) {
      const withImages = set.ads.filter((a) => a.image?.path);
      const detail = [
        `${set.campaign} · ${set.name} (${set.recommendation}: ${set.why})`,
        `Objective ${set.objective}, optimised for ${set.optimization_goal}, ${usd(set.tiers.medium.daily)} a day (the medium budget: ${usd(set.tiers.medium.monthly)} a month).`,
        `Audience: ${set.audience.location}, ${set.audience.radius_miles} miles, ages ${set.audience.age_min}–${set.audience.age_max}${set.audience.interests.length ? `, interests ${set.audience.interests.join(', ')}` : ''}.`,
        `${set.ads.length} ad${set.ads.length === 1 ? '' : 's'}${withImages.length < set.ads.length ? ` (${set.ads.length - withImages.length} without an image, left out)` : ''}:`,
        ...withImages.map((a) => `• ${a.name}: “${a.headline}” — ${a.primary_text} [${a.call_to_action}] → ${a.link}`),
        set.stop_loss ? `Stop-loss: ${set.stop_loss}` : '',
        '',
        'Created paused; a second approval turns it on.',
      ].filter((line) => line !== '').join('\n');
      if (!withImages.length) {
        drafts.push({ service: 'marketing', kind: 'handoff', tool: null, title: `Build the Meta set “${set.name}” by hand (no ad image gathered)`, detail, payload: { set_id: set.id }, blocked_by: [], scheduled_for: null });
        continue;
      }
      const create = drafts.push({
        service: 'marketing',
        kind: 'automatic',
        tool: 'metaads.adset',
        title: `Build the Meta set “${set.name}”, paused`,
        detail,
        payload: { set: { ...set, ads: withImages }, tier: 'medium', page_id: facebookPageId, zip },
        blocked_by: blocked(['link:metaads', ...(facebookPageId ? [] : ['facebook_page_id']), ...(zip ? [] : ['business_zip'])]),
        scheduled_for: null,
      }) - 1;
      drafts.push({
        service: 'marketing',
        kind: 'automatic',
        tool: 'metaads.enable',
        title: `Turn on the Meta set “${set.name}”`,
        detail: `Sets the campaign, the ad set and its ads to active, at ${usd(set.tiers.medium.daily)} a day. Approve this only after the targeting and the ads have been checked in Ads Manager.`,
        payload: {},
        blocked_by: [],
        scheduled_for: null,
        depends_on_index: create,
      });
    }
  }

  // Website design: the plan's changes and new pages for the team, and the
  // sitemap submitted once they are live.
  if (on('website-design') && plans) {
    for (const change of plans.website_plan.changes) {
      drafts.push({
        service: 'website-design',
        kind: 'handoff',
        tool: null,
        title: `${change.priority === 'high' ? 'High' : change.priority === 'medium' ? 'Medium' : 'Low'} · ${change.page}: ${change.change.slice(0, 90)}`,
        detail: [`Page: ${change.page}`, `Change: ${change.change}`, `Why: ${change.reason}`, `Evidence: ${change.evidence}`].join('\n'),
        payload: { page: change.page, priority: change.priority },
        blocked_by: blocked(['website_access']),
        scheduled_for: null,
      });
    }
    for (const page of plans.website_plan.new_pages) {
      drafts.push({
        service: 'website-design',
        kind: 'handoff',
        tool: null,
        title: `New page ${page.path}`,
        detail: [`Purpose: ${page.purpose}`, page.searches.length ? `For the searches: ${page.searches.join(', ')}` : ''].filter(Boolean).join('\n'),
        payload: { path: page.path },
        blocked_by: blocked(['website_access']),
        scheduled_for: null,
      });
    }
    const origin = (() => {
      try {
        return new URL(site?.final_url ?? site?.url ?? input.customer.website ?? '').origin;
      } catch {
        return null;
      }
    })();
    if (origin && (plans.website_plan.changes.length || plans.website_plan.new_pages.length)) {
      drafts.push({
        service: 'website-design',
        kind: 'automatic',
        tool: 'search_console.sitemap',
        title: `Submit ${origin}/sitemap.xml to Search Console`,
        detail: 'Once the page changes are live, the sitemap is submitted (or resubmitted) to the site’s Search Console property so Google re-reads the pages. Headway checks the sitemap answers before submitting it.',
        payload: { origin, sitemap: `${origin}/sitemap.xml` },
        blocked_by: blocked(['link:google_search_console']),
        scheduled_for: null,
      });
    }
  }

  // Integrations and data: what the site scan says is missing.
  if (on('integration') && site) {
    const t = site.tracking;
    const gaps: { title: string; detail: string }[] = [];
    if (!t.google_analytics.length && !t.google_tag_manager.length) gaps.push({ title: 'Install Google Analytics 4 on the website', detail: 'The site scan found no Google Analytics or Tag Manager tag. Install GA4 (through Tag Manager where possible) and set the key events: inquiries, bookings, calls and purchases.' });
    if (!t.meta_pixel) gaps.push({ title: 'Install the Meta pixel on the website', detail: 'The site scan found no Meta pixel, so the Meta lead campaigns cannot optimise for leads. Install the pixel and its Lead event on the inquiry and booking confirmations.' });
    if (!t.google_ads.length) gaps.push({ title: 'Add the Google Ads conversion tag', detail: 'The site scan found no Google Ads tag. Add the conversion tag (through Tag Manager where possible) so the search campaign can count inquiries and bookings.' });
    if (!site.booking.length) gaps.push({ title: 'Connect a booking or inquiry path to the CRM', detail: 'The site scan found no booking path. Put one in place (a booking tool, or the inquiry form routed to the CRM) so every lead is captured and traced.' });
    for (const gap of gaps) drafts.push({ service: 'integration', kind: 'handoff', tool: null, title: gap.title, detail: gap.detail, payload: {}, blocked_by: blocked(['website_access']), scheduled_for: null });
  }

  // Brand development: the benchmark's differences, as a brief.
  if (on('brand-development') && isBenchmarkOutput(outputs.benchmark)) {
    const w = outputs.benchmark.writeup;
    for (const d of w.differences.slice(0, 5)) {
      drafts.push({
        service: 'brand-development',
        kind: 'handoff',
        tool: null,
        title: `${d.title}`,
        detail: [`Lever: ${d.lever}`, `Now: ${d.now}`, `The competitor: ${d.competitor}`, `Change: ${d.change}`, `Target: ${d.target}`, w.do_not_copy.length ? `Never copy: ${w.do_not_copy.join('; ')}` : ''].filter(Boolean).join('\n'),
        payload: { rank: d.rank },
        blocked_by: [],
        scheduled_for: null,
      });
    }
  }

  // Analytics and oversight: the plan measured a month on (the linked
  // accounts when there are any, the public data again when not), and the
  // monthly report.
  if (on('digital-oversight')) {
    const when = new Date(now.getTime() + MEASURE_AFTER_DAYS * 24 * 60 * 60_000).toISOString();
    if (input.audit) {
      drafts.push({
        service: 'digital-oversight',
        kind: 'automatic',
        tool: 'groundswell.measure',
        title: `Measure the plan’s results in ${MEASURE_AFTER_DAYS} days`,
        detail: input.measureSource
          ? 'With an account linked (Google Analytics, Search Console, Google Ads or Meta Ads), queues the integrated plan, so the next report compares what the plan expected with what the accounts show. With none linked, Groundswell reads the public data again (rankings, the listing, estimated traffic) and compares that instead.'
          : 'Groundswell reads the public data again (rankings, the listing, estimated traffic), so the next report compares the plan with what changed. Linking an account before then gives the report the business’s own figures as well.',
        payload: { source_audit_id: input.measureSource },
        blocked_by: [],
        scheduled_for: when,
      });
    }
    const next = (obj(obj(outputs.model).writeup).next_steps as unknown[] | undefined) ?? [];
    drafts.push({
      service: 'digital-oversight',
      kind: 'handoff',
      tool: null,
      title: 'The monthly report against revenue',
      detail: ['One report: what moved, what did not, and what changes next, with every channel answering for the inquiries and sales it produced.', ...next.filter((s): s is string => typeof s === 'string').slice(0, 5).map((s) => `• ${s}`)].join('\n'),
      payload: {},
      blocked_by: [],
      scheduled_for: when,
    });
  }

  const automatic = drafts.filter((d) => d.kind === 'automatic').length;
  const services = [...new Set(drafts.map((d) => d.service))].map((s) => HEADWAY_SERVICE_INFO[s].label);
  const from = input.audit ? ` from the ${input.audit.phase === 'audit' ? 'growth audit' : input.audit.phase === 'competitors' ? 'competitor plan' : 'integrated plan'} delivered ${input.audit.completed_at ? new Date(input.audit.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'earlier'}` : '';
  const summary = drafts.length
    ? `${drafts.length} action${drafts.length === 1 ? '' : 's'}${from}: ${automatic} through the linked accounts, ${drafts.length - automatic} for the team. ${services.join(', ')}.`
    : enabled.length
      ? `Nothing to do yet${from}: the run has no plan, ad sets or findings for the services switched on.`
      : 'No services are switched on for this customer yet.';
  return { summary, drafts };
}
