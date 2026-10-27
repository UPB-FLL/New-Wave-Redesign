import { describe, expect, it } from 'vitest';
import {
  AI_CRAWLERS,
  buildGeoBrief,
  CITABILITY_RUBRIC,
  improvementsFrom,
  ownerQuestions,
  parseRobots,
  robotsAccess,
  scorePage,
  unsupportedClaims,
  type AiSearchEvidence,
  type PageSignals,
} from '../src/aiSearch';

/**
 * The AI search rules: how robots.txt reads to each crawler, the citability
 * rubric, the improvements the evidence supports, and the developer brief
 * built from them. Nothing here fetches; the app's step hands the evidence in.
 */

const ROBOTS = `# comment
User-agent: *
Disallow: /admin/
Disallow: /cart

User-agent: GPTBot
User-agent: CCBot
Disallow: /

User-agent: PerplexityBot
Disallow: /private/
Allow: /private/menu$

Sitemap: https://brew.example/sitemap.xml
`;

describe('robots.txt', () => {
  it('parses groups the way a crawler does: a run of user-agent lines shares the rules that follow', () => {
    expect(parseRobots(ROBOTS)).toEqual([
      { agents: ['*'], allows: [], disallows: ['/admin/', '/cart'] },
      { agents: ['gptbot', 'ccbot'], allows: [], disallows: ['/'] },
      { agents: ['perplexitybot'], allows: ['/private/menu$'], disallows: ['/private/'] },
    ]);
  });

  it('gives each crawler the verdict of its own group, else the default group', () => {
    expect(robotsAccess(ROBOTS, 'GPTBot')).toEqual({ agent: 'GPTBot', group: 'gptbot', verdict: 'blocked', disallows: ['/'] });
    expect(robotsAccess(ROBOTS, 'CCBot').verdict).toBe('blocked');
    // Allowed on the homepage, but the group keeps some paths out.
    expect(robotsAccess(ROBOTS, 'ClaudeBot')).toEqual({ agent: 'ClaudeBot', group: '*', verdict: 'restricted', disallows: ['/admin/', '/cart'] });
    expect(robotsAccess(ROBOTS, 'PerplexityBot').verdict).toBe('restricted');
    // Longest match wins: the private menu is allowed, the rest of /private/ is not.
    expect(robotsAccess(ROBOTS, 'PerplexityBot', '/private/menu').verdict).toBe('restricted');
    expect(robotsAccess(ROBOTS, 'PerplexityBot', '/private/menu-2').verdict).toBe('blocked');
    expect(robotsAccess(ROBOTS, 'PerplexityBot', '/private/').verdict).toBe('blocked');
  });

  it('reads no robots.txt as everyone allowed, and an empty Disallow as allowed', () => {
    expect(robotsAccess(null, 'GPTBot')).toEqual({ agent: 'GPTBot', group: null, verdict: 'no_robots', disallows: [] });
    expect(robotsAccess('User-agent: *\nDisallow:\n', 'GPTBot')).toEqual({ agent: 'GPTBot', group: '*', verdict: 'allowed', disallows: [] });
    expect(robotsAccess('Sitemap: /s.xml\n', 'Googlebot').verdict).toBe('allowed');
  });

  it('lists the crawlers the brief checks, Googlebot and Bingbot among them', () => {
    const agents = AI_CRAWLERS.map((c) => c.agent);
    for (const a of ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'CCBot', 'Googlebot', 'Bingbot']) expect(agents).toContain(a);
  });
});

const fullPage: PageSignals = {
  url: 'https://brew.example/visit',
  path: '/visit',
  title: 'Visit the taproom',
  description: 'Hours, parking and what is on tap.',
  h1: 'Visit the taproom',
  headings: ['When is the taproom open?', 'Where do I park?', 'FAQ'],
  word_count: 420,
  excerpt: 'The taproom at Brew Example is open Wednesday to Sunday from 4 pm, with 16 taps and free parking behind the building. Dogs are welcome on the patio.',
  facts: ['$7 pints'],
  ctas: 2,
  json_ld: true,
  readable_without_js: true,
  canonical: true,
};

describe('citability', () => {
  it('scores a page that answers first, in the words people ask, with facts, at 100', () => {
    const s = scorePage(fullPage);
    expect(s.score).toBe(100);
    expect(s.available).toBe(100);
    expect(s.unknown).toEqual([]);
    expect(s.checks.map((c) => c.key)).toEqual(CITABILITY_RUBRIC.map((r) => r.key));
    expect(CITABILITY_RUBRIC.reduce((a, r) => a + r.points, 0)).toBe(100);
  });

  it('leaves checks the evidence cannot answer out of the denominator and names them', () => {
    const s = scorePage({ ...fullPage, json_ld: null, readable_without_js: null, canonical: null });
    expect(s.available).toBe(75);
    expect(s.score).toBe(100);
    expect(s.unknown).toEqual(['Structured data (JSON-LD)', 'Readable without JavaScript', 'A canonical URL']);
  });

  it('marks an app shell, a thin page and a page without questions down, with the evidence in the note', () => {
    const s = scorePage({ ...fullPage, headings: ['Our story'], word_count: 40, excerpt: 'Welcome.', facts: [], ctas: 0, readable_without_js: false });
    const by = Object.fromEntries(s.checks.map((c) => [c.key, c]));
    expect(by.no_js.earned).toBe(0);
    expect(by.no_js.note).toMatch(/app shell/);
    expect(by.depth.earned).toBe(0);
    expect(by.depth.note).toBe('40 words of main content.');
    expect(by.questions.earned).toBe(0);
    expect(by.faq.earned).toBe(0);
    expect(by.answer_first.earned).toBe(0);
    expect(by.facts.earned).toBe(0);
    expect(by.cta.earned).toBe(0);
    expect(s.score).toBeLessThan(40);
  });

  it('finds the claims a fact sheet would have to back', () => {
    expect(unsupportedClaims('/about', 'Voted Best brewery in town and award-winning IPAs; rated #1 by nobody in particular.')).toEqual([
      { path: '/about', phrase: 'Voted Best' },
      { path: '/about', phrase: 'award-winning' },
      { path: '/about', phrase: '#1' },
    ]);
    expect(unsupportedClaims('/', null)).toEqual([]);
  });
});

const evidence = (over: Partial<AiSearchEvidence> = {}): AiSearchEvidence => ({
  website: 'https://brew.example/',
  crawlers: { robots_found: true, agents: AI_CRAWLERS.map((c) => robotsAccess(ROBOTS, c.agent)), gptbot_fetch: { status: 200, blocked: false, note: 'The same page as the ordinary scan.' } },
  files: { llms_txt: { url: 'https://brew.example/llms.txt', found: false, bytes: 0 }, llms_full_txt: { url: 'https://brew.example/llms-full.txt', found: false, bytes: 0 }, sitemap: { url: 'https://brew.example/sitemap.xml', found: true, urls: 12 } },
  entity: { types: ['Brewery', 'WebSite'], has_organization: false, has_local_business: true, has_id: false, same_as: [], has_address: true, telephone: '+15615550100', has_opening_hours: false, has_faq: false },
  nap: { site_phones: ['5615550100'], listing_phone: '5615550199', listing_name: 'Brew Example', site_name: 'Brew Example', consistent: false },
  headers: { present: ['strict-transport-security'], missing: ['content-security-policy', 'x-content-type-options', 'referrer-policy', 'permissions-policy'] },
  pages: [scorePage(fullPage), scorePage({ ...fullPage, path: '/about', url: 'https://brew.example/about', headings: ['Our story'], word_count: 90, excerpt: 'Welcome.', facts: [], json_ld: null, readable_without_js: null, canonical: null })],
  claims: [{ path: '/about', phrase: 'award-winning' }],
  visibility: {
    source: 'Ahrefs Brand Radar (US), via Composio',
    assistants: ['ChatGPT', 'Perplexity'],
    business: { name: 'Brew Example', mentions: 0, share_of_voice: 0 },
    competitors: [{ name: 'Rival Brewing', mentions: 14, share_of_voice: 62.5 }],
    prompts: [{ question: 'best brewery in fort lauderdale', assistant: 'ChatGPT', volume: 320, names_business: false, cited: ['yelp.com', 'rivalbrewing.example'] }],
    cited_domains: [{ domain: 'yelp.com', responses: 9, pages: 4 }, { domain: 'rivalbrewing.example', responses: 3, pages: 2 }],
    citations: [{ platform: 'all_platforms', citations: 0, pages: 0 }],
    error: null,
  },
  ...over,
});

describe('improvements and questions', () => {
  it('names every change the evidence supports, highest priority first, with the evidence and the action', () => {
    const out = improvementsFrom(evidence());
    const titles = out.map((i) => i.title);
    expect(titles[0]).toBe('robots.txt blocks GPTBot, CCBot');
    expect(out[0].evidence).toMatch(/gptbot.*disallows \//);
    expect(titles).toContain('The site and the Google listing disagree on the phone number');
    expect(titles).toContain('No llms.txt');
    expect(titles).toContain('The entity has no stable @id');
    expect(titles).toContain('No openingHoursSpecification');
    expect(titles).toContain('No sameAs profile links');
    expect(titles).toContain('1 page too thin to quote');
    expect(titles).toContain('Claims the fact sheet must back or the copy must drop');
    expect(titles).toContain('The assistants do not name or cite the business today');
    expect(titles).toContain('Be present on the sources the assistants cite');
    expect(out.find((i) => i.area === 'visibility' && /present/.test(i.title))?.evidence).toMatch(/yelp\.com \(9 answers\)/);
    expect(titles.some((t) => /Security headers missing/.test(t))).toBe(true);
    const order = out.map((i) => i.priority);
    expect(order).toEqual([...order].sort((a, b) => ({ high: 0, medium: 1, low: 2 })[a] - ({ high: 0, medium: 1, low: 2 })[b]));
    // Never a CSP switched on, never a rating invented.
    expect(JSON.stringify(out)).not.toMatch(/enforce the CSP|turn on enforcement/i);
    expect(JSON.stringify(out)).toMatch(/report-only/);
  });

  it('has nothing to say about what was not read', () => {
    const quiet = evidence({ crawlers: { robots_found: false, agents: AI_CRAWLERS.map((c) => robotsAccess(null, c.agent)), gptbot_fetch: null }, files: null, entity: null, nap: { site_phones: [], listing_phone: null, listing_name: null, site_name: null, consistent: null }, headers: null, pages: [], claims: [], visibility: null });
    expect(improvementsFrom(quiet)).toEqual([]);
  });

  it('asks the owner about every unsourced claim, the phone, each profile, hours, reviews and off-limits areas', () => {
    const q = ownerQuestions(evidence(), ['https://www.instagram.com/brewexample/']);
    expect(q[0]).toMatch(/\/about the copy says “award-winning”/);
    expect(q[1]).toMatch(/5615550100 and the Google listing shows 5615550199/);
    expect(q.find((x) => /instagram\.com\/brewexample/.test(x))).toMatch(/Only profiles you own/);
    expect(q.some((x) => /hours come from/.test(x))).toBe(true);
    expect(q.some((x) => /no AggregateRating/.test(x))).toBe(true);
    expect(q.some((x) => /off limits/.test(x))).toBe(true);
  });
});

describe('the developer brief', () => {
  const brief = () => {
    const e = evidence();
    return buildGeoBrief({
      business: { name: 'Brew Example', city: 'Fort Lauderdale, FL', website: 'https://brew.example/' },
      date: 'October 26, 2026',
      evidence: e,
      improvements: improvementsFrom(e),
      questions: ownerQuestions(e, ['https://www.instagram.com/brewexample/']),
      profiles: ['https://www.instagram.com/brewexample/'],
      listing: { name: 'Brew Example', address: '1 Dock St, Fort Lauderdale, FL', phone: '(561) 555-0199', hours: 'Wednesday 4–10 PM', rating: 4.7, reviews: 210, url: 'https://maps.google.com/?cid=1' },
      profile: { category: 'Brewery', services: ['taproom', 'events'] },
      preparer: 'New Wave: Social Engineering',
    });
  };

  it('carries the baseline, the rubric, the improvements, the questions and the phases, with the owner’s inputs left as placeholders', () => {
    const md = brief();
    expect(md).toMatch(/^# GEO audit and factual site improvements: Brew Example \(https:\/\/brew\.example\/\)/);
    expect(md).toMatch(/\| GPTBot \| OpenAI \| blocked \| gptbot \| \/ \|/);
    expect(md).toMatch(/\| ClaudeBot \| Anthropic \| restricted \| \* \| \/admin\/, \/cart \|/);
    expect(md).toMatch(/\| \/llms\.txt \| no \| absent \|/);
    expect(md).toMatch(/\| \/sitemap\.xml \| yes \| 12 URLs listed \|/);
    expect(md).toMatch(/\| Stable @id on the entity \| no \|/);
    expect(md).toMatch(/Phone consistent across the two: no\./);
    expect(md).toMatch(/\| \/visit \| 100 \| 100 \| none \| – \|/);
    expect(md).toMatch(/\| \/about \| \d+ \| 75 \|/);
    expect(md).toMatch(/\| Rival Brewing \| 14 \| 62\.5% \|/);
    expect(md).toMatch(/\| yelp\.com \| 9 \| 4 \|/);
    expect(md).toMatch(/## Improvements this audit supports/);
    expect(md).toMatch(/\| high \| crawlers \| robots\.txt blocks GPTBot, CCBot \|/);
    expect(md).toMatch(/## Questions for the owner[\s\S]*1\. On \/about the copy says “award-winning”/);
    expect(md).toMatch(/\{\{OWNER\/REPO\}\}/);
    expect(md).toMatch(/Off-limits areas: \{\{/);
    for (const phase of ['Phase 0: recon', 'Phase 1: fact sheet', 'Phase 2: code fixes', 'Phase 3: copy', 'Phase 4: database content changes', 'Phase 5: weekly follow-up']) expect(md).toContain(phase);
    expect(md).toMatch(/lowest: \/about at \d+, \/visit at 100/);
    expect(md).toMatch(/Never: merge, turn on CSP enforcement/);
    // The listing's rating is reported as a reading, never as something to put on the site.
    expect(md).toMatch(/rating 4\.7 on 210 reviews\. Ratings are shown here as a reading, never to be hard-coded/);
    expect(md).not.toMatch(/\n{3,}/);
    expect(md.endsWith('\n')).toBe(true);
  });

  it('says what was not read instead of inventing it', () => {
    const e = evidence({ visibility: null, files: null, entity: null, headers: null });
    const md = buildGeoBrief({ business: { name: 'Brew Example', city: null, website: null }, date: 'October 26, 2026', evidence: e, improvements: [], questions: [], profiles: [], listing: null, profile: null, preparer: 'Acme Agency' });
    expect(md).toMatch(/\{\{SITE_URL\}\}/);
    expect(md).toMatch(/Not read this time: Brand Radar was not available/);
    expect(md).toMatch(/The site’s files were not read/);
    expect(md).toMatch(/Security headers\n\nNot read\./);
    expect(md).toMatch(/Nothing the evidence calls for/);
    expect(md).toMatch(/Prepared by Acme Agency/);
    expect(md).not.toMatch(/New Wave/);
  });
});
