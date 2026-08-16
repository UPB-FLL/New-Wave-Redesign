export type RibbonLayer = {
  color: '#31C6CF' | '#62BE68' | '#317B92';
  amplitude: number;
  frequency: number;
  cycleSeconds: number;
  phase: number;
  /** Peak roll of the ribbon around its own axis, in radians. Drives the chrome highlight sweep. */
  twist: number;
  y: number;
  z: number;
  rotationZ: number;
};

export const RIBBON_LAYERS: readonly RibbonLayer[] = [
  { color: '#31C6CF', amplitude: 0.5, frequency: 1.05, cycleSeconds: 20, phase: 0, twist: 0.5, y: 1.35, z: -0.8, rotationZ: -0.08 },
  { color: '#62BE68', amplitude: 0.6, frequency: 0.9, cycleSeconds: 24, phase: 2.1, twist: 0.6, y: -0.15, z: -0.2, rotationZ: 0.1 },
  { color: '#317B92', amplitude: 0.46, frequency: 1.2, cycleSeconds: 18, phase: 4.2, twist: 0.44, y: -1.45, z: -1.25, rotationZ: -0.04 },
] as const;

export type RibbonQuality = {
  segmentsX: 128 | 256;
  segmentsY: 12 | 24;
  pixelRatio: number;
};

export function getRibbonQuality(width: number, devicePixelRatio: number): RibbonQuality {
  const compact = width < 640;
  return {
    segmentsX: compact ? 128 : 256,
    segmentsY: compact ? 12 : 24,
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
