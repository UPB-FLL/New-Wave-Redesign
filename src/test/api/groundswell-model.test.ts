import { beforeEach, describe, expect, it, vi } from 'vitest';

const openai = vi.hoisted(() => ({ chatJson: vi.fn() }));
vi.mock('../../../api/_lib/groundswell/openai', () => ({ chatJson: openai.chatJson, GROUNDSWELL_MODEL: () => 'test-model' }));

import {
  allowedNumbers,
  buildFacts,
  criticalEvidenceProblems,
  evidenceCoverage,
  INCREMENTALITY,
  normalizeEstimates,
  normalizeWriteup,
  roiInputsFrom,
  runModel,
  scrubText,
  scrubUnsupportedClaims,
  unsupportedNumbers,
} from '../../../api/_lib/groundswell/model';
import { PermanentStepError } from '../../../api/_lib/groundswell/types';
import { sampleAudit, sampleModelJson, sampleOutputs } from './fixtures/groundswell-report';

describe('numbers the write-up may use', () => {
  const allowed = allowedNumbers({ reviews: 212, rating: 4.6, followers: 1250, share: 0.82, text: 'about 2,100 visits' });

  it('accepts numbers from the data, their roundings, small counts and recent years', () => {
    expect(unsupportedNumbers('4.6 stars from 212 reviews, 1,250 followers, 82% of clicks, 2,100 visits, 3 steps in 2026', allowed)).toEqual([]);
  });

  it('flags anything else', () => {
    expect(unsupportedNumbers('Businesses like this see 47% more calls and 1,900 visits', allowed)).toEqual(['47', '1900']);
  });

  it('drops only the sentences with unsupported numbers', () => {
    const r = scrubText('It has 212 reviews. Studies show 73% of people read reviews! Post weekly.', allowed);
    expect(r.text).toBe('It has 212 reviews. Post weekly.');
    expect(r.removed).toEqual(['Studies show 73% of people read reviews!']);
  });
});

describe('normalizing the model answer', () => {
  it('keeps the expected shape and caps list lengths', () => {
    const w = normalizeWriteup({ headline: 'H', verdict: 'V', areas: { google: { working: ['a', 'b', 'c', 'd', 'e', 6] } }, extra: 'x' });
    expect(w.areas.google.working).toEqual(['a', 'b', 'c', 'd']);
    expect(w.areas.social).toEqual({ summary: '', working: [], costing: [], fixes: [] });
    expect(w).not.toHaveProperty('extra');
  });

  it('clamps and sorts estimates, and falls back on nonsense', () => {
    expect(normalizeEstimates({ ticket: [600, 300, 420], close: [0.4, 2, 0.1], gross_margin: 7 })).toMatchObject({
      ticket: [300, 420, 600],
      close: [0.1, 0.4, 0.9],
      gross_margin: 0.9,
    });
    expect(normalizeEstimates({ ticket: 'lots' }).ticket).toEqual([150, 250, 400]);
  });

  it('keeps the client and marketer flags only when they are booleans', () => {
    expect(normalizeEstimates({ is_nwse_client: true, has_current_marketer: false })).toMatchObject({ is_nwse_client: true, has_current_marketer: false });
    expect(normalizeEstimates({ is_nwse_client: 'yes' })).toMatchObject({ is_nwse_client: null, has_current_marketer: null });
  });
});

describe('ROI inputs', () => {
  const facts = buildFacts(sampleAudit, sampleOutputs());
  const est = normalizeEstimates(sampleModelJson.estimates);

  it('sums demand from the largest keywords and keeps CPC inside the planner bid range', () => {
    const plan = roiInputsFrom(facts, est)!;
    expect(plan.inputs.demand_monthly).toBe(1300 + 900 + 480);
    const { conservative, base, optimistic } = plan.inputs.scenarios;
    for (const s of [conservative, base, optimistic]) {
      expect(s.cpc).toBeGreaterThanOrEqual(4.1);
      expect(s.cpc).toBeLessThanOrEqual(12.5);
      expect(s.incrementality).toBe(INCREMENTALITY.otherwise);
    }
    expect(conservative.ticket).toBe(300);
    expect(optimistic.close).toBe(0.45);
    expect(plan.sources.length).toBe(5);
  });

  it('uses the lower incrementality when the business already ranks first', () => {
    const outputs = sampleOutputs();
    (outputs.search as { business: { top_keywords: { position: number }[] } }).business.top_keywords[0].position = 1;
    const plan = roiInputsFrom(buildFacts(sampleAudit, outputs), est)!;
    expect(plan.inputs.scenarios.base.incrementality).toBe(INCREMENTALITY.ranks_first);
  });

  it('models nothing without keyword demand', () => {
    const outputs = sampleOutputs();
    delete outputs.keywords;
    expect(roiInputsFrom(buildFacts(sampleAudit, outputs), est)).toBeNull();
  });
});

describe('runModel', () => {
  const ctx = () => ({ audit: sampleAudit, outputs: sampleOutputs(), deadline: Date.now() + 250_000, attempt: 1 });
  beforeEach(() => openai.chatJson.mockReset());

  it('writes up the data and models the return', async () => {
    openai.chatJson.mockResolvedValueOnce(sampleModelJson);
    const out = await runModel(ctx());
    expect(openai.chatJson).toHaveBeenCalledTimes(1);
    expect(out.writeup.headline).toBe(sampleModelJson.headline);
    expect(out.removed_sentences).toEqual([]);
    expect(out.roi?.scenarios.base.year.spend).toBeGreaterThan(0);
    expect(out.roi_note).toBeNull();
  });

  it('asks once for a repair when a number is invented, then drops what is still unsupported', async () => {
    const invented = { ...sampleModelJson, verdict: 'Shops like this get 63% more calls. Harbor Auto Care has 212 reviews.' };
    openai.chatJson.mockResolvedValueOnce(invented).mockResolvedValueOnce(invented);
    const out = await runModel(ctx());
    expect(openai.chatJson).toHaveBeenCalledTimes(2);
    expect(openai.chatJson.mock.calls[1][1]).toContain('63%');
    expect(out.writeup.verdict).toBe('Harbor Auto Care has 212 reviews.');
    expect(out.removed_sentences).toEqual(['Shops like this get 63% more calls.']);
  });

  it('refuses to write about a business with no data', async () => {
    await expect(runModel({ ...ctx(), outputs: {} })).rejects.toBeInstanceOf(PermanentStepError);
    expect(openai.chatJson).not.toHaveBeenCalled();
  });

  it('models a Facebook-only business when no website, Instagram or Maps snapshot was available', async () => {
    const outputs = { social: { source: 'Public Facebook Page', fetched_at: '2026-10-23', business: null, competitors: [], facebook: { url: 'https://www.facebook.com/harborauto', page_id: '1', page_name: 'Harbor Auto Care', exists: true, followers: 1900, likes: 1750, category: 'Auto repair', intro: null, rating: null, rating_count: null, ad_library_status: null, restricted: false, posts: [], error: null } } };
    openai.chatJson.mockResolvedValue({ headline: 'Review the verified Facebook Page', verdict: 'The public Facebook Page was read. Website and Maps figures remain unavailable.', areas: { social: { summary: 'The public Page has 1,900 followers.', working: ['1,900 followers'], costing: [], fixes: ['Verify the intended booking path before measuring consultations.'] } } });
    const out = await runModel({ ...ctx(), audit: { ...sampleAudit, website: null, instagram: null, facebook: 'https://www.facebook.com/harborauto' }, outputs });
    expect(out.writeup.areas.social.working).toEqual(['1,900 followers']);
    expect(out.writeup.verdict).toContain('The public Facebook Page was read.');
  });

  it('does not report failed keyword research as zero demand', async () => {
    const outputs = sampleOutputs();
    outputs.keywords = { source: 'Google Search related queries', ideas: [{ keyword: 'health coach', monthly_searches: null }], demand_status: 'unavailable', error: 'Planner unavailable' };
    openai.chatJson.mockResolvedValue(sampleModelJson);
    const out = await runModel({ ...ctx(), outputs });
    expect(out.roi).toBeNull();
    expect(out.roi_note).toMatch(/could not be verified/i);
    expect(out.roi_note).not.toMatch(/no search volumes|no demand/i);
  });
});

describe('evidence completeness', () => {
  it.each([
    'The business is inactive on Instagram.',
    'The business has no Instagram account.',
    'The business has no Google listing.',
    'The business has no Google reviews.',
  ])('removes absence claims contradicted by positive business data: %s', claim => {
    const w = normalizeWriteup({ ...sampleModelJson, verdict: `${claim} The website was checked.` });
    const out = scrubUnsupportedClaims(w, buildFacts(sampleAudit, sampleOutputs()));
    expect(out.writeup.verdict).toBe('The website was checked.');
    expect(out.removed).toContain(claim);
  });

  it.each([
    'Demand could not be measured, and there are no active ads.',
    'No active ads were detected, but demand could not be measured.',
    'Maps could not be checked; the business has no Instagram account.',
  ])('does not let an uncertainty clause excuse another unsupported claim: %s', claim => {
    const w = normalizeWriteup({ ...sampleModelJson, verdict: `${claim} The website was checked.` });
    const out = scrubUnsupportedClaims(w, buildFacts(sampleAudit, sampleOutputs()));
    expect(out.writeup.verdict).toBe('The website was checked.');
  });

  it('preserves genuine uncertainty and a verified scoped Maps no-match', () => {
    const outputs = sampleOutputs();
    outputs.maps = { business: null, nearby: [], note: 'The business was not found on Google Maps under its name and city.', source: 'Google Maps', fetched_at: '2026-10-23' };
    const verdict = 'Campaign status could not be checked. That does not prove no active ads. No Google listing was found in the name-and-city lookup.';
    const w = normalizeWriteup({ ...sampleModelJson, verdict });
    expect(scrubUnsupportedClaims(w, buildFacts(sampleAudit, outputs)).writeup.verdict).toBe(verdict);
  });
  it('keeps the observed Wildly Primal failure pattern from becoming no ads, low demand or a funded plan', async () => {
    const outputs = sampleOutputs();
    outputs.maps = { business: null, nearby: [], note: 'The business was not found on Google Maps under its name and city.', source: 'Google Maps', fetched_at: '2026-10-23' };
    const search = outputs.search as { business: { organic_keywords: number; paid_keywords: number } };
    search.business.organic_keywords = 2;
    search.business.paid_keywords = 0;
    outputs.keywords = { source: 'Keyword Planner', ideas: [{ keyword: 'wildly primal functional health coaching', monthly_searches: null, competition: null, low_bid_usd: null, high_bid_usd: null }] };
    outputs.social = { business: { handle: 'wildlyprimal', exists: false, followers: null, error: 'Post reader returned an unreadable response' }, competitors: [], source: 'Instagram', fetched_at: '2026-10-23' };
    outputs.ads_library = { source: 'Public ad libraries', fetched_at: '2026-10-23', business: { google_ads_status: 'unknown', meta_ad_status: 'unknown', error: 'No Facebook Page linked from the website.' }, competitors: [] };
    const facts = buildFacts(sampleAudit, outputs);
    const w = normalizeWriteup({ ...sampleModelJson, verdict: 'No active campaigns detected. Keyword demand is low. The website has 2 ranking keywords.' });
    expect(scrubUnsupportedClaims(w, facts).writeup.verdict).toBe('The website has 2 ranking keywords.');
    expect(roiInputsFrom(facts, normalizeEstimates(sampleModelJson.estimates))).toBeNull();
    expect(criticalEvidenceProblems(facts, ['maps', 'search', 'keywords', 'social', 'ads_library']).join(' ')).toMatch(/public research/i);
  });

  it('distinguishes a failed read, a confirmed no-match, and a source never checked', () => {
    const outputs = sampleOutputs();
    outputs.maps = { business: null, nearby: [], note: 'The business was not found on Google Maps under its name and city.', source: 'Google Maps', fetched_at: '2026-10-21' };
    outputs.search = { business: { domain: 'harbor-auto.example', organic_keywords: null, error: 'reader failed' }, competitors: [], source: 'Ahrefs', fetched_at: '2026-10-21' };
    delete outputs.social;
    const coverage = evidenceCoverage(buildFacts(sampleAudit, outputs));
    expect(coverage.find(s => s.key === 'maps')?.status).toBe('not_found');
    expect(coverage.find(s => s.key === 'search')?.status).toBe('unavailable');
    expect(coverage.find(s => s.key === 'instagram')?.status).toBe('not_checked');
  });

  it('preserves successfully read Ahrefs metrics when a different search endpoint fails', () => {
    const outputs = sampleOutputs();
    const search = outputs.search as { business: { domain_rating: number | null; organic_keywords: number; error: string | null } };
    search.business.domain_rating = null;
    search.business.error = 'Domain rating lookup failed; site metrics were read.';
    const coverage = evidenceCoverage(buildFacts(sampleAudit, outputs));
    expect(coverage.find(s => s.key === 'search')?.status).toBe('checked');
  });

  it('keeps a recovered Instagram follower count while withholding activity conclusions after the post read fails', () => {
    const outputs = sampleOutputs();
    const social = outputs.social as { business: { posts_last_30_days: number | null; error: string | null } };
    social.business.posts_last_30_days = null;
    social.business.error = 'Posts: unreadable provider response';
    const facts = buildFacts(sampleAudit, outputs);
    expect(evidenceCoverage(facts).find(s => s.key === 'instagram')?.status).toBe('checked');
    const w = normalizeWriteup({ ...sampleModelJson, verdict: 'The business is inactive on Instagram. It has 1,250 followers.' });
    expect(scrubUnsupportedClaims(w, facts).writeup.verdict).toBe('It has 1,250 followers.');
  });

  it('holds repeated failed research even when step payloads exist, but accepts a Maps no-match and unprovided Instagram', () => {
    const outputs = sampleOutputs();
    outputs.maps = { business: null, nearby: [], note: 'Google Maps could not be read.', source: 'Google Maps', fetched_at: '2026-10-21' };
    outputs.social = { business: { handle: 'harborautocare', exists: false, followers: null, error: 'blocked' }, competitors: [], source: 'Instagram', fetched_at: '2026-10-21' };
    expect(criticalEvidenceProblems(buildFacts(sampleAudit, outputs), ['maps', 'social'])).toEqual(expect.arrayContaining([expect.stringMatching(/public research/i)]));
    outputs.maps = { business: null, nearby: [], note: 'The business was not found on Google Maps under its name and city.', source: 'Google Maps', fetched_at: '2026-10-21' };
    delete outputs.social;
    const noSocial = { ...sampleAudit, instagram: null };
    expect(criticalEvidenceProblems(buildFacts(noSocial, outputs), ['maps', 'social'])).toEqual([]);
  });

  it('removes claims of absent advertising and social activity when the readers did not establish them', () => {
    const outputs = sampleOutputs();
    delete outputs.social;
    const facts = buildFacts(sampleAudit, outputs);
    const input = normalizeWriteup({ ...sampleModelJson, areas: { ...sampleModelJson.areas, ads: { summary: 'No active campaigns detected. A Google Ads tag was found.', working: [], costing: [], fixes: [] }, social: { summary: 'The business is inactive on Instagram.', working: [], costing: [], fixes: [] } } });
    const out = scrubUnsupportedClaims(input, facts);
    expect(out.writeup.areas.ads.summary).toBe('A Google Ads tag was found.');
    expect(out.writeup.areas.social.summary).toBe('');
    expect(out.removed).toHaveLength(2);
  });
});

describe('sentence splitting', () => {
  it('does not split at a decimal point', () => {
    const allowed = allowedNumbers({ rating: 4.6 });
    expect(scrubText('Rated 4.6 on Google. It grew 37% last year.', allowed).text).toBe('Rated 4.6 on Google.');
  });
});
