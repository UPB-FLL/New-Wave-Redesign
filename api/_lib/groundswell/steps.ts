import { GROUNDSWELL_CONFIG } from '../../../packages/groundswell/groundswell.config.js';
import { runAdcopy } from './adcopy.js';
import { runAdplan } from './adplan.js';
import { runBenchmark } from './benchmark.js';
import { runAdsLibrary } from './currents/adsLibrary.js';
import { runAuthority } from './currents/authority.js';
import { persistCompetitors, runCompetitors } from './currents/competitors.js';
import { runPricing } from './currents/pricing.js';
import { runSocialDepth } from './currents/socialDepth.js';
import { runAds } from './currents/ads.js';
import { runMaps } from './currents/maps.js';
import { runLinked } from './currents/linked.js';
import { runKeywords, runSearch } from './currents/search.js';
import { runSite } from './currents/site.js';
import { runSocial } from './currents/social.js';
import {
  runDeliverAudit,
  runDeliverBenchmark,
  runDeliverDeck,
  runDeliverFinish,
  runDeliverIntegrated,
  runDeliverPrepare,
  runDeliverSummary,
} from './delivery.js';
import { runModel } from './model.js';
import { runAdsets } from './adsets.js';
import { runDeliverAdsets, runDeliverCreatives } from './adsetsDelivery.js';
import { runCreative } from './creative.js';
import { runSearchTerms } from './currents/linked.js';
import { runIntegrated } from './integrated.js';
import type { StepLists } from './engine.js';
import type { StepContext, StepDefinition } from './types.js';
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
  // First, so the Site, Social and Search steps already see the picked competitors.
  { name: 'competitors', current: 'Maps', label: 'Top competitors (Google Places)', optional: true, run: runCompetitors, persist: persistCompetitors },
  { name: 'site', current: 'Site', label: 'Website scan', optional: false, run: runSite },
  { name: 'maps', current: 'Maps', label: 'Google Maps', optional: true, run: runMaps },
  { name: 'search', current: 'Search', label: 'Search rankings (Ahrefs)', optional: true, run: runSearch },
  { name: 'keywords', current: 'Search', label: 'Keyword demand (Keyword Planner)', optional: true, run: runKeywords },
  { name: 'social', current: 'Social', label: 'Instagram and Facebook', optional: true, run: runSocial },
  { name: 'ads', current: 'Ads', label: 'Ads', optional: true, run: runAds },
  { name: 'model', current: 'Model', label: 'Write-up and ROI', optional: false, run: runModel },
  { name: 'adplan', current: 'Model', label: 'Ad plan and change ranking', optional: true, run: runAdplan },
  { name: 'adcopy', current: 'Model', label: 'Ad copy', optional: true, run: runAdcopy },
];

/** A client's own accounts (phase 3); runs started before the phases had it among their public-data steps. */
const linked: StepDefinition = { name: 'linked', current: 'Accounts', label: 'Linked accounts', optional: true, run: runLinked };

const deliver = {
  prepare: { name: 'deliver_prepare', current: 'Delivery', label: 'Reports storage', optional: false, run: runDeliverPrepare },
  audit: { name: 'deliver_audit', current: 'Delivery', label: 'Full audit PDF', optional: false, run: runDeliverAudit },
  benchmark: { name: 'deliver_benchmark', current: 'Delivery', label: 'Benchmark PDF', optional: true, run: runDeliverBenchmark },
  deck: { name: 'deliver_deck', current: 'Delivery', label: 'Slides PDF', optional: false, run: runDeliverDeck },
  summary: { name: 'deliver_summary', current: 'Delivery', label: 'Summary PDF', optional: false, run: runDeliverSummary },
  creatives: { name: 'deliver_creatives', current: 'Delivery', label: 'Ad images and carousel', optional: true, run: runDeliverCreatives },
  adsets: { name: 'deliver_adsets', current: 'Delivery', label: 'Ad sets PDF and import files', optional: true, run: runDeliverAdsets },
  integrated: { name: 'deliver_integrated', current: 'Delivery', label: 'Integrated plan PDF', optional: false, run: runDeliverIntegrated },
  finish: { name: 'deliver_finish', current: 'Delivery', label: 'Finish and queue the next phase', optional: false, run: runDeliverFinish },
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
/**
 * A data step that an earlier phase's run already ran (an older benchmark
 * run read its competitors in phase 1) hands its output on instead of
 * reading again: no second round of credits for the same pages.
 */
const reuse = (step: StepDefinition): StepDefinition => ({
  ...step,
  run: (ctx: StepContext) => (ctx.inherited?.[step.name] && ctx.outputs[step.name] !== undefined ? Promise.resolve(ctx.outputs[step.name]) : step.run(ctx)),
});

const COMPETITOR_DATA: StepDefinition[] = [
  { name: 'social_depth', current: 'Social', label: 'Instagram posts and reels', optional: true, run: runSocialDepth },
  { name: 'ads_library', current: 'Ads', label: 'Meta Ad Library and Google Ads Transparency', optional: true, run: runAdsLibrary },
  { name: 'pricing', current: 'Site', label: 'Offers and prices', optional: true, run: runPricing },
  { name: 'authority', current: 'Search', label: 'Domain authority, press, owned channels', optional: true, run: runAuthority },
  { name: 'benchmark', current: 'Model', label: 'Scorecard, gaps and plan', optional: true, run: runBenchmark },
];

const creative: StepDefinition = { name: 'creative', current: 'Social', label: 'The business’s own Instagram images', optional: true, run: runCreative };
const adsets: StepDefinition = { name: 'adsets', current: 'Model', label: 'Ad sets: Meta and Google, three budgets', optional: true, run: runAdsets };

function benchmarkSteps(rounds: number): StepDefinition[] {
  return [
    ...GATHER_AND_MODEL,
    ...COMPETITOR_DATA,
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
 * Phase 2 (migration 20261029120000): the plan against competitors and the ad
 * sets, from phase 1's run (its outputs are where this run starts): the
 * competitor data, the benchmark write-up, the business's own images, the ad
 * sets; then the benchmark PDF, the ad images, the ad-sets PDF and import
 * files. Every data step is optional; something must be delivered.
 */
export const COMPETITOR_STEPS: StepDefinition[] = [
  ...COMPETITOR_DATA.map(reuse),
  creative,
  adsets,
  deliver.prepare,
  deliver.benchmark,
  deliver.creatives,
  deliver.adsets,
  deliver.finish,
];

/**
 * Phase 3: a client's own accounts (the Composio project), its search terms,
 * the plan re-priced on its figures with the findings, the ad sets again on
 * that plan; then the integrated PDF, the ad images and the ad sets.
 */
export const INTEGRATED_STEPS: StepDefinition[] = [
  linked,
  { name: 'search_terms', current: 'Accounts', label: 'Google Ads search terms', optional: true, run: runSearchTerms },
  { name: 'integrated', current: 'Model', label: 'Integrated plan', optional: false, run: runIntegrated },
  adsets,
  deliver.prepare,
  deliver.integrated,
  deliver.creatives,
  deliver.adsets,
  deliver.finish,
];

/** The step list each queued run starts with (startQueuedRuns in engine.ts). */
export const PHASE_STEPS: StepLists = { audit: STEPS, benchmark: BENCHMARK_STEPS, competitors: COMPETITOR_STEPS, integrated: INTEGRATED_STEPS };

/**
 * Every step any run can hold, for the worker (it runs whatever rows a run
 * was given): every phase, with the checks of every round the worker
 * supports (an audit started under a larger `max_rounds` still finishes),
 * and `linked` for runs started before the phases. deliver_finish comes last.
 */
export const ALL_STEPS: StepDefinition[] = (() => {
  const byName = new Map<string, StepDefinition>();
  // The phase lists first: their competitor steps carry `reuse`, which an older benchmark run (nothing inherited) never notices.
  for (const step of [...COMPETITOR_STEPS, ...INTEGRATED_STEPS, ...benchmarkSteps(SUPPORTED_ROUNDS), linked]) if (!byName.has(step.name)) byName.set(step.name, step);
  const finish = byName.get('deliver_finish')!;
  byName.delete('deliver_finish');
  return [...byName.values(), finish];
})();
