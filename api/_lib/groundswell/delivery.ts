import { getSupabaseAdmin } from '../supabaseAdmin.js';
import { isAdcopyOutput } from './adcopy.js';
import { isAdplanOutput } from './adplan.js';
import type { BenchmarkOutput } from './benchmark.js';
import { withBrowser } from './browser.js';
import { brandFrom } from './brand.js';
import {
  checkAccount,
  CUSTOMERS_FOLDER,
  ensureFolder,
  fileLink,
  folderLink,
  safeName,
  shareAnyoneReader,
  uploadPdf,
  verifyShared,
} from './drive.js';
import { buildFacts } from './model.js';
import { assertDriveOnly, renderPdf } from './render.js';
import { buildAuditHtml, buildDeckHtml, buildSummaryHtml, formatDate, type ModelOutput, type ReportData } from './reports.js';
import { buildBenchmarkHtml } from './reportsBenchmark.js';
import { PermanentStepError, type StepContext } from './types.js';

/**
 * Delivery Current. Drive ids only exist once a file is uploaded, so the
 * reports go up in link order: the full audit (no links), the competitive
 * benchmark when the audit is one (no links), then the slides (link the
 * audit), then the summary (links the slides, audit and folder).
 * The last step shares everything, verifies it, and writes the links back.
 */

interface Prepared {
  folder_id: string;
  customers_id: string;
  owner: string;
}
interface Uploaded {
  file_id: string;
  name: string;
  pages: number;
  bytes: number;
  trimmed: number;
  broken_images: number;
}

function reportData(ctx: StepContext): ReportData {
  const model = ctx.outputs.model as ModelOutput | undefined;
  if (!model) throw new PermanentStepError('The write-up is missing, so the reports cannot be built.');
  const facts = buildFacts(ctx.audit, ctx.outputs);
  // An audit started before the ad-plan step existed, or one whose step was skipped, has no plan.
  const adplan = isAdplanOutput(ctx.outputs.adplan) ? ctx.outputs.adplan : null;
  const adcopy = isAdcopyOutput(ctx.outputs.adcopy) ? ctx.outputs.adcopy : null;
  const benchmark = isBenchmarkOutput(ctx.outputs.benchmark) ? ctx.outputs.benchmark : null;
  return { facts, model, brand: brandFrom(facts.site?.business), adplan, adcopy, benchmark, date: formatDate(new Date(model.generated_at)) };
}

/** True for a usable benchmark step output (only a competitor benchmark has one). */
export function isBenchmarkOutput(x: unknown): x is BenchmarkOutput {
  const o = x as Partial<BenchmarkOutput> | null | undefined;
  return Boolean(o && Array.isArray(o.scorecard) && Array.isArray(o.accounts) && o.writeup);
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

export async function runDeliverPrepare(ctx: StepContext): Promise<Prepared> {
  const owner = await checkAccount();
  const customers_id = await ensureFolder(CUSTOMERS_FOLDER, 'root');
  const folder_id = await ensureFolder(safeName(ctx.audit.business_name), customers_id);
  return { folder_id, customers_id, owner };
}

async function printAndUpload(ctx: StepContext, title: string, html: string, onePage = false): Promise<Uploaded> {
  const { folder_id } = need<Prepared>(ctx, 'deliver_prepare');
  const name = fileName(ctx, title);
  const pdf = await withBrowser((browser) => renderPdf(browser, html));
  assertDriveOnly(name, pdf.links);
  if (onePage && pdf.pages !== 1) throw new Error(`${name} printed on ${pdf.pages} pages instead of one.`);
  const file_id = await uploadPdf(name, pdf.bytes, folder_id);
  return { file_id, name, pages: pdf.pages, bytes: pdf.bytes.length, trimmed: pdf.trimmed, broken_images: pdf.brokenImages };
}

export async function runDeliverAudit(ctx: StepContext): Promise<Uploaded> {
  return printAndUpload(ctx, 'Full Marketing Audit', buildAuditHtml(reportData(ctx)));
}

export async function runDeliverBenchmark(ctx: StepContext): Promise<Uploaded> {
  const d = reportData(ctx);
  if (!d.benchmark) throw new PermanentStepError('The benchmark write-up is missing, so the benchmark PDF cannot be built.');
  return printAndUpload(ctx, 'Competitive Benchmark', buildBenchmarkHtml({ facts: d.facts, brand: d.brand, date: d.date, benchmark: d.benchmark }));
}

export async function runDeliverDeck(ctx: StepContext): Promise<Uploaded> {
  const audit = need<Uploaded>(ctx, 'deliver_audit');
  return printAndUpload(ctx, 'Marketing Audit Slides', buildDeckHtml(reportData(ctx), { audit: fileLink(audit.file_id) }));
}

export async function runDeliverSummary(ctx: StepContext): Promise<Uploaded> {
  const { folder_id } = need<Prepared>(ctx, 'deliver_prepare');
  const audit = need<Uploaded>(ctx, 'deliver_audit');
  const deck = need<Uploaded>(ctx, 'deliver_deck');
  const html = buildSummaryHtml(reportData(ctx), {
    deck: fileLink(deck.file_id),
    audit: fileLink(audit.file_id),
    folder: folderLink(folder_id),
  });
  return printAndUpload(ctx, 'Marketing Audit Summary', html, true);
}

export async function runDeliverFinish(ctx: StepContext) {
  const { folder_id } = need<Prepared>(ctx, 'deliver_prepare');
  const files = (['deliver_audit', 'deliver_deck', 'deliver_summary'] as const).map((s) => need<Uploaded>(ctx, s));
  // Only a competitor benchmark has a fourth file; an audit's update never names the column.
  const bench = ctx.outputs.deliver_benchmark as Uploaded | undefined;
  for (const id of [folder_id, ...files.map((f) => f.file_id), ...(bench ? [bench.file_id] : [])]) await shareAnyoneReader(id);
  await verifyShared(folder_id);
  for (const f of [...files, ...(bench ? [bench] : [])]) await verifyShared(f.file_id, folder_id);

  const [audit, deck, summary] = files;
  const links = {
    drive_folder_url: folderLink(folder_id),
    audit_pdf_url: fileLink(audit.file_id),
    deck_pdf_url: fileLink(deck.file_id),
    summary_pdf_url: fileLink(summary.file_id),
    ...(bench ? { benchmark_pdf_url: fileLink(bench.file_id) } : {}),
  };
  const { error } = await getSupabaseAdmin()
    .from('marketing_audits')
    .update({ ...links, status: 'done', error: null, completed_at: new Date().toISOString() })
    .eq('id', ctx.audit.id);
  if (error) throw new Error(`Could not save the Drive links: ${error.message}`);
  return links;
}
