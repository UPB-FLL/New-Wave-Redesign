import { describe, expect, it, vi } from 'vitest';
import { createRibbonScene } from './ribbonScene';
import { RIBBON_LAYERS } from './ribbonSceneConfig';

function createSchedulerHarness() {
  const callbacks = new Map<number, FrameRequestCallback>();
  let nextId = 0;

  return {
    request: vi.fn((callback: FrameRequestCallback) => {
      nextId += 1;
      callbacks.set(nextId, callback);
      return nextId;
    }),
    cancel: vi.fn((handle: number) => {
      callbacks.delete(handle);
    }),
    now: vi.fn(() => 0),
    pendingCount() {
      return callbacks.size;
    },
    runFrame(timestamp: number) {
      const current = callbacks.entries().next().value as [number, FrameRequestCallback] | undefined;
      if (!current) return;

      callbacks.delete(current[0]);
      current[1](timestamp);
    },
  };
}

type ShaderMaterialInput = {
  uniforms: Record<string, { value: unknown }>;
  vertexShader: string;
  fragmentShader: string;
  transparent: boolean;
  side: number;
  depthWrite: boolean;
  depthTest: boolean;
  blending: number;
};

function createThreeHarness() {
  const geometries: Array<{ args: [number, number, number, number]; dispose: ReturnType<typeof vi.fn> }> = [];
  const materials: Array<{ input: ShaderMaterialInput; dispose: ReturnType<typeof vi.fn> }> = [];
  const meshes: Array<{
    geometry: unknown;
    material: unknown;
    position: { set: ReturnType<typeof vi.fn> };
    rotation: { z: number };
    renderOrder: number;
  }> = [];
  const groups: Array<{
    position: { x: number; y: number; z: number };
    add: ReturnType<typeof vi.fn>;
  }> = [];
  const cameras: Array<{
    args: [number, number, number, number];
    aspect: number;
    position: { set: ReturnType<typeof vi.fn> };
    updateProjectionMatrix: ReturnType<typeof vi.fn>;
  }> = [];
  const scenes: Array<{ add: ReturnType<typeof vi.fn> }> = [];
  const renderer = {
    options: undefined as { alpha: boolean; antialias: boolean; canvas: HTMLCanvasElement } | undefined,
    setClearColor: vi.fn(),
    setPixelRatio: vi.fn(),
    setSize: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
  };

  class WebGLRenderer {
    setClearColor = renderer.setClearColor;
    setPixelRatio = renderer.setPixelRatio;
    setSize = renderer.setSize;
    render = renderer.render;
    dispose = renderer.dispose;

    constructor(options: { alpha: boolean; antialias: boolean; canvas: HTMLCanvasElement }) {
      renderer.options = options;
    }
  }
  class Scene {
    add = vi.fn();

    constructor() {
      scenes.push(this);
    }
  }
  class Group {
    position = { x: 0, y: 0, z: 0 };
    add = vi.fn();

    constructor() {
      groups.push(this);
    }
  }
  class PerspectiveCamera {
    aspect = 1;
    position = { set: vi.fn() };
    updateProjectionMatrix = vi.fn();

    constructor(...args: [number, number, number, number]) {
      const camera = this as typeof this & { args: [number, number, number, number] };
      camera.args = args;
      cameras.push(camera);
    }
  }
  class PlaneGeometry {
    dispose = vi.fn();

    constructor(...args: [number, number, number, number]) {
      geometries.push({ args, dispose: this.dispose });
    }
  }
  class ShaderMaterial {
    dispose = vi.fn();

    constructor(input: ShaderMaterialInput) {
      materials.push({ input, dispose: this.dispose });
    }
  }
  class Mesh {
    position = { set: vi.fn() };
    rotation = { z: 0 };
    renderOrder = 0;

    constructor(public geometry: unknown, public material: unknown) {
      meshes.push(this);
    }
  }
  class Color {
    constructor(public value: string) {}
  }

  return {
    three: {
      WebGLRenderer,
      Scene,
      Group,
      PerspectiveCamera,
      PlaneGeometry,
      ShaderMaterial,
      Mesh,
      Color,
      DoubleSide: 2,
      NormalBlending: 1,
    } as unknown as typeof import('three'),
    cameras,
    geometries,
    groups,
    materials,
    meshes,
    renderer,
    scenes,
  };
}

describe('createRibbonScene', () => {
  it('does not schedule a frame after the first-frame callback disposes the scene', () => {
    const harness = createThreeHarness();
    const scheduler = createSchedulerHarness();
    const canvas = document.createElement('canvas');
    const scene: ReturnType<typeof createRibbonScene> = createRibbonScene(

      canvas,
      { compact: false, onFirstFrame: () => scene.dispose(), onContextLost: vi.fn() },
      { three: harness.three, scheduler },
    );

    scene.start();
    scheduler.runFrame(16);

    expect(harness.renderer.render).toHaveBeenCalledTimes(1);
    expect(scheduler.pendingCount()).toBe(0);
  });

  it('becomes terminal when the first render throws without reporting a first frame', () => {
    const harness = createThreeHarness();
    const scheduler = createSchedulerHarness();
    const firstFrame = vi.fn();
    const renderFailure = vi.fn();
    const canvas = document.createElement('canvas');
    const scene = createRibbonScene(
      canvas,
      { compact: false, onFirstFrame: firstFrame, onContextLost: renderFailure },
      { three: harness.three, scheduler },
    );
    harness.renderer.render.mockImplementationOnce(() => {
      throw new Error('first render failed');
    });

    scene.start();
    expect(() => scheduler.runFrame(16)).not.toThrow();

    expect(firstFrame).not.toHaveBeenCalled();
    expect(renderFailure).toHaveBeenCalledTimes(1);
    expect(scheduler.pendingCount()).toBe(0);
    expect(harness.renderer.dispose).not.toHaveBeenCalled();
    scene.start();
    expect(scheduler.request).toHaveBeenCalledTimes(1);
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expect(renderFailure).toHaveBeenCalledTimes(1);

    scene.dispose();
    expect(harness.renderer.dispose).toHaveBeenCalledTimes(1);
  });

  it('becomes terminal when a later render throws after reporting readiness once', () => {
    const harness = createThreeHarness();
    const scheduler = createSchedulerHarness();
    const firstFrame = vi.fn();
    const renderFailure = vi.fn();
    const scene = createRibbonScene(
      document.createElement('canvas'),
      { compact: false, onFirstFrame: firstFrame, onContextLost: renderFailure },
      { three: harness.three, scheduler },
    );
    harness.renderer.render
      .mockImplementationOnce(() => undefined)
      .mockImplementationOnce(() => {
        throw new Error('later render failed');
      });

    scene.start();
    scheduler.runFrame(16);
    expect(firstFrame).toHaveBeenCalledTimes(1);
    expect(renderFailure).not.toHaveBeenCalled();
    expect(() => scheduler.runFrame(32)).not.toThrow();

    expect(firstFrame).toHaveBeenCalledTimes(1);
    expect(renderFailure).toHaveBeenCalledTimes(1);
    expect(scheduler.pendingCount()).toBe(0);
    expect(harness.renderer.dispose).not.toHaveBeenCalled();
    scene.start();
    expect(scheduler.request).toHaveBeenCalledTimes(2);

    scene.dispose();
    expect(harness.renderer.dispose).toHaveBeenCalledTimes(1);
  });

  it('constructs the approved desktop ribbon scene from every layer', () => {
    const harness = createThreeHarness();
    const canvas = document.createElement('canvas');

    createRibbonScene(
      canvas,
      { compact: false, onFirstFrame: vi.fn(), onContextLost: vi.fn() },
      { three: harness.three, scheduler: createSchedulerHarness() },
    );

    expect(harness.renderer.options).toEqual({ alpha: true, antialias: true, canvas });
    expect(harness.renderer.setClearColor).toHaveBeenCalledWith(0x000000, 0);
    expect(harness.cameras[0].args).toEqual([42, 1, 0.1, 100]);
    expect(harness.cameras[0].position.set).toHaveBeenCalledWith(0, 0, 8);
    expect(harness.groups[0].position.x).toBe(2.2);
    expect(harness.scenes[0].add).toHaveBeenCalledWith(harness.groups[0]);
    expect(harness.geometries.map((geometry) => geometry.args)).toEqual([
      [14, 2.2, 256, 24],
      [14, 2.2, 256, 24],
      [14, 2.2, 256, 24],
    ]);
    const expectedRenderOrders = [1, 2, 0];
    const expectedDepthFades = [0.93, 1, 0.86];

    RIBBON_LAYERS.forEach((layer, index) => {
      const material = harness.materials[index].input;
      const mesh = harness.meshes[index];

      expect(material).toMatchObject({
        transparent: false,
        side: 2,
        depthWrite: false,
        depthTest: true,
        blending: 1,
      });
      expect(material.vertexShader).toContain('float travel = x * uFrequency + uTime + uPhase;');
      expect(material.vertexShader).toContain('float roll = sin(travel * 0.62 + uTime * 0.35 + 1.3) * uTwist;');
      expect(material.vertexShader).toContain('vNormal = normalize(normalMatrix * normalize(cross(tangentX, tangentY)));');
      expect(material.fragmentShader).toContain('uniform float uDepthFade;');
      expect(material.fragmentShader).toContain('vec3 reflected = reflect(-viewDir, normal);');
      expect(material.fragmentShader).toContain(
        'vec3 fresnel = baseReflectance + (1.0 - baseReflectance) * pow(1.0 - facing, 5.0);',
      );
      expect(material.fragmentShader).toContain('vec3 color = chromeEnvironment(reflected) * fresnel;');
      expect(material.fragmentShader).toContain('color += (dither - 0.5) / 255.0;');
      expect(material.fragmentShader).toContain('gl_FragColor = vec4(color, 1.0);\n    #include <colorspace_fragment>');
      expect(material.uniforms.uAmplitude.value).toBe(layer.amplitude);
      expect(material.uniforms.uFrequency.value).toBe(layer.frequency);
      expect(material.uniforms.uPhase.value).toBe(layer.phase);
      expect(material.uniforms.uTwist.value).toBe(layer.twist);
      expect(material.uniforms.uOpacity).toBeUndefined();
      expect(material.uniforms.uDepthFade?.value).toBe(expectedDepthFades[index]);
      expect((material.uniforms.uColor.value as { value: string }).value).toBe(layer.color);
      expect(mesh.position.set).toHaveBeenCalledWith(0, layer.y, layer.z);
      expect(mesh.rotation.z).toBe(layer.rotationZ);
      expect(mesh.renderOrder).toBe(expectedRenderOrders[index]);
      expect(harness.groups[0].add).toHaveBeenNthCalledWith(index + 1, mesh);
    });
  });

  it('uses compact geometry quality and center-right placement', () => {
    const harness = createThreeHarness();

    createRibbonScene(
      document.createElement('canvas'),
      { compact: true, onFirstFrame: vi.fn(), onContextLost: vi.fn() },
      { three: harness.three, scheduler: createSchedulerHarness() },
    );

    expect(harness.groups[0].position.x).toBe(1);
    expect(harness.geometries.map((geometry) => geometry.args)).toEqual([
      [14, 2.2, 128, 12],
      [14, 2.2, 128, 12],
      [14, 2.2, 128, 12],
    ]);
  });

  it('caps elapsed time, uses angular layer speeds, and renders before its first-frame callback', () => {
    const harness = createThreeHarness();
    const scheduler = createSchedulerHarness();
    const firstFrame = vi.fn(() => {
      expect(harness.renderer.render).toHaveBeenCalledTimes(1);
    });
    const scene = createRibbonScene(
      document.createElement('canvas'),
      { compact: false, onFirstFrame: firstFrame, onContextLost: vi.fn() },
      { three: harness.three, scheduler },
    );

    scene.start();
    scene.start();
    expect(scheduler.request).toHaveBeenCalledTimes(1);
    scheduler.runFrame(1000);
    scheduler.runFrame(3000);

    RIBBON_LAYERS.forEach((layer, index) => {
      expect(harness.materials[index].input.uniforms.uTime.value).toBeCloseTo(
        0.1 * ((Math.PI * 2) / layer.cycleSeconds),
      );
    });
    expect(firstFrame).toHaveBeenCalledTimes(1);
    expect(harness.renderer.render).toHaveBeenCalledTimes(2);
  });

  it('cancels idempotently, resumes once, and blocks restarts after context loss', () => {
    const harness = createThreeHarness();
    const scheduler = createSchedulerHarness();
    const contextLost = vi.fn();
    const canvas = document.createElement('canvas');
    const scene = createRibbonScene(
      canvas,
      { compact: false, onFirstFrame: vi.fn(), onContextLost: contextLost },
      { three: harness.three, scheduler },
    );

    scene.start();
    scene.start();
    expect(scheduler.pendingCount()).toBe(1);
    scene.stop();
    scene.stop();
    expect(scheduler.cancel).toHaveBeenCalledTimes(1);
    expect(scheduler.pendingCount()).toBe(0);

    scene.start();
    expect(scheduler.pendingCount()).toBe(1);
    const firstLoss = new Event('webglcontextlost', { cancelable: true });
    const secondLoss = new Event('webglcontextlost', { cancelable: true });
    canvas.dispatchEvent(firstLoss);
    canvas.dispatchEvent(secondLoss);

    expect(firstLoss.defaultPrevented).toBe(true);
    expect(secondLoss.defaultPrevented).toBe(true);
    expect(contextLost).toHaveBeenCalledTimes(1);
    expect(scheduler.pendingCount()).toBe(0);
    expect(scheduler.cancel).toHaveBeenCalledTimes(2);

    scene.start();
    expect(scheduler.request).toHaveBeenCalledTimes(2);
  });

  it('resizes and removes the context listener while disposing each GPU resource once', () => {
    const harness = createThreeHarness();
    const scheduler = createSchedulerHarness();
    const contextLost = vi.fn();
    const canvas = document.createElement('canvas');
    const scene = createRibbonScene(
      canvas,
      { compact: false, onFirstFrame: vi.fn(), onContextLost: contextLost },
      { three: harness.three, scheduler },
    );

    scene.resize(1440, 800, 3);
    expect(harness.renderer.setPixelRatio).toHaveBeenCalledWith(1.5);
    expect(harness.renderer.setSize).toHaveBeenCalledWith(1440, 800, false);
    expect(harness.cameras[0].aspect).toBe(1.8);
    expect(harness.cameras[0].updateProjectionMatrix).toHaveBeenCalledTimes(1);

    scene.dispose();
    scene.dispose();
    harness.geometries.forEach((geometry) => expect(geometry.dispose).toHaveBeenCalledTimes(1));
    harness.materials.forEach((material) => expect(material.dispose).toHaveBeenCalledTimes(1));
    expect(harness.renderer.dispose).toHaveBeenCalledTimes(1);

    const afterDispose = new Event('webglcontextlost', { cancelable: true });
    canvas.dispatchEvent(afterDispose);
    expect(afterDispose.defaultPrevented).toBe(false);
    expect(contextLost).not.toHaveBeenCalled();
    scene.start();
    expect(scheduler.pendingCount()).toBe(0);
  });
});
