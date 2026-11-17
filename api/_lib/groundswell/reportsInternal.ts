import { escapeHtml as esc } from '../http.js';
import type { Brand } from './brand.js';
import type { Facts } from './model.js';
import { listHtml, NEW_WAVE_PREPARER, num, ownWording, preparedBy, table, type Preparer } from './reports.js';
import { framePage, houseCss, numberPages, pageFoot, pageHead, pill, siteLabel, type Frame } from './reportFrame.js';
import { COPY_LIMITS, NEAR_MISS, pathOf, type CopyChange, type TargetKeyword, type VisibilityOutput } from './visibility.js';

/**
 * The internal visibility brief (Letter, the house frame): the keywords to
 * work on with the searches in each, the copy to paste, the fixes that raise
 * visibility at once, and the first month. For the team and the partner, not
 * the client: every page says so, and staff-only notes (an audience that may
 * be bought, say) are here and never in the client's plan.
 */

export interface InternalReportData {
  facts: Facts;
  brand: Brand;
  date: string;
  visibility: VisibilityOutput;
  preparer?: Preparer;
}

export const INTERNAL_BANNER = 'Internal: for the team, not the client';

const FIELD_WORDS: Record<CopyChange['field'], string> = { title: 'Title tag', meta_description: 'Meta description', h1: 'Main heading (H1)', intro: 'Opening paragraph', faq: 'FAQ' };
const FIELD_LIMIT: Partial<Record<CopyChange['field'], number>> = { title: COPY_LIMITS.title, meta_description: COPY_LIMITS.meta_description, h1: COPY_LIMITS.h1 };
const AREA_WORDS: Record<string, string> = { website: 'Website', google: 'Google listing', social: 'Social', ai: 'AI search', tracking: 'Tracking', search: 'Search' };
const NONE = '–';

/** Bids in dollars and cents: most top-of-page bids are under $5, where whole dollars read as $0. */
const cents = (x: number | null) => (x === null ? '?' : `$${x.toFixed(2)}`);
const bids = (k: TargetKeyword) => (k.low_bid_usd === null && k.high_bid_usd === null ? NONE : `${cents(k.low_bid_usd)}–${cents(k.high_bid_usd)}`);
const searches = (k: TargetKeyword) => (k.searches === null ? 'not measured' : num(k.searches));
const page = (url: string | null) => (url ? pathOf(url) : 'New page');
/** An action without its "Staff only:" lead (the brief marks staff items itself), as a sentence. */
const doText = (action: string) => {
  const s = action.replace(/^Staff only:\s*/, '');
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export function buildInternalHtml(d: InternalReportData): string {
  const { facts: f, brand: b, visibility: v } = d;
  const who = d.preparer ?? NEW_WAVE_PREPARER;
  const frame: Frame = { who, client: { name: f.business.name, brand: b }, report: 'Internal visibility brief', site: siteLabel(f.business.website), date: d.date };
  const section = (kicker: string, title: string, body: string) => framePage(frame, `${kicker} · Internal`, title, body);
  const by = (kind: TargetKeyword['kind']) => v.keywords.filter((k) => k.kind === kind);
  const near = by('near_miss');
  const gaps = by('gap');
  const protect = by('protect');
  const ideas = by('idea');
  const gapSearches = gaps.reduce((a, k) => a + (k.searches ?? 0), 0);
  const nearSearches = near.reduce((a, k) => a + (k.searches ?? 0), 0);
  const staff = v.quick_wins.filter((w) => !w.client);

  const tiles = [
    { l: 'Searches a month in the gaps', v: v.demand === 'measured' ? num(gapSearches) : 'not measured' },
    { l: `Near misses (positions ${NEAR_MISS.from}–${NEAR_MISS.to})`, v: `${num(near.length)} · ${num(nearSearches)} a month` },
    { l: 'Copy ready to paste', v: `${num(v.copy.length)} fields` },
    { l: 'Fixes for the first month', v: num(v.quick_wins.length) },
  ];
  const cover = `<section class="page cover">${pageHead(frame)}<div class="body">
<div class="kicker">${esc(INTERNAL_BANNER)} · ${esc(d.date)} · ${preparedBy(who)}</div>
<h1>Where ${esc(f.business.name)} can be found, and what to change first</h1>
<p class="lede">The keywords worth working on and the searches in each, the copy to paste, and the fixes that raise visibility in the first month. The client’s 90-day plan carries the first month’s client-facing items; this brief carries the evidence behind them.</p>
<div class="kpis">${tiles.map((t) => `<div class="kpi"><div class="l">${esc(t.l)}</div><div class="v">${esc(t.v)}</div></div>`).join('')}</div>
<div class="callout amber"><h3>Market read</h3><p>${esc(v.market ? `Keyword demand: ${v.market}.` : 'Keyword demand: no market could be read.')} ${v.demand === 'measured' ? 'Searches are Keyword Planner’s monthly averages; near misses and rankings are Ahrefs’ US estimates.' : 'Keyword Planner measured nothing for this run, so the gaps are empty and the ideas are unmeasured; near misses and rankings are Ahrefs’ US estimates.'}</p></div>
${staff.length ? `<div class="callout-dark"><div class="kicker">Staff only</div>${staff.map((w) => `<p><strong>${esc(w.title)}.</strong> ${esc(w.evidence)} ${esc(doText(w.action))}</p>`).join('')}</div>` : ''}
</div>${pageFoot(frame)}</section>`;

  const kwTable = (rows: TargetKeyword[], withRank: boolean) =>
    table(
      withRank ? ['Keyword', 'Searches a month', 'Position', 'Page'] : ['Keyword', 'Searches a month', 'Top-of-page bid', 'Competition', 'Page to use'],
      rows.map((k) => (withRank ? [k.keyword, searches(k), num(k.position), page(k.page)] : [k.keyword, searches(k), bids(k), k.competition?.toLowerCase() ?? NONE, page(k.page)]))
    );
  const keywords = section(
    '1 · Keywords',
    'The keywords to use, and the searches in them',
    `${near.length ? `<h3>Near misses: already ranking ${NEAR_MISS.from}–${NEAR_MISS.to}</h3><p class="muted">The fastest gains: the page is in the results already; a better answer moves it up.</p>${kwTable(near, true)}` : ''}
${gaps.length ? `<h3>Gaps: searched, not ranking</h3><p class="muted">Measured demand the site does not rank for. “New page” means no page read covers it.</p>${kwTable(gaps, false)}` : ''}
${protect.length ? `<h3>Protect: ranking 1–3</h3>${kwTable(protect, true)}` : ''}
${ideas.length ? `<h3>Ideas, not measured</h3><p class="muted">Suggestions without a measured volume; check them in Keyword Planner before building pages.</p>${table(['Keyword', 'Page to use'], ideas.map((k) => [k.keyword, page(k.page)]))}` : ''}
${!v.keywords.length ? '<p>No keyword could be read for this run: neither Keyword Planner nor Ahrefs answered with the site’s searches.</p>' : ''}`
  );

  const copyPages = [...new Set(v.copy.map((c) => c.page))];
  const copyBody = copyPages.length
    ? copyPages
        .map((p) => {
          const rows = v.copy.filter((c) => c.page === p);
          const kw = rows.find((c) => c.keyword)?.keyword;
          const fields = rows.filter((c) => c.field !== 'faq');
          const faqs = rows.filter((c) => c.field === 'faq');
          return `<h3>${esc(pathOf(p))}${kw ? ` ${pill(kw, 'cyan')}` : ''}</h3>${
            fields.length ? `<div class="copy">${table(['Field', 'Now', 'Paste this', 'Length'], fields.map((c) => [FIELD_WORDS[c.field], c.current ?? 'None', c.proposed, FIELD_LIMIT[c.field] ? `${c.proposed.length} / ${FIELD_LIMIT[c.field]}` : `${c.proposed.split(' ').length} words`]))}</div>` : ''
          }${faqs.length ? table(['Question', 'Answer'], faqs.map((c) => [c.question ?? '', c.proposed])) : ''}`;
        })
        .join('')
    : '<p>No copy was written for this run.</p>';
  const copy = section(
    '2 · Copy',
    'Copy to add, ready to paste',
    `<p class="muted">${esc(
      v.copy_source === 'model'
        ? 'Written from each page’s own words and held to the limits search results show, the data’s numbers and the claim rules (no health claims, no “best”). Read it against the product before it goes live.'
        : v.copy_source === 'template'
          ? 'Titles from a template (the keyword first, the brand last): the writer did not run. Descriptions and headings are still to write.'
          : 'No copy: no page read had content to write for.'
    )}</p>${copyBody}${v.dropped.length ? `<h3>Left out</h3>${listHtml(v.dropped.slice(0, 8), false)}` : ''}`
  );

  const fixes = section(
    '3 · Fixes',
    'What improves visibility at once',
    v.quick_wins.length
      ? `<div class="fixes">${table(['Week', 'Area', 'Fix', 'Why', 'Do'], v.quick_wins.map((w) => [String(w.week), AREA_WORDS[w.area] ?? w.area, `${w.title}${w.client ? '' : ' (staff only)'}`, w.evidence, doText(w.action)]))}</div>`
      : '<p>The data calls for no fix beyond the copy.</p>'
  );

  const month = section(
    '4 · First month',
    'The first month, week by week',
    `<p class="muted">Items marked “client” lead the Weeks 1–2 and Weeks 3–6 lists in the client’s 90-day plan; the rest are staff work or notes.</p>${v.month
      .map((m) => `<h3>Week ${m.week}</h3>${m.items.length ? `<ul>${m.items.map((it) => `<li>${esc(it)}${v.quick_wins.some((w) => !w.client && it.startsWith(w.title)) ? '' : ` ${pill('client', 'slate')}`}</li>`).join('')}</ul>` : '<p class="muted">Nothing new this week: finish the weeks before it.</p>'}`)
      .join('')}`
  );

  const sources = section(
    '5 · Sources',
    'Sources and limits',
    `<h3>Data used</h3>${listHtml(v.sources, false)}${v.note ? `<p class="muted">${esc(v.note)}</p>` : ''}<p class="muted">Searches are monthly averages and rankings are estimates for the dates above; they move week to week. Nothing here is a promise of a ranking or of sales.</p>`
  );

  return numberPages(
    ownWording(
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(f.business.name)} - Internal Visibility Brief</title><style>
${houseCss(b)}
td{font-size:8.6pt}
.fixes th:nth-child(1),.fixes td:nth-child(1){width:7%}
.fixes th:nth-child(2),.fixes td:nth-child(2){width:11%;overflow-wrap:normal}
.fixes th:nth-child(3),.fixes td:nth-child(3){width:20%}
.copy th:nth-child(1),.copy td:nth-child(1){width:16%;overflow-wrap:normal}
.copy th:nth-child(2),.copy td:nth-child(2){width:28%}
.copy th:nth-child(4),.copy td:nth-child(4){width:9%;white-space:nowrap}
</style></head><body>
${cover}${keywords}${copy}${fixes}${month}${sources}
</body></html>`,
      who
    )
  );
}
