import { describe, expect, it } from 'vitest';
import { GROUNDSWELL_CONFIG } from '../groundswell.config';
import { checkPlans, DAYS, forbiddenIn, hasPlans, matchPage, scrubNumbers } from '../src/plans';

/** The plans checker: what the rules keep of a writer's answer, and what they name as dropped. */

const PAGES = ['https://wildlyprimal.com', '/', 'https://wildlyprimal.com/work-with-us', '/work-with-us', 'https://wildlyprimal.com/faq', '/faq'];
// The data's numbers, and the small counts the engine's guard always allows.
const ALLOWED = new Set(['350', '297', '2026', ...Array.from({ length: 13 }, (_, i) => String(i))]);
const rules = {
  unsupported: (text: string) => (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, '')).filter((n) => !ALLOWED.has(n)),
  claims: GROUNDSWELL_CONFIG.unsupported_claims,
  competitors: ['Wellspring Health and Sports Performance', 'New Life Healthcare'],
  pages: PAGES,
};
const post = (day: string, extra: Record<string, unknown> = {}) => ({ day, platform: 'instagram', format: 'post', pillar: 'Gut health', topic: 'What a GI-MAP shows', hook: 'Your gut keeps a record.', caption: 'A GI-MAP stool test shows what lives in your gut and what it is doing. We read it with you and turn it into a plan you can follow at home.', cta: 'Book a complimentary consultation.', visual: 'https://www.instagram.com/p/C1/ (the lab kit on the desk)', hashtags: ['#GutHealth', 'functional-health', 'jaxbeach', '#guthealth'], ...extra });

describe('helpers', () => {
  it('scrubs the sentences that quote a number the data lacks, keeps the rest', () => {
    expect(scrubNumbers('The consultation is $350. We helped 500 clients. Book in 4 steps.', rules.unsupported)).toEqual({ text: 'The consultation is $350. Book in 4 steps.', removed: ['We helped 500 clients.'] });
  });
  it('finds unsupported claims and competitor names, whole words only', () => {
    expect(forbiddenIn('The best coach in town', rules.claims, rules.competitors)).toEqual(['best']);
    expect(forbiddenIn('Unlike New Life Healthcare, we test first.', rules.claims, rules.competitors)).toEqual(['New Life Healthcare']);
    expect(forbiddenIn('Our bestselling program', rules.claims, rules.competitors)).toEqual([]);
  });
  it('matches a named page to one that was read, by URL, path, or "site-wide"', () => {
    expect(matchPage('/work-with-us/', PAGES)).toBe('https://wildlyprimal.com/work-with-us');
    expect(matchPage('https://wildlyprimal.com/faq', PAGES)).toBe('https://wildlyprimal.com/faq');
    expect(matchPage('Homepage', PAGES)).toBe('https://wildlyprimal.com');
    expect(matchPage('Site-wide', PAGES)).toBe('site-wide');
    expect(matchPage('/pricing', PAGES)).toBeNull();
  });
});

describe('checkPlans', () => {
  const raw = {
    website_plan: {
      summary: 'The pages say what the practice does but not who it is for; 3 of them lack a call to action.',
      changes: [
        { page: '/work-with-us', priority: 'high', change: 'Open with who the program is for and the $350 consultation.', reason: 'The page lists prices before it says who it serves.', evidence: 'Headings: Work with us, The program, Consultations.' },
        { page: '/pricing', priority: 'high', change: 'Add a comparison table.', reason: 'x', evidence: 'y' },
        { page: 'Homepage', priority: 'low', change: 'Name Jacksonville Beach in the title.', reason: 'The title carries no place.', evidence: 'Title: Wildly Primal | Functional Health Coach & Lab Testing.' },
        { page: '/faq', priority: 'medium', change: 'Our clients see results in 14 weeks.', reason: 'r', evidence: 'e' },
      ],
      new_pages: [{ path: '/gut-health-coach-jacksonville', purpose: 'Answer the gut health searches.', searches: ['gut health coach', 'gi map test'] }, { path: 'no slash', purpose: 'x' }],
      measurement: ['Search Console clicks on the work-with-us page.', 'Consultation bookings from the form, by month.'],
    },
    social_plan: {
      summary: 'Instagram carries the week; Facebook shares the reels.',
      platforms: [{ platform: 'Instagram', role: 'Where the practice already posts.', cadence: 'Daily this week' }, { platform: 'facebook', role: 'Reshare', cadence: 'Three a week' }, { platform: 'instagram', role: 'dup', cadence: '' }, { platform: 'myspace', role: 'no', cadence: '' }],
      pillars: [{ name: 'Gut health', why: 'The journal’s most written-about subject.' }, { name: 'Labs explained', why: 'The FAQ answers lab questions.' }],
      week: [
        post('Monday', { format: 'Reel' }),
        post('Tue', { format: 'carousel', caption: 'Three labs we run and why. Over 1,000 clients trust us. Each one answers a different question.' }),
        post('Wednesday', { caption: 'We are the best functional health coach in Jacksonville.' }),
        post('Thursday', { platform: 'Google Business', caption: 'Unlike Wellspring Health and Sports Performance, we start with labs.' }),
        post('Friday'),
        post('Friday', { topic: 'duplicate' }),
        post('Saturday', { caption: 'We helped 500 people.' }),
        post('Someday'),
      ],
    },
  };
  const out = checkPlans(raw, rules);

  it('keeps website changes that name a page read, scrubbed of invented numbers, sorted by priority', () => {
    expect(out.website_plan.changes.map((c) => [c.page, c.priority])).toEqual([
      ['https://wildlyprimal.com/work-with-us', 'high'],
      ['https://wildlyprimal.com', 'low'],
    ]);
    expect(out.website_plan.changes[0].change).toContain('$350');
    expect(out.website_plan.summary).toBe('The pages say what the practice does but not who it is for; 3 of them lack a call to action.');
    expect(out.website_plan.new_pages).toEqual([{ path: '/gut-health-coach-jacksonville', purpose: 'Answer the gut health searches.', searches: ['gut health coach', 'gi map test'] }]);
    expect(out.website_plan.measurement).toHaveLength(2);
    expect(out.dropped).toEqual(expect.arrayContaining([expect.stringContaining('/pricing'), expect.stringContaining('14 weeks')]));
  });

  it('keeps one post a day, Monday to Sunday order, with normalized platforms, formats and hashtags', () => {
    expect(out.social_plan.week.map((p) => [p.day, p.platform, p.format])).toEqual([
      ['Monday', 'instagram', 'reel'],
      ['Tuesday', 'instagram', 'carousel'],
      ['Friday', 'instagram', 'post'],
    ]);
    expect(out.social_plan.week[0].hashtags).toEqual(['guthealth', 'functionalhealth', 'jaxbeach']);
    expect(out.social_plan.week[1].caption).toBe('Three labs we run and why. Each one answers a different question.');
    expect(out.social_plan.platforms.map((p) => p.platform)).toEqual(['instagram', 'facebook']);
    expect(out.social_plan.pillars).toHaveLength(2);
  });

  it('names what the rules dropped: the claim, the competitor, the invented number, the second Friday, the missing days', () => {
    expect(out.dropped).toEqual(expect.arrayContaining([
      expect.stringContaining('Wednesday: the post was left out for "best"'),
      expect.stringContaining('Thursday: the post was left out for "Wellspring Health and Sports Performance"'),
      expect.stringContaining('A second post for Friday'),
      expect.stringContaining('Saturday: the caption had nothing left'),
      expect.stringContaining('A post had no weekday (Someday)'),
      'No post for Wednesday, Thursday, Saturday, Sunday.',
    ]));
    expect(hasPlans(out)).toBe(true);
    expect(hasPlans(checkPlans({}, rules))).toBe(false);
    expect(DAYS).toHaveLength(7);
  });
});
