import * as THREE from 'three';
import {
  getRibbonQuality,
  RIBBON_LAYERS,
  type RibbonSceneController,
  type RibbonSceneOptions,
} from './ribbonSceneConfig';

const RIBBON_WIDTH = 14;
const RIBBON_HEIGHT = 2.2;

const vertexShader = `
  uniform float uTime;
  uniform float uAmplitude;
  uniform float uFrequency;
  uniform float uPhase;
  uniform float uTwist;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  const float RIBBON_WIDTH = ${RIBBON_WIDTH.toFixed(1)};

  // Ribbon ends narrow to a point instead of fading with alpha, so the chrome can stay opaque and depth-tested.
  float ribbonTaper(float x) {
    float u = x / RIBBON_WIDTH + 0.5;
    float taper = smoothstep(0.0, 0.14, u) * (1.0 - smoothstep(0.86, 1.0, u));
    return mix(0.003, 1.0, taper);
  }

  vec3 ribbonPoint(float x, float span) {
    float travel = x * uFrequency + uTime + uPhase;
    float lift = sin(travel) * uAmplitude;
    float drift = sin(travel * 0.48 - uTime * 0.7) * uAmplitude * 0.32;
    float roll = sin(travel * 0.62 + uTime * 0.35 + 1.3) * uTwist;
    float halfSpan = span * ribbonTaper(x);
    return vec3(x, halfSpan * cos(roll) + drift, halfSpan * sin(roll) + lift);
  }

  void main() {
    vUv = uv;
    vec3 displaced = ribbonPoint(position.x, position.y);
    vec3 tangentX = ribbonPoint(position.x + 0.02, position.y) - ribbonPoint(position.x - 0.02, position.y);
    vec3 tangentY = ribbonPoint(position.x, position.y + 0.02) - ribbonPoint(position.x, position.y - 0.02);
    vNormal = normalize(normalMatrix * normalize(cross(tangentX, tangentY)));
    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  uniform vec3 uColor;
  uniform float uDepthFade;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  // Procedural studio environment: dark navy floor, cool overhead softbox, brand-tinted horizon band.
  vec3 chromeEnvironment(vec3 reflected) {
    float sky = smoothstep(-0.18, 0.7, reflected.y);
    vec3 floorTone = vec3(0.012, 0.024, 0.034) + uColor * 0.05;
    vec3 env = mix(floorTone, vec3(0.16, 0.23, 0.28), sky);
    float horizon = exp(-pow(reflected.y * 6.0, 2.0));
    env += horizon * mix(vec3(0.34, 0.42, 0.46), uColor, 0.55) * 0.95;
    vec3 keyDir = normalize(vec3(-0.45, 0.65, 0.6));
    vec3 rimDir = normalize(vec3(0.7, -0.35, 0.45));
    float keyAlign = max(dot(reflected, keyDir), 0.0);
    float rimAlign = max(dot(reflected, rimDir), 0.0);
    env += pow(keyAlign, 60.0) * vec3(0.82, 0.90, 0.92) + pow(keyAlign, 8.0) * vec3(0.10, 0.14, 0.16);
    env += pow(rimAlign, 40.0) * mix(vec3(0.6), uColor, 0.6) * 0.8;
    return env;
  }

  void main() {
    vec3 normal = normalize(vNormal);
    if (!gl_FrontFacing) normal = -normal;
    vec3 viewDir = normalize(vViewPosition);
    vec3 reflected = reflect(-viewDir, normal);
    float facing = clamp(dot(normal, viewDir), 0.0, 1.0);

    vec3 baseReflectance = mix(vec3(0.62, 0.66, 0.68), uColor, 0.35);
    vec3 fresnel = baseReflectance + (1.0 - baseReflectance) * pow(1.0 - facing, 5.0);
    vec3 color = chromeEnvironment(reflected) * fresnel;

    float edge = 1.0 - smoothstep(0.0, 0.1, min(vUv.y, 1.0 - vUv.y));
    color += edge * mix(vec3(0.05), uColor, 0.5) * 0.35;

    color *= uDepthFade;
    // Ordered dither at sub-LSB amplitude removes 8-bit banding across the wide chrome gradients.
    float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    color += (dither - 0.5) / 255.0;
    gl_FragColor = vec4(color, 1.0);
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
  const renderer = new three.WebGLRenderer({ alpha: true, antialias: true, canvas });
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
    const geometry = new three.PlaneGeometry(RIBBON_WIDTH, RIBBON_HEIGHT, initialQuality.segmentsX, initialQuality.segmentsY);
    const uniforms = {
      uTime: { value: 0 },
      uAmplitude: { value: layer.amplitude },
      uFrequency: { value: layer.frequency },
      uPhase: { value: layer.phase },
      uTwist: { value: layer.twist },
      uColor: { value: new three.Color(layer.color) },
      uDepthFade: { value: depthComposition[index].depthFade },
    };
    const material = new three.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: false,
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
