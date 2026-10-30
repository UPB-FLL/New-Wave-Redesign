import { GROUNDSWELL_CONFIG } from '../../../packages/groundswell/groundswell.config.js';
import type { AdPlan, AngleInput, AngleKeyword, AngleValue, RivalAds } from '../../../packages/groundswell/src/adplan.js';
import { bestPosition, incrementalityFor, planAudit, type SortedFix } from '../../../packages/groundswell/src/audit.js';
import { CHANGE_AREAS, type Baseline, type ChangeArea, type Comparison, type RankedChange } from '../../../packages/groundswell/src/changes.js';
import type { GroundswellConfig, IndustryProfile } from '../../../packages/groundswell/src/config.js';
import { claimsIn } from '../../../packages/groundswell/src/templates.js';
import { AREAS, allowedNumbers, buildFacts, scrubText, type AreaKey, type Facts, type runModel } from './model.js';
import { contentWords } from './businessProfile.js';
import { chatJson, GROUNDSWELL_MODEL } from './openai.js';
import { PermanentStepError, type StepContext } from './types.js';

/**
 * Ad-plan step: the ad plan and every change ranked by return
 * (packages/groundswell), from the Currents' data and the write-up.
 *
 * One planner call (OpenAI) does the judgment the package leaves to its
 * engine: it picks the industry profile, groups the Keyword Planner searches
 * into at most four angles the business can win, and sorts the write-up's
 * fixes into the setup file's effort types. Code holds it to the data:
 * - the industry must be one of the setup file's profiles, else `general`;
 * - an angle keeps only keywords copied exactly from Keyword Planner, each in
 *   one angle; an angle with none left is dropped, and if none survive the
 *   largest searches become one angle;
 * - angle names may not claim "best" and the like; reasons and titles lose any
 *   sentence with a number that is not in the data;
 * - a fix keeps only an effort type the setup file has.
 * Each angle's value per customer is the write-up's labelled estimate, and its
 * incrementality comes from where Ahrefs shows the website ranking.
 *
 * The step is optional: when it cannot run (no keyword demand, no answer),
 * the reports fall back to the write-up step's single search-ad model.
 */

export const ANGLE_LIMIT = 4;

type ModelOut = Awaited<ReturnType<typeof runModel>>;

export interface AdplanOutput {
  model: string;
  generated_at: string;
  industry: { id: string; label: string };
  angles: AngleInput[];
  /** True when the planner's angles were all dropped and the largest searches stood in. */
  fallback_angle: boolean;
  plan: AdPlan;
  ranked: RankedChange[];
  comparison: Comparison;
  baseline: Baseline;
  /** The write-up's fixes as the planner sorted them, so a verification pass can re-run the ranking; missing on audits before 2026-10-21. */
  fixes?: SortedFix[];
  /** What the checks removed from the planner's answer. */
  dropped: { keywords: string[]; angles: string[]; fixes: string[] };
}

/** True for a usable ad-plan step output (an audit started before the step existed has none). */
export function isAdplanOutput(x: unknown): x is AdplanOutput {
  const o = x as Partial<AdplanOutput> | null | undefined;
  return Boolean(o && Array.isArray(o.ranked) && o.plan && Array.isArray(o.plan.rows) && o.comparison && o.industry);
}

interface Finding {
  id: string;
  area: AreaKey;
  text: string;
}

/** The write-up's fixes, each with an id the planner answers by. */
export function findingsFrom(m: ModelOut): Finding[] {
  return AREAS.flatMap((area) => m.writeup.areas[area].fixes.map((text, i) => ({ id: `${area}-${i + 1}`, area, text })));
}

/** Where a fix lands when the planner names no valid area. */
const AREA_OF: Record<AreaKey, ChangeArea> = {
  google: 'google',
  social: 'social',
  website: 'website',
  ads: 'ads',
  competitors: 'website',
  keywords: 'seo',
};

const KEYWORD_LIMIT = 50;

export function plannerInput(f: Facts, m: ModelOut, config: GroundswellConfig) {
  return {
    business: {
      name: f.business.name,
      city: f.business.city,
      category: m.estimates.category,
      google_category: f.maps?.business?.category ?? null,
      notes: f.business.notes,
    },
    keyword_ideas: (f.keywords?.ideas ?? [])
      .filter((k) => (k.monthly_searches ?? 0) > 0)
      .slice(0, KEYWORD_LIMIT)
      .map((k) => ({ keyword: k.keyword, monthly_searches: k.monthly_searches, competition: k.competition })),
    website_ranks_for: (f.search?.business?.top_keywords ?? []).map((k) => ({ keyword: k.keyword, position: k.position, monthly_searches: k.volume })),
    industries: config.industries.map((i) => ({ id: i.id, label: i.label, hints: i.match })),
    findings: findingsFrom(m),
    effort_types: Object.entries(config.effort).map(([id, e]) => ({ id, what: e.basis })),
    change_areas: CHANGE_AREAS,
  };
}

export const PLANNER_SYSTEM = `You plan advertising for a small business for New Wave: Social Engineering's Groundswell engine.
You receive JSON gathered from public data. Return JSON only:
{"industry": one id from industries,
 "angles": up to ${ANGLE_LIMIT} of {"name": 1-4 words naming what people search for (a service, product, occasion or need), "why": one sentence on why this business can win these searches, "keywords": strings copied exactly from keyword_ideas},
 "fixes": one per finding: {"id": the finding's id, "effort": one id from effort_types, or null when none fits, "area": one of change_areas, "title": the change in at most 10 words}}
Rules:
- An angle is a reason to choose this business that people actually search for. Prefer specific searches it can win (an event space, a menu item, a service it offers) over broad category searches that bigger rivals own.
- Copy keywords exactly. Put each keyword in at most one angle. Leave out searches the business does not serve (other brands, jobs, do-it-yourself, other cities).
- No superlatives in names (best, top, number one).
- Use only facts in the data. Do not write numbers that are not in the data.
- Pick the industry whose label and hints fit the business; use "general" when none fits.`;

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '');
const capital = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** The website's best organic position for each keyword Ahrefs lists, keyed in lower case. */
export function positionsFrom(f: Facts): Record<string, number> {
  const positions: Record<string, number> = {};
  for (const k of f.search?.business?.top_keywords ?? []) {
    if (k.position === null || k.position < 1) continue;
    const key = k.keyword.toLowerCase();
    positions[key] = Math.min(positions[key] ?? Infinity, k.position);
  }
  return positions;
}

export interface PlannerResult {
  industry: IndustryProfile;
  angles: AngleInput[];
  fixes: SortedFix[];
  fallback_angle: boolean;
  dropped: AdplanOutput['dropped'];
}

/** Holds the planner's answer to the data and the setup file (see the header). */
export function checkPlan(raw: unknown, f: Facts, m: ModelOut, config: GroundswellConfig): PlannerResult {
  const r = (raw ?? {}) as Record<string, unknown>;
  const dropped: AdplanOutput['dropped'] = { keywords: [], angles: [], fixes: [] };
  const general = config.industries.find((i) => i.id === 'general')!;
  const industry = config.industries.find((i) => i.id === r.industry) ?? general;

  const ideas = new Map(
    (f.keywords?.ideas ?? [])
      .filter((k) => (k.monthly_searches ?? 0) > 0)
      .map((k): [string, AngleKeyword] => [
        k.keyword.toLowerCase(),
        { keyword: k.keyword, monthly_searches: k.monthly_searches ?? 0, low_bid_usd: k.low_bid_usd, high_bid_usd: k.high_bid_usd },
      ])
  );
  if (!ideas.size) throw new PermanentStepError('Keyword Planner returned no search volumes for the area, so no ad plan was built.');

  const value: AngleValue = {
    per_customer: m.estimates.ticket,
    close: m.estimates.close,
    gross_margin: [m.estimates.gross_margin, m.estimates.gross_margin, m.estimates.gross_margin],
    basis: m.estimates.basis,
  };
  const positions = positionsFrom(f);
  const allowed = allowedNumbers(plannerInput(f, m, config));
  const clean = (text: string) => scrubText(text, allowed).text;

  const used = new Set<string>();
  const ids = new Set<string>();
  const angleOf = (name: string, why: string, keywords: AngleKeyword[]): AngleInput => {
    const demand = keywords.reduce((a, k) => a + k.monthly_searches, 0);
    allowed.add(String(demand));
    let id = slug(name) || `angle-${ids.size + 1}`;
    while (ids.has(id)) id = `${id}-${ids.size + 1}`;
    ids.add(id);
    const angle: AngleInput = {
      id,
      name,
      why: clean(why) || `People in the area search for “${keywords[0].keyword}” and related terms.`,
      keywords,
      value,
      incrementality: 0,
      incrementality_basis: '',
    };
    const inc = incrementalityFor(bestPosition(angle, positions), config);
    return { ...angle, incrementality: inc.value, incrementality_basis: inc.basis };
  };

  const angles: AngleInput[] = [];
  for (const a of (Array.isArray(r.angles) ? r.angles : []) as Record<string, unknown>[]) {
    if (angles.length >= ANGLE_LIMIT) break;
    const keywords: AngleKeyword[] = [];
    for (const k of Array.isArray(a?.keywords) ? a.keywords : []) {
      // The planner is asked for strings; one that copies the idea object back ({ keyword, monthly_searches }) is read too.
      const text = typeof k === 'string' ? k : k && typeof k === 'object' ? String((k as { keyword?: unknown; text?: unknown }).keyword ?? (k as { text?: unknown }).text ?? '') : '';
      const idea = text ? ideas.get(text.trim().toLowerCase()) : undefined;
      if (!idea) {
        dropped.keywords.push(text || JSON.stringify(k).slice(0, 80));
        continue;
      }
      if (used.has(idea.keyword.toLowerCase())) continue;
      used.add(idea.keyword.toLowerCase());
      keywords.push(idea);
    }
    let name = str(a?.name, 40);
    if (!keywords.length) {
      dropped.angles.push(name || '(unnamed)');
      continue;
    }
    if (!name || claimsIn(name, config.unsupported_claims).length || !clean(name)) name = capital(keywords[0].keyword);
    angles.push(angleOf(name, str(a?.why, 300), keywords));
  }

  let fallback_angle = false;
  if (!angles.length) {
    fallback_angle = true;
    // The largest searches that share a word with what the business does (the category, the seeds Keyword Planner
    // was given); a seed word alone can bring another trade's searches ("aba" for a dog trainer's "behavior").
    const related = contentWords([m.estimates.category, f.profile?.category ?? '', ...(f.keywords?.seeds ?? [])].join(' '));
    const all = [...ideas.values()].sort((x, y) => y.monthly_searches - x.monthly_searches);
    const own = all.filter((k) => [...contentWords(k.keyword)].some((w) => related.has(w)));
    const core = (own.length ? own : all).slice(0, 10);
    angles.push(angleOf(capital(m.estimates.category), `The largest searches for ${m.estimates.category} in the area.`, core));
  }

  const findings = new Map(findingsFrom(m).map((x) => [x.id, x]));
  const fixes: SortedFix[] = [];
  const seen = new Set<string>();
  for (const x of (Array.isArray(r.fixes) ? r.fixes : []) as Record<string, unknown>[]) {
    const finding = typeof x?.id === 'string' ? findings.get(x.id) : undefined;
    if (!finding || seen.has(finding.id)) continue;
    seen.add(finding.id);
    const effort = typeof x.effort === 'string' && config.effort[x.effort] ? x.effort : null;
    if (!effort) {
      dropped.fixes.push(finding.text);
      continue;
    }
    const area = (CHANGE_AREAS as readonly string[]).includes(x.area as string) ? (x.area as ChangeArea) : AREA_OF[finding.area];
    fixes.push({ id: finding.id, area, effort, title: clean(str(x.title, 90)) || finding.text.slice(0, 90), evidence: finding.text });
  }
  return { industry, angles, fixes, fallback_angle, dropped };
}

/**
 * Competitors on record advertising, by platform: a Meta Ad Library Page with ads running (or any on record), an Ads
 * Transparency Center record with at least one Google ad, or Ahrefs paid search pages. Names only; spend is never public.
 */
export function rivalAdsFrom(f: Facts): RivalAds {
  const meta = new Set<string>();
  const google = new Set<string>();
  for (const r of f.ad_library?.competitors ?? []) {
    if (!r.name) continue;
    if (r.meta_ad_status === 'running' || r.meta_ads.length > 0) meta.add(r.name);
    if (r.google_ads_status === 'ads_found' && (r.google_ads_count ?? 0) > 0) google.add(r.name);
  }
  for (const r of f.ads?.competitors ?? []) if (r.name && r.paid_pages.length > 0) google.add(r.name);
  const out: RivalAds = {};
  if (meta.size) out.meta = [...meta];
  if (google.size) out.google_search = [...google];
  return out;
}

/** Today's advertising, from the Ads Current: what is visible, and that spend is not. */
export function baselineFrom(f: Facts): Baseline {
  const b = f.ads?.business;
  if (!b) return { monthly_ad_spend: null, ad_spend_basis: 'Ads could not be checked for this audit, and ad spend is not public.' };
  if (f.site?.business?.link_page || (!b.website_checked && !b.domain && /link-in-bio/.test(b.error ?? ''))) {
    return { monthly_ad_spend: null, ad_spend_basis: 'The address given is a link-in-bio page, not a website of its own, so there are no ad tags or paid search pages to read. Ad spend is not public.' };
  }
  const tags = [b.google_ads_tag && 'a Google Ads tag', b.meta_pixel && 'a Meta pixel', b.tiktok_pixel && 'a TikTok pixel'].filter(
    (t): t is string => Boolean(t)
  );
  const tagText = tags.length ? `The website carries ${tags.length > 1 ? `${tags.slice(0, -1).join(', ')} and ${tags[tags.length - 1]}` : tags[0]}` : 'No ad tags were found on the website';
  const paid = b.error ? '' : b.paid_pages.length ? `; Ahrefs shows ${b.paid_pages.length} page${b.paid_pages.length === 1 ? '' : 's'} with paid search ads` : '; Ahrefs shows no paid search pages';
  return { monthly_ad_spend: null, ad_spend_basis: `${tagText}${paid}. Ad spend is not public.` };
}

export async function runAdplan(ctx: StepContext): Promise<AdplanOutput> {
  const m = ctx.outputs.model as ModelOut | undefined;
  if (!m?.estimates || !m.writeup) throw new PermanentStepError('The write-up is missing, so no ad plan was built.');
  const f = buildFacts(ctx.audit, ctx.outputs);
  if (!(f.keywords?.ideas ?? []).some((k) => (k.monthly_searches ?? 0) > 0)) {
    throw new PermanentStepError('Keyword Planner returned no search volumes for the area, so no ad plan was built.');
  }
  const config = GROUNDSWELL_CONFIG;
  const timeout = Math.max(20_000, Math.min(120_000, ctx.deadline - Date.now() - 5_000));
  const raw = await chatJson<Record<string, unknown>>(PLANNER_SYSTEM, `Data (JSON):\n${JSON.stringify(plannerInput(f, m, config))}`, timeout);
  const planned = checkPlan(raw, f, m, config);
  const baseline = baselineFrom(f);
  const result = planAudit(
    { angles: planned.angles, industry: planned.industry, positions: positionsFrom(f), fixes: planned.fixes, baseline, rival_ads: rivalAdsFrom(f) },
    config
  );
  return {
    model: GROUNDSWELL_MODEL(),
    generated_at: new Date().toISOString(),
    industry: { id: planned.industry.id, label: planned.industry.label },
    angles: planned.angles,
    fallback_angle: planned.fallback_angle,
    baseline,
    fixes: planned.fixes,
    dropped: planned.dropped,
    ...result,
  };
}
