import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ executeTool: vi.fn(), readPublicText: vi.fn() }));
vi.mock('../../../api/_lib/groundswell/composio', async (original) => ({ ...(await original<object>()), executeTool: mocks.executeTool }));
vi.mock('../../../api/_lib/groundswell/publicFetch', async (original) => ({ ...(await original<object>()), readPublicText: mocks.readPublicText }));
const store = vi.hoisted(() => ({ current: null as ReturnType<typeof import('./fixtures/fakeSupabase').fakeSupabase> | null }));
vi.mock('../../../api/_lib/supabaseAdmin', () => ({ isSupabaseConfigured: () => true, getSupabaseAdmin: () => store.current!.client }));

import { ASSISTANTS, GPTBOT_UA, headerReading, isAiSearchOutput, pageSignals, readAiVisibility, readEntity, readFile, runAiSearch, sitemapUrls, type AiSearchOutput } from '../../../api/_lib/groundswell/currents/aiSearch';
import { toolkitOf } from '../../../api/_lib/groundswell/composio';
import { GEO_BRIEF_TYPE, geoBriefFor, runDeliverGeo } from '../../../api/_lib/groundswell/geoDelivery';
import { gapsFor } from '../../../api/_lib/groundswell/gaps';
import { aiSearchForPrompt, buildFacts, factsForPrompt } from '../../../api/_lib/groundswell/model';
import { TOOLKIT_CHECKS } from '../../../api/_lib/groundswell/readiness';
import { aiSearchSection, buildAuditHtml } from '../../../api/_lib/groundswell/reports';
import { ALL_STEPS, BENCHMARK_STEPS, STEPS } from '../../../api/_lib/groundswell/steps';
import { PermanentStepError, type StepContext } from '../../../api/_lib/groundswell/types';
import { panelsFor } from '../../../api/_lib/groundswell/workspace';
import { STEP_LABELS } from '../../../src/lib/groundswell';
import { fakeSupabase } from './fixtures/fakeSupabase';
import { sampleAudit, sampleOutputs, sampleReportData } from './fixtures/groundswell-report';

/**
 * The AI search Current: the site as an AI crawler reads it (robots.txt, the
 * llms files, the sitemap, the homepage as GPTBot), the entity schema, the
 * phone against the listing, a citability score per page, and Ahrefs Brand
 * Radar through Composio; then the developer brief delivered with the run.
 * Provider shapes follow the Ahrefs API v3 documentation (brand-radar-*-entities,
 * site-explorer-ai-responses-count) as read on 2026-10-26.
 */

const ROBOTS = 'User-agent: *\nDisallow: /admin/\n\nUser-agent: GPTBot\nDisallow: /\n';
const HOME = `<!doctype html><html><head><title>Harbor Auto Care | Fort Lauderdale</title><link rel="canonical" href="https://harbor-auto.example/">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"AutoRepair","@id":"https://harbor-auto.example/#business","name":"Harbor Auto Care","telephone":"(954) 555-0199","address":{"@type":"PostalAddress","streetAddress":"1 Harbor Rd"},"sameAs":["https://www.instagram.com/harborautocare/"]},{"@type":"WebSite","url":"https://harbor-auto.example/"}]}</script>
</head><body><h1>Auto repair in Fort Lauderdale</h1><p>Harbor Auto Care repairs brakes, AC and engines, open Monday to Friday 8 am to 6 pm. Call (954) 555-0199.</p><a href="tel:+19545550199">Call</a></body></html>`;
const SITEMAP = '<?xml version="1.0"?><urlset><url><loc>https://harbor-auto.example/</loc></url><url><loc>https://harbor-auto.example/brakes</loc></url></urlset>';

const answer = (url: string, extra: Record<string, unknown> = {}) => ({ url, status: 200, text: '', contentType: 'text/plain', headers: {}, ...extra });

function fetchStub(over: Partial<Record<'robots' | 'llms' | 'llmsFull' | 'sitemap' | 'home', unknown>> = {}) {
  mocks.readPublicText.mockImplementation(async (url: string, options: { userAgent?: string } = {}) => {
    if (/robots\.txt$/.test(url)) return 'robots' in over ? over.robots : answer(url, { text: ROBOTS });
    if (/llms-full\.txt$/.test(url)) return 'llmsFull' in over ? over.llmsFull : answer(url, { status: 404 });
    if (/llms\.txt$/.test(url)) return 'llms' in over ? over.llms : answer(url, { status: 404 });
    if (/sitemap\.xml$/.test(url)) return 'sitemap' in over ? over.sitemap : answer(url, { text: SITEMAP, contentType: 'application/xml' });
    if (options.userAgent === GPTBOT_UA) return 'home' in over ? over.home : answer(url, { text: HOME, contentType: 'text/html', headers: { 'strict-transport-security': 'max-age=1', 'content-security-policy-report-only': "default-src 'self'" } });
    throw new Error(`Unexpected fetch of ${url}`);
  });
}

const brandRadar = (slug: string): unknown => {
  switch (slug) {
    case 'AHREFS_MCP_BRAND_RADAR_MENTIONS_OVERVIEW_ENTITIES':
      return { metrics: [{ brand: 'Harbor Auto Care (sample)', entity_type: 'target', total: 3, only_target_brand: 1, target_and_competitors_brands: 2 }, { brand: 'Bayside Garage', entity_type: 'competitor', total: 21 }, { brand: 'Coastline Motors', entity_type: 'competitor', total: 0 }] };
    case 'AHREFS_MCP_BRAND_RADAR_SOV_OVERVIEW_ENTITIES':
      return { metrics: [{ brand: 'Harbor Auto Care (sample)', entity_type: 'target', share_of_voice: 12.5 }, { brand: 'Bayside Garage', entity_type: 'competitor', share_of_voice: 87.5 }] };
    case 'AHREFS_MCP_BRAND_RADAR_AI_RESPONSES_ENTITIES':
      return { ai_responses: [
        { question: 'best auto repair shop in fort lauderdale', data_source: 'chatgpt', volume: 590, links: [{ url: 'https://www.yelp.com/biz/bayside', title: 'Bayside' }, { url: 'https://bayside.example/about' }], brand_sentiment: [{ brand: 'Bayside Garage', sentiment: 'positive' }] },
        { question: 'who fixes car ac near me', data_source: 'perplexity', volume: null, links: [{ url: 'https://harbor-auto.example/ac' }], brand_sentiment: [{ brand: 'Harbor Auto Care (sample)', sentiment: 'neutral' }, { brand: 'Bayside Garage', sentiment: null }] },
      ] };
    case 'AHREFS_MCP_BRAND_RADAR_CITED_DOMAINS_ENTITIES':
      return { domains: [{ domain: 'yelp.com', responses: 11, pages: 6 }, { domain: 'harbor-auto.example', responses: 1, pages: 1 }, { domain: 'bayside.example', responses: 4, pages: 2 }] };
    case 'AHREFS_MCP_SITE_EXPLORER_AI_RESPONSES_COUNT':
      return { ai_responses_count: { all_platforms: { citations: 2, pages: 1 }, chatgpt: { citations: 1, pages: 1 }, perplexity: { citations: 1, pages: 1 }, gemini: null } };
    default:
      throw new Error(`Unexpected tool ${slug}`);
  }
};

const ctxFor = (outputs: Record<string, unknown>, over: Partial<StepContext> = {}): StepContext => ({ audit: sampleAudit, outputs, deadline: Date.now() + 120_000, attempt: 1, steps: STEPS.map((s) => s.name), ...over });

const withPages = (outputs: Record<string, unknown>): Record<string, unknown> => ({
  ...outputs,
  competitors: { profile: { category: 'Auto repair shop', services: ['brakes', 'AC repair'] }, picks: [{ name: 'Bayside Garage', website: 'https://bayside.example', market: 'local' }, { name: 'Northside Auto', website: 'https://northside.example', market: 'national' }] },
  site_pages: {
    source: 'Website pages read as main-content markdown, via Firecrawl through Composio',
    fetched_at: '2026-10-26T10:00:00.000Z',
    website: 'https://harbor-auto.example/',
    mapped: 6,
    pages: [
      { url: 'https://harbor-auto.example/', path: '/', status: 200, title: 'Harbor Auto Care', description: 'Auto repair', h1: 'Auto repair in Fort Lauderdale', headings: ['What do we repair?', 'How much does a brake job cost?', 'FAQ'], word_count: 520, ctas: [{ text: 'Call', url: 'tel:1' }], prices: ['$129'], excerpt: 'Harbor Auto Care repairs brakes, AC and engines in Fort Lauderdale, open Monday to Friday from 8 am, with a $129 brake inspection.', error: null },
      { url: 'https://harbor-auto.example/about', path: '/about', status: 200, title: 'About', description: null, h1: 'About us', headings: ['Our story'], word_count: 70, ctas: [], prices: [], excerpt: 'Voted best auto shop in Broward three years running.', error: null },
      { url: 'https://harbor-auto.example/broken', path: '/broken', status: 500, title: null, description: null, h1: null, headings: [], word_count: 0, ctas: [], prices: [], excerpt: '', error: 'HTTP 500' },
    ],
    competitors: [],
    error: null,
  },
});

beforeEach(() => {
  mocks.executeTool.mockReset().mockImplementation(async (slug: string) => brandRadar(slug));
  mocks.readPublicText.mockReset();
  fetchStub();
  store.current = fakeSupabase();
});

describe('helpers', () => {
  it('reads a public file, with 404 as absent and a failure recorded', async () => {
    expect(await readFile('https://harbor-auto.example/llms.txt')).toMatchObject({ status: 404, text: '', error: null });
    mocks.readPublicText.mockRejectedValueOnce(new Error('The website lookup timed out.'));
    expect(await readFile('https://harbor-auto.example/robots.txt')).toMatchObject({ status: null, error: 'The website lookup timed out.' });
    expect(mocks.readPublicText).toHaveBeenLastCalledWith('https://harbor-auto.example/robots.txt', expect.objectContaining({ acceptStatuses: expect.arrayContaining([404]) }));
  });

  it('reads the entity graph: the business node, its @id, address, telephone, hours and sameAs', () => {
    expect(readEntity(HOME)).toEqual({ types: ['AutoRepair', 'PostalAddress', 'WebSite'], has_organization: false, has_local_business: true, has_id: true, same_as: ['https://www.instagram.com/harborautocare/'], has_address: true, telephone: '(954) 555-0199', has_opening_hours: false, has_faq: false });
    expect(readEntity('<html><script type="application/ld+json">{"@type":"Organization","name":"X","openingHoursSpecification":[{"@type":"OpeningHoursSpecification"}]}</script><script type="application/ld+json">not json</script></html>')).toMatchObject({ has_organization: true, has_local_business: false, has_id: false, has_opening_hours: true });
    expect(readEntity('<html></html>').types).toEqual([]);
  });

  it('counts sitemap URLs and names the security headers present and missing', () => {
    expect(sitemapUrls(SITEMAP)).toBe(2);
    expect(headerReading({ 'strict-transport-security': 'max-age=1', 'content-security-policy-report-only': 'x' })).toEqual({ present: ['strict-transport-security', 'content-security-policy-report-only'], missing: ['x-content-type-options', 'referrer-policy', 'permissions-policy'] });
    expect(headerReading({}).missing).toHaveLength(6);
  });

  it('turns the scan and the pages read into signals: the homepage raw, the inner pages as text', () => {
    const outputs = withPages(sampleOutputs());
    const signals = pageSignals((outputs.site as { business: Parameters<typeof pageSignals>[0] }).business, { status: 200, text: HOME, headers: {}, error: null }, outputs.site_pages as Parameters<typeof pageSignals>[2]);
    expect(signals.map((s) => s.path)).toEqual(['/', '/about']);
    expect(signals[0]).toMatchObject({ json_ld: true, readable_without_js: true, canonical: true, word_count: 520, ctas: 1 });
    expect(signals[1]).toMatchObject({ json_ld: null, readable_without_js: null, canonical: null, word_count: 70 });
  });

  it('maps the Brand Radar slugs to their own toolkit, which readiness checks', () => {
    expect(toolkitOf('AHREFS_MCP_BRAND_RADAR_MENTIONS_OVERVIEW_ENTITIES')).toBe('ahrefs_mcp');
    expect(toolkitOf('AHREFS_DOMAIN_RATING_FOR_SITE_EXPLORER')).toBe('ahrefs');
    expect(TOOLKIT_CHECKS.map((t) => t.toolkit)).toContain('ahrefs_mcp');
  });
});

describe('Brand Radar', () => {
  it('reads mentions, share of voice, the prompts, the cited domains and the citation counts from provider-shaped answers', async () => {
    const v = await readAiVisibility({ name: 'Harbor Auto Care (sample)', domain: 'harbor-auto.example', competitors: [{ name: 'Bayside Garage', domain: 'bayside.example' }, { name: 'Coastline Motors', domain: null }], timeoutMs: 10_000 });
    expect(v.error).toBeNull();
    expect(v.business).toEqual({ name: 'Harbor Auto Care (sample)', mentions: 3, share_of_voice: 12.5 });
    expect(v.competitors).toEqual([{ name: 'Bayside Garage', mentions: 21, share_of_voice: 87.5 }, { name: 'Coastline Motors', mentions: 0, share_of_voice: null }]);
    expect(v.prompts).toEqual([
      { question: 'best auto repair shop in fort lauderdale', assistant: 'ChatGPT', volume: 590, names_business: false, cited: ['yelp.com', 'bayside.example'] },
      { question: 'who fixes car ac near me', assistant: 'Perplexity', volume: null, names_business: true, cited: ['harbor-auto.example'] },
    ]);
    expect(v.cited_domains.map((d) => d.domain)).toEqual(['yelp.com', 'bayside.example', 'harbor-auto.example']);
    expect(v.citations).toEqual([{ platform: 'all_platforms', citations: 2, pages: 1 }, { platform: 'chatgpt', citations: 1, pages: 1 }, { platform: 'perplexity', citations: 1, pages: 1 }]);
    expect(v.assistants).toEqual(['ChatGPT', 'Perplexity', 'Gemini', 'Google AI Overviews', 'Copilot', 'Claude']);
    // The calls name the brand by name and domain, every assistant, the US.
    const mentions = mocks.executeTool.mock.calls.find((c) => c[0] === 'AHREFS_MCP_BRAND_RADAR_MENTIONS_OVERVIEW_ENTITIES')![1] as Record<string, unknown>;
    expect(mentions).toMatchObject({ data_source: [...ASSISTANTS], country: ['us'], prompts: 'ahrefs', brands: [{ names: ['Harbor Auto Care (sample)'], url_groups: [{ target: 'harbor-auto.example', scope: 'subdomains' }] }], select: ['brand', 'entity_type', 'total'] });
    expect((mentions.competitors as unknown[])[1]).toEqual({ names: ['Coastline Motors'] });
    const count = mocks.executeTool.mock.calls.find((c) => c[0] === 'AHREFS_MCP_SITE_EXPLORER_AI_RESPONSES_COUNT')![1] as Record<string, unknown>;
    expect(count).toMatchObject({ target: 'harbor-auto.example', mode: 'subdomains' });
  });

  it('keeps what answered when a read fails, and says what did not', async () => {
    mocks.executeTool.mockImplementation(async (slug: string) => {
      if (slug === 'AHREFS_MCP_BRAND_RADAR_SOV_OVERVIEW_ENTITIES') throw new Error('Brand Radar is not in this plan.');
      if (slug === 'AHREFS_MCP_BRAND_RADAR_CITED_DOMAINS_ENTITIES') return { nothing: true };
      return brandRadar(slug);
    });
    const v = await readAiVisibility({ name: 'Harbor Auto Care (sample)', domain: null, competitors: [], timeoutMs: 10_000 });
    expect(v.business).toEqual({ name: 'Harbor Auto Care (sample)', mentions: 3, share_of_voice: null });
    expect(v.cited_domains).toEqual([]);
    expect(v.citations).toEqual([]);
    expect(v.error).toBe('Share of voice: Brand Radar is not in this plan. Cited domains: no domains in the answer. Citations: No website to count citations for.');
  });
});

describe('the ai_search step', () => {
  it('reads the site as a crawler and the assistants, scores the pages, and names the improvements and the questions', async () => {
    const out = await runAiSearch(ctxFor(withPages(sampleOutputs())));
    expect(isAiSearchOutput(out)).toBe(true);
    expect(out.website).toBe('https://harbor-auto.example/');
    expect(out.crawlers.robots_found).toBe(true);
    expect(out.crawlers.agents.find((a) => a.agent === 'GPTBot')).toMatchObject({ verdict: 'blocked', group: 'gptbot' });
    expect(out.crawlers.agents.find((a) => a.agent === 'ClaudeBot')).toMatchObject({ verdict: 'restricted', group: '*' });
    expect(out.crawlers.gptbot_fetch).toEqual({ status: 200, blocked: false, note: 'The same page as the ordinary scan.' });
    expect(out.files).toEqual({
      llms_txt: { url: 'https://harbor-auto.example/llms.txt', found: false, bytes: 0 },
      llms_full_txt: { url: 'https://harbor-auto.example/llms-full.txt', found: false, bytes: 0 },
      sitemap: { url: 'https://harbor-auto.example/sitemap.xml', found: true, urls: 2 },
    });
    expect(out.entity).toMatchObject({ has_local_business: true, has_id: true, telephone: '(954) 555-0199', same_as: ['https://www.instagram.com/harborautocare/'] });
    expect(out.nap).toEqual({ site_phones: ['9545550199'], listing_phone: '9545550199', listing_name: 'Harbor Auto Care', site_name: 'Harbor Auto Care', consistent: true });
    expect(out.headers).toEqual({ present: ['strict-transport-security', 'content-security-policy-report-only'], missing: ['x-content-type-options', 'referrer-policy', 'permissions-policy'] });
    expect(out.pages.map((p) => [p.path, p.unknown.length])).toEqual([['/', 0], ['/about', 3]]);
    expect(out.pages[0].score).toBeGreaterThan(out.pages[1].score);
    expect(out.claims).toEqual([{ path: '/about', phrase: 'Voted best' }]);
    expect(out.visibility?.business.mentions).toBe(3);
    expect(out.visibility?.competitors.map((c) => c.name)).toEqual(['Bayside Garage', 'Coastline Motors', 'Northside Auto']);
    expect(out.improvements.map((i) => i.title)).toEqual(expect.arrayContaining(['robots.txt blocks GPTBot', 'No llms.txt', 'Claims the fact sheet must back or the copy must drop', 'Be present on the sources the assistants cite', 'No openingHoursSpecification']));
    expect(out.improvements.map((i) => i.title)).not.toContain('The site and the Google listing disagree on the phone number');
    expect(out.questions[0]).toMatch(/\/about the copy says “Voted best”/);
    expect(out.profiles).toEqual(expect.arrayContaining(['https://www.instagram.com/harborautocare/']));
    expect(out.errors).toEqual([]);
    expect(out.source).toMatch(/Brand Radar/);
    // Only the five reads of Brand Radar; the site's files through the public fetch.
    expect(mocks.executeTool).toHaveBeenCalledTimes(5);
    expect(mocks.readPublicText).toHaveBeenCalledTimes(5);
  });

  it('notices a host that answers an AI crawler differently, and a site without robots.txt', async () => {
    fetchStub({ robots: answer('https://harbor-auto.example/robots.txt', { status: 404 }), home: answer('https://harbor-auto.example/', { status: 403, contentType: 'text/html' }) });
    const out = await runAiSearch(ctxFor(sampleOutputs()));
    expect(out.crawlers.robots_found).toBe(false);
    expect(out.crawlers.agents.every((a) => a.verdict === 'no_robots')).toBe(true);
    expect(out.crawlers.gptbot_fetch).toEqual({ status: 403, blocked: true, note: 'The ordinary scan got HTTP 200; GPTBot got HTTP 403.' });
    expect(out.entity).toBeNull();
    expect(out.improvements[0].title).toBe('The homepage answers an AI crawler differently');
    // The homepage is still scored from the ordinary scan.
    expect(out.pages.map((p) => p.path)).toEqual(['/']);
  });

  it('goes on without the assistants when Composio refuses, and without the site when there is none', async () => {
    mocks.executeTool.mockRejectedValue(new PermanentStepError('Composio has no active connection for ahrefs_mcp.'));
    const out = await runAiSearch(ctxFor(sampleOutputs()));
    expect(out.visibility?.error).toMatch(/no active connection/);
    expect(out.visibility?.business.mentions).toBeNull();
    expect(out.improvements.some((i) => i.area === 'visibility')).toBe(false);

    mocks.readPublicText.mockClear();
    const noSite = await runAiSearch(ctxFor({}, { audit: { ...sampleAudit, website: null } }));
    expect(noSite.website).toBeNull();
    expect(noSite.files).toBeNull();
    expect(noSite.pages).toEqual([]);
    expect(noSite.crawlers.agents.every((a) => a.verdict === 'no_robots')).toBe(true);
    expect(mocks.readPublicText).toHaveBeenCalledTimes(0);
  });

  it('sits in every phase-1 list before the write-up, with its brief among the deliveries; the labels and gaps know both', () => {
    for (const steps of [STEPS, BENCHMARK_STEPS]) {
      const names = steps.map((s) => s.name);
      expect(names.indexOf('ai_search')).toBeGreaterThan(names.indexOf('ads_library'));
      expect(names.indexOf('ai_search')).toBeLessThan(names.indexOf('model'));
      expect(names.indexOf('deliver_geo')).toBe(names.indexOf('deliver_finish') - 1);
      expect(steps.find((s) => s.name === 'ai_search')).toMatchObject({ current: 'Search', optional: true });
      expect(steps.find((s) => s.name === 'deliver_geo')).toMatchObject({ current: 'Delivery', optional: false });
    }
    expect(ALL_STEPS.map((s) => s.name)).toEqual(expect.arrayContaining(['ai_search', 'deliver_geo']));
    expect(STEP_LABELS.ai_search).toBe('AI search');
    expect(STEP_LABELS.deliver_geo).toBe('GEO developer brief');
    expect(gapsFor({ site: {} }, ['site', 'ai_search'])).toEqual(['AI search (crawler access, citability and Brand Radar) could not be read for this audit, so the developer brief is not included.']);
  });
});

describe('the facts, the reports and the workspace', () => {
  const outputsWithAi = async () => {
    const outputs = withPages(sampleOutputs());
    outputs.ai_search = await runAiSearch(ctxFor(outputs));
    return outputs;
  };

  it('hands the model the verdicts and figures, not the rubric notes', async () => {
    const outputs = await outputsWithAi();
    const facts = buildFacts(sampleAudit, outputs);
    expect(facts.ai_search).toBe(outputs.ai_search);
    const prompt = factsForPrompt(facts).ai_search!;
    expect(prompt).toMatchObject({ crawlers_blocked: ['GPTBot'], robots_found: true, gptbot_blocked: false, llms_txt: false, sitemap_urls: 2, phone_consistent_with_listing: true });
    expect(prompt.ai_visibility).toMatchObject({ business_mentions: 3, business_share_of_voice: 12.5, site_citations: 2, most_cited_domains: ['yelp.com', 'bayside.example', 'harbor-auto.example'] });
    expect(prompt.citability).toEqual(facts.ai_search!.pages.map((p) => ({ path: p.path, score: p.score })));
    expect(JSON.stringify(prompt)).not.toMatch(/words of main content/);
    expect(aiSearchForPrompt(null)).toBeNull();
    expect(buildFacts(sampleAudit, sampleOutputs()).ai_search).toBeNull();
  });

  it('prints the AI answers section in the full audit, and leaves it out when the step did not run', async () => {
    const outputs = await outputsWithAi();
    const d = sampleReportData();
    const html = buildAuditHtml({ ...d, facts: buildFacts(sampleAudit, outputs) });
    expect(html).toMatch(/AI search: can the assistants read and cite you\?/);
    expect(html).toMatch(/<td>GPTBot<\/td>.*?<td>Blocked \(\/\)<\/td>/);
    expect(html).toMatch(/<td>\/llms\.txt<\/td><td>No<\/td><td>Not found<\/td>/);
    expect(html).toMatch(/<td>Bayside Garage<\/td><td>21<\/td><td>87\.5%<\/td>/);
    expect(html).toMatch(/Citations of the site/);
    expect(html).toMatch(/<td>yelp\.com<\/td><td>11<\/td><td>6<\/td>/);
    expect(html).toMatch(/robots\.txt blocks GPTBot/);
    expect(html).toMatch(/The site as an AI crawler reads it \(robots\.txt, llms\.txt, the sitemap, the homepage as GPTBot\) and Ahrefs Brand Radar through Composio \(\d{4}-\d{2}-\d{2}\)/);
    expect(html).toMatch(/Ahrefs Brand Radar \(US; Ahrefs’ own prompt set\) and Ahrefs Site Explorer AI citations, via Composio \(\d{4}-\d{2}-\d{2}\)/);
    expect(buildAuditHtml(d)).not.toMatch(/AI search: can the assistants/);
    const section = aiSearchSection({ ...(outputs.ai_search as AiSearchOutput), visibility: null, pages: [], improvements: [] });
    expect(section).toMatch(/Brand Radar was not available to this run/);
    expect(section).toMatch(/Nothing the reading calls for/);
  });

  it('shows the reading as a workspace panel', async () => {
    const outputs = await outputsWithAi();
    const panel = panelsFor(outputs).find((p) => p.key === 'ai_search')!;
    expect(panel.title).toBe('AI search');
    expect(panel.rows).toEqual(expect.arrayContaining([{ label: 'AI crawlers blocked by robots.txt', value: 'GPTBot' }, { label: 'llms.txt', value: 'No' }, { label: 'Sitemap URLs', value: '2' }, { label: 'Phone matches the Google listing', value: 'Yes' }, { label: 'AI mentions (Brand Radar)', value: '3 · 12.5% share of voice' }]));
    expect(panel.table?.rows.map((r) => r[0])).toEqual(['/', '/about']);
    expect(panel.list?.[0]).toMatch(/^high: /);
    expect(panelsFor(sampleOutputs()).some((p) => p.key === 'ai_search')).toBe(false);
  });
});

describe('deliver_geo', () => {
  it('stores the developer brief as a Markdown export with the run', async () => {
    const outputs = await (async () => { const o = withPages(sampleOutputs()); o.ai_search = await runAiSearch(ctxFor(o)); return o; })();
    const ctx = ctxFor(outputs);
    const result = await runDeliverGeo(ctx);
    const file = result.file!;
    // No write-up in these outputs, so the file carries today's date (phase 1 names the write-up's day when there is one).
    expect(file).toMatchObject({ name: expect.stringMatching(/^Harbor Auto Care \(sample\) - GEO Developer Brief \(\d{4}-\d{2}-\d{2}\)\.md$/), content_type: GEO_BRIEF_TYPE });
    expect(file.path).toMatch(new RegExp(`^${sampleAudit.id}/export/Harbor_Auto_Care_\\(sample\\)_-_GEO_Developer_Brief_\\(\\d{4}-\\d{2}-\\d{2}\\)\\.md$`));
    const rows = store.current!.tables.groundswell_assets;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ audit_id: sampleAudit.id, kind: 'export', bytes: file.bytes, meta: { format: 'geo-brief' } });
    const stored = store.current!.objects['groundswell-assets'].get(file.path);
    const text = new TextDecoder().decode(stored!);
    expect(text).toBe(geoBriefFor(ctx, outputs.ai_search as AiSearchOutput));
    expect(text).toMatch(/^# GEO audit and factual site improvements: Harbor Auto Care \(sample\) \(https:\/\/harbor-auto\.example\/\)/);
    expect(text).toMatch(/Google listing as read: Harbor Auto Care · 1 Harbor Rd, Fort Lauderdale, FL 33301 · \(954\) 555-0199 · hours Monday 8 AM–6 PM · rating 4\.6 on 212 reviews/);
    expect(text).toMatch(/\| Bayside Garage \| 21 \| 87\.5% \|/);
    expect(text).toMatch(/Prepared by New Wave: Social Engineering/);
  });

  it('writes nothing, and says so, when the run has no reading', async () => {
    expect(await runDeliverGeo(ctxFor(sampleOutputs()))).toEqual({ file: null, note: 'The AI search step left no reading, so no developer brief was written.' });
    expect(store.current!.tables.groundswell_assets ?? []).toEqual([]);
  });
});
