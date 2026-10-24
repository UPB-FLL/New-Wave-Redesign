import { existsSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const openai = vi.hoisted(() => ({ chatJson: vi.fn() }));
vi.mock('../../../api/_lib/groundswell/openai', () => ({ chatJson: openai.chatJson, GROUNDSWELL_MODEL: () => 'test-model' }));

import { COPY_SYSTEM, copyInput, isAdcopyOutput, runAdcopy, type AdcopyOutput } from '../../../api/_lib/groundswell/adcopy';
import { buildFacts } from '../../../api/_lib/groundswell/model';
import { buildAuditHtml, buildDeckHtml, buildSummaryHtml } from '../../../api/_lib/groundswell/reports';
import { BENCHMARK_STEPS, STEPS } from '../../../api/_lib/groundswell/steps';
import { PermanentStepError } from '../../../api/_lib/groundswell/types';
import { STEP_LABELS } from '../../../src/lib/groundswell';
import { GROUNDSWELL_CONFIG } from '../../../packages/groundswell/groundswell.config';
import { copyTargets, type CopyTarget } from '../../../packages/groundswell/src/adcopy';
import { sampleAdplanOutput, sampleAudit, sampleModelOutput, sampleOutputs, sampleReportDataWithPlan } from './fixtures/groundswell-report';

const AUDIT = 'https://www.newwaveitfl.com/groundswell';
const DECK = 'https://www.newwaveitfl.com/groundswell';
const FOLDER = 'https://www.newwaveitfl.com/groundswell';

const plan = sampleAdplanOutput();
const targets = copyTargets(plan.plan, plan.angles);
const outputs = () => ({ ...sampleOutputs(), model: sampleModelOutput(), adplan: plan });
const ctx = (o: Record<string, unknown>) => ({ audit: sampleAudit, outputs: o, deadline: Date.now() + 200_000, attempt: 1 });

// 10 is a small count the write-up's guard always allows; ad copy may not invent it.
const BAD = 'Save 10%';
/** A valid ad for a target, at each field's minimum; its optional fields quote a number the data does not show. */
function adFor(t: CopyTarget) {
  const spec = GROUNDSWELL_CONFIG.platforms[t.platform].template.fields;
  const fields: Record<string, string | string[]> = {};
  for (const [name, rule] of Object.entries(spec)) {
    const min = rule.min_count ?? 1;
    if (!min) {
      fields[name] = BAD;
      continue;
    }
    const lines = Array.from({ length: min }, (_, i) => `${t.angle} ${name} ${['one', 'two', 'three', 'four'][i]}`.slice(0, rule.max_chars));
    fields[name] = (rule.max_count ?? 1) > 1 ? lines : lines[0];
  }
  return { angle_id: t.angle_id, platform: t.platform, fields, targeting: t.buying === 'search' ? '' : 'Drivers nearby', call_to_action: 'Book a visit' };
}

describe('where the step runs', () => {
  it('runs after the ad plan, optional, in audits and benchmarks alike', () => {
    const names = STEPS.map((s) => s.name);
    expect(names.indexOf('adcopy')).toBe(names.indexOf('adplan') + 1);
    expect(STEPS.find((s) => s.name === 'adcopy')?.optional).toBe(true);
    const bench = BENCHMARK_STEPS.map((s) => s.name);
    expect(bench.slice(bench.indexOf('adplan'), bench.indexOf('adplan') + 4)).toEqual(['adplan', 'adcopy', 'plans', 'social_depth']);
    expect(STEP_LABELS.adcopy).toBe('Ad copy');
  });
});

describe('the ad-copy step', () => {
  beforeEach(() => openai.chatJson.mockReset());

  it('sends only the business\'s own facts and each ad\'s limits', () => {
    const input = copyInput(buildFacts(sampleAudit, outputs()), targets, GROUNDSWELL_CONFIG);
    const text = JSON.stringify(input);
    expect(text).not.toMatch(/Bayside|Coastline/);
    expect(input.ads.map((a) => [a.angle_id, a.platform])).toEqual(targets.map((t) => [t.angle_id, t.platform]));
    const google = input.ads.find((a) => a.platform === 'google_search');
    if (google) expect(google.fields.headlines).toEqual({ max_chars: 30, min: 3, max: 15 });
    for (const claim of GROUNDSWELL_CONFIG.unsupported_claims) expect(COPY_SYSTEM).toContain(claim);
  });

  it('writes an ad for every row the plan runs, and drops a number the data does not show, even a small one', async () => {
    expect(targets.length).toBeGreaterThan(0);
    openai.chatJson.mockResolvedValue({ ads: targets.map(adFor) });
    const out = await runAdcopy(ctx(outputs()));
    expect(out.model).toBe('test-model');
    expect(out.ads.map((a) => [a.angle_id, a.platform])).toEqual(targets.map((t) => [t.angle_id, t.platform]));
    expect(out.not_written).toEqual([]);
    expect(JSON.stringify(out.ads)).not.toMatch(/10%/);
    const optional = targets.flatMap((t) => Object.values(GROUNDSWELL_CONFIG.platforms[t.platform].template.fields).filter((r) => r.min_count === 0));
    expect(optional.length).toBeGreaterThan(0);
    expect(out.dropped.filter((d) => /"Save 10%" \(uses 10, which the data does not show\)/.test(d))).toHaveLength(optional.length);
    expect(isAdcopyOutput(out)).toBe(true);
  });

  it('is skipped without an ad plan, or when the plan runs no rows', async () => {
    await expect(runAdcopy(ctx({ ...outputs(), adplan: undefined }))).rejects.toBeInstanceOf(PermanentStepError);
    const skipped = { ...plan, plan: { ...plan.plan, rows: plan.plan.rows.map((r) => ({ ...r, recommendation: 'skip' as const })) } };
    await expect(runAdcopy(ctx({ ...outputs(), adplan: skipped }))).rejects.toThrow(/runs no rows/);
    expect(openai.chatJson).not.toHaveBeenCalled();
  });
});

function sampleCopy(): AdcopyOutput {
  const t = targets[0];
  return {
    model: 'test-model',
    generated_at: '2026-10-21T12:00:00.000Z',
    ads: [
      {
        platform: t.platform,
        angle_id: t.angle_id,
        angle: t.angle,
        platform_label: t.platform_label,
        recommendation: t.recommendation,
        format: GROUNDSWELL_CONFIG.platforms[t.platform].template.format,
        limits_source: 'Platform help (2026)',
        fields: t.platform === 'google_search' ? { headlines: ['Brakes <checked> today', 'Book online', 'Same-day quotes'], descriptions: ['One', 'Two'] } : { primary_text: 'Brakes <checked> today', headline: 'Book online' },
        targeting: 'Keywords: brake repair near me',
        call_to_action: 'Book a visit',
      },
    ],
    not_written: [{ angle: 'Car ac repair', platform_label: 'Meta (Facebook and Instagram)', reason: 'No copy came back for this row.' }],
    dropped: [],
  };
}

describe('the full audit', () => {
  it('shows each ad after the plan, escaped, with its limits and the rows left unwritten', () => {
    const html = buildAuditHtml({ ...sampleReportDataWithPlan(), adcopy: sampleCopy() });
    expect(html).toContain('11 · Ad copy');
    expect(html).toContain('Ad copy, ready to paste');
    expect(html).toContain('Brakes &lt;checked&gt; today');
    expect(html).not.toContain('Brakes <checked> today');
    expect(html).toMatch(/up to \d+ characters/);
    expect(html).toContain('Car ac repair on Meta (Facebook and Instagram): No copy came back for this row.');
    expect(html).toContain('12 · Sources');
  });

  it('leaves the audit as it was without copy, or without a plan to go with it', () => {
    const plain = buildAuditHtml(sampleReportDataWithPlan());
    expect(plain).not.toContain('Ad copy, ready to paste');
    expect(plain).toContain('11 · Sources');
    const noPlan = buildAuditHtml({ ...sampleReportDataWithPlan(), adplan: null, adcopy: sampleCopy() });
    expect(noPlan).not.toContain('Ad copy, ready to paste');
  });

  const chromium = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
  it.skipIf(!existsSync(chromium))('prints with no links, and leaves the slides at twelve and the summary at one page', async () => {
    process.env.CHROMIUM_PATH = chromium;
    const { withBrowser } = await import('../../../api/_lib/groundswell/browser');
    const { renderPdf } = await import('../../../api/_lib/groundswell/render');
    const data = { ...sampleReportDataWithPlan(), adcopy: sampleCopy() };
    const [audit, plainAudit, deck, summary] = await withBrowser(async (browser) => [
      await renderPdf(browser, buildAuditHtml(data)),
      await renderPdf(browser, buildAuditHtml(sampleReportDataWithPlan())),
      await renderPdf(browser, buildDeckHtml(data, { audit: AUDIT })),
      await renderPdf(browser, buildSummaryHtml(data, { deck: DECK, audit: AUDIT, folder: FOLDER })),
    ]);
    expect(audit.links).toEqual([]);
    expect(audit.pages).toBeGreaterThan(plainAudit.pages);
    expect(deck.pages).toBe(12);
    expect(summary.pages).toBe(1);
  }, 120_000);
});
