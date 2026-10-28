import { GROUNDSWELL_CONFIG } from '../../../packages/groundswell/groundswell.config.js';
import { PHASE_INFO } from '../../../src/lib/groundswellValidation.js';
import { SCENARIOS, type Scenario } from '../../../packages/groundswell/src/config.js';
import type { GoogleAdGroup, MetaAdSet, OutcomeRange, TierForecast } from '../../../packages/groundswell/src/adsets.js';
import { DATA_SET_WORDS, type AdBasis, type ChannelAdSet } from '../../../packages/groundswell/src/channels.js';
import type { RankedChange } from '../../../packages/groundswell/src/changes.js';
import { escapeHtml as esc } from '../http.js';
import type { AdsetsOutput } from './adsets.js';
import type { Brand } from './brand.js';
import type { Cell } from './files.js';
import { money, NEW_WAVE_PREPARER, num, ownWording, preparedBy, table, type Preparer } from './reports.js';
import { framePage, houseCss, numberPages, pageFoot, pageHead, siteLabel, type Frame } from './reportFrame.js';

/**
 * The ad sets as handed over: the PDF a person reads (what each set is for,
 * how it works, what to watch, its spend and return at three budgets, the
 * ads with their images and the data each rests on, the keywords and
 * negatives, how to import), and the rows of the import files: Meta's bulk
 * sheet (the columns of New Wave's own Wildly Primal import), a sheet of
 * ad-set settings, a forecast sheet, a Google Ads Editor CSV, and the Reddit
 * and TikTok plan (ads, settings, forecast; neither platform takes a bulk
 * file New Wave has checked, so it is a plan to build from or to hand to the
 * platform's sales team). Every number comes from the step's output.
 */

export const META_COLUMNS = [
  'Campaign ID',
  'Campaign Name',
  'Ad Set ID',
  'Ad Set Name',
  'Ad Name',
  'Ad Status',
  'Title',
  'Body',
  'Link Description',
  'Display Link',
  'Link',
  'Call to Action',
  'Image Hash',
  'Image File Name',
  'Creative Type',
  'Link Object ID',
  'Instagram Account ID',
  'URL Tags',
] as const;

/** The ad image file each Meta ad carries, by ad name (the creative step's renders). */
export type CreativeFiles = Record<string, { file: string; bytes?: Uint8Array }>;

/** Meta's bulk sheet: one row per ad, paused, with the ad set and campaign by name (their ids come once they exist). */
export function metaBulkRows(out: AdsetsOutput, files: CreativeFiles, ids: { page?: string | null; instagram?: string | null } = {}): Cell[][] {
  const rows: Cell[][] = [[...META_COLUMNS]];
  for (const set of out.sets.meta) {
    for (const ad of set.ads) {
      rows.push([
        '',
        set.campaign,
        '',
        set.name,
        ad.name,
        'PAUSED',
        ad.headline,
        ad.primary_text,
        ad.description,
        ad.display_link,
        ad.link,
        ad.call_to_action,
        '',
        files[ad.name]?.file ?? '',
        'Link Page Post Ad',
        ids.page ? `o:${ids.page}` : '',
        ids.instagram ? `x:${ids.instagram}` : '',
        '',
      ]);
    }
  }
  return rows;
}

const tierCols = (t: Record<Scenario, TierForecast>, pick: (x: TierForecast) => Cell) => SCENARIOS.map((s) => pick(t[s]));

/** The settings each Meta ad set is created with, at all three budgets. */
export function metaSetupRows(out: AdsetsOutput): Cell[][] {
  const head = [
    'Campaign Name',
    'Campaign Objective',
    'Ad Set Name',
    'Goal',
    'Recommendation',
    'Optimization Goal',
    'Billing Event',
    'Daily Budget (low)',
    'Daily Budget (medium)',
    'Daily Budget (high)',
    'Location',
    'Radius (miles)',
    'Age Min',
    'Age Max',
    'Interests',
    'Placements',
    'Stop-loss',
    'What to watch',
  ];
  return [
    head,
    ...out.sets.meta.map((m) => [
      m.campaign,
      m.objective,
      m.name,
      m.goal,
      m.recommendation,
      m.optimization_goal,
      'IMPRESSIONS',
      ...tierCols(m.tiers, (t) => t.daily),
      m.audience.location,
      m.audience.radius_miles,
      m.audience.age_min,
      m.audience.age_max,
      m.audience.interests.join('; '),
      m.placements.join('; '),
      m.stop_loss ?? '',
      m.kpi,
    ]),
  ];
}

/** Spend and return per set and budget, for anyone checking the arithmetic. */
export function forecastRows(out: AdsetsOutput): Cell[][] {
  const rows: Cell[][] = [['Platform', 'Set', 'Goal', 'Budget', 'Monthly spend', 'Daily budget', 'Clicks', 'Leads', 'Customers', 'Monthly net', '12-month net', 'ROI', 'Note']];
  const add = (platform: string, name: string, goal: string, tiers: Record<Scenario, TierForecast>, modeled: boolean) => {
    for (const s of SCENARIOS) {
      const t = tiers[s];
      rows.push([
        platform,
        name,
        goal,
        s,
        t.monthly,
        t.daily,
        t.clicks,
        modeled ? t.leads : '',
        modeled ? t.customers : '',
        modeled ? t.net : '',
        modeled ? t.year_net : '',
        modeled && t.roi !== null ? t.roi : 'not modeled',
        t.capped ? 'stops at the clicks the area’s searches supply' : '',
      ]);
    }
  };
  for (const m of out.sets.meta) add('Meta', m.name, m.goal, m.tiers, m.modeled);
  for (const g of out.sets.google?.ad_groups ?? []) add('Google Search', g.name, g.goal, g.tiers, g.modeled);
  return rows;
}

const channelSets = (out: AdsetsOutput): ChannelAdSet[] => [...(out.sets.reddit ?? []), ...(out.sets.tiktok ?? [])];
const AVAILABILITY_WORDS: Record<ChannelAdSet['availability'], string> = { self_serve: 'Self-serve', sales_team: 'Through the platform’s sales team' };

/** The Reddit and TikTok ads, one row each, with the data each was written from. */
export function channelAdRows(out: AdsetsOutput, files: CreativeFiles): Cell[][] {
  const rows: Cell[][] = [['Platform', 'Availability', 'Campaign', 'Ad set', 'Ad name', 'Status', 'Headline', 'Text', 'Call to action', 'Words on the image', 'Image file', 'Image size', 'Link', 'Built on', 'Evidence']];
  for (const c of channelSets(out)) {
    for (const ad of c.ads) {
      rows.push([
        c.platform_label,
        AVAILABILITY_WORDS[c.availability],
        c.campaign,
        c.name,
        ad.name,
        'PAUSED',
        ad.headline,
        ad.text,
        ad.call_to_action,
        ad.image_headline,
        files[ad.name]?.file ? `${c.platform}/${files[ad.name].file}` : '',
        ad.format === 'vertical' ? '1080 × 1920' : '1080 × 1350',
        ad.link,
        DATA_SET_WORDS[ad.basis.data],
        ad.basis.evidence,
      ]);
    }
  }
  return rows;
}

/** The settings each Reddit and TikTok set is created with, at all three budgets. */
export function channelSetupRows(out: AdsetsOutput): Cell[][] {
  return [
    ['Platform', 'Availability', 'Platform rule', 'Campaign', 'Ad set', 'Goal', 'Recommendation', 'Daily budget (low)', 'Daily budget (medium)', 'Daily budget (high)', 'Location', 'Age min', 'Communities', 'Interests', 'What to watch', 'Why'],
    ...channelSets(out).map((c) => [
      c.platform_label,
      AVAILABILITY_WORDS[c.availability],
      c.availability_note ?? '',
      c.campaign,
      c.name,
      c.goal,
      c.recommendation === 'sales_team' ? 'sales team' : c.recommendation,
      ...SCENARIOS.map((s) => c.spend[s].daily),
      c.targeting.location,
      c.targeting.age_min,
      c.targeting.communities.join('; '),
      c.targeting.interests.join('; '),
      c.kpi,
      c.why,
    ]),
  ];
}

/** Spend per Reddit and TikTok set and budget; clicks and return only where the platform publishes rates. */
export function channelForecastRows(out: AdsetsOutput): Cell[][] {
  const rows: Cell[][] = [['Platform', 'Set', 'Budget', 'Monthly spend', 'Daily budget', 'Clicks', 'Leads', 'Monthly net', '12-month net', 'ROI', 'Note']];
  for (const c of channelSets(out)) {
    for (const s of SCENARIOS) {
      const t = c.tiers?.[s];
      const modeled = Boolean(t) && c.modeled;
      rows.push([
        c.platform_label,
        c.name,
        s,
        c.spend[s].monthly,
        c.spend[s].daily,
        t ? t.clicks : '',
        modeled ? t!.leads : '',
        modeled ? t!.net : '',
        modeled ? t!.year_net : '',
        modeled && t!.roi !== null ? t!.roi : 'not modeled',
        c.not_modeled ?? '',
      ]);
    }
  }
  return rows;
}

const HEADLINES = 15;
const DESCRIPTIONS = 4;

/** A Google Ads Editor import: the campaign (paused, medium budget), its ad groups, keywords, one responsive search ad each, and the negatives. */
export function googleEditorRows(out: AdsetsOutput, scenario: Scenario = 'medium'): Cell[][] {
  const c = out.sets.google;
  const head = [
    'Campaign',
    'Campaign Type',
    'Campaign Status',
    'Campaign Daily Budget',
    'Bid Strategy Type',
    'Networks',
    'Ad Group',
    'Ad Group Status',
    'Keyword',
    'Criterion Type',
    'Final URL',
    ...Array.from({ length: HEADLINES }, (_, i) => `Headline ${i + 1}`),
    ...Array.from({ length: DESCRIPTIONS }, (_, i) => `Description ${i + 1}`),
    'Path 1',
    'Path 2',
    'Ad Type',
  ];
  if (!c) return [head];
  const width = head.length;
  const row = (values: Record<string, Cell>) => head.map((h) => values[h] ?? '').slice(0, width);
  const daily = c.ad_groups.reduce((a, g) => a + g.tiers[scenario].daily, 0);
  const rows: Cell[][] = [head];
  rows.push(row({ Campaign: c.name, 'Campaign Type': 'Search', 'Campaign Status': 'Paused', 'Campaign Daily Budget': Math.round(daily * 100) / 100, 'Bid Strategy Type': c.bid_strategy, Networks: 'Google search' }));
  for (const g of c.ad_groups) {
    rows.push(row({ Campaign: c.name, 'Ad Group': g.name, 'Ad Group Status': 'Paused' }));
    for (const k of g.keywords) rows.push(row({ Campaign: c.name, 'Ad Group': g.name, Keyword: k.text, 'Criterion Type': k.match === 'exact' ? 'Exact' : 'Phrase' }));
    if (g.headlines.length && g.descriptions.length) {
      const ad: Record<string, Cell> = { Campaign: c.name, 'Ad Group': g.name, 'Final URL': g.final_url, 'Path 1': g.path1, 'Path 2': g.path2, 'Ad Type': 'Responsive search ad' };
      g.headlines.slice(0, HEADLINES).forEach((h, i) => (ad[`Headline ${i + 1}`] = h));
      g.descriptions.slice(0, DESCRIPTIONS).forEach((d, i) => (ad[`Description ${i + 1}`] = d));
      rows.push(row(ad));
    }
  }
  for (const n of c.negatives) rows.push(row({ Campaign: c.name, Keyword: n.text, 'Criterion Type': n.match === 'exact' ? 'Campaign Negative Exact' : 'Campaign Negative Phrase' }));
  return rows;
}

// ---------------------------------------------------------------------------
// The PDF

export interface AdsetsReportData {
  business: string;
  /** The business's website, for the footer bar; absent means the name. */
  website?: string | null;
  brand: Brand;
  date: string;
  phase: 'competitors' | 'integrated';
  adsets: AdsetsOutput;
  /** Rendered ad images by ad name, as data URIs (small enough for the PDF). */
  images: Record<string, string>;
  carousel: string[];
  carouselCaption: string | null;
  /** Phase 1's ranked changes in the website and Google areas: what makes the ads pay. */
  siteChanges: RankedChange[];
  preparer?: Preparer;
}

const GOAL_WORDS: Record<string, string> = { leads: 'Leads', engagement: 'Engagement', rankings: 'Rankings' };
const BUDGET_WORDS: Record<Scenario, string> = { low: 'Low budget', medium: 'Medium budget', high: 'High budget' };
const roiText = (t: TierForecast, modeled: boolean) => (modeled && t.roi !== null ? `${Math.round(t.roi * 100)}% ROI` : 'return not modeled');
const dollars = (x: number) => `$${x.toFixed(2)}`;
const tierCell = (t: TierForecast, modeled: boolean) => `${dollars(t.daily)}/day · ${money(t.monthly)}/mo · ${roiText(t, modeled)}${t.capped ? ' (search-limited)' : ''}`;

function budgetTable(tiers: Record<Scenario, TierForecast>, modeled: boolean) {
  return table(
    ['Budget', 'Daily', 'Monthly', 'Clicks', modeled ? 'Leads' : 'Visits', 'Monthly net', 'ROI on that spend'],
    SCENARIOS.map((s) => {
      const t = tiers[s];
      return [
        `${BUDGET_WORDS[s]}${t.capped ? ' (stops at demand)' : ''}`,
        dollars(t.daily),
        money(t.monthly),
        num(t.clicks),
        modeled ? num(t.leads, 1) : num(t.clicks),
        modeled ? money(t.net) : '–',
        roiText(t, modeled),
      ];
    })
  );
}

function rangeLine(r: OutcomeRange | null) {
  if (!r) return '';
  return `<p class="note">At the medium budget the 12-month net runs from ${money(r.conservative.year_net)} in the conservative case to ${money(r.upside.year_net)} in the upside case (${money(r.base.year_net)} in the base case).</p>`;
}

const basisLine = (b: AdBasis | undefined) => (b ? `<p class="note" data-role="basis"><b>Built on:</b> ${esc(DATA_SET_WORDS[b.data])} · ${esc(b.evidence)}</p>` : '');

function metaCard(m: MetaAdSet, images: Record<string, string>) {
  const ads = m.ads
    .map(
      (ad) => `<div class="ad">${images[ad.name] ? `<img src="${images[ad.name]}" alt="">` : '<div class="noimg">No image</div>'}<div>
<div class="adname">${esc(ad.name)}</div>
<p><b>${esc(ad.headline)}</b></p><p>${esc(ad.primary_text)}</p>${ad.description ? `<p class="muted">${esc(ad.description)}</p>` : ''}
<p class="note">Button: ${esc(ad.call_to_action.replace(/_/g, ' ').toLowerCase())} · ${esc(ad.display_link || 'no website')}</p></div></div>`
    )
    .join('');
  return `<div class="card" data-goal="${m.goal}"><div class="kicker">Meta · ${esc(GOAL_WORDS[m.goal])} · ${esc(m.recommendation)}</div><h3>${esc(m.name)}</h3>
<p class="note">Campaign ${esc(m.campaign)} · ${esc(m.objective)} · optimised for ${esc(m.optimization_goal.toLowerCase().replace(/_/g, ' '))}</p>
<p>${esc(m.why)}</p><p><b>How it works.</b> ${esc(m.mechanism)}</p><p><b>What to watch.</b> ${esc(m.kpi)}</p>${basisLine(m.basis)}
${budgetTable(m.tiers, m.modeled)}${rangeLine(m.range)}
<p class="note">Audience: ${esc(m.audience.location)}, ${m.audience.radius_miles} miles, ages ${m.audience.age_min} to ${m.audience.age_max}${m.audience.interests.length ? `; ${esc(m.audience.interests.join(', '))}` : ''}. Placements: ${esc(m.placements.join(', '))}.</p>
${m.stop_loss ? `<p class="note">Stop-loss: ${esc(m.stop_loss)}</p>` : ''}${ads}</div>`;
}

function googleCard(g: GoogleAdGroup) {
  return `<div class="card" data-goal="${g.goal}"><div class="kicker">Google Search · ${esc(GOAL_WORDS[g.goal])} · ${esc(g.recommendation)}</div><h3>${esc(g.name)}</h3>
<p>${esc(g.why)}</p><p><b>How it works.</b> ${esc(g.mechanism)}</p><p><b>What to watch.</b> ${esc(g.kpi)}</p>${basisLine(g.basis)}
${budgetTable(g.tiers, g.modeled)}${rangeLine(g.range)}
${table(
  ['Keyword', 'Match', 'Searches / mo', 'Top-of-page bid', 'Site ranks'],
  g.keywords.map((k) => [k.match === 'exact' ? `[${k.text}]` : `"${k.text}"`, k.match, num(k.monthly_searches), k.low_bid_usd !== null && k.high_bid_usd !== null ? `$${k.low_bid_usd.toFixed(2)} – ${k.high_bid_usd.toFixed(2)}` : '–', k.position ? `#${k.position}` : '–'])
)}
${g.headlines.length ? `<p class="note"><b>Headlines:</b> ${g.headlines.map(esc).join(' · ')}</p><p class="note"><b>Descriptions:</b> ${g.descriptions.map(esc).join(' · ')}</p>` : '<p class="note">No ad written yet for this group.</p>'}
<p class="note">Lands on ${esc(g.final_url || 'the website')}${g.stop_loss ? ` · Stop-loss: ${esc(g.stop_loss)}` : ''}</p></div>`;
}

function spendTable(c: ChannelAdSet) {
  if (c.tiers) return budgetTable(c.tiers, c.modeled);
  return table(
    ['Budget', 'Daily', 'Monthly', 'Return'],
    SCENARIOS.map((s) => [BUDGET_WORDS[s], dollars(c.spend[s].daily), money(c.spend[s].monthly), 'not modeled'])
  );
}

function channelCard(c: ChannelAdSet, images: Record<string, string>) {
  const ads = c.ads
    .map(
      (ad) => `<div class="ad${ad.format === 'vertical' ? ' vertical' : ''}">${images[ad.name] ? `<img src="${images[ad.name]}" alt="">` : '<div class="noimg">No image</div>'}<div>
<div class="adname">${esc(ad.name)}</div>
<p><b>${esc(ad.headline)}</b></p>${ad.text ? `<p>${esc(ad.text)}</p>` : ''}
<p class="note">Button: ${esc(ad.call_to_action)} · ${esc(ad.format === 'vertical' ? 'vertical 1080 × 1920' : 'feed 1080 × 1350')}</p>${basisLine(ad.basis)}</div></div>`
    )
    .join('');
  const access =
    c.availability === 'sales_team'
      ? `<p class="note" data-role="sales-team"><b>Self-serve is closed to this business’s category.</b> ${esc(c.availability_note ?? '')} The targeting, ads and budgets below are the plan to take to ${esc(c.platform_label)}’s sales team; the budgets are the test New Wave would run, and any minimum the platform names in its rule comes first.</p>`
      : '';
  return `<div class="card" data-platform="${c.platform}"><div class="kicker">${esc(c.platform_label)} · ${esc(GOAL_WORDS[c.goal])} · ${esc(c.recommendation === 'sales_team' ? 'sales team' : c.recommendation)}</div><h3>${esc(c.name)}</h3>
<p class="note">Campaign ${esc(c.campaign)}</p>${access}
<p>${esc(c.why)}</p><p><b>How it works.</b> ${esc(c.mechanism)}</p><p><b>What to watch.</b> ${esc(c.kpi)}</p>
${spendTable(c)}${c.not_modeled ? `<p class="note">${esc(c.not_modeled)}</p>` : ''}
<p class="note">Audience: ${esc(c.targeting.location)}, ages ${c.targeting.age_min} and older${c.targeting.communities.length ? `; communities ${esc(c.targeting.communities.join(', '))}` : ''}${c.targeting.interests.length ? `; ${esc(c.targeting.interests.join(', '))}` : ''}.</p>
${ads || '<p class="note">No ad written yet for this set.</p>'}</div>`;
}

function channelHowTo(channels: ChannelAdSet[]): string {
  const part = (platform: ChannelAdSet['platform'], title: string, selfServe: string[]) => {
    const sets = channels.filter((c) => c.platform === platform);
    if (!sets.length) return '';
    const sales = sets.filter((c) => c.availability === 'sales_team');
    const steps = sales.length
      ? [
          `Self-serve ads are closed to this business’s category on ${title}: ${sales[0].availability_note ?? ''}`,
          `Send the “Reddit and TikTok Ad Plan” workbook and the images to ${title}’s sales team: its “Ad sets” sheet carries the targeting and budgets, its “Ads” sheet the words and image files.`,
          'Nothing runs until the platform has approved the account and the ads.',
        ]
      : selfServe;
    return `<h3>${esc(title)}</h3><ol>${steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>`;
  };
  return (
    part('reddit', 'Reddit Ads', [
      'In Reddit Ads Manager, create a Traffic campaign and one ad group per row of the “Ad sets” sheet in the Reddit and TikTok workbook: the location, the age, the communities under community targeting, and the daily budget for the low, medium or high case.',
      'Upload each ad’s image from the reddit folder of the images download and paste its headline, text and button from the “Ads” sheet; keep each ad paused until it is checked.',
      'Reply to comments on the promoted posts as the business: Reddit readers expect an answer, not an advert.',
    ]) +
    part('tiktok', 'TikTok Ads', [
      'In TikTok Ads Manager, create a Traffic campaign and one ad group per TikTok row of the “Ad sets” sheet: the location, the age and the daily budget.',
      'Upload each vertical image from the tiktok folder of the images download (or a short clip of the same scene), and paste the ad text and button from the “Ads” sheet; keep each ad paused until it is checked.',
    ])
  );
}

export function buildAdsetsHtml(d: AdsetsReportData): string {
  const { brand: b, adsets: o } = d;
  const s = o.sets;
  const who = d.preparer ?? NEW_WAVE_PREPARER;
  const phaseWords = d.phase === 'integrated' ? `${PHASE_INFO.integrated.title} · from the business’s own accounts` : `${PHASE_INFO.competitors.title} · from public data, against competitors`;
  const frame: Frame = { who, client: { name: d.business, brand: b }, report: 'Ad sets', site: siteLabel(d.website), date: d.date };
  const section = (kicker: string, title: string, body: string) => framePage(frame, kicker, title, body);
  const t = s.totals;
  const channels = [...(s.reddit ?? []), ...(s.tiktok ?? [])];
  const tiles = [
    { v: `${money(t.low.monthly)} – ${money(t.high.monthly)}`, l: 'Monthly ad spend, low to high budget' },
    { v: money(t.medium.monthly), l: `Medium budget (${dollars(t.medium.daily)} a day)` },
    { v: t.medium.roi === null ? 'not modeled' : `${Math.round(t.medium.roi * 100)}%`, l: 'Return on the modeled spend, medium budget' },
    { v: money(t.medium.year_net), l: '12-month net of the modeled sets, medium budget' },
  ];
  const cover = `<section class="page cover">${pageHead(frame)}<div class="body">
<div class="kicker">Ad sets · ${esc(phaseWords)} · ${esc(d.date)} · ${preparedBy(who)}</div>
<h1>${esc(d.business)}: the ad sets, priced three ways</h1>
<p class="lede">${s.goals.leads} set${s.goals.leads === 1 ? '' : 's'} for leads, ${s.goals.engagement} for engagement and ${s.goals.rankings} for rankings, every one paused until someone turns it on. Each is priced at three budgets with the return on that spend: the medium budget is the plan’s base case, the low half of it and the high double. Engagement is not a sale, so its return is not modeled.</p>
<div class="kpis">${tiles.map((x) => `<div class="kpi"><div class="l">${esc(x.l)}</div><div class="v">${esc(x.v)}</div></div>`).join('')}</div>
${table(
  ['Set', 'Goal', 'Low budget', 'Medium budget', 'High budget'],
  [
    ...s.meta.map((m) => [`Meta · ${m.name}`, GOAL_WORDS[m.goal], tierCell(m.tiers.low, m.modeled), tierCell(m.tiers.medium, m.modeled), tierCell(m.tiers.high, m.modeled)]),
    ...(s.google?.ad_groups ?? []).map((g) => [`Google · ${g.name}`, GOAL_WORDS[g.goal], tierCell(g.tiers.low, g.modeled), tierCell(g.tiers.medium, g.modeled), tierCell(g.tiers.high, g.modeled)]),
    ['All Meta and Google sets', '', `${money(t.low.monthly)}/mo`, `${money(t.medium.monthly)}/mo`, `${money(t.high.monthly)}/mo`],
    ...channels.map((c) => [
      `${c.platform_label} · ${c.name}${c.availability === 'sales_team' ? ' (sales team)' : ''}`,
      GOAL_WORDS[c.goal],
      ...SCENARIOS.map((x) => (c.tiers ? tierCell(c.tiers[x], c.modeled) : `${dollars(c.spend[x].daily)}/day · ${money(c.spend[x].monthly)}/mo · return not modeled`)),
    ]),
  ]
)}${channels.length ? '<p class="note">The Reddit and TikTok sets are priced on their own and are not in the totals above.</p>' : ''}</div>${pageFoot(frame)}</section>`;

  const metaPages = s.meta.length ? section('Meta · Facebook and Instagram', 'The Meta ad sets', s.meta.map((m) => metaCard(m, d.images)).join('')) : '';
  const google = s.google
    ? section(
        'Google Search',
        `The search campaign: ${s.google.name}`,
        `${s.google.ad_groups.map(googleCard).join('')}
<h3>Negative keywords (phrase match, whole campaign)</h3>${table(['Negative', 'Why'], s.google.negatives.map((n) => [n.text, n.reason]))}`
      )
    : '';
  const channelPage = channels.length
    ? section(
        'Reddit and TikTok',
        'The Reddit and TikTok sets',
        `<p>Each ad names the data it was written from. ${channels.some((c) => c.availability === 'sales_team') ? 'Where a platform keeps the business’s category off self-serve, the set is the plan to take to its sales team.' : 'Every ad arrives paused.'}</p>${channels.map((c) => channelCard(c, d.images)).join('')}`
      )
    : '';
  const carousel = d.carousel.length
    ? section(
        'Engagement',
        s.carousel?.title ?? 'The carousel',
        `<p>An organic post for the engagement set: post it, then put the engagement budget behind it. The slides and caption are in the carousel download.</p>
<div class="slides">${d.carousel.map((src) => `<img src="${src}" alt="">`).join('')}</div>${d.carouselCaption ? `<h3>Caption</h3><p class="caption">${esc(d.carouselCaption)}</p>` : ''}`
      )
    : '';
  const changes = d.siteChanges.length
    ? section(
        'Before the ads run',
        'What makes the ads pay',
        `<p>The changes from the audit that the ads lean on, in the order they pay back.</p>${table(
          ['Change', 'Why', '12-month net (low to high)'],
          d.siteChanges.map((c) => [c.title, c.evidence, c.scenarios ? `${money(c.scenarios.low.net_year)} to ${money(c.scenarios.high.net_year)}` : 'not modeled'])
        )}`
      )
    : '';
  const howTo = section(
    'Hand-over',
    'How to import',
    `<h3>Meta (Ads Manager)</h3><ol>
<li>Create each campaign and ad set from the “Ad sets” sheet of the Meta file (objective, budget, audience, placements); the daily figures for the low, medium and high budgets are side by side.</li>
<li>Upload the ad images from the images download to the ad account’s media library. If the import asks for an image hash, copy each one into the Image Hash column.</li>
<li>Fill the Page (Link Object ID) and Instagram account on the “Ads” sheet if they are blank, then import it with Ads Manager’s Import ads in bulk. Every ad arrives paused.</li></ol>
<h3>Google Ads (Google Ads Editor)</h3><ol>
<li>In Google Ads Editor, open the account and import the CSV (Account › Import › From file). Editor shows every change before anything is posted.</li>
<li>The campaign comes in paused at the medium budget; set the low or high budget from this report before posting if that is the one being run.</li>
<li>Set the location to ${esc(s.google?.location ?? 'the business’s area')} and turn on call tracking before the campaign goes live.</li></ol>
${channelHowTo(channels)}
${s.notes.length ? `<h3>Notes</h3><ul>${s.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
<h3>Where the numbers come from</h3><ul><li class="note">${esc(GROUNDSWELL_CONFIG.adsets.budget_basis)}</li>${[...new Set([...s.meta.flatMap((m) => m.sources), ...(s.google?.ad_groups ?? []).flatMap((g) => g.sources), ...channels.flatMap((c) => c.sources)])].map((x) => `<li class="note">${esc(x)}</li>`).join('')}</ul>`
  );

  return numberPages(ownWording(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(d.business)} - Ad sets</title><style>
${houseCss(b)}
.page{font-size:9.5pt}
table{font-size:8.3pt}
td,th{padding:4px 6px;word-break:break-word}
.kpi .v{font-size:15pt}
.card{border:1px solid #E8EFF1;border-top:3px solid #31C6CF;border-radius:4px;padding:12px 14px;margin:0 0 14px;page-break-inside:avoid}
.ad{display:grid;grid-template-columns:1.6in 1fr;gap:12px;margin-top:10px;page-break-inside:avoid}
.ad img,.noimg{width:1.6in;height:2in;object-fit:cover;border-radius:6px;background:#f3f4f6}
.ad.vertical img,.ad.vertical .noimg{height:2.84in}
.noimg{display:flex;align-items:center;justify-content:center;color:#6b7280;font-size:8pt}
.adname{font-size:8pt;color:#6b7280;letter-spacing:.04em}
.slides{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0}
.slides img{width:100%;border-radius:6px;border:1px solid #e5e7eb}
.caption{white-space:pre-wrap;font-size:8.5pt}
.note{font-size:8pt;color:#4b5563}
ol{padding-left:1.2em}li{margin:2px 0}
</style></head><body>${cover}${metaPages}${google}${channelPage}${carousel}${changes}${howTo}</body></html>`,
    who
  ));
}
