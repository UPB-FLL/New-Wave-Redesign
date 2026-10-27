import type { SupabaseClient } from '@supabase/supabase-js';
import { PHASE_INFO, PHASES, type Phase } from '../../../src/lib/groundswellValidation.js';
import { isPlansOutput } from './plans.js';
import { isPresenceOutput } from './presence.js';
import { isReviewsOutput } from './currents/reviews.js';
import { isCommunityOutput } from './currents/community.js';
import { isAiAnswersOutput } from './currents/aiAnswers.js';
import { PLATFORM_LABELS } from '../../../packages/groundswell/src/plans.js';
import { isAdplanOutput } from './adplan.js';
import { isAdsetsOutput } from './adsets.js';
import { assetsFor } from './assetStore.js';
import { isBenchmarkOutput } from './benchmark.js';
import { isCreativeOutput } from './creative.js';
import { isLinkedOutput, type SearchTermsData } from './currents/linked.js';
import type { SiteScan } from './currents/site.js';
import { isIntegratedOutput } from './integrated.js';
import { integratedReady } from './phases.js';
import { reportsFor } from './reportStore.js';

/**
 * A customer's workspace: its three phases, each with its runs, their
 * progress, reports, files and the data they gathered, for the partner who
 * owns the customer or a New Wave admin. Data is shown as panels of plain
 * rows and tables built here from the step outputs, never the raw provider
 * answers. A partner never sees error text, staff details, or anything of
 * another customer: every read is scoped to the customer (and, for a
 * partner, to its own partner id).
 */

export type Viewer = { kind: 'partner'; partnerId: string } | { kind: 'admin' };

export interface DataPanel {
  key: string;
  title: string;
  source: string | null;
  rows?: { label: string; value: string }[];
  table?: { head: string[]; rows: string[][] };
  list?: string[];
  note?: string | null;
}

const n = (x: unknown, digits = 0) => (typeof x === 'number' && Number.isFinite(x) ? x.toLocaleString('en-US', { maximumFractionDigits: digits }) : '–');
const usd = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? `$${Math.round(x).toLocaleString('en-US')}` : '–');
const pct = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? `${Math.round(x * 100)}%` : 'not modeled');
const yes = (x: unknown) => (x ? 'Yes' : 'No');
const text = (x: unknown) => (typeof x === 'string' && x.trim() ? x.trim() : '–');
type O = Record<string, unknown>;
const obj = (x: unknown): O => (x && typeof x === 'object' ? (x as O) : {});
const arr = (x: unknown): O[] => (Array.isArray(x) ? (x as O[]).filter((v) => v && typeof v === 'object') : []);

/** Panels for the data a run gathered or made, in the order the phases read it. */
export function panelsFor(outputs: Record<string, unknown>): DataPanel[] {
  const panels: DataPanel[] = [];
  const site = obj(outputs.site).business as SiteScan | null | undefined;
  if (site) {
    const t = site.tracking;
    panels.push({
      key: 'site',
      title: 'Website',
      source: site.final_url ?? site.url,
      rows: [
        { label: 'Title', value: text(site.title) },
        { label: 'Description', value: text(site.meta_description) },
        { label: 'Secure (https)', value: yes(site.https) },
        { label: 'Mobile layout', value: yes(site.has_viewport) },
        { label: 'Words on the home page', value: n(site.word_count) },
        { label: 'Tracking', value: [t.google_analytics.length ? 'Google Analytics' : null, t.google_tag_manager.length ? 'Tag Manager' : null, t.google_ads.length ? 'Google Ads tag' : null, t.meta_pixel ? 'Meta pixel' : null, t.tiktok_pixel ? 'TikTok pixel' : null].filter(Boolean).join(', ') || 'None found' },
        { label: 'Booking', value: site.booking.join(', ') || 'None found' },
        { label: 'Phone numbers', value: site.phones.join(', ') || 'None found' },
      ],
    });
  }
  const maps = obj(outputs.maps);
  if (outputs.maps) {
    const b = obj(maps.business);
    panels.push({
      key: 'maps',
      title: 'Google listing',
      source: text(maps.source),
      rows: [
        { label: 'Name', value: text(b.name) },
        { label: 'Rating', value: b.rating ? `${n(b.rating, 1)} from ${n(b.reviews)} reviews` : '–' },
        { label: 'Category', value: text(b.category) },
        { label: 'Address', value: text(b.address) },
      ],
      table: { head: ['Nearby', 'Rating', 'Reviews'], rows: arr(maps.nearby).slice(0, 6).map((p) => [text(p.name), n(p.rating, 1), n(p.reviews)]) },
    });
  }
  const search = obj(outputs.search);
  if (outputs.search) {
    const b = obj(search.business);
    panels.push({
      key: 'search',
      title: 'Search rankings (Ahrefs)',
      source: text(search.source),
      rows: [
        { label: 'Domain rating', value: n(b.domain_rating) },
        { label: 'Organic keywords', value: n(b.organic_keywords) },
        { label: 'Organic visits a month (estimate)', value: n(b.organic_traffic) },
      ],
      table: { head: ['Keyword', 'Position', 'Searches / mo'], rows: arr(b.top_keywords).slice(0, 10).map((k) => [text(k.keyword), n(k.position), n(k.volume)]) },
      note: arr(search.competitors).length ? `Competitors: ${arr(search.competitors).map((c) => `${text(c.name)} (DR ${n(c.domain_rating)}, ${n(c.organic_traffic)} visits)`).join('; ')}` : null,
    });
  }
  const keywords = obj(outputs.keywords);
  if (arr(keywords.ideas).length) {
    panels.push({
      key: 'keywords',
      title: 'Keyword demand (Keyword Planner)',
      source: text(keywords.source),
      table: {
        head: ['Keyword', 'Searches / mo', 'Competition', 'Top-of-page bid'],
        rows: arr(keywords.ideas)
          .slice(0, 15)
          .map((k) => [text(k.keyword), n(k.monthly_searches), text(k.competition).toLowerCase(), typeof k.low_bid_usd === 'number' && typeof k.high_bid_usd === 'number' ? `$${k.low_bid_usd.toFixed(2)} – ${k.high_bid_usd.toFixed(2)}` : '–']),
      },
    });
  }
  const social = obj(outputs.social);
  if (outputs.social) {
    const b = obj(social.business);
    panels.push({
      key: 'social',
      title: 'Instagram',
      source: text(social.source),
      rows: [
        { label: 'Handle', value: b.handle ? `@${text(b.handle)}` : '–' },
        { label: 'Followers', value: n(b.followers) },
        { label: 'Posts in the last 30 days', value: n(b.posts_last_30_days) },
        { label: 'Average likes, recent posts', value: n(b.avg_likes_recent) },
        { label: 'Average comments, recent posts', value: n(b.avg_comments_recent) },
      ],
      table: { head: ['Competitor', 'Followers', 'Posts / 30 days', 'Avg likes'], rows: arr(social.competitors).map((c) => [`${text(c.name)} (@${text(c.handle)})`, n(c.followers), n(c.posts_last_30_days), n(c.avg_likes_recent)]) },
    });
  }
  const pagesOut = obj(outputs.site_pages);
  if (Array.isArray(pagesOut.pages)) {
    const pages = arr(pagesOut.pages);
    panels.push({
      key: 'site_pages',
      title: 'Website pages',
      source: text(pagesOut.source) === '–' ? null : text(pagesOut.source),
      table: { head: ['Page', 'Title', 'Words', 'Calls to action', 'Prices seen'], rows: pages.map((p) => [text(p.path), p.error ? `Not read: ${text(p.error)}` : text(p.title), n(p.word_count), arr(p.ctas).map((c) => text(c.text)).join(', ') || '–', (Array.isArray(p.prices) ? (p.prices as string[]) : []).join(', ') || '–']) },
      note: arr(pagesOut.competitors).length ? `Competitor homepages read: ${arr(pagesOut.competitors).map((c) => `${text(c.name)}${obj(c.page).error ? ' (not read)' : ''}`).join(', ')}.` : null,
    });
  }
  const ai = obj(outputs.ai_search);
  if (Array.isArray(ai.improvements) && ai.crawlers) {
    const crawlers = obj(ai.crawlers);
    const blocked = arr(crawlers.agents).filter((a) => a.verdict === 'blocked').map((a) => text(a.agent));
    const files = obj(ai.files);
    const v = obj(ai.visibility);
    const business = obj(v.business);
    const rows = [
      { label: 'AI crawlers blocked by robots.txt', value: blocked.length ? blocked.join(', ') : crawlers.robots_found ? 'None' : 'No robots.txt (all allowed)' },
      { label: 'llms.txt', value: ai.files ? yes(obj(files.llms_txt).found) : '–' },
      { label: 'Sitemap URLs', value: ai.files ? n(obj(files.sitemap).urls) : '–' },
      { label: 'Phone matches the Google listing', value: obj(ai.nap).consistent === null || obj(ai.nap).consistent === undefined ? 'Not compared' : yes(obj(ai.nap).consistent) },
      ...(ai.visibility ? [{ label: 'AI mentions (Brand Radar)', value: `${n(business.mentions)}${typeof business.share_of_voice === 'number' ? ` · ${business.share_of_voice.toFixed(1)}% share of voice` : ''}` }] : []),
    ];
    panels.push({
      key: 'ai_search',
      title: 'AI search',
      source: text(ai.source) === '–' ? null : text(ai.source),
      rows,
      table: { head: ['Page', 'Citability', 'Weakest checks'], rows: arr(ai.pages).map((p) => [text(p.path), `${n(p.score)} / 100`, arr(p.checks).filter((c) => (c.earned as number) < (c.points as number)).slice(0, 3).map((c) => text(c.label)).join(', ') || '–']) },
      list: arr(ai.improvements).map((i) => `${text(i.priority)}: ${text(i.title)}`),
      note: typeof v.error === 'string' && v.error ? 'Brand Radar answered only in part; the developer brief says which figures are missing.' : null,
    });
  }
  if (isReviewsOutput(outputs.reviews)) {
    const r = outputs.reviews;
    const b = r.business;
    const rating = (x: { rating: number | null; reviews: number | null } | null) => (x ? `${x.rating ?? '–'}★ · ${n(x.reviews)} reviews` : 'Not found');
    panels.push({
      key: 'reviews',
      title: 'Yelp',
      source: r.source,
      rows: b
        ? [
            { label: 'Listing', value: b.url ?? b.name },
            { label: 'Rating', value: rating(b) },
            { label: 'Price', value: text(b.price) },
            { label: 'Claimed by the owner', value: b.claimed === null ? '–' : yes(b.claimed) },
            { label: 'Hours on Yelp', value: b.hours.join('; ') || '–' },
          ]
        : [{ label: 'Listing', value: r.business_error ?? 'Not found' }],
      table: { head: ['Competitor', 'Yelp'], rows: r.competitors.map((c) => [c.name, c.listing ? rating(c.listing) : c.error ?? 'Not found']) },
      list: r.reviews.map((x) => `${x.rating ?? '–'}★ ${x.posted_at?.slice(0, 10) ?? ''}: ${x.text}`),
      note: r.note,
    });
  }
  if (isCommunityOutput(outputs.community)) {
    const c = outputs.community;
    panels.push({
      key: 'community',
      title: 'Reddit',
      source: c.source,
      rows: [
        { label: 'Posts and comments naming the business', value: String(c.business.mentions.length) },
        { label: 'Where', value: c.business.communities.map((x) => `r/${x.name} (${x.count})`).join(', ') || '–' },
        { label: 'Tags', value: c.tags.join(', ') || '–' },
        ...c.competitors.map((x) => ({ label: `Naming ${x.name}`, value: x.mentions === null ? 'Not read' : String(x.mentions) })),
      ],
      table: { head: ['Community', 'Post', 'Score'], rows: c.business.mentions.slice(0, 8).map((m) => [m.subreddit ? `r/${m.subreddit}` : '–', m.title ?? m.excerpt.slice(0, 80), n(m.score)]) },
      list: c.category.questions.map((q) => `${q.subreddit ? `r/${q.subreddit}: ` : ''}${q.title ?? ''}`),
      note: c.left_out ? `${c.left_out} thread${c.left_out === 1 ? '' : 's'} about politics or boycotts left out.` : null,
    });
  }
  if (isAiAnswersOutput(outputs.ai_answers)) {
    const a = outputs.ai_answers;
    panels.push({
      key: 'ai_answers',
      title: 'Google AI Mode answers',
      source: a.source,
      rows: [{ label: 'Questions answered', value: `${a.summary.answered} of ${a.summary.asked}` }, { label: 'Named the business', value: String(a.summary.named) }, { label: 'Led with the business', value: String(a.summary.led) }],
      table: { head: ['Question', 'Named', 'Place', 'Led with'], rows: a.answers.map((x) => [x.prompt, x.error ? 'Not read' : yes(x.named), x.position === null ? '–' : String(x.position), text(x.top)]) },
      list: a.answers.filter((x) => x.description).map((x) => `“${x.prompt}”: ${x.description}`),
      note: a.note,
    });
  }
  const model = obj(outputs.model);
  const w = obj(model.writeup);
  if (w.headline) {
    panels.push({ key: 'model', title: 'The write-up', source: null, list: [text(w.headline), text(w.verdict), ...(Array.isArray(w.next_steps) ? (w.next_steps as string[]) : [])] });
  }
  if (isAdplanOutput(outputs.adplan)) {
    const p = outputs.adplan;
    panels.push({
      key: 'adplan',
      title: 'The ad plan',
      source: p.industry.label,
      rows: (['low', 'medium', 'high'] as const).map((s) => ({ label: `${s[0].toUpperCase()}${s.slice(1)} case`, value: `${usd(p.plan.budget[s])} a month, ${usd(p.plan.year_net[s])} net over 12 months` })),
      table: { head: ['Angle', 'Platform', 'Call', 'Spend (base)', 'ROI (base)'], rows: p.plan.rows.map((r) => [r.angle, r.platform_label, r.recommendation, usd(r.scenarios.medium.spend), pct(r.scenarios.medium.roi)]) },
    });
  }
  if (isPlansOutput(outputs.plans)) {
    const p = outputs.plans;
    panels.push({
      key: 'plans',
      title: 'Website plan and the first week of posts',
      source: p.sources.join('; ') || null,
      list: [
        ...p.website_plan.changes.slice(0, 6).map((c) => `${c.priority === 'high' ? 'High' : c.priority === 'medium' ? 'Medium' : 'Low'} · ${c.page}: ${c.change}`),
        ...p.social_plan.week.map((post) => `${post.day} · ${PLATFORM_LABELS[post.platform]} ${post.format}: ${post.topic || post.hook}`),
      ],
      note: p.dropped.length ? `${p.dropped.length} item${p.dropped.length === 1 ? '' : 's'} left out by the rules.` : null,
    });
  }
  if (isPresenceOutput(outputs.presence)) {
    const p = outputs.presence;
    const AREA = { reviews: 'Reviews', reddit: 'Reddit', ai_answers: 'AI answers' } as const;
    panels.push({
      key: 'presence',
      title: 'Reviews, Reddit and AI answers plan',
      source: p.summary,
      list: p.actions.map((x) => `${x.priority === 'high' ? 'High' : x.priority === 'medium' ? 'Medium' : 'Low'} · ${AREA[x.area]}: ${x.action}`),
      note: p.measures.join(' '),
    });
  }
  if (isBenchmarkOutput(outputs.benchmark)) {
    const x = outputs.benchmark;
    panels.push({
      key: 'benchmark',
      title: 'Against the competitors',
      source: x.names.join(' vs '),
      list: [x.writeup.verdict, ...x.writeup.differences.slice(0, 5).map((d) => `${d.title}: ${d.change}`)],
      table: { head: ['', ...x.names], rows: x.scorecard.map((r) => [r.label, ...r.shown]) },
    });
  }
  if (isCreativeOutput(outputs.creative)) {
    panels.push({ key: 'creative', title: 'The business’s own images', source: outputs.creative.source, list: outputs.creative.images.map((i) => `${i.name}${i.likes !== null ? ` · ${n(i.likes)} likes` : ''}`) });
  }
  if (isAdsetsOutput(outputs.adsets)) {
    const s = outputs.adsets.sets;
    panels.push({
      key: 'adsets',
      title: 'Ad sets',
      source: outputs.adsets.basis === 'linked' ? 'Re-priced on the business’s own accounts' : 'From public data',
      rows: (['low', 'medium', 'high'] as const).map((b) => ({ label: `${b[0].toUpperCase()}${b.slice(1)} budget`, value: `${usd(s.totals[b].monthly)} a month ($${s.totals[b].daily.toFixed(2)} a day) · ROI on the modeled spend ${pct(s.totals[b].roi)}` })),
      table: {
        head: ['Set', 'Goal', 'Low', 'Medium', 'High'],
        rows: [
          ...s.meta.map((m) => [`Meta · ${m.name}`, m.goal, `${usd(m.tiers.low.monthly)} · ${m.modeled ? pct(m.tiers.low.roi) : '–'}`, `${usd(m.tiers.medium.monthly)} · ${m.modeled ? pct(m.tiers.medium.roi) : '–'}`, `${usd(m.tiers.high.monthly)} · ${m.modeled ? pct(m.tiers.high.roi) : '–'}`]),
          ...(s.google?.ad_groups ?? []).map((g) => [`Google · ${g.name}`, g.goal, `${usd(g.tiers.low.monthly)} · ${g.modeled ? pct(g.tiers.low.roi) : '–'}`, `${usd(g.tiers.medium.monthly)} · ${g.modeled ? pct(g.tiers.medium.roi) : '–'}`, `${usd(g.tiers.high.monthly)} · ${g.modeled ? pct(g.tiers.high.roi) : '–'}`]),
        ],
      },
      note: s.notes.join(' ') || null,
    });
  }
  if (isLinkedOutput(outputs.linked) && outputs.linked.services.length) {
    panels.push({ key: 'linked', title: 'The business’s own accounts', source: `${outputs.linked.window.start} to ${outputs.linked.window.end}`, table: { head: ['Account', 'Read', 'Note'], rows: outputs.linked.services.map((s) => [s.label, s.ok ? 'Yes' : 'No', s.ok ? s.source : (s.problem ?? '')]) } });
  }
  const terms = outputs.search_terms as SearchTermsData | undefined;
  if (terms?.terms?.length) {
    panels.push({ key: 'search_terms', title: 'Google Ads search terms', source: `Last ${terms.window_days} days`, table: { head: ['Search', 'Clicks', 'Spend', 'Conversions'], rows: terms.terms.slice(0, 15).map((t) => [t.term, n(t.clicks), usd(t.cost), n(t.conversions, 1)]) } });
  }
  if (isIntegratedOutput(outputs.integrated)) {
    const x = outputs.integrated;
    panels.push({ key: 'integrated', title: 'Integrated plan', source: null, list: [x.writeup.headline, ...x.writeup.findings.map((f) => `${f.title}. ${f.text}`), ...x.writeup.next_steps.map((s) => `Next: ${s.title}. ${s.text}`), ...x.repricing.notes].filter(Boolean) });
  }
  return panels;
}

const missingColumn = (m: string | undefined) => /column .* does not exist|42703/i.test(m ?? '');
const missingTable = (m: string | undefined) => /relation .* does not exist|42P01/i.test(m ?? '');

const CUSTOMER_COLUMNS = 'id,partner_id,business_name,city,website,instagram,facebook,competitors,notes,created_at,updated_at';
const RUN_COLUMNS = 'id,customer_id,partner_id,status,kind,created_at,started_at,completed_at';

interface RunRow {
  id: string;
  customer_id: string | null;
  partner_id: string | null;
  status: string;
  kind?: string;
  phase?: Phase;
  source_audit_id?: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error?: string | null;
}

async function readCustomer(db: SupabaseClient, id: string, viewer: Viewer) {
  const read = (cols: string) => {
    const q = db.from('groundswell_customers').select(cols).eq('id', id);
    return (viewer.kind === 'partner' ? q.eq('partner_id', viewer.partnerId) : q).maybeSingle();
  };
  const first = await read(`${CUSTOMER_COLUMNS},stage,became_client_at`);
  const result = first.error && missingColumn(first.error.message) ? await read(CUSTOMER_COLUMNS) : first;
  if (result.error) throw new Error(missingTable(result.error.message) ? 'NOT_READY' : result.error.message);
  return result.data as unknown as (Record<string, unknown> & { id: string; partner_id: string | null; stage?: string }) | null;
}

async function readRuns(db: SupabaseClient, customerId: string, viewer: Viewer): Promise<RunRow[]> {
  // A partner never reads error text; its runs are its own as well as this customer's.
  const extra = viewer.kind === 'admin' ? ',error' : '';
  const read = (cols: string) => {
    const q = db.from('marketing_audits').select(cols).eq('customer_id', customerId);
    return (viewer.kind === 'partner' ? q.eq('partner_id', viewer.partnerId) : q).order('created_at', { ascending: false }).limit(200);
  };
  const first = await read(`${RUN_COLUMNS},phase,source_audit_id${extra}`);
  const result = first.error && missingColumn(first.error.message) ? await read(`${RUN_COLUMNS}${extra}`) : first;
  if (result.error) throw new Error(result.error.message);
  return ((result.data ?? []) as unknown as RunRow[])
    .filter((r) => r.customer_id === customerId && (viewer.kind === 'admin' || r.partner_id === viewer.partnerId))
    .map((r) => ({ ...r, phase: r.phase ?? 'audit' }))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export interface WorkspaceRun {
  id: string;
  status: string;
  kind: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  /** Staff only. */
  error?: string | null;
  steps: { step: string; status: string; error?: string | null }[];
  reports: { kind: string; name: string; pages: number }[];
  files: { kind: string; name: string; path: string; content_type: string; bytes: number; meta: Record<string, unknown> }[];
  /** The data panels; only for the newest run of each phase. */
  panels?: DataPanel[];
}

export interface WorkspacePhase {
  phase: Phase;
  number: 1 | 2 | 3;
  title: string;
  source: string;
  brings: string;
  runs: WorkspaceRun[];
  /** Whether a person can start this phase now, and if not, why. */
  start: { allowed: boolean; reason: string; builds_on: string | null };
}

export interface Workspace {
  customer: Record<string, unknown>;
  phases: WorkspacePhase[];
  phases_available: boolean;
}

/** The newest delivered run of a phase, the one the next phase builds on. */
const delivered = (runs: RunRow[], phase: Phase) => runs.find((r) => r.phase === phase && r.status === 'done') ?? null;
const open = (runs: RunRow[], phase: Phase) => runs.find((r) => r.phase === phase && (r.status === 'queued' || r.status === 'running')) ?? null;

/** Whether a phase can be started now: what it builds on, and nothing of it already waiting or running. */
export async function startable(db: SupabaseClient, runs: RunRow[], phase: Phase, customerId: string, phasesAvailable: boolean): Promise<WorkspacePhase['start']> {
  const waiting = open(runs, phase);
  if (waiting) return { allowed: false, reason: `${PHASE_INFO[phase].title} is already ${waiting.status}.`, builds_on: null };
  if (phase === 'audit') return { allowed: true, reason: runs.some((r) => r.phase === 'audit') ? 'Runs the audit again from today’s public data.' : 'Reads the business’s public data.', builds_on: null };
  if (!phasesAvailable) return { allowed: false, reason: 'Phases are not set up yet. Try again later.', builds_on: null };
  const before = PHASES[PHASES.indexOf(phase) - 1];
  const source = delivered(runs, before);
  if (!source) return { allowed: false, reason: `${PHASE_INFO[before].title} has to deliver first.`, builds_on: null };
  if (phase === 'integrated') {
    const ready = await integratedReady(db, customerId);
    if (!ready.ok) return { allowed: false, reason: ready.reason, builds_on: source.id };
  }
  return { allowed: true, reason: `Builds on ${PHASE_INFO[before].title.toLowerCase()} from ${new Date(source.completed_at ?? source.created_at).toLocaleDateString('en-US')}.`, builds_on: source.id };
}

export async function loadWorkspace(db: SupabaseClient, customerId: string, viewer: Viewer): Promise<Workspace | null> {
  const customer = await readCustomer(db, customerId, viewer);
  if (!customer) return null;
  const runs = await readRuns(db, customerId, viewer);
  const ids = runs.map((r) => r.id);
  const probe = await db.from('marketing_audits').select('phase').limit(1);
  const phasesAvailable = !(probe.error && missingColumn(probe.error.message));

  const steps = new Map<string, WorkspaceRun['steps']>();
  if (ids.length) {
    const { data, error } = await db.from('marketing_audit_steps').select(`audit_id,step,status,position${viewer.kind === 'admin' ? ',error' : ''}`).in('audit_id', ids);
    if (error) throw new Error(error.message);
    for (const s of ((data ?? []) as unknown as { audit_id: string; step: string; status: string; position: number; error?: string | null }[]).sort((a, b) => a.position - b.position)) {
      const list = steps.get(s.audit_id) ?? [];
      list.push(viewer.kind === 'admin' ? { step: s.step, status: s.status, error: s.error ?? null } : { step: s.step, status: s.status });
      steps.set(s.audit_id, list);
    }
  }
  const [reports, files] = await Promise.all([reportsFor(db, ids), assetsFor(db, ids)]);

  // The data panels of the newest run of each phase.
  const newest = new Map<string, string>();
  for (const phase of PHASES) {
    const r = runs.find((x) => x.phase === phase && x.status !== 'queued');
    if (r) newest.set(r.id, phase);
  }
  const panels = new Map<string, DataPanel[]>();
  for (const id of newest.keys()) {
    const { data, error } = await db.from('marketing_audit_steps').select('step,status,output').eq('audit_id', id);
    if (error) throw new Error(error.message);
    const outputs = Object.fromEntries(((data ?? []) as { step: string; status: string; output: unknown }[]).filter((s) => s.status === 'done').map((s) => [s.step, s.output]));
    panels.set(id, panelsFor(outputs));
  }

  const phases: WorkspacePhase[] = [];
  for (const phase of PHASES) {
    const info = PHASE_INFO[phase];
    phases.push({
      phase,
      number: info.number,
      title: info.title,
      source: info.source,
      brings: info.brings,
      runs: runs
        .filter((r) => r.phase === phase)
        .map((r) => ({
          id: r.id,
          status: r.status,
          kind: r.kind ?? 'audit',
          created_at: r.created_at,
          started_at: r.started_at,
          completed_at: r.completed_at,
          ...(viewer.kind === 'admin' ? { error: r.error ?? null } : {}),
          steps: steps.get(r.id) ?? [],
          reports: (reports.get(r.id) ?? []).map((x) => ({ kind: x.kind, name: x.name, pages: x.pages })),
          files: (files.get(r.id) ?? []).map((f) => ({ kind: f.kind, name: f.name, path: f.path, content_type: f.content_type, bytes: f.bytes, meta: f.meta ?? {} })),
          ...(panels.has(r.id) ? { panels: panels.get(r.id) } : {}),
        })),
      start: await startable(db, runs, phase, customerId, phasesAvailable),
    });
  }
  return { customer, phases, phases_available: phasesAvailable };
}

/** A new phase 1 run of a customer, from its saved details; the open one when there is one. */
export async function queueAudit(db: SupabaseClient, customer: Record<string, unknown> & { id: string; partner_id: string | null }, phasesAvailable: boolean): Promise<{ queued: string | null; reason: string }> {
  const row = {
    business_name: customer.business_name,
    city: customer.city ?? null,
    website: customer.website ?? null,
    instagram: customer.instagram ?? null,
    ...(customer.facebook ? { facebook: customer.facebook } : {}),
    competitors: customer.competitors ?? [],
    notes: customer.notes ?? null,
    partner_id: customer.partner_id,
    customer_id: customer.id,
    status: 'queued',
    ...(phasesAvailable ? { phase: 'audit' } : {}),
  };
  const { data, error } = await db.from('marketing_audits').insert(row).select('id').single();
  if (error || !data) throw new Error(`Could not queue the audit: ${error?.message ?? 'no row'}`);
  return { queued: (data as { id: string }).id, reason: `${PHASE_INFO.audit.title} queued.` };
}

export interface CustomerListItem {
  id: string;
  business_name: string;
  city: string | null;
  stage: string;
  partner: { id: string; company: string } | null;
  updated_at: string;
  phases: Record<Phase, { status: string; at: string } | null>;
}

/** Every customer, for the staff list: its partner and the newest run of each phase. */
export async function listCustomers(db: SupabaseClient): Promise<CustomerListItem[]> {
  const first = await db.from('groundswell_customers').select(`${CUSTOMER_COLUMNS},stage`).order('updated_at', { ascending: false }).limit(1000);
  const customers = first.error && missingColumn(first.error.message) ? await db.from('groundswell_customers').select(CUSTOMER_COLUMNS).order('updated_at', { ascending: false }).limit(1000) : first;
  if (customers.error) throw new Error(missingTable(customers.error.message) ? 'NOT_READY' : customers.error.message);
  const partners = await db.from('groundswell_partners').select('id,company');
  const byPartner = new Map(((partners.data ?? []) as { id: string; company: string }[]).map((p) => [p.id, p]));
  const runsRead = await db.from('marketing_audits').select('customer_id,status,phase,created_at,completed_at').order('created_at', { ascending: false }).limit(5000);
  const runs = runsRead.error && missingColumn(runsRead.error.message) ? await db.from('marketing_audits').select('customer_id,status,created_at,completed_at').order('created_at', { ascending: false }).limit(5000) : runsRead;
  if (runs.error) throw new Error(runs.error.message);
  const rows = ((runs.data ?? []) as unknown as { customer_id: string | null; status: string; phase?: Phase; created_at: string; completed_at: string | null }[]).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  return ((customers.data ?? []) as unknown as (Record<string, unknown> & { id: string; partner_id: string | null; updated_at: string })[]).map((c) => {
    const phases = Object.fromEntries(
      PHASES.map((p) => {
        const r = rows.find((x) => x.customer_id === c.id && (x.phase ?? 'audit') === p);
        return [p, r ? { status: r.status, at: r.completed_at ?? r.created_at } : null];
      })
    ) as CustomerListItem['phases'];
    const p = c.partner_id ? byPartner.get(c.partner_id) : null;
    return {
      id: c.id,
      business_name: String(c.business_name),
      city: (c.city as string | null) ?? null,
      stage: (c.stage as string | undefined) ?? 'prospect',
      partner: p ? { id: p.id, company: p.company } : null,
      updated_at: c.updated_at,
      phases,
    };
  });
}

