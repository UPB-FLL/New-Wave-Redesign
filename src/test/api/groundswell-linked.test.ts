import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from './fixtures/fakeSupabase';

/**
 * The Accounts Current (api/_lib/groundswell/currents/linked.ts): a client's
 * own accounts, read as the connections a partner linked, each best-effort;
 * a prospect's run records that it has none. Composio and the database are
 * stand-ins.
 */

const db = vi.hoisted(() => ({ current: null as ReturnType<typeof import('./fixtures/fakeSupabase').fakeSupabase> | null }));
const composio = vi.hoisted(() => ({ configured: true, executeToolAs: vi.fn() }));

vi.mock('../../../api/_lib/supabaseAdmin', () => ({
  isSupabaseConfigured: () => true,
  getSupabaseAdmin: () => db.current!.client,
}));
vi.mock('../../../api/_lib/groundswell/composio', async (original) => ({
  ...(await original<object>()),
  isComposioConfigured: () => composio.configured,
  executeToolAs: composio.executeToolAs,
}));

import { findKey, loadLinkedAccounts, readWindow, runLinked, WINDOW_DAYS, type GaData, type GoogleAdsData, type GscData, type InstagramData, type MetaAdsData } from '../../../api/_lib/groundswell/currents/linked';
import { allowedNumbers, buildFacts, factsForPrompt } from '../../../api/_lib/groundswell/model';
import { ALL_STEPS, INTEGRATED_STEPS, STEPS } from '../../../api/_lib/groundswell/steps';
import { STEP_LABELS } from '../../../src/lib/groundswell';
import { CLIENT_SERVICES } from '../../../src/lib/groundswellValidation';

const T0 = '2026-10-20T10:00:00.000Z';
const AUDIT = { id: 'a1', business_name: 'Harbor Auto Care', city: 'Fort Lauderdale, FL', website: 'https://www.harbor-auto.example', instagram: 'harborautocare', competitors: [], notes: null };
const ctx = { audit: AUDIT, outputs: {}, deadline: Date.now() + 250_000, attempt: 1 };

const account = (service: string, id = `ca_${service}`) => ({
  id: `row_${service}`,
  customer_id: 'c1',
  service,
  composio_account_id: id,
  auth_config_id: 'ac',
  user_id: 'client:c1',
  status: 'active',
  status_reason: null,
  linked_by: 'p1',
  linked_at: T0,
  checked_at: T0,
  created_at: T0,
  updated_at: T0,
});

function seed(opts: { stage?: string; customer?: boolean; accounts?: Record<string, unknown>[]; missing?: Record<string, string[]> } = {}) {
  db.current = fakeSupabase(
    {
      marketing_audits: [{ id: 'a1', customer_id: opts.customer === false ? null : 'c1' }],
      groundswell_customers: [{ id: 'c1', stage: opts.stage ?? 'client' }],
      groundswell_client_accounts: opts.accounts ?? [],
    },
    opts.missing ?? {}
  );
}

/** What each Composio tool answers for the sample client, in the shapes the providers return. */
const answers: Record<string, (args: Record<string, unknown>) => unknown> = {
  GOOGLE_ANALYTICS_LIST_ACCOUNT_SUMMARIES: () => ({
    accountSummaries: [{ account: 'accounts/1', propertySummaries: [{ property: 'properties/9', displayName: 'Old shop' }, { property: 'properties/42', displayName: 'Harbor-Auto site' }] }],
  }),
  GOOGLE_ANALYTICS_RUN_REPORT: (args) =>
    (args.dimensions as { name: string }[])[0].name === 'landingPage'
      ? { rows: [{ dimensionValues: [{ value: '/' }], metricValues: [{ value: '812' }] }, { dimensionValues: [{ value: '/brakes' }], metricValues: [{ value: '240' }] }] }
      : {
          metricHeaders: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'newUsers' }, { name: 'conversions' }, { name: 'engagementRate' }],
          rows: [
            { dimensionValues: [{ value: 'Organic Search' }], metricValues: [{ value: '1284' }, { value: '1010' }, { value: '880' }, { value: '31' }, { value: '0.61' }] },
            { dimensionValues: [{ value: 'Direct' }], metricValues: [{ value: '402' }, { value: '350' }, { value: '300' }, { value: '9' }, { value: '0.5' }] },
          ],
          totals: [{ dimensionValues: [{ value: 'RESERVED_TOTAL' }], metricValues: [{ value: '1686' }, { value: '1360' }, { value: '1180' }, { value: '40' }, { value: '0.5842' }] }],
        },
  GOOGLE_SEARCH_CONSOLE_LIST_SITES: () => ({
    siteEntry: [
      { siteUrl: 'https://other.example/', permissionLevel: 'siteOwner' },
      { siteUrl: 'sc-domain:harbor-auto.example', permissionLevel: 'siteFullUser' },
    ],
  }),
  GOOGLE_SEARCH_CONSOLE_SEARCH_ANALYTICS_QUERY: (args) => {
    const dim = (args.dimensions as string[])[0];
    if (dim === 'date') return { rows: [{ keys: ['2026-09-20'], clicks: 30, impressions: 1000, ctr: 0.03, position: 8 }, { keys: ['2026-09-21'], clicks: 50, impressions: 3000, ctr: 0.0167, position: 12 }] };
    if (dim === 'query') return { rows: [{ keys: ['brake repair fort lauderdale'], clicks: 44, impressions: 900, ctr: 0.0489, position: 3.4 }] };
    return { rows: [{ keys: ['https://www.harbor-auto.example/brakes'], clicks: 40, impressions: 700, ctr: 0.057, position: 4 }] };
  },
  GOOGLEADS_LIST_ACCESSIBLE_CUSTOMERS: () => ({ resourceNames: ['customers/1112223333', 'customers/4445556666'] }),
  GOOGLEADS_SEARCH_STREAM_GAQL: (args) => {
    if (args.customer_id === '1112223333') throw new Error('GOOGLEADS_SEARCH_STREAM_GAQL failed (400): Metrics cannot be requested for a manager account.');
    if (String(args.query).includes('FROM customer')) return { results: [{ customer: { descriptiveName: 'Harbor Auto Care Ads' } }] };
    return {
      results: [
        { campaign: { name: 'Brakes search', status: 'ENABLED', advertisingChannelType: 'SEARCH' }, metrics: { impressions: '12000', clicks: '640', costMicros: '1830000000', conversions: 22.5, conversionsValue: 4100.2 } },
        { campaign: { name: 'Brand', status: 'PAUSED', advertisingChannelType: 'SEARCH' }, metrics: { impressions: '800', clicks: '90', costMicros: '120000000', conversions: 4, conversionsValue: 600 } },
      ],
    };
  },
  INSTAGRAM_GET_USER_INFO: () => ({ id: '17841400000000000', username: 'harborautocare', followers_count: 1860, follows_count: 300, media_count: 412 }),
  INSTAGRAM_GET_USER_INSIGHTS: () => ({
    data: [
      { name: 'reach', period: 'day', total_value: { value: 9400 } },
      { name: 'accounts_engaged', period: 'day', total_value: { value: 310 } },
      { name: 'total_interactions', period: 'day', total_value: { value: 520 } },
      { name: 'profile_views', period: 'day', total_value: { value: 260 } },
      { name: 'website_clicks', period: 'day', total_value: { value: 48 } },
    ],
  }),
  INSTAGRAM_GET_IG_USER_MEDIA: () => ({
    data: [
      { id: 'm1', media_type: 'VIDEO', media_product_type: 'REELS', timestamp: new Date(Date.now() - 2 * 86_400_000).toISOString(), like_count: 120, comments_count: 8 },
      { id: 'm2', media_type: 'IMAGE', media_product_type: 'FEED', timestamp: new Date(Date.now() - 9 * 86_400_000).toISOString(), like_count: 80, comments_count: 4 },
      { id: 'm3', media_type: 'IMAGE', media_product_type: 'FEED', timestamp: '2025-01-01T00:00:00+0000', like_count: 40, comments_count: 0 },
    ],
  }),
  METAADS_GET_AD_ACCOUNTS: () => ({ data: [{ id: 'act_77', account_id: '77', name: 'Harbor Auto Care', account_status: 1 }] }),
  METAADS_GET_INSIGHTS: (args) =>
    args.level === 'campaign'
      ? { data: [{ campaign_name: 'Lead form', impressions: '5000', clicks: '210', spend: '402.55', actions: [{ action_type: 'lead', value: '14' }] }] }
      : {
          data: [
            {
              impressions: '21000',
              reach: '9800',
              clicks: '640',
              spend: '1205.44',
              cpc: '1.883',
              cpm: '57.4',
              ctr: '3.0476',
              actions: [
                { action_type: 'lead', value: '14' },
                { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '9' },
                { action_type: 'link_click', value: '600' },
              ],
            },
          ],
        },
};

// A function returned from beforeEach is a cleanup hook to vitest, so the reset stays inside braces.
beforeEach(() => {
  composio.configured = true;
  composio.executeToolAs.mockReset().mockImplementation(async (slug: string, args: Record<string, unknown>) => {
    const answer = answers[slug];
    if (!answer) throw new Error(`unexpected tool ${slug}`);
    return answer(args);
  });
});

describe('the linked step is registered', () => {
  it('opens phase 3, optional, with a label; phase 1 reads public data only', () => {
    expect(STEPS.map((s) => s.name)).not.toContain('linked');
    expect(INTEGRATED_STEPS[0]).toMatchObject({ name: 'linked', optional: true, current: 'Accounts' });
    // Runs started before the phases still carry it, so the worker keeps it.
    expect(ALL_STEPS.some((s) => s.name === 'linked')).toBe(true);
    expect(STEP_LABELS.linked).toBe('Linked accounts');
  });
});

describe('loading a client’s accounts', () => {
  it('a prospect has none, whatever rows are left from its client days', async () => {
    seed({ stage: 'prospect', accounts: [account('googleads')] });
    const out = await runLinked(ctx);
    expect(out).toMatchObject({ linked: false, customer_id: 'c1', stage: 'prospect', services: [] });
    expect(out.note).toMatch(/prospect/);
    expect(composio.executeToolAs).not.toHaveBeenCalled();
  });

  it('an audit without a customer, or a database before the migrations, reads as public data', async () => {
    seed({ customer: false });
    expect((await runLinked(ctx)).note).toMatch(/not tied to a customer/);
    seed({ missing: { marketing_audits: ['customer_id'] } });
    expect((await runLinked(ctx)).note).toMatch(/not tied to a customer/);
    seed({ missing: { groundswell_customers: ['stage'] } });
    expect((await runLinked(ctx))).toMatchObject({ linked: false, stage: 'prospect' });
    seed({ missing: { groundswell_client_accounts: ['*'] } });
    expect((await runLinked(ctx)).note).toMatch(/No accounts are linked/);
    expect(composio.executeToolAs).not.toHaveBeenCalled();
  });

  it('a client with no active account reads as public data; pending and disabled rows do not count', async () => {
    seed({ accounts: [{ ...account('googleads'), status: 'pending' }, { ...account('metaads'), status: 'disabled' }] });
    const out = await runLinked(ctx);
    expect(out).toMatchObject({ linked: false, services: [] });
    expect(out.note).toMatch(/No accounts are linked/);
  });

  it('any other database error throws, so the step retries rather than printing a client as a prospect', async () => {
    seed();
    db.current!.client.from = () => {
      throw new Error('connection reset');
    };
    await expect(loadLinkedAccounts(db.current!.client as unknown as SupabaseClient, 'a1')).rejects.toThrow(/connection reset/);
  });

  it('without Composio the accounts are named as unread, never thrown', async () => {
    seed({ accounts: [account('googleads')] });
    composio.configured = false;
    const out = await runLinked(ctx);
    expect(out).toMatchObject({ linked: false, services: [] });
    expect(out.note).toMatch(/public data/);
    expect(out.note).not.toMatch(/Composio/);
  });
});

describe('reading every linked service', () => {
  it('reads each service as the client’s own connected account, never the shared one', async () => {
    seed({ accounts: CLIENT_SERVICES.map((s) => account(s.key)) });
    const out = await runLinked(ctx);
    expect(out.linked).toBe(true);
    expect(out.services.map((s) => [s.service, s.ok])).toEqual(CLIENT_SERVICES.map((s) => [s.key, true]));
    for (const [slug, , acct] of composio.executeToolAs.mock.calls) {
      const toolkit = String(slug).startsWith('GOOGLE_ANALYTICS') ? 'google_analytics' : String(slug).startsWith('GOOGLE_SEARCH_CONSOLE') ? 'google_search_console' : String(slug).split('_')[0].toLowerCase();
      expect(acct).toEqual({ id: `ca_${toolkit}`, user_id: 'client:c1' });
    }
    expect(out.window).toEqual(readWindow());
    expect(out.window.days).toBe(WINDOW_DAYS);
  });

  it('Google Analytics: the property matching the website, channel totals and landing pages', async () => {
    seed({ accounts: [account('google_analytics')] });
    const [ga] = (await runLinked(ctx)).services;
    const d = ga.data as GaData;
    expect(d.property).toBe('Harbor-Auto site');
    expect(composio.executeToolAs.mock.calls.filter(([slug]) => slug === 'GOOGLE_ANALYTICS_RUN_REPORT').every(([, args]) => (args as { property: string }).property === 'properties/42')).toBe(true);
    expect(d.totals).toEqual({ sessions: 1686, users: 1360, new_users: 1180, conversions: 40, engagement_rate_pct: 58 });
    expect(d.channels[0]).toEqual({ channel: 'Organic Search', sessions: 1284, users: 1010, conversions: 31 });
    expect(d.landing_pages).toEqual([{ page: '/', sessions: 812 }, { page: '/brakes', sessions: 240 }]);
    expect(ga.source).toMatch(/Google Analytics 4, the business’s property “Harbor-Auto site”/);
  });

  it('Search Console: the domain property for the website, exact totals from the daily rows, and the data lag in the window', async () => {
    seed({ accounts: [account('google_search_console')] });
    const [gsc] = (await runLinked(ctx)).services;
    const d = gsc.data as GscData;
    expect(d.site).toBe('sc-domain:harbor-auto.example');
    expect(d.totals).toEqual({ clicks: 80, impressions: 4000, ctr_pct: 2, position: 11 });
    expect(d.queries[0]).toEqual({ query: 'brake repair fort lauderdale', clicks: 44, impressions: 900, ctr_pct: 5, position: 3.4 });
    expect(d.pages[0]).toMatchObject({ page: 'https://www.harbor-auto.example/brakes', clicks: 40 });
    const call = composio.executeToolAs.mock.calls.find(([slug]) => slug === 'GOOGLE_SEARCH_CONSOLE_SEARCH_ANALYTICS_QUERY')![1] as { site_url: string; start_date: string; end_date: string };
    expect(call.site_url).toBe('sc-domain:harbor-auto.example');
    const w = readWindow();
    expect(Date.parse(w.end) - Date.parse(call.end_date)).toBe(2 * 86_400_000);
    expect(Date.parse(call.end_date) - Date.parse(call.start_date)).toBe((WINDOW_DAYS - 1) * 86_400_000);
    expect(gsc.source).toMatch(/its data lags/);
  });

  it('Google Ads: skips a manager account, sums campaigns, and converts micros to dollars', async () => {
    seed({ accounts: [account('googleads')] });
    const [ads] = (await runLinked(ctx)).services;
    const d = ads.data as GoogleAdsData;
    expect(d.account).toBe('Harbor Auto Care Ads');
    expect(d.totals).toEqual({ impressions: 12800, clicks: 730, cost: 1950, conversions: 26.5, conversion_value: 4700, cost_per_conversion: 74 });
    expect(d.campaigns[0]).toEqual({ name: 'Brakes search', status: 'ENABLED', type: 'SEARCH', impressions: 12000, clicks: 640, cost: 1830, conversions: 22.5 });
  });

  it('Instagram: the profile, the account insights, and what the recent posts show', async () => {
    seed({ accounts: [account('instagram')] });
    const [ig] = (await runLinked(ctx)).services;
    const d = ig.data as InstagramData;
    expect(d).toMatchObject({ username: 'harborautocare', followers: 1860, following: 300, media_count: 412, reach: 9400, accounts_engaged: 310, interactions: 520, profile_views: 260, website_clicks: 48 });
    expect(d).toMatchObject({ recent_posts: 3, posts_in_window: 2, reels_in_window: 1, avg_likes: 80, avg_comments: 4 });
  });

  it('Instagram insights that are refused (a small account) leave the profile and posts standing', async () => {
    seed({ accounts: [account('instagram')] });
    composio.executeToolAs.mockImplementation(async (slug: string, args: Record<string, unknown>) => {
      if (slug === 'INSTAGRAM_GET_USER_INSIGHTS') throw new Error('INSTAGRAM_GET_USER_INSIGHTS failed (400): (#100) Not enough viewers for the media to show insights');
      return answers[slug](args);
    });
    const [ig] = (await runLinked(ctx)).services;
    expect(ig.ok).toBe(true);
    expect(ig.data).toMatchObject({ followers: 1860, reach: null, posts_in_window: 2 });
  });

  it('Meta Ads: the active ad account, spend to the dollar, leads and messages from the actions', async () => {
    seed({ accounts: [account('metaads')] });
    const [meta] = (await runLinked(ctx)).services;
    const d = meta.data as MetaAdsData;
    expect(d.account).toBe('Harbor Auto Care');
    expect(d.totals).toEqual({ impressions: 21000, reach: 9800, clicks: 640, spend: 1205, cpc: 1.88, cpm: 57.4, ctr_pct: 3, leads: 14, messages: 9 });
    expect(d.campaigns).toEqual([{ name: 'Lead form', impressions: 5000, clicks: 210, spend: 403, leads: 14 }]);
    expect(composio.executeToolAs.mock.calls.find(([slug, args]) => slug === 'METAADS_GET_INSIGHTS' && (args as { level: string }).level === 'account')![1]).toMatchObject({ object_id: 'act_77', date_preset: 'last_30d' });
  });

  it('an ad account with nothing delivered reads as such, not as zeros', async () => {
    seed({ accounts: [account('metaads')] });
    composio.executeToolAs.mockImplementation(async (slug: string, args: Record<string, unknown>) => (slug === 'METAADS_GET_INSIGHTS' ? { data: [] } : answers[slug](args)));
    const [meta] = (await runLinked(ctx)).services;
    expect(meta.ok).toBe(true);
    expect((meta.data as MetaAdsData).totals).toBeNull();
  });

  it('a service that fails is named in a plain sentence, the others are still read, and the step never throws', async () => {
    seed({ accounts: [account('google_analytics'), account('googleads'), account('metaads')] });
    composio.executeToolAs.mockImplementation(async (slug: string, args: Record<string, unknown>) => {
      if (slug.startsWith('GOOGLEADS')) throw new Error('GOOGLEADS_LIST_ACCESSIBLE_CUSTOMERS failed (401): Composio connected account ca_googleads is EXPIRED; invalid_grant');
      if (slug.startsWith('METAADS')) throw new Error('METAADS_GET_AD_ACCOUNTS failed (500): {"error":{"code":1,"message":"An unknown error occurred"}}');
      return answers[slug](args);
    });
    const out = await runLinked(ctx);
    expect(out.linked).toBe(true);
    expect(out.services.map((s) => s.ok)).toEqual([true, false, false]);
    expect(out.services[1].problem).toBe('The Google Ads link no longer works, so it was not read. Link the account again.');
    expect(out.services[2].problem).toBe('Meta Ads could not be read this time, so this audit uses public data for it.');
    for (const s of out.services.filter((x) => !x.ok)) {
      expect(s.problem).not.toMatch(/Composio|GOOGLEADS|METAADS|ca_|failed \(|invalid_grant|unknown error/);
      expect(s.detail).toMatch(/failed \(/);
    }
  });

  it('a linked Google account with no Analytics property, or no matching Search Console site, says so plainly', async () => {
    seed({ accounts: [account('google_analytics'), account('google_search_console')] });
    composio.executeToolAs.mockImplementation(async (slug: string) => {
      if (slug === 'GOOGLE_ANALYTICS_LIST_ACCOUNT_SUMMARIES') return { accountSummaries: [] };
      return { siteEntry: [{ siteUrl: 'https://a.example/', permissionLevel: 'siteOwner' }, { siteUrl: 'https://b.example/', permissionLevel: 'siteOwner' }] };
    });
    const out = await runLinked(ctx);
    expect(out.linked).toBe(false);
    expect(out.services[0].problem).toBe('The linked Google account has no Google Analytics property to read.');
    expect(out.services[1].problem).toBe('Search Console lists more than one site and none matches the business’s website.');
  });

  it('a single Search Console site is read even when the business has no website on file', async () => {
    seed({ accounts: [account('google_search_console')] });
    composio.executeToolAs.mockImplementation(async (slug: string, args: Record<string, unknown>) =>
      slug === 'GOOGLE_SEARCH_CONSOLE_LIST_SITES' ? { siteEntry: [{ siteUrl: 'https://only.example/', permissionLevel: 'siteOwner' }] } : answers[slug](args)
    );
    const [gsc] = (await runLinked({ ...ctx, audit: { ...AUDIT, website: null } })).services;
    expect(gsc.ok).toBe(true);
    expect((gsc.data as GscData).site).toBe('https://only.example/');
  });

  it('findKey looks through the wrappers Composio puts around an answer', () => {
    expect(findKey({ response_data: { data: { rows: [1] } } }, 'rows')).toEqual([1]);
    expect(findKey({ rows: [2], nested: { rows: [3] } }, 'rows')).toEqual([2]);
    expect(findKey([{ rows: [1] }], 'rows')).toBeUndefined();
    expect(findKey({ a: { b: { c: { d: { rows: [1] } } } } }, 'rows')).toBeUndefined();
  });
});

describe('the facts the write-up is built from', () => {
  it('carry the client’s accounts, so their figures are allowed in the write-up, and a prospect’s carry none', async () => {
    seed({ accounts: [account('google_analytics'), account('metaads')] });
    composio.executeToolAs.mockImplementation(async (slug: string, args: Record<string, unknown>) => {
      if (slug.startsWith('METAADS')) throw new Error('boom');
      return answers[slug](args);
    });
    const linked = await runLinked(ctx);
    const facts = buildFacts(AUDIT, { linked });
    expect(facts.linked).toBe(linked);
    const prompt = factsForPrompt(facts) as { client_accounts: { read: { service: string; data: GaData }[]; not_read: string[] } };
    expect(prompt.client_accounts.read.map((r) => r.service)).toEqual(['Google Analytics 4']);
    expect(prompt.client_accounts.read[0].data.totals.sessions).toBe(1686);
    expect(prompt.client_accounts.not_read).toEqual(['Meta Ads']);
    expect(allowedNumbers(prompt).has('1686')).toBe(true);
    expect(allowedNumbers(prompt).has('58')).toBe(true);

    seed({ stage: 'prospect' });
    const none = await runLinked(ctx);
    expect(buildFacts(AUDIT, { linked: none }).linked).toBeNull();
    expect((factsForPrompt(buildFacts(AUDIT, { linked: none })) as { client_accounts: unknown }).client_accounts).toBeNull();
    expect(buildFacts(AUDIT, {}).linked).toBeNull();
  });
});
