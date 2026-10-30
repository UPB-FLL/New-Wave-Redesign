import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const openai = vi.hoisted(() => ({ chatJson: vi.fn() }));
vi.mock('../../../api/_lib/groundswell/openai', () => ({ chatJson: openai.chatJson, GROUNDSWELL_MODEL: () => 'test-model' }));

import { buildBusinessProfile, checkProfile, contentWords, fallbackProfile, filterCompetitors, instagramBio, isDirectoryHost, isListPage, profileText, profileWords, sharesCategory, stem } from '../../../api/_lib/groundswell/businessProfile';
import { categoryFromSite, isLinkPageUrl } from '../../../api/_lib/groundswell/currents/serp';
import { parseScrapedPage } from '../../../api/_lib/groundswell/currents/sitePages';

/**
 * The business profile (what it does, from its own site) and the relevance
 * check (does a candidate compete?). The case is the Wildly Primal run of
 * 2026-10-23, whose Maps table listed SERVPRO and a plumber beside a health coach.
 */

const scan = { title: 'Wildly Primal | Functional Health Coach & Lab Testing', meta_description: 'Wildly Primal is a functional health coach practice in Jacksonville Beach, Florida, with personalized lab testing for clients across the US.', h1: ['Wildly Primal : Functional health coaching'] };
const page = parseScrapedPage('https://wildlyprimal.com/work-with-us', { data: { markdown: '# Work with us\n\nOur functional health program, gut health testing, hormone and thyroid coaching, and one-on-one nutrition support.\n', metadata: { statusCode: 200, title: 'Work with us' } } });
const business = { name: 'Wildly Primal', city: 'Jacksonville FL' };
const candidate = (name: string, category: string | null, website = `https://${name.toLowerCase().replace(/[^a-z]/g, '')}.example`) => ({ name, website, category, title: null, snippet: null, address: null });

beforeEach(() => { openai.chatJson.mockReset(); vi.unstubAllEnvs(); });
afterEach(() => vi.unstubAllEnvs());

describe('words', () => {
  it('stems and keeps content words only', () => {
    expect(['coaching', 'coaches', 'coach', 'studios', 'companies', 'brewery'].map(stem)).toEqual(['coach', 'coach', 'coach', 'studio', 'company', 'brewery']);
    expect([...contentWords('Health coach near Jacksonville FL, the best services', ['Jacksonville FL'])]).toEqual(['health', 'coach']);
  });

  it('a general contractor does not share a health coach’s category wording; a wellness coach does', () => {
    const words = profileWords({ category: 'Functional health coach', services: ['gut health testing', 'nutrition support'], offer: null }, [business.name, business.city]);
    expect(sharesCategory(words, 'SERVPRO of Arlington / Jacksonville East General Contractor').ok).toBe(false);
    expect(sharesCategory(words, 'AND Services Plumber').ok).toBe(false);
    expect(sharesCategory(words, 'Wellspring Health and Sports Performance Health coach').ok).toBe(true);
    expect(sharesCategory(words, 'CT Wellness Co. nutrition and gut health support')).toMatchObject({ ok: true });
    expect(isDirectoryHost('www.yelp.com')).toBe(true);
    expect(isDirectoryHost('wsphealth.com')).toBe(false);
  });
});

describe('the profile', () => {
  it('holds the model’s category and services to the site’s words, and keeps the wording rule when the model wanders', () => {
    const text = [scan.title, scan.meta_description, ...scan.h1, page.excerpt].join('\n');
    const good = checkProfile({ category: 'Functional health coach', offer: 'Functional health coaching with lab testing.', services: ['gut health testing', 'thyroid coaching', 'colonics'], audience: 'adults', service_area: 'online', competitor_queries: ['Functional Health Coach Jacksonville Beach'], content_topics: ['gut health'] }, text, 'Health coach', ['https://wildlyprimal.com']);
    expect(good).toMatchObject({ category: 'Functional health coach', services: ['gut health testing', 'thyroid coaching'], service_area: 'online', competitor_queries: ['functional health coach jacksonville beach'], source: 'model' });
    const wandered = checkProfile({ category: 'Plumbing contractor', offer: 'We serve 500 clients.', service_area: 'galaxy' }, text, 'Health coach', []);
    expect(wandered).toMatchObject({ category: 'Health coach', offer: null, service_area: null, source: 'website' });
    expect(checkProfile({ category: 'Services' }, text, null, []).source).toBe('none');
  });

  it('without OpenAI the first-party wording rule stands, then a listing label', async () => {
    expect(fallbackProfile(scan, [], 'Services', [])).toMatchObject({ category: 'Health coach', source: 'website' });
    expect(fallbackProfile({ title: 'Acme', meta_description: null, h1: [] }, [], 'Brewery', [])).toMatchObject({ category: 'Brewery', source: 'listing' });
    const profile = await buildBusinessProfile({ ...business, scan, pages: [page] });
    expect(profile).toMatchObject({ category: 'Health coach', source: 'website', evidence: ['https://wildlyprimal.com/work-with-us'] });
    expect(openai.chatJson).not.toHaveBeenCalled();
  });

  it('with OpenAI, asks once from the site’s pages and never fails the step', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');
    openai.chatJson.mockResolvedValueOnce({ category: 'Functional health coach', services: ['gut health testing'], service_area: 'online', competitor_queries: ['functional health coach jacksonville'] });
    const profile = await buildBusinessProfile({ ...business, scan, pages: [page] });
    expect(profile).toMatchObject({ category: 'Functional health coach', source: 'model' });
    expect(openai.chatJson.mock.calls[0][1]).toContain('work-with-us');
    openai.chatJson.mockRejectedValueOnce(new Error('down'));
    expect(await buildBusinessProfile({ ...business, scan, pages: [page] })).toMatchObject({ category: 'Health coach', source: 'website' });
  });
});

describe('which candidates compete', () => {
  const profile = { category: 'Functional health coach', offer: null, services: ['gut health testing'], audience: null, service_area: 'online' as const, competitor_queries: [], content_topics: [], source: 'model' as const, evidence: [] };
  const candidates = [candidate('SERVPRO of Arlington / Jacksonville East', 'General Contractor'), candidate('Wellspring Health and Sports Performance', 'Health coach'), candidate('Visiting Angels Senior Home Care', 'Health'), { ...candidate('Best 10 coaches', null, 'https://www.yelp.com/search'), title: 'THE BEST 10 LIFE COACH IN JACKSONVILLE - Yelp' }];

  it('without OpenAI the word check decides, with a reason each', async () => {
    const out = await filterCompetitors(profile, business, candidates);
    expect(out.map((d) => [d.candidate.name, d.competes, d.by])).toEqual([
      ['SERVPRO of Arlington / Jacksonville East', false, 'words'],
      ['Wellspring Health and Sports Performance', true, 'words'],
      ['Visiting Angels Senior Home Care', true, 'words'],
      ['Best 10 coaches', false, 'words'],
    ]);
    expect(out[0].reason).toMatch(/General Contractor/);
    expect(out[3].reason).toMatch(/directory/);
    expect(openai.chatJson).not.toHaveBeenCalled();
  });

  it('with OpenAI the model judges only what passed the words, never bringing a dropped candidate back', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');
    openai.chatJson.mockResolvedValueOnce({ decisions: [{ index: 0, competes: true, reason: 'Coaches the same adults.' }, { index: 1, competes: false, reason: 'Senior home care, not coaching.' }, { index: 7, competes: true }] });
    const out = await filterCompetitors(profile, business, candidates);
    const sent = JSON.parse(openai.chatJson.mock.calls[0][1]) as { candidates: { name: string }[] };
    expect(sent.candidates.map((c) => c.name)).toEqual(['Wellspring Health and Sports Performance', 'Visiting Angels Senior Home Care']);
    expect(out.map((d) => [d.candidate.name, d.competes, d.by])).toEqual([
      ['SERVPRO of Arlington / Jacksonville East', false, 'words'],
      ['Wellspring Health and Sports Performance', true, 'model'],
      ['Visiting Angels Senior Home Care', false, 'model'],
      ['Best 10 coaches', false, 'words'],
    ]);
    expect(out[2].reason).toBe('Senior home care, not coaching.');
  });

  it('keeps every candidate for review when nothing verified the category', async () => {
    const out = await filterCompetitors({ ...profile, category: null, services: [] }, business, candidates.slice(0, 2));
    expect(out.every((d) => d.competes)).toBe(true);
    expect(out[0].reason).toMatch(/kept for review/);
  });
});

describe('the business’s own words beyond its site', () => {
  const linktree = { title: 'APK9 Official: TikTok, Instagram | Linktree', meta_description: 'Linktree. Make your link do more.', h1: ['APK9'], url: 'https://linktr.ee/alphaprimek9', final_url: 'https://linktr.ee/alphaprimek9', schema_types: ['ProfilePage', 'Person'], status: 200, error: null };
  const bio = 'Elite Dog Training | Real Results\nObedience • Behavior • Protection\nBoarding | Board & Train | Private Sessions';

  it('reads the category from the Instagram bio when the website is a link-in-bio page', () => {
    expect(isLinkPageUrl('https://linktr.ee/alphaprimek9')).toBe(true);
    expect(isLinkPageUrl('https://www.uncommonpathbrewing.com')).toBe(false);
    expect(categoryFromSite(linktree)).toBeNull();
    expect(profileText(linktree, [], { biography: bio })).toBe(bio);
    expect(fallbackProfile(linktree, [], null, [], { biography: bio })).toMatchObject({ category: 'Dog trainer', source: 'social' });
    expect(fallbackProfile(linktree, [], 'Restaurant', [])).toMatchObject({ category: 'Restaurant', source: 'listing' });
    expect(instagramBio({ data: { user: { biography: `  ${bio}  ` } } })).toBe(bio.replace(/\s+/g, ' '));
    expect(instagramBio({ data: { user: {} } })).toBeNull();
  });

  it('knows a list page and a booking platform from a business', () => {
    for (const name of ['279 Best Lunch Restaurants in Pembroke Pines', 'LOS 10 MEJORES restaurantes en Pembroke Pines (2026)', 'Pembroke Pines Restaurants Archives', 'Discover Pembroke Pines, FL Restaurants to Love on Resy', 'THE 10 BEST Dog Trainers in Miami']) expect(isListPage(name), name).toBe(true);
    for (const name of ['Mezes Greek Taverna', 'Sit Means Sit', 'Alpha Dog Training', 'Brimstone Woodfire Grill']) expect(isListPage(name), name).toBe(false);
    for (const host of ['www.opentable.com', 'resy.com', 'www.tripadvisor.es', 'rover.com', 'linktr.ee']) expect(isDirectoryHost(host), host).toBe(true);
    expect(isDirectoryHost('www.mezestaverna.com')).toBe(false);
  });

  it('never lets a list page through the relevance check, whatever its words', async () => {
    const profile = fallbackProfile(null, [], null, [], { biography: bio });
    const out = await filterCompetitors(profile, { name: 'APK9 Academy LLC', city: 'Pembroke Pines, FL' }, [
      { name: 'THE 10 BEST Dog Trainers in Pembroke Pines', website: 'https://lists.example/best', category: null, title: 'THE 10 BEST Dog Trainers in Pembroke Pines', snippet: 'dog training', address: null },
      { name: 'Alpha Dog Training', website: 'https://alpha.example', category: 'Dog trainer', title: null, snippet: null, address: null },
    ]);
    expect(out.map((d) => d.competes)).toEqual([false, true]);
    expect(out[0].reason).toMatch(/list or directory page/);
  });
});
