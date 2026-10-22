import { SCENARIOS } from '../../../packages/groundswell/src/config.js';
import { escapeHtml as esc } from '../http.js';
import type { AdsetsOutput } from './adsets.js';
import type { Brand } from './brand.js';
import type { GaData, GoogleAdsData, GscData, LinkedOutput, MetaAdsData } from './currents/linked.js';
import type { IntegratedOutput, Opportunity } from './integrated.js';
import { baseCss, linkedTables, logoImg, money, NEW_WAVE_PREPARER, num, ownWording, preparedBy, preparerLogo, table, type Preparer } from './reports.js';

/**
 * The integrated plan PDF (phase 3, Letter, the client's brand), in the shape
 * of New Wave's hand-made client reports: what the business's own accounts
 * show over the window, the searches behind its Google ads, the keyword map
 * with a verdict for each search, the findings and next steps, the ad sets
 * re-priced on its own figures, and where every figure comes from (verified,
 * derived, unavailable).
 */

export interface IntegratedReportData {
  business: string;
  brand: Brand;
  date: string;
  integrated: IntegratedOutput;
  linked: LinkedOutput;
  adsets: AdsetsOutput | null;
  preparer?: Preparer;
}

const VERDICT_WORDS: Record<Opportunity['verdict'], string> = { buy: 'Buy', test: 'Test', 'exact only': 'Exact only', content: 'Content, not ads', exclude: 'Exclude' };

function tiles(l: LinkedOutput) {
  const data = <T>(service: string) => (l.services.find((s) => s.service === service && s.ok)?.data ?? null) as T | null;
  const out: { v: string; l: string }[] = [];
  const ga = data<GaData>('google_analytics');
  if (ga) out.push({ v: num(ga.totals.sessions), l: 'Sessions (Google Analytics)' });
  const gsc = data<GscData>('google_search_console');
  if (gsc) out.push({ v: num(gsc.totals.clicks), l: `Search clicks (Search Console), average position ${num(gsc.totals.position, 1)}` });
  const ads = data<GoogleAdsData>('googleads');
  if (ads) out.push({ v: money(ads.totals.cost), l: `Google Ads spend, ${num(ads.totals.clicks)} clicks` });
  const meta = data<MetaAdsData>('metaads');
  if (meta?.totals) out.push({ v: money(meta.totals.spend), l: `Meta ads spend, ${num(meta.totals.leads)} leads` });
  return out.slice(0, 4);
}

export function buildIntegratedHtml(d: IntegratedReportData): string {
  const { brand: b, integrated: x, linked: l } = d;
  const who = d.preparer ?? NEW_WAVE_PREPARER;
  const period = x.window ? `${x.window.start} to ${x.window.end}` : 'the last 30 days';
  const footer = `${esc(d.business)} · Integrated plan · ${preparedBy(who)} · ${esc(d.date)}`;
  const section = (kicker: string, title: string, body: string) =>
    `<section class="page"><div class="kicker">${esc(kicker)}</div><h2>${esc(title)}</h2>${body}<div class="foot">${footer}</div></section>`;

  const cover = `<section class="page cover"><div class="band">${logoImg(b, '')}<h1>${esc(d.business)}</h1>
<div class="muted">Integrated plan · Phase 3 · the business’s own accounts, ${esc(period)} · ${preparedBy(who)}${preparerLogo(who)} · ${esc(d.date)}</div></div>
<div class="inner">${x.writeup.headline ? `<p class="lead">${esc(x.writeup.headline)}</p>` : ''}
<div class="kpis">${tiles(l).map((t) => `<div class="kpi"><div class="v">${esc(t.v)}</div><div class="l">${esc(t.l)}</div></div>`).join('')}</div>
${x.writeup.findings.length ? `<h3>Findings</h3><ol class="findings">${x.writeup.findings.map((f) => `<li><b>${esc(f.title)}.</b> ${esc(f.text)}</li>`).join('')}</ol>` : ''}
${x.writeup.next_steps.length ? `<div class="next"><div class="kicker">Next steps</div><ol>${x.writeup.next_steps.map((s) => `<li><b>${esc(s.title)}.</b> ${esc(s.text)}</li>`).join('')}</ol></div>` : ''}
</div><div class="foot">${footer}</div></section>`;

  const accounts = section('The business’s own accounts', `What the accounts show, ${period}`, linkedTables(l) || '<p class="muted">No account could be read.</p>');

  const t = x.search_terms;
  const terms = t
    ? section(
        'Google Ads',
        'What people searched before seeing an ad',
        `<p>${num(t.totals.clicks)} clicks for ${money(t.totals.cost)} across the visible search terms, ${num(t.totals.conversions, 1)} conversions as the account counts them. Terms that spent without converting cost ${money(t.wasted_cost)}.</p>
${t.converting.length ? `<h3>Searches that converted</h3>${table(['Search', 'Clicks', 'Spend', 'Conversions'], t.converting.map((s) => [s.term, num(s.clicks), money(s.cost), num(s.conversions, 1)]))}` : ''}
${t.wasted.length ? `<h3>Searches that spent without converting</h3>${table(['Search', 'Campaign', 'Clicks', 'Spend'], t.wasted.map((s) => [s.term, s.campaign ?? '–', num(s.clicks), money(s.cost)]))}<p class="note">Google shows search terms only above a privacy threshold, so these are the visible ones.</p>` : ''}`
      )
    : '';

  const buckets = [...new Set(x.opportunities.map((o) => o.bucket))];
  const map = x.opportunities.length
    ? section(
        'Keyword Planner',
        'Keyword opportunity map',
        `${buckets
          .map(
            (bucket) =>
              `<h3>${esc(bucket)}</h3>${table(
                ['Keyword', 'Searches / mo', 'Competition', 'Top-of-page bid', 'Verdict', 'Why'],
                x.opportunities
                  .filter((o) => o.bucket === bucket)
                  .map((o) => [
                    o.keyword,
                    num(o.monthly_searches),
                    o.competition ? o.competition.toLowerCase() : '–',
                    o.low_bid_usd !== null && o.high_bid_usd !== null ? `$${o.low_bid_usd.toFixed(2)} – ${o.high_bid_usd.toFixed(2)}` : '–',
                    VERDICT_WORDS[o.verdict],
                    o.reason,
                  ])
              )}`
          )
          .join('')}<p class="note">Bids are Google’s low and high top-of-page estimates, not actual costs. Verdicts are our classification of each search’s intent.</p>`
      )
    : '';

  const s = d.adsets?.sets;
  const plan = s
    ? section(
        'The plan on the business’s own figures',
        'Ad sets, re-priced',
        `${x.repricing.notes.length ? `<ul>${x.repricing.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
${table(
  ['Budget', 'Monthly spend', 'Daily', 'Monthly net (modeled sets)', '12-month net', 'ROI on that spend'],
  SCENARIOS.map((sc) => [`${sc[0].toUpperCase()}${sc.slice(1)} budget`, money(s.totals[sc].monthly), `$${s.totals[sc].daily.toFixed(2)}`, money(s.totals[sc].net), money(s.totals[sc].year_net), s.totals[sc].roi === null ? 'not modeled' : `${Math.round(s.totals[sc].roi! * 100)}%`])
)}
<p class="note">Every set, its ads, keywords and import files are in the Ad sets report and downloads.</p>`
      )
    : '';

  const verified = x.services.filter((v) => v.ok).map((v) => v.source);
  const unavailable = x.services.filter((v) => !v.ok).map((v) => `${v.label}${v.problem ? `: ${v.problem}` : ''}`);
  const sources = section(
    'Sources and confidence',
    'Where every figure comes from',
    `<p><span class="tag ok">Verified</span> ${verified.map(esc).join('; ') || 'none'}.</p>
<p><span class="tag derived">Derived</span> Intent buckets and verdicts (our classification), the re-priced plan (${esc(x.repricing.notes.join(' ') || 'published figures')}).</p>
${unavailable.length ? `<p><span class="tag na">Unavailable</span> ${unavailable.map(esc).join('; ')}.</p>` : ''}
${x.dropped.length ? `<p class="note">${x.dropped.length} sentence${x.dropped.length === 1 ? ' was' : 's were'} left out because a figure in ${x.dropped.length === 1 ? 'it' : 'them'} was not in the data.</p>` : ''}`
  );

  return ownWording(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(d.business)} - Integrated plan</title><style>
${baseCss(b)}
@page{size:Letter;margin:0}
.page{width:8.5in;min-height:11in;padding:0.6in 0.6in 0.8in;position:relative;page-break-after:always;font-size:9.5pt;line-height:1.45}
.page:last-child{page-break-after:auto}
.cover{padding:0;display:flex;flex-direction:column}
.cover .band{padding:0.7in 0.6in 0.5in}
.cover .inner{padding:0.35in 0.6in 0.8in}
.cover h1{font-size:28pt;margin:12px 0 6px}
.cover .logo{max-height:64px;max-width:240px;background:#fff;border-radius:8px;padding:6px}
.lead{font-size:12pt;margin-bottom:6px}
.kicker{font-size:8.5pt;letter-spacing:.08em;text-transform:uppercase;color:#4b5563;margin-bottom:4px}
h2{font-size:19pt;margin-bottom:12px}
h3{font-size:11pt;margin:12px 0 4px}
p{margin:4px 0}
table{margin:6px 0;font-size:8.3pt}
td,th{padding:4px 6px;word-break:break-word}
.kpis{gap:10px;margin:14px 0}
.kpi{padding:12px}
.kpi .v{font-size:16pt}
.kpi .l{font-size:8.3pt}
.findings li,.next li{margin:4px 0}
.next{margin-top:12px;background:${b.primary};color:${b.onPrimary};border-radius:10px;padding:12px 16px}
.next .kicker{color:${b.onPrimary};opacity:.85}
ol{padding-left:1.3em}
.tag{display:inline-block;font-size:7.5pt;letter-spacing:.06em;text-transform:uppercase;border-radius:4px;padding:1px 6px;margin-right:4px}
.tag.ok{background:#e0f2f1;color:#0f5132}.tag.derived{background:#fff3cd;color:#664d03}.tag.na{background:#e5e7eb;color:#374151}
.note{font-size:8pt;color:#4b5563}
.foot{position:absolute;left:0.6in;right:0.6in;bottom:0.35in;font-size:8pt;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:6px}
</style></head><body>${cover}${accounts}${terms}${map}${plan}${sources}</body></html>`,
    who
  );
}
