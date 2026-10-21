import { describe, expect, it } from 'vitest';
import { GROUNDSWELL_CONFIG } from '../groundswell.config';
import { benchmarksFor } from '../src/config';

const config = GROUNDSWELL_CONFIG;

describe('the setup file', () => {
  it('loads (validateConfig runs on import) with every ad platform', () => {
    expect(Object.keys(config.platforms).sort()).toEqual(['google_search', 'linkedin', 'meta', 'reddit', 'tiktok']);
  });

  it('names a source, link and edition for every benchmark and format limit, or says why a benchmark is missing', () => {
    for (const p of Object.values(config.platforms)) {
      const sets = [p.benchmarks, ...Object.values(p.by_industry ?? {})].filter((b) => b !== null);
      if (!p.benchmarks) expect(p.benchmarks_missing, p.id).toMatch(/not modeled/);
      for (const b of sets) {
        expect(b!.source, p.id).toBeTruthy();
        expect(b!.url, p.id).toMatch(/^https:\/\//);
        expect(b!.as_of, p.id).toMatch(/^20\d\d$/);
      }
      expect(p.template.url, p.id).toMatch(/^https:\/\//);
      for (const rule of Object.values(p.restricted_categories ?? {})) expect(rule.url, p.id).toMatch(/^https:\/\//);
    }
  });

  it('gives every industry profile only known ad platforms, and benchmarks it can find or fall back from', () => {
    for (const industry of config.industries) {
      for (const id of industry.ad_platforms) {
        const p = config.platforms[id];
        expect(p, `${industry.id}: ${id}`).toBeDefined();
        // Either the industry's own set, the all-industry set, or a stated reason there is none.
        expect(benchmarksFor(p, industry) !== null || Boolean(p.benchmarks_missing), `${industry.id}: ${id}`).toBe(true);
      }
    }
  });

  it('uses the restaurant figures for a brewery', () => {
    const brewery = config.industries.find((i) => i.id === 'restaurant_bar')!;
    expect(benchmarksFor(config.platforms.google_search, brewery)!.cpc[1]).toBe(2.05);
    expect(benchmarksFor(config.platforms.meta, brewery)!.cpc[1]).toBe(0.45);
  });

  it('rules out self-serve where a platform requires a sales team for alcohol', () => {
    expect(config.platforms.reddit.restricted_categories?.alcohol.blocks_self_serve).toBe(true);
    expect(config.platforms.tiktok.restricted_categories?.alcohol.blocks_self_serve).toBe(true);
    expect(config.platforms.meta.restricted_categories?.alcohol.blocks_self_serve).toBe(false);
  });
});
