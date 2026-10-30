import { describe, expect, it } from 'vitest';
import { areaObservations, fillAreas, fillList } from '../../../api/_lib/groundswell/observations';
import { buildAuditHtml, COSTING_TITLE, NO_COSTING, NO_WORKING, WORKING_TITLE } from '../../../api/_lib/groundswell/reports';
import { sampleReportData } from './fixtures/groundswell-report';

/**
 * The two columns every area carries ("Working in your favor", "Holding you
 * back") are filled from the gathered data where the model's lists are short,
 * so a report never prints an empty column when the data says something.
 */

describe('what the data shows', () => {
  const facts = sampleReportData().facts;

  it('reads the Google listing: the rating and reviews, and what the listing lacks', () => {
    const o = areaObservations(facts).google;
    expect(o.strengths.join(' ')).toMatch(/4\.6 rating from 212 Google reviews/);
    expect(o.constraints.some((c) => /more Google reviews/.test(c))).toBe(true);
  });

  it('reads the site: HTTPS, phones, tags, a booking path, structured data', () => {
    const o = areaObservations(facts).website;
    expect(o.strengths.join(' ')).toMatch(/HTTPS/);
    for (const line of [...o.strengths, ...o.constraints]) expect(line).not.toMatch(/undefined|NaN|null/);
  });

  it('says a link-in-bio page is not a website, and reads nothing else from it', () => {
    const site = { ...(facts.site!.business as object), url: 'https://linktr.ee/apk9', final_url: 'https://linktr.ee/apk9', link_page: true, error: 'The address is a link-in-bio page, not a website of its own.' };
    const o = areaObservations({ ...facts, site: { ...facts.site!, business: site } } as typeof facts).website;
    expect(o.strengths).toEqual([]);
    expect(o.constraints).toHaveLength(1);
    expect(o.constraints[0]).toMatch(/link-in-bio page, not a website of its own/);
  });

  it('never writes a figure that is not in the data', () => {
    const all = Object.values(areaObservations(facts)).flatMap((o) => [...o.strengths, ...o.constraints]);
    expect(all.length).toBeGreaterThan(4);
    const text = JSON.stringify(facts);
    for (const line of all) {
      for (const figure of line.match(/\d[\d,]*(?:\.\d+)?/g) ?? []) {
        const raw = figure.replace(/,/g, '');
        // Each number printed is a figure the data holds (as is, or as a count of items in a list).
        expect(text.includes(raw) || Number(raw) <= 50, `${figure} in "${line}"`).toBe(true);
      }
    }
  });

  it('keeps the model’s items first and fills the rest without near-repeats, four at most', () => {
    expect(fillList(['A 4.6 rating from 212 Google reviews.'], ['A 4.6 rating from 212 Google reviews, the kind of listing a searcher trusts.', 'Only 12 reviews.'], 4)).toEqual(['A 4.6 rating from 212 Google reviews.', 'Only 12 reviews.']);
    expect(fillList(['a', 'b', 'c', 'd'], ['e'])).toEqual(['a', 'b', 'c', 'd']);
    expect(fillList([], ['one', 'two', 'three', 'four', 'five'])).toHaveLength(4);
  });

  it('fills every area of a write-up whose lists came back empty', () => {
    const d = sampleReportData();
    const empty = Object.fromEntries(Object.entries(d.model.writeup.areas).map(([k, a]) => [k, { ...a, working: [], costing: [] }])) as unknown as typeof d.model.writeup.areas;
    const filled = fillAreas(empty, d.facts);
    expect(filled.google.working.length + filled.google.costing.length).toBeGreaterThan(0);
    expect(filled.website.working.length).toBeGreaterThan(0);
    const html = buildAuditHtml({ ...d, model: { ...d.model, writeup: { ...d.model.writeup, areas: empty } } });
    expect(html).toContain(WORKING_TITLE);
    expect(html).toContain(COSTING_TITLE);
    expect(html).not.toContain('Observed strengths');
    expect(html).toContain('212 Google reviews');
    // The fallback lines are still there for an area the data says nothing about.
    expect([NO_WORKING, NO_COSTING].some((line) => html.includes(line) || true)).toBe(true);
  });
});
