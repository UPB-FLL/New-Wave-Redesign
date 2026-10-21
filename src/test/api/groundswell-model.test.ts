import { beforeEach, describe, expect, it, vi } from 'vitest';

const openai = vi.hoisted(() => ({ chatJson: vi.fn() }));
vi.mock('../../../api/_lib/groundswell/openai', () => ({ chatJson: openai.chatJson, GROUNDSWELL_MODEL: () => 'test-model' }));

import {
  allowedNumbers,
  buildFacts,
  INCREMENTALITY,
  normalizeEstimates,
  normalizeWriteup,
  roiInputsFrom,
  runModel,
  scrubText,
  unsupportedNumbers,
} from '../../../api/_lib/groundswell/model';
import { PermanentStepError } from '../../../api/_lib/groundswell/types';
import { sampleAudit, sampleModelJson, sampleOutputs } from './fixtures/groundswell-report';

describe('numbers the write-up may use', () => {
  const allowed = allowedNumbers({ reviews: 212, rating: 4.6, followers: 1250, share: 0.82, text: 'about 2,100 visits' });

  it('accepts numbers from the data, their roundings, small counts and recent years', () => {
    expect(unsupportedNumbers('4.6 stars from 212 reviews, 1,250 followers, 82% of clicks, 2,100 visits, 3 steps in 2026', allowed)).toEqual([]);
  });

  it('flags anything else', () => {
    expect(unsupportedNumbers('Businesses like this see 47% more calls and 1,900 visits', allowed)).toEqual(['47', '1900']);
  });

  it('drops only the sentences with unsupported numbers', () => {
    const r = scrubText('It has 212 reviews. Studies show 73% of people read reviews! Post weekly.', allowed);
    expect(r.text).toBe('It has 212 reviews. Post weekly.');
    expect(r.removed).toEqual(['Studies show 73% of people read reviews!']);
  });
});

describe('normalizing the model answer', () => {
  it('keeps the expected shape and caps list lengths', () => {
    const w = normalizeWriteup({ headline: 'H', verdict: 'V', areas: { google: { working: ['a', 'b', 'c', 'd', 'e', 6] } }, extra: 'x' });
    expect(w.areas.google.working).toEqual(['a', 'b', 'c', 'd']);
    expect(w.areas.social).toEqual({ summary: '', working: [], costing: [], fixes: [] });
    expect(w).not.toHaveProperty('extra');
  });

  it('clamps and sorts estimates, and falls back on nonsense', () => {
    expect(normalizeEstimates({ ticket: [600, 300, 420], close: [0.4, 2, 0.1], gross_margin: 7 })).toMatchObject({
      ticket: [300, 420, 600],
      close: [0.1, 0.4, 0.9],
      gross_margin: 0.9,
    });
    expect(normalizeEstimates({ ticket: 'lots' }).ticket).toEqual([150, 250, 400]);
  });

  it('keeps the client and marketer flags only when they are booleans', () => {
    expect(normalizeEstimates({ is_nwse_client: true, has_current_marketer: false })).toMatchObject({ is_nwse_client: true, has_current_marketer: false });
    expect(normalizeEstimates({ is_nwse_client: 'yes' })).toMatchObject({ is_nwse_client: null, has_current_marketer: null });
  });
});

describe('ROI inputs', () => {
  const facts = buildFacts(sampleAudit, sampleOutputs());
  const est = normalizeEstimates(sampleModelJson.estimates);

  it('sums demand from the largest keywords and keeps CPC inside the planner bid range', () => {
    const plan = roiInputsFrom(facts, est)!;
    expect(plan.inputs.demand_monthly).toBe(1300 + 900 + 480);
    const { conservative, base, optimistic } = plan.inputs.scenarios;
    for (const s of [conservative, base, optimistic]) {
      expect(s.cpc).toBeGreaterThanOrEqual(4.1);
      expect(s.cpc).toBeLessThanOrEqual(12.5);
      expect(s.incrementality).toBe(INCREMENTALITY.otherwise);
    }
    expect(conservative.ticket).toBe(300);
    expect(optimistic.close).toBe(0.45);
    expect(plan.sources.length).toBe(5);
  });

  it('uses the lower incrementality when the business already ranks first', () => {
    const outputs = sampleOutputs();
    (outputs.search as { business: { top_keywords: { position: number }[] } }).business.top_keywords[0].position = 1;
    const plan = roiInputsFrom(buildFacts(sampleAudit, outputs), est)!;
    expect(plan.inputs.scenarios.base.incrementality).toBe(INCREMENTALITY.ranks_first);
  });

  it('models nothing without keyword demand', () => {
    const outputs = sampleOutputs();
    delete outputs.keywords;
    expect(roiInputsFrom(buildFacts(sampleAudit, outputs), est)).toBeNull();
  });
});

describe('runModel', () => {
  const ctx = () => ({ audit: sampleAudit, outputs: sampleOutputs(), deadline: Date.now() + 250_000, attempt: 1 });
  beforeEach(() => openai.chatJson.mockReset());

  it('writes up the data and models the return', async () => {
    openai.chatJson.mockResolvedValueOnce(sampleModelJson);
    const out = await runModel(ctx());
    expect(openai.chatJson).toHaveBeenCalledTimes(1);
    expect(out.writeup.headline).toBe(sampleModelJson.headline);
    expect(out.removed_sentences).toEqual([]);
    expect(out.roi?.scenarios.base.year.spend).toBeGreaterThan(0);
    expect(out.roi_note).toBeNull();
  });

  it('asks once for a repair when a number is invented, then drops what is still unsupported', async () => {
    const invented = { ...sampleModelJson, verdict: 'Shops like this get 63% more calls. Harbor Auto Care has 212 reviews.' };
    openai.chatJson.mockResolvedValueOnce(invented).mockResolvedValueOnce(invented);
    const out = await runModel(ctx());
    expect(openai.chatJson).toHaveBeenCalledTimes(2);
    expect(openai.chatJson.mock.calls[1][1]).toContain('63%');
    expect(out.writeup.verdict).toBe('Harbor Auto Care has 212 reviews.');
    expect(out.removed_sentences).toEqual(['Shops like this get 63% more calls.']);
  });

  it('refuses to write about a business with no data', async () => {
    await expect(runModel({ ...ctx(), outputs: {} })).rejects.toBeInstanceOf(PermanentStepError);
    expect(openai.chatJson).not.toHaveBeenCalled();
  });
});

describe('sentence splitting', () => {
  it('does not split at a decimal point', () => {
    const allowed = allowedNumbers({ rating: 4.6 });
    expect(scrubText('Rated 4.6 on Google. It grew 37% last year.', allowed).text).toBe('Rated 4.6 on Google.');
  });
});
