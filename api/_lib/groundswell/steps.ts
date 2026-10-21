import { GROUNDSWELL_CONFIG } from '../../../packages/groundswell/groundswell.config.js';
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
import { SUPPORTED_ROUNDS, verifySteps } from './verify.js';

/**
 * Groundswell's steps, in the order an audit runs them. The names are stored
 * in marketing_audit_steps, so renaming one strands audits already running.
 * The last step finishes the audit (deliver_finish sets it to done).
 *
 * Between the model steps and delivery, each round after the first reads the
 * figures again and checks them (verify.ts): `verification.max_rounds` in the
 * setup file sets how many rounds an audit started now gets.
 */
const GATHER_AND_MODEL: StepDefinition[] = [
  { name: 'site', current: 'Site', label: 'Website scan', optional: false, run: runSite },
  { name: 'maps', current: 'Maps', label: 'Google Maps', optional: true, run: runMaps },
  { name: 'search', current: 'Search', label: 'Search rankings (Ahrefs)', optional: true, run: runSearch },
  { name: 'keywords', current: 'Search', label: 'Keyword demand (Keyword Planner)', optional: true, run: runKeywords },
  { name: 'social', current: 'Social', label: 'Instagram', optional: true, run: runSocial },
  { name: 'ads', current: 'Ads', label: 'Ads', optional: true, run: runAds },
  { name: 'model', current: 'Model', label: 'Write-up and ROI', optional: false, run: runModel },
  { name: 'adplan', current: 'Model', label: 'Ad plan and change ranking', optional: true, run: runAdplan },
  { name: 'adcopy', current: 'Model', label: 'Ad copy', optional: true, run: runAdcopy },
];

const deliver = {
  prepare: { name: 'deliver_prepare', current: 'Delivery', label: 'Drive folder', optional: false, run: runDeliverPrepare },
  audit: { name: 'deliver_audit', current: 'Delivery', label: 'Full audit PDF', optional: false, run: runDeliverAudit },
  benchmark: { name: 'deliver_benchmark', current: 'Delivery', label: 'Benchmark PDF', optional: false, run: runDeliverBenchmark },
  deck: { name: 'deliver_deck', current: 'Delivery', label: 'Slides PDF', optional: false, run: runDeliverDeck },
  summary: { name: 'deliver_summary', current: 'Delivery', label: 'Summary PDF', optional: false, run: runDeliverSummary },
  finish: { name: 'deliver_finish', current: 'Delivery', label: 'Share and save links', optional: false, run: runDeliverFinish },
} satisfies Record<string, StepDefinition>;

const ROUNDS = GROUNDSWELL_CONFIG.verification.max_rounds;

export const STEPS: StepDefinition[] = [
  ...GATHER_AND_MODEL,
  ...verifySteps(ROUNDS),
  deliver.prepare,
  deliver.audit,
  deliver.deck,
  deliver.summary,
  deliver.finish,
];

/**
 * A competitor benchmark (marketing_audits.kind = 'benchmark'): the audit's
 * steps plus four data steps after the ad plan and its copy (they read the
 * plan's industry profile), the benchmark write-up, the checks (which review
 * the benchmark's write-up too), and a fourth PDF before the slides and the
 * summary. The data steps are optional; the write-up and its PDF are not.
 */
function benchmarkSteps(rounds: number): StepDefinition[] {
  return [
    ...GATHER_AND_MODEL,
    { name: 'social_depth', current: 'Social', label: 'Instagram posts and reels', optional: true, run: runSocialDepth },
    { name: 'ads_library', current: 'Ads', label: 'Meta Ad Library and Google Ads Transparency', optional: true, run: runAdsLibrary },
    { name: 'pricing', current: 'Site', label: 'Offers and prices', optional: true, run: runPricing },
    { name: 'authority', current: 'Search', label: 'Domain authority, press, owned channels', optional: true, run: runAuthority },
    { name: 'benchmark', current: 'Model', label: 'Scorecard, gaps and plan', optional: false, run: runBenchmark },
    ...verifySteps(rounds),
    deliver.prepare,
    deliver.audit,
    deliver.benchmark,
    deliver.deck,
    deliver.summary,
    deliver.finish,
  ];
}

export const BENCHMARK_STEPS: StepDefinition[] = benchmarkSteps(ROUNDS);

/**
 * Every step either kind can run, for the worker (it runs whatever rows an
 * audit was given), with the checks of every round the worker supports, so
 * an audit started under a larger `max_rounds` still finishes.
 */
export const ALL_STEPS: StepDefinition[] = benchmarkSteps(SUPPORTED_ROUNDS);
