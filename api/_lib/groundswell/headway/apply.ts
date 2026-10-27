import type { SupabaseClient } from '@supabase/supabase-js';
import type { GoogleCampaign, MetaAdSet, MetaCallToAction } from '../../../../packages/groundswell/src/adsets.js';
import { HEADWAY_SERVICE_INFO, type HeadwayService } from '../../../../src/lib/headway.js';
import type { ClientService } from '../../../../src/lib/groundswellValidation.js';
import { signedAssetUrl } from '../assetStore.js';
import type { ClientAccountRow } from '../clientAccounts.js';
import { executeToolAs, findKey, isComposioConfigured } from '../composio.js';
import { queuePhase } from '../phases.js';
import { buildChecklist, missingAmong } from './checklist.js';
import { ACTION_COLUMNS, enabledServices, readServices, readSetupRows, type ActionRow, type SetupRow } from './store.js';

/**
 * Headway's hands: the tools that carry out an approved automatic action as
 * the client's own linked account (executeToolAs, never New Wave's shared
 * connection), and the loop that applies what is due.
 *
 * Every campaign is created paused with its ad sets, ad groups and ads live
 * underneath, so nothing can deliver until the second, separate approval
 * turns the campaign on. Posts go out on their day. Each tool returns a
 * plain record of what it made (ids, links, what it could not do), kept on
 * the action for the record.
 */

/** Runs one Composio tool as the client's account for a service. */
export type Run = (service: ClientService, slug: string, args: Record<string, unknown>) => Promise<unknown>;

export interface ApplyContext {
  db: SupabaseClient;
  action: ActionRow;
  customer: { id: string; business_name: string; website: string | null; city: string | null };
  run: Run;
  /** A short-lived public link to a stored image (the creative step's), for a provider to fetch. */
  signedUrl: (path: string) => Promise<string>;
  /** The action this one waits on, applied, with its result. */
  dependency: ActionRow | null;
  /** A typed setup item's value, when it was given (ids are kept in clear; logins are decrypted only here). */
  setup: (key: string) => string | null;
  now: Date;
}

export type Executor = (ctx: ApplyContext) => Promise<Record<string, unknown>>;

/** A reason the action cannot go through as things stand (a plain sentence for staff); no retry will change it. */
export class ApplyProblem extends Error {
  readonly plain = true;
}

const str = (x: unknown) => (typeof x === 'string' && x.trim() ? x.trim() : null);
const list = (x: unknown, key: string): Record<string, unknown>[] => {
  const v = findKey<unknown>(x, key);
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
};
const micros = (usd: number) => Math.round(usd * 1_000_000);

// ---------------------------------------------------------------------------
// Instagram: publish the day's post.

const instagramPublish: Executor = async ({ action, run, signedUrl }) => {
  const p = action.payload as { caption?: string; image_path?: string; alt_text?: string };
  if (!p.image_path) throw new ApplyProblem('This post has no image to publish.');
  const info = await run('instagram', 'INSTAGRAM_GET_USER_INFO', { ig_user_id: 'me', fields: 'id,username' });
  const igUserId = str(findKey(info, 'id'));
  if (!igUserId) throw new ApplyProblem('The linked Instagram account did not answer with its id. Link it again.');
  const image_url = await signedUrl(p.image_path);
  const container = await run('instagram', 'INSTAGRAM_POST_IG_USER_MEDIA', { ig_user_id: igUserId, image_url, caption: p.caption ?? '', ...(p.alt_text ? { alt_text: p.alt_text } : {}) });
  const creation_id = str(findKey(container, 'id'));
  if (!creation_id) throw new Error('Instagram did not return a media container id.');
  const published = await run('instagram', 'INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH', { ig_user_id: igUserId, creation_id, max_wait_seconds: 90 });
  const media_id = str(findKey(published, 'id'));
  return { ig_user_id: igUserId, username: str(findKey(info, 'username')), container_id: creation_id, media_id, published_at: new Date().toISOString() };
};

// ---------------------------------------------------------------------------
// Google Ads: the search campaign, paused, in one atomic batch.

/** The customer id the campaign goes in: the setup item, else the first non-manager account the link can read. */
async function googleCustomerId(run: Run, setup: ApplyContext['setup']): Promise<string> {
  const given = setup('google_ads_customer_id')?.replace(/[^0-9]/g, '');
  if (given) return given;
  const names = findKey<string[]>(await run('googleads', 'GOOGLEADS_LIST_ACCESSIBLE_CUSTOMERS', {}), 'resourceNames') ?? [];
  const ids = names.map((n) => n.split('/').pop()!).filter(Boolean);
  for (const customer_id of ids.slice(0, 5)) {
    try {
      const row = list(await run('googleads', 'GOOGLEADS_SEARCH_STREAM_GAQL', { customer_id, query: 'SELECT customer.id, customer.manager FROM customer LIMIT 1' }), 'results')[0];
      const customer = (row?.customer ?? {}) as { manager?: boolean };
      if (!customer.manager) return customer_id;
    } catch {
      // A manager account, or one this link cannot read: try the next.
    }
  }
  throw new ApplyProblem('No Google Ads account this link can write to was found. Add the Google Ads customer id to the setup checklist.');
}

/** The geo target constant for a "City, ST" location, when Google has one. */
async function geoTarget(run: Run, customer_id: string, location: string): Promise<string | null> {
  const city = location.split(',')[0]?.trim().replace(/'/g, "\\'");
  if (!city) return null;
  try {
    const rows = list(await run('googleads', 'GOOGLEADS_SEARCH_STREAM_GAQL', { customer_id, query: `SELECT geo_target_constant.resource_name, geo_target_constant.canonical_name FROM geo_target_constant WHERE geo_target_constant.name = '${city}' AND geo_target_constant.target_type = 'City' AND geo_target_constant.country_code = 'US' AND geo_target_constant.status = 'ENABLED' LIMIT 5` }), 'results');
    const state = location.split(',')[1]?.trim().toUpperCase();
    const match = rows.map((r) => (r.geoTargetConstant ?? r.geo_target_constant ?? {}) as { resourceName?: string; resource_name?: string; canonicalName?: string; canonical_name?: string });
    const chosen = match.find((g) => !state || (g.canonicalName ?? g.canonical_name ?? '').toUpperCase().includes(state)) ?? match[0];
    return chosen?.resourceName ?? chosen?.resource_name ?? null;
  } catch {
    return null;
  }
}

const googleCampaign: Executor = async ({ action, run, setup }) => {
  const p = action.payload as { campaign: GoogleCampaign; daily_budget_usd: number };
  const customer_id = await googleCustomerId(run, setup);
  const c = p.campaign;
  const budget = `customers/${customer_id}/campaignBudgets/-1`;
  const campaign = `customers/${customer_id}/campaigns/-2`;
  const geo = await geoTarget(run, customer_id, c.location);
  const ops: Record<string, unknown>[] = [
    { campaign_budget_operation: { create: { resource_name: budget, name: `${c.name} budget`, amount_micros: micros(p.daily_budget_usd), delivery_method: 'STANDARD', explicitly_shared: false } } },
    {
      campaign_operation: {
        create: {
          resource_name: campaign,
          name: c.name,
          status: 'PAUSED',
          advertising_channel_type: 'SEARCH',
          campaign_budget: budget,
          target_spend: {},
          network_settings: { target_google_search: true, target_search_network: false, target_content_network: false, target_partner_search_network: false },
          geo_target_type_setting: { positive_geo_target_type: 'PRESENCE', negative_geo_target_type: 'PRESENCE' },
          contains_eu_political_advertising: 'DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING',
        },
      },
    },
  ];
  if (geo) ops.push({ campaign_criterion_operation: { create: { campaign, location: { geo_target_constant: geo } } } });
  for (const neg of c.negatives) ops.push({ campaign_criterion_operation: { create: { campaign, negative: true, keyword: { text: neg.text, match_type: neg.match.toUpperCase() } } } });
  c.ad_groups.forEach((g, i) => {
    const adGroup = `customers/${customer_id}/adGroups/${-(10 + i)}`;
    const bids = g.keywords.map((k) => k.high_bid_usd).filter((b): b is number => typeof b === 'number' && b > 0);
    const cpc = bids.length ? bids.reduce((a, b) => a + b, 0) / bids.length : 1;
    ops.push({ ad_group_operation: { create: { resource_name: adGroup, name: g.name, campaign, status: 'ENABLED', type: 'SEARCH_STANDARD', cpc_bid_micros: micros(cpc) } } });
    for (const k of g.keywords) ops.push({ ad_group_criterion_operation: { create: { ad_group: adGroup, status: 'ENABLED', keyword: { text: k.text, match_type: k.match.toUpperCase() } } } });
    ops.push({
      ad_group_ad_operation: {
        create: {
          ad_group: adGroup,
          status: 'ENABLED',
          ad: { final_urls: [g.final_url], responsive_search_ad: { headlines: g.headlines.map((text) => ({ text })), descriptions: g.descriptions.map((text) => ({ text })), path1: g.path1 || undefined, path2: g.path2 || undefined } },
        },
      },
    });
  });
  const answer = await run('googleads', 'GOOGLEADS_BATCH_MUTATE', { customer_id, mutate_operations: ops, partial_failure: false, response_content_type: 'RESOURCE_NAME_ONLY' });
  const results = list(answer, 'mutateOperationResponses').length ? list(answer, 'mutateOperationResponses') : list(answer, 'mutate_operation_responses');
  const names = results.map((r) => str(findKey(r, 'resourceName')) ?? str(findKey(r, 'resource_name'))).filter((n): n is string => Boolean(n));
  const campaign_resource = names.find((n) => /\/campaigns\//.test(n)) ?? null;
  if (!campaign_resource) throw new Error('Google Ads answered without the campaign’s resource name; check the account before trying again.');
  return {
    customer_id,
    campaign_resource,
    ad_group_resources: names.filter((n) => /\/adGroups\//.test(n)),
    ad_resources: names.filter((n) => /\/adGroupAds\//.test(n)),
    location_set: Boolean(geo),
    note: geo ? `Location targeting set to ${c.location}.` : `Google has no city match for “${c.location}”: set the location targeting in Google Ads before turning the campaign on.`,
  };
};

const googleEnable: Executor = async ({ dependency, run }) => {
  const r = (dependency?.result ?? {}) as { customer_id?: string; campaign_resource?: string };
  if (!r.campaign_resource || !r.customer_id) throw new ApplyProblem('The campaign has not been built yet, so it cannot be turned on.');
  await run('googleads', 'GOOGLEADS_MUTATE_CAMPAIGNS', { customer_id: r.customer_id, operations: [{ operation_type: 'update', update: { resource_name: r.campaign_resource, status: 'enabled' } }] });
  return { customer_id: r.customer_id, campaign_resource: r.campaign_resource, enabled_at: new Date().toISOString() };
};

// ---------------------------------------------------------------------------
// Meta: the campaign paused, the ad set and its ads live beneath it.

const META_CTA: Record<MetaCallToAction, string> = { LEARN_MORE: 'LEARN_MORE', BOOK_NOW: 'BOOK_NOW', CALL_NOW: 'CONTACT_US', CONTACT_US: 'CONTACT_US', GET_QUOTE: 'CONTACT_US', SHOP_NOW: 'SHOP_NOW', SIGN_UP: 'SIGN_UP' };

async function metaAccountId(run: Run): Promise<string> {
  const answer = await run('metaads', 'METAADS_GET_AD_ACCOUNTS', { fields: 'id,account_id,name,account_status', limit: 25 });
  const accounts = [...list(answer, 'data'), ...list(answer, 'adaccounts')]
    .map((a) => ({ id: str(a.id) ?? (str(a.account_id) ? `act_${str(a.account_id)}` : null), status: typeof a.account_status === 'number' ? a.account_status : null }))
    .filter((a): a is { id: string; status: number | null } => Boolean(a.id));
  const chosen = accounts.find((a) => a.status === 1) ?? accounts[0];
  if (!chosen) throw new ApplyProblem('The linked Meta login reaches no ad account.');
  return chosen.id.startsWith('act_') ? chosen.id : `act_${chosen.id}`;
}

const metaAdset: Executor = async ({ action, run, setup, signedUrl }) => {
  const p = action.payload as { set: MetaAdSet; page_id: string | null; zip: string | null };
  const set = p.set;
  const page_id = p.page_id ?? setup('facebook_page_id');
  const zip = p.zip ?? setup('business_zip');
  if (!page_id) throw new ApplyProblem('The Facebook Page id is missing from the setup checklist.');
  if (!zip) throw new ApplyProblem('The business’s ZIP code is missing from the setup checklist.');
  const account_id = await metaAccountId(run);
  const pixel = setup('meta_pixel_id');
  const campaign = await run('metaads', 'METAADS_CREATE_CAMPAIGN', { account_id, name: set.campaign, objective: set.objective, status: 'PAUSED', special_ad_categories: [], is_adset_budget_sharing_enabled: false });
  const campaign_id = str(findKey(campaign, 'id'));
  if (!campaign_id) throw new Error('Meta did not return the campaign id.');
  const leads = set.optimization_goal === 'OFFSITE_CONVERSIONS';
  const optimization_goal = set.optimization_goal === 'POST_ENGAGEMENT' ? 'POST_ENGAGEMENT' : leads && pixel ? 'OFFSITE_CONVERSIONS' : 'LINK_CLICKS';
  const adSet = await run('metaads', 'METAADS_CREATE_AD_SET', {
    account_id,
    campaign_id,
    name: set.name,
    status: 'ACTIVE',
    daily_budget: Math.round(set.tiers.medium.daily * 100) / 100,
    billing_event: 'IMPRESSIONS',
    optimization_goal,
    ...(optimization_goal === 'OFFSITE_CONVERSIONS' ? { promoted_object: { pixel_id: pixel, custom_event_type: 'LEAD' } } : {}),
    targeting: { location_type: 'zip_codes', locations: [zip], location_radius: Math.max(1, Math.min(50, Math.round(set.audience.radius_miles))), age_min: set.audience.age_min, age_max: set.audience.age_max, targeting_automation: { advantage_audience: 0 } },
  });
  const ad_set_id = str(findKey(adSet, 'id'));
  if (!ad_set_id) throw new Error('Meta did not return the ad set id.');
  const ad_ids: string[] = [];
  const skipped: string[] = [];
  for (const ad of set.ads) {
    if (!ad.image?.path) {
      skipped.push(`${ad.name}: no image`);
      continue;
    }
    const image_url = await signedUrl(ad.image.path);
    const made = await run('metaads', 'METAADS_CREATE_AD', {
      ad_account_id: account_id,
      ad_set_id,
      name: ad.name,
      status: 'ACTIVE',
      creative: { type: 'IMAGE', page_id, message: ad.primary_text, website_url: ad.link, image_url, call_to_action: META_CTA[ad.call_to_action] ?? 'LEARN_MORE' },
    });
    const id = str(findKey(made, 'id'));
    if (id) ad_ids.push(id);
    else skipped.push(`${ad.name}: Meta returned no ad id`);
  }
  return {
    account_id,
    campaign_id,
    ad_set_id,
    ad_ids,
    optimization_goal,
    note: [leads && !pixel ? 'No Meta pixel id was given, so the set optimises for link clicks instead of leads.' : '', set.audience.interests.length ? `Interests are not set by the tool: add ${set.audience.interests.join(', ')} in Ads Manager if wanted.` : '', skipped.length ? `Left out: ${skipped.join('; ')}.` : ''].filter(Boolean).join(' ') || null,
  };
};

const metaEnable: Executor = async ({ dependency, run }) => {
  const r = (dependency?.result ?? {}) as { campaign_id?: string };
  if (!r.campaign_id) throw new ApplyProblem('The Meta set has not been built yet, so it cannot be turned on.');
  await run('metaads', 'METAADS_UPDATE_CAMPAIGN', { campaign_id: r.campaign_id, status: 'ACTIVE' });
  return { campaign_id: r.campaign_id, enabled_at: new Date().toISOString() };
};

// ---------------------------------------------------------------------------
// Search Console: the sitemap, once it answers.

const sitemapSubmit: Executor = async ({ action, run }) => {
  const p = action.payload as { origin: string; sitemap: string };
  let status = 0;
  try {
    status = (await fetch(p.sitemap, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(10_000) })).status;
  } catch {
    status = 0;
  }
  if (status !== 200) throw new ApplyProblem(`${p.sitemap} does not answer (HTTP ${status || 'no answer'}); publish the sitemap first.`);
  const host = new URL(p.origin).hostname.replace(/^www\./, '');
  const sites = list(await run('google_search_console', 'GOOGLE_SEARCH_CONSOLE_LIST_SITES', {}), 'siteEntry').map((s) => str(s.siteUrl) ?? str(s.site_url)).filter((s): s is string => Boolean(s));
  const site_url = sites.find((s) => s === `sc-domain:${host}`) ?? sites.find((s) => s.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') === host) ?? null;
  if (!site_url) throw new ApplyProblem(`The linked Search Console login has no property for ${host}.`);
  await run('google_search_console', 'GOOGLE_SEARCH_CONSOLE_SUBMIT_SITEMAP', { site_url, feedpath: p.sitemap });
  return { site_url, sitemap: p.sitemap, submitted_at: new Date().toISOString() };
};

// ---------------------------------------------------------------------------
// GroundSwell: the plan read against the business's own accounts.

const measure: Executor = async ({ db, action }) => {
  const p = action.payload as { source_audit_id?: string };
  if (!p.source_audit_id) throw new ApplyProblem('No delivered competitor plan to build the integrated plan on.');
  const result = await queuePhase(db, p.source_audit_id, 'integrated');
  if (!result.queued) throw new ApplyProblem(result.reason);
  return { queued: result.queued, reason: result.reason };
};

export const EXECUTORS: Record<string, Executor> = {
  'instagram.publish': instagramPublish,
  'googleads.campaign': googleCampaign,
  'googleads.enable': googleEnable,
  'metaads.adset': metaAdset,
  'metaads.enable': metaEnable,
  'search_console.sitemap': sitemapSubmit,
  'groundswell.measure': measure,
};

// ---------------------------------------------------------------------------
// The loop.

export const LEASE_MS = 10 * 60_000;
export const MAX_ATTEMPTS = 3;
const message = (err: unknown) => (err instanceof Error ? err.message : String(err)).slice(0, 500);

export interface ApplyReport {
  ran: { action: string; outcome: 'applied' | 'failed' | 'waiting' | 'skipped'; note?: string }[];
}

async function activeAccounts(db: SupabaseClient, customerId: string): Promise<ClientAccountRow[]> {
  const read = await db.from('groundswell_client_accounts').select('id,customer_id,service,composio_account_id,auth_config_id,user_id,status,status_reason,linked_by,linked_at,checked_at,created_at,updated_at').eq('customer_id', customerId).eq('status', 'active');
  if (read.error) {
    if (/relation .* does not exist|42P01/i.test(read.error.message)) return [];
    throw new Error(`Could not read the linked accounts: ${read.error.message}`);
  }
  return (read.data ?? []) as unknown as ClientAccountRow[];
}

/** Ids in clear, logins decrypted, for the executors only. */
function setupReader(rows: SetupRow[], decrypt: (stored: string) => string): ApplyContext['setup'] {
  return (key) => {
    const row = rows.find((r) => r.key === key && r.status === 'provided');
    if (!row) return null;
    if (row.value_encrypted) {
      try {
        return decrypt(row.value_encrypted);
      } catch {
        return null;
      }
    }
    return row.value_hint ?? null;
  };
}

export interface ApplyOptions {
  deadline: number;
  now?: () => Date;
  /** At most this many actions per call (each may take a minute). */
  max?: number;
  executors?: Record<string, Executor>;
  executeAs?: typeof executeToolAs;
  signedUrl?: (db: SupabaseClient, path: string) => Promise<string>;
  decrypt?: (stored: string) => string;
}

/**
 * Applies the approved automatic actions that are due: scheduled for now or
 * earlier, with their dependency applied, and their setup in place. Each is
 * claimed by moving it to `applying` while it is still `approved` (a lease
 * guards against a worker that died mid-action), run, and recorded as
 * `applied` with its result or `failed` with the reason. An action whose
 * setup is still missing stays `approved` with a note saying what it waits
 * on. A handoff is never applied here: the team marks it done.
 */
export async function applyDueActions(db: SupabaseClient, opts: ApplyOptions): Promise<ApplyReport> {
  const now = opts.now ?? (() => new Date());
  const max = opts.max ?? 5;
  const executors = opts.executors ?? EXECUTORS;
  const executeAs = opts.executeAs ?? executeToolAs;
  const signed = opts.signedUrl ?? ((d: SupabaseClient, path: string) => signedAssetUrl(d, path, 900));
  const decrypt = opts.decrypt ?? ((stored: string) => { throw new Error(`No decrypt for ${stored.slice(0, 2)}`); });
  const report: ApplyReport = { ran: [] };

  const read = await db.from('groundswell_headway_actions').select(ACTION_COLUMNS).in('status', ['approved', 'applying']).eq('kind', 'automatic').order('created_at', { ascending: true }).limit(200);
  if (read.error) {
    if (/relation .* does not exist|42P01/i.test(read.error.message)) return report;
    throw new Error(`Could not read the actions: ${read.error.message}`);
  }
  const all = (read.data ?? []) as unknown as ActionRow[];
  const stale = (a: ActionRow) => a.status === 'applying' && (!a.lease_until || Date.parse(a.lease_until) < now().getTime());
  // A worker that died mid-action: the lease has lapsed; try again, or give up after MAX_ATTEMPTS.
  for (const a of all.filter(stale)) {
    const patch = a.attempts >= MAX_ATTEMPTS ? { status: 'failed', error: 'The action was started but never finished, three times.', lease_until: null } : { status: 'approved', lease_until: null };
    await db.from('groundswell_headway_actions').update(patch).eq('id', a.id).eq('status', 'applying');
    a.status = patch.status as ActionRow['status'];
  }
  const due = all.filter((a) => a.status === 'approved' && (!a.scheduled_for || Date.parse(a.scheduled_for) <= now().getTime()));
  const byId = new Map(all.map((a) => [a.id, a]));

  for (const action of due) {
    if (report.ran.length >= max || opts.deadline - Date.now() < 60_000) break;
    let dependency: ActionRow | null = null;
    if (action.depends_on) {
      const dep = byId.get(action.depends_on) ?? ((await db.from('groundswell_headway_actions').select(ACTION_COLUMNS).eq('id', action.depends_on).maybeSingle()).data as ActionRow | null);
      if (!dep || dep.status !== 'applied') {
        report.ran.push({ action: action.id, outcome: 'waiting', note: 'Waits on the action before it.' });
        continue;
      }
      dependency = dep;
    }
    const claim = await db
      .from('groundswell_headway_actions')
      .update({ status: 'applying', lease_until: new Date(now().getTime() + LEASE_MS).toISOString(), attempts: action.attempts + 1 })
      .eq('id', action.id)
      .eq('status', 'approved')
      .select('id');
    if (claim.error) throw new Error(`Could not claim the action: ${claim.error.message}`);
    if (!(claim.data ?? []).length) {
      report.ran.push({ action: action.id, outcome: 'skipped', note: 'Another worker took it.' });
      continue;
    }
    const back = async (patch: Record<string, unknown>) => {
      const { error } = await db.from('groundswell_headway_actions').update({ ...patch, lease_until: null }).eq('id', action.id);
      if (error) throw new Error(`Could not record the action's outcome: ${error.message}`);
    };
    try {
      const customerRead = await db.from('groundswell_customers').select('id,business_name,website,city').eq('id', action.customer_id).maybeSingle();
      if (customerRead.error || !customerRead.data) throw new ApplyProblem('The customer this action belongs to is gone.');
      const customer = customerRead.data as unknown as ApplyContext['customer'];
      const [services, setupRows, accounts] = await Promise.all([readServices(db, action.customer_id), readSetupRows(db, action.customer_id), activeAccounts(db, action.customer_id)]);
      const enabled = enabledServices(services ?? []);
      if (!enabled.includes(action.service as HeadwayService)) throw new ApplyProblem(`${HEADWAY_SERVICE_INFO[action.service as HeadwayService].label} is switched off for this customer.`);
      const checklist = buildChecklist(enabled, accounts, setupRows ?? []);
      const blocked = missingAmong(checklist, Array.isArray(action.blocked_by) ? action.blocked_by : []);
      if (blocked.length) {
        await back({ status: 'approved', error: `Waiting on: ${blocked.join(', ')}.`, attempts: action.attempts });
        report.ran.push({ action: action.id, outcome: 'waiting', note: blocked.join(', ') });
        continue;
      }
      if (!action.tool || !executors[action.tool]) throw new ApplyProblem(`No tool is wired for ${action.tool ?? 'this action'}.`);
      if (!isComposioConfigured() && action.tool !== 'groundswell.measure') throw new ApplyProblem('The Composio project is not set up, so the client’s accounts cannot be used.');
      const timeoutMs = Math.max(15_000, Math.min(120_000, opts.deadline - Date.now() - 15_000));
      const run: Run = (service, slug, args) => {
        const row = accounts.find((a) => a.service === service);
        if (!row) throw new ApplyProblem(`No ${service.replace(/_/g, ' ')} account is linked for this customer.`);
        return executeAs(slug, args, { id: row.composio_account_id, user_id: row.user_id }, timeoutMs);
      };
      const result = await executors[action.tool]({ db, action, customer, run, signedUrl: (path) => signed(db, path), dependency, setup: setupReader(setupRows ?? [], decrypt), now: now() });
      await back({ status: 'applied', result, error: null, applied_at: now().toISOString() });
      report.ran.push({ action: action.id, outcome: 'applied' });
    } catch (err) {
      const why = message(err);
      const permanent = err instanceof ApplyProblem || action.attempts + 1 >= MAX_ATTEMPTS;
      await back(permanent ? { status: 'failed', error: why } : { status: 'approved', error: `Try ${action.attempts + 1} failed: ${why}` });
      report.ran.push({ action: action.id, outcome: permanent ? 'failed' : 'waiting', note: why });
    }
  }
  return report;
}
