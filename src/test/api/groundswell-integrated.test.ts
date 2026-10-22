import { existsSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from './fixtures/fakeSupabase';

const db = vi.hoisted(() => ({ current: null as ReturnType<typeof import('./fixtures/fakeSupabase').fakeSupabase> | null }));
const composio = vi.hoisted(() => ({ configured: true, executeToolAs: vi.fn() }));
const ai = vi.hoisted(() => ({ chatJson: vi.fn() }));

vi.mock('../../../api/_lib/supabaseAdmin', () => ({ isSupabaseConfigured: () => true, getSupabaseAdmin: () => db.current!.client }));
vi.mock('../../../api/_lib/groundswell/composio', async (original) => ({ ...(await original<object>()), isComposioConfigured: () => composio.configured, executeToolAs: composio.executeToolAs }));
vi.mock('../../../api/_lib/groundswell/openai', async (original) => ({ ...(await original<object>()), chatJson: ai.chatJson }));

import { readSearchTerms, runSearchTerms, type LinkedOutput, type SearchTermsData } from '../../../api/_lib/groundswell/currents/linked';
import { actualsFrom, checkIntegrated, integratedInput, runIntegrated, sortTerms } from '../../../api/_lib/groundswell/integrated';
import { planFor } from '../../../api/_lib/groundswell/adsets';
import type { StepContext } from '../../../api/_lib/groundswell/types';
import { sampleAdplanOutput, sampleAudit, sampleOutputs } from './fixtures/groundswell-report';

/**
 * Phase 3, the integrated plan: a client's own Google Ads search terms, the
 * plan re-priced on its own figures, and a write-up held to them. Composio,
 * OpenAI and the database are stand-ins shaped like the providers' answers.
 */

const T0 = '2026-10-20T10:00:00.000Z';
const linked: LinkedOutput = {
  fetched_at: T0,
  linked: true,
  customer_id: 'c1',
  stage: 'client',
  window: { start: '2026-09-20', end: '2026-10-19', days: 30 },
  note: null,
  services: [
    {
      service: 'googleads',
      label: 'Google Ads',
      ok: true,
      source: 'Google Ads account Harbor Auto Care Ads, last 30 days',
      problem: null,
      detail: null,
      data: { account: 'Harbor Auto Care Ads', totals: { impressions: 12800, clicks: 730, cost: 1950, conversions: 26.5, conversion_value: 4700, cost_per_conversion: 74 }, campaigns: [] },
    },
    {
      service: 'metaads',
      label: 'Meta Ads',
      ok: true,
      source: 'Meta ad account, last 30 days',
      problem: null,
      detail: null,
      data: { account: 'act_1', totals: { impressions: 40000, reach: 20000, clicks: 600, spend: 300, cpc: 0.5, cpm: 7.5, ctr_pct: 2, leads: 10, messages: 3 }, campaigns: [] },
    },
    { service: 'instagram', label: 'Instagram', ok: false, source: 'Instagram', data: null, problem: 'The Instagram link no longer works, so it was not read. Link the account again.', detail: 'token expired' },
  ],
};

const terms: SearchTermsData = {
  account: '4445556666',
  window_days: 30,
  totals: { clicks: 120, cost: 410.5, conversions: 9 },
  terms: [
    { term: 'brake repair near me', campaign: 'Brakes', ad_group: 'Brakes', impressions: 900, clicks: 60, cost: 210, conversions: 7 },
    { term: 'how to fix squeaky brakes', campaign: 'Brakes', ad_group: 'Brakes', impressions: 700, clicks: 30, cost: 95.5, conversions: 0 },
    { term: 'brake pads walmart', campaign: 'Brakes', ad_group: 'Brakes', impressions: 300, clicks: 20, cost: 80, conversions: 0 },
    { term: 'harbor auto care', campaign: 'Brand', ad_group: 'Brand', impressions: 100, clicks: 10, cost: 25, conversions: 2 },
  ],
};

function ctxWith(outputs: Record<string, unknown>): StepContext {
  return { audit: { ...sampleAudit, id: 'run-3', phase: 'integrated', customer_id: 'c1' }, outputs, inherited: { adplan: 'run-1' }, deadline: Date.now() + 120_000, attempt: 1 };
}

beforeEach(() => {
  composio.executeToolAs.mockReset();
  ai.chatJson.mockReset();
  composio.configured = true;
  db.current = fakeSupabase({
    marketing_audits: [{ id: 'run-3', customer_id: 'c1' }],
    groundswell_customers: [{ id: 'c1', stage: 'client' }],
    groundswell_client_accounts: [{ id: 'r1', customer_id: 'c1', service: 'googleads', composio_account_id: 'ca_ads', user_id: 'client:c1', status: 'active' }],
  });
});

describe('the client’s search terms', () => {
  it('reads them as the client’s own Google Ads account, skipping a manager that answers none', async () => {
    composio.executeToolAs.mockImplementation(async (slug: string, args: Record<string, unknown>, account: { id: string }) => {
      expect(account).toEqual({ id: 'ca_ads', user_id: 'client:c1' });
      if (slug === 'GOOGLEADS_LIST_ACCESSIBLE_CUSTOMERS') return { resourceNames: ['customers/1112223333', 'customers/4445556666'] };
      if (args.customer_id === '1112223333') throw new Error('Metrics cannot be requested for a manager account.');
      expect(String(args.query)).toContain('FROM search_term_view');
      return { results: [{ searchTermView: { searchTerm: 'brake repair near me' }, campaign: { name: 'Brakes' }, adGroup: { name: 'Brakes' }, metrics: { impressions: '900', clicks: '60', costMicros: '210000000', conversions: 7 } }] };
    });
    const out = await runSearchTerms(ctxWith({}));
    expect(out).toEqual({ account: '4445556666', window_days: 30, terms: [terms.terms[0]], totals: { clicks: 60, cost: 210, conversions: 7 } });
  });

  it('a client without a linked Google Ads account goes on without them', async () => {
    db.current = fakeSupabase({ marketing_audits: [{ id: 'run-3', customer_id: 'c1' }], groundswell_customers: [{ id: 'c1', stage: 'client' }], groundswell_client_accounts: [] });
    await expect(runSearchTerms(ctxWith({}))).rejects.toThrow(/No Google Ads account is linked/);
    await expect(readSearchTerms(async () => ({ resourceNames: [] }))).rejects.toThrow(/no Google Ads account to read/);
  });

  it('sorts them into what spent most, what converted, and what spent without converting', () => {
    const sorted = sortTerms(terms)!;
    expect(sorted.top.map((t) => t.term)).toEqual(['brake repair near me', 'how to fix squeaky brakes', 'brake pads walmart', 'harbor auto care']);
    expect(sorted.converting.map((t) => t.term)).toEqual(['brake repair near me', 'harbor auto care']);
    expect(sorted.wasted.map((t) => t.term)).toEqual(['how to fix squeaky brakes', 'brake pads walmart']);
    expect(sorted.wasted_cost).toBe(175.5);
    expect(sortTerms(null)).toBeNull();
  });
});

describe('the integrated plan', () => {
  it('takes the accounts’ own figures for the re-pricing', () => {
    expect(actualsFrom(linked)).toEqual({ google: { clicks: 730, cost: 1950, conversions: 26.5 }, meta: { clicks: 600, spend: 300, leads: 10 } });
    expect(actualsFrom({ ...linked, services: [] })).toEqual({ google: null, meta: null });
  });

  it('keeps only findings whose figures are in the data, and keywords copied from the data', () => {
    const input = integratedInput(ctxWith({ ...sampleOutputs(), linked }), linked, sortTerms(terms), sampleAdplanOutput(), []);
    const { writeup, opportunities, dropped } = checkIntegrated(
      {
        headline: 'Search ads bring calls; $175.50 went to searches that never convert.',
        findings: [
          { title: 'Brake searches convert', text: 'brake repair near me brought 7 of the 9 conversions for $210.' },
          { title: 'Made up', text: 'Bookings rose 40% this month.' },
        ],
        next_steps: [{ title: 'Add negatives', text: 'Exclude how-to and retailer searches.' }],
        buckets: [{ name: 'Brakes' }, { name: 'Self-help' }],
        keywords: [
          { keyword: 'brake repair near me', bucket: 'Brakes', verdict: 'buy', reason: 'Converts.' },
          { keyword: 'how to fix squeaky brakes', bucket: 'Self-help', verdict: 'exclude', reason: 'DIY.' },
          { keyword: 'invented keyword', bucket: 'Brakes', verdict: 'buy', reason: 'x' },
          { keyword: 'car ac repair', bucket: 'AC', verdict: 'maybe', reason: 'x' },
        ],
      },
      input
    );
    expect(writeup.headline).toMatch(/\$175\.50 went to searches/);
    expect(writeup.findings.map((f) => f.title)).toEqual(['Brake searches convert']);
    expect(dropped.join('\n')).toMatch(/number not in the data: 40/);
    expect(dropped.join('\n')).toMatch(/Keyword "invented keyword": not in Keyword Planner's ideas or the search terms/);
    expect(opportunities.map((o) => [o.keyword, o.verdict, o.monthly_searches])).toEqual([
      ['brake repair near me', 'buy', 900],
      ['how to fix squeaky brakes', 'exclude', null],
    ]);
  });

  it('re-prices phase 1’s plan on the accounts and hands it to the ad sets', async () => {
    ai.chatJson.mockResolvedValue({ headline: 'The accounts show where the money goes.', findings: [], next_steps: [], buckets: [], keywords: [] });
    const outputs = { ...sampleOutputs(), adplan: sampleAdplanOutput(), linked, search_terms: terms };
    const out = await runIntegrated(ctxWith(outputs));
    expect(out.repricing.google).toMatchObject({ clicks: 730 });
    expect(out.repricing.google!.cpc).toBeCloseTo(1950 / 730, 5);
    expect(out.repricing.notes.join(' ')).toMatch(/26\.5 conversions .* keeps the published conversion rate/);
    expect(out.services.find((s) => s.service === 'instagram')).toMatchObject({ ok: false, problem: expect.stringMatching(/Link the account again/) });
    // The ad-sets step builds phase 3's sets from the re-priced plan.
    expect(planFor({ ...outputs, integrated: out })?.basis).toBe('linked');
    const searchRow = out.adplan!.plan.rows.find((r) => r.platform === 'google_search');
    if (searchRow) expect(searchRow.scenarios.medium.cpc).toBeCloseTo(1950 / 730, 5);
  });

  it('with nothing read from the accounts, there is nothing to integrate', async () => {
    await expect(runIntegrated(ctxWith({ ...sampleOutputs(), linked: { ...linked, services: [linked.services[2]] } }))).rejects.toThrow(/nothing to integrate/);
  });

  const chromium = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
  it.skipIf(!existsSync(chromium))('prints the integrated plan with no links', async () => {
    process.env.CHROMIUM_PATH = chromium;
    const { withBrowser } = await import('../../../api/_lib/groundswell/browser');
    const { renderPdf } = await import('../../../api/_lib/groundswell/render');
    const { buildIntegratedHtml } = await import('../../../api/_lib/groundswell/reportsIntegrated');
    const { brandFrom } = await import('../../../api/_lib/groundswell/brand');
    ai.chatJson.mockResolvedValue({
      headline: 'Search ads bring calls; $175.50 went to searches that never convert.',
      findings: [{ title: 'Brake searches convert', text: 'brake repair near me brought 7 of the 9 conversions for $210.' }],
      next_steps: [{ title: 'Add negatives', text: 'Exclude how-to and retailer searches.' }],
      buckets: [{ name: 'Brakes' }],
      keywords: [{ keyword: 'brake repair near me', bucket: 'Brakes', verdict: 'buy', reason: 'Converts.' }],
    });
    const integrated = await runIntegrated(ctxWith({ ...sampleOutputs(), adplan: sampleAdplanOutput(), linked, search_terms: terms }));
    const pdf = await withBrowser((b) => renderPdf(b, buildIntegratedHtml({ business: 'Harbor Auto Care', brand: brandFrom(null), date: 'October 22, 2026', integrated, linked, adsets: null })));
    expect(pdf.links).toEqual([]);
    expect(pdf.pages).toBeGreaterThanOrEqual(4);
  }, 120_000);
});
