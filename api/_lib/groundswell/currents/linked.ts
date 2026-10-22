import type { SupabaseClient } from '@supabase/supabase-js';
import { CLIENT_SERVICES, type ClientService, type CustomerStage } from '../../../../src/lib/groundswellValidation.js';
import { getSupabaseAdmin } from '../../supabaseAdmin.js';
import type { ClientAccountRow } from '../clientAccounts.js';
import { executeToolAs, isComposioConfigured } from '../composio.js';
import type { StepContext } from '../types.js';

/**
 * The Accounts Current: a client's own accounts, read through the connections
 * a partner linked on the client's page (groundswell_client_accounts). Each
 * service is read as the client's connected account, never New Wave's shared
 * one, and each is best-effort: a service that cannot be read is named in the
 * reports in a plain sentence, and the audit goes on with the public data.
 *
 * A prospect has no linked accounts, so its run records that and reads
 * nothing. The step never fails an audit for a service's sake; only a
 * database read that errors is retried.
 */

export interface LinkedWindow {
  /** The first and last day read, YYYY-MM-DD, and the number of days. */
  start: string;
  end: string;
  days: number;
}

export interface GaData {
  property: string;
  totals: { sessions: number | null; users: number | null; new_users: number | null; conversions: number | null; engagement_rate_pct: number | null };
  channels: { channel: string; sessions: number | null; users: number | null; conversions: number | null }[];
  landing_pages: { page: string; sessions: number | null }[];
}

export interface GscData {
  site: string;
  totals: { clicks: number; impressions: number; ctr_pct: number | null; position: number | null };
  queries: { query: string; clicks: number; impressions: number; ctr_pct: number | null; position: number | null }[];
  pages: { page: string; clicks: number; impressions: number }[];
}

export interface GoogleAdsData {
  account: string;
  totals: { impressions: number; clicks: number; cost: number; conversions: number; conversion_value: number; cost_per_conversion: number | null };
  campaigns: { name: string; status: string | null; type: string | null; impressions: number; clicks: number; cost: number; conversions: number }[];
}

export interface InstagramData {
  username: string | null;
  followers: number | null;
  following: number | null;
  media_count: number | null;
  /** Account insights over the window; null where Instagram returned none. */
  reach: number | null;
  accounts_engaged: number | null;
  interactions: number | null;
  profile_views: number | null;
  website_clicks: number | null;
  /** The most recent posts read (up to 25) and what they show. */
  recent_posts: number;
  posts_in_window: number;
  reels_in_window: number;
  avg_likes: number | null;
  avg_comments: number | null;
}

export interface MetaAdsData {
  account: string;
  /** Null when the account delivered no ads in the window. */
  totals: { impressions: number; reach: number | null; clicks: number; spend: number; cpc: number | null; cpm: number | null; ctr_pct: number | null; leads: number; messages: number } | null;
  campaigns: { name: string; impressions: number; clicks: number; spend: number; leads: number }[];
}

export type LinkedData = GaData | GscData | GoogleAdsData | InstagramData | MetaAdsData;

export interface LinkedServiceResult {
  service: ClientService;
  label: string;
  ok: boolean;
  /** Where the figures came from, in the words the reports' Sources list carries. */
  source: string;
  data: LinkedData | null;
  /** Why the service was not read, as a plain sentence for the reports; null when it was. */
  problem: string | null;
  /** What went wrong, for staff (may name a tool or carry the provider's text); never printed. */
  detail: string | null;
}

export interface LinkedOutput {
  fetched_at: string;
  /** True when at least one service was read. */
  linked: boolean;
  customer_id: string | null;
  stage: CustomerStage | null;
  window: LinkedWindow;
  /** One entry per linked (active) account, in catalogue order. */
  services: LinkedServiceResult[];
  /** Why nothing was read, when nothing was (a prospect, no accounts, Composio not set up). */
  note: string | null;
}

export const isLinkedOutput = (v: unknown): v is LinkedOutput =>
  typeof v === 'object' && v !== null && Array.isArray((v as LinkedOutput).services) && typeof (v as LinkedOutput).window === 'object';

/** Days of data read: Analytics, Ads and Instagram up to yesterday; Search Console ends three days back (its data lags). */
export const WINDOW_DAYS = 30;
const GSC_LAG_DAYS = 3;

const COLUMNS = 'id,customer_id,service,composio_account_id,auth_config_id,user_id,status,status_reason,linked_by,linked_at,checked_at,created_at,updated_at';
const missingTable = (message: string | undefined) => /relation .* does not exist|42P01/i.test(message ?? '');
const missingColumn = (message: string | undefined) => /column .* does not exist|42703/i.test(message ?? '');

/** A reason a service cannot be read, in the words the reports carry. */
class LinkedProblem extends Error {
  readonly plain = true;
}

// ---------------------------------------------------------------------------
// Loading the client's accounts

export interface LinkedAccounts {
  customer_id: string | null;
  stage: CustomerStage | null;
  rows: ClientAccountRow[];
  note: string | null;
}

/**
 * The audit's customer and its active linked accounts. Where the database
 * does not have the customers, stages or accounts yet (a migration not
 * applied), the audit reads as a prospect's. Any other read error throws, so
 * the step retries rather than printing a client's audit from public data
 * when its accounts were there to read.
 */
export async function loadLinkedAccounts(db: SupabaseClient, auditId: string): Promise<LinkedAccounts> {
  const none = (note: string, customer_id: string | null = null, stage: CustomerStage | null = null): LinkedAccounts => ({ customer_id, stage, rows: [], note });
  const a = await db.from('marketing_audits').select('customer_id').eq('id', auditId).maybeSingle();
  if (a.error) {
    if (missingColumn(a.error.message)) return none('This audit is not tied to a customer, so it has no linked accounts.');
    throw new Error(`Could not read the audit's customer: ${a.error.message}`);
  }
  const customerId = typeof a.data?.customer_id === 'string' ? a.data.customer_id : null;
  if (!customerId) return none('This audit is not tied to a customer, so it has no linked accounts.');

  let c = await db.from('groundswell_customers').select('id,stage').eq('id', customerId).maybeSingle();
  if (c.error && missingColumn(c.error.message)) c = await db.from('groundswell_customers').select('id').eq('id', customerId).maybeSingle();
  if (c.error) {
    if (missingTable(c.error.message)) return none('This audit is not tied to a customer, so it has no linked accounts.', customerId);
    throw new Error(`Could not read the audit's customer: ${c.error.message}`);
  }
  const stage: CustomerStage = (c.data as { stage?: CustomerStage } | null)?.stage === 'client' ? 'client' : 'prospect';
  if (stage !== 'client') return none('This business is a prospect, so its audit is built from public data.', customerId, stage);

  const rows = await db.from('groundswell_client_accounts').select(COLUMNS).eq('customer_id', customerId).eq('status', 'active');
  if (rows.error) {
    if (missingTable(rows.error.message)) return none('No accounts are linked for this client yet, so its audit is built from public data.', customerId, stage);
    throw new Error(`Could not read the client's linked accounts: ${rows.error.message}`);
  }
  const active = ((rows.data ?? []) as unknown as ClientAccountRow[]).filter((r) => r.status === 'active' && r.composio_account_id);
  active.sort((x, y) => order(x.service) - order(y.service));
  return { customer_id: customerId, stage, rows: active, note: active.length ? null : 'No accounts are linked for this client yet, so its audit is built from public data.' };
}

const order = (s: ClientService) => CLIENT_SERVICES.findIndex((c) => c.key === s);
const labelOf = (s: ClientService) => CLIENT_SERVICES.find((c) => c.key === s)?.label ?? s;

// ---------------------------------------------------------------------------
// Reading what Composio returns

type Run = (slug: string, args: Record<string, unknown>) => Promise<unknown>;
type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/** The first value under `key` in `value` or an object nested up to three levels down (Composio wraps answers differently per toolkit). */
export function findKey(value: unknown, key: string, depth = 3): unknown {
  if (!isObj(value)) return undefined;
  if (key in value) return value[key];
  if (depth === 0) return undefined;
  for (const v of Object.values(value)) {
    const found = findKey(v, key, depth - 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

const list = (value: unknown, key: string): Obj[] => {
  const found = findKey(value, key);
  return Array.isArray(found) ? found.filter(isObj) : [];
};

const n = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
};
const n0 = (v: unknown) => n(v) ?? 0;
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const round = (x: number | null, digits = 0) => (x === null ? null : Math.round(x * 10 ** digits) / 10 ** digits);
const pct = (x: number | null) => (x === null ? null : Math.round(x * 100));
const ratio = (a: number, b: number) => (b > 0 ? a / b : null);
const sum = (xs: (number | null)[]) => xs.reduce<number>((t, x) => t + (x ?? 0), 0);
const avg = (xs: number[]) => (xs.length ? Math.round(sum(xs) / xs.length) : null);

const day = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (now: number, days: number) => new Date(now - days * 86_400_000);

export function readWindow(now = Date.now()): LinkedWindow {
  return { start: day(daysAgo(now, WINDOW_DAYS)), end: day(daysAgo(now, 1)), days: WINDOW_DAYS };
}

/** The business's own host, without www, to match a property or site against. */
function hostOf(website: string | null): string | null {
  if (!website) return null;
  try {
    return new URL(website.startsWith('http') ? website : `https://${website}`).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// The services

async function readGa(run: Run, website: string | null, w: LinkedWindow): Promise<GaData> {
  const summaries = list(await run('GOOGLE_ANALYTICS_LIST_ACCOUNT_SUMMARIES', { pageSize: 50 }), 'accountSummaries');
  const properties = summaries
    .flatMap((s) => list(s, 'propertySummaries'))
    .map((p) => ({ property: str(p.property) ?? '', name: str(p.displayName) ?? str(p.property) ?? '' }))
    .filter((p) => p.property);
  if (!properties.length) throw new LinkedProblem('The linked Google account has no Google Analytics property to read.');
  const base = hostOf(website)?.split('.')[0] ?? '';
  const chosen = (base ? properties.find((p) => p.name.toLowerCase().includes(base)) : undefined) ?? properties[0];
  const dateRanges = [{ startDate: w.start, endDate: w.end }];
  const metricNames = ['sessions', 'totalUsers', 'newUsers', 'conversions', 'engagementRate'];
  const report = await run('GOOGLE_ANALYTICS_RUN_REPORT', {
    property: chosen.property,
    dateRanges,
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: metricNames.map((name) => ({ name })),
    orderBys: [{ desc: true, metric: { metricName: 'sessions' } }],
    limit: 10,
    metricAggregations: ['TOTAL'],
  });
  const headers = list(report, 'metricHeaders').map((h) => str(h.name) ?? '');
  const values = (row: Obj) => {
    const mv = Array.isArray(row.metricValues) ? (row.metricValues as Obj[]) : [];
    const out: Record<string, number | null> = {};
    headers.forEach((h, i) => (out[h] = n(mv[i]?.value)));
    return out;
  };
  const dim = (row: Obj, i = 0) => str((Array.isArray(row.dimensionValues) ? (row.dimensionValues as Obj[])[i] : undefined)?.value) ?? '(not set)';
  const rows = list(report, 'rows');
  const totalRow = list(report, 'totals')[0];
  const channels = rows.map((r) => ({ channel: dim(r), sessions: values(r).sessions ?? null, users: values(r).totalUsers ?? null, conversions: values(r).conversions ?? null }));
  const t = totalRow ? values(totalRow) : { sessions: sum(channels.map((c) => c.sessions)), totalUsers: null, newUsers: null, conversions: sum(channels.map((c) => c.conversions)), engagementRate: null };
  let landing: GaData['landing_pages'] = [];
  try {
    const pages = await run('GOOGLE_ANALYTICS_RUN_REPORT', {
      property: chosen.property,
      dateRanges,
      dimensions: [{ name: 'landingPage' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ desc: true, metric: { metricName: 'sessions' } }],
      limit: 10,
    });
    landing = list(pages, 'rows').map((r) => ({ page: dim(r), sessions: n((Array.isArray(r.metricValues) ? (r.metricValues as Obj[])[0] : undefined)?.value) }));
  } catch {
    // The channel totals stand on their own.
  }
  return {
    property: chosen.name,
    totals: { sessions: t.sessions ?? null, users: t.totalUsers ?? null, new_users: t.newUsers ?? null, conversions: t.conversions ?? null, engagement_rate_pct: pct(t.engagementRate ?? null) },
    channels,
    landing_pages: landing,
  };
}

async function readGsc(run: Run, website: string | null, w: LinkedWindow): Promise<GscData> {
  const sites = list(await run('GOOGLE_SEARCH_CONSOLE_LIST_SITES', {}), 'siteEntry')
    .map((s) => ({ url: str(s.siteUrl) ?? '', level: str(s.permissionLevel) ?? '' }))
    .filter((s) => s.url && s.level !== 'siteUnverifiedUser');
  if (!sites.length) throw new LinkedProblem('The linked Google account has no verified Search Console site to read.');
  const host = hostOf(website);
  const root = host?.split('.').slice(-2).join('.') ?? '';
  const matches = host ? sites.filter((s) => s.url.toLowerCase().includes(host) || (root && s.url.toLowerCase() === `sc-domain:${root}`)) : [];
  const chosen = matches.find((s) => s.url.startsWith('sc-domain:')) ?? matches[0] ?? (sites.length === 1 ? sites[0] : null);
  if (!chosen) throw new LinkedProblem('Search Console lists more than one site and none matches the business’s website.');
  const end = day(daysAgo(Date.parse(`${w.end}T00:00:00Z`), GSC_LAG_DAYS - 1));
  const start = day(daysAgo(Date.parse(`${end}T00:00:00Z`), w.days - 1));
  const query = async (dimensions: string[], row_limit: number) =>
    list(await run('GOOGLE_SEARCH_CONSOLE_SEARCH_ANALYTICS_QUERY', { site_url: chosen.url, start_date: start, end_date: end, dimensions, row_limit }), 'rows').map((r) => ({
      key: str(Array.isArray(r.keys) ? r.keys[0] : null) ?? '',
      clicks: n0(r.clicks),
      impressions: n0(r.impressions),
      ctr: n(r.ctr),
      position: n(r.position),
    }));
  const [days, queries, pages] = await Promise.all([query(['date'], 100), query(['query'], 25), query(['page'], 10)]);
  const clicks = sum(days.map((d) => d.clicks));
  const impressions = sum(days.map((d) => d.impressions));
  const weighted = sum(days.map((d) => (d.position === null ? 0 : d.position * d.impressions)));
  return {
    site: chosen.url,
    totals: { clicks, impressions, ctr_pct: pct(ratio(clicks, impressions)), position: impressions ? round(weighted / impressions, 1) : null },
    queries: queries.map((q) => ({ query: q.key, clicks: q.clicks, impressions: q.impressions, ctr_pct: pct(q.ctr), position: round(q.position, 1) })),
    pages: pages.map((p) => ({ page: p.key, clicks: p.clicks, impressions: p.impressions })),
  };
}

const GAQL_CAMPAIGNS =
  'SELECT campaign.name, campaign.status, campaign.advertising_channel_type, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM campaign WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.cost_micros DESC LIMIT 25';

async function readGoogleAds(run: Run): Promise<GoogleAdsData> {
  const names = findKey(await run('GOOGLEADS_LIST_ACCESSIBLE_CUSTOMERS', {}), 'resourceNames');
  const ids = (Array.isArray(names) ? names : []).map((r) => String(r).replace(/^customers\//, '')).filter((id) => /^\d+$/.test(id));
  if (!ids.length) throw new LinkedProblem('The linked Google account has no Google Ads account to read.');
  // A manager account answers no campaign metrics; the first account that does is the one read.
  let lastError: unknown = null;
  for (const customer_id of ids.slice(0, 3)) {
    let results: Obj[];
    try {
      results = list(await run('GOOGLEADS_SEARCH_STREAM_GAQL', { customer_id, query: GAQL_CAMPAIGNS }), 'results');
    } catch (err) {
      lastError = err;
      continue;
    }
    let account = 'Google Ads account';
    try {
      const who = list(await run('GOOGLEADS_SEARCH_STREAM_GAQL', { customer_id, query: 'SELECT customer.descriptive_name FROM customer LIMIT 1' }), 'results')[0];
      account = str(findKey(who, 'descriptiveName') ?? findKey(who, 'descriptive_name')) ?? account;
    } catch {
      // The name is a nicety.
    }
    const campaigns = results.map((r) => {
      const c = isObj(r.campaign) ? r.campaign : {};
      const m = isObj(r.metrics) ? r.metrics : {};
      return {
        name: str(c.name) ?? '(unnamed)',
        status: str(c.status),
        type: str(c.advertisingChannelType ?? c.advertising_channel_type),
        impressions: n0(m.impressions),
        clicks: n0(m.clicks),
        cost: Math.round(n0(m.costMicros ?? m.cost_micros) / 1_000_000),
        conversions: round(n0(m.conversions), 1) ?? 0,
      };
    });
    const cost = sum(campaigns.map((c) => c.cost));
    const conversions = round(sum(campaigns.map((c) => c.conversions)), 1) ?? 0;
    return {
      account,
      totals: {
        impressions: sum(campaigns.map((c) => c.impressions)),
        clicks: sum(campaigns.map((c) => c.clicks)),
        cost,
        conversions,
        conversion_value: Math.round(sum(results.map((r) => n0(findKey(r, 'conversionsValue') ?? findKey(r, 'conversions_value'))))),
        cost_per_conversion: conversions > 0 ? Math.round(cost / conversions) : null,
      },
      campaigns,
    };
  }
  throw lastError ?? new LinkedProblem('The linked Google Ads account answered no campaign data.');
}

async function readInstagram(run: Run, w: LinkedWindow): Promise<InstagramData> {
  const info = await run('INSTAGRAM_GET_USER_INFO', { ig_user_id: 'me', fields: 'id,username,name,followers_count,follows_count,media_count' });
  const out: InstagramData = {
    username: str(findKey(info, 'username')),
    followers: n(findKey(info, 'followers_count')),
    following: n(findKey(info, 'follows_count')),
    media_count: n(findKey(info, 'media_count')),
    reach: null,
    accounts_engaged: null,
    interactions: null,
    profile_views: null,
    website_clicks: null,
    recent_posts: 0,
    posts_in_window: 0,
    reels_in_window: 0,
    avg_likes: null,
    avg_comments: null,
  };
  const since = Math.floor(Date.parse(`${w.start}T00:00:00Z`) / 1000);
  const until = Math.floor(Date.parse(`${w.end}T23:59:59Z`) / 1000);
  try {
    const insights = list(await run('INSTAGRAM_GET_USER_INSIGHTS', { metric: ['reach', 'accounts_engaged', 'total_interactions', 'profile_views', 'website_clicks'], period: 'day', metric_type: 'total_value', since, until }), 'data');
    const total = (name: string) => {
      const m = insights.find((i) => i.name === name);
      if (!m) return null;
      const tv = isObj(m.total_value) ? n(m.total_value.value) : null;
      if (tv !== null) return tv;
      const values = Array.isArray(m.values) ? (m.values as Obj[]).map((v) => n(v.value)) : [];
      return values.length ? sum(values) : null;
    };
    out.reach = total('reach');
    out.accounts_engaged = total('accounts_engaged');
    out.interactions = total('total_interactions');
    out.profile_views = total('profile_views');
    out.website_clicks = total('website_clicks');
  } catch {
    // Insights are empty or refused for small accounts; the profile and posts still count.
  }
  try {
    const media = list(await run('INSTAGRAM_GET_IG_USER_MEDIA', { ig_user_id: 'me', limit: 25, fields: 'id,media_type,media_product_type,timestamp,like_count,comments_count' }), 'data');
    const inWindow = media.filter((m) => {
      const t = Date.parse(str(m.timestamp) ?? '');
      return Number.isFinite(t) && t >= since * 1000;
    });
    out.recent_posts = media.length;
    out.posts_in_window = inWindow.length;
    out.reels_in_window = inWindow.filter((m) => str(m.media_product_type)?.toUpperCase() === 'REELS').length;
    out.avg_likes = avg(media.map((m) => n(m.like_count)).filter((x): x is number => x !== null));
    out.avg_comments = avg(media.map((m) => n(m.comments_count)).filter((x): x is number => x !== null));
  } catch {
    // The profile stands on its own.
  }
  return out;
}

const LEAD_ACTIONS = new Set(['lead', 'onsite_conversion.lead_grouped', 'offsite_conversion.fb_pixel_lead', 'leadgen_grouped']);
const MESSAGE_ACTIONS = new Set(['onsite_conversion.messaging_conversation_started_7d', 'onsite_conversion.messaging_first_reply']);

async function readMetaAds(run: Run): Promise<MetaAdsData> {
  const answer = await run('METAADS_GET_AD_ACCOUNTS', { fields: 'id,account_id,name,currency,account_status', limit: 25 });
  const accounts = [...list(answer, 'data'), ...list(answer, 'adaccounts')].map((a) => ({ id: str(a.id) ?? (str(a.account_id) ? `act_${str(a.account_id)}` : null), name: str(a.name), status: n(a.account_status) })).filter((a) => a.id);
  if (!accounts.length) throw new LinkedProblem('The linked Meta login has no ad account to read.');
  const chosen = accounts.find((a) => a.status === 1) ?? accounts[0];
  const objectId = chosen.id!.startsWith('act_') ? chosen.id! : `act_${chosen.id}`;
  const actions = (row: Obj, types: Set<string>) => sum((Array.isArray(row.actions) ? (row.actions as Obj[]) : []).filter((a) => types.has(str(a.action_type) ?? '')).map((a) => n(a.value)));
  const row = list(await run('METAADS_GET_INSIGHTS', { object_id: objectId, level: 'account', date_preset: 'last_30d', fields: ['impressions', 'reach', 'clicks', 'spend', 'cpc', 'cpm', 'ctr', 'actions'] }), 'data')[0];
  const totals: MetaAdsData['totals'] = row
    ? {
        impressions: n0(row.impressions),
        reach: n(row.reach),
        clicks: n0(row.clicks),
        spend: Math.round(n0(row.spend)),
        cpc: round(n(row.cpc), 2),
        cpm: round(n(row.cpm), 2),
        ctr_pct: round(n(row.ctr), 1),
        leads: actions(row, LEAD_ACTIONS),
        messages: actions(row, MESSAGE_ACTIONS),
      }
    : null;
  let campaigns: MetaAdsData['campaigns'] = [];
  if (totals) {
    try {
      campaigns = list(await run('METAADS_GET_INSIGHTS', { object_id: objectId, level: 'campaign', date_preset: 'last_30d', fields: ['campaign_name', 'impressions', 'clicks', 'spend', 'actions'], limit: 25 }), 'data').map((c) => ({
        name: str(c.campaign_name) ?? '(unnamed)',
        impressions: n0(c.impressions),
        clicks: n0(c.clicks),
        spend: Math.round(n0(c.spend)),
        leads: actions(c, LEAD_ACTIONS),
      }));
    } catch {
      // The account totals stand on their own.
    }
  }
  return { account: chosen.name ?? 'Meta ad account', totals, campaigns };
}

// ---------------------------------------------------------------------------
// The step

const sourceOf = (service: ClientService, data: LinkedData, w: LinkedWindow): string => {
  const span = `${w.start} to ${w.end}`;
  switch (service) {
    case 'google_analytics':
      return `Google Analytics 4, the business’s property “${(data as GaData).property}” (${span})`;
    case 'google_search_console':
      return `Google Search Console, the business’s site ${(data as GscData).site} (${w.days} days ending ${GSC_LAG_DAYS} days before ${w.end}: its data lags)`;
    case 'googleads':
      return `Google Ads, the business’s own account (last 30 days)`;
    case 'instagram':
      return `Instagram Graph API, the business’s own account (${span})`;
    case 'metaads':
      return `Meta Ads, the business’s own ad account (last 30 days)`;
  }
};

/** A refused or stale connection: the account has to be linked again. */
const LINK_BROKEN = /expired|revoked|invalid_grant|not active|no (active )?connect|connected account|unauthori[sz]ed|\(401\)|\(403\)|permission/i;

function problemFor(err: unknown, label: string): string {
  if (err instanceof LinkedProblem) return err.message;
  const text = err instanceof Error ? err.message : String(err);
  if (LINK_BROKEN.test(text)) return `The ${label} link no longer works, so it was not read. Link the account again.`;
  return `${label} could not be read this time, so this audit uses public data for it.`;
}

/** Reads every linked service in parallel; one that fails is recorded, never thrown. */
export async function readLinkedServices(rows: ClientAccountRow[], website: string | null, w: LinkedWindow, deadline: number): Promise<LinkedServiceResult[]> {
  const timeoutMs = Math.max(10_000, Math.min(60_000, deadline - Date.now() - 10_000));
  return Promise.all(
    rows.map(async (row): Promise<LinkedServiceResult> => {
      const label = labelOf(row.service);
      const run: Run = (slug, args) => executeToolAs(slug, args, { id: row.composio_account_id, user_id: row.user_id }, timeoutMs);
      try {
        let data: LinkedData;
        switch (row.service) {
          case 'google_analytics':
            data = await readGa(run, website, w);
            break;
          case 'google_search_console':
            data = await readGsc(run, website, w);
            break;
          case 'googleads':
            data = await readGoogleAds(run);
            break;
          case 'instagram':
            data = await readInstagram(run, w);
            break;
          case 'metaads':
            data = await readMetaAds(run);
            break;
        }
        return { service: row.service, label, ok: true, source: sourceOf(row.service, data, w), data, problem: null, detail: null };
      } catch (err) {
        return { service: row.service, label, ok: false, source: label, data: null, problem: problemFor(err, label), detail: (err instanceof Error ? err.message : String(err)).slice(0, 500) };
      }
    })
  );
}

export async function runLinked(ctx: StepContext): Promise<LinkedOutput> {
  const w = readWindow();
  const base = { fetched_at: new Date().toISOString(), window: w };
  const accounts = await loadLinkedAccounts(getSupabaseAdmin(), ctx.audit.id);
  if (!accounts.rows.length) return { ...base, linked: false, customer_id: accounts.customer_id, stage: accounts.stage, services: [], note: accounts.note };
  if (!isComposioConfigured()) {
    return { ...base, linked: false, customer_id: accounts.customer_id, stage: accounts.stage, services: [], note: 'The linked accounts could not be read because the connection service is not set up, so this audit is built from public data.' };
  }
  const services = await readLinkedServices(accounts.rows, ctx.audit.website, w, ctx.deadline);
  return { ...base, linked: services.some((s) => s.ok), customer_id: accounts.customer_id, stage: accounts.stage, services, note: null };
}
