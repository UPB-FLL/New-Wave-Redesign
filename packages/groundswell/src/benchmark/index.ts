/**
 * The competitor benchmark: the business against its top competitors on
 * engagement, ads, pricing and authority, with a scorecard, its gaps and the
 * rules for what not to copy. Pure functions over data an engine gathers
 * (New Wave's lives in api/_lib/groundswell/benchmark.ts); the setup file's
 * `benchmark` section and each industry profile decide the details.
 */
export * from './ads.js';
export * from './authority.js';
export * from './engagement.js';
export * from './pricing.js';
export * from './scorecard.js';
