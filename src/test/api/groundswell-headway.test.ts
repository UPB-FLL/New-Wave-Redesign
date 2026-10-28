import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from './fixtures/fakeSupabase';
import { sampleOutputs } from './fixtures/groundswell-report';

/**
 * Headway, the implementation service: the planner (every action a plain
 * restatement of what the engine wrote), the setup checklist, the route (who
 * may do what), and the apply loop with its tools against fake Composio
 * answers. Nothing here reaches a provider.
 */

const db = vi.hoisted(() => ({ current: null as ReturnType<typeof import('./fixtures/fakeSupabase').fakeSupabase> | null }));
const who = vi.hoisted(() => ({ resolvePartner: vi.fn(), adminUser: vi.fn() }));
const background = vi.hoisted(() => ({ applyHeadwayInBackground: vi.fn(), runWorkerInBackground: vi.fn() }));
const composio = vi.hoisted(() => ({ configured: true }));

vi.mock('../../../api/_lib/supabaseAdmin', () => ({ isSupabaseConfigured: () => true, getSupabaseAdmin: () => db.current!.client }));
vi.mock('../../../api/_lib/groundswell/partners', async (original) => ({ ...(await original<object>()), resolvePartner: who.resolvePartner }));
vi.mock('../../../api/_lib/adminKey', async (original) => ({ ...(await original<object>()), adminUser: who.adminUser }));
vi.mock('../../../api/_lib/groundswell/background', () => ({ applyHeadwayInBackground: background.applyHeadwayInBackground, runWorkerInBackground: background.runWorkerInBackground, FUNCTION_SECONDS: 300 }));
vi.mock('../../../api/_lib/groundswell/composio', async (original) => ({ ...(await original<object>()), isComposioConfigured: () => composio.configured }));

import headway from '../../../api/groundswell/headway';
import type { ApiRequest, ApiResponse } from '../../../api/_lib/http';
import { applyDueActions, ApplyProblem, EXECUTORS, type Run } from '../../../api/_lib/groundswell/headway/apply';
import { buildChecklist } from '../../../api/_lib/groundswell/headway/checklist';
import { nextDay, planActions, zipOf } from '../../../api/_lib/groundswell/headway/plan';
import { decryptSecret, encryptSecret } from '../../../api/_lib/groundswell/headway/secrets';
import type { ActionRow } from '../../../api/_lib/groundswell/headway/store';
import type { ClientAccountRow } from '../../../api/_lib/groundswell/clientAccounts';
import { DIVISION_SERVICE_SLUGS } from '../../../src/divisions/socialEngineering/site';
import { HEADWAY_SERVICES, HEADWAY_SERVICE_INFO, SETUP_ITEMS, type ChecklistItem, type HeadwayAction } from '../../../src/lib/headway';

type Body = Record<string, unknown> & { error?: string; services?: { service: string; enabled: boolean }[]; checklist?: ChecklistItem[]; actions?: HeadwayAction[]; plans?: { id: string; status: string; summary: string }[]; value?: string };
function makeRes() {
  return {
    statusCode: 0,
    body: undefined as unknown as Body,
    setHeader() {},
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload as Body;
      return this;
    },
    end() {
      return this;
    },
  };
}
const AUTH = { authorization: 'Bearer token' };
async function call(method: string, body?: unknown, query: Record<string, string> = {}, headers: Record<string, string> = AUTH) {
  const res = makeRes();
  await headway({ method, body, query, headers: { 'x-forwarded-for': '10.0.0.1', ...headers } } as unknown as ApiRequest, res as unknown as ApiResponse);
  return res;
}

const C1 = '11111111-1111-4111-8111-111111111111';
const C2 = '22222222-2222-4222-8222-222222222222';
const R1 = 'aaaaaaaa-1111-4111-8111-111111111111';
const R2 = 'aaaaaaaa-2222-4222-8222-222222222222';
const T = (d: number) => `2026-10-${String(d).padStart(2, '0')}T12:00:00.000Z`;
const reef = { id: 'p1', company: 'Reef Agency', contact_name: null, email: 'reef@example.com', status: 'active' as const };

const post = (day: string, platform = 'instagram', format = 'post') => ({ day, platform, format, pillar: 'Behind the bar', topic: `${day} topic`, hook: 'Stop by', caption: `A ${day} caption.`, cta: 'Book a table', visual: 'The taproom at golden hour', hashtags: ['craftbeer', 'fortlauderdale'] });
const plansOutput = () => ({
  model: 'gpt', generated_at: T(11), sources: ['the site'],
  website_plan: {
    summary: 'Three changes.',
    changes: [
      { page: '/', priority: 'high', change: 'Put the booking button above the fold.', reason: 'Visitors leave before they see it.', evidence: 'The button sits under three pop-ups.' },
      { page: '/events', priority: 'medium', change: 'Name the packages.', reason: 'Searches ask for prices.', evidence: 'Keyword Planner lists price terms.' },
    ],
    new_pages: [{ path: '/private-events', purpose: 'A page for private event searches.', searches: ['event space fort lauderdale'] }],
    measurement: ['Bookings a month'],
  },
  social_plan: { summary: 'Seven posts.', platforms: [{ platform: 'instagram', role: 'main', cadence: 'daily' }], pillars: [{ name: 'Behind the bar', why: 'proof' }], week: [post('Monday'), post('Tuesday', 'instagram', 'reel'), post('Wednesday', 'facebook', 'post'), post('Thursday')] },
  dropped: [],
});
const tier = { monthly: 300, daily: 10, clicks: 100, leads: 5, customers: 2, revenue: 800, net: 200, year_net: 1200, roi: 0.5 };
const image = (name: string, type = 'image/jpeg') => ({ path: `${R2}/image/${name}`, name, permalink: null, likes: 10, comments: 1, origin: 'instagram', type: 'image', taken_at: null, caption: null, content_type: type });
const adsetsOutput = () => ({
  model: 'gpt', generated_at: T(13), basis: 'public', code: 'HA', month: '2026-10', dropped: [],
  sets: {
    meta: [{
      id: 'm1', campaign: 'HA Leads 2026-10', name: 'Leads · brakes', goal: 'leads', angle: 'brakes', objective: 'OUTCOME_LEADS', optimization_goal: 'OFFSITE_CONVERSIONS', recommendation: 'fund', why: 'the biggest search', mechanism: 'a lead form', kpi: 'cost per lead',
      audience: { location: 'Fort Lauderdale, FL', radius_miles: 10, age_min: 25, age_max: 64, interests: ['Cars'] }, placements: ['feed'], tiers: { low: tier, medium: tier, high: tier }, range: null, modeled: true, stop_loss: 'Pause above $60 a lead.',
      ads: [{ name: 'Brakes 1', primary_text: 'Brakes done today.', headline: 'Same-day brakes', description: 'Book online', call_to_action: 'BOOK_NOW', image_headline: 'Brakes', image: image('a.jpg'), link: 'https://harbor-auto.example/book', display_link: 'harbor-auto.example' }],
      sources: [],
    }],
    google: {
      name: 'HA Search 2026-10', bid_strategy: 'Maximize clicks', networks: 'Google Search', location: 'Fort Lauderdale, FL',
      ad_groups: [{ id: 'g1', name: 'Brakes', goal: 'leads', angle: 'brakes', recommendation: 'fund', why: 'demand', mechanism: 'search', kpi: 'cost per lead', keywords: [{ text: 'brake repair near me', match: 'phrase', monthly_searches: 900, low_bid_usd: 5, high_bid_usd: 14, position: null }], final_url: 'https://harbor-auto.example/brakes', headlines: ['Brake repair today', 'Same-day brakes'], descriptions: ['Book online in a minute.'], path1: 'brakes', path2: '', tiers: { low: tier, medium: tier, high: tier }, range: null, modeled: true, stop_loss: null, sources: [] }],
      negatives: [{ text: 'jobs', match: 'phrase', reason: 'job seekers' }],
    },
    carousel: null,
    totals: { low: { monthly: 600, daily: 20, net: 0, year_net: 0, roi: null, modeled_spend: 600 }, medium: { monthly: 600, daily: 20, net: 0, year_net: 0, roi: null, modeled_spend: 600 }, high: { monthly: 600, daily: 20, net: 0, year_net: 0, roi: null, modeled_spend: 600 } },
    goals: { engagement: 0, rankings: 0, leads: 1 }, notes: [],
  },
});
const creativeOutput = () => ({ source: 'Instagram', fetched_at: T(13), handle: 'harborautocare', images: [image('a.jpg'), image('b.png', 'image/png'), image('c.jpg')], tried: [] });
const benchmarkOutput = () => ({ scorecard: [], accounts: [], names: ['Harbor', 'Bayside'], writeup: { verdict: 'Close.', differences: [{ rank: 1, lever: 'Proof', title: 'Show the reviews', now: 'None shown', competitor: 'Shows 540', change: 'Add the rating to the home page', target: 'Rating on every page' }], do_not_copy: ['Fake urgency'] } });
const modelOutput = () => ({ writeup: { headline: 'A headline', verdict: 'Go', next_steps: ['Fix the pop-ups', 'Claim the listing'] } });

function allOutputs() {
  return { ...sampleOutputs(), plans: plansOutput(), adsets: adsetsOutput(), creative: creativeOutput(), benchmark: benchmarkOutput(), model: modelOutput() };
}
const account = (service: string, status = 'active'): ClientAccountRow => ({ id: `acc-${service}`, customer_id: C1, service: service as ClientAccountRow['service'], composio_account_id: `ca_${service}`, auth_config_id: 'ac', user_id: `client:${C1}`, status: status as ClientAccountRow['status'], status_reason: null, linked_by: null, linked_at: T(1), checked_at: T(1), created_at: T(1), updated_at: T(1) });

function seed(opts: { services?: string[]; accounts?: ClientAccountRow[]; setup?: Record<string, unknown>[]; missing?: Record<string, string[]> } = {}) {
  const outputs = allOutputs();
  const phase1 = ['site', 'maps', 'search', 'keywords', 'social', 'ads', 'model', 'plans'];
  db.current = fakeSupabase(
    {
      groundswell_customers: [
        { id: C1, partner_id: 'p1', business_name: 'Harbor Auto Care', city: 'Fort Lauderdale, FL', website: 'https://harbor-auto.example', instagram: 'harborautocare', stage: 'client', created_at: T(1), updated_at: T(1) },
        { id: C2, partner_id: 'p2', business_name: 'Theirs', city: null, website: null, instagram: null, stage: 'client', created_at: T(1), updated_at: T(1) },
      ],
      marketing_audits: [
        { id: R1, customer_id: C1, partner_id: 'p1', status: 'done', kind: 'audit', phase: 'audit', source_audit_id: null, created_at: T(10), completed_at: T(11) },
        { id: R2, customer_id: C1, partner_id: 'p1', status: 'done', kind: 'audit', phase: 'competitors', source_audit_id: R1, created_at: T(12), completed_at: T(13) },
      ],
      marketing_audit_steps: [
        ...phase1.map((step, i) => ({ audit_id: R1, step, status: 'done', position: i + 1, output: outputs[step as keyof typeof outputs] })),
        ...['adsets', 'creative', 'benchmark'].map((step, i) => ({ audit_id: R2, step, status: 'done', position: i + 1, output: outputs[step as keyof typeof outputs] })),
      ],
      groundswell_customer_services: (opts.services ?? HEADWAY_SERVICES).map((service) => ({ id: `s-${service}`, customer_id: C1, service, enabled: true, granted_by: 'staff:josh@newwaveitfl.com', granted_at: T(2), notes: null })),
      groundswell_client_accounts: (opts.accounts ?? []) as unknown as Record<string, unknown>[],
      groundswell_setup_items: opts.setup ?? [],
      groundswell_headway_plans: [],
      groundswell_headway_actions: [],
    },
    opts.missing ?? {}
  );
}

beforeEach(() => {
  seed();
  who.resolvePartner.mockReset().mockResolvedValue(null);
  who.adminUser.mockReset().mockResolvedValue({ id: 'u1', email: 'josh@newwaveitfl.com' });
  background.applyHeadwayInBackground.mockReset();
  composio.configured = true;
  process.env.GROUNDSWELL_SECRETS_KEY = 'test-key';
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.GROUNDSWELL_SECRETS_KEY;
});

describe('the catalogue', () => {
  it('names the division’s six services, each with what it needs from the setup items', () => {
    expect([...HEADWAY_SERVICES]).toEqual([...DIVISION_SERVICE_SLUGS]);
    for (const s of HEADWAY_SERVICES) for (const key of HEADWAY_SERVICE_INFO[s].needs) expect(SETUP_ITEMS.map((i) => i.key)).toContain(key);
    for (const item of SETUP_ITEMS) if (item.alternative) expect(SETUP_ITEMS.map((i) => i.key)).toContain(item.alternative);
  });
});

describe('the setup checklist', () => {
  it('lists what the enabled services need, required first, links from the accounts table and the rest from the setup rows', () => {
    const items = buildChecklist(['social-media', 'marketing'], [account('instagram'), account('googleads', 'pending')], [{ id: 'x', customer_id: C1, key: 'facebook_page_id', status: 'provided', value_encrypted: null, value_hint: '12345', notes: null, provided_by: null, provided_at: T(3), revealed_at: null, revealed_by: null }]);
    expect(items.map((i) => i.key)).toEqual(['link:instagram', 'link:metaads', 'link:googleads', 'facebook_page_id', 'business_zip', 'google_ads_customer_id', 'meta_pixel_id', 'social_logins', 'ads_logins']);
    const by = Object.fromEntries(items.map((i) => [i.key, i]));
    expect(by['link:instagram']).toMatchObject({ status: 'linked', satisfied: true, for: ['social-media'] });
    expect(by['link:googleads']).toMatchObject({ status: 'pending', satisfied: false });
    expect(by['link:metaads']).toMatchObject({ status: 'needed', satisfied: false, for: ['marketing'] });
    expect(by.facebook_page_id).toMatchObject({ status: 'provided', satisfied: true, value_hint: '12345', for: ['social-media', 'marketing'] });
    expect(by.business_zip).toMatchObject({ status: 'needed', satisfied: false, required: true });
    expect(items.find((i) => i.key === 'website_access')).toBeUndefined();
  });

  it('treats a login the customer handed over as standing in for the link', () => {
    const items = buildChecklist(['marketing'], [], [{ id: 'x', customer_id: C1, key: 'ads_logins', status: 'provided', value_encrypted: 'v1:a:b:c', value_hint: '…1234', notes: null, provided_by: null, provided_at: T(3), revealed_at: null, revealed_by: null }]);
    expect(items.find((i) => i.key === 'link:googleads')).toMatchObject({ status: 'needed', satisfied: true });
    expect(items.find((i) => i.key === 'link:metaads')).toMatchObject({ status: 'needed', satisfied: true });
    expect(items.find((i) => i.key === 'ads_logins')).toMatchObject({ status: 'provided', satisfied: true, value_hint: '…1234' });
  });
});

describe('the planner', () => {
  const now = new Date('2026-10-26T20:00:00Z'); // a Monday
  const input = (enabled = [...HEADWAY_SERVICES], accounts: ClientAccountRow[] = []) => ({
    customer: { id: C1, business_name: 'Harbor Auto Care', website: 'https://harbor-auto.example', instagram: 'harborautocare', city: 'Fort Lauderdale, FL' },
    audit: { id: R2, phase: 'competitors', completed_at: T(13) },
    outputs: allOutputs(),
    measureSource: R2,
    enabled,
    checklist: buildChecklist(enabled, accounts, []),
    now,
  });

  it('turns the week of posts, the ad sets, the website plan, the scan’s gaps, the benchmark and the measurement into actions', () => {
    const { summary, drafts } = planActions(input());
    const titles = drafts.map((d) => d.title);
    // Instagram image posts go out through the account (JPEGs only, rotating); a reel and a Facebook post are briefs.
    expect(drafts.filter((d) => d.tool === 'instagram.publish').map((d) => d.payload.image_name)).toEqual(['a.jpg', 'c.jpg']);
    expect(titles).toContain('Post Tuesday’s Instagram reel: Tuesday topic');
    expect(titles).toContain('Post Wednesday’s Facebook post: Wednesday topic');
    const monday = drafts.find((d) => d.title.startsWith('Publish Monday'))!;
    expect(monday.scheduled_for).toBe('2026-11-02T15:00:00.000Z');
    expect(monday.payload.caption).toBe('A Monday caption.\n\n#craftbeer #fortlauderdale');
    expect(monday.blocked_by).toEqual(['link:instagram']);
    // The Google campaign, paused, then the switch-on that waits on it; the Meta set the same, with the Page id and ZIP pre-filled.
    const google = drafts.findIndex((d) => d.tool === 'googleads.campaign');
    expect(drafts[google].payload.daily_budget_usd).toBe(10);
    expect(drafts.find((d) => d.tool === 'googleads.enable')!.depends_on_index).toBe(google);
    const meta = drafts.findIndex((d) => d.tool === 'metaads.adset');
    expect(drafts[meta].payload).toMatchObject({ zip: '33301', page_id: null });
    expect(drafts[meta].blocked_by).toEqual(['link:metaads', 'facebook_page_id']);
    expect(drafts.find((d) => d.tool === 'metaads.enable')!.depends_on_index).toBe(meta);
    // The website plan for the team, then the sitemap through Search Console.
    expect(titles).toContain('High · /: Put the booking button above the fold.');
    expect(titles).toContain('New page /private-events');
    expect(drafts.find((d) => d.tool === 'search_console.sitemap')!.payload.sitemap).toBe('https://harbor-auto.example/sitemap.xml');
    // Integrations from the scan (the sample site has no Meta pixel or booking path), the brand brief, the measurement and the report.
    expect(titles).toContain('Install the Meta pixel on the website');
    expect(titles).toContain('Show the reviews');
    const measure = drafts.find((d) => d.tool === 'groundswell.measure')!;
    expect(measure.scheduled_for).toBe('2026-11-25T20:00:00.000Z');
    expect(measure.payload.source_audit_id).toBe(R2);
    expect(measure.blocked_by).toEqual([]);
    // Without a competitor plan the measurement is still planned, from the public data.
    const noCompetitors = planActions({ ...input(), measureSource: null }).drafts.find((d) => d.tool === 'groundswell.measure')!;
    expect(noCompetitors.payload.source_audit_id).toBeNull();
    expect(noCompetitors.detail).toMatch(/reads the public data again/);
    expect(titles).toContain('The monthly report against revenue');
    expect(drafts.every((d) => HEADWAY_SERVICES.includes(d.service))).toBe(true);
    expect(summary).toMatch(/^\d+ actions from the competitor plan delivered Oct 13, 2026: \d+ through the linked accounts, \d+ for the team\./);
  });

  it('publishes the posts step’s own 4:5 image for a post when the run made one, and says when it is AI-generated', () => {
    const outputs = allOutputs();
    const week = outputs.plans.social_plan.week;
    const made = (i: number, origin: 'own' | 'ai_generated', size: 'feed' | 'vertical' = 'feed') => ({ ...week[i], n: i + 1, note: null, image: { path: `${R2}/creative/HA_post_0${i + 1}.jpg`, name: `HA_post_0${i + 1}.jpg`, size, origin, from: null, prompt: null, provider: null, model: null } });
    const posts = { generated_at: T(13), posts: [made(0, 'ai_generated'), made(1, 'own', 'vertical'), made(2, 'own'), { ...week[3], n: 4, note: null, image: null }], reddit: [], ai: { enabled: true, asked: 1, made: 1, errors: [] }, export: null, dropped: [], note: '' };
    const { drafts } = planActions({ ...input(['social-media']), outputs: { ...outputs, posts } });
    const publish = drafts.filter((d) => d.tool === 'instagram.publish');
    // Monday uses its AI-generated post image, flagged; Thursday has none from the step and keeps the rotation of the business's own JPEGs.
    expect(publish.map((d) => [d.payload.image_path, d.payload.ai_generated ?? false])).toEqual([
      [`${R2}/creative/HA_post_01.jpg`, true],
      [`${R2}/image/c.jpg`, false],
    ]);
    expect(publish[0].detail).toContain('HA_post_01.jpg, an AI-generated image');
  });

  it('plans only the services switched on, and says so when none is', () => {
    const social = planActions(input(['social-media']));
    expect(new Set(social.drafts.map((d) => d.service))).toEqual(new Set(['social-media']));
    expect(planActions(input([])).summary).toBe('No services are switched on for this customer yet.');
    const linked = planActions(input(['social-media', 'marketing'], [account('instagram'), account('metaads'), account('googleads')]));
    expect(linked.drafts.find((d) => d.tool === 'instagram.publish')!.blocked_by).toEqual([]);
    expect(linked.drafts.find((d) => d.tool === 'googleads.campaign')!.blocked_by).toEqual([]);
  });

  it('helpers: the next weekday and the ZIP in an address', () => {
    expect(nextDay('Monday', now)).toBe('2026-11-02T15:00:00.000Z');
    expect(nextDay('Tuesday', now)).toBe('2026-10-27T15:00:00.000Z');
    expect(zipOf('1 Harbor Rd, Fort Lauderdale, FL 33301')).toBe('33301');
    expect(zipOf('1 Harbor Rd, Fort Lauderdale, FL 33301-1234')).toBe('33301');
    expect(zipOf(null)).toBeNull();
  });
});

describe('the route', () => {
  it('is for the customer’s partner or a Groundswell admin: a stranger, a plain admin and another partner are refused', async () => {
    expect((await call('GET', undefined, { customer: C1 }, {})).statusCode).toBe(401);
    who.adminUser.mockResolvedValue({ id: 'u2', email: 'someone@newwaveitfl.com' });
    expect((await call('GET', undefined, { customer: C1 })).statusCode).toBe(403);
    who.adminUser.mockResolvedValue(null);
    who.resolvePartner.mockResolvedValue(reef);
    expect((await call('GET', undefined, { customer: C2 })).statusCode).toBe(404);
    expect((await call('GET', undefined, { customer: C1 })).statusCode).toBe(200);
  });

  it('shows staff the services, the checklist and the run a plan comes from; answers 503 before the migration', async () => {
    const res = await call('GET', undefined, { customer: C1 });
    expect(res.statusCode).toBe(200);
    expect(res.body.can_manage).toBe(true);
    expect(res.body.secrets_available).toBe(true);
    expect(res.body.services!.map((s) => [s.service, s.enabled])).toEqual(HEADWAY_SERVICES.map((s) => [s, true]));
    expect(res.body.checklist!.length).toBeGreaterThan(5);
    expect(res.body.source).toMatchObject({ audit_id: R2, phase: 'competitors' });
    seed({ missing: { groundswell_customer_services: ['*'] } });
    expect((await call('GET', undefined, { customer: C1 })).statusCode).toBe(503);
  });

  it('lets staff, and only staff, switch services on and off', async () => {
    who.resolvePartner.mockResolvedValue(reef);
    who.adminUser.mockResolvedValue(null);
    expect((await call('PATCH', { customer: C1, services: { marketing: false } })).statusCode).toBe(403);
    who.resolvePartner.mockResolvedValue(null);
    who.adminUser.mockResolvedValue({ id: 'u1', email: 'josh@newwaveitfl.com' });
    expect((await call('PATCH', { customer: C1, services: { bogus: true } })).statusCode).toBe(400);
    const res = await call('PATCH', { customer: C1, services: { marketing: false, 'social-media': false } });
    expect(res.statusCode).toBe(200);
    expect(res.body.services!.filter((s) => !s.enabled).map((s) => s.service)).toEqual(['social-media', 'marketing']);
    expect(res.body.checklist!.some((i) => i.key === 'link:instagram')).toBe(false);
    expect(res.body.checklist!.some((i) => i.key === 'link:metaads')).toBe(true); // oversight still reads it
  });

  it('stores an id in clear, a login encrypted with a hint, and an access as given; refuses a link item and a login without the key', async () => {
    const id = await call('PUT', { customer: C1, item: 'facebook_page_id', value: '1234567890', notes: 'From the Page settings' });
    expect(id.statusCode).toBe(200);
    expect(id.body.checklist!.find((i) => i.key === 'facebook_page_id')).toMatchObject({ status: 'provided', satisfied: true, value_hint: '1234567890', notes: 'From the Page settings' });
    const secret = await call('PUT', { customer: C1, item: 'website_access', value: 'admin / hunter2' });
    expect(secret.statusCode).toBe(200);
    expect(secret.body.checklist!.find((i) => i.key === 'website_access')).toMatchObject({ status: 'provided', value_hint: '…ter2' });
    const row = db.current!.tables.groundswell_setup_items.find((r) => r.key === 'website_access')!;
    expect(String(row.value_encrypted)).toMatch(/^v1:/);
    expect(JSON.stringify(secret.body)).not.toContain('hunter2');
    expect((await call('PUT', { customer: C1, item: 'gbp_manager_access' })).body.checklist!.find((i) => i.key === 'gbp_manager_access')).toMatchObject({ status: 'provided' });
    expect((await call('PUT', { customer: C1, item: 'link:instagram', value: 'x' })).statusCode).toBe(400);
    expect((await call('PUT', { customer: C1, item: 'facebook_page_id', value: '' })).statusCode).toBe(400);
    delete process.env.GROUNDSWELL_SECRETS_KEY;
    expect((await call('PUT', { customer: C1, item: 'social_logins', value: 'x' })).statusCode).toBe(503);
    expect((await call('GET', undefined, { customer: C1 })).body.secrets_available).toBe(false);
  });

  it('reveals a stored login to staff only, once asked, and records it', async () => {
    await call('PUT', { customer: C1, item: 'website_access', value: 'admin / hunter2' });
    who.resolvePartner.mockResolvedValue(reef);
    who.adminUser.mockResolvedValue(null);
    expect((await call('GET', undefined, { customer: C1, reveal: 'website_access' })).statusCode).toBe(403);
    who.resolvePartner.mockResolvedValue(null);
    who.adminUser.mockResolvedValue({ id: 'u1', email: 'josh@newwaveitfl.com' });
    const res = await call('GET', undefined, { customer: C1, reveal: 'website_access' });
    expect(res.statusCode).toBe(200);
    expect(res.body.value).toBe('admin / hunter2');
    expect(db.current!.tables.groundswell_setup_items.find((r) => r.key === 'website_access')).toMatchObject({ revealed_by: 'staff:josh@newwaveitfl.com' });
    expect((await call('GET', undefined, { customer: C1, reveal: 'facebook_page_id' })).statusCode).toBe(404);
  });

  it('builds a plan from the newest delivered run, supersedes it on the next plan, and moves actions through approval', async () => {
    const planned = await call('POST', { customer: C1, action: 'plan' });
    expect(planned.statusCode).toBe(201);
    const plan = planned.body.plans![0];
    expect(plan.status).toBe('open');
    expect(plan.summary).toMatch(/from the competitor plan delivered Oct 13, 2026/);
    const actions = planned.body.actions!;
    expect(actions.length).toBeGreaterThan(10);
    expect(actions.every((a) => a.status === 'proposed')).toBe(true);
    expect(JSON.stringify(planned.body)).not.toContain('"payload"');
    const enable = actions.find((a) => a.tool === 'googleads.enable')!;
    expect(enable.depends_on).toBe(actions.find((a) => a.tool === 'googleads.campaign')!.id);

    const post = actions.find((a) => a.tool === 'instagram.publish')!;
    const brief = actions.find((a) => a.kind === 'handoff')!;
    const approved = await call('POST', { customer: C1, action: 'approve', ids: [post.id] });
    expect(approved.body.actions!.find((a) => a.id === post.id)).toMatchObject({ status: 'approved', approved_by: 'staff:josh@newwaveitfl.com' });
    expect(background.applyHeadwayInBackground).toHaveBeenCalledTimes(1);
    const done = await call('POST', { customer: C1, action: 'done', ids: [brief.id] });
    expect(done.body.actions!.find((a) => a.id === brief.id)!.status).toBe('done');
    const declined = await call('POST', { customer: C1, action: 'decline', ids: [enable.id] });
    expect(declined.body.actions!.find((a) => a.id === enable.id)!.status).toBe('declined');
    // A retry is for a failed action only; "done" is for briefs only.
    expect((await call('POST', { customer: C1, action: 'retry', ids: [post.id] })).body.actions!.find((a) => a.id === post.id)!.status).toBe('approved');
    expect((await call('POST', { customer: C1, action: 'done', ids: [post.id] })).body.actions!.find((a) => a.id === post.id)!.status).toBe('approved');
    expect((await call('POST', { customer: C1, action: 'nonsense', ids: [post.id] })).statusCode).toBe(400);

    const again = await call('POST', { customer: C1, action: 'plan' });
    expect(again.body.plans!.map((p) => p.status)).toEqual(['open', 'closed']);
    expect(again.body.actions!.find((a) => a.id === post.id)).toMatchObject({ status: 'declined' });
    expect(again.body.actions!.find((a) => a.id === brief.id)!.status).toBe('done');
  });

  it('gives a partner its own customer’s plan without error text, and never another partner’s', async () => {
    await call('POST', { customer: C1, action: 'plan' });
    const failedId = db.current!.tables.groundswell_headway_actions[0].id as string;
    Object.assign(db.current!.tables.groundswell_headway_actions[0], { status: 'failed', error: 'Composio refused (401): internal detail' });
    who.resolvePartner.mockResolvedValue(reef);
    who.adminUser.mockResolvedValue(null);
    const res = await call('GET', undefined, { customer: C1 });
    expect(res.statusCode).toBe(200);
    expect(res.body.can_manage).toBe(false);
    expect(res.body.actions!.find((a) => a.id === failedId)!.error).toBe('This action did not go through. We have been notified.');
    expect(JSON.stringify(res.body)).not.toContain('internal detail');
  });
});

describe('applying approved actions', () => {
  const calls: { service: string; slug: string; args: Record<string, unknown> }[] = [];
  const answers: Record<string, unknown> = {
    INSTAGRAM_GET_USER_INFO: { id: '178', username: 'harborautocare' },
    INSTAGRAM_POST_IG_USER_MEDIA: { id: 'container-1' },
    INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH: { id: 'media-9' },
    GOOGLEADS_LIST_ACCESSIBLE_CUSTOMERS: { resourceNames: ['customers/111', 'customers/222'] },
    GOOGLEADS_SEARCH_STREAM_GAQL: { results: [{ customer: { id: '111', manager: true } }] },
    GOOGLEADS_BATCH_MUTATE: { mutateOperationResponses: [{ campaignBudgetResult: { resourceName: 'customers/222/campaignBudgets/5' } }, { campaignResult: { resourceName: 'customers/222/campaigns/6' } }, { adGroupResult: { resourceName: 'customers/222/adGroups/7' } }, { adGroupAdResult: { resourceName: 'customers/222/adGroupAds/7~8' } }] },
    GOOGLEADS_MUTATE_CAMPAIGNS: { results: [] },
    METAADS_GET_AD_ACCOUNTS: { data: [{ id: 'act_55', account_status: 1 }] },
    METAADS_CREATE_CAMPAIGN: { id: 'camp-1' },
    METAADS_CREATE_AD_SET: { id: 'set-1' },
    METAADS_CREATE_AD: { id: 'ad-1' },
    METAADS_UPDATE_CAMPAIGN: { success: true },
    GOOGLE_SEARCH_CONSOLE_LIST_SITES: { siteEntry: [{ siteUrl: 'sc-domain:harbor-auto.example' }] },
    GOOGLE_SEARCH_CONSOLE_SUBMIT_SITEMAP: {},
  };
  const executeAs = vi.fn(async (slug: string, args: Record<string, unknown>, account: { id: string }) => {
    calls.push({ service: account.id.replace(/^ca_/, ''), slug, args });
    if (slug === 'GOOGLEADS_SEARCH_STREAM_GAQL' && args.customer_id === '222') return { results: [{ customer: { id: '222', manager: false } }] };
    if (!(slug in answers)) throw new Error(`No fake answer for ${slug}`);
    return answers[slug];
  });
  const apply = (opts: Partial<Parameters<typeof applyDueActions>[1]> = {}) =>
    applyDueActions(db.current!.client as never, { deadline: Date.now() + 240_000, executeAs: executeAs as never, signedUrl: async (_db, path) => `https://signed.example/${path}`, decrypt: decryptSecret, now: () => new Date('2026-11-03T12:00:00Z'), ...opts });
  const rows = () => db.current!.tables.groundswell_headway_actions as unknown as ActionRow[];
  async function planWith(accounts: ClientAccountRow[], setup: Record<string, unknown>[] = []) {
    seed({ accounts, setup });
    await call('POST', { customer: C1, action: 'plan' });
    return rows();
  }
  const approve = (a: ActionRow) => Object.assign(a, { status: 'approved', approved_by: 'staff', approved_at: T(20) });

  beforeEach(() => {
    calls.length = 0;
    executeAs.mockClear();
  });

  it('publishes a due Instagram post as the client’s account: user, container, publish; records the media id', async () => {
    const actions = await planWith([account('instagram')]);
    const monday = actions.find((a) => a.tool === 'instagram.publish')!;
    approve(monday);
    const report = await apply();
    expect(report.ran).toEqual([{ action: monday.id, outcome: 'applied' }]);
    expect(calls.map((c) => [c.service, c.slug])).toEqual([['instagram', 'INSTAGRAM_GET_USER_INFO'], ['instagram', 'INSTAGRAM_POST_IG_USER_MEDIA'], ['instagram', 'INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH']]);
    expect(calls[1].args).toMatchObject({ ig_user_id: '178', image_url: `https://signed.example/${R2}/image/a.jpg`, caption: 'A Monday caption.\n\n#craftbeer #fortlauderdale' });
    expect(calls[2].args).toMatchObject({ ig_user_id: '178', creation_id: 'container-1' });
    expect(monday).toMatchObject({ status: 'applied', result: { media_id: 'media-9', username: 'harborautocare' }, lease_until: null });
    expect(monday.applied_at).toBe('2026-11-03T12:00:00.000Z');
  });

  it('leaves an action whose day has not come, one still blocked by setup, and one waiting on the action before it', async () => {
    const actions = await planWith([account('googleads')]);
    const thursday = actions.find((a) => a.title.startsWith('Publish Thursday'))!;
    const campaign = actions.find((a) => a.tool === 'googleads.campaign')!;
    const enable = actions.find((a) => a.tool === 'googleads.enable')!;
    const meta = actions.find((a) => a.tool === 'metaads.adset')!;
    [thursday, enable, meta].forEach(approve);
    // On Oct 27 Thursday's post (Oct 29) is not due yet.
    const report = await apply({ now: () => new Date('2026-10-27T12:00:00Z') });
    expect(report.ran).toEqual([{ action: enable.id, outcome: 'waiting', note: 'Waits on the action before it.' }, { action: meta.id, outcome: 'waiting', note: 'link:metaads, facebook_page_id' }]);
    expect(report.ran.find((r) => r.action === thursday.id)).toBeUndefined();
    expect(meta).toMatchObject({ status: 'approved', error: 'Waiting on: link:metaads, facebook_page_id.' });
    expect(campaign.status).toBe('proposed');
    expect(executeAs).not.toHaveBeenCalled();
  });

  it('builds the Google campaign in one atomic batch, paused, in the first non-manager account, then turns it on', async () => {
    const actions = await planWith([account('googleads')]);
    const campaign = actions.find((a) => a.tool === 'googleads.campaign')!;
    const enable = actions.find((a) => a.tool === 'googleads.enable')!;
    [campaign, enable].forEach(approve);
    await apply();
    const batch = calls.find((c) => c.slug === 'GOOGLEADS_BATCH_MUTATE')!;
    expect(batch.args.customer_id).toBe('222');
    const ops = batch.args.mutate_operations as Record<string, { create: Record<string, unknown> }>[];
    expect(ops.map((o) => Object.keys(o)[0])).toEqual(['campaign_budget_operation', 'campaign_operation', 'campaign_criterion_operation', 'ad_group_operation', 'ad_group_criterion_operation', 'ad_group_ad_operation']);
    expect(ops[0].campaign_budget_operation.create).toMatchObject({ resource_name: 'customers/222/campaignBudgets/-1', amount_micros: 10_000_000 });
    expect(ops[1].campaign_operation.create).toMatchObject({ status: 'PAUSED', advertising_channel_type: 'SEARCH', campaign_budget: 'customers/222/campaignBudgets/-1', target_spend: {} });
    expect(ops[2].campaign_criterion_operation.create).toMatchObject({ negative: true, keyword: { text: 'jobs', match_type: 'PHRASE' } });
    expect(ops[3].ad_group_operation.create).toMatchObject({ name: 'Brakes', campaign: 'customers/222/campaigns/-2', status: 'ENABLED', cpc_bid_micros: 14_000_000 });
    expect(ops[4].ad_group_criterion_operation.create).toMatchObject({ ad_group: 'customers/222/adGroups/-10', keyword: { text: 'brake repair near me', match_type: 'PHRASE' } });
    expect(ops[5].ad_group_ad_operation.create).toMatchObject({ ad: { final_urls: ['https://harbor-auto.example/brakes'], responsive_search_ad: { headlines: [{ text: 'Brake repair today' }, { text: 'Same-day brakes' }], path1: 'brakes' } } });
    expect(campaign).toMatchObject({ status: 'applied', result: { customer_id: '222', campaign_resource: 'customers/222/campaigns/6', ad_group_resources: ['customers/222/adGroups/7'], location_set: false } });
    // The switch-on waited for the campaign in that pass; the next pass applies it.
    expect(enable.status).toBe('approved');
    await apply();
    expect(enable).toMatchObject({ status: 'applied', result: { campaign_resource: 'customers/222/campaigns/6' } });
    expect(calls.find((c) => c.slug === 'GOOGLEADS_MUTATE_CAMPAIGNS')!.args).toEqual({ customer_id: '222', operations: [{ operation_type: 'update', update: { resource_name: 'customers/222/campaigns/6', status: 'enabled' } }] });
  });

  it('builds a Meta set with the campaign paused and the set and ads live under it, from the Page id and ZIP in the checklist and the listing', async () => {
    const actions = await planWith([account('metaads')], [{ id: 'si', customer_id: C1, key: 'facebook_page_id', status: 'provided', value_encrypted: null, value_hint: '9001', provided_at: T(3) }]);
    const meta = actions.find((a) => a.tool === 'metaads.adset')!;
    approve(meta);
    const report = await apply();
    expect(report.ran).toEqual([{ action: meta.id, outcome: 'applied' }]);
    expect(calls.map((c) => c.slug)).toEqual(['METAADS_GET_AD_ACCOUNTS', 'METAADS_CREATE_CAMPAIGN', 'METAADS_CREATE_AD_SET', 'METAADS_CREATE_AD']);
    expect(calls[1].args).toMatchObject({ account_id: 'act_55', objective: 'OUTCOME_LEADS', status: 'PAUSED' });
    expect(calls[2].args).toMatchObject({ campaign_id: 'camp-1', status: 'ACTIVE', daily_budget: 10, optimization_goal: 'LINK_CLICKS', targeting: { location_type: 'zip_codes', locations: ['33301'], location_radius: 10, age_min: 25, age_max: 64 } });
    expect(calls[3].args).toMatchObject({ ad_set_id: 'set-1', status: 'ACTIVE', creative: { type: 'IMAGE', page_id: '9001', message: 'Brakes done today.', website_url: 'https://harbor-auto.example/book', image_url: `https://signed.example/${R2}/image/a.jpg`, call_to_action: 'BOOK_NOW' } });
    expect(meta.result).toMatchObject({ campaign_id: 'camp-1', ad_set_id: 'set-1', ad_ids: ['ad-1'], optimization_goal: 'LINK_CLICKS' });
    expect(String(meta.result!.note)).toMatch(/No Meta pixel id/);
  });

  it('submits the sitemap once it answers, to the matching Search Console property; a dead sitemap fails plainly', async () => {
    const actions = await planWith([account('google_search_console')]);
    const sitemap = actions.find((a) => a.tool === 'search_console.sitemap')!;
    approve(sitemap);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ status: 404 } as Response);
    await apply();
    expect(sitemap).toMatchObject({ status: 'failed', error: 'https://harbor-auto.example/sitemap.xml does not answer (HTTP 404); publish the sitemap first.' });
    Object.assign(sitemap, { status: 'approved', error: null, attempts: 0 });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ status: 200 } as Response);
    await apply();
    expect(sitemap).toMatchObject({ status: 'applied', result: { site_url: 'sc-domain:harbor-auto.example', sitemap: 'https://harbor-auto.example/sitemap.xml' } });
    expect(calls.find((c) => c.slug === 'GOOGLE_SEARCH_CONSOLE_SUBMIT_SITEMAP')!.args).toEqual({ site_url: 'sc-domain:harbor-auto.example', feedpath: 'https://harbor-auto.example/sitemap.xml' });
  });

  it('queues the integrated plan when the measurement comes due', async () => {
    const actions = await planWith([account('google_analytics')]);
    const measure = actions.find((a) => a.tool === 'groundswell.measure')!;
    approve(measure);
    expect((await apply()).ran).toEqual([]);
    const report = await apply({ now: () => new Date('2026-12-01T12:00:00Z') });
    expect(report.ran).toEqual([{ action: measure.id, outcome: 'applied' }]);
    expect(db.current!.tables.marketing_audits.find((r) => r.phase === 'integrated')).toMatchObject({ source_audit_id: R2, status: 'queued', customer_id: C1 });
    expect(measure.result).toMatchObject({ queued: expect.any(String), phase: 'integrated', basis: 'linked' });
  });

  it('reads the public data again when the measurement comes due with no account linked', async () => {
    const actions = await planWith([]);
    const measure = actions.find((a) => a.tool === 'groundswell.measure')!;
    expect(measure.blocked_by).toEqual([]);
    approve(measure);
    const report = await apply({ now: () => new Date('2026-12-01T12:00:00Z') });
    expect(report.ran).toEqual([{ action: measure.id, outcome: 'applied' }]);
    const queued = db.current!.tables.marketing_audits.filter((r) => r.status === 'queued');
    expect(queued).toHaveLength(1);
    expect(queued[0]).toMatchObject({ phase: 'audit', source_audit_id: null, customer_id: C1, business_name: 'Harbor Auto Care', website: 'https://harbor-auto.example' });
    expect(db.current!.tables.marketing_audits.some((r) => r.phase === 'integrated')).toBe(false);
    expect(measure.result).toMatchObject({ queued: queued[0].id, phase: 'audit', basis: 'public' });
    // Due again: the run already waiting is returned, never a second one.
    Object.assign(measure, { status: 'approved' });
    await apply({ now: () => new Date('2026-12-01T13:00:00Z') });
    expect(db.current!.tables.marketing_audits.filter((r) => r.status === 'queued')).toHaveLength(1);
  });

  it('retries a provider hiccup twice and then fails; a plain problem fails at once; a lapsed lease is taken over', async () => {
    const actions = await planWith([account('instagram'), account('google_search_console')]);
    const monday = actions.find((a) => a.tool === 'instagram.publish')!;
    approve(monday);
    executeAs.mockRejectedValueOnce(new Error('INSTAGRAM_GET_USER_INFO failed (502): upstream'));
    await apply();
    expect(monday).toMatchObject({ status: 'approved', attempts: 1, error: 'Try 1 failed: INSTAGRAM_GET_USER_INFO failed (502): upstream' });
    executeAs.mockRejectedValueOnce(new Error('again')).mockRejectedValueOnce(new Error('and again'));
    await apply();
    await apply();
    expect(monday).toMatchObject({ status: 'failed', attempts: 3 });

    const thursday = actions.find((a) => a.title.startsWith('Publish Thursday'))!;
    approve(thursday);
    Object.assign(thursday, { payload: { ...thursday.payload, image_path: null } });
    await apply({ now: () => new Date('2026-11-10T12:00:00Z') });
    expect(thursday).toMatchObject({ status: 'failed', error: 'This post has no image to publish.' });

    const stale = actions.find((a) => a.tool === 'search_console.sitemap')!;
    Object.assign(stale, { status: 'applying', lease_until: '2026-11-01T00:00:00Z', attempts: 1 });
    await apply({ executors: { 'search_console.sitemap': async () => ({ ok: true }) } });
    expect(stale).toMatchObject({ status: 'applied', result: { ok: true } });
  });

  it('refuses an action whose service was switched off since, and one with no account linked', async () => {
    const actions = await planWith([account('instagram')]);
    const monday = actions.find((a) => a.tool === 'instagram.publish')!;
    approve(monday);
    db.current!.tables.groundswell_customer_services.find((s) => s.service === 'social-media')!.enabled = false;
    await apply();
    expect(monday).toMatchObject({ status: 'failed', error: 'Social media is switched off for this customer.' });
    const run: Run = async () => { throw new ApplyProblem('no'); };
    await expect(EXECUTORS['groundswell.measure']({ action: { payload: {} } as never, db: db.current!.client as never, run, customer: { id: 'nobody', business_name: 'x', website: null, city: null }, signedUrl: async () => '', dependency: null, setup: () => null, now: new Date() })).rejects.toThrow('That customer is not there.');
  });
});

describe('stored logins', () => {
  it('round-trip through AES-GCM under GROUNDSWELL_SECRETS_KEY, and never read under another key', () => {
    const stored = encryptSecret('admin / hunter2');
    expect(stored).toMatch(/^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
    expect(stored).not.toContain('hunter2');
    expect(decryptSecret(stored)).toBe('admin / hunter2');
    process.env.GROUNDSWELL_SECRETS_KEY = 'another';
    expect(() => decryptSecret(stored)).toThrow();
  });
});
