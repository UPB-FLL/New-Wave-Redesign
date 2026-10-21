import { runAdplan } from './adplan.js';
import { runAds } from './currents/ads.js';
import { runMaps } from './currents/maps.js';
import { runKeywords, runSearch } from './currents/search.js';
import { runSite } from './currents/site.js';
import { runSocial } from './currents/social.js';
import {
  runDeliverAudit,
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
  { name: 'deliver_prepare', current: 'Delivery', label: 'Drive folder', optional: false, run: runDeliverPrepare },
  { name: 'deliver_audit', current: 'Delivery', label: 'Full audit PDF', optional: false, run: runDeliverAudit },
  { name: 'deliver_deck', current: 'Delivery', label: 'Slides PDF', optional: false, run: runDeliverDeck },
  { name: 'deliver_summary', current: 'Delivery', label: 'Summary PDF', optional: false, run: runDeliverSummary },
  { name: 'deliver_finish', current: 'Delivery', label: 'Share and save links', optional: false, run: runDeliverFinish },
];
