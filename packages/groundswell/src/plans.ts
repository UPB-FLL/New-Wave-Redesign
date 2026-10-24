/**
 * The website optimization plan and the social media plan (a first week of
 * posts), held to the data in code. The writer (an OpenAI call in the app)
 * answers JSON; `checkPlans` keeps only what the rules allow:
 * - a website change names a page that was read (or "site-wide");
 * - a sentence quoting a number that is not in the data is dropped, and an
 *   item left without its change or caption goes with it;
 * - a caption never makes an unsupported claim ("best", "#1", …) and never
 *   names a competitor;
 * - the week is Monday to Sunday, one post a day; a missing day is named,
 *   never invented here.
 */

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export type Day = (typeof DAYS)[number];
export const PLATFORMS = ['instagram', 'facebook', 'tiktok', 'linkedin', 'google_business', 'youtube'] as const;
export type Platform = (typeof PLATFORMS)[number];
export const FORMATS = ['post', 'reel', 'carousel', 'story', 'text', 'video'] as const;
export type Format = (typeof FORMATS)[number];
export const PLATFORM_LABELS: Record<Platform, string> = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', linkedin: 'LinkedIn', google_business: 'Google Business Profile', youtube: 'YouTube' };
export const PRIORITIES = ['high', 'medium', 'low'] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface WebsiteChange {
  /** The page's URL or path as read, or "site-wide". */
  page: string;
  priority: Priority;
  change: string;
  reason: string;
  /** What was observed on the page or in the data. */
  evidence: string;
}
export interface NewPage {
  path: string;
  purpose: string;
  /** The searches the page is for (from the keyword data). */
  searches: string[];
}
export interface WebsitePlan {
  summary: string;
  changes: WebsiteChange[];
  new_pages: NewPage[];
  measurement: string[];
}
export interface SocialPost {
  day: Day;
  platform: Platform;
  format: Format;
  pillar: string;
  topic: string;
  /** The first line, the reason to stop scrolling. */
  hook: string;
  /** Ready to paste. */
  caption: string;
  cta: string;
  /** Which of the business's own images to use, or the shot to take. */
  visual: string;
  hashtags: string[];
}
export interface SocialPlan {
  summary: string;
  platforms: { platform: Platform; role: string; cadence: string }[];
  pillars: { name: string; why: string }[];
  week: SocialPost[];
}
export interface PlansResult {
  website_plan: WebsitePlan;
  social_plan: SocialPlan;
  /** What the rules removed, in words. */
  dropped: string[];
}

export interface PlanRules {
  /** Numbers in `text` that the data does not carry. */
  unsupported: (text: string) => string[];
  /** Claims a caption may never make. */
  claims: readonly string[];
  /** Competitor names a caption may never carry. */
  competitors: readonly string[];
  /** The pages that were read (URLs and paths); a change must name one of them or "site-wide". */
  pages: readonly string[];
  maxChanges?: number;
}

export const LIMITS = { caption: 2_200, hook: 150, cta: 120, visual: 240, topic: 120, hashtags: 10, hashtag: 30, changes: 12, new_pages: 4, measurement: 5, platforms: 4, pillars: 5 };

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const list = (v: unknown, n: number, max: number): string[] => (Array.isArray(v) ? v.map((x) => str(x, max)).filter(Boolean).slice(0, n) : []);
const SENTENCE = /(?:[^.!?]|[.!?](?=\d))+(?:[.!?]+|$)/g;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Removes the sentences of `text` that quote a number the data lacks; returns the rest and what went. */
export function scrubNumbers(text: string, unsupported: PlanRules['unsupported']): { text: string; removed: string[] } {
  const removed: string[] = [];
  const kept = (text.match(SENTENCE) ?? [text]).filter((s) => {
    if (!unsupported(s).length) return true;
    removed.push(s.trim());
    return false;
  });
  return { text: kept.join('').replace(/\s+/g, ' ').trim(), removed };
}

/** The unsupported claims and competitor names a text carries, whole words, any case. */
export function forbiddenIn(text: string, claims: readonly string[], competitors: readonly string[]): string[] {
  const hit = (c: string) => new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(c)}($|[^\\p{L}\\p{N}])`, 'iu').test(text);
  return [...claims.filter(hit), ...competitors.filter((c) => c.trim().length >= 3 && hit(c.trim()))];
}

const normalizePath = (u: string): string => {
  try {
    const url = new URL(u, 'https://x.invalid');
    return (url.pathname.replace(/\/+$/, '') || '/').toLowerCase();
  } catch { return u.toLowerCase(); }
};

/** The page a change names, as one of the pages read, "site-wide", or null. */
export function matchPage(named: string, pages: readonly string[]): string | null {
  const n = named.trim();
  if (!n) return null;
  if (/^site[- ]?wide$/i.test(n) || /^(?:all|every) pages?$/i.test(n)) return 'site-wide';
  const wanted = normalizePath(n);
  for (const p of pages) {
    if (p.toLowerCase() === n.toLowerCase() || normalizePath(p) === wanted) return p;
  }
  if (/^(?:home|homepage|home page)$/i.test(n)) return pages.find((p) => normalizePath(p) === '/') ?? null;
  return null;
}

const hashtag = (v: unknown): string | null => {
  const t = str(v, 60).replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, '').toLowerCase();
  return t.length >= 2 && t.length <= LIMITS.hashtag ? t : null;
};

function dayOf(v: unknown): Day | null {
  const t = str(v, 20).toLowerCase();
  return DAYS.find((d) => d.toLowerCase() === t || d.toLowerCase().startsWith(t.slice(0, 3)) && t.length >= 3) ?? null;
}
const platformOf = (v: unknown): Platform | null => {
  const t = str(v, 40).toLowerCase().replace(/[\s-]+/g, '_');
  if ((PLATFORMS as readonly string[]).includes(t)) return t as Platform;
  if (/google/.test(t)) return 'google_business';
  return null;
};
const formatOf = (v: unknown): Format => {
  const t = str(v, 40).toLowerCase();
  if ((FORMATS as readonly string[]).includes(t)) return t as Format;
  if (/reel|short/.test(t)) return 'reel';
  if (/carousel|slides?/.test(t)) return 'carousel';
  if (/stor/.test(t)) return 'story';
  if (/video/.test(t)) return 'video';
  return 'post';
};

/** The writer's answer, held to the rules. Never throws on a malformed answer: what fails is dropped and named. */
export function checkPlans(raw: unknown, rules: PlanRules): PlansResult {
  const r = (raw ?? {}) as Record<string, unknown>;
  const dropped: string[] = [];
  const scrub = (text: string, what: string) => {
    const s = scrubNumbers(text, rules.unsupported);
    for (const gone of s.removed) dropped.push(`${what}: dropped "${gone.slice(0, 120)}" (a number not in the data).`);
    return s.text;
  };

  // The website plan.
  const w = (r.website_plan ?? {}) as Record<string, unknown>;
  const changes: WebsiteChange[] = [];
  for (const item of Array.isArray(w.changes) ? w.changes : []) {
    const c = (item ?? {}) as Record<string, unknown>;
    const named = str(c.page, 300);
    const page = matchPage(named, rules.pages);
    const change = scrub(str(c.change, 600), `Website change for ${named || 'an unnamed page'}`);
    if (!page) { dropped.push(`Website change "${str(c.change, 80) || 'untitled'}" named a page that was not read (${named || 'none'}).`); continue; }
    if (!change) { dropped.push(`Website change for ${page} had nothing left after the number check.`); continue; }
    const priority = (PRIORITIES as readonly string[]).includes(str(c.priority, 10).toLowerCase()) ? (str(c.priority, 10).toLowerCase() as Priority) : 'medium';
    changes.push({ page, priority, change, reason: scrub(str(c.reason, 500), `Reason for the change on ${page}`), evidence: scrub(str(c.evidence, 500), `Evidence for the change on ${page}`) });
    if (changes.length >= (rules.maxChanges ?? LIMITS.changes)) break;
  }
  const order: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
  changes.sort((a, b) => order[a.priority] - order[b.priority]);
  const new_pages: NewPage[] = [];
  for (const item of Array.isArray(w.new_pages) ? w.new_pages : []) {
    const p = (item ?? {}) as Record<string, unknown>;
    const path = str(p.path, 120);
    if (!/^\/[a-z0-9\-/_.]*$/i.test(path)) { dropped.push(`New page "${path || 'unnamed'}" has no usable path.`); continue; }
    const purpose = scrub(str(p.purpose, 400), `Purpose of the new page ${path}`);
    if (!purpose) continue;
    new_pages.push({ path, purpose, searches: list(p.searches, 6, 80) });
    if (new_pages.length >= LIMITS.new_pages) break;
  }
  const website_plan: WebsitePlan = {
    summary: scrub(str(w.summary, 900), 'Website plan summary'),
    changes,
    new_pages,
    measurement: list(w.measurement, LIMITS.measurement, 300).map((m) => scrub(m, 'Website measurement')).filter(Boolean),
  };

  // The social plan.
  const s = (r.social_plan ?? {}) as Record<string, unknown>;
  const platforms: SocialPlan['platforms'] = [];
  for (const item of Array.isArray(s.platforms) ? s.platforms : []) {
    const p = (item ?? {}) as Record<string, unknown>;
    const platform = platformOf(p.platform);
    if (!platform || platforms.some((x) => x.platform === platform)) continue;
    platforms.push({ platform, role: scrub(str(p.role, 240), `${PLATFORM_LABELS[platform]} role`), cadence: scrub(str(p.cadence, 120), `${PLATFORM_LABELS[platform]} cadence`) });
    if (platforms.length >= LIMITS.platforms) break;
  }
  const pillars = (Array.isArray(s.pillars) ? s.pillars : []).map((item) => {
    const p = (item ?? {}) as Record<string, unknown>;
    return { name: str(p.name, 80), why: scrub(str(p.why, 300), `Pillar ${str(p.name, 80)}`) };
  }).filter((p) => p.name).slice(0, LIMITS.pillars);
  const byDay = new Map<Day, SocialPost>();
  for (const item of Array.isArray(s.week) ? s.week : []) {
    const p = (item ?? {}) as Record<string, unknown>;
    const day = dayOf(p.day);
    if (!day) { dropped.push(`A post had no weekday (${str(p.day, 20) || 'blank'}).`); continue; }
    if (byDay.has(day)) { dropped.push(`A second post for ${day} was left out (one a day).`); continue; }
    const platform = platformOf(p.platform);
    if (!platform) { dropped.push(`${day}: the platform "${str(p.platform, 30)}" is not one the plan supports.`); continue; }
    const caption = scrub(str(p.caption, LIMITS.caption), `${day} caption`);
    if (!caption) { dropped.push(`${day}: the caption had nothing left after the number check.`); continue; }
    const forbidden = forbiddenIn(`${caption} ${str(p.hook, LIMITS.hook)} ${str(p.cta, LIMITS.cta)}`, rules.claims, rules.competitors);
    if (forbidden.length) { dropped.push(`${day}: the post was left out for "${forbidden[0]}" (an unsupported claim or a competitor's name).`); continue; }
    const hashtags = [...new Set((Array.isArray(p.hashtags) ? p.hashtags : []).map(hashtag).filter((h): h is string => Boolean(h)))].slice(0, LIMITS.hashtags);
    byDay.set(day, {
      day,
      platform,
      format: formatOf(p.format),
      pillar: str(p.pillar, 80),
      topic: str(p.topic, LIMITS.topic),
      hook: scrub(str(p.hook, LIMITS.hook), `${day} hook`),
      caption,
      cta: scrub(str(p.cta, LIMITS.cta), `${day} call to action`),
      visual: scrub(str(p.visual, LIMITS.visual), `${day} visual`),
      hashtags,
    });
  }
  const week = DAYS.filter((d) => byDay.has(d)).map((d) => byDay.get(d)!);
  const missing = DAYS.filter((d) => !byDay.has(d));
  if (missing.length && week.length) dropped.push(`No post for ${missing.join(', ')}.`);
  const social_plan: SocialPlan = { summary: scrub(str(s.summary, 900), 'Social plan summary'), platforms, pillars, week };
  return { website_plan, social_plan, dropped };
}

/** True when there is something to show: at least one website change, new page, or post. */
export const hasPlans = (p: PlansResult | null | undefined): boolean => Boolean(p && (p.website_plan.changes.length || p.website_plan.new_pages.length || p.social_plan.week.length));
