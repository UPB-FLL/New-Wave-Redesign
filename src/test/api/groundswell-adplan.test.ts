import { beforeEach, describe, expect, it, vi } from 'vitest';

const openai = vi.hoisted(() => ({ chatJson: vi.fn() }));
vi.mock('../../../api/_lib/groundswell/openai', () => ({ chatJson: openai.chatJson, GROUNDSWELL_MODEL: () => 'test-model' }));

import { baselineFrom, checkPlan, isAdplanOutput, PLANNER_SYSTEM, rivalAdsFrom, runAdplan } from '../../../api/_lib/groundswell/adplan';
import { buildFacts } from '../../../api/_lib/groundswell/model';
import { STEPS } from '../../../api/_lib/groundswell/steps';
import { PermanentStepError } from '../../../api/_lib/groundswell/types';
import { STEP_LABELS } from '../../../src/lib/groundswell';
import { GROUNDSWELL_CONFIG } from '../../../packages/groundswell/groundswell.config';
import { planAudit } from '../../../packages/groundswell/src/audit';
import { sampleAdplanOutput, sampleAudit, sampleModelOutput, sampleOutputs, samplePlannerJson } from './fixtures/groundswell-report';

const facts = () => buildFacts(sampleAudit, sampleOutputs());
const ctx = (outputs: Record<string, unknown>) => ({ audit: sampleAudit, outputs, deadline: Date.now() + 200_000, attempt: 1 });

describe('checking the planner answer against the data', () => {
  const planned = checkPlan(samplePlannerJson, facts(), sampleModelOutput(), GROUNDSWELL_CONFIG);

  it('keeps only keywords from Keyword Planner, each in one angle', () => {
    expect(planned.angles.map((a) => [a.id, a.keywords.map((k) => k.keyword)])).toEqual([
      ['brake-repair', ['brake repair near me']],
      ['car-ac-repair', ['car ac repair']],
    ]);
    expect(planned.dropped.keywords).toEqual(['brake pads cheap']);
  });

  it('renames an angle that claims "best", and drops a reason quoting a number not in the data', () => {
    expect(planned.angles[1].name).toBe('Car ac repair');
    expect(planned.angles[1].why).not.toMatch(/97/);
    expect(planned.angles[0].why).toBe('Brakes are named on the homepage, and booking through Square is already live.');
  });

  it('values each angle with the write-up estimate and reads incrementality from the ranks', () => {
    expect(planned.angles[0].value).toMatchObject({ per_customer: [300, 420, 600], close: [0.25, 0.35, 0.45], gross_margin: [0.5, 0.5, 0.5] });
    // The site ranks only for "auto repair fort lauderdale", so these angles' rank is unconfirmed.
    expect(planned.angles[0].incrementality).toBe(GROUNDSWELL_CONFIG.incrementality.ranks_2_to_4);
  });

  it('keeps fixes with a known effort type, falls back to the finding area, and ignores invented ids', () => {
    expect(planned.fixes.map((x) => [x.id, x.effort, x.area])).toEqual([
      ['google-1', 'review_requests', 'reviews'],
      ['social-1', 'social_posts', 'social'],
      ['website-1', 'service_page_seo', 'seo'],
      ['ads-1', 'site_fix', 'ads'],
    ]);
    expect(planned.dropped.fixes).toEqual(['Build a page for brake repair']);
    expect(planned.fixes[0].evidence).toBe('Ask every customer for a review');
  });

  it('falls back to general for an unknown industry, and to the largest searches when no angle survives', () => {
    const empty = checkPlan({ industry: 'aliens', angles: [{ name: 'Nothing', keywords: ['not a keyword'] }] }, facts(), sampleModelOutput(), GROUNDSWELL_CONFIG);
    expect(empty.industry.id).toBe('general');
    expect(empty.fallback_angle).toBe(true);
    expect(empty.dropped.angles).toEqual(['Nothing']);
    expect(empty.angles).toHaveLength(1);
    expect(empty.angles[0]).toMatchObject({ name: 'Auto repair' });
    expect(empty.angles[0].keywords.map((k) => k.keyword)).toContain('auto repair fort lauderdale');
    expect(checkPlan({ industry: 'it_services' }, facts(), sampleModelOutput(), GROUNDSWELL_CONFIG).industry.id).toBe('it_services');
  });

  it('reads a keyword the planner copied back as an object, and names what it could not read', () => {
    // APK9's planner answered its angles with the idea objects it was shown; every angle was dropped unseen.
    const out = checkPlan({ industry: 'general', angles: [{ name: 'Brakes', keywords: [{ keyword: 'brake repair near me', monthly_searches: 900 }, { text: 'car ac repair' }, { nope: 1 }, 7] }] }, facts(), sampleModelOutput(), GROUNDSWELL_CONFIG);
    expect(out.fallback_angle).toBe(false);
    expect(out.angles[0].keywords.map((k) => k.keyword)).toEqual(['brake repair near me', 'car ac repair']);
    expect(out.dropped.keywords).toEqual(['{"nope":1}', '7']);
  });

  it('keeps the fallback angle to searches that share a word with what the business does', () => {
    // "Behavior" as a seed brought ABA therapy searches to a dog trainer; they share no word with the category or the seeds.
    const outputs = sampleOutputs();
    outputs.keywords = { source: 'Keyword Planner', fetched_at: 'now', seeds: ['Auto repair shop', 'Auto Brakes'], demand_status: 'measured', ideas: [
      { keyword: 'aba therapy near me', monthly_searches: 5000, competition: null, low_bid_usd: null, high_bid_usd: null },
      { keyword: 'mental health therapist', monthly_searches: 3000, competition: null, low_bid_usd: null, high_bid_usd: null },
      { keyword: 'brake repair near me', monthly_searches: 900, competition: null, low_bid_usd: 5, high_bid_usd: 14 },
      { keyword: 'car ac repair', monthly_searches: 480, competition: null, low_bid_usd: 3, high_bid_usd: 9 },
    ] };
    const out = checkPlan({ industry: 'general', angles: [] }, buildFacts(sampleAudit, outputs), sampleModelOutput(), GROUNDSWELL_CONFIG);
    expect(out.fallback_angle).toBe(true);
    expect(out.angles[0].keywords.map((k) => k.keyword)).toEqual(['brake repair near me', 'car ac repair']);
    // With nothing related at all, the largest searches stand in as before.
    outputs.keywords = { ...(outputs.keywords as object), ideas: (outputs.keywords as { ideas: unknown[] }).ideas.slice(0, 2) } as typeof outputs.keywords;
    expect(checkPlan({ industry: 'general', angles: [] }, buildFacts(sampleAudit, outputs), sampleModelOutput(), GROUNDSWELL_CONFIG).angles[0].keywords).toHaveLength(2);
  });

  it('refuses to plan without keyword demand', () => {
    const outputs = { ...sampleOutputs(), keywords: { ideas: [] } };
    expect(() => checkPlan(samplePlannerJson, buildFacts(sampleAudit, outputs), sampleModelOutput(), GROUNDSWELL_CONFIG)).toThrow(PermanentStepError);
  });
});

describe('today, from the Ads Current', () => {
  it('says what is visible and that spend is not public', () => {
    expect(baselineFrom(facts())).toEqual({
      monthly_ad_spend: null,
      ad_spend_basis: 'The website carries a Google Ads tag; Ahrefs shows no paid search pages. Ad spend is not public.',
    });
    expect(baselineFrom(buildFacts(sampleAudit, { ...sampleOutputs(), ads: undefined })).ad_spend_basis).toMatch(/could not be checked/);
  });

  it('says a link-in-bio page carries no tags of the business’s own', () => {
    const outputs = sampleOutputs();
    const site = outputs.site as { business: Record<string, unknown> };
    site.business = { ...site.business, url: 'https://linktr.ee/harbor', final_url: 'https://linktr.ee/harbor', link_page: true, error: 'The address is a link-in-bio page, not a website of its own.' };
    expect(baselineFrom(buildFacts(sampleAudit, outputs)).ad_spend_basis).toBe('The address given is a link-in-bio page, not a website of its own, so there are no ad tags or paid search pages to read. Ad spend is not public.');
  });

  it('lists the competitors on record advertising, by platform, from the ad libraries and Ahrefs paid pages', () => {
    // The sample's Bayside Garage has Ahrefs paid search pages and no ad-library read.
    expect(rivalAdsFrom(facts())).toEqual({ google_search: ['Bayside Garage'] });
    const lib = (name: string, over: Record<string, unknown>) => ({ name, domain: null, facebook_page_id: null, meta_ad_status: 'unknown', meta_ads: [], meta_ads_inactive_n: 0, google_ads_status: 'unknown', google_ads_count: null, paid_search_history: [], pixels: { meta: false, google_ads: false, tiktok: false }, error: null, ...over });
    const outputs = { ...sampleOutputs(), ads_library: { source: 's', fetched_at: 'now', business: lib('Harbor Auto Care (sample)', {}), competitors: [
      lib('Angel Paws', { meta_ad_status: 'running', meta_ads: [{ id: '1' }] }),
      lib('K9 Advisors', { meta_ad_status: 'unknown', meta_ads: [{ id: '2' }], google_ads_status: 'ads_found', google_ads_count: 12 }),
      lib('Quiet Co', { meta_ad_status: 'not_running', google_ads_status: 'none', google_ads_count: 0 }),
      lib('Zero Co', { google_ads_status: 'ads_found', google_ads_count: 0 }),
    ] } };
    expect(rivalAdsFrom(buildFacts(sampleAudit, outputs))).toEqual({ meta: ['Angel Paws', 'K9 Advisors'], google_search: ['K9 Advisors', 'Bayside Garage'] });
    expect(rivalAdsFrom(buildFacts(sampleAudit, { ...sampleOutputs(), ads: undefined, ads_library: undefined }))).toEqual({});
  });
});

describe('the ad-plan step', () => {
  beforeEach(() => openai.chatJson.mockReset());

  it('runs after the write-up, before delivery, as an optional step with an admin label', () => {
    const names = STEPS.map((s) => s.name);
    expect(names.indexOf('adplan')).toBe(names.indexOf('model') + 1);
    expect(STEPS.find((s) => s.name === 'adplan')?.optional).toBe(true);
    expect(STEP_LABELS.adplan).toBeTruthy();
  });

  it('asks the planner once with the gathered keywords, then plans and ranks', async () => {
    openai.chatJson.mockResolvedValueOnce(samplePlannerJson);
    const out = await runAdplan(ctx({ ...sampleOutputs(), model: sampleModelOutput() }));
    expect(openai.chatJson).toHaveBeenCalledTimes(1);
    const [system, user] = openai.chatJson.mock.calls[0];
    expect(system).toBe(PLANNER_SYSTEM);
    expect(user).toContain('brake repair near me');
    expect(user).toContain('review_requests');
    expect(isAdplanOutput(out)).toBe(true);
    expect(out.ranked.map((c) => c.id)).toEqual(sampleAdplanOutput().ranked.map((c) => c.id));
  });

  it('is skipped, without calling the planner, when there is no write-up or no keyword demand', async () => {
    await expect(runAdplan(ctx(sampleOutputs()))).rejects.toBeInstanceOf(PermanentStepError);
    await expect(runAdplan(ctx({ ...sampleOutputs(), keywords: { ideas: [] }, model: sampleModelOutput() }))).rejects.toBeInstanceOf(PermanentStepError);
    expect(openai.chatJson).not.toHaveBeenCalled();
  });
});

describe('the sample plan', () => {
  const p = sampleAdplanOutput();

  it('ranks modeled changes first, then the sorted findings cheapest first, and leaves covered ones out', () => {
    expect(p.ranked.map((c) => c.id)).toEqual([
      'ads-brake-repair-meta',
      'ads-car-ac-repair-meta',
      'seo-brake-repair',
      'seo-car-ac-repair',
      // The Google tests run on Bayside Garage's advertising, not on a modeled return: last of the modeled rows.
      'ads-brake-repair-google_search',
      'ads-car-ac-repair-google_search',
      'fix-ads-1',
      'fix-google-1',
      'fix-social-1',
    ]);
    // The service-page finding is covered by the modeled ranking pages.
    expect(p.ranked.some((c) => c.id === 'fix-website-1')).toBe(false);
  });

  it('tests Google Search, where the benchmarks say it loses money at the estimated ticket, because Bayside Garage is advertising there', () => {
    const google = p.plan.rows.filter((r) => r.platform === 'google_search');
    expect(google.length).toBeGreaterThan(0);
    for (const r of google) {
      expect(r.roi_tier).toBe('loses money');
      expect(r.recommendation).toBe('test');
      expect(r.reason).toContain('Bayside Garage is on record advertising on Google Search');
    }
    expect(p.plan.rival_ads).toEqual({ google_search: ['Bayside Garage'] });
    // Without a rival on record, the same rows are skipped.
    const alone = planAudit({ angles: p.angles, industry: GROUNDSWELL_CONFIG.industries.find((i) => i.id === p.industry.id)!, positions: {}, fixes: [], baseline: p.baseline }, GROUNDSWELL_CONFIG);
    expect(alone.plan.rows.filter((r) => r.platform === 'google_search').every((r) => r.recommendation === 'skip')).toBe(true);
  });

  it('is recognised as a plan; partial or missing outputs are not', () => {
    expect(isAdplanOutput(p)).toBe(true);
    expect(isAdplanOutput(null)).toBe(false);
    expect(isAdplanOutput({ skipped: 'x' })).toBe(false);
  });
});
