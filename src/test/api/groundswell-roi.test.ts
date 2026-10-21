import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runRoiModel, runScenario, type RoiInputs } from '../../../api/_lib/groundswell/roi';

const root = path.resolve(__dirname, '../../..');
const inputs = JSON.parse(
  readFileSync(path.join(root, '.claude/skills/groundswell/examples/sample/roi_inputs.json'), 'utf8')
) as RoiInputs;
// Output of roi_model.py on the same inputs, so the port and the original cannot drift.
const pythonOutput = JSON.parse(readFileSync(path.join(__dirname, 'fixtures/groundswell-roi-sample.json'), 'utf8'));

function expectClose(actual: unknown, expected: unknown, where: string) {
  if (typeof expected === 'number') {
    expect(typeof actual, where).toBe('number');
    expect(actual as number, where).toBeCloseTo(expected, 9);
  } else if (expected === null || typeof expected !== 'object') {
    expect(actual, where).toEqual(expected);
  } else if (Array.isArray(expected)) {
    expect(Array.isArray(actual), where).toBe(true);
    expect((actual as unknown[]).length, where).toBe(expected.length);
    expected.forEach((v, i) => expectClose((actual as unknown[])[i], v, `${where}[${i}]`));
  } else {
    for (const [k, v] of Object.entries(expected)) expectClose((actual as Record<string, unknown>)[k], v, `${where}.${k}`);
  }
}

describe('Groundswell ROI model', () => {
  it('matches roi_model.py on the sample business, number for number', () => {
    const result = runRoiModel(inputs);
    expect(Object.keys(result.scenarios)).toEqual(Object.keys(pythonOutput.scenarios));
    expectClose(result, pythonOutput, 'roi');
  });

  it('reports no payback when the year never breaks even, and null ratios with no spend', () => {
    const losing = runScenario(100, { impression_share: 0.5, ctr: 0.01, cpc: 50, cvr: 0.01, close: 0.1, ticket: 10, gross_margin: 0.1 });
    expect(losing.year.payback_month).toBeNull();
    const free = runScenario(0, { impression_share: 0.5, ctr: 0.05, cpc: 5, cvr: 0.1, close: 0.5, ticket: 100, gross_margin: 0.5 });
    expect(free.steady_month.roi).toBeNull();
    expect(free.steady_month.cpl).toBeNull();
    expect(free.year.roas).toBeNull();
  });
});
