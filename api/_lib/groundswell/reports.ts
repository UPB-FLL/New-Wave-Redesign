import { readFileSync } from 'node:fs';
import path from 'node:path';
import { escapeHtml as esc } from '../http.js';
import type { Brand } from './brand.js';
import { AREAS, type AreaKey, type Facts, type runModel } from './model.js';
import type { RoiScenarioResult } from './roi.js';

/**
 * HTML for Groundswell's three PDFs, in the client's colours and logo:
 * - the full audit (Letter pages, no links),
 * - the slides (eleven 1920×1080 slides; the last links the audit),
 * - the one-page summary (links the slides, the audit and the Drive folder).
 * Every link must be a Google Drive link (`driveLink` throws otherwise).
 *
 * Elements marked data-trim may be removed, last first, until their
 * data-fit box stops overflowing (render.ts), so long text never spills.
 */

export type ModelOutput = Awaited<ReturnType<typeof runModel>>;

export interface ReportData {
  facts: Facts;
  model: ModelOutput;
  brand: Brand;
  /** Shown as "Prepared by New Wave: Social Engineering · <date>". */
  date: string;
}

export const PREPARED_BY = 'New Wave: Social Engineering';

export function driveLink(url: string): string {
  if (!/^https:\/\/drive\.google\.com\//.test(url)) throw new Error(`Reports may only link to Google Drive, not ${url}`);
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
function fontFace(): string {
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

function baseCss(b: Brand) {
  return `${fontFace()}
*{box-sizing:border-box;margin:0;padding:0}
html,body{font-family:'Report',Inter,Arial,Helvetica,sans-serif;color:#111827;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
h1,h2,h3{color:${b.heading};line-height:1.15}
.band{background:${b.primary};color:${b.onPrimary}}
.band h1,.band h2,.band h3,.band .muted{color:${b.onPrimary}}
.muted{color:#4b5563}
table{border-collapse:collapse;width:100%}
th{background:${b.primary};color:${b.onPrimary};text-align:left;font-weight:600}
td,th{border-bottom:1px solid #e5e7eb;vertical-align:top}
.kpis{display:grid;grid-template-columns:repeat(4,1fr)}
.kpi{background:${b.tint};border-radius:10px}
.kpi .v{font-weight:700;color:#111827}
.kpi .l{color:#374151}
a{color:${b.heading}}
.logo{object-fit:contain;display:block}
ul{padding-left:1.1em}
.base{background:${b.tint}}`;
}

const logoImg = (b: Brand, cls: string) =>
  b.logo ? `<img class="logo ${cls}" src="${esc(b.logo)}" alt="" onerror="this.remove()">` : '';

const listHtml = (items: string[], trim = true) =>
  items.length ? `<ul>${items.map((i) => `<li${trim ? ' data-trim' : ''}>${esc(i)}</li>`).join('')}</ul>` : '';

interface Kpi {
  value: string;
  label: string;
}

export function kpis(f: Facts, m: ModelOutput): Kpi[] {
  const place = f.maps?.business;
  const base = m.roi?.scenarios.base;
  return [
    {
      value: place?.rating !== null && place?.rating !== undefined ? `${place.rating} / 5` : NOT_CHECKED,
      label: place ? `Google rating · ${num(place.reviews)} reviews` : 'Google rating',
    },
    { value: num(f.social?.business?.followers ?? null), label: 'Instagram followers' },
    { value: num(f.search?.business?.organic_keywords ?? null), label: 'Keywords the website ranks for' },
    base
      ? { value: money(base.year.net), label: 'Base case, 12-month net from search ads' }
      : { value: num(m.roi?.demand_monthly ?? null), label: 'Monthly searches in the area' },
  ];
}

const kpiHtml = (items: Kpi[]) =>
  `<div class="kpis">${items.map((k) => `<div class="kpi"><div class="v">${esc(k.value)}</div><div class="l">${esc(k.label)}</div></div>`).join('')}</div>`;

function scenarioRows(m: ModelOutput) {
  const s = m.roi?.scenarios ?? {};
  return (['conservative', 'base', 'optimistic'] as const)
    .filter((k) => s[k])
    .map((k) => ({ key: k, label: k[0].toUpperCase() + k.slice(1), r: s[k] as RoiScenarioResult }));
}

export function feeLine(m: ModelOutput) {
  if (m.estimates.is_nwse_client === true) return 'You are already a New Wave: Social Engineering client, so the only new money is ad spend.';
  return m.estimates.has_current_marketer === false
    ? 'These figures are before any management fee.'
    : 'Management is fee-neutral: our fee replaces what you pay your current marketing company, so the only new money is ad spend.';
}

function stopLoss(m: ModelOutput): string | null {
  const cpl = m.roi?.scenarios.base?.steady_month.cpl;
  return cpl ? `Stop-loss: if cost per lead is above ${money(cpl * 1.5)} after 60 days, pull back.` : null;
}

// ---------------------------------------------------------------------------
// Area tables (shared by the audit; the slides use the write-up only)

function table(head: string[], rows: string[][]) {
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
      return rows.length
        ? table(['Business', 'Instagram', 'Followers', 'Posts', 'Posts, last 30 days', 'Avg. likes (recent)'], rows)
        : '<p class="muted">No Instagram account was found or checked.</p>';
    }
    case 'website': {
      const s = f.site?.business;
      const a = f.search?.business;
      if (!s) return '<p class="muted">No website was checked.</p>';
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
          ['Words on the homepage', num(s.word_count)],
          ['Structured data', s.schema_types.join(', ') || 'none found'],
          ['Tracking tags', tags.join(', ') || 'none found'],
          ['Online booking', s.booking.join(', ') || 'none found'],
          ['Domain rating (Ahrefs)', num(a?.domain_rating ?? null)],
          ['Organic keywords (Ahrefs, US)', num(a?.organic_keywords ?? null)],
          ['Monthly organic visits (Ahrefs estimate)', num(a?.organic_traffic ?? null)],
        ]
      );
    }
    case 'ads': {
      const rows = [f.ads?.business, ...(f.ads?.competitors ?? [])]
        .filter((r): r is NonNullable<typeof r> => Boolean(r))
        .map((r) => [r.name, yesNo(r.google_ads_tag), yesNo(r.meta_pixel), yesNo(r.tiktok_pixel), r.error ? NOT_CHECKED : num(r.paid_pages.length)]);
      return rows.length
        ? table(['Business', 'Google Ads tag', 'Meta pixel', 'TikTok pixel', 'Pages with paid search ads (Ahrefs)'], rows)
        : '<p class="muted">Ads could not be checked.</p>';
    }
    case 'competitors': {
      const ig = new Map((f.social?.competitors ?? []).map((c) => [c.name, c]));
      const se = new Map((f.search?.competitors ?? []).map((c) => [c.name, c]));
      const rows = (f.site?.competitors ?? []).map((c) => [
        c.name,
        num(se.get(c.name)?.domain_rating ?? null),
        num(se.get(c.name)?.organic_traffic ?? null),
        num(ig.get(c.name)?.followers ?? null),
        c.site?.booking.join(', ') || '–',
      ]);
      return rows.length
        ? table(['Competitor', 'Domain rating', 'Monthly organic visits', 'Instagram followers', 'Online booking'], rows)
        : '<p class="muted">No competitors were named for this audit; nearby businesses are on the Google page.</p>';
    }
    case 'keywords': {
      const ideas = table(
        ['Search in the area', 'Monthly searches', 'Competition', 'Top-of-page bid'],
        (f.keywords?.ideas ?? []).slice(0, 15).map((k) => [
          k.keyword,
          num(k.monthly_searches),
          k.competition ?? '–',
          k.low_bid_usd !== null && k.high_bid_usd !== null ? `$${k.low_bid_usd.toFixed(2)}–$${k.high_bid_usd.toFixed(2)}` : '–',
        ])
      );
      const ranks = table(
        ['Keyword the website ranks for', 'Position', 'Monthly searches'],
        (f.search?.business?.top_keywords ?? []).slice(0, 10).map((k) => [k.keyword, num(k.position), num(k.volume)])
      );
      return ideas + ranks || '<p class="muted">Keyword data could not be checked.</p>';
    }
  }
}

function areaWriteup(m: ModelOutput, key: AreaKey, trim: boolean) {
  const a = m.writeup.areas[key];
  return `${a.summary ? `<p class="summary">${esc(a.summary)}</p>` : ''}
<div class="cols">
  <div><h3>What's working</h3>${listHtml(a.working, trim) || '<p class="muted">Nothing stood out.</p>'}</div>
  <div><h3>What it's costing you</h3>${listHtml(a.costing, trim) || '<p class="muted">Nothing stood out.</p>'}</div>
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

export function buildAuditHtml(d: ReportData): string {
  const { facts: f, model: m, brand: b } = d;
  const footer = `${esc(f.business.name)} · Marketing audit · Prepared by ${PREPARED_BY} · ${esc(d.date)}`;
  const section = (kicker: string, title: string, body: string) =>
    `<section class="page"><div class="kicker">${esc(kicker)}</div><h2>${esc(title)}</h2>${body}<div class="foot">${footer}</div></section>`;

  const areas = AREAS.map((k, i) =>
    section(`${i + 2} · ${AREA_TITLES[k]}`, AREA_TITLES[k], `${areaTables(k, f)}${areaWriteup(m, k, false)}`)
  ).join('');

  const plan = m.writeup.plan;
  const sources = [
    f.site?.business ? `Website scan of ${f.site.business.final_url ?? f.site.business.url} (${f.site.business.fetched_at.slice(0, 10)})` : null,
    f.maps ? `${f.maps.source} (${f.maps.fetched_at.slice(0, 10)})` : null,
    f.search ? `${f.search.source} (${f.search.fetched_at.slice(0, 10)})` : null,
    f.keywords?.source ? `${f.keywords.source} (${f.keywords.fetched_at?.slice(0, 10) ?? ''})` : null,
    f.social ? `${f.social.source} (${f.social.fetched_at.slice(0, 10)})` : null,
    f.ads ? `${f.ads.source} (${f.ads.fetched_at.slice(0, 10)})` : null,
  ].filter((s): s is string => Boolean(s));
  const missing = f.missing.map((k) => `${k[0].toUpperCase()}${k.slice(1)} data could not be gathered for this audit.`);

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(f.business.name)} - Full Marketing Audit</title><style>
${baseCss(b)}
@page{size:Letter;margin:0}
.page{width:8.5in;min-height:11in;padding:0.6in 0.6in 0.8in;position:relative;page-break-after:always;font-size:10.5pt;line-height:1.45}
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
</style></head><body>
<section class="page cover">
  <div class="band">${logoImg(b, '')}<h1>${esc(f.business.name)}</h1><div class="muted">Marketing audit${f.business.city ? ` · ${esc(f.business.city)}` : ''} · Prepared by ${PREPARED_BY} · ${esc(d.date)}</div></div>
  <div class="inner">
    <p class="headline">${esc(m.writeup.headline)}</p>
    <p>${esc(m.writeup.verdict)}</p>
    ${kpiHtml(kpis(f, m))}
    <h3>The return we modeled</h3>
    <p>${esc(m.roi ? `${m.roi.lever}: about ${money(m.roi.scenarios.base?.steady_month.spend)} a month in ad spend, ${money(m.roi.scenarios.base?.year.net)} net over 12 months in the base case (${money(m.roi.scenarios.conservative?.year.net)} to ${money(m.roi.scenarios.optimistic?.year.net)} across the scenarios).` : m.roi_note ?? '')}</p>
  </div>
  <div class="foot">${footer}</div>
</section>
${areas}
${section('8 · Plan', 'The 90-day plan', `<h3>Weeks 1–2</h3>${listHtml(plan.weeks_1_2, false)}<h3>Weeks 3–6</h3>${listHtml(plan.weeks_3_6, false)}<h3>Weeks 7–12</h3>${listHtml(plan.weeks_7_12, false)}`)}
${section(
  '9 · Return',
  'What search ads could return',
  `<p>${esc(m.roi?.lever ?? '')}</p>${roiTable(m)}<p>${esc(feeLine(m))}</p>${stopLoss(m) ? `<p><strong>${esc(stopLoss(m)!)}</strong></p>` : ''}
<h3>Where the numbers come from</h3>${listHtml(m.roi_sources, false)}
<p class="muted">Ranges, not promises: after 90 days, your own tracked calls and jobs replace these estimates. Fixes to your Google profile, website and Instagram are extra upside and are not counted here.</p>`
)}
${section(
  '10 · Sources',
  'Sources and limits',
  `<h3>Data used</h3>${listHtml(sources, false)}${missing.length ? `<h3>Not available this time</h3>${listHtml(missing, false)}` : ''}${m.writeup.cant_see.length ? `<h3>Needs owner access</h3>${listHtml(m.writeup.cant_see, false)}` : ''}<p class="muted">Ratings, followers and rankings change daily; figures are as of the dates above.</p>`
)}
</body></html>`;
}

// ---------------------------------------------------------------------------
// Slides

export const SLIDE_IDS = ['cover', 'glance', 'google', 'social', 'website', 'ads', 'competitors', 'keywords', 'plan', 'roi', 'next'] as const;

export function buildDeckHtml(d: ReportData, links: { audit: string }): string {
  const { facts: f, model: m, brand: b } = d;
  const auditLink = driveLink(links.audit);
  const slide = (id: string, n: number, title: string, body: string) =>
    `<section class="slide" id="${id}"><header class="band"><span>${esc(title)}</span>${logoImg(b, 'mini')}</header><div class="body" data-fit>${body}</div><footer>${esc(f.business.name)} · Prepared by ${PREPARED_BY} · ${esc(d.date)}<span>${n}</span></footer></section>`;

  const areaSlides = AREAS.map((k, i) => {
    const a = m.writeup.areas[k];
    return slide(
      k,
      i + 3,
      AREA_TITLES[k],
      `${a.summary ? `<p class="lead">${esc(a.summary)}</p>` : ''}<div class="cols"><div><h3>Working</h3>${listHtml(a.working.slice(0, 3)) || '<p class="muted">Nothing stood out.</p>'}</div><div><h3>Costing you</h3>${listHtml(a.costing.slice(0, 3)) || '<p class="muted">Nothing stood out.</p>'}</div></div>${a.fixes.length ? `<h3>Fix first</h3>${listHtml(a.fixes.slice(0, 2))}` : ''}`
    );
  }).join('');

  const plan = m.writeup.plan;
  const roiRows = scenarioRows(m)
    .map(({ key, label, r }) => `<tr${key === 'base' ? ' class="base"' : ''}><td>${label}</td><td>${money(r.steady_month.spend)}</td><td>${num(r.steady_month.leads)}</td><td>${money(r.year.net)}</td></tr>`)
    .join('');

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(f.business.name)} - Marketing Audit Slides</title><style>
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
<section class="slide band cover" id="cover">${logoImg(b, '')}<h1>${esc(f.business.name)}</h1><div class="sub">Marketing audit · Prepared by ${PREPARED_BY} · ${esc(d.date)}</div></section>
${slide('glance', 2, 'At a glance', `<p class="lead"><strong>${esc(m.writeup.headline)}</strong></p><p>${esc(m.writeup.verdict)}</p>${kpiHtml(kpis(f, m))}`)}
${areaSlides}
${slide('plan', 9, 'The 90-day plan', `<div class="cols" style="grid-template-columns:1fr 1fr 1fr"><div><h3>Weeks 1–2</h3>${listHtml(plan.weeks_1_2.slice(0, 3))}</div><div><h3>Weeks 3–6</h3>${listHtml(plan.weeks_3_6.slice(0, 3))}</div><div><h3>Weeks 7–12</h3>${listHtml(plan.weeks_7_12.slice(0, 3))}</div></div>`)}
${slide(
  'roi',
  10,
  'What search ads could return',
  roiRows
    ? `<table><thead><tr><th>Scenario</th><th>Monthly ad spend</th><th>Leads a month</th><th>12-month net</th></tr></thead><tbody>${roiRows}</tbody></table><p style="margin-top:30px">${esc(feeLine(m))}</p>${stopLoss(m) ? `<p data-trim>${esc(stopLoss(m)!)}</p>` : ''}<p class="muted" data-trim>Ranges, not promises. Sources are in the full audit.</p>`
    : `<p>${esc(m.roi_note ?? 'No return was modeled.')}</p>`
)}
${slide(
  'next',
  11,
  'Next steps',
  `${listHtml(m.writeup.next_steps)}<p class="cta" style="margin-top:50px"><a href="${esc(auditLink)}">Full audit (PDF)</a></p>`
)}
</body></html>`;
}

// ---------------------------------------------------------------------------
// One-page summary

export function buildSummaryHtml(d: ReportData, links: { deck: string; audit: string; folder: string }): string {
  const { facts: f, model: m, brand: b } = d;
  const deck = driveLink(links.deck);
  const audit = driveLink(links.audit);
  const folder = driveLink(links.folder);
  const findings = (['google', 'social', 'website', 'ads', 'keywords'] as AreaKey[])
    .map((k) => ({ k, text: m.writeup.areas[k].costing[0] || m.writeup.areas[k].summary }))
    .filter((x) => x.text);
  const roiRows = scenarioRows(m)
    .map(({ key, label, r }) => `<tr${key === 'base' ? ' class="base"' : ''}><td>${label}</td><td>${money(r.steady_month.spend)}/mo</td><td>${money(r.year.net)}</td></tr>`)
    .join('');

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(f.business.name)} - Marketing Audit Summary</title><style>
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
table{font-size:9pt}
td,th{padding:4px 6px}
.sheet>footer{position:absolute;left:0.5in;right:0.5in;bottom:0.35in;border-top:1px solid #e5e7eb;padding-top:6px;font-size:8.5pt;display:flex;gap:18px}
</style></head><body><div class="sheet">
<header class="band"><div><h1>${esc(f.business.name)}</h1><div class="muted">Marketing audit summary · Prepared by ${PREPARED_BY} · ${esc(d.date)}</div></div>${logoImg(b, '')}</header>
<div class="body" data-fit>
<p class="headline">${esc(m.writeup.headline)}</p>
<p>${esc(m.writeup.verdict)}</p>
${kpiHtml(kpis(f, m))}
<h3>Five findings</h3>
<ul class="findings">${findings.map(({ k, text }) => `<li data-trim><strong>${AREA_TITLES[k]}:</strong> ${esc(text)}<a href="${esc(deck)}">Slides ›</a></li>`).join('')}</ul>
<h3>What search ads could return</h3>
${roiRows ? `<table><thead><tr><th>Scenario</th><th>Ad spend</th><th>12-month net</th></tr></thead><tbody>${roiRows}</tbody></table><p class="muted">${esc(feeLine(m))}</p>` : `<p class="muted">${esc(m.roi_note ?? '')}</p>`}
<h3>Next 90 days</h3>
${listHtml(m.writeup.next_steps)}
</div>
<footer><a href="${esc(deck)}">Slides (PDF)</a><a href="${esc(audit)}">Full audit (PDF)</a><a href="${esc(folder)}">All files (Google Drive)</a></footer>
</div></body></html>`;
}
