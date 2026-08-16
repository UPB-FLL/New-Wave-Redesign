import { describe, expect, it } from 'vitest';
import { getRibbonQuality, RIBBON_LAYERS } from './ribbonSceneConfig';

describe('ribbon scene configuration', () => {
  it('uses the three approved colors and autonomous 18-24 second cycles', () => {
    expect(RIBBON_LAYERS.map((layer) => layer.color)).toEqual([
      '#31C6CF',
      '#62BE68',
      '#317B92',
    ]);
    expect(RIBBON_LAYERS).toHaveLength(3);
    RIBBON_LAYERS.forEach((layer) => {
      expect(layer.cycleSeconds).toBeGreaterThanOrEqual(18);
      expect(layer.cycleSeconds).toBeLessThanOrEqual(24);
      expect(layer.twist).toBeGreaterThan(0);
      expect(layer.twist).toBeLessThanOrEqual(0.7);
    });
  });

  it('reduces mobile segments and caps device pixel ratio', () => {
    expect(getRibbonQuality(390, 3)).toEqual({ segmentsX: 128, segmentsY: 12, pixelRatio: 1.25 });
    expect(getRibbonQuality(1440, 3)).toEqual({ segmentsX: 256, segmentsY: 24, pixelRatio: 1.5 });
  });
});
