import { describe, expect, it } from 'vitest';
import { GROUNDSWELL_CONFIG } from '../groundswell.config';
import { UPB_ANGLES, UPB_INDUSTRY, UPB_TEMPLATES } from '../examples/uncommon-path-brewing';
import { checkCopy, copyTargets } from '../src/adcopy';
import { buildAdPlan } from '../src/adplan';

// The brewery's plan, through the real setup file: events funded on Meta and
// Google, the cheap unpriced searches tested, pizza skipped.
const industry = GROUNDSWELL_CONFIG.industries.find((i) => i.id === UPB_INDUSTRY)!;
const plan = buildAdPlan(UPB_ANGLES, industry, GROUNDSWELL_CONFIG);
const targets = copyTargets(plan, UPB_ANGLES);
// The numbers the brewery publishes (guests, package and hourly prices, rating, pie price, address, age rule),
// and small counts like a radius in miles, which New Wave's engine always allows.
const PUBLISHED = new Set(['120', '1000', '100', '4.8', '18', '5', '21', '3', '10']);
const badNumbers = (text: string) => (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, '')).filter((n) => !PUBLISHED.has(n));
const answer = (ads: unknown[]) => ({ ads });
const events = (platform: string) => UPB_TEMPLATES.find((t) => t.angle_id === 'events' && t.platform === platform)!;

describe('which rows get copy', () => {
  it('writes one ad per funded or tested angle and platform, funded first, never a skipped row', () => {
    expect(targets.map((t) => [t.angle_id, t.platform, t.recommendation])).toEqual(
      plan.rows.filter((r) => r.recommendation !== 'skip').sort((a, b) => Number(a.recommendation === 'test') - Number(b.recommendation === 'test')).map((r) => [r.angle_id, r.platform, r.recommendation])
    );
    expect(targets.slice(0, 2).map((t) => [t.angle_id, t.platform])).toEqual([['events', 'meta'], ['events', 'google_search']]);
    expect(targets.some((t) => t.angle_id === 'pizza')).toBe(false);
    expect(targets.find((t) => t.platform === 'google_search' && t.angle_id === 'events')?.keywords.length).toBeGreaterThan(0);
  });

  it('stops at the limit', () => {
    expect(copyTargets(plan, UPB_ANGLES, 1)).toHaveLength(1);
  });
});

describe('holding the copy to the formats and the data', () => {
  const checked = checkCopy(answer(UPB_TEMPLATES), targets, GROUNDSWELL_CONFIG, badNumbers);

  it('keeps the hand-checked events ads, and sets search targeting from the keywords', () => {
    const google = checked.ads.find((a) => a.angle_id === 'events' && a.platform === 'google_search')!;
    expect(google.fields.headlines).toEqual(events('google_search').fields.headlines);
    expect(google.targeting).toBe(`Keywords: ${targets.find((t) => t.angle_id === 'events' && t.platform === 'google_search')!.keywords.join(', ')}`);
    expect(google).toMatchObject({ recommendation: 'fund', format: 'Responsive search ad' });
    expect(google.proof).toBeUndefined();
    expect(google.limits_source).toMatch(/Google Ads Help.*\(2026\)/);
    expect(checked.ads.find((a) => a.angle_id === 'events' && a.platform === 'meta')?.fields.headline).toBe('Private events from $1,000');
  });

  it('ignores ads for rows the plan does not run, and lists the run rows that got none', () => {
    expect(checked.ads.some((a) => a.angle_id === 'pizza')).toBe(false);
    expect(checked.dropped.filter((d) => d.includes('"pizza"'))).toHaveLength(3);
    // Reddit is ruled out for alcohol (a sales team is required), so its events ad has no row either.
    expect(checked.dropped).toContain('An ad for "events" on reddit, a row the plan does not run.');
    const tested = targets.filter((t) => t.recommendation === 'test');
    expect(checked.not_written.map((n) => n.reason)).toEqual(tested.map(() => 'No copy came back for this row.'));
  });

  it('drops over-length, claiming, unsupported-number and repeated lines, keeping the rest', () => {
    const google = events('google_search');
    const out = checkCopy(
      answer([
        {
          ...google,
          fields: {
            ...google.fields,
            headlines: ['Private Event Space', 'The Best Event Space in Town', 'Groups of Up to 120 Guests', 'Packages From $900', 'private event space', 'A Headline That Is Far Too Long For Google', 'Book Your Private Event'],
            sitelinks: ['Not a field here'],
          },
        },
      ]),
      targets.filter((t) => t.angle_id === 'events' && t.platform === 'google_search'),
      GROUNDSWELL_CONFIG,
      badNumbers
    );
    expect(out.ads[0].fields.headlines).toEqual(['Private Event Space', 'Groups of Up to 120 Guests', 'Book Your Private Event']);
    expect(out.dropped.join('\n')).toMatch(/Best Event Space.*claims "best"/);
    expect(out.dropped.join('\n')).toMatch(/\$900.*uses 900, which the data does not show/);
    expect(out.dropped.join('\n')).toMatch(/private event space.*a repeat/);
    expect(out.dropped.join('\n')).toMatch(/Far Too Long.*characters, limit 30/);
    expect(out.dropped.join('\n')).toMatch(/"sitelinks" is not a field of the Responsive search ad format/);
  });

  it('lists a row as not written when too few lines survive, with the format\'s reason', () => {
    const google = events('google_search');
    const out = checkCopy(
      answer([{ ...google, fields: { ...google.fields, headlines: ['Private Event Space', 'Best Venue in Broward'] } }]),
      targets.filter((t) => t.angle_id === 'events' && t.platform === 'google_search'),
      GROUNDSWELL_CONFIG,
      badNumbers
    );
    expect(out.ads).toEqual([]);
    expect(out.not_written[0].reason).toMatch(/headlines: needs at least 3, has 1/);
  });

  it('needs a social ad\'s targeting and every call to action to pass the same checks', () => {
    const meta = events('meta');
    const metaTarget = targets.filter((t) => t.angle_id === 'events' && t.platform === 'meta');
    expect(checkCopy(answer([{ ...meta, targeting: '' }]), metaTarget, GROUNDSWELL_CONFIG, badNumbers).not_written[0].reason).toMatch(/targeting cannot run \(empty\)/);
    expect(checkCopy(answer([{ ...meta, call_to_action: 'Guaranteed fun' }]), metaTarget, GROUNDSWELL_CONFIG, badNumbers).not_written[0].reason).toMatch(/call to action cannot run \(claims "guaranteed"\)/);
    expect(checkCopy(answer([{ ...meta, targeting: 'Adults 30 to 45 nearby' }]), metaTarget, GROUNDSWELL_CONFIG, badNumbers).not_written[0].reason).toMatch(/uses 30, 45/);
  });

  it('copes with an answer that is not the expected shape', () => {
    expect(checkCopy(null, targets, GROUNDSWELL_CONFIG).ads).toEqual([]);
    expect(checkCopy({ ads: 'nope' }, targets, GROUNDSWELL_CONFIG).not_written).toHaveLength(targets.length);
  });
});
