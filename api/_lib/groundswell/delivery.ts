import { getSupabaseAdmin } from '../supabaseAdmin.js';
import { isAdcopyOutput } from './adcopy.js';
import { isAdplanOutput } from './adplan.js';
import { isBenchmarkOutput } from './benchmark.js';
import { withBrowser } from './browser.js';
import { brandFrom } from './brand.js';
import { buildFacts } from './model.js';
import { assertPortalOnly, renderPdf } from './render.js';
import { REPORTS_BUCKET, safeName, storeReport, type ReportKind, type ReportRow } from './reportStore.js';
import { buildAuditHtml, buildDeckHtml, buildSummaryHtml, formatDate, PORTAL_URL, preparerFor, type ModelOutput, type ReportData } from './reports.js';
import { buildBenchmarkHtml } from './reportsBenchmark.js';
import { PermanentStepError, type StepContext } from './types.js';
import { verifiedOutputs } from './verify.js';

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
type Stored = ReportRow & { trimmed: number; broken_images: number };

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
  const branding = ctx.audit.branding;
  return {
    facts,
    model,
    brand: brandFrom(facts.site?.business, branding),
    adplan,
    adcopy,
    benchmark,
    preparer: preparerFor(branding),
    date: formatDate(new Date(model.generated_at)),
  };
}

const need = <T>(ctx: StepContext, step: string): T => {
  const out = ctx.outputs[step] as T | undefined;
  if (!out) throw new PermanentStepError(`The ${step} step has no output.`);
  return out;
};

function fileName(ctx: StepContext, title: string) {
  const model = ctx.outputs.model as ModelOutput | undefined;
  const day = (model?.generated_at ?? new Date().toISOString()).slice(0, 10);
  return `${safeName(ctx.audit.business_name)} - ${title} (${day}).pdf`;
}

/** Checks the bucket is reachable before anything is printed; the audit's reports share one prefix. */
export async function runDeliverPrepare(ctx: StepContext): Promise<Prepared> {
  const { error } = await getSupabaseAdmin().storage.from(REPORTS_BUCKET).list(ctx.audit.id, { limit: 1 });
  if (error) throw new Error(`The reports bucket "${REPORTS_BUCKET}" is not reachable: ${error.message}`);
  return { bucket: REPORTS_BUCKET, prefix: ctx.audit.id };
}

async function printAndStore(ctx: StepContext, kind: ReportKind, title: string, html: string, onePage = false): Promise<Stored> {
  need<Prepared>(ctx, 'deliver_prepare');
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

export async function runDeliverFinish(ctx: StepContext) {
  const files = (['deliver_audit', 'deliver_deck', 'deliver_summary'] as const).map((s) => need<Stored>(ctx, s));
  // Only a competitor benchmark has a fourth file.
  const bench = ctx.outputs.deliver_benchmark as Stored | undefined;
  const reports = [...files, ...(bench ? [bench] : [])].map((f) => ({ kind: f.kind, name: f.name, pages: f.pages, bytes: f.bytes }));
  const { error } = await getSupabaseAdmin()
    .from('marketing_audits')
    .update({ status: 'done', error: null, completed_at: new Date().toISOString() })
    .eq('id', ctx.audit.id);
  if (error) throw new Error(`Could not mark the audit done: ${error.message}`);
  return { reports };
}
