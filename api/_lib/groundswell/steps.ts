import { runAdcopy } from './adcopy.js';
import { runAdplan } from './adplan.js';
import { runBenchmark } from './benchmark.js';
import { runAdsLibrary } from './currents/adsLibrary.js';
import { runAuthority } from './currents/authority.js';
import { runPricing } from './currents/pricing.js';
import { runSocialDepth } from './currents/socialDepth.js';
import { runAds } from './currents/ads.js';
import { runMaps } from './currents/maps.js';
import { runKeywords, runSearch } from './currents/search.js';
import { runSite } from './currents/site.js';
import { runSocial } from './currents/social.js';
import {
  runDeliverAudit,
  runDeliverBenchmark,
  runDeliverDeck,
  runDeliverFinish,
  runDeliverPrepare,
  runDeliverSummary,
} from './delivery.js';
import { runModel } from './model.js';
import type { StepDefinition } from './types.js';

/**
 * Groundswell's steps, in the order an audit runs them. The names are stored
 * in marketing_audit_steps, so renaming one strands audits already running.
 * The last step finishes the audit (deliver_finish sets it to done).
 */
export const STEPS: StepDefinition[] = [
  { name: 'site', current: 'Site', label: 'Website scan', optional: false, run: runSite },
  { name: 'maps', current: 'Maps', label: 'Google Maps', optional: true, run: runMaps },
  { name: 'search', current: 'Search', label: 'Search rankings (Ahrefs)', optional: true, run: runSearch },
  { name: 'keywords', current: 'Search', label: 'Keyword demand (Keyword Planner)', optional: true, run: runKeywords },
  { name: 'social', current: 'Social', label: 'Instagram', optional: true, run: runSocial },
  { name: 'ads', current: 'Ads', label: 'Ads', optional: true, run: runAds },
  { name: 'model', current: 'Model', label: 'Write-up and ROI', optional: false, run: runModel },
  { name: 'adplan', current: 'Model', label: 'Ad plan and change ranking', optional: true, run: runAdplan },
  { name: 'adcopy', current: 'Model', label: 'Ad copy', optional: true, run: runAdcopy },
  { name: 'deliver_prepare', current: 'Delivery', label: 'Drive folder', optional: false, run: runDeliverPrepare },
  { name: 'deliver_audit', current: 'Delivery', label: 'Full audit PDF', optional: false, run: runDeliverAudit },
  { name: 'deliver_deck', current: 'Delivery', label: 'Slides PDF', optional: false, run: runDeliverDeck },
  { name: 'deliver_summary', current: 'Delivery', label: 'Summary PDF', optional: false, run: runDeliverSummary },
  { name: 'deliver_finish', current: 'Delivery', label: 'Share and save links', optional: false, run: runDeliverFinish },
];

const step = (name: string) => STEPS.find((s) => s.name === name)!;

/**
 * A competitor benchmark (marketing_audits.kind = 'benchmark'): the audit's
 * steps plus four data steps after the ad plan and its copy (they read the
 * plan's industry profile), the benchmark write-up, and a fourth PDF before the
 * slides and the summary. The data steps are optional; the write-up and its PDF
 * are not.
 */
export const BENCHMARK_STEPS: StepDefinition[] = [
  ...STEPS.slice(0, STEPS.findIndex((s) => s.name === 'adcopy') + 1),
  { name: 'social_depth', current: 'Social', label: 'Instagram posts and reels', optional: true, run: runSocialDepth },
  { name: 'ads_library', current: 'Ads', label: 'Meta Ad Library and Google Ads Transparency', optional: true, run: runAdsLibrary },
  { name: 'pricing', current: 'Site', label: 'Offers and prices', optional: true, run: runPricing },
  { name: 'authority', current: 'Search', label: 'Domain authority, press, owned channels', optional: true, run: runAuthority },
  { name: 'benchmark', current: 'Model', label: 'Scorecard, gaps and plan', optional: false, run: runBenchmark },
  step('deliver_prepare'),
  step('deliver_audit'),
  { name: 'deliver_benchmark', current: 'Delivery', label: 'Benchmark PDF', optional: false, run: runDeliverBenchmark },
  step('deliver_deck'),
  step('deliver_summary'),
  step('deliver_finish'),
];

/** Every step either kind can run, for the worker (it runs whatever rows an audit was given). */
export const ALL_STEPS: StepDefinition[] = BENCHMARK_STEPS;
