import { getSupabaseAdmin } from '../supabaseAdmin.js';
import { isAdcopyOutput } from './adcopy.js';
import { isAdplanOutput } from './adplan.js';
import { isBenchmarkOutput } from './benchmark.js';
import { withBrowser } from './browser.js';
import { brandFrom } from './brand.js';
import { gapsFor } from './gaps.js';
import { buildFacts } from './model.js';
import { assertPortalOnly, renderPdf } from './render.js';
import { REPORTS_BUCKET, safeName, storeReport, type ReportKind, type ReportRow } from './reportStore.js';
import { buildAuditHtml, buildDeckHtml, buildSummaryHtml, formatDate, PORTAL_URL, preparerFor, type ModelOutput, type ReportData } from './reports.js';
import { buildBenchmarkHtml } from './reportsBenchmark.js';
import { PermanentStepError, type StepContext } from './types.js';
import { verifiedOutputs } from './verify.js';
import { PHASE_INFO, type Phase } from '../../../src/lib/groundswellValidation.js';
import { isAdsetsOutput, type AdsetsOutput } from './adsets.js';
import { isPlansOutput } from './plans.js';
import { isPresenceOutput } from './presence.js';
import type { AdsetsDelivery } from './adsetsDelivery.js';
import { isLinkedOutput } from './currents/linked.js';
import type { SiteScan } from './currents/site.js';
import { isIntegratedOutput, type IntegratedOutput } from './integrated.js';
import { queueNextPhase } from './phases.js';
import { buildIntegratedHtml } from './reportsIntegrated.js';

/**
 * Delivery Current. Each report is printed and stored in the private
 * reports bucket (reportStore.ts): the full audit, the competitive benchmark
 * when the audit is one, the slides, then the one-page summary. Reports link
 * only to the Groundswell portal, where a partner sees its own audits and an
 * admin sees all. The last step marks the audit done.
 */

interface Prepared {
  bucket: string;
  prefix: string;
}
export type Stored = ReportRow & { trimmed: number; broken_images: number };

export function reportData(ctx: StepContext): ReportData {
  // The checks' replacements (the reviewed write-up; a later read, when that is the one that held up).
  const outputs = verifiedOutputs(ctx.outputs);
  const model = outputs.model as ModelOutput | undefined;
  if (!model) throw new PermanentStepError('The write-up is missing, so the reports cannot be built.');
  const facts = buildFacts(ctx.audit, outputs);
  // An audit started before the ad-plan step existed, or one whose step was skipped, has no plan.
  const adplan = isAdplanOutput(outputs.adplan) ? outputs.adplan : null;
  const adcopy = isAdcopyOutput(outputs.adcopy) ? outputs.adcopy : null;
  const benchmark = isBenchmarkOutput(outputs.benchmark) ? outputs.benchmark : null;
  const plans = isPlansOutput(outputs.plans) ? outputs.plans : null;
  const presence = isPresenceOutput(outputs.presence) ? outputs.presence : null;
  const branding = ctx.audit.branding;
  return {
    facts,
    model,
    brand: brandFrom(facts.site?.business, branding),
    adplan,
    adcopy,
    benchmark,
    plans,
    presence,
    preparer: preparerFor(branding),
    date: formatDate(new Date(model.generated_at)),
    gaps: gapsFor(outputs, ctx.steps),
  };
}

const need = <T>(ctx: StepContext, step: string): T => {
  const out = ctx.outputs[step] as T | undefined;
  if (!out) throw new PermanentStepError(`The ${step} step has no output.`);
  return out;
};

/** A report's file name: the business, the title, and the day (phase 1's write-up; a later phase's own run). */
export function fileName(ctx: StepContext, title: string, extension = 'pdf') {
  const model = ctx.outputs.model as ModelOutput | undefined;
  const phase1 = (ctx.audit.phase ?? 'audit') === 'audit';
  const day = ((phase1 ? model?.generated_at : null) ?? new Date().toISOString()).slice(0, 10);
  return `${safeName(ctx.audit.business_name)} - ${title} (${day}).${extension}`;
}

/** An output this run made itself (not one an earlier phase's run handed down). */
export const own = <T>(ctx: StepContext, step: string): T | undefined => (ctx.inherited?.[step] ? undefined : (ctx.outputs[step] as T | undefined));

/** Checks the bucket is reachable before anything is printed; the audit's reports share one prefix. */
export async function runDeliverPrepare(ctx: StepContext): Promise<Prepared> {
  const { error } = await getSupabaseAdmin().storage.from(REPORTS_BUCKET).list(ctx.audit.id, { limit: 1 });
  if (error) throw new Error(`The reports bucket "${REPORTS_BUCKET}" is not reachable: ${error.message}`);
  return { bucket: REPORTS_BUCKET, prefix: ctx.audit.id };
}

export async function printAndStore(ctx: StepContext, kind: ReportKind, title: string, html: string, onePage = false): Promise<Stored> {
  if (!own<Prepared>(ctx, 'deliver_prepare')) throw new PermanentStepError('The deliver_prepare step has no output.');
  const name = fileName(ctx, title);
  const pdf = await withBrowser((browser) => renderPdf(browser, html));
  assertPortalOnly(name, pdf.links);
  if (onePage && pdf.pages !== 1) throw new Error(`${name} printed on ${pdf.pages} pages instead of one.`);
  const row = await storeReport(getSupabaseAdmin(), { audit_id: ctx.audit.id, kind, name, pages: pdf.pages, bytes: pdf.bytes.length }, pdf.bytes);
  return { ...row, trimmed: pdf.trimmed, broken_images: pdf.brokenImages };
}

export async function runDeliverAudit(ctx: StepContext): Promise<Stored> {
  return printAndStore(ctx, 'audit', 'Full Marketing Audit', buildAuditHtml(reportData(ctx)));
}

export async function runDeliverBenchmark(ctx: StepContext): Promise<Stored> {
  const d = reportData(ctx);
  if (!d.benchmark) throw new PermanentStepError('The benchmark write-up is missing, so the benchmark PDF cannot be built.');
  return printAndStore(ctx, 'benchmark', 'Competitive Benchmark', buildBenchmarkHtml({ facts: d.facts, brand: d.brand, date: d.date, benchmark: d.benchmark, preparer: d.preparer }));
}

export async function runDeliverDeck(ctx: StepContext): Promise<Stored> {
  need<Stored>(ctx, 'deliver_audit');
  return printAndStore(ctx, 'deck', 'Marketing Audit Slides', buildDeckHtml(reportData(ctx), { audit: PORTAL_URL }));
}

export async function runDeliverSummary(ctx: StepContext): Promise<Stored> {
  need<Stored>(ctx, 'deliver_audit');
  need<Stored>(ctx, 'deliver_deck');
  const html = buildSummaryHtml(reportData(ctx), { deck: PORTAL_URL, audit: PORTAL_URL, folder: PORTAL_URL });
  return printAndStore(ctx, 'summary', 'Marketing Audit Summary', html, true);
}

export async function runDeliverIntegrated(ctx: StepContext): Promise<Stored> {
  const x = own<IntegratedOutput>(ctx, 'integrated');
  const linked = ctx.outputs.linked;
  if (!isIntegratedOutput(x) || !isLinkedOutput(linked)) throw new PermanentStepError('The integrated plan is missing, so its PDF cannot be built.');
  const site = (ctx.outputs.site as { business?: SiteScan | null } | undefined)?.business;
  const adsets = own<AdsetsOutput>(ctx, 'adsets');
  return printAndStore(
    ctx,
    'integrated',
    'Integrated Plan',
    buildIntegratedHtml({
      business: ctx.audit.business_name,
      website: ctx.audit.website,
      brand: brandFrom(site, ctx.audit.branding),
      date: formatDate(new Date(x.generated_at)),
      integrated: x,
      linked,
      adsets: isAdsetsOutput(adsets) ? adsets : null,
      preparer: preparerFor(ctx.audit.branding),
    })
  );
}

/** The files each phase must deliver before it is done; anything else delivered is listed too. */
const REQUIRED: Record<Phase, string[]> = {
  audit: ['deliver_audit', 'deliver_deck', 'deliver_summary'],
  competitors: [],
  integrated: ['deliver_integrated'],
};

export async function runDeliverFinish(ctx: StepContext) {
  const phase: Phase = ctx.audit.phase ?? 'audit';
  const required = REQUIRED[phase].map((s) => {
    const out = own<Stored>(ctx, s);
    if (!out) throw new PermanentStepError(`The ${s} step has no output.`);
    return out;
  });
  // Every report this run printed itself: never one an earlier phase handed down.
  const optional = ['deliver_benchmark', 'deliver_adsets'].map((s) => own<Stored | AdsetsDelivery>(ctx, s)).filter((x): x is Stored | AdsetsDelivery => Boolean(x));
  const stored = [...required, ...optional.map((x) => ('report' in x ? x.report : x))];
  if (!stored.length) {
    const missing: string[] = [];
    if (!ctx.audit.source_audit_id) missing.push('The growth audit is missing. Start a fresh growth audit, or queue this run again to rebuild its research.');
    else if (!ctx.outputs.model) missing.push('The growth audit write-up is missing. Start a fresh growth audit from the customer workspace before retrying this phase.');
    if (!ctx.audit.competitors.length) missing.push('No competitor has been verified. Confirm at least one relevant competitor before running the competitor plan.');
    if (!isAdplanOutput(ctx.outputs.adplan)) missing.push('A verified ad plan is unavailable. Recover keyword demand and its geographic scope before building budgeted ad sets.');
    return {
      hold: `${PHASE_INFO[phase].title} needs review: no new report could be printed. ${missing.length ? missing.join(' ') : 'Review the skipped report steps and recover their missing inputs before queuing this phase again.'}`,
      reports: [], exports: [],
    };
  }
  const reports = stored.map((f) => ({ kind: f.kind, name: f.name, pages: f.pages, bytes: f.bytes }));
  const exports = optional.flatMap((x) => ('exports' in x ? x.exports.map((e) => ({ name: e.name, bytes: e.bytes })) : []));
  const db = getSupabaseAdmin();
  const { error } = await db.from('marketing_audits').update({ status: 'done', error: null, completed_at: new Date().toISOString() }).eq('id', ctx.audit.id);
  if (error) throw new Error(`Could not mark the audit done: ${error.message}`);
  // Full auto: the next phase is queued as this one finishes; a reason it is not never fails the delivery.
  const next = await queueNextPhase(db, ctx.audit);
  return { reports, exports, next };
}
