import { readFileSync } from 'node:fs';
import path from 'node:path';
import { escapeHtml as esc } from '../http.js';
import { logoBackground } from '../../../src/lib/groundswellBrandAssets.js';
import { GROUNDSWELL_CONFIG } from '../../../packages/groundswell/groundswell.config.js';
import type { PlanRow } from '../../../packages/groundswell/src/adplan.js';
import type { ChangeArea, RankedChange } from '../../../packages/groundswell/src/changes.js';
import type { AdcopyOutput } from './adcopy.js';
import type { AdplanOutput } from './adplan.js';
import type { AuditBranding } from './branding.js';
import type { BenchmarkOutput } from './benchmark.js';
import type { PlansOutput } from './plans.js';
import type { PresenceOutput } from './presence.js';
import { hasPlans, PLATFORM_LABELS, type SocialPost } from '../../../packages/groundswell/src/plans.js';
import type { Brand } from './brand.js';
import { gapsFromMissing } from './gaps.js';
import { AREAS, evidenceCoverage, scrubUnsupportedClaims, type AreaKey, type Facts, type ReportFinding, type runModel } from './model.js';
import type { GaData, GoogleAdsData, GscData, InstagramData, LinkedOutput, MetaAdsData } from './currents/linked.js';
import { ASSISTANT_LABELS } from './currents/aiSearch.js';
import { AI_CRAWLERS, CITABILITY_RUBRIC } from '../../../packages/groundswell/src/aiSearch.js';
import type { RoiScenarioResult } from './roi.js';

/**
 * HTML for Groundswell's three PDFs, in the client's colours and logo:
 * - the full audit (Letter pages, no links),
 * - the slides (1920×1080; eleven, or twelve with the ad plan; the last links the audit),
 * - the one-page summary (links the slides, the audit and the portal).
 *
 * With the ad-plan step's output, the return is the plan: every change ranked
 * by return, today against the plan, and the ad plan's rows. Without it (the
 * step was skipped, or the audit started before it existed), the return is the
 * write-up step's single search-ad model, as before.
 * Every link must point at the GroundSwell portal (`portalLink` throws otherwise);
 * a partner's white-label reports carry no links at all, so they never name New Wave's site.
 *
 * Elements marked data-trim may be removed, last first, until their
 * data-fit box stops overflowing (render.ts), so long text never spills.
 */

export type ModelOutput = Awaited<ReturnType<typeof runModel>>;

export interface ReportData {
  facts: Facts;
  model: ModelOutput;
  brand: Brand;
  /** The ad-plan step's output; null when it did not run. */
  adplan: AdplanOutput | null;
  /** The ad-copy step's output; absent or null when it did not run. */
  adcopy?: AdcopyOutput | null;
  /** The benchmark step's output, for a competitor benchmark; absent for an audit. */
  benchmark?: BenchmarkOutput | null;
  /** The plans step's output (the website optimization plan and the first week of posts); absent or null when it did not run. */
  plans?: PlansOutput | null;
  /** The plan for reviews, Reddit and AI answers (the presence step); absent or null when it did not run. */
  presence?: PresenceOutput | null;
  /** Who the reports are from; absent means New Wave. */
  preparer?: Preparer;
  /** Shown as "Prepared by <preparer> · <date>". */
  date: string;
  /** What this run could not read, in the words the audit's "Not available this time" carries (gaps.ts); absent on older callers. */
  gaps?: string[];
}

export const PREPARED_BY = 'New Wave: Social Engineering';

/** Who the reports are from. A partner's are white-labelled: its name and logo, and no New Wave name anywhere. */
export interface Preparer {
  name: string;
  logo: string | null;
  whiteLabel: boolean;
}

export const NEW_WAVE_PREPARER: Preparer = { name: PREPARED_BY, logo: null, whiteLabel: false };

export function preparerFor(branding: AuditBranding | null | undefined): Preparer {
  const p = branding?.partner;
  return p ? { name: p.name, logo: p.logo, whiteLabel: true } : NEW_WAVE_PREPARER;
}

export const preparedBy = (p: Preparer) => `Prepared by ${esc(p.name)}`;
/** The partner's logo beside "Prepared by" on a cover; New Wave's reports have none. */
export const preparerLogo = (p: Preparer) => (p.logo ? `<img class="preparer" src="${esc(p.logo)}" alt="${esc(p.name)}" style="background:${logoBackground(p.logo)}" onerror="this.remove()">` : '');

/** Lead-aware: "Our" at the start of a sentence or element, "our" inside one. */
const OURS = /(>\s*|[.!?]\s+)?(?:New Wave(?:: Social Engineering| IT)?|NW Social Engineering|Groundswell)(?:’s|'s|’|')?\s?(?=estimate|rule|working|internal|smallest|cost|hourly|own)/gi;
const ENGINE_NAMES = /New Wave: Social Engineering|NW Social Engineering|New Wave IT|New Wave|Groundswell|Croissance/gi;

/**
 * A partner's report in its own words: New Wave's rules and estimates become
 * "our" ("New Wave’s estimate" → "our estimate"), and any other mention of New
 * Wave, Groundswell or Croissance (from the setup file's notes or a model's
 * wording) becomes the partner's name. New Wave's own reports pass unchanged.
 */
export function ownWording(html: string, p: Preparer): string {
  if (!p.whiteLabel) return html.replace(/Groundswell(?:’s|'s)?\s+estimate/gi, 'Our estimate');
  const name = esc(p.name);
  return html.replace(OURS, (_m, lead: string | undefined) => (lead !== undefined ? `${lead}Our ` : 'our ')).replace(ENGINE_NAMES, () => name);
}

/** Where every report link goes: the GroundSwell portal, where a partner sees its own audits and an admin sees all. */
export const PORTAL_URL = 'https://www.newwaveitfl.com/groundswell';

export function portalLink(url: string): string {
  if (!(url === PORTAL_URL || url.startsWith(`${PORTAL_URL}/`))) throw new Error(`Reports may only link to the GroundSwell portal, not ${url}`);
  return url;
}

// ---------------------------------------------------------------------------
// Formatting

const NOT_CHECKED = 'not checked';

/** Money rounded to the nearest $10, the same figure on every report. */
export function money(x: number | null | undefined): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return '–';
  const r = Math.round(x / 10) * 10;
  return `${r < 0 ? '-' : ''}$${Math.abs(r).toLocaleString('en-US')}`;
}

export const num = (x: number | null | undefined, digits = 0) =>
  x === null || x === undefined || !Number.isFinite(x) ? NOT_CHECKED : x.toLocaleString('en-US', { maximumFractionDigits: digits });

const yesNo = (x: boolean | null | undefined) => (x === null || x === undefined ? NOT_CHECKED : x ? 'Yes' : 'No');

export function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/New_York' });
}

const AREA_TITLES: Record<AreaKey, string> = {
  google: 'Google',
  social: 'Social',
  website: 'Website',
  ads: 'Ads',
  competitors: 'Competitors',
  keywords: 'Keywords',
};

// ---------------------------------------------------------------------------
// Shared pieces

let fontCache: string | null | undefined;

/** Inter, inlined, so the PDFs look the same on any machine (the division's self-hosted copy). */
export function fontFace(): string {
  if (fontCache === undefined) {
    try {
      const file = path.join(process.cwd(), 'public/brand/social-engineering/fonts/inter-latin-var.woff2');
      fontCache = `@font-face{font-family:'Report';src:url(data:font/woff2;base64,${readFileSync(file).toString('base64')}) format('woff2');font-weight:100 900;}`;
    } catch {
      fontCache = null;
    }
  }
  return fontCache ?? '';
}

export function baseCss(b: Brand) {
  return `${fontFace()}
*{box-sizing:border-box;margin:0;padding:0}
html,body{font-family:'Report',Inter,Arial,Helvetica,sans-serif;color:#111827;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.preparer{height:1.6em;max-width:9em;vertical-align:middle;margin-left:6px;background:#fff;border-radius:3px;padding:1px 3px;object-fit:contain}
h1,h2,h3{color:${b.heading};line-height:1.15}
.band{background:${b.primary};color:${b.onPrimary}}
.band h1,.band h2,.band h3,.band .muted{color:${b.onPrimary}}
.muted{color:#4b5563}
table{border-collapse:collapse;width:100%}
th{background:${b.primary};color:${b.onPrimary};text-align:left;font-weight:600}
td,th{border-bottom:1px solid #e5e7eb;vertical-align:top;overflow-wrap:anywhere}
.kpis{display:grid;grid-template-columns:repeat(4,1fr)}
.kpi{background:${b.tint};border-radius:10px}
.kpi .v{font-weight:700;color:#111827}
.kpi .l{color:#374151}
a{color:${b.heading}}
.logo{object-fit:contain;display:block}
ul{padding-left:1.1em}
.base{background:${b.tint}}`;
}

export const logoImg = (b: Brand, cls: string) =>
  b.logo ? `<img class="logo ${cls}" src="${esc(b.logo)}" alt="" style="background:${logoBackground(b.logo)}" onerror="this.remove()">` : '';

export const listHtml = (items: string[], trim = true) =>
  items.length ? `<ul>${items.map((i) => `<li${trim ? ' data-trim' : ''}>${esc(i)}</li>`).join('')}</ul>` : '';

interface Kpi {
  value: string;
  label: string;
}

export function kpis(f: Facts, m: ModelOutput, p: AdplanOutput | null = null): Kpi[] {
  const place = f.maps?.business;
  const base = m.roi?.scenarios.base;
  const planNet = p?.comparison.included.length ? p.comparison.with_plan.net_year.medium : null;
  const available = new Map(evidenceCoverage(f).map(s => [s.key, s.status === 'checked']));
  return [
    {
      value: place?.rating !== null && place?.rating !== undefined ? `${place.rating} / 5` : NOT_CHECKED,
      label: place ? `Google rating · ${num(place.reviews)} reviews` : 'Google rating',
    },
    { value: available.get('instagram') ? num(f.social?.business?.followers ?? null) : NOT_CHECKED, label: 'Instagram followers' },
    { value: available.get('search') ? num(f.search?.business?.organic_keywords ?? null) : NOT_CHECKED, label: 'Organic keywords · Ahrefs US estimate' },
    // With a plan, the old search-ad model never shows, even when nothing in the plan pays back.
    planNet !== null
      ? { value: money(planNet), label: '12-month net with the plan, medium case' }
      : base && !p
        ? { value: money(base.year.net), label: 'Base case, 12-month net from search ads' }
        : { value: num(m.roi?.demand_monthly ?? null), label: 'Monthly searches in the area' },
  ].filter(k => k.value !== NOT_CHECKED && k.value !== '–');
}

const kpiHtml = (items: Kpi[]) =>
  items.length ? `<div class="kpis" style="grid-template-columns:repeat(${items.length},1fr)">${items.map((k) => `<div class="kpi"><div class="v">${esc(k.value)}</div><div class="l">${esc(k.label)}</div></div>`).join('')}</div>` : '';

/** Legacy and manually released reports use the same evidence rules as newly modeled reports. */
function safeReportData(d: ReportData): ReportData {
  const hasDemand = evidenceCoverage(d.facts).some(s => s.key === 'keywords' && s.status === 'checked');
  return { ...d, model: { ...d.model, writeup: scrubUnsupportedClaims(d.model.writeup, d.facts).writeup,
    ...(!hasDemand ? { roi: null, roi_sources: [], core_keywords: [], roi_note: 'Keyword demand and bids could not be verified for this run, so ad spend and return were not modeled. This does not establish low or zero demand.' } : {}),
  }, ...(!hasDemand ? { adplan: null, adcopy: null } : {}) };
}

const evidenceStatus = { checked: 'Checked', unavailable: 'Unavailable', not_checked: 'Not checked', not_found: 'Not found in this lookup' };

function evidenceLimits(f: Facts, compact = false): string {
  const missing = evidenceCoverage(f).filter(s => s.status !== 'checked' && s.key !== 'facebook');
  if (compact) return missing.length ? `<p class="evidence-limit"><strong>Evidence limits:</strong> ${esc(missing.map(s => `${s.label}: ${evidenceStatus[s.status].toLowerCase()}`).join('; '))}. Missing reads do not establish zero activity or demand. See the full audit for scope and dates.</p>` : '';
  return `<p>Public observations describe what the named source returned at the capture time. They do not measure revenue, leads, bookings or account performance.</p>${table(['Research area', 'Result / captured', 'Scope and decision limit'], evidenceCoverage(f).map(s => [s.label, `${evidenceStatus[s.status]}${s.captured_at ? ` · ${s.captured_at.slice(0, 10)}` : ''}`, `${s.scope} ${s.limitation}`]))}<p class="muted">Verified: directly returned observations. Derived: labelled calculations and model outputs. Hypothesis: an implication that still needs validation. Unavailable and not checked are never recorded as zero.</p>`;
}

function findingHtml(finding: ReportFinding): string {
  return `<article class="finding"><h3>${esc(finding.title)}</h3><p class="note">${esc(finding.priority.toUpperCase())} PRIORITY · ${esc(AREA_TITLES[finding.area])} · ${esc(finding.basis)} · ${esc(finding.source.replace(/_/g, ' '))}</p>
<p><strong>Evidence:</strong> ${esc(finding.evidence)}</p><p><strong>Business implication:</strong> ${esc(finding.implication)}</p><p><strong>Recommended action:</strong> ${esc(finding.action)}</p>
<p><strong>Effort and dependencies:</strong> ${esc([finding.effort, finding.dependency].filter(Boolean).join(' ')) || 'Confirm scope and access before estimating implementation cost.'}</p><p><strong>How to verify:</strong> ${esc(finding.measure) || 'Confirm the change against the source and the business’s own measurement.'}</p></article>`;
}

function scenarioRows(m: ModelOutput) {
  const s = m.roi?.scenarios ?? {};
  return (['conservative', 'base', 'optimistic'] as const)
    .filter((k) => s[k])
    .map((k) => ({ key: k, label: k[0].toUpperCase() + k.slice(1), r: s[k] as RoiScenarioResult }));
}

export function feeLine(m: ModelOutput) {
  // Keep the report API stable; relationship flags do not establish an agreed fee.
  void m;
  return 'These figures are before any management fee. Confirm scope and commercial terms before funding.';
}

function stopLoss(m: ModelOutput): string | null {
  const cpl = m.roi?.scenarios.base?.steady_month.cpl;
  return cpl ? `Stop-loss: if cost per lead is above ${money(cpl * 1.5)} after 60 days, pull back.` : null;
}

// ---------------------------------------------------------------------------
// The plan (the ad-plan step's output)

const AREA_LABELS: Record<ChangeArea, string> = {
  ads: 'Ads',
  seo: 'Search',
  website: 'Website',
  google: 'Google profile',
  reviews: 'Reviews',
  listings: 'Listings',
  social: 'Social',
  email: 'Email',
};
const CALLS: Record<PlanRow['recommendation'], string> = { fund: 'Fund', test: 'Test', skip: 'Skip' };
const NOT_MODELED = 'Not modeled';

/** What a change returns per dollar it costs, in the medium case: net ÷ cost + 1. */
export const backPerDollar = (c: RankedChange) => {
  const roi = c.scenarios?.medium.roi;
  return roi === null || roi === undefined ? NOT_MODELED : `$${(roi + 1).toFixed(2)}`;
};
const netRange = (c: RankedChange) => (c.scenarios ? `${money(c.scenarios.low.net_year)} to ${money(c.scenarios.high.net_year)}` : NOT_MODELED);
/** Why a change has no modeled return, when it has none. */
const unmodeledReason = (c: RankedChange) =>
  c.modeled ? null : c.impact.kind === 'not_modeled' ? c.impact.reason : c.impact.kind === 'ads' ? c.impact.row.reason : null;
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const hasPlan = (p: AdplanOutput | null): p is AdplanOutput => Boolean(p && p.ranked.length);

/** One sentence: what the plan adds and returns, or that nothing pays back. */
export function planLine(p: AdplanOutput): string {
  const c = p.comparison;
  const w = c.with_plan;
  if (!c.included.length) return 'No change pays back in the medium case on public data alone; the ranked changes show what each would cost.';
  return `The plan: ${c.included.length} ${plural(c.included.length, 'change that pays', 'changes that pay')} back in the medium case, adding ${money(w.added_monthly_spend.medium)} a month in ad spend and ${num(w.team_hours)} team hours in the first year, for ${money(w.net_year.low)} to ${money(w.net_year.high)} net over 12 months after team time (${money(w.net_year.medium)} in the medium case).`;
}

const TEAM_TIME = 'Team time is costed at New Wave’s hourly cost for the work.';

function todayTable(p: AdplanOutput) {
  const c = p.comparison;
  const w = c.with_plan;
  const spendToday = c.today.monthly_ad_spend === null ? 'Not public' : money(c.today.monthly_ad_spend);
  const spendPlan = w.monthly_ad_spend === null ? `${money(w.added_monthly_spend.medium)} added` : money(w.monthly_ad_spend);
  return table(
    ['', 'Today', 'With the plan'],
    [
      ['Ad spend a month', spendToday, spendPlan],
      ['Added customers a month, medium case', '0', num(w.extra_customers_month.medium, 1)],
      ['Team hours, first year', '0', num(w.team_hours)],
      ['12-month net after team time, low to high', money(0), `${money(w.net_year.low)} to ${money(w.net_year.high)} (${money(w.net_year.medium)} medium)`],
    ]
  );
}

function rankedTable(p: AdplanOutput, limit: number) {
  const rows = p.ranked.slice(0, limit).map((c) => {
    const note = unmodeledReason(c) ?? c.evidence;
    return `<tr><td>${c.rank}</td><td>${esc(c.title)}${note ? `<div class="note">${esc(note)}</div>` : ''}</td><td>${esc(AREA_LABELS[c.area] ?? c.area)}</td><td>${num(c.hours)}</td><td>${esc(netRange(c))}</td><td>${esc(backPerDollar(c))}</td></tr>`;
  });
  return `<table class="ranked"><thead><tr><th>#</th><th>Change</th><th>Area</th><th>Team hours, first year</th><th>12-month net after team time, low to high</th><th>Back per $1, medium case</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

function planRowsTable(p: AdplanOutput) {
  const rows = p.plan.rows.map((r) => {
    const m = r.scenarios.medium;
    const net = r.roi_tier === 'not modeled' ? NOT_MODELED : `${money(r.scenarios.low.year_net)} to ${money(r.scenarios.high.year_net)}`;
    return `<tr><td>${esc(r.angle)}<div class="note">${esc(r.reason)}</div></td><td>${esc(r.platform_label)}</td><td>$${m.cpc.toFixed(2)}</td><td>${num(m.clicks)}</td><td>${money(m.spend)}</td><td>${esc(net)}</td><td>${CALLS[r.recommendation]}</td></tr>`;
  });
  return `<table class="ranked"><thead><tr><th>Angle</th><th>Platform</th><th>Cost per click</th><th>Clicks a month</th><th>Ad spend a month</th><th>12-month net before team time, low to high</th><th>Call</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

const unique = (xs: string[]) => [...new Set(xs.filter(Boolean))];

function returnSection(p: AdplanOutput, m: ModelOutput) {
  return `<p>Every change the audit found is costed in team time and spend, modeled on published figures where they exist, and ranked by what it returns in the medium case. A change with no published figure is still listed, after the modeled ones, cheapest first.</p>
${todayTable(p)}<p class="muted">${esc(p.baseline.ad_spend_basis)}</p>
<h3>Every change, ranked</h3>${rankedTable(p, 15)}
<p>${esc(feeLine(m))} ${esc(TEAM_TIME)}</p>
<p class="muted">Ranges, not promises: after 90 days, your own tracked calls and jobs replace these estimates.</p>`;
}

const fieldLabel = (name: string) => {
  const words = name.replace(/_/g, ' ').replace(/(\d+)$/, ' $1');
  return words[0].toUpperCase() + words.slice(1);
};

/** Each ad, field by field with its character limit, then the rows the plan runs that have none. */
function adCopySection(c: AdcopyOutput) {
  const ads = c.ads.map((a) => {
    const spec = GROUNDSWELL_CONFIG.platforms[a.platform]?.template.fields ?? {};
    const rows = Object.entries(a.fields).map(([name, value]) => {
      const lines = Array.isArray(value) ? value : [value];
      const limit = spec[name] ? ` <span class="note">(up to ${spec[name].max_chars} characters)</span>` : '';
      return `<tr><th>${esc(fieldLabel(name))}${limit}</th><td>${lines.map((l) => esc(l)).join('<br>')}</td></tr>`;
    });
    return `<h3>${esc(a.angle)} · ${esc(a.platform_label)} (${CALLS[a.recommendation]})</h3>
<table><tbody>${rows.join('')}<tr><th>Targeting</th><td>${esc(a.targeting)}</td></tr><tr><th>Call to action</th><td>${esc(a.call_to_action)}</td></tr></tbody></table>
<p class="note">${esc(a.format)}; limits from ${esc(a.limits_source)}.</p>`;
  });
  const missing = c.not_written.map((n) => `${n.angle} on ${n.platform_label}: ${n.reason}`);
  return `<p>One ad for each row the plan runs, written from your own website, Google listing and Instagram, and checked line by line: every line fits the platform's limit, uses no number your public data does not show, and makes no claim that would need a source (${esc(GROUNDSWELL_CONFIG.unsupported_claims.slice(0, 4).map((x) => `"${x}"`).join(', '))} and the like). Edit freely within the limits.</p>
${ads.join('')}
${missing.length ? `<h3>Not written</h3>${listHtml(missing, false)}` : ''}`;
}

function adPlanSection(p: AdplanOutput) {
  const live = p.plan.rows.filter((r) => r.recommendation !== 'skip');
  const stops = live
    .filter((r) => r.stop_loss_cost_per_lead !== null && r.roi_tier !== 'not modeled')
    .map((r) => `${r.angle} on ${r.platform_label}: pull back if a lead costs more than ${money(r.stop_loss_cost_per_lead)} after 60 days.`);
  const rules = unique(p.plan.rows.flatMap((r) => r.conditions.map((c) => `${r.platform_label}: ${c}`)));
  const unmodeled = unique(p.plan.unmodeled.map((u) => `${GROUNDSWELL_CONFIG.platforms[u.platform]?.label ?? u.platform}: ${u.reason}`));
  const small = p.plan.too_small.map((t) => `${t.angle}: about ${num(t.demand)} searches a month, too few for a search campaign of its own.`);
  const angles = p.angles.map((a) => `${a.name}: ${a.why}`);
  return `<p>An angle is a reason to choose the business that people actually search for. Each one is modeled on every ad platform its industry allows (profile: ${esc(p.industry.label)}), in a low, medium and high case; cost per click, clicks and spend are the medium case. A row's net is ad profit less ad spend, before team time; the ranking counts the team's time as well.</p>
<h3>Angles</h3>${listHtml(angles, false)}
${planRowsTable(p)}
${stops.length ? `<h3>Stop-loss</h3>${listHtml(stops, false)}` : ''}
${rules.length ? `<h3>Platform rules</h3>${listHtml(rules, false)}` : ''}
${unmodeled.length || small.length ? `<h3>Not modeled</h3>${listHtml([...unmodeled, ...small], false)}` : ''}
<h3>Where the numbers come from</h3>${listHtml(unique(p.plan.rows.flatMap((r) => r.sources)), false)}`;
}

// ---------------------------------------------------------------------------
// Area tables (shared by the audit; the slides use the write-up only)

export function table(head: string[], rows: string[][]) {
  if (!rows.length) return '';
  return `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;
}

function areaTables(key: AreaKey, f: Facts): string {
  switch (key) {
    case 'google': {
      const p = f.maps?.business;
      const own = p
        ? table(
            ['Name', 'Rating', 'Reviews', 'Category', 'Website listed', 'Hours listed'],
            [[p.name ?? f.business.name, p.rating === null ? NOT_CHECKED : String(p.rating), num(p.reviews), p.category ?? '–', p.website ? 'Yes' : 'No', p.hours.length ? 'Yes' : 'No']]
          )
        : `<p class="muted">${esc(f.maps?.note ?? 'Google Maps could not be checked for this audit.')}</p>`;
      const near = table(
        ['Nearby in the same category', 'Rating', 'Reviews'],
        (f.maps?.nearby ?? []).slice(0, 8).map((l) => [l.name ?? '–', l.rating === null ? '–' : String(l.rating), num(l.reviews)])
      );
      return own + near;
    }
    case 'social': {
      const rows = [f.social?.business ? { name: f.business.name, ...f.social.business } : null, ...(f.social?.competitors ?? [])]
        .filter((r): r is NonNullable<typeof r> => Boolean(r))
        .map((r) => [r.name, `@${r.handle}`, num(r.followers), num(r.posts), num(r.posts_last_30_days), num(r.avg_likes_recent)]);
      const ig = rows.length
        ? table(['Business', 'Instagram', 'Followers', 'Posts', 'Posts, last 30 days', 'Avg. likes (recent)'], rows)
        : '<p class="muted">Instagram was not verified for this run. Account presence and posting activity remain unknown.</p>';
      const note = f.social?.business?.note ? `<p class="muted">${esc(f.social.business.note)}</p>` : '';
      const pages = [f.social?.facebook ? { name: f.business.name, ...f.social.facebook } : null, ...(f.social?.facebook_competitors ?? [])]
        .filter((p): p is NonNullable<typeof p> => Boolean(p && p.exists))
        .map((p): string[] => [
          p.name,
          num(p.followers),
          num(p.likes),
          p.rating === null ? "–" : `${p.rating}${p.rating_count === null ? "" : ` (${num(p.rating_count)})`}`,
          p.posts[0]?.posted_at ? p.posts[0].posted_at.slice(0, 10) : "–",
          p.engagement ? `${num(p.engagement.posts_read)}${p.engagement.posts_last_30_days === null ? '' : ` (${num(p.engagement.posts_last_30_days)} in 30 days)`}` : "–",
          p.engagement ? `${num(p.engagement.avg_reactions, 1)} / ${num(p.engagement.avg_comments, 1)}` : "–",
        ]);
      const fb = pages.length ? table(['Facebook Page', 'Followers', 'Likes', 'Rating (reviews)', 'Newest post', 'Posts read', 'Avg. reactions / comments'], pages) : '';
      return ig + note + fb;
    }
    case 'website': {
      const s = f.site?.business;
      const a = f.search?.business;
      if (!s) return '<p class="muted">No website was checked.</p>';
      if (s.error || !s.status || s.status < 200 || s.status >= 400) return '<p class="muted">The website did not return a successful response for this run. Technical SEO could not be assessed. Content, tracking and booking features remain unverified.</p>';
      const tags = [
        s.tracking.google_analytics.length ? 'Google Analytics' : null,
        s.tracking.google_tag_manager.length ? 'Tag Manager' : null,
        s.tracking.google_ads.length ? 'Google Ads tag' : null,
        s.tracking.meta_pixel ? 'Meta pixel' : null,
        s.tracking.tiktok_pixel ? 'TikTok pixel' : null,
      ].filter(Boolean);
      return table(
        ['Check', 'Result'],
        [
          ['Page title', s.title ?? 'none found'],
          ['Meta description', s.meta_description ?? 'none found'],
          ['Secure (HTTPS)', s.error ? NOT_CHECKED : s.https ? 'Yes' : 'No'],
          ['Mobile viewport', s.error ? NOT_CHECKED : s.has_viewport ? 'Yes' : 'No'],
          ['Main heading', s.h1[0] ?? 'none found'],
          [s.technical_seo ? 'Words in the initial HTML body' : 'Words in the fetched markup', num(s.word_count)],
          ['Structured data', s.schema_types.join(', ') || 'none found'],
          ['Tracking tags', tags.join(', ') || 'none found'],
          ['Online booking', s.booking.join(', ') || 'none found'],
          ['Domain rating (Ahrefs)', num(a?.domain_rating ?? null)],
          ['Organic keywords (Ahrefs, US)', num(a?.organic_keywords ?? null)],
          ['Monthly organic visits (Ahrefs estimate)', num(a?.organic_traffic ?? null)],
        ]
      ) + pagesReadTable(f) + (s.technical_seo ? `<h3>Technical SEO checks</h3><p class="muted">${esc(s.technical_seo.limitation)}</p>${
        s.technical_seo.findings.length
          ? table(['Priority', 'Observed evidence', 'Recommended action'], s.technical_seo.findings.map(finding => [
              finding.severity, `${finding.title}. ${finding.evidence}`, finding.recommendation,
            ]))
          : s.error || !s.status || s.status < 200 || s.status >= 300
            ? '<p>Technical SEO could not be assessed from a successful website response.</p>'
            : '<p>No issues were identified by these initial-response checks; rendered content, indexing and rich-result eligibility were not verified.</p>'
      }` : '');
    }
    case 'ads': {
      const rows = [f.ads?.business, ...(f.ads?.competitors ?? [])]
        .filter((r): r is NonNullable<typeof r> => Boolean(r))
        .map((r, i) => {
          const site = i === 0 ? f.site?.business : f.site?.competitors.find(c => c.name === r.name)?.site;
          const read = Boolean(site && !site.error && site.status && site.status >= 200 && site.status < 400 && r.website_checked !== false);
          return [r.name, read ? yesNo(r.google_ads_tag) : NOT_CHECKED, read ? yesNo(r.meta_pixel) : NOT_CHECKED, read ? yesNo(r.tiktok_pixel) : NOT_CHECKED, r.error || !r.domain ? NOT_CHECKED : num(r.paid_pages.length)];
        });
      const tags = rows.length
        ? table(['Business', 'Google Ads tag', 'Meta pixel', 'TikTok pixel', 'Pages with paid search ads (Ahrefs)'], rows)
        : '<p class="muted">Ads could not be checked.</p>';
      const libraries = f.ad_library ? table(['Business', 'Google Ads Transparency Center', 'Meta Ad Library'], [f.ad_library.business, ...f.ad_library.competitors].map(r => [r.name, r.google_ads_status === 'ads_found' ? `${num(r.google_ads_count)} ads on record` : r.google_ads_status === 'none' ? 'No ads returned in this lookup' : 'Unavailable', r.meta_ad_status === 'running' ? 'Active ads returned' : r.meta_ad_status === 'not_running' ? 'Page reported no active ads' : 'Unavailable'])) : '';
      return tags + libraries + '<p class="muted">Tags and estimated paid pages are limited signals. A missing tag, zero estimated paid keywords or an unavailable library does not establish that no campaigns are running. Spend and results require authorized account data.</p>';
    }
    case 'competitors': {
      const ig = new Map((f.social?.competitors ?? []).map((c) => [c.name, c]));
      const se = new Map((f.search?.competitors ?? []).map((c) => [c.name, c]));
      const why = new Map((f.competitor_picks?.picks ?? []).map((p) => [p.name, p.reason ?? null]));
      const withWhy = [...why.values()].some(Boolean);
      const rows = (f.site?.competitors ?? []).map((c) => [
        c.name,
        num(se.get(c.name)?.domain_rating ?? null),
        num(se.get(c.name)?.organic_traffic ?? null),
        num(ig.get(c.name)?.followers ?? null),
        c.site?.booking.join(', ') || '–',
        ...(withWhy ? [why.get(c.name) ?? 'Entered by hand'] : []),
      ]);
      const dropped = (f.competitor_picks?.dropped ?? []).slice(0, 6);
      const leftOut = dropped.length ? `<p class="muted">Left out as not competing: ${esc(dropped.map((d) => `${d.name} (${d.reason.replace(/\.$/, '')})`).join('; '))}.</p>` : '';
      return rows.length
        ? table(['Competitor', 'Domain rating', 'Monthly organic visits', 'Instagram followers', 'Online booking', ...(withWhy ? ['Why it competes'] : [])], rows) + leftOut
        : '<p class="muted">No competitors were named for this audit; nearby businesses are on the Google page.</p>' + leftOut;
    }
    case 'keywords': {
      const ideas = table(
        ['Search in the area', 'Monthly searches', 'Competition', 'Top-of-page bid'],
        (f.keywords?.ideas ?? []).slice(0, 15).map((k) => [
          k.keyword,
          num(k.monthly_searches),
          k.competition ?? '–',
          typeof k.low_bid_usd === 'number' && typeof k.high_bid_usd === 'number' ? `$${k.low_bid_usd.toFixed(2)}–$${k.high_bid_usd.toFixed(2)}` : '–',
        ])
      );
      const ranks = table(
        ['Keyword the website ranks for', 'Position', 'Monthly searches'],
        (f.search?.business?.top_keywords ?? []).slice(0, 10).map((k) => [k.keyword, num(k.position), num(k.volume)])
      );
      const unmeasured = evidenceCoverage(f).find(s => s.key === 'keywords')?.status !== 'checked';
      return `${unmeasured ? '<p class="muted">Search-volume and bid estimates were unavailable. Any terms below are research suggestions, not measured demand; no ad spend or return is inferred from them.</p>' : '<p class="muted">Volumes and bids apply to the source geography and reporting window. Close variants can overlap; totals are not unique customers.</p>'}${ideas}${ranks}`;
    }
  }
}

/** The pages Firecrawl read, when the step ran: what each says and asks the reader to do. */
function pagesReadTable(f: Facts): string {
  const pages = (f.site_pages?.pages ?? []).filter((p) => !p.error);
  if (!pages.length) return '';
  return `<h3>Pages read</h3>${table(['Page', 'Title', 'Words', 'Calls to action', 'Prices seen'], pages.slice(0, 12).map((p) => [p.path, p.title ?? '–', num(p.word_count), p.ctas.map((c) => c.text).join(', ') || '–', p.prices.join(', ') || '–']))}<p class="muted">Main content as read on ${esc(f.site_pages!.fetched_at.slice(0, 10))}; pages that did not answer are not listed.</p>`;
}

/** A page as the plan names it: its path on the site. */
const pageLabel = (page: string) => {
  if (page === 'site-wide') return 'Site-wide';
  try { return new URL(page).pathname.replace(/\/+$/, '') || '/'; } catch { return page; }
};

/** The website optimization plan: page-by-page changes, pages to add, and how to tell it worked. */
function websitePlanSection(p: PlansOutput): string {
  const w = p.website_plan;
  const changes = w.changes.length ? table(['Page', 'Priority', 'Change', 'Why, and what was seen'], w.changes.map((c) => [pageLabel(c.page), c.priority, c.change, [c.reason, c.evidence].filter(Boolean).join(' ')])) : '<p class="muted">No page-level change was supported by the pages read.</p>';
  const add = w.new_pages.length ? `<h3>Pages to add</h3>${listHtml(w.new_pages.map((n) => `${n.path}: ${n.purpose}${n.searches.length ? ` For the searches: ${n.searches.join(', ')}.` : ''}`), false)}` : '';
  const measure = w.measurement.length ? `<h3>How to tell it worked</h3>${listHtml(w.measurement, false)}` : '';
  return `${w.summary ? `<p class="summary">${esc(w.summary)}</p>` : ''}${changes}${add}${measure}`;
}

const postHtml = (post: SocialPost) =>
  `<article class="post"><h3>${esc(post.day)} · ${esc(PLATFORM_LABELS[post.platform])} ${esc(post.format)}${post.topic ? ` · ${esc(post.topic)}` : ''}</h3>${post.pillar ? `<p class="note">${esc(post.pillar)}</p>` : ''}${post.hook ? `<p><strong>${esc(post.hook)}</strong></p>` : ''}<p class="caption">${esc(post.caption)}</p>${post.cta ? `<p><strong>Call to action:</strong> ${esc(post.cta)}</p>` : ''}${post.visual ? `<p class="muted"><strong>Visual:</strong> ${esc(post.visual)}</p>` : ''}${post.hashtags.length ? `<p class="muted">${esc(post.hashtags.map((h) => `#${h}`).join(' '))}</p>` : ''}</article>`;

/** The social media plan's opening: where to post, the pillars, and the week at a glance. */
function socialPlanSection(p: PlansOutput): string {
  const s = p.social_plan;
  const platforms = s.platforms.length ? table(['Platform', 'Role', 'Cadence'], s.platforms.map((x) => [PLATFORM_LABELS[x.platform], x.role, x.cadence])) : '';
  const pillars = s.pillars.length ? `<h3>Content pillars</h3>${listHtml(s.pillars.map((x) => `${x.name}: ${x.why}`), false)}` : '';
  const week = s.week.length ? `<h3>The week at a glance</h3>${table(['Day', 'Platform', 'Format', 'Topic'], s.week.map((x) => [x.day, PLATFORM_LABELS[x.platform], x.format, x.topic || x.hook]))}` : '<p class="muted">No post passed the rules this time.</p>';
  return `${s.summary ? `<p class="summary">${esc(s.summary)}</p>` : ''}${platforms}${pillars}${week}`;
}

function areaWriteup(m: ModelOutput, key: AreaKey, trim: boolean) {
  const a = m.writeup.areas[key];
  return `${a.summary ? `<p class="summary">${esc(a.summary)}</p>` : ''}
<div class="cols">
  <div><h3>Observed strengths</h3>${listHtml(a.working, trim) || '<p class="muted">No additional supported strength was established by the available evidence.</p>'}</div>
  <div><h3>Constraints and opportunities</h3>${listHtml(a.costing, trim) || '<p class="muted">No quantified loss was established; see the evidence limits.</p>'}</div>
</div>
${a.fixes.length ? `<h3>Fixes, in order</h3>${listHtml(a.fixes, trim)}` : ''}`;
}

function roiTable(m: ModelOutput) {
  const rows = scenarioRows(m);
  if (!rows.length) return `<p class="muted">${esc(m.roi_note ?? 'No return was modeled.')}</p>`;
  return `<table class="roi"><thead><tr><th>Scenario</th><th>Monthly ad spend</th><th>Leads a month</th><th>Jobs a month</th><th>12-month revenue</th><th>12-month net</th><th>Payback</th></tr></thead><tbody>${rows
    .map(
      ({ key, label, r }) =>
        `<tr${key === 'base' ? ' class="base"' : ''}><td>${label}</td><td>${money(r.steady_month.spend)}</td><td>${num(r.steady_month.leads)}</td><td>${num(r.steady_month.jobs, 1)}</td><td>${money(r.year.revenue)}</td><td>${money(r.year.net)}</td><td>${r.year.payback_month ? `month ${r.year.payback_month}` : 'not in 12 months'}</td></tr>`
    )
    .join('')}</tbody></table>`;
}

// ---------------------------------------------------------------------------
// Full audit

// ---------------------------------------------------------------------------
// AI search (the ai_search step)

const VERDICT_WORDS: Record<string, string> = { allowed: 'Allowed', blocked: 'Blocked', restricted: 'Allowed (some paths kept out)', no_robots: 'Allowed (no robots.txt)' };

/** The "AI answers" section: what the assistants and their crawlers get, the citability of each page, and what to change. */
export function aiSearchSection(a: NonNullable<Facts['ai_search']>): string {
  const v = a.visibility;
  const crawlers = table(['Crawler', 'For', 'robots.txt'], a.crawlers.agents.map((x) => [x.agent, AI_CRAWLERS.find((c) => c.agent === x.agent)?.purpose ?? '', `${VERDICT_WORDS[x.verdict] ?? x.verdict}${x.verdict === 'blocked' && x.disallows.length ? ` (${x.disallows.slice(0, 3).join(', ')})` : ''}`]));
  const files = a.files
    ? table(['File', 'Found', 'Detail'], [
        ['/llms.txt', yesNo(a.files.llms_txt.found), a.files.llms_txt.found ? (a.files.llms_txt.bytes === null ? 'Present (larger than the read)' : `${num(a.files.llms_txt.bytes)} bytes`) : 'Not found'],
        ['/llms-full.txt', yesNo(a.files.llms_full_txt.found), a.files.llms_full_txt.found ? (a.files.llms_full_txt.bytes === null ? 'Present (larger than the read)' : `${num(a.files.llms_full_txt.bytes)} bytes`) : 'Not found'],
        ['/sitemap.xml', yesNo(a.files.sitemap.found), a.files.sitemap.found ? `${num(a.files.sitemap.urls)} URLs` : 'Not found'],
      ])
    : '<p class="muted">The site’s files were not read.</p>';
  const entity = a.entity
    ? table(['Entity schema', 'Observed'], [
        ['Types on the homepage', a.entity.types.join(', ') || 'None'],
        ['Business node with a stable @id', yesNo((a.entity.has_local_business || a.entity.has_organization) && a.entity.has_id)],
        ['Address · telephone · hours', `${yesNo(a.entity.has_address)} · ${a.entity.telephone ?? 'No'} · ${yesNo(a.entity.has_opening_hours)}`],
        ['Profiles linked (sameAs)', a.entity.same_as.length ? num(a.entity.same_as.length) : 'None'],
        ['Phone matches the Google listing', a.nap.consistent === null ? 'Not compared' : yesNo(a.nap.consistent)],
      ])
    : '';
  const pages = a.pages.length
    ? `<h3>Citability by page</h3><p class="muted">A rubric score (${CITABILITY_RUBRIC.map((r) => `${r.label.toLowerCase()} ${r.points}`).join(', ')}) over the checks the reading could answer; it says how quotable a page is, not where it ranks.</p>${table(['Page', 'Score', 'Weakest checks'], a.pages.slice(0, 12).map((p) => [p.path, `${num(p.score)} / 100`, p.checks.filter((c) => c.earned < c.points).sort((x, y) => x.earned / x.points - y.earned / y.points).slice(0, 3).map((c) => c.label).join(', ') || 'None']))}`
    : '';
  const visibility = v
    ? `<h3>What the assistants say today</h3>${
        v.error && v.business.mentions === null && !v.citations.length
          ? `<p class="muted">Brand Radar could not be read this time; the figures below are absent, not zero.</p>`
          : `${table(['Brand', 'Mentions', 'Share of voice'], [[v.business.name, v.business.mentions === null ? NOT_CHECKED : num(v.business.mentions), v.business.share_of_voice === null ? NOT_CHECKED : `${num(v.business.share_of_voice, 1)}%`], ...v.competitors.map((c) => [c.name, c.mentions === null ? NOT_CHECKED : num(c.mentions), c.share_of_voice === null ? NOT_CHECKED : `${num(c.share_of_voice, 1)}%`])])}<p class="muted">Across ${esc(v.assistants.join(', '))}, on Ahrefs’ prompt set for the United States. A mention is the business named in an answer; share of voice is its part of the mentions among the brands compared.</p>${
              v.citations.length ? table(['Platform', 'Citations of the site', 'Pages cited'], v.citations.map((c) => [ASSISTANT_LABELS[c.platform] ?? c.platform, num(c.citations), num(c.pages)])) : ''
            }${v.cited_domains.length ? `<h3>Where the answers come from</h3>${table(['Cited domain', 'Answers', 'Pages'], v.cited_domains.slice(0, 8).map((d) => [d.domain, num(d.responses), num(d.pages)]))}` : ''}${
              v.prompts.length ? `<h3>Questions where a brand was named</h3>${table(['Question', 'Assistant', 'Names you', 'Cited'], v.prompts.slice(0, 8).map((q) => [q.question, q.assistant, q.names_business ? 'Yes' : 'No', q.cited.slice(0, 3).join(', ') || '–']))}` : ''
            }${v.error ? `<p class="muted">Read in part: some Brand Radar figures did not answer this time.</p>` : ''}`
      }`
    : '<h3>What the assistants say today</h3><p class="muted">Brand Radar was not available to this run, so the assistants’ mentions were not read.</p>';
  const improvements = a.improvements.length
    ? `<h3>What to change</h3>${table(['Priority', 'Change', 'Why', 'Do'], a.improvements.slice(0, 10).map((i) => [i.priority, i.title, i.evidence, i.action]))}`
    : '<h3>What to change</h3><p>Nothing the reading calls for beyond keeping the files and the entity schema current.</p>';
  return `<p>Assistants answer from pages their crawlers can read and trust. This section is what they get from ${esc(a.website ?? 'the site')} on ${esc(a.fetched_at.slice(0, 10))}, and what they say about the business today.</p><h3>Crawler access</h3>${crawlers}${a.crawlers.gptbot_fetch ? `<p class="muted">Homepage fetched as GPTBot: ${esc(a.crawlers.gptbot_fetch.note)}</p>` : ''}<h3>Files for assistants</h3>${files}${entity}${pages}${visibility}${improvements}<p class="muted">The developer brief (a Markdown file with this run) carries the full baseline, the rubric, the owner’s question list and the phases of the work.</p>`;
}

// The business's own accounts (the linked step)

/** The services read from the business's own accounts, for a cover line; null for a run built from public data only. */
export function linkedLine(f: Facts): string | null {
  const read = f.linked?.services.filter((s) => s.ok).map((s) => s.label) ?? [];
  return read.length ? `Includes the business’s own ${read.join(', ')}` : null;
}

const pc = (x: number | null | undefined) => (x === null || x === undefined ? NOT_CHECKED : `${num(x, 1)}%`);

export function linkedTables(l: LinkedOutput): string {
  return l.services
    .filter((s) => s.ok && s.data)
    .map((s) => {
      switch (s.service) {
        case 'google_analytics': {
          const g = s.data as GaData;
          return `<h3>${esc(s.label)}: ${esc(g.property)}</h3>${table(
            ['Sessions', 'Users', 'New users', 'Conversions', 'Engagement rate'],
            [[num(g.totals.sessions), num(g.totals.users), num(g.totals.new_users), num(g.totals.conversions), pc(g.totals.engagement_rate_pct)]]
          )}${g.channels.length ? table(['Channel', 'Sessions', 'Users', 'Conversions'], g.channels.slice(0, 8).map((c) => [c.channel, num(c.sessions), num(c.users), num(c.conversions)])) : ''}${
            g.landing_pages.length ? table(['Landing page', 'Sessions'], g.landing_pages.slice(0, 8).map((p) => [p.page, num(p.sessions)])) : ''
          }`;
        }
        case 'google_search_console': {
          const g = s.data as GscData;
          return `<h3>${esc(s.label)}</h3>${table(['Clicks', 'Impressions', 'Click-through', 'Average position'], [[num(g.totals.clicks), num(g.totals.impressions), pc(g.totals.ctr_pct), num(g.totals.position, 1)]])}${
            g.queries.length ? table(['Search', 'Clicks', 'Impressions', 'Position'], g.queries.slice(0, 12).map((q) => [q.query, num(q.clicks), num(q.impressions), num(q.position, 1)])) : ''
          }`;
        }
        case 'googleads': {
          const g = s.data as GoogleAdsData;
          return `<h3>${esc(s.label)}: ${esc(g.account)}</h3>${table(
            ['Spend', 'Impressions', 'Clicks', 'Conversions', 'Cost per conversion'],
            [[money(g.totals.cost), num(g.totals.impressions), num(g.totals.clicks), num(g.totals.conversions, 1), g.totals.cost_per_conversion === null ? '–' : money(g.totals.cost_per_conversion)]]
          )}${g.campaigns.length ? table(['Campaign', 'Status', 'Spend', 'Clicks', 'Conversions'], g.campaigns.slice(0, 10).map((c) => [c.name, c.status ?? '–', money(c.cost), num(c.clicks), num(c.conversions, 1)])) : ''}`;
        }
        case 'instagram': {
          const g = s.data as InstagramData;
          return `<h3>${esc(s.label)}${g.username ? `: @${esc(g.username)}` : ''}</h3>${table(
            ['Followers', 'Reach', 'Accounts engaged', 'Profile views', 'Website taps'],
            [[num(g.followers), num(g.reach), num(g.accounts_engaged), num(g.profile_views), num(g.website_clicks)]]
          )}${table(['Posts in the window', 'Reels', 'Average likes (recent posts)', 'Average comments'], [[num(g.posts_in_window), num(g.reels_in_window), num(g.avg_likes), num(g.avg_comments)]])}`;
        }
        case 'metaads': {
          const g = s.data as MetaAdsData;
          const t = g.totals;
          return `<h3>${esc(s.label)}: ${esc(g.account)}</h3>${
            t
              ? table(['Spend', 'Impressions', 'Reach', 'Clicks', 'Cost per click', 'Leads', 'Messages'], [[money(t.spend), num(t.impressions), num(t.reach), num(t.clicks), t.cpc === null ? '–' : `$${num(t.cpc, 2)}`, num(t.leads), num(t.messages)]])
              : '<p class="muted">The account returned no performance totals for this window; campaign activity was not established by this response.</p>'
          }${g.campaigns.length ? table(['Campaign', 'Spend', 'Clicks', 'Leads'], g.campaigns.slice(0, 10).map((c) => [c.name, money(c.spend), num(c.clicks), num(c.leads)])) : ''}`;
        }
      }
    })
    .join('');
}

/** The full audit's section on the business's own accounts: the figures read, and the services that could not be. */
function linkedSection(l: LinkedOutput): string {
  const notRead = l.services.filter((s) => !s.ok).map((s) => s.problem ?? `${s.label} could not be read this time.`);
  return `<p>Figures from the business’s own accounts, ${esc(l.window.start)} to ${esc(l.window.end)}. Where they cover an area, they outrank the public estimates elsewhere in this audit.</p>${linkedTables(l)}${
    notRead.length ? `<h3>Not read this time</h3>${listHtml(notRead, false)}` : ''
  }`;
}

const PRESENCE_AREAS = { reviews: 'Reviews', reddit: 'Reddit', ai_answers: 'AI answers' } as const;

/** Reviews (Google beside Yelp), Reddit, what Google's AI answers, and the plan for them. Empty when none of the three was read. */
export function presenceSection(f: Facts, plan: PresenceOutput | null | undefined): string {
  const y = f.reviews;
  const r = f.community;
  const a = f.ai_answers;
  if (!y && !r && !a) return '';
  const rating = (x: { rating: number | null; reviews: number | null } | null | undefined) => (x ? `${x.rating ?? '–'}★ · ${num(x.reviews)}` : 'Not found');
  const parts: string[] = [];
  if (y || f.maps?.business) {
    const rows = [[f.business.name, f.maps?.business ? rating(f.maps.business) : NOT_CHECKED, y ? rating(y.business) : NOT_CHECKED, y?.business ? (y.business.claimed === null ? '–' : y.business.claimed ? 'Yes' : 'No') : '–']];
    for (const c of y?.competitors ?? []) rows.push([c.name, '–', rating(c.listing), c.listing ? (c.listing.claimed === null ? '–' : c.listing.claimed ? 'Yes' : 'No') : '–']);
    parts.push(`<h3>Reviews</h3>${table(['Business', 'Google', 'Yelp', 'Yelp claimed'], rows)}${y?.reviews.length ? `<p class="muted">Newest Yelp excerpts:</p>${listHtml(y.reviews.map((x) => `${x.rating ?? '–'}★ (${x.posted_at?.slice(0, 10) ?? ''}): “${x.text}”`), false)}` : ''}`);
  }
  if (r) {
    parts.push(
      `<h3>Reddit</h3><p>${r.business.mentions.length ? `${r.business.mentions.length} post${r.business.mentions.length === 1 ? '' : 's'} and comment${r.business.mentions.length === 1 ? '' : 's'} found name the business, in ${r.business.communities.map((c) => `r/${esc(c.name)}`).join(', ')}.` : 'No Reddit post or comment found names the business.'}</p>` +
        table(['Community', 'Post', 'Score', 'Date'], r.business.mentions.slice(0, 6).map((m) => [m.subreddit ? `r/${m.subreddit}` : '–', m.title ?? m.excerpt.slice(0, 90), num(m.score), m.posted_at?.slice(0, 10) ?? '–'])) +
        (r.category.questions.length ? `<p class="muted">Questions asked about the category${r.category.term ? ` (${esc(r.category.term)})` : ''}:</p>${listHtml(r.category.questions.slice(0, 5).map((q) => `${q.subreddit ? `r/${q.subreddit}: ` : ''}${q.title ?? ''}`), false)}` : '') +
        (r.tags.length ? `<p class="note">Tags: ${esc(r.tags.join(', '))}</p>` : '')
    );
  }
  if (a) {
    parts.push(
      `<h3>What Google’s AI answers</h3>${table(['Question', 'Named', 'Place', 'Led with'], a.answers.map((x) => [x.prompt, x.error ? 'Not read' : x.named ? 'Yes' : 'No', x.position === null ? '–' : String(x.position), x.top ?? '–']))}` +
        a.answers.filter((x) => x.description).map((x) => `<p class="muted">Asked “${esc(x.prompt)}”, it says: “${esc(x.description!)}”</p>`).join('') +
        `<p class="note">${esc(a.note)}</p>`
    );
  }
  if (plan?.actions.length) {
    parts.push(`<h3>What to do</h3>${plan.actions.slice(0, 10).map((x) => `<div class="finding"><h3>${esc(x.priority === 'high' ? 'High' : x.priority === 'medium' ? 'Medium' : 'Low')} · ${esc(PRESENCE_AREAS[x.area])}: ${esc(x.action)}</h3><p>${esc(x.reason)}</p>${x.evidence.length ? `<p class="note">${esc(x.evidence.join(' '))}</p>` : ''}</div>`).join('')}${plan.measures.length ? `<h3>How to tell it worked</h3>${listHtml(plan.measures, false)}` : ''}`);
  }
  return parts.join('');
}

export function buildAuditHtml(d: ReportData): string {
  d = safeReportData(d);
  const { facts: f, model: m, brand: b } = d;
  const p = hasPlan(d.adplan) ? d.adplan : null;
  // Copy only alongside its plan, and only when there is something to show.
  const copy = p && d.adcopy && (d.adcopy.ads.length || d.adcopy.not_written.length) ? d.adcopy : null;
  const who = d.preparer ?? NEW_WAVE_PREPARER;
  const footer = `${esc(f.business.name)} · Marketing audit · ${preparedBy(who)} · ${esc(d.date)}`;
  const section = (kicker: string, title: string, body: string) =>
    `<section class="page"><div class="kicker">${esc(kicker)}</div><h2>${esc(title)}</h2>${body}<div class="foot">${footer}</div></section>`;
  const findings = m.writeup.findings ?? [];
  const priorityPages = [];
  for (let i = 0; i < findings.length; i += 2) priorityPages.push(section('Recommended decisions', i ? 'Further priorities' : 'Priorities and next actions', findings.slice(i, i + 2).map(findingHtml).join('')));
  const searchPages = (f.search?.serp?.queries ?? []).filter(q => !q.error && q.organic.length).slice(0, 4).map(q => section('Observed search results', `Search: ${q.query}`, `<p class="muted">${esc(q.location ?? 'Provider default location')} · ${esc(q.captured_at.slice(0, 10))}. These are observed positions for this query and capture, not a site-wide ranking.</p>${table(['Position', 'Result', 'Domain'], q.organic.slice(0, 10).map(r => [num(r.position), r.title, r.domain ?? r.url]))}<p class="note">Source: ${esc(q.source_url)}</p>`)).join('');

  const areas = AREAS.map((k, i) =>
    section(`${i + 2} · ${AREA_TITLES[k]}`, AREA_TITLES[k], `${areaTables(k, f)}${areaWriteup(m, k, false)}`)
  ).join('');

  const plan = m.writeup.plan;
  // A client's own accounts take a section of their own before the plan, and the later sections move down one.
  const linked = f.linked;
  const o = linked ? 1 : 0;
  // The plans (when the step ran) sit after the 90-day plan, and the later sections move down after them.
  const plans = d.plans && hasPlans(d.plans) ? d.plans : null;
  const websitePlan = plans && (plans.website_plan.changes.length || plans.website_plan.new_pages.length) ? plans : null;
  const socialPlan = plans && plans.social_plan.week.length ? plans : null;
  let numbered = 8 + o;
  const next = () => ++numbered;
  const planSections =
    (websitePlan ? section(`${next()} · Website plan`, 'Website optimization plan', websitePlanSection(websitePlan)) : '') +
    (socialPlan
      ? section(`${next()} · Social plan`, 'Social media plan: the first week', socialPlanSection(socialPlan)) +
        [0, 4].filter((i) => socialPlan.social_plan.week.length > i).map((i) => section('Ready to paste', i ? 'The first week of posts, continued' : 'The first week of posts', socialPlan.social_plan.week.slice(i, i + 4).map(postHtml).join(''))).join('')
      : '');
  const returnSections = p
    ? section(`${next()} · Return`, 'What pays back first', returnSection(p, m)) +
      section(`${next()} · Ad plan`, 'The ad plan', adPlanSection(p)) +
      (copy ? section(`${next()} · Ad copy`, 'Ad copy, ready to paste', adCopySection(copy)) : '')
    : section(
        `${next()} · Return`,
        'What search ads could return',
        `<p>${esc(m.roi?.lever ?? '')}</p>${roiTable(m)}<p>${esc(feeLine(m))}</p>${stopLoss(m) ? `<p><strong>${esc(stopLoss(m)!)}</strong></p>` : ''}
<h3>Where the numbers come from</h3>${listHtml(m.roi_sources, false)}
<p class="muted">Ranges, not promises: after 90 days, your own tracked calls and jobs replace these estimates. Fixes to your Google profile, website and Instagram are extra upside and are not counted here.</p>`
      );
  const returnLine = p
    ? planLine(p)
    : m.roi
      ? `${m.roi.lever}: about ${money(m.roi.scenarios.base?.steady_month.spend)} a month in ad spend, ${money(m.roi.scenarios.base?.year.net)} net over 12 months in the base case (${money(m.roi.scenarios.conservative?.year.net)} to ${money(m.roi.scenarios.optimistic?.year.net)} across the scenarios).`
      : m.roi_note ?? '';
  const sources = [
    f.site?.business ? `Website scan of ${f.site.business.final_url ?? f.site.business.url} (${f.site.business.fetched_at.slice(0, 10)}); raw HTTP response, JavaScript not rendered${f.site.business.technical_seo ? '; technical SEO checks included' : ''}` : null,
    f.maps ? `${f.maps.source} (${f.maps.fetched_at.slice(0, 10)})` : null,
    f.search ? `${f.search.source} (${f.search.fetched_at.slice(0, 10)})` : null,
    f.keywords?.source ? `${f.keywords.source} (${f.keywords.fetched_at?.slice(0, 10) ?? ''})` : null,
    f.social ? `${f.social.source} (${f.social.fetched_at.slice(0, 10)})` : null,
    f.ads ? `${f.ads.source} (${f.ads.fetched_at.slice(0, 10)})` : null,
    f.site_pages?.pages.some((x) => !x.error) ? `${f.site_pages.source} (${f.site_pages.fetched_at.slice(0, 10)})` : null,
    f.ai_search ? `${f.ai_search.source} (${f.ai_search.fetched_at.slice(0, 10)})` : null,
    f.ai_search?.visibility && (f.ai_search.visibility.business.mentions !== null || f.ai_search.visibility.citations.length) ? `${f.ai_search.visibility.source} (${f.ai_search.fetched_at.slice(0, 10)})` : null,
    f.reviews ? `${f.reviews.source} (${f.reviews.fetched_at.slice(0, 10)})` : null,
    f.community ? `${f.community.source} (${f.community.fetched_at.slice(0, 10)})` : null,
    f.ai_answers ? `${f.ai_answers.source} (${f.ai_answers.fetched_at.slice(0, 10)})` : null,
    ...(linked?.services.filter((s) => s.ok).map((s) => `${s.source} (${linked.fetched_at.slice(0, 10)})`) ?? []),
  ].filter((s): s is string => Boolean(s));
  const missing = [...(d.gaps ?? gapsFromMissing(f.missing)), ...(linked?.services.filter((s) => !s.ok).map((s) => s.problem ?? `${s.label} could not be read this time.`) ?? [])];
  const dataLine = linkedLine(f);

  return ownWording(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(f.business.name)} - Full Marketing Audit</title><style>
${baseCss(b)}
@page{size:Letter;margin:0}
.page{width:8.5in;min-height:11in;padding:0.6in 0.6in 0.8in;position:relative;page-break-after:always;font-size:10.5pt;line-height:1.4}
.page:last-child{page-break-after:auto}
.cover{padding:0;display:flex;flex-direction:column}
.cover .band{padding:0.7in 0.6in 0.5in}
.cover .inner{padding:0.4in 0.6in 0.8in}
.cover h1{font-size:30pt;margin:12px 0 6px}
.cover .logo{max-height:64px;max-width:240px;background:#fff;border-radius:8px;padding:6px}
.headline{font-size:17pt;font-weight:700;margin:0 0 10px;color:${b.heading}}
.kicker{font-size:9pt;letter-spacing:.08em;text-transform:uppercase;color:#4b5563;margin-bottom:4px}
h2{font-size:20pt;margin-bottom:12px}
h3{font-size:11.5pt;margin:14px 0 4px}
table{margin:10px 0;font-size:9.5pt}
td,th{padding:5px 7px}
.summary{margin:12px 0 4px}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.kpis{gap:10px;margin:16px 0}
.kpi{padding:12px}
.kpi .v{font-size:17pt}
.kpi .l{font-size:8.5pt}
.foot{position:absolute;left:0.6in;right:0.6in;bottom:0.35in;font-size:8pt;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:6px}
.ranked td,.ranked th{font-size:8.5pt;padding:4px 6px}
.note{font-size:7.5pt;color:#4b5563;margin-top:2px}
.finding{margin-bottom:18px;break-inside:avoid}.finding p{margin:4px 0}.finding h3{margin-top:0}
.post{margin-bottom:16px;break-inside:avoid;padding:10px 12px;border-left:3px solid ${b.primary};background:${b.tint}}.post p{margin:4px 0}.post h3{margin-top:0}.post .caption{white-space:pre-wrap}.evidence-limit{font-size:9pt;color:#374151;margin:10px 0;padding:9px 11px;border-left:3px solid ${b.primary};background:${b.tint}}
</style></head><body>
<section class="page cover">
  <div class="band">${logoImg(b, '')}<h1>${esc(f.business.name)}</h1><div class="muted">Marketing audit${f.business.city ? ` · ${esc(f.business.city)}` : ''} · ${preparedBy(who)}${preparerLogo(who)} · ${esc(d.date)}</div>${dataLine ? `<div class="muted">${esc(dataLine)}</div>` : ''}</div>
  <div class="inner">
    <p class="headline">${esc(m.writeup.headline)}</p>
    <p>${esc(m.writeup.verdict)}</p>
    ${kpiHtml(kpis(f, m, p))}
    ${evidenceLimits(f, true)}
    <h3>The return we modeled</h3>
    <p>${esc(returnLine)}</p>
  </div>
  <div class="foot">${footer}</div>
</section>
${priorityPages.join('')}
${areas}
${searchPages}
${f.ai_search ? section('AI answers', 'AI search: can the assistants read and cite you?', aiSearchSection(f.ai_search)) : ''}
${(() => { const body = presenceSection(f, d.presence); return body ? section('Reputation and community', 'Reviews, Reddit and AI answers', body) : ''; })()}
${linked ? section('8 · Your accounts', 'From the business’s own accounts', linkedSection(linked)) : ''}
${section(`${8 + o} · Plan`, 'The 90-day plan', `<h3>Weeks 1–2</h3>${listHtml(plan.weeks_1_2, false)}<h3>Weeks 3–6</h3>${listHtml(plan.weeks_3_6, false)}<h3>Weeks 7–12</h3>${listHtml(plan.weeks_7_12, false)}`)}
${planSections}
${returnSections}
${section('Research coverage', 'Evidence and decision limits', evidenceLimits(f))}
${m.writeup.assumptions?.length ? section('Planning basis', 'Assumptions that change the decision', `${listHtml(m.writeup.assumptions, false)}<h3>Business economics</h3><p>${esc(m.estimates.basis)}</p><p>Average order value, lead-to-customer close rate and gross margin are planning assumptions until the business confirms them. Public visibility cannot establish profit, conversion quality or a viable acquisition cost.</p><h3>Implementation costs</h3><p>Effort estimates depend on access, existing systems and approved scope. Any modeled team time and spend are planning estimates; confirm the commercial terms before funding work.</p>`) : ''}
${section(
  `${next()} · Sources`,
  'Sources and limits',
  `<h3>Data used</h3>${listHtml(sources, false)}${missing.length ? `<h3>Not available this time</h3>${listHtml(missing, false)}` : ''}${m.writeup.cant_see.length ? `<h3>Needs owner access</h3>${listHtml(m.writeup.cant_see, false)}` : ''}<p class="muted">Ratings, followers and rankings change daily; figures are as of the dates above.</p>`
)}
</body></html>`, who);
}

// ---------------------------------------------------------------------------
// Slides

/** The ad plan slide: the rows worth running, medium case. */
function deckPlanBody(p: AdplanOutput) {
  const live = p.plan.rows.filter((r) => r.recommendation !== 'skip').slice(0, 6);
  if (!live.length) return `<p>No ad row is worth funding or testing. The full audit lists every row and why.</p>`;
  return `<table><thead><tr><th>Angle</th><th>Platform</th><th>Ad spend a month</th><th>12-month net before team time</th><th>Call</th></tr></thead><tbody>${live
    .map(
      (r) =>
        `<tr><td>${esc(r.angle)}</td><td>${esc(r.platform_label)}</td><td>${money(r.scenarios.medium.spend)}</td><td>${r.roi_tier === 'not modeled' ? NOT_MODELED : money(r.scenarios.medium.year_net)}</td><td>${CALLS[r.recommendation]}</td></tr>`
    )
    .join('')}</tbody></table><p class="muted" style="margin-top:24px" data-trim>Skipped rows, platform rules, stop-losses and sources are in the full audit.</p>`;
}

export const SLIDE_IDS = ['cover', 'glance', 'google', 'social', 'website', 'ads', 'competitors', 'keywords', 'plan', 'roi', 'next'] as const;
/** The slide the ad plan adds, between the return and next steps. */
export const AD_PLAN_SLIDE_ID = 'adplan';
/** The slides a competitor benchmark adds, before next steps. */
export const BENCHMARK_SLIDE_IDS = ['benchmark_scorecard', 'benchmark_plan'] as const;
/** The slide the plans step adds, before next steps: the first week of posts. */
export const CONTENT_SLIDE_ID = 'content_week';

/** The first-week slide: a line per day. */
function contentWeekBody(p: PlansOutput) {
  return `${p.website_plan.changes.length ? `<p class="lead" data-trim>Website: ${esc(p.website_plan.changes.slice(0, 2).map((c) => `${pageLabel(c.page)}, ${c.change}`).join('; '))}</p>` : ''}${table(['Day', 'Platform', 'Format', 'Topic and hook'], p.social_plan.week.map((x) => [x.day, PLATFORM_LABELS[x.platform], x.format, [x.topic, x.hook].filter(Boolean).join(': ')]))}<p class="muted" data-trim>Captions, calls to action, visuals and hashtags are in the full audit, ready to paste.</p>`;
}

const leaderWord = (x: BenchmarkOutput, l: number | 'even' | null) => (l === null ? '–' : l === 'even' ? 'Even' : x.names[l]);

/** The benchmark slides: the scorecard's rows with a leader, and the top differences. */
function benchmarkSlides(x: BenchmarkOutput, slide: (id: string, n: number, title: string, body: string) => string, first: number) {
  const rows = x.scorecard.filter((r) => r.leader !== null).slice(0, 7);
  return (
    slide(BENCHMARK_SLIDE_IDS[0], first, 'Against your competitors', table(['', ...x.names, 'Leader'], rows.map((r) => [r.label, ...r.shown, leaderWord(x, r.leader)]))) +
    slide(
      BENCHMARK_SLIDE_IDS[1],
      first + 1,
      'Closing the gap',
      table(['#', 'Change', 'Do this', '90-day target'], x.writeup.differences.slice(0, 5).map((r) => [String(r.rank), r.title, r.change, r.target]))
    )
  );
}

/** The summary's "Against your competitors" lines: up to three gaps, in words. */
export function benchmarkSummaryLines(x: BenchmarkOutput): string[] {
  return x.gaps.slice(0, 3).map((g) => `${g.label}: ${g.business} here against ${g.competitor} at ${g.leader}.`);
}

export function buildDeckHtml(d: ReportData, links: { audit: string }): string {
  d = safeReportData(d);
  const { facts: f, model: m, brand: b } = d;
  const p = hasPlan(d.adplan) ? d.adplan : null;
  const bench = d.benchmark ?? null;
  const week = d.plans && d.plans.social_plan.week.length ? d.plans : null;
  const auditLink = portalLink(links.audit);
  const who = d.preparer ?? NEW_WAVE_PREPARER;
  const slide = (id: string, n: number, title: string, body: string) =>
    `<section class="slide" id="${id}"><header class="band"><span>${esc(title)}</span>${logoImg(b, 'mini')}</header><div class="body" data-fit>${body}</div><footer>${esc(f.business.name)} · ${preparedBy(who)} · ${esc(d.date)}<span>${n}</span></footer></section>`;

  const areaSlides = AREAS.map((k, i) => {
    const a = m.writeup.areas[k];
    return slide(
      k,
      i + 3,
      AREA_TITLES[k],
      `${a.summary ? `<p class="lead">${esc(a.summary)}</p>` : ''}<div class="cols"><div><h3>Observed strengths</h3>${listHtml(a.working.slice(0, 3)) || '<p class="muted">No additional supported strength established.</p>'}</div><div><h3>Constraints and opportunities</h3>${listHtml(a.costing.slice(0, 3)) || '<p class="muted">No quantified loss established.</p>'}</div></div>${a.fixes.length ? `<h3>Recommended action</h3>${listHtml(a.fixes.slice(0, 2))}` : ''}`
    );
  }).join('');

  const plan = m.writeup.plan;
  const roiRows = scenarioRows(m)
    .map(({ key, label, r }) => `<tr${key === 'base' ? ' class="base"' : ''}><td>${label}</td><td>${money(r.steady_month.spend)}</td><td>${num(r.steady_month.leads)}</td><td>${money(r.year.net)}</td></tr>`)
    .join('');

  return ownWording(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(f.business.name)} - Marketing Audit Slides</title><style>
${baseCss(b)}
@page{size:1920px 1080px;margin:0}
.slide{width:1920px;height:1080px;position:relative;overflow:hidden;page-break-after:always;font-size:30px;line-height:1.35}
.slide:last-child{page-break-after:auto}
.slide>header{height:150px;display:flex;align-items:center;justify-content:space-between;padding:0 90px;font-size:56px;font-weight:700}
.slide .mini{max-height:84px;max-width:260px;background:#fff;border-radius:10px;padding:8px}
.body{position:absolute;top:200px;left:90px;right:90px;bottom:130px;overflow:hidden}
.slide>footer{position:absolute;left:90px;right:90px;bottom:40px;height:50px;border-top:2px solid #e5e7eb;padding-top:12px;font-size:24px;color:#4b5563;display:flex;justify-content:space-between}
.lead{font-size:36px;margin-bottom:24px}
h3{font-size:34px;margin:18px 0 8px}
li{margin:6px 0}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:60px}
.kpis{gap:28px;margin-top:40px}
.kpi{padding:30px}
.kpi .v{font-size:64px}
.kpi .l{font-size:26px}
td,th{padding:14px 18px;font-size:30px}
.cover{display:flex;flex-direction:column;justify-content:center;padding:0 140px}
.cover h1{font-size:96px;margin:30px 0 20px}
.cover .logo{max-height:140px;max-width:420px;background:#fff;border-radius:14px;padding:12px}
.cover .sub{font-size:36px}
.cta{font-size:40px;font-weight:700}
</style></head><body>
<section class="slide band cover" id="cover">${logoImg(b, '')}<h1>${esc(f.business.name)}</h1><div class="sub">Marketing audit · ${preparedBy(who)}${preparerLogo(who)} · ${esc(d.date)}${linkedLine(f) ? ` · ${esc(linkedLine(f)!)}` : ''}</div></section>
${slide('glance', 2, 'At a glance', `<p class="lead"><strong>${esc(m.writeup.headline)}</strong></p><p>${esc(m.writeup.verdict)}</p>${kpiHtml(kpis(f, m, p))}${evidenceLimits(f, true)}`)}
${areaSlides}
${slide('plan', 9, 'The 90-day plan', `<div class="cols" style="grid-template-columns:1fr 1fr 1fr"><div><h3>Weeks 1–2</h3>${listHtml(plan.weeks_1_2.slice(0, 3))}</div><div><h3>Weeks 3–6</h3>${listHtml(plan.weeks_3_6.slice(0, 3))}</div><div><h3>Weeks 7–12</h3>${listHtml(plan.weeks_7_12.slice(0, 3))}</div></div>`)}
${
  p
    ? slide(
        'roi',
        10,
        'What pays back first',
        `<table><thead><tr><th>Change</th><th>12-month net after team time, medium case</th><th>Back per $1</th></tr></thead><tbody>${p.ranked
          .slice(0, 5)
          .map((c) => `<tr><td>${esc(c.title)}</td><td>${c.scenarios ? money(c.scenarios.medium.net_year) : NOT_MODELED}</td><td>${esc(backPerDollar(c))}</td></tr>`)
          .join('')}</tbody></table><p style="margin-top:30px" data-trim>${esc(planLine(p))}</p><p class="muted" data-trim>${esc(feeLine(m))}</p>`
      ) +
      slide(AD_PLAN_SLIDE_ID, 11, 'The ad plan', deckPlanBody(p))
    : slide(
        'roi',
        10,
        'What search ads could return',
        roiRows
          ? `<table><thead><tr><th>Scenario</th><th>Monthly ad spend</th><th>Leads a month</th><th>12-month net</th></tr></thead><tbody>${roiRows}</tbody></table><p style="margin-top:30px">${esc(feeLine(m))}</p>${stopLoss(m) ? `<p data-trim>${esc(stopLoss(m)!)}</p>` : ''}<p class="muted" data-trim>Ranges, not promises. Sources are in the full audit.</p>`
          : `<p>${esc(m.roi_note ?? 'No return was modeled.')}</p>`
      )
}
${bench ? benchmarkSlides(bench, slide, p ? 12 : 11) : ''}
${week ? slide(CONTENT_SLIDE_ID, (p ? 12 : 11) + (bench ? BENCHMARK_SLIDE_IDS.length : 0), 'The first week of posts', contentWeekBody(week)) : ''}
${slide(
  'next',
  (p ? 12 : 11) + (bench ? BENCHMARK_SLIDE_IDS.length : 0) + (week ? 1 : 0),
  'Next steps',
  `${listHtml(m.writeup.next_steps)}<p class="cta" style="margin-top:50px">${d.preparer ? 'Full audit (PDF) in your portal' : `<a href="${esc(auditLink)}">Full audit (PDF)</a>`}</p>`
)}
</body></html>`, who);
}

// ---------------------------------------------------------------------------
// One-page summary

/** The summary's return: the three highest-returning changes and the plan in one line. */
function summaryPlan(p: AdplanOutput, m: ModelOutput) {
  const top = p.ranked.filter((c) => c.modeled).slice(0, 3);
  const w = p.comparison.with_plan;
  const line = p.comparison.included.length
    ? `With the plan: ${money(w.added_monthly_spend.medium)} a month in added ad spend and ${num(w.team_hours)} team hours, ${money(w.net_year.low)} to ${money(w.net_year.high)} over 12 months.`
    : planLine(p);
  return `<h3>What pays back first</h3>
${top.length ? `<table><thead><tr><th>Change</th><th>12-month net after team time, medium case</th><th>Back per $1</th></tr></thead><tbody>${top.map((c) => `<tr><td>${esc(c.title)}</td><td>${money(c.scenarios!.medium.net_year)}</td><td>${esc(backPerDollar(c))}</td></tr>`).join('')}</tbody></table>` : ''}
<p class="muted" data-trim>${esc(line)} ${esc(feeLine(m))}</p>`;
}

export function buildSummaryHtml(d: ReportData, links: { deck: string; audit: string; folder: string }): string {
  d = safeReportData(d);
  const { facts: f, model: m, brand: b } = d;
  const p = hasPlan(d.adplan) ? d.adplan : null;
  const benchLines = d.benchmark ? benchmarkSummaryLines(d.benchmark) : [];
  const deck = portalLink(links.deck);
  const audit = portalLink(links.audit);
  const folder = portalLink(links.folder);
  const who = d.preparer ?? NEW_WAVE_PREPARER;
  const findings = m.writeup.findings?.length ? m.writeup.findings.slice(0, 4).map(finding => ({ k: finding.area, text: `${finding.title}. ${finding.evidence} ${finding.action}` })) : (['google', 'social', 'website', 'ads', 'keywords'] as AreaKey[])
    .map((k) => {
      const seo = k === 'website' ? f.site?.business?.technical_seo?.findings[0] : null;
      return { k, text: seo ? `${seo.title} (initial HTML). ${seo.recommendation.split(/(?<=[.!?])\s+/)[0]}` : m.writeup.areas[k].costing[0] || m.writeup.areas[k].summary };
    })
    .filter((x) => x.text);
  const roiRows = scenarioRows(m)
    .map(({ key, label, r }) => `<tr${key === 'base' ? ' class="base"' : ''}><td>${label}</td><td>${money(r.steady_month.spend)}/mo</td><td>${money(r.year.net)}</td></tr>`)
    .join('');

  return ownWording(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(f.business.name)} - Marketing Audit Summary</title><style>
${baseCss(b)}
@page{size:Letter;margin:0}
.sheet{width:8.5in;height:11in;position:relative;overflow:hidden;font-size:9.5pt;line-height:1.4}
.sheet>header{padding:0.4in 0.5in 0.3in;display:flex;justify-content:space-between;align-items:center;gap:20px}
.sheet h1{font-size:22pt}
.sheet .logo{max-height:52px;max-width:180px;background:#fff;border-radius:6px;padding:5px}
.body{position:absolute;top:1.45in;left:0.5in;right:0.5in;bottom:0.85in;overflow:hidden}
.headline{font-size:13pt;font-weight:700;color:${b.heading};margin-bottom:4px}
.kpis{gap:8px;margin:10px 0}
.kpi{padding:8px 10px}
.kpi .v{font-size:14pt}
.kpi .l{font-size:7.5pt}
h3{font-size:10.5pt;margin:10px 0 4px}
.findings li{margin:3px 0}
.findings a{font-size:8pt;margin-left:4px}
.evidence-limit{font-size:8pt;margin:8px 0;color:#374151;padding:7px 9px;border-left:3px solid ${b.primary};background:${b.tint}}
table{font-size:9pt}
td,th{padding:4px 6px}
.sheet>footer{position:absolute;left:0.5in;right:0.5in;bottom:0.35in;border-top:1px solid #e5e7eb;padding-top:6px;font-size:8.5pt;display:flex;gap:18px}
</style></head><body><div class="sheet">
<header class="band"><div><h1>${esc(f.business.name)}</h1><div class="muted">Marketing audit summary · ${preparedBy(who)}${preparerLogo(who)} · ${esc(d.date)}${linkedLine(f) ? ` · ${esc(linkedLine(f)!)}` : ''}</div></div>${logoImg(b, '')}</header>
<div class="body" data-fit>
<p class="headline">${esc(m.writeup.headline)}</p>
<p>${esc(m.writeup.verdict)}</p>
${kpiHtml(kpis(f, m, p))}
${evidenceLimits(f, true)}
<h3>Findings and priorities</h3>
<ul class="findings">${findings.map(({ k, text }) => `<li data-trim><strong>${AREA_TITLES[k]}:</strong> ${esc(text)}${d.preparer ? '' : `<a href="${esc(deck)}">Slides ›</a>`}</li>`).join('')}</ul>
${p ? summaryPlan(p, m) : `<h3>What search ads could return</h3>
${roiRows ? `<table><thead><tr><th>Scenario</th><th>Ad spend</th><th>12-month net</th></tr></thead><tbody>${roiRows}</tbody></table><p class="muted">${esc(feeLine(m))}</p>` : `<p class="muted">${esc(m.roi_note ?? '')}</p>`}`}
${benchLines.length ? `<h3>Against your competitors</h3>${listHtml(benchLines)}` : ''}
${d.plans?.social_plan.week.length ? `<h3>The first week of posts</h3>${listHtml(d.plans.social_plan.week.map((x) => `${x.day}: ${PLATFORM_LABELS[x.platform]} ${x.format}, ${x.topic || x.hook}`))}` : ''}
<h3>Next 90 days</h3>
${listHtml(m.writeup.next_steps)}
</div>
<footer>${d.preparer ? '<span>Slides (PDF) · Full audit (PDF) · all reports in your portal</span>' : `<a href="${esc(deck)}">Slides (PDF)</a><a href="${esc(audit)}">Full audit (PDF)</a><a href="${esc(folder)}">All reports</a>`}</footer>
</div></body></html>`, who);
}
