import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ executeTool: vi.fn() }));
vi.mock('../../../api/_lib/groundswell/composio', async (original) => ({ ...(await original<object>()), executeTool: mocks.executeTool }));

import { buildPresencePlan, type PresenceInput } from '../../../packages/groundswell/src/presence';
import { aiPrompts, readAiModeAnswer, runAiAnswers } from '../../../api/_lib/groundswell/currents/aiAnswers';
import { isCategoryQuestion, mentions, OFF_LIMITS, recurringWords, redditItems, runCommunity } from '../../../api/_lib/groundswell/currents/community';
import { e164, matchYelp, runReviews, toReviews, toYelpListing } from '../../../api/_lib/groundswell/currents/reviews';
import { gapsFor } from '../../../api/_lib/groundswell/gaps';
import { buildFacts, factsForPrompt } from '../../../api/_lib/groundswell/model';
import { presenceInput, runPresence, salesTeamOnly } from '../../../api/_lib/groundswell/presence';
import { presenceSection } from '../../../api/_lib/groundswell/reports';
import { STEPS } from '../../../api/_lib/groundswell/steps';
import type { AuditRow, StepContext } from '../../../api/_lib/groundswell/types';
import { panelsFor } from '../../../api/_lib/groundswell/workspace';

/**
 * Yelp, Reddit and Google's AI Mode, read through Composio (the reviews,
 * community and ai_answers steps), and the plan for them (presence). The
 * answers below keep the shapes the three tools returned on 2026-10-27 for a
 * real brewery, with a made-up business, made-up reviewers and made-up
 * threads (real prospect research never goes in the repo).
 */

const audit: AuditRow = {
  id: 'a1',
  business_name: 'Harbor Light Brewing',
  city: 'Fort Lauderdale, FL',
  website: 'https://harborlight.example',
  instagram: 'harborlightbrewing',
  competitors: [
    { name: 'Gulf Stream Brewing', website: 'https://gulfstream.example', instagram: null },
    { name: 'Tarpon River Brewing', website: 'https://tarpon.example', instagram: null },
  ],
  notes: null,
};
const ctxFor = (outputs: Record<string, unknown>): StepContext => ({ audit, outputs, deadline: Date.now() + 120_000, attempt: 1, steps: STEPS.map((s) => s.name) });

// ---------------------------------------------------------------------------
// Yelp (the shapes of YELP_SEARCH_BY_PHONE, _GET_BUSINESS_DETAILS, _GET_BUSINESS_REVIEWS, _SEARCH_BUSINESSES)

const yelpBusiness = {
  alias: 'harbor-light-brewing-fort-lauderdale',
  categories: [{ alias: 'breweries', title: 'Breweries' }],
  display_phone: '(954) 555-0142',
  hours: [{ hours_type: 'REGULAR', is_open_now: true, open: [{ day: 0, end: '2200', is_overnight: false, start: '1200' }, { day: 5, end: '2300', is_overnight: false, start: '1200' }] }],
  id: 'hlb-yelp-id',
  image_url: 'https://s3-media0.fl.yelpcdn.com/bphoto/x/o.jpg',
  is_claimed: false,
  is_closed: false,
  location: { address1: '100 Harbor Way', city: 'Fort Lauderdale', display_address: ['100 Harbor Way', 'Fort Lauderdale, FL 33311'], state: 'FL', zip_code: '33311' },
  name: 'Harbor Light Brewing',
  phone: '+19545550142',
  photos: ['https://s3-media0.fl.yelpcdn.com/bphoto/a/o.jpg', 'https://s3-media0.fl.yelpcdn.com/bphoto/b/o.jpg', 'https://s3-media0.fl.yelpcdn.com/bphoto/c/o.jpg'],
  price: '$$',
  rating: 4.7,
  review_count: 89,
  url: 'https://www.yelp.com/biz/harbor-light-brewing-fort-lauderdale?adjust_creative=abc&utm_campaign=yelp_api_v3&utm_medium=api_v3_business_lookup&utm_source=abc',
};
const yelpReviews = {
  possible_languages: ['en'],
  total: 89,
  reviews: [
    { id: 'r1', rating: 5, text: 'Finally a seltzer I like! We came for the wood-fired pizza and stayed for the...', time_created: '2026-09-16 08:05:59', url: 'https://www.yelp.com/biz/harbor-light-brewing-fort-lauderdale?hrid=r1&utm_campaign=yelp_api_v3', user: { id: 'u1', name: 'A. Reviewer', profile_url: 'https://www.yelp.com/user_details?userid=u1' } },
    { id: 'r2', rating: 4, text: 'Good beer, friendly staff.', time_created: '2026-09-06 21:28:36', url: 'https://www.yelp.com/x?hrid=r2', user: { id: 'u2', name: 'B. Reviewer', profile_url: 'https://www.yelp.com/u2' } },
  ],
};
const yelpSearch = (name: string, rating: number, reviews: number) => ({
  businesses: [{ ...yelpBusiness, id: `${name}-id`, alias: name.toLowerCase().replace(/ /g, '-'), name, rating, review_count: reviews, is_claimed: true }],
  total: 1,
});

describe('Yelp listings', () => {
  it('reads a listing without Yelp’s tracking query, counts the photos without keeping them, and lists the hours', () => {
    const l = toYelpListing(yelpBusiness)!;
    expect(l).toMatchObject({ id: 'hlb-yelp-id', name: 'Harbor Light Brewing', rating: 4.7, reviews: 89, price: '$$', categories: ['Breweries'], city: 'Fort Lauderdale', claimed: false, closed: false, photo_count: 3 });
    expect(l.url).toBe('https://www.yelp.com/biz/harbor-light-brewing-fort-lauderdale');
    expect(l.hours).toEqual(['Mon 12:00–22:00', 'Sat 12:00–23:00']);
    expect(JSON.stringify(l)).not.toContain('bphoto');
    expect(toYelpListing({ name: 'No id' })).toBeNull();
  });

  it('matches a competitor by its name in the city, and keeps review excerpts without the reviewers', () => {
    const results = [{ ...yelpBusiness, id: 'x', name: 'Gulf Stream Brewing', location: { city: 'Miami' } }, { ...yelpBusiness, id: 'y', name: 'Gulf Stream Brewing', location: { city: 'Fort Lauderdale' } }, { ...yelpBusiness, id: 'z', name: 'Something Else' }];
    expect(matchYelp(results, 'Gulf Stream Brewing Co.', 'Fort Lauderdale, FL')?.id).toBe('y');
    expect(matchYelp(results, 'Nobody', null)).toBeNull();
    const reviews = toReviews(yelpReviews);
    expect(reviews).toHaveLength(2);
    expect(reviews[0]).toEqual({ rating: 5, text: 'Finally a seltzer I like! We came for the wood-fired pizza and stayed for the...', posted_at: '2026-09-16 08:05:59', url: 'https://www.yelp.com/biz/harbor-light-brewing-fort-lauderdale?hrid=r1' });
    expect(JSON.stringify(reviews)).not.toContain('Reviewer');
  });

  it('writes a US phone the way Yelp’s phone search wants it', () => {
    expect(e164('(954) 555-0142')).toBe('+19545550142');
    expect(e164('+1 954.555.0142')).toBe('+19545550142');
    expect(e164('555-0142')).toBeNull();
    expect(e164(null)).toBeNull();
  });
});

describe('the reviews step', () => {
  beforeEach(() => {
    mocks.executeTool.mockReset();
  });

  it('finds the business by its Google listing’s phone, reads details and the newest reviews, and each competitor by name', async () => {
    mocks.executeTool.mockImplementation(async (slug: string, args: Record<string, unknown>) => {
      if (slug === 'YELP_SEARCH_BY_PHONE') return { data: { businesses: [yelpBusiness], total: 1 } };
      if (slug === 'YELP_GET_BUSINESS_DETAILS') return { data: yelpBusiness };
      if (slug === 'YELP_GET_BUSINESS_REVIEWS') return { data: yelpReviews };
      if (slug === 'YELP_GET_REVIEW_HIGHLIGHTS') throw new Error('YELP_GET_REVIEW_HIGHLIGHTS failed (403): NOT_AUTHORIZED');
      if (slug === 'YELP_SEARCH_BUSINESSES') return args.term === 'Gulf Stream Brewing' ? { data: yelpSearch('Gulf Stream Brewing', 4.6, 208) } : { data: yelpSearch('Tarpon River Brewing', 4.2, 589) };
      throw new Error(slug);
    });
    const out = await runReviews(ctxFor({ maps: { business: { phone: '(954) 555-0142' } } }));
    expect(mocks.executeTool).toHaveBeenCalledWith('YELP_SEARCH_BY_PHONE', { phone: '+19545550142' }, expect.any(Number));
    expect(mocks.executeTool).toHaveBeenCalledWith('YELP_GET_BUSINESS_REVIEWS', { business_id: 'hlb-yelp-id', sort_by: 'newest' }, expect.any(Number));
    expect(out.matched_by).toBe('phone');
    expect(out.business).toMatchObject({ rating: 4.7, reviews: 89, claimed: false });
    expect(out.reviews).toHaveLength(2);
    // Yelp's premium endpoint refusing is not a failure.
    expect(out.highlights).toBeNull();
    expect(out.competitors.map((c) => [c.name, c.listing?.rating, c.listing?.reviews])).toEqual([
      ['Gulf Stream Brewing', 4.6, 208],
      ['Tarpon River Brewing', 4.2, 589],
    ]);
  });

  it('falls back to the name in the city, and fails only when Yelp found nobody at all', async () => {
    mocks.executeTool.mockImplementation(async (slug: string) => (slug === 'YELP_SEARCH_BUSINESSES' ? { data: { businesses: [], total: 0 } } : { data: {} }));
    await expect(runReviews(ctxFor({}))).rejects.toThrow(/no listing/i);
    expect(mocks.executeTool).not.toHaveBeenCalledWith('YELP_SEARCH_BY_PHONE', expect.anything(), expect.anything());
  });
});

// ---------------------------------------------------------------------------
// Reddit (SCRAPECREATORS_SEARCH_REDDIT, trimmed answers)

const post = (over: Record<string, unknown>) => ({ author: 'someone', created_utc: 1789095541, id: 'p', num_comments: 3, permalink: '/r/fortlauderdale/comments/p/x/', score: 12, selftext: '', subreddit: 'fortlauderdale', title: 'A post', url: 'https://www.reddit.com/r/fortlauderdale/comments/p/x/', ...over });
const redditPosts = {
  credits_charged: 1,
  has_more: false,
  items: [
    post({ id: 'a', title: 'Happening in Fort Lauderdale this weekend', selftext: 'Saturday: anniversary bash at Harbor Light Brewing, DJs and beer releases', score: 43, num_comments: 5, permalink: '/r/fortlauderdale/comments/a/weekend/' }),
    post({ id: 'b', subreddit: 'FloridaBeer', title: 'Weekly beer drops', selftext: 'New DIPA from Harbor Light Brewing, plus a pilsner', score: 4, permalink: '/r/FloridaBeer/comments/b/drops/' }),
    post({ id: 'c', title: 'Businesses to avoid in Fort Lauderdale', selftext: 'politics thread naming Harbor Light Brewing', score: 300, permalink: '/r/fortlauderdale/comments/c/avoid/' }),
    post({ id: 'd', title: 'Unrelated post', selftext: 'nothing here', permalink: '/r/fortlauderdale/comments/d/x/' }),
  ],
};
const categoryPosts = {
  items: [
    post({ id: 'q1', title: 'Best brewery with food in Fort Lauderdale?', selftext: 'Visiting next week', score: 22, permalink: '/r/fortlauderdale/comments/q1/x/' }),
    post({ id: 'q2', subreddit: 'Broward', title: 'Any dog friendly breweries?', score: 9, permalink: '/r/Broward/comments/q2/x/' }),
    post({ id: 'q3', title: 'Brewery closing downtown', score: 66, permalink: '/r/fortlauderdale/comments/q3/x/' }),
    post({ id: 'q4', title: 'Which brewery should we boycott?', score: 99, permalink: '/r/fortlauderdale/comments/q4/x/' }),
  ],
};

describe('Reddit', () => {
  it('reads posts in ScrapeCreators’ shape, keeps mentions of the business, and asks for category questions', () => {
    const items = redditItems(redditPosts, 'post');
    expect(items[0]).toMatchObject({ kind: 'post', subreddit: 'fortlauderdale', score: 43, comments: 5, url: 'https://www.reddit.com/r/fortlauderdale/comments/a/weekend/' });
    expect(items[0].posted_at).toBe(new Date(1789095541 * 1000).toISOString());
    expect(items.filter((i) => mentions(i, 'Harbor Light Brewing')).map((i) => i.url)).toHaveLength(3);
    const questions = redditItems(categoryPosts, 'post').filter((i) => isCategoryQuestion(i, 'brewery'));
    expect(questions.map((q) => q.title)).toEqual(['Best brewery with food in Fort Lauderdale?', 'Any dog friendly breweries?', 'Which brewery should we boycott?']);
    expect(OFF_LIMITS.test('Which brewery should we boycott?')).toBe(true);
    expect(OFF_LIMITS.test('Businesses to avoid in Fort Lauderdale')).toBe(true);
  });

  it('finds the words that recur across mentions, the name aside', () => {
    const items = redditItems({ items: [post({ title: 'Harbor Light Brewing pizza night', selftext: 'great pizza' }), post({ title: 'pizza and pilsner at Harbor Light Brewing' })] }, 'post');
    expect(recurringWords(items, 'Harbor Light Brewing')).toEqual(['pizza']);
  });

  it('the community step: four reads, politics and boycott threads left out, communities and tags ranked', async () => {
    mocks.executeTool.mockReset();
    mocks.executeTool.mockImplementation(async (_slug: string, args: Record<string, unknown>) => {
      if (args.query === '"Harbor Light Brewing"') return args.result_type === 'comments' ? { data: { items: [] } } : { data: redditPosts };
      if (args.query === 'brewery Fort Lauderdale') return { data: categoryPosts };
      if (args.query === '"Gulf Stream Brewing"') return { data: { items: [post({ title: 'Gulf Stream Brewing trivia', selftext: '' }), post({ title: 'Gulf Stream Brewing again' })] } };
      throw new Error('ScrapeCreators failed (502)');
    });
    const out = await runCommunity(ctxFor({ maps: { business: { category: 'Brewery' } } }));
    expect(mocks.executeTool).toHaveBeenCalledTimes(5);
    expect(out.business.mentions.map((m) => m.subreddit)).toEqual(['fortlauderdale', 'FloridaBeer']);
    expect(out.business.communities).toEqual([{ name: 'FloridaBeer', count: 1 }, { name: 'fortlauderdale', count: 1 }]);
    expect(out.category.questions.map((q) => q.title)).toEqual(['Best brewery with food in Fort Lauderdale?', 'Any dog friendly breweries?']);
    expect(out.left_out).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify([out.business, out.category, out.tags])).not.toMatch(/avoid|boycott|politics/i);
    expect(out.competitors).toEqual([
      { name: 'Gulf Stream Brewing', mentions: 2, error: null },
      { name: 'Tarpon River Brewing', mentions: null, error: expect.stringMatching(/502/) },
    ]);
    expect(out.tags).toEqual(expect.arrayContaining(['r/FloridaBeer', 'r/fortlauderdale', 'r/Broward']));
  });
});

// ---------------------------------------------------------------------------
// Google AI Mode (SERPAPI_QUERY_GOOGLE_AI_MODE, as answered on 2026-10-27, names changed)

const aiMode = {
  reconstructed_markdown: 'Gulf Stream Brewing & Pizzeria is the top-rated choice for craft beer and pizza in Fort Lauderdale.\n\n| Name | Location | Highlights |\n...',
  references: [
    { index: 0, link: 'https://www.google.com/searchviewer/10?svid=a', snippet: '100 Harbor Way', source: 'Google', title: 'Harbor Light Brewing' },
    { index: 1, link: 'https://www.google.com/searchviewer/10?svid=b', snippet: 'Brewery', source: 'Google', title: 'Gulf Stream Brewing & Pizzeria' },
  ],
  search_metadata: { created_at: '2026-10-27 18:44:46 UTC', status: 'Success' },
  text_blocks: [
    { reference_indexes: [0], snippet: 'Gulf Stream Brewing & Pizzeria is the top-rated choice for craft beer and pizza in Fort Lauderdale.', type: 'paragraph' },
    { snippet: 'Top picks', type: 'heading' },
    {
      type: 'table',
      formatted: [
        { name: 'Gulf Stream Brewing & Pizzeria', location: '1105 NE 13th St', vibe_highlights: 'Scratch-made pizzas' },
        { name: 'Black Flamingo Brews', location: 'Oakland Park', vibe_highlights: 'Wood-fired pizzas' },
        { name: 'Harbor Light Brewing', location: '100 Harbor Way', vibe_highlights: 'Cozy nano-brewery, brick-oven pizzas' },
      ],
    },
    {
      type: 'list',
      list: [
        { list: [{ snippet: 'Address: 1105 NE 13th St, Fort Lauderdale' }], local_result: { title: 'Gulf Stream Brewing & Pizzeria', rating: 4.8, reviews: 489 } },
        { list: [{ snippet: 'Address: 100 Harbor Way Suite 1, Fort Lauderdale, FL 33311' }, { snippet: 'What to expect: A smaller, stylish nano-brewery with rotating taps and brick-oven pizzas.' }], local_result: { title: 'Harbor Light Brewing', rating: 4.8, reviews: 338 } },
      ],
    },
  ],
};

describe('Google AI Mode answers', () => {
  it('reads who is named, in what order, what it leads with, and what it says about the business', () => {
    const a = readAiModeAnswer(aiMode, 'Harbor Light Brewing', ['Gulf Stream Brewing', 'Tarpon River Brewing']);
    expect(a).toMatchObject({ named: true, position: 3, top: 'Gulf Stream Brewing & Pizzeria', rating: 4.8, reviews: 338, answered_at: '2026-10-27 18:44:46 UTC' });
    expect(a.businesses_named.slice(0, 3)).toEqual(['Gulf Stream Brewing & Pizzeria', 'Black Flamingo Brews', 'Harbor Light Brewing']);
    expect(a.competitors_named).toEqual(['Gulf Stream Brewing']);
    expect(a.description).toBe('What to expect: A smaller, stylish nano-brewery with rotating taps and brick-oven pizzas.');
    expect(a.references.map((r) => r.title)).toEqual(['Harbor Light Brewing', 'Gulf Stream Brewing & Pizzeria']);
    const absent = readAiModeAnswer(aiMode, 'Nobody Brewing', []);
    expect(absent).toMatchObject({ named: false, position: null, description: null });
  });

  it('asks three questions at most: the category in the city, the busiest search for the city, the business by name', () => {
    expect(aiPrompts('Harbor Light Brewing', 'Fort Lauderdale, FL', 'Brewery', 'brewery near me')).toEqual([
      { prompt: 'best brewery in Fort Lauderdale', purpose: 'category' },
      { prompt: 'brewery in Fort Lauderdale', purpose: 'search' },
      { prompt: 'Harbor Light Brewing Fort Lauderdale', purpose: 'brand' },
    ]);
    expect(aiPrompts('Harbor Light Brewing', null, 'Brewery', null)).toEqual([{ prompt: 'Harbor Light Brewing', purpose: 'brand' }]);
  });

  it('the step asks again without the location when SerpApi does not know it, and records a question it could not ask', async () => {
    mocks.executeTool.mockReset();
    let call = 0;
    mocks.executeTool.mockImplementation(async (_slug: string, args: Record<string, unknown>) => {
      call++;
      if (call === 1) throw new Error('SERPAPI_QUERY_GOOGLE_AI_MODE failed: Unsupported `location` parameter');
      if (String(args.query).startsWith('Harbor')) throw new Error('timed out');
      return { data: aiMode };
    });
    const out = await runAiAnswers(ctxFor({ maps: { business: { category: 'Brewery' } } }));
    expect(out.answers).toHaveLength(2);
    expect(out.summary).toEqual({ asked: 2, answered: 1, named: 1, led: 0 });
    expect(out.answers.find((x) => x.purpose === 'brand')?.error).toMatch(/timed out/);
  });
});

// ---------------------------------------------------------------------------
// The plan, the facts, the report, the panels

const presenceBase: PresenceInput = {
  business: 'Harbor Light Brewing',
  google: { rating: 4.8, reviews: 338 },
  yelp: { business: { rating: 4.7, reviews: 89, claimed: false, url: 'https://www.yelp.com/biz/hlb' }, error: null, competitors: [{ name: 'Gulf Stream Brewing', rating: 4.6, reviews: 208 }, { name: 'Tarpon River Brewing', rating: 4.2, reviews: 589 }], newest_review_at: '2026-09-16 08:05:59' },
  reddit: {
    mentions: [{ subreddit: 'fortlauderdale', title: 'Weekend', url: 'https://www.reddit.com/a' }],
    communities: [{ name: 'fortlauderdale', count: 1 }],
    questions: [{ subreddit: 'fortlauderdale', title: 'Best brewery with food?', url: 'https://www.reddit.com/q1' }],
    category_communities: [{ name: 'fortlauderdale', count: 1 }],
    competitors: [{ name: 'Gulf Stream Brewing', mentions: 4 }],
  },
  ai: {
    answers: [
      { prompt: 'best brewery in Fort Lauderdale', purpose: 'category', named: true, position: 3, top: 'Gulf Stream Brewing', businesses_named: ['Gulf Stream Brewing', 'Black Flamingo', 'Harbor Light Brewing'], description: null, references: [{ title: 'Gulf Stream', link: 'https://g.example' }], error: null },
      { prompt: 'brewery in Fort Lauderdale', purpose: 'search', named: false, position: null, top: 'Tarpon River Brewing', businesses_named: ['Tarpon River Brewing', 'LauderAle'], description: null, references: [{ title: 'A local guide', link: 'https://guide.example' }], error: null },
      { prompt: 'Harbor Light Brewing Fort Lauderdale', purpose: 'brand', named: true, position: 1, top: 'Harbor Light Brewing', businesses_named: ['Harbor Light Brewing'], description: 'A cozy nano-brewery.', references: [], error: null },
    ],
  },
  reddit_ads_sales_team: true,
  geo_improvements: ['Add LocalBusiness schema'],
  now: Date.parse('2026-10-27T00:00:00Z'),
};

describe('the presence plan', () => {
  it('turns each read into actions with their evidence, high priority first', () => {
    const plan = buildPresencePlan(presenceBase);
    const lines = plan.actions.map((a) => `${a.priority} ${a.area}: ${a.action}`);
    expect(plan.actions[0].priority).toBe('high');
    expect(lines.filter((l) => l.startsWith('high'))).toEqual([
      expect.stringMatching(/^high reviews: Claim the Yelp listing/),
      expect.stringMatching(/^high ai_answers: Be named when Google’s AI is asked “brewery in Fort Lauderdale”/),
    ]);
    const notNamed = plan.actions.find((a) => a.area === 'ai_answers' && a.priority === 'high')!;
    expect(notNamed.evidence).toEqual(['It named: Tarpon River Brewing, LauderAle.', 'Sources it cited: A local guide.', 'Developer brief: Add LocalBusiness schema']);
    expect(notNamed.links).toEqual(['https://guide.example']);
    expect(plan.actions.find((a) => a.area === 'ai_answers' && a.priority === 'medium')?.reason).toBe('Named, but not first: it led with Gulf Stream Brewing.');
    // Fewer Yelp reviews than the competitors' median (89 against 398.5).
    expect(lines).toContainEqual(expect.stringMatching(/^medium reviews: Ask happy customers for a Yelp review/));
    expect(lines).toContainEqual(expect.stringMatching(/^medium reddit: Take part in r\/fortlauderdale as the business/));
    expect(lines).toContainEqual(expect.stringMatching(/^low reddit: For Reddit ads, talk to Reddit’s sales team/));
    expect(lines).toContainEqual(expect.stringMatching(/^low ai_answers: Check what Google’s AI says/));
    expect(plan.measures).toHaveLength(3);
    expect(plan.summary).toMatch(/2 of them high priority/);
  });

  it('a missing listing comes first; a stale review flow is named; nothing to plan says so', () => {
    const missing = buildPresencePlan({ ...presenceBase, yelp: { ...presenceBase.yelp!, business: null, error: 'Yelp has no listing that matches.' }, reddit: null, ai: null });
    expect(missing.actions[0]).toMatchObject({ area: 'reviews', priority: 'high', action: expect.stringMatching(/^Create or claim/) });
    const stale = buildPresencePlan({ ...presenceBase, yelp: { ...presenceBase.yelp!, newest_review_at: '2026-05-01 10:00:00' }, reddit: null, ai: null });
    expect(stale.actions.map((a) => a.action)).toContainEqual(expect.stringMatching(/more than three months old/));
    expect(buildPresencePlan({ business: 'X', google: null, yelp: null, reddit: null, ai: null })).toEqual({ actions: [], measures: [], summary: 'Reviews, Reddit and AI answers were read and show nothing to act on this time.' });
  });

  it('knows which platforms close their self-serve ads to an industry', () => {
    // A brewery is the restaurant_bar profile, restricted as alcohol.
    expect(salesTeamOnly('restaurant_bar', 'reddit')).toBe(true);
    expect(salesTeamOnly('restaurant_bar', 'tiktok')).toBe(true);
    expect(salesTeamOnly('restaurant_bar', 'meta')).toBe(false);
    expect(salesTeamOnly('general', 'reddit')).toBe(false);
    expect(salesTeamOnly(undefined, 'reddit')).toBe(false);
  });
});

describe('the reads in the facts, the plan step, the audit and the workspace', () => {
  const reviews = { source: 'Yelp listings (Yelp Fusion, through Composio)', fetched_at: '2026-10-27T00:00:00Z', business: toYelpListing(yelpBusiness), matched_by: 'phone', business_error: null, reviews: toReviews(yelpReviews), highlights: null, competitors: [{ name: 'Gulf Stream Brewing', listing: toYelpListing(yelpSearch('Gulf Stream Brewing', 4.6, 208).businesses[0]), error: null }], note: 'Yelp note.' };
  const community = { source: 'Reddit search', fetched_at: '2026-10-27T00:00:00Z', queries: [], business: { mentions: redditItems(redditPosts, 'post').slice(0, 2), communities: [{ name: 'fortlauderdale', count: 1 }, { name: 'FloridaBeer', count: 1 }], topics: ['pizza'] }, category: { term: 'brewery', questions: redditItems(categoryPosts, 'post').slice(0, 1), communities: [{ name: 'fortlauderdale', count: 1 }] }, competitors: [{ name: 'Gulf Stream Brewing', mentions: 2, error: null }], tags: ['r/fortlauderdale', 'pizza'], left_out: 1, note: 'Reddit note.' };
  const ai = { source: 'Google AI Mode answers, via SerpApi through Composio', fetched_at: '2026-10-27T00:00:00Z', answers: [{ prompt: 'best brewery in Fort Lauderdale', purpose: 'category', provider: 'SerpApi', ...readAiModeAnswer(aiMode, 'Harbor Light Brewing', ['Gulf Stream Brewing']), error: null }], summary: { asked: 1, answered: 1, named: 1, led: 0 }, note: 'AI note.' };
  const outputs = { reviews, community, ai_answers: ai, maps: { business: { rating: 4.8, reviews: 338, phone: null } } };

  it('the write-up sees the figures and short excerpts, never a reviewer or a Reddit user', () => {
    const p = factsForPrompt(buildFacts(audit, outputs));
    expect(p.yelp).toMatchObject({ business: { rating: 4.7, reviews: 89, claimed: false }, competitors: [{ name: 'Gulf Stream Brewing', rating: 4.6, reviews: 208 }] });
    expect(p.reddit).toMatchObject({ mentions_found: 2, recurring_words: ['pizza'], category_questions: [{ community: 'fortlauderdale', question: 'Best brewery with food in Fort Lauderdale?' }] });
    expect(p.ai_answers).toEqual([expect.objectContaining({ question: 'best brewery in Fort Lauderdale', named: true, position: 3, led_with: 'Gulf Stream Brewing & Pizzeria' })]);
    expect(JSON.stringify(p)).not.toMatch(/Reviewer|someone/);
  });

  it('the presence step builds its plan from the three reads, and is skipped without any of them', async () => {
    const plan = await runPresence(ctxFor(outputs));
    expect(plan.based_on).toEqual(['reviews', 'community', 'ai_answers']);
    expect(plan.actions.some((a) => a.area === 'reviews')).toBe(true);
    expect(presenceInput(ctxFor(outputs)).yelp?.newest_review_at).toBe('2026-09-16 08:05:59');
    await expect(runPresence(ctxFor({}))).rejects.toThrow(/no presence plan/);
  });

  it('the audit gains the reviews, Reddit and AI answers section, with the plan', async () => {
    const f = buildFacts(audit, outputs);
    const plan = await runPresence(ctxFor(outputs));
    const html = presenceSection(f, plan);
    expect(html).toContain('<h3>Reviews</h3>');
    expect(html).toContain('4.7★ · 89');
    expect(html).toContain('r/fortlauderdale');
    expect(html).toContain('What Google’s AI answers');
    expect(html).toContain('<h3>What to do</h3>');
    expect(presenceSection(buildFacts(audit, {}), null)).toBe('');
  });

  it('the workspace shows a panel for each read and the plan; a gap line names each one not read', async () => {
    const plan = await runPresence(ctxFor(outputs));
    const keys = panelsFor({ ...outputs, presence: plan }).map((p) => p.key);
    expect(keys).toEqual(expect.arrayContaining(['reviews', 'community', 'ai_answers', 'presence']));
    expect(gapsFor({}, ['reviews', 'community', 'ai_answers'])).toEqual([
      'Yelp could not be read for this audit, so reviews rest on the Google listing.',
      'Reddit could not be read for this audit, so the community plan and the Reddit ad set are not included.',
      'Google’s AI Mode answers could not be read for this audit.',
    ]);
  });
});
