import { beforeEach, describe, expect, it, vi } from 'vitest';

const openai = vi.hoisted(() => ({ chatJson: vi.fn() }));
vi.mock('../../../api/_lib/groundswell/openai', () => ({ chatJson: openai.chatJson, GROUNDSWELL_MODEL: () => 'test-model' }));

import { isPlansOutput, pagesAllowed, plansInput, PLANS_SYSTEM, runPlans, type PlansOutput } from '../../../api/_lib/groundswell/plans';
import { buildFacts, factsForPrompt } from '../../../api/_lib/groundswell/model';
import { buildAuditHtml, buildDeckHtml, buildSummaryHtml, CONTENT_SLIDE_ID } from '../../../api/_lib/groundswell/reports';
import { parseScrapedPage, type SitePagesOutput } from '../../../api/_lib/groundswell/currents/sitePages';
import { PermanentStepError } from '../../../api/_lib/groundswell/types';
import { STEPS } from '../../../api/_lib/groundswell/steps';
import { gapsFor } from '../../../api/_lib/groundswell/gaps';
import { panelsFor } from '../../../api/_lib/groundswell/workspace';
import { STEP_LABELS } from '../../../src/lib/groundswell';
import { checkPlans } from '../../../packages/groundswell/src/plans';
import { sampleAdplanOutput, sampleAudit, sampleModelOutput, sampleOutputs, sampleReportDataWithPlan } from './fixtures/groundswell-report';

/**
 * The plans step: the website optimization plan and the first week of posts,
 * written from the data with OpenAI mocked, held to the rules, and shown in
 * the full audit, the slides, the summary and the workspace.
 */

const AUDIT = 'https://www.newwaveitfl.com/groundswell';
const DECK = 'https://www.newwaveitfl.com/groundswell';
const FOLDER = 'https://www.newwaveitfl.com/groundswell';

const pages: SitePagesOutput = {
  source: 'Website pages read as main-content markdown, via Firecrawl through Composio',
  fetched_at: '2026-10-21T12:00:00.000Z',
  website: 'https://harbor-auto.example',
  mapped: 6,
  pages: [
    parseScrapedPage('https://harbor-auto.example', { data: { markdown: '# Auto repair you can trust\n\nBrakes, tires and AC repair in Fort Lauderdale. [Book online](https://book.squareup.com/appointments/xyz)\n', metadata: { statusCode: 200, title: 'Harbor Auto Care | Auto Repair in Fort Lauderdale', description: 'Honest auto repair.' } } }),
    parseScrapedPage('https://harbor-auto.example/services', { data: { markdown: '# Services\n\n## Brake repair\n\nPads and rotors from $189.\n\n## AC repair\n\nDiagnostics and recharge.\n', metadata: { statusCode: 200, title: 'Services | Harbor Auto Care' } } }),
    parseScrapedPage('https://harbor-auto.example/about', { data: { metadata: { statusCode: 500 } } }),
  ],
  competitors: [{ name: 'Bayside Garage', website: 'https://bayside.example', page: parseScrapedPage('https://bayside.example', { data: { markdown: '# Bayside Garage\n\nSame-day brakes. [Book now](/book)\n', metadata: { statusCode: 200, title: 'Bayside Garage' } } }) }],
  error: null,
};

const competitors = { profile: { category: 'Auto repair shop', offer: 'Brake, tire and AC repair with online booking.', services: ['brake repair', 'AC repair'], audience: 'drivers in Fort Lauderdale', service_area: 'local', competitor_queries: ['auto repair fort lauderdale'], content_topics: ['brakes'], source: 'model', evidence: ['https://harbor-auto.example'] }, picks: [{ market: 'local', name: 'Bayside Garage', website: 'https://bayside.example', rating: 4.8, reviews: 540, address: null, url: null, query: 'Auto repair shop near Fort Lauderdale, FL', source: 'places', reason: 'Repairs the same cars for the same drivers.' }], dropped: [{ name: 'SERVPRO of Fort Lauderdale', website: 'https://servpro.example', reason: 'Its listing (General Contractor) does not share the business’s category wording.' }] };

const answer = {
  website_plan: {
    summary: 'The services page names brakes and AC but the homepage title carries no service.',
    changes: [
      { page: '/services', priority: 'high', change: 'Give brake repair its own heading with the $189 price and the booking link.', reason: 'Brake repair is the largest measured search.', evidence: 'Heading "Brake repair"; pads and rotors from $189.' },
      { page: 'https://harbor-auto.example', priority: 'medium', change: 'Put "Book online" above the fold.', reason: 'The booking link sits under the services copy.', evidence: 'CTA: Book online.' },
      { page: '/pricing', priority: 'high', change: 'Add prices.', reason: 'x', evidence: 'y' },
    ],
    new_pages: [{ path: '/brake-repair-fort-lauderdale', purpose: 'Answer the brake repair searches with the price and the booking link.', searches: ['brake repair near me'] }],
    measurement: ['Search Console clicks on /services, by week.'],
  },
  social_plan: {
    summary: 'Instagram first, Facebook as the reshare.',
    platforms: [{ platform: 'instagram', role: 'Where the shop already posts.', cadence: 'Daily this week' }],
    pillars: [{ name: 'Under the hood', why: 'Its own posts show the bays.' }],
    week: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, i) => ({
      day, platform: i % 2 ? 'facebook' : 'instagram', format: i === 0 ? 'reel' : i === 1 ? 'carousel' : 'post', pillar: 'Under the hood', topic: `Topic ${day}`,
      hook: 'Brakes squealing?', caption: i === 6 ? 'We serve 5,000 drivers a year.' : 'Pads and rotors from $189, done the same day, booked online. Bring the noise in and we will tell you what it is before any work starts.',
      cta: 'Book online.', visual: 'The brake bay at opening.', hashtags: ['FortLauderdale', 'brakerepair'],
    })),
  },
};

const outputs = () => ({ ...sampleOutputs(), site_pages: pages, competitors, model: sampleModelOutput(), adplan: sampleAdplanOutput() });
const ctx = (o: Record<string, unknown>) => ({ audit: sampleAudit, outputs: o, deadline: Date.now() + 200_000, attempt: 1 });

beforeEach(() => { openai.chatJson.mockReset(); });

describe('where the step runs', () => {
  it('runs after the ad copy, optional, with its label and gap line', () => {
    const names = STEPS.map((s) => s.name);
    expect(names.indexOf('plans')).toBe(names.indexOf('adcopy') + 1);
    expect(names.indexOf('site_pages')).toBe(names.indexOf('site') + 1);
    expect(STEPS.find((s) => s.name === 'plans')?.optional).toBe(true);
    expect(STEPS.find((s) => s.name === 'site_pages')?.optional).toBe(true);
    expect(STEP_LABELS.plans).toBe('Website plan and first week of posts');
    expect(STEP_LABELS.site_pages).toBe('Website pages');
    expect(gapsFor({ site: {} }, ['site', 'site_pages', 'plans'])).toEqual([
      'The website’s inner pages could not be read, so the website plan rests on the homepage alone.',
      'The website optimization plan and the first week of posts could not be written for this audit.',
    ]);
  });
});

describe('what the writer sees', () => {
  it('gets the pages read, the profile, the keyword demand, the observed questions and the business’s own posts, never a competitor’s caption as copy', () => {
    const facts = buildFacts(sampleAudit, outputs());
    const input = plansInput(facts, pages, competitors.profile as never, sampleModelOutput().writeup, ['Brake repair']);
    expect(input.business).toMatchObject({ category: 'Auto repair shop', services: ['brake repair', 'AC repair'] });
    expect(input.website.pages.map((p) => p.path)).toEqual(['/', '/services']);
    expect(input.website.pages_not_read).toEqual(['/about']);
    expect(input.website.pages[1].prices).toEqual(['$189']);
    expect(input.search.keywords[0]).toMatchObject({ keyword: 'auto repair fort lauderdale' });
    expect(input.ad_angles).toEqual(['Brake repair']);
    expect(pagesAllowed(facts, pages)).toEqual(expect.arrayContaining(['https://harbor-auto.example/', '/', 'https://harbor-auto.example/services', '/services']));
    expect(PLANS_SYSTEM).toContain('Never name a competitor');
    const prompt = factsForPrompt(facts) as { website_pages: { pages: unknown[]; competitors: { name: string }[] }; business_profile: { category: string }; competitor_picks: { left_out: { name: string }[] } };
    expect(prompt.website_pages.pages).toHaveLength(2);
    expect(prompt.website_pages.competitors[0].name).toBe('Bayside Garage');
    expect(prompt.business_profile.category).toBe('Auto repair shop');
    expect(prompt.competitor_picks.left_out[0].name).toBe('SERVPRO of Fort Lauderdale');
  });
});

describe('runPlans', () => {
  it('writes both plans from one call and holds them to the rules', async () => {
    openai.chatJson.mockResolvedValueOnce(answer);
    const out = await runPlans(ctx(outputs()));
    expect(isPlansOutput(out)).toBe(true);
    expect(openai.chatJson).toHaveBeenCalledTimes(1);
    expect(out.website_plan.changes.map((c) => c.page)).toEqual(['https://harbor-auto.example/services', 'https://harbor-auto.example/']);
    expect(out.website_plan.new_pages).toHaveLength(1);
    expect(out.social_plan.week.map((p) => p.day)).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
    expect(out.dropped).toEqual(expect.arrayContaining([expect.stringContaining('/pricing'), expect.stringContaining('Sunday: the caption had nothing left')]));
    expect(out.sources[0]).toMatch(/2 website pages read/);
    expect(out.model).toBe('test-model');
  });

  it('is a permanent skip without a write-up, and fails (to retry) when nothing passes the rules', async () => {
    const o = outputs();
    delete (o as Record<string, unknown>).model;
    await expect(runPlans(ctx(o))).rejects.toBeInstanceOf(PermanentStepError);
    openai.chatJson.mockResolvedValueOnce({ website_plan: { changes: [{ page: '/nowhere', change: 'x' }] }, social_plan: { week: [] } });
    await expect(runPlans(ctx(outputs()))).rejects.toThrow(/nothing the rules allow/);
  });
});

describe('the reports', () => {
  const plans = (): PlansOutput => ({ model: 'test-model', generated_at: '2026-10-21T12:00:00.000Z', sources: ['2 website pages read'], ...checkPlans(answer, { unsupported: () => [], claims: [], competitors: [], pages: pagesAllowed(buildFacts(sampleAudit, outputs()), pages) }) });

  it('the full audit gains the website plan and the first week after the 90-day plan, and the later sections move down', () => {
    const data = { ...sampleReportDataWithPlan(), plans: plans(), facts: buildFacts(sampleAudit, outputs()) };
    const html = buildAuditHtml(data);
    expect(html).toContain('8 · Plan');
    expect(html).toContain('9 · Website plan');
    expect(html).toContain('10 · Social plan');
    expect(html).toContain('11 · Return');
    expect(html).toContain('12 · Ad plan');
    expect(html).toContain('13 · Sources');
    expect(html).toContain('Website optimization plan');
    expect(html).toContain('Social media plan: the first week');
    expect(html).toContain('The first week of posts, continued');
    expect(html).toContain('Monday · Instagram reel · Topic Monday');
    expect(html).toContain('#fortlauderdale #brakerepair');
    expect(html).toContain('Pages read');
    expect(html).toContain('Why it competes');
    expect(html).toContain('Left out as not competing: SERVPRO of Fort Lauderdale');
    expect(html).toContain('Website pages read as main-content markdown');
    // Without the step the numbering is as before.
    const before = buildAuditHtml(sampleReportDataWithPlan());
    expect(before).toContain('9 · Return');
    expect(before).toContain('11 · Sources');
    expect(before).not.toContain('Website plan');
  });

  it('the slides gain a first-week slide before next steps, and the summary lists the week', () => {
    const data = { ...sampleReportDataWithPlan(), plans: plans() };
    const deck = buildDeckHtml(data, { audit: AUDIT });
    expect(deck).toContain(`id="${CONTENT_SLIDE_ID}"`);
    expect(deck.indexOf(`id="${CONTENT_SLIDE_ID}"`)).toBeLessThan(deck.indexOf('id="next"'));
    expect(deck).toMatch(/<h2>Next steps<\/h2>[\s\S]*?13 \/ 13<\/span>/);
    expect(buildDeckHtml(sampleReportDataWithPlan(), { audit: AUDIT })).not.toContain(CONTENT_SLIDE_ID);
    const summary = buildSummaryHtml(data, { deck: DECK, audit: AUDIT, folder: FOLDER });
    expect(summary).toContain('The first week of posts');
    expect(summary).toContain('Monday: Instagram reel, Topic Monday');
  });

  it('the workspace shows the pages read and the plans as panels', () => {
    const panels = panelsFor({ ...outputs(), plans: plans() });
    const pagesPanel = panels.find((p) => p.key === 'site_pages')!;
    expect(pagesPanel.table?.rows[1]).toEqual(['/services', 'Services | Harbor Auto Care', expect.any(String), '–', '$189']);
    expect(pagesPanel.table?.rows[2][1]).toMatch(/^Not read: /);
    expect(pagesPanel.note).toContain('Bayside Garage');
    const plansPanel = panels.find((p) => p.key === 'plans')!;
    expect(plansPanel.list?.[0]).toMatch(/^High · https:\/\/harbor-auto\.example\/services: Give brake repair/);
    expect(plansPanel.list).toEqual(expect.arrayContaining([expect.stringMatching(/^Monday · Instagram reel: Topic Monday$/)]));
    expect(panels.findIndex((p) => p.key === 'site_pages')).toBeLessThan(panels.findIndex((p) => p.key === 'model'));
  });
});
