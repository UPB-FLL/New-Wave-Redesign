import { GOOGLE_STATUS_WORDS, META_STATUS_WORDS, type EngagementItem } from '../../../packages/groundswell/src/benchmark/index.js';
import { GROUNDSWELL_CONFIG } from '../../../packages/groundswell/groundswell.config.js';
import { escapeHtml as esc } from '../http.js';
import type { BenchmarkOutput } from './benchmark.js';
import type { Brand } from './brand.js';
import type { Facts } from './model.js';
import { baseCss, listHtml, logoImg, num, PREPARED_BY, table } from './reports.js';

/**
 * The competitive benchmark PDF (Letter, the client's brand): the business
 * against its top competitors. No links at all (render.ts still checks every
 * link is Google Drive). Every figure comes from a step output; spend is never
 * shown, only presence, dates and creative.
 */

export interface BenchmarkReportData {
  facts: Facts;
  brand: Brand;
  date: string;
  benchmark: BenchmarkOutput;
}

const pct = (x: number | null | undefined) => (x === null || x === undefined ? 'not checked' : `${(x * 100).toFixed(2)}%`);
const TYPE_WORDS: Record<EngagementItem['type'], string> = { carousel: 'Carousel', image: 'Image', reel: 'Reel', video: 'Video' };
const TIER_WORDS: Record<string, string> = {
  free: 'Free', low_ticket: 'Entry product', membership: 'Membership', private_small: 'Small group or short private', core: 'Main offer', retention: 'After the main offer', unknown: 'Other',
};
const PIXEL_WORDS = { meta: 'Meta', google_ads: 'Google Ads', tiktok: 'TikTok' } as const;
const AREA_WORDS: Record<string, string> = { offers: 'Offers', content: 'Content', authority: 'Authority', conversion: 'Conversion' };

export function buildBenchmarkHtml(d: BenchmarkReportData): string {
  const { facts: f, brand: b, benchmark: x } = d;
  const w = x.writeup;
  const footer = `${esc(f.business.name)} · Competitive benchmark · Prepared by ${PREPARED_BY} · ${esc(d.date)}`;
  const section = (kicker: string, title: string, body: string) =>
    `<section class="page"><div class="kicker">${esc(kicker)}</div><h2>${esc(title)}</h2>${body}<div class="foot">${footer}</div></section>`;
  const [own] = x.accounts;

  const tiles = [
    { v: pct(own.engagement?.engagement_rate_median), l: `Engagement rate${x.bands[0] ? ` · ${x.bands[0]}` : ''}` },
    { v: num(own.authority?.domain_rating ?? null), l: 'Domain rating (Ahrefs)' },
    { v: num(own.authority?.organic_traffic ?? null), l: 'Monthly organic visits (Ahrefs estimate)' },
    { v: num(own.engagement?.cadence_per_week ?? null, 1), l: 'Posts per week' },
  ];
  const cover = `<section class="page cover">
  <div class="band">${logoImg(b, '')}<h1>${esc(f.business.name)}</h1><div class="muted">Competitive benchmark against ${esc(x.names.slice(1).join(' and '))} · Prepared by ${PREPARED_BY} · ${esc(d.date)}</div></div>
  <div class="inner"><p>${esc(w.verdict)}</p>
  <div class="kpis">${tiles.map((t) => `<div class="kpi"><div class="v">${esc(t.v)}</div><div class="l">${esc(t.l)}</div></div>`).join('')}</div></div>
  <div class="foot">${footer}</div></section>`;

  const leaderName = (l: number | 'even' | null) => (l === null ? 'Not enough data' : l === 'even' ? 'Even' : x.names[l]);
  const scorecard = section(
    '2 · Scorecard',
    'Where each account stands',
    `${table(['', ...x.names, 'Leader'], x.scorecard.map((r) => [r.label, ...r.shown, leaderName(r.leader)]))}
<p class="muted">Engagement rate is the median of likes plus comments over followers, on posts with visible likes; bands are ${esc(GROUNDSWELL_CONFIG.benchmark.engagement_bands.source)}. Reel plays are cumulative, so older reels are not comparable with newer ones.</p>`
  );

  const earns = section(
    '3 · Engagement',
    'How each account earns its engagement',
    `<div class="cols3">${w.earns_engagement
      .map((e, i) => {
        const a = x.accounts[i]?.engagement;
        const stats = a
          ? [`${num(a.items_n)} posts and reels read`, `Comments per post (median): ${num(a.comments_median, 1)}`, `Comment-to-DM prompts: ${num(a.cta_items_n)}`]
          : ['Posts could not be read'];
        return `<div><h3>${esc(e.name)}</h3>${listHtml(stats, false)}${listHtml(e.points, false)}</div>`;
      })
      .join('')}</div>`
  );

  const ads = section(
    '4 · Ads',
    'Who is paying for reach',
    `${table(
      ['', 'Meta (Ad Library)', 'Meta ads on record', 'Google (Transparency Center)', 'Pixels on the site'],
      x.ads.map((a, i) => [
        x.names[i],
        a ? META_STATUS_WORDS[a.meta_ad_status] : 'Could not be determined',
        a ? `${num(a.meta_ads.filter((m) => m.active).length)} running, ${num(a.meta_ads_inactive_n)} ended` : '–',
        a ? GOOGLE_STATUS_WORDS[a.google_ads_status] : 'Could not be determined',
        a ? (Object.entries(a.pixels).filter(([, on]) => on).map(([k]) => PIXEL_WORDS[k as keyof typeof PIXEL_WORDS]).join(', ') || 'None found') : '–',
      ])
    )}
${x.ads
  .flatMap((a, i) => (a?.meta_ads ?? []).slice(0, 4).map((m) => `${x.names[i]}: ${m.active ? 'running' : 'ended'} ad from ${m.started ?? 'an unknown date'} on ${m.platforms.join(', ') || 'Meta'}: “${m.body_excerpt}”`))
  .map((line) => `<p class="note">${esc(line)}</p>`)
  .join('')}
<p class="muted">${esc(x.spend_note)} Ahrefs’ paid-search figures are its estimate of traffic value, not spend.</p>`
  );

  const ladders = x.accounts
    .map((a) => {
      if (!a.ladder) return `<h3>${esc(a.name)}</h3><p class="muted">Prices could not be read.</p>`;
      const rows = a.ladder.offers.map((o) => [TIER_WORDS[o.tier] ?? o.tier, o.name, o.context, o.url]);
      const policy = [
        a.ladder.prices_published ? null : 'No prices are published on the pages read.',
        a.ladder.refunds === 'none' ? 'Sales are non-refundable.' : a.ladder.refunds === 'window' ? 'Refunds within a stated window.' : null,
        a.ladder.accepts_insurance === false ? 'Does not take insurance.' : a.ladder.accepts_insurance ? 'Takes insurance.' : null,
        a.ladder.payment_plans ? 'Payment plans offered.' : null,
        a.ladder.free_consult ? 'Free consult or call.' : null,
        a.ladder.lead_magnets.length ? `Free offers: ${a.ladder.lead_magnets.join(', ')}.` : null,
      ].filter((s): s is string => Boolean(s));
      return `<h3>${esc(a.name)}</h3>${rows.length ? table(['Tier', 'Offer', 'Price as published', 'Page'], rows) : '<p class="muted">No offers found on the pages read.</p>'}${listHtml(policy, false)}`;
    })
    .join('');
  const pricing = section(
    '5 · Pricing',
    'Offers and prices, as published',
    `${ladders}<h3>Why one converts</h3><p>${esc(w.pricing.summary)}</p>${listHtml(w.pricing.why_one_converts, false)}${w.pricing.what_to_change.length ? `<h3>What to change</h3>${listHtml(w.pricing.what_to_change, false)}` : ''}`
  );

  const differences = section(
    '6 · Differences',
    'The differences that close the gap',
    table(['#', 'Change', 'Now', 'Competitor', 'Do this', '90-day target'], w.differences.map((r) => [String(r.rank), r.title, r.now, r.competitor, r.change, r.target]))
  );

  const avoid = section('7 · Do not copy', 'What not to copy', `<p>Some of what works for a competitor is risky for this business.</p>${listHtml(w.do_not_copy, false)}`);

  const plan = section(
    '8 · Plan',
    'The plan, by area, and 90-day targets',
    `${w.plan
      .filter((p) => p.items.length)
      .map((p) => `<h3>${esc(AREA_WORDS[p.area])}</h3>${table(['#', 'Change', 'Now', 'Do this', 'Why', 'Target'], p.items.map((i) => [String(i.rank), i.title, i.now, i.change, i.why, i.target]))}`)
      .join('')}${w.targets.length ? `<h3>90-day targets</h3>${table(['Measure', 'Today', 'Day 90', 'Lever'], w.targets.map((t) => [t.metric, t.today, t.day_90, t.lever]))}` : ''}`
  );

  const appendixA = section(
    'Appendix A',
    'Every post and reel read',
    x.accounts
      .map((a) =>
        a.engagement
          ? `<h3>${esc(a.name)} (@${esc(a.engagement.handle)})</h3>${table(
              ['Date', 'Type', 'Likes', 'Comments', 'Plays', 'Opening words'],
              a.engagement.items.map((i) => [
                i.date.slice(0, 10) + (i.pinned ? ' (pinned)' : ''),
                TYPE_WORDS[i.type],
                i.likes_hidden ? 'hidden' : num(i.likes),
                num(i.comments),
                i.plays === null ? '–' : `${num(i.plays)} (${num(i.age_days)} days old)`,
                i.hook,
              ])
            )}`
          : `<h3>${esc(a.name)}</h3><p class="muted">Posts could not be read.</p>`
      )
      .join('')
  );

  const appendixB = section(
    'Appendix B',
    'Prices as published',
    x.accounts
      .map((a) => `<h3>${esc(a.name)}</h3>${a.ladder?.mentions.length ? table(['Price', 'Context', 'Page'], a.ladder.mentions.map((m) => [m.text, m.context, m.url])) : '<p class="muted">No prices found.</p>'}`)
      .join('')
  );

  const method = [
    'Instagram: one page of posts and one page of reels per account (ScrapeCreators). Likes an account hides are marked hidden and left out of medians; pinned posts are left out of posts per week; reels per week cover the last 28 days, or fewer when one page of reels does not reach back that far.',
    'Ads: the Meta Ad Library by each Facebook Page’s own id, Google’s Ads Transparency Center, and Ahrefs’ paid-search history. Spend is never shown.',
    `Prices: up to ${GROUNDSWELL_CONFIG.benchmark.pricing_pages_per_account} offer pages per account, read in a headless browser. Offers are sorted into tiers by a model; a price is shown only where a page shows it.`,
    'Authority: Ahrefs domain rating, referring domains (press from a fixed list of media sites), top pages and keywords; the sitemap; the About page.',
    `The write-up (${x.model}) may quote only numbers in this data.`,
  ];
  const assumed = [
    `Engagement bands: ${GROUNDSWELL_CONFIG.benchmark.engagement_bands.source}.`,
    'Offer tiers are a model’s reading of the prices found.',
    'Ahrefs traffic and traffic value are estimates.',
  ];
  const appendixC = section(
    'Appendix C',
    'Method, sources and limits',
    `<h3>Method</h3>${listHtml(method, false)}<h3>Assumed, not measured</h3>${listHtml(assumed, false)}${w.cant_see.length ? `<h3>Needs owner access</h3>${listHtml(w.cant_see, false)}` : ''}${
      x.removed_sentences.length ? `<p class="muted">${num(x.removed_sentences.length)} sentences were removed for quoting figures not in the data.</p>` : ''
    }`
  );

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(f.business.name)} - Competitive benchmark</title><style>
${baseCss(b)}
@page{size:Letter;margin:0}
.page{width:8.5in;min-height:11in;padding:0.6in 0.6in 0.8in;position:relative;page-break-after:always;font-size:10pt;line-height:1.45}
.page:last-child{page-break-after:auto}
.cover{padding:0;display:flex;flex-direction:column}
.cover .band{padding:0.7in 0.6in 0.5in}
.cover .inner{padding:0.4in 0.6in 0.8in}
.cover h1{font-size:28pt;margin:12px 0 6px}
.cover .logo{max-height:64px;max-width:240px;background:#fff;border-radius:8px;padding:6px}
.kicker{font-size:9pt;letter-spacing:.08em;text-transform:uppercase;color:#4b5563;margin-bottom:4px}
h2{font-size:19pt;margin-bottom:12px}
h3{font-size:11pt;margin:14px 0 4px}
table{margin:8px 0;font-size:8.5pt}
td,th{padding:4px 6px;word-break:break-word}
.kpis{gap:10px;margin:16px 0}
.kpi{padding:12px}
.kpi .v{font-size:17pt}
.kpi .l{font-size:8.5pt}
.cols3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
.note{font-size:8pt;color:#4b5563;margin:2px 0}
.foot{position:absolute;left:0.6in;right:0.6in;bottom:0.35in;font-size:8pt;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:6px}
</style></head><body>
${cover}${scorecard}${earns}${ads}${pricing}${differences}${avoid}${plan}${appendixA}${appendixB}${appendixC}
</body></html>`;
}
