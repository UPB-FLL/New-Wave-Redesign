import { describe, expect, it } from 'vitest';
import type { AngleInput } from '../src/adplan';
import { planAudit, type SortedFix } from '../src/audit';
import { validateConfig } from '../src/config';
import { compareFigures, findAgreement, NO_ROW, planFigures, refreshAngles, type FigureSet, type KeywordRead } from '../src/verify';
import { config } from './fixture';

const TOL = config.verification.tolerance;
const set = (figures: FigureSet['figures'], calls: FigureSet['calls'] = []): FigureSet => ({ figures, calls });
const fig = (key: string, value: number | null, extra: Partial<FigureSet['figures'][number]> = {}) => ({ key, label: key, value, ...extra });

describe('comparing two passes', () => {
  it('agrees within the tolerance and lists what moved beyond it, with how far', () => {
    expect(compareFigures(set([fig('rating', 4.6)]), set([fig('rating', 4.5)]), TOL)).toEqual([]);
    expect(compareFigures(set([fig('followers', 1000)]), set([fig('followers', 1100)]), TOL)).toEqual([]);
    expect(compareFigures(set([fig('followers', 1000)]), set([fig('followers', 1200)]), TOL)).toEqual([
      { key: 'followers', label: 'followers', earlier: 1000, later: 1200, change: 0.167, kind: 'moved' },
    ]);
  });

  it('lets a count differ by one, and judges money against what is at stake', () => {
    expect(compareFigures(set([fig('reviews', 8, { count: true })]), set([fig('reviews', 9, { count: true })]), TOL)).toEqual([]);
    expect(compareFigures(set([fig('reviews', 8, { count: true })]), set([fig('reviews', 10, { count: true })]), TOL)).toHaveLength(1);
    // -$40 against +$30 on a row spending $6,000 a year is noise; on a row spending $300 it is not.
    expect(compareFigures(set([fig('net', -40, { scale: 6000 })]), set([fig('net', 30, { scale: 6000 })]), TOL)).toEqual([]);
    expect(compareFigures(set([fig('net', -40, { scale: 300 })]), set([fig('net', 30, { scale: 300 })]), TOL)).toHaveLength(1);
  });

  it('counts a figure one pass read and the other could not as a disagreement, unless it is optional', () => {
    expect(compareFigures(set([fig('rating', 4.6)]), set([fig('rating', null)]), TOL)).toEqual([
      { key: 'rating', label: 'rating', earlier: 4.6, later: null, change: null, kind: 'unread' },
    ]);
    expect(compareFigures(set([fig('rating', 4.6)]), set([]), TOL)[0].kind).toBe('unread');
    expect(compareFigures(set([fig('rating', null)]), set([fig('rating', null)]), TOL)).toEqual([]);
    expect(compareFigures(set([fig('nearby:joe', 4.2, { optional: true })]), set([]), TOL)).toEqual([]);
  });

  it('compares calls exactly, and names a row that is gone', () => {
    const a = set([], [{ key: 'row:events:meta', label: 'Events on Meta', value: 'fund' }]);
    expect(compareFigures(a, a, TOL)).toEqual([]);
    expect(compareFigures(a, set([], [{ key: 'row:events:meta', label: 'Events on Meta', value: 'test' }]), TOL)[0]).toMatchObject({ earlier: 'fund', later: 'test', kind: 'changed' });
    expect(compareFigures(a, set([]), TOL)[0]).toMatchObject({ earlier: 'fund', later: NO_ROW });
  });
});

describe('when the passes agree', () => {
  const first = set([fig('x', 100)]);
  const off = set([fig('x', 150)]);

  it('delivers the first pass whenever a later one agrees with it, even after a bad read in between', () => {
    expect(findAgreement([first, set([fig('x', 104)])], TOL)).toEqual({ agreed: 0, disagreements: [] });
    expect(findAgreement([first, off, set([fig('x', 98)])], TOL).agreed).toBe(0);
  });

  it('takes a later pass when the first was the bad read', () => {
    expect(findAgreement([first, off, set([fig('x', 148)])], TOL).agreed).toBe(1);
  });

  it('does not let two later reads that both missed a figure agree in place of the first', () => {
    const both = set([fig('x', 100), fig('rating', 4.6)]);
    const missed = set([fig('x', 100), fig('rating', null)]);
    expect(findAgreement([both, missed, missed], TOL).agreed).toBeNull();
    expect(findAgreement([both, missed, both], TOL).agreed).toBe(0);
  });

  it('agrees with none when every read differs, and lists the latest against the first', () => {
    const r = findAgreement([first, off, set([fig('x', 200)])], TOL);
    expect(r.agreed).toBeNull();
    expect(r.disagreements).toEqual([{ key: 'x', label: 'x', earlier: 100, later: 200, change: 0.5, kind: 'moved' }]);
  });
});

describe('re-running the plan on another read', () => {
  const general = config.industries[0];
  const value = { per_customer: [100, 100, 100] as [number, number, number], close: [0.5, 0.5, 0.5] as [number, number, number], gross_margin: [0.5, 0.5, 0.5] as [number, number, number], basis: 'test' };
  const events: AngleInput = {
    id: 'events',
    name: 'Events',
    why: 'Published packages no rival advertises.',
    keywords: [
      { keyword: 'Event Space', monthly_searches: 1000, low_bid_usd: 2, high_bid_usd: 4 },
      { keyword: 'party venue', monthly_searches: 40, low_bid_usd: 1, high_bid_usd: 2 },
    ],
    value,
    incrementality: 0,
    incrementality_basis: '',
  };
  const pizza: AngleInput = { ...events, id: 'pizza', name: 'Pizza', keywords: [{ keyword: 'pizza near me', monthly_searches: 500, low_bid_usd: 1, high_bid_usd: 3 }] };
  const fixes: SortedFix[] = [{ id: '1', area: 'website', effort: 'site_fix', title: 'Add a booking link', evidence: 'No booking link was found.' }];
  const baseline = { monthly_ad_spend: null, ad_spend_basis: 'test' };
  const read: KeywordRead[] = [...events.keywords, ...pizza.keywords];
  const positions = { 'pizza near me': 6 };

  const pass = (r: KeywordRead[], p: Record<string, number>) => {
    const refreshed = refreshAngles([events, pizza], r, p, config);
    const result = planAudit({ angles: refreshed.angles, industry: general, positions: p, fixes, baseline }, config);
    return { ...refreshed, result, figures: planFigures(result, refreshed.angles) };
  };

  it('reproduces the plan exactly from the same read', () => {
    const a = pass(read, positions);
    const b = pass(read.map((k) => ({ ...k })), { ...positions });
    expect(a.missing).toEqual([]);
    expect(b.result).toEqual(a.result);
    expect(compareFigures(a.figures, b.figures, TOL)).toEqual([]);
    expect(a.figures.figures.find((f) => f.key === 'angle:events:demand')?.value).toBe(1040);
    expect(a.figures.calls.map((c) => c.key)).toContain('ranking:top3');
  });

  it('agrees when the searches move a little, and not when the main keyword moves a lot', () => {
    const a = pass(read, positions);
    const near = pass(read.map((k) => ({ ...k, monthly_searches: Math.round((k.monthly_searches ?? 0) * 1.05) })), positions);
    expect(compareFigures(a.figures, near.figures, TOL)).toEqual([]);
    const far = pass(read.map((k) => (k.keyword === 'Event Space' ? { ...k, monthly_searches: 1500 } : k)), positions);
    const moved = compareFigures(a.figures, far.figures, TOL).map((d) => d.key);
    expect(moved).toContain('angle:events:demand');
    expect(moved).toContain('keyword:event space:searches');
  });

  it('leaves out a keyword the read no longer returns, and drops an angle with none left', () => {
    const r = pass(read.filter((k) => k.keyword !== 'party venue' && k.keyword !== 'pizza near me'), positions);
    expect(r.missing).toEqual(['party venue', 'pizza near me']);
    expect(r.angles.map((a) => a.id)).toEqual(['events']);
    expect(r.angles[0].keywords.map((k) => k.keyword)).toEqual(['Event Space']);
    // A long-tail keyword is optional; the angle's demand and the gone angle's rows are not.
    const d = compareFigures(pass(read, positions).figures, r.figures, TOL);
    expect(d.some((x) => x.key === 'keyword:party venue:searches')).toBe(false);
    expect(d.some((x) => x.key === 'angle:pizza:demand' && x.kind === 'unread')).toBe(true);
  });

  it('takes incrementality from the read\'s rankings', () => {
    const first = pass(read, positions).angles.find((a) => a.id === 'pizza')!;
    const ranksFirst = pass(read, { 'pizza near me': 1 }).angles.find((a) => a.id === 'pizza')!;
    expect(ranksFirst.incrementality).toBe(config.incrementality.ranks_first);
    expect(first.incrementality).not.toBe(ranksFirst.incrementality);
  });
});

describe('the setup file', () => {
  it('needs max_review_drops between 0 and 1', () => {
    expect(() => validateConfig({ ...config, verification: { ...config.verification, max_review_drops: 0 } })).toThrow(/max_review_drops/);
    expect(() => validateConfig({ ...config, verification: { ...config.verification, max_review_drops: 1 } })).toThrow(/max_review_drops/);
  });
});
