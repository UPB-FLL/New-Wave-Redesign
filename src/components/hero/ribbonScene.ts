import * as THREE from 'three';
import {
  getRibbonQuality,
  RIBBON_LAYERS,
  type RibbonSceneController,
  type RibbonSceneOptions,
} from './ribbonSceneConfig';

const vertexShader = `
  uniform float uTime;
  uniform float uAmplitude;
  uniform float uFrequency;
  uniform float uPhase;
  varying vec2 vUv;
  varying float vLift;

  void main() {
    vUv = uv;
    vec3 displaced = position;
    float travel = displaced.x * uFrequency + uTime + uPhase;
    float primary = sin(travel) * uAmplitude;
    float secondary = sin(travel * 0.48 - uTime * 0.7) * uAmplitude * 0.32;
    displaced.y += secondary;
    displaced.z += primary;
    vLift = primary;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uDepthFade;
  varying vec2 vUv;
  varying float vLift;

  void main() {
    float sideFade = smoothstep(0.0, 0.12, vUv.x) * (1.0 - smoothstep(0.88, 1.0, vUv.x));
    float widthFade = smoothstep(0.0, 0.18, vUv.y) * (1.0 - smoothstep(0.82, 1.0, vUv.y));
    float edgeDistance = min(vUv.y, 1.0 - vUv.y);
    float edgeHighlight = 1.0 - smoothstep(0.02, 0.14, edgeDistance);
    float liftLight = 0.88 + clamp(vLift * 0.22, -0.08, 0.12);
    vec3 color = uColor * liftLight + edgeHighlight * 0.08;
    float alpha = sideFade * (0.12 + widthFade * 0.88) * uOpacity * uDepthFade;
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

const CAMERA_Z = 8;
const DEPTH_FADES = [0.86, 0.93, 1] as const;

function getRibbonDepthComposition(layerDepths: readonly number[], cameraZ: number) {
  const composition: Array<{ renderOrder: number; depthFade: number }> = [];
  const farthestFirst = layerDepths
    .map((z, index) => ({ distance: Math.abs(cameraZ - z), index }))
    .sort((a, b) => b.distance - a.distance || a.index - b.index);

  farthestFirst.forEach(({ index }, renderOrder) => {
    composition[index] = { renderOrder, depthFade: DEPTH_FADES[renderOrder] ?? 1 };
  });

  return composition;
}

export type FrameScheduler = {
  request: (callback: FrameRequestCallback) => number;
  cancel: (handle: number) => void;
  now: () => number;
};

export type RibbonSceneDependencies = {
  three: typeof THREE;
  scheduler: FrameScheduler;
};

const defaultDependencies: RibbonSceneDependencies = {
  three: THREE,
  scheduler: {
    request: (callback) => window.requestAnimationFrame(callback),
    cancel: (handle) => window.cancelAnimationFrame(handle),
    now: () => performance.now(),
  },
};

export function createRibbonScene(
  canvas: HTMLCanvasElement,
  options: RibbonSceneOptions,
  dependencies: RibbonSceneDependencies = defaultDependencies,
): RibbonSceneController {
  const { scheduler, three } = dependencies;
  const renderer = new three.WebGLRenderer({ alpha: true, canvas });
  const scene = new three.Scene();
  const camera = new three.PerspectiveCamera(42, 1, 0.1, 100);
  const group = new three.Group();
  const initialQuality = getRibbonQuality(options.compact ? 0 : 640, 1);
  const depthComposition = getRibbonDepthComposition(
    RIBBON_LAYERS.map((layer) => layer.z),
    CAMERA_Z,
  );
  const geometries: THREE.PlaneGeometry[] = [];
  const materials: THREE.ShaderMaterial[] = [];
  const timeUniforms: Array<{ value: number }> = [];

  renderer.setClearColor(0x000000, 0);
  camera.position.set(0, 0, CAMERA_Z);
  group.position.x = options.compact ? 1.0 : 2.2;
  scene.add(group);

  RIBBON_LAYERS.forEach((layer, index) => {
    const geometry = new three.PlaneGeometry(14, 2.2, initialQuality.segmentsX, initialQuality.segmentsY);
    const uniforms = {
      uTime: { value: 0 },
      uAmplitude: { value: layer.amplitude },
      uFrequency: { value: layer.frequency },
      uPhase: { value: layer.phase },
      uColor: { value: new three.Color(layer.color) },
      uOpacity: { value: layer.opacity },
      uDepthFade: { value: depthComposition[index].depthFade },
    };
    const material = new three.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      side: three.DoubleSide,
      depthWrite: false,
      depthTest: true,
      blending: three.NormalBlending,
    });
    const mesh = new three.Mesh(geometry, material);

    mesh.position.set(0, layer.y, layer.z);
    mesh.rotation.z = layer.rotationZ;
    mesh.renderOrder = depthComposition[index].renderOrder;
    group.add(mesh);
    geometries.push(geometry);
    materials.push(material);
    timeUniforms.push(uniforms.uTime);
  });

  let animationFrame: number | undefined;
  let accumulatedTime = 0;
  let disposed = false;
  let firstFrameRendered = false;
  let lastTimestamp: number | undefined;
  let running = false;
  let terminal = false;

  const stop = () => {
    if (!running) return;

    running = false;
    lastTimestamp = undefined;
    if (animationFrame !== undefined) {
      scheduler.cancel(animationFrame);
      animationFrame = undefined;
    }
  };

  const markTerminal = () => {
    stop();
    if (terminal || disposed) return;

    terminal = true;
    options.onContextLost();
  };

  const renderFrame = (timestamp: number) => {
    animationFrame = undefined;
    if (!running || disposed || terminal) return;

    const elapsed = lastTimestamp === undefined ? 0 : (timestamp - lastTimestamp) / 1000;
    accumulatedTime += Math.min(Math.max(elapsed, 0), 0.05);
    lastTimestamp = timestamp;

    timeUniforms.forEach((uniform, index) => {
      uniform.value = accumulatedTime * ((Math.PI * 2) / RIBBON_LAYERS[index].cycleSeconds);
    });

    try {
      renderer.render(scene, camera);
      if (!firstFrameRendered) {
        firstFrameRendered = true;
        options.onFirstFrame();
      }
    } catch {
      markTerminal();
      return;
    }

    if (running && !disposed && !terminal) {
      try {
        animationFrame = scheduler.request(renderFrame);
      } catch {
        markTerminal();
      }
    }
  };

  const onContextLost = (event: Event) => {
    event.preventDefault();
    markTerminal();
  };

  canvas.addEventListener('webglcontextlost', onContextLost);

  return {
    resize: (width, height, devicePixelRatio) => {
      if (disposed || terminal) return;

      const quality = getRibbonQuality(width, devicePixelRatio);
      const safeHeight = Math.max(height, 1);
      renderer.setPixelRatio(quality.pixelRatio);
      renderer.setSize(Math.max(width, 1), safeHeight, false);
      camera.aspect = Math.max(width, 1) / safeHeight;
      camera.updateProjectionMatrix();
    },
    start: () => {
      if (disposed || running || terminal) return;

      running = true;
      lastTimestamp = scheduler.now();
      try {
        animationFrame = scheduler.request(renderFrame);
      } catch {
        markTerminal();
      }
    },
    stop,
    dispose: () => {
      if (disposed) return;

      stop();
      disposed = true;
      canvas.removeEventListener('webglcontextlost', onContextLost);
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      renderer.dispose();
    },
  };
}
