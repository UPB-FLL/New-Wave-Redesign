export type RibbonLayer = {
  color: '#31C6CF' | '#62BE68' | '#317B92';
  amplitude: number;
  frequency: number;
  cycleSeconds: number;
  phase: number;
  y: number;
  z: number;
  rotationZ: number;
  opacity: number;
};

export const RIBBON_LAYERS: readonly RibbonLayer[] = [
  { color: '#31C6CF', amplitude: 0.46, frequency: 1.25, cycleSeconds: 20, phase: 0, y: 1.35, z: -0.8, rotationZ: -0.08, opacity: 0.34 },
  { color: '#62BE68', amplitude: 0.56, frequency: 1.05, cycleSeconds: 24, phase: 2.1, y: -0.15, z: -0.2, rotationZ: 0.1, opacity: 0.28 },
  { color: '#317B92', amplitude: 0.42, frequency: 1.45, cycleSeconds: 18, phase: 4.2, y: -1.45, z: -1.25, rotationZ: -0.04, opacity: 0.38 },
] as const;

export type RibbonQuality = {
  segmentsX: 64 | 128;
  segmentsY: 4 | 8;
  pixelRatio: number;
};

export function getRibbonQuality(width: number, devicePixelRatio: number): RibbonQuality {
  const compact = width < 640;
  return {
    segmentsX: compact ? 64 : 128,
    segmentsY: compact ? 4 : 8,
    pixelRatio: Math.min(devicePixelRatio, compact ? 1.25 : 1.5),
  };
}

export type RibbonSceneOptions = {
  compact: boolean;
  onFirstFrame: () => void;
  onContextLost: () => void;
};

export type RibbonSceneController = {
  resize: (width: number, height: number, devicePixelRatio: number) => void;
  start: () => void;
  stop: () => void;
  dispose: () => void;
};

export type RibbonSceneFactory = (
  canvas: HTMLCanvasElement,
  options: RibbonSceneOptions,
) => RibbonSceneController;
