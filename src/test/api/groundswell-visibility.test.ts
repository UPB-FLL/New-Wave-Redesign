import { existsSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const openai = vi.hoisted(() => ({ chatJson: vi.fn() }));
vi.mock('../../../api/_lib/groundswell/openai', () => ({ chatJson: openai.chatJson, GROUNDSWELL_MODEL: () => 'test-model' }));

import { buildFacts } from '../../../api/_lib/groundswell/model';
import {
  bestPage,
  checkCopy,
  copyTargets,
  HEAD_TERM,
  planWithFirstMonth,
  quickWins,
  runVisibility,
  targetKeywords,
  topUpFindings,
  visibilityFromFacts,
  type CopyTarget,
} from '../../../api/_lib/groundswell/visibility';
import { evidenceCoverage, isSubstantiveFinding, type ReportFinding } from '../../../api/_lib/groundswell/model';
import { buildInternalHtml, INTERNAL_BANNER } from '../../../api/_lib/groundswell/reportsInternal';
import { reportData } from '../../../api/_lib/groundswell/delivery';
import { BENCHMARK_STEPS, STEPS } from '../../../api/_lib/groundswell/steps';
import { REPORT_KINDS } from '../../../api/_lib/groundswell/reportStore';
import { gapsFor } from '../../../api/_lib/groundswell/gaps';
import { brandFrom } from '../../../api/_lib/groundswell/brand';
import { preparerFor } from '../../../api/_lib/groundswell/reportFrame';
import { sampleAudit, sampleModelOutput, sampleOutputs } from './fixtures/groundswell-report';
import type { SitePage } from '../../../api/_lib/groundswell/currents/sitePages';

/**
 * The visibility step and the internal brief (owner's ask, 2026-11-17, from
 * Baraguz's audit): the keywords and their searches, copy to paste, the fixes
 * that raise visibility at once, and those fixes in the first month of the
 * client's plan. Made-up data only: a tea shop that sells online.
 */

const at = '2026-11-17T01:00:00.000Z';
const page = (path: string, over: Partial<SitePage> = {}): SitePage => ({
  url: `https://leafline.example${path}`, path, status: 200, title: null, description: null, h1: null, headings: [], word_count: 300, ctas: [], prices: [], excerpt: '', error: null, ...over,
});
const pages = [
  page('/', { title: 'Leafline Slim Tea & Herbal Blends', h1: 'Herbal tea for every day', headings: ['Green Tea', 'Peppermint', 'Ships to all 50 states'], description: 'Herbal blends from Leafline.', excerpt: 'Leafline makes slim tea and herbal blends. 3 g per tea bag. Ships to all 50 states, free over $40.', word_count: 900 }),
  page('/pages/faq', { title: 'FAQ', headings: ['How long does shipping take?'] }),
  page('/products/sold', { title: 'Mint Flask (SOLD OUT)', description: 'A flask.', word_count: 30 }),
];

function outputs(): Record<string, unknown> {
  const o = sampleOutputs();
  const site = o.site as { business: Record<string, unknown> };
  site.business = { ...site.business, url: 'https://leafline.example', final_url: 'https://leafline.example/', social: { facebook: ['yourbusiness'], instagram: ['leafline'], tiktok: [], youtube: [] }, phones: [] };
  return {
    ...o,
    site,
    maps: { fetched_at: at, source: 'Google Maps', business: { name: 'Leafline', rating: 4.9, reviews: 31, category: null, address: null, phone: '(305) 555-0100', website: null, hours: [], url: null }, nearby: [], note: null },
    search: {
      source: 'Ahrefs Site Explorer (US)', fetched_at: at,
      serp: { note: '', queries: [{ query: 'Leafline', location: null, error: null, captured_at: at, source_url: 'https://www.google.com/search?q=Leafline', provider: 'serpapi', local: [], questions: [], related_searches: [], organic: [{ position: 4, url: 'https://leafline.example/en-au', title: 'Leafline AU', domain: 'leafline.example', snippet: '' }] }] },
      business: {
        domain: 'leafline.example', domain_rating: 10, organic_keywords: 40, organic_traffic: 30, traffic_value_usd: 5, paid_keywords: 0, error: null,
        top_keywords: [
          { keyword: 'when to drink detox tea', volume: 40, position: 1, traffic: 2, url: 'https://leafline.example/blogs/when' },
          { keyword: 'can i drink detox tea at night', volume: 60, position: 6, traffic: 3, url: 'https://leafline.example/blogs/when' },
          { keyword: 'leafline tea', volume: 10, position: 1, traffic: 2, url: 'https://leafline.example/' },
          { keyword: 'herbal tea gift', volume: 5, position: 12, traffic: 0, url: null },
        ],
      },
      competitors: [],
    },
    keywords: {
      source: 'Google Ads Keyword Planner (United States (the business sells online); geoTargetConstants/2840)', fetched_at: at, demand_status: 'measured', error: null,
      geography: { label: 'United States (the business sells online)', constants: ['geoTargetConstants/2840'], error: null },
      seeds: ['slim tea'],
      ideas: [
        { keyword: 'green tea', monthly_searches: 135_000, competition: 'HIGH', low_bid_usd: 0.06, high_bid_usd: 1.61 },
        { keyword: 'slim tea', monthly_searches: 6600, competition: 'HIGH', low_bid_usd: 0.28, high_bid_usd: 3.5 },
        { keyword: 'weight loss tea', monthly_searches: 8100, competition: 'HIGH', low_bid_usd: 0.32, high_bid_usd: 7.1 },
        { keyword: 'best green tea', monthly_searches: 9900, competition: 'HIGH', low_bid_usd: 0.2, high_bid_usd: 1.33 },
        { keyword: 'leafline slim tea', monthly_searches: 10, competition: 'LOW', low_bid_usd: null, high_bid_usd: null },
        { keyword: 'can i drink detox tea at night', monthly_searches: 70, competition: 'LOW', low_bid_usd: null, high_bid_usd: null },
      ],
    },
    social: {
      source: 'Instagram', fetched_at: at, handle_source: 'entered',
      business: { handle: 'leafline', exists: true, followers: 52_000, following: 200, posts: null, biography: null, is_business: false, last_post_at: at, posts_last_30_days: 3, avg_likes_recent: 4, avg_comments_recent: 4, error: null },
      facebook: { url: 'https://www.facebook.com/yourbusiness', exists: true, page_name: 'Yourbusiness', likes: 3, posts: [], error: null },
      competitors: [],
    },
    site_pages: { source: 'Firecrawl', fetched_at: at, website: 'https://leafline.example', mapped: 20, pages, competitors: [], error: null },
    model: sampleModelOutput(),
  };
}
const audit = { ...sampleAudit, business_name: 'Leafline', city: null, website: 'https://leafline.example', competitors: [] };
const facts = () => buildFacts(audit, outputs());

beforeEach(() => openai.chatJson.mockReset());
afterEach(() => vi.unstubAllEnvs());

describe('target keywords', () => {
  it('sorts the data into near misses, gaps, rankings to protect and ideas, brand searches left out', () => {
    const k = targetKeywords(facts());
    const of = (kind: string) => k.filter((x) => x.kind === kind).map((x) => x.keyword);
    expect(of('near_miss')).toEqual(['can i drink detox tea at night']); // position 6; the 5-search one is under the minimum
    expect(of('protect')).toEqual(['when to drink detox tea', 'leafline tea']);
    // Ranked searches are not gaps; the brand search is left out; the head term comes after the reachable ones.
    expect(of('gap')).toEqual(['best green tea', 'weight loss tea', 'slim tea', 'green tea']);
    expect(k.find((x) => x.keyword === 'green tea')!.searches).toBeGreaterThan(HEAD_TERM);
  });

  it('reads no gaps when demand was not measured, and lists the ideas as unmeasured', () => {
    const o = outputs();
    (o.keywords as Record<string, unknown>).demand_status = 'unavailable';
    for (const i of (o.keywords as { ideas: { monthly_searches: number | null }[] }).ideas) i.monthly_searches = null;
    const k = targetKeywords(buildFacts(audit, o));
    expect(k.some((x) => x.kind === 'gap')).toBe(false);
    expect(k.filter((x) => x.kind === 'idea').every((x) => x.searches === null)).toBe(true);
  });

  it('maps a keyword to a page only when the page holds all its words (most, for a long one)', () => {
    expect(bestPage('slim tea', pages)).toBe('https://leafline.example/');
    expect(bestPage('green tea supplements', pages)).toBeNull(); // "green tea" alone is not supplements
    expect(bestPage('weight loss tea', pages)).toBeNull();
  });
});

describe('quick wins', () => {
  it('names each fix with its evidence, in its week, the listing and Search Console first', () => {
    const f = facts();
    const w = quickWins(f, targetKeywords(f));
    const ids = w.map((x) => x.id);
    expect(ids.slice(0, 2)).toEqual(['gbp:basics', 'gsc']);
    expect(ids).toEqual(expect.arrayContaining(['placeholder:facebook:yourbusiness', 'placeholder:facebook-page', 'hreflang', 'nap:phone', 'ig:professional', 'title:sold-out', 'near-miss']));
    expect(w.find((x) => x.id === 'gbp:basics')!.evidence).toContain('no address, no category, no hours');
    expect(w.find((x) => x.id === 'hreflang')!.evidence).toContain('/en-au');
    expect(w.map((x) => x.week)).toEqual([...w.map((x) => x.week)].sort());
  });

  it('keeps staff notes out of the client: a likely bought audience, and weight-loss searches needing claim-safe copy', () => {
    const f = facts();
    const w = quickWins(f, targetKeywords(f));
    const staff = w.filter((x) => !x.client).map((x) => x.id);
    expect(staff).toEqual(['ig:audience', 'claims:weight-loss']);
    expect(w.find((x) => x.id === 'ig:audience')!.evidence).toContain('52,000 followers');
  });
});

describe('copy', () => {
  const target: CopyTarget = { page: 'https://leafline.example/', path: '/', title: 'Old', description: null, h1: null, headings: [], excerpt: 'Ships to all 50 states, free over $40.', keywords: ['slim tea'] };
  const rules = { unsupported: (t: string) => (t.match(/\d+/g) ?? []).filter((n) => !['50', '40', '3'].includes(n)), claims: ['best', 'guaranteed'] as const };

  it('keeps fields within the limits, with the data’s numbers and no claim; drops and names the rest', () => {
    const r = checkCopy(
      {
        pages: [
          { page: 'https://leafline.example', title: 'Slim Tea & Herbal Blends | Leafline', meta_description: 'Slim tea that melts fat in 7 days.', h1: 'x'.repeat(80), intro: 'Leafline ships slim tea to all 50 states, free over $40.', faqs: [{ question: 'Does it cure bloating?', answer: 'It cures it.' }, { question: 'Where do you ship?', answer: 'To all 50 states.' }] },
          { page: 'https://elsewhere.example/', title: 'Not asked' },
        ],
      },
      [target],
      rules
    );
    expect(r.copy.map((c) => c.field)).toEqual(['title', 'intro', 'faq']);
    expect(r.copy.every((c) => c.keyword === 'slim tea')).toBe(true);
    expect(r.dropped.join(' ')).toMatch(/meta description: 7 is not in the data/);
    expect(r.dropped.join(' ')).toMatch(/h1: 80 characters, over 70/);
    expect(r.dropped.join(' ')).toMatch(/“cure” is a claim/);
    expect(r.dropped.join(' ')).toMatch(/elsewhere\.example.*not a page that was asked for/);
  });

  it('writes to pages read, never to a keyword carrying a claim (“best green tea”)', () => {
    const f = facts();
    const t = copyTargets(f, targetKeywords(f));
    expect(t.map((x) => x.path)).toEqual(['/']);
    expect(t[0].keywords).toEqual(['slim tea']);
  });
});

describe('the step', () => {
  it('without the writer: everything but the copy, and a title from a template', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    const v = await runVisibility({ audit, outputs: outputs(), deadline: Date.now() + 60_000, attempt: 1 });
    expect(openai.chatJson).not.toHaveBeenCalled();
    expect(v.market).toBe('United States (the business sells online)');
    expect(v.copy).toEqual([{ page: 'https://leafline.example/', field: 'title', current: 'Leafline Slim Tea & Herbal Blends', proposed: 'Slim Tea | Leafline', keyword: 'slim tea' }]);
    expect(v.copy_source).toBe('template');
    expect(v.month.map((m) => m.week)).toEqual([1, 2, 3, 4]);
  });

  it('with the writer: its copy, held to the rules', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');
    openai.chatJson.mockResolvedValue({ pages: [{ page: 'https://leafline.example/', title: 'Slim Tea & Herbal Blends | Leafline', meta_description: 'Leafline slim tea and herbal blends, 3 g per tea bag, shipped to all 50 states and free over $40.', h1: 'Slim Tea and Herbal Blends', intro: 'Leafline has 2,500 five-star reviews.', faqs: [] }] });
    const v = await runVisibility({ audit, outputs: outputs(), deadline: Date.now() + 60_000, attempt: 1 });
    expect(v.copy_source).toBe('model');
    expect(v.copy.map((c) => c.field)).toEqual(['title', 'meta_description', 'h1']);
    expect(v.dropped[0]).toMatch(/intro/);
    expect(v.month[1].items[0]).toMatch(/^Paste the new titles, descriptions and headings on 1 page \(\/\)/);
  });
});

describe('the client’s plan', () => {
  it('leads Weeks 1–2 and 3–6 with the first month’s client items, capped per week, never a staff note', () => {
    const f = facts();
    const v = visibilityFromFacts(f);
    const plan = planWithFirstMonth({ weeks_1_2: ['Write-up item A.'], weeks_3_6: ['Write-up item B.'], weeks_7_12: ['Later.'] }, v);
    expect(plan.weeks_1_2.slice(0, 2)).toEqual(['Complete the Google Business Profile.', 'Verify Search Console and submit the sitemap.']);
    expect(plan.weeks_1_2).toContain('Write-up item A.');
    expect(plan.weeks_3_6).toContain('Write-up item B.');
    expect(plan.weeks_7_12).toEqual(['Later.']);
    const all = [...plan.weeks_1_2, ...plan.weeks_3_6].join(' ');
    expect(all).not.toMatch(/Instagram audience|without health claims/);
    expect(plan.weeks_1_2.length).toBeLessThanOrEqual(8);
    expect(planWithFirstMonth({ weeks_1_2: ['A.'], weeks_3_6: [], weeks_7_12: [] }, null).weeks_1_2).toEqual(['A.']);
  });

  it('reportData lays the first month over the write-up’s plan for all three reports; a run without the step is unchanged', () => {
    const o = outputs();
    const v = visibilityFromFacts(buildFacts(audit, o));
    const ctx = { audit, outputs: { ...o, visibility: v }, deadline: Date.now() + 1000, attempt: 1 };
    expect(reportData(ctx).model.writeup.plan.weeks_1_2[0]).toBe('Complete the Google Business Profile.');
    const plain = reportData({ ...ctx, outputs: o });
    expect(plain.model.writeup.plan).toEqual((o.model as ReturnType<typeof sampleModelOutput>).writeup.plan);
  });
});

describe('findings topped up from the fixes (Baraguz, 2026-11-17)', () => {
  const finding = (over: Partial<ReportFinding>): ReportFinding => ({ area: 'website', priority: 'high', title: 'Images Missing Alt Text', evidence: '10 images on the website are missing alt text.', source: 'website', basis: 'observed', implication: 'Images without descriptions cannot be found through image search.', action: 'Add descriptive alt text to all images on the website.', measure: 'Every homepage image has alt text naming the product.', effort: 'Low', dependency: 'Site access.', ...over });
  // The guard left two of four findings empty: "no active ads" claims removed.
  const hollow = [finding({ area: 'google', title: '', evidence: '', action: 'Activate Google Ads campaigns targeting high-volume keywords.' }), finding({}), finding({ area: 'ads', title: '', evidence: '' })];

  it('drops the findings the guard emptied and tops the write-up up to four from client fixes on a checked source', () => {
    const f = facts();
    const checked = new Set<string>(evidenceCoverage(f).filter((e) => e.status === 'checked').map((e) => e.key));
    const out = topUpFindings(hollow, visibilityFromFacts(f), checked);
    expect(out).toHaveLength(4);
    expect(out.some((x) => !x.title)).toBe(false);
    expect(out[0].title).toBe('Images Missing Alt Text');
    // Never a staff note, never a fix whose source was not checked, never a second alt-text finding.
    expect(out.map((x) => x.title).join(' ')).not.toMatch(/Instagram audience|without health claims|Describe .* image/);
    for (const x of out.slice(1)) {
      expect(checked.has(x.source)).toBe(true);
      // What the gate counts as substantive (verify.ts).
      expect(x.basis).toBe('observed');
      expect(x.evidence.length).toBeGreaterThanOrEqual(40);
      expect(x.action.length).toBeGreaterThanOrEqual(40);
      expect(x.implication.length).toBeGreaterThanOrEqual(30);
      expect(x.measure.length).toBeGreaterThanOrEqual(30);
    }
    expect(out.slice(1).map((x) => x.title)).toContain('Complete the Google Business Profile');
  });

  it('tops up until the gate counts three, as Baraguz’s write-up needed (a finding with a short action does not count)', () => {
    const f = facts();
    const checked = new Set<string>(evidenceCoverage(f).filter((e) => e.status === 'checked').map((e) => e.key));
    const tiktok = finding({ area: 'social', title: 'Missing TikTok Pixel', evidence: 'TikTok account links to website but no TikTok pixel detected.', action: 'Install TikTok pixel on the website.' });
    const before = [hollow[0], tiktok, finding({}), hollow[2]];
    expect(before.filter((x) => isSubstantiveFinding(x, checked)).length).toBe(1);
    const out = topUpFindings(before, visibilityFromFacts(f), checked);
    expect(out.filter((x) => isSubstantiveFinding(x, checked)).length).toBeGreaterThanOrEqual(3);
    expect(out.length).toBeLessThanOrEqual(6);
    // The model's own TikTok finding stays; the fix it repeats is not added again.
    expect(out.filter((x) => /tiktok pixel/i.test(x.title))).toHaveLength(1);
  });

  it('leaves a full write-up alone, and without the step only drops what is hollow', () => {
    const f = facts();
    const full = [finding({ title: 'A' }), finding({ title: 'B' }), finding({ title: 'C' }), finding({ title: 'D' })];
    expect(topUpFindings(full, visibilityFromFacts(f), new Set(['website']))).toEqual(full);
    expect(topUpFindings(hollow, null, new Set(['website']))).toHaveLength(1);
    // Nothing checked: nothing to write a finding from.
    expect(topUpFindings(hollow, visibilityFromFacts(f), new Set())).toHaveLength(1);
  });
});

describe('the internal brief', () => {
  const html = (preparer?: ReturnType<typeof preparerFor>) => {
    const f = facts();
    return buildInternalHtml({ facts: f, brand: brandFrom(f.site?.business), date: 'November 17, 2026', visibility: visibilityFromFacts(f), preparer });
  };

  it('says it is internal on every page and carries the keywords, the bids, the fixes and the staff notes', () => {
    const h = html();
    expect(h).toContain(INTERNAL_BANNER);
    expect(h.match(/Internal visibility brief ·/g)?.length).toBe(h.match(/class="page-foot"/g)?.length);
    expect(h).toContain('can i drink detox tea at night');
    expect(h).toContain('$0.28–$3.50');
    expect(h).toContain('Check the Instagram audience before quoting it');
    expect(h).toContain('United States (the business sells online)');
  });

  it('carries a partner’s name, never New Wave’s', () => {
    const h = html(preparerFor({ partner: { id: 'p1', company: 'Reef Agency LLC', name: 'Reef Growth Co', logo: null }, logo: null, color: null }));
    expect(h).toContain('Reef Growth Co');
    expect(h).not.toMatch(/New Wave|NWSE|Groundswell/);
  });
});

describe('wiring', () => {
  it('runs the step after the plans and before the checks, and prints the brief after the summary, in audits and benchmarks', () => {
    for (const steps of [STEPS, BENCHMARK_STEPS]) {
      const names = steps.map((s) => s.name);
      expect(names.indexOf('visibility')).toBe(names.indexOf('plans') + 1);
      expect(names.indexOf('visibility')).toBeLessThan(names.indexOf('verify_read_2'));
      expect(names.indexOf('deliver_internal')).toBe(names.indexOf('deliver_summary') + 1);
      expect(steps.find((s) => s.name === 'deliver_internal')!.optional).toBe(false);
    }
    expect(REPORT_KINDS).toContain('internal');
  });

  it('retries a brief that cannot be printed, and on the last attempt records why instead of holding the client’s reports back', async () => {
    const { runDeliverInternal } = await import('../../../api/_lib/groundswell/delivery');
    // No deliver_prepare output: printing refuses, as a storage refusal would.
    const ctx = (attempt: number) => ({ audit, outputs: outputs(), deadline: Date.now() + 1000, attempt });
    await expect(runDeliverInternal(ctx(1))).rejects.toThrow(/deliver_prepare/);
    await expect(runDeliverInternal(ctx(3))).resolves.toEqual({ note: expect.stringMatching(/^The internal visibility brief could not be printed or stored: .*deliver_prepare/) });
  });

  it('never names a skipped visibility step in the client’s reports', () => {
    expect(gapsFor({}, ['visibility', 'deliver_internal'])).toEqual([]);
  });
});

const chromium = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
describe.skipIf(!existsSync(chromium))('printing the brief (headless Chromium)', () => {
  it('prints framed pages with no links', async () => {
    process.env.CHROMIUM_PATH = chromium;
    const { withBrowser } = await import('../../../api/_lib/groundswell/browser');
    const { renderPdf } = await import('../../../api/_lib/groundswell/render');
    const f = facts();
    const pdf = await withBrowser((b) => renderPdf(b, buildInternalHtml({ facts: f, brand: brandFrom(f.site?.business), date: 'November 17, 2026', visibility: visibilityFromFacts(f) })));
    expect(pdf.pages).toBeGreaterThanOrEqual(6);
    expect(pdf.links).toEqual([]);
  }, 60_000);
});
