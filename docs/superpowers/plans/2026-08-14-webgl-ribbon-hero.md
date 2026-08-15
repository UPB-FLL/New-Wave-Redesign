# WebGL Ribbon Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the home hero's static current lines during normal rendering with three slow, autonomous, translucent Three.js ribbon meshes while preserving the existing SVG fallback and all hero content.

**Architecture:** `HeroRibbonField` owns the React-side canvas lifecycle, visibility observers, and dynamic import boundary. A separately loaded `ribbonScene` module owns Three.js objects, shader uniforms, animation timing, resize behavior, context-loss handling, and GPU disposal. `Hero` keeps `CurrentField` mounted beneath the canvas until the first successful WebGL frame and restores it on failure or reduced motion.

**Tech Stack:** React 18, TypeScript, Three.js, Vite, Vitest, Testing Library, Tailwind CSS, Framer Motion

## Global Constraints

- Change only the home-page hero background layer.
- Preserve hero copy, CMS bindings, routes, buttons, statistics, entrance motion, dimensions, and stacking order.
- Use exactly three translucent ribbons in Signal Cyan `#31C6CF`, Continuity Green `#62BE68`, and Tide Blue `#317B92` over Deep Current `#09131D`.
- Use autonomous 18-24 second motion with no pointer, touch, click, or scroll interaction.
- Keep `CurrentField` as the reduced-motion, initialization, context-loss, and WebGL-unavailable fallback.
- Do not change `WaveBackground`, other `CurrentField` consumers, or unrelated dirty-worktree files.
- Dynamically import the Three.js renderer module; do not add Three.js to the initial application chunk.
- Cap device pixel ratio at `1.5` for widths at least `640px` and `1.25` below `640px`.
- Pause rendering while the hero is outside the viewport or the document is hidden.
- Do not add textures, post-processing, particles, shadows, pointer handlers, or per-frame React state.
- Do not commit, stage, push, publish, or deploy. Commit steps are intentionally replaced by scoped diff checks.

## File Map

- Create `src/components/hero/ribbonSceneConfig.ts`: renderer-independent ribbon colors, positions, timings, quality limits, and shared interfaces.
- Create `src/components/hero/ribbonSceneConfig.test.ts`: motion range, color, and responsive-quality contract tests.
- Create `src/components/hero/ribbonScene.ts`: Three.js renderer, meshes, shaders, frame loop, resize, context-loss, and disposal.
- Create `src/components/hero/ribbonScene.test.ts`: renderer lifecycle tests with injected Three.js and scheduler fakes.
- Create `src/components/hero/HeroRibbonField.tsx`: canvas mount, dynamic import, observers, document visibility, and callback integration.
- Create `src/components/hero/HeroRibbonField.test.tsx`: reduced-motion, readiness, pause/resume, failure, resize, and cleanup tests.
- Create `src/components/Hero.test.tsx`: hero-level fallback/content/action integration tests.
- Modify `src/components/Hero.tsx`: add the WebGL layer, fallback fade, and readability veil without changing existing content behavior.
- Modify `package.json` and `pnpm-lock.yaml`: add `three` as the only new runtime dependency.
- Update `design-qa.md`: record desktop/mobile and frame-difference evidence or the exact selected-browser blocker.

---

### Task 1: Lock The Ribbon Motion And Quality Contract

**Files:**
- Create: `src/components/hero/ribbonSceneConfig.test.ts`
- Create: `src/components/hero/ribbonSceneConfig.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produces: `RIBBON_LAYERS`, `getRibbonQuality(width, devicePixelRatio)`, `RibbonSceneController`, `RibbonSceneOptions`, and `RibbonSceneFactory`.
- Consumed by: Tasks 2 and 3.

- [ ] **Step 1: Write the failing configuration test**

```ts
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
    });
  });

  it('reduces mobile segments and caps device pixel ratio', () => {
    expect(getRibbonQuality(390, 3)).toEqual({ segmentsX: 64, segmentsY: 4, pixelRatio: 1.25 });
    expect(getRibbonQuality(1440, 3)).toEqual({ segmentsX: 128, segmentsY: 8, pixelRatio: 1.5 });
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
& 'C:\Users\JoshBreault\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' node_modules\vitest\vitest.mjs run src\components\hero\ribbonSceneConfig.test.ts --maxWorkers=1 --minWorkers=1
```

Expected: FAIL because `ribbonSceneConfig.ts` does not exist.

- [ ] **Step 3: Implement the renderer-independent contract**

```ts
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
```

- [ ] **Step 4: Add Three.js using the workspace package manager**

Run:

```powershell
& 'C:\Users\JoshBreault\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' add three
```

Expected: `three` appears under `dependencies`; `pnpm-lock.yaml` changes; no unrelated dependency is added.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run the Step 2 command. Expected: 2 tests PASS.

- [ ] **Step 6: Review the scoped diff**

```powershell
git diff --check -- package.json pnpm-lock.yaml src/components/hero/ribbonSceneConfig.ts src/components/hero/ribbonSceneConfig.test.ts
```

Expected: no whitespace errors and no changes outside the listed files.

---

### Task 2: Build The Testable Three.js Ribbon Renderer

**Files:**
- Create: `src/components/hero/ribbonScene.test.ts`
- Create: `src/components/hero/ribbonScene.ts`

**Interfaces:**
- Consumes: `RIBBON_LAYERS`, `getRibbonQuality`, `RibbonSceneOptions`, and `RibbonSceneController` from Task 1.
- Produces: `createRibbonScene(canvas, options, dependencies?)` implementing `RibbonSceneFactory`.
- Consumed by: Task 3 through a dynamic import.

- [ ] **Step 1: Write the failing renderer lifecycle test**

Create a deterministic fake Three.js namespace with constructor spies for `WebGLRenderer`, `Scene`, `PerspectiveCamera`, `PlaneGeometry`, `ShaderMaterial`, and `Mesh`. Inject a scheduler whose `request` method captures the frame callback. Assert these concrete behaviors:

```ts
function createSchedulerHarness() {
  let callback: FrameRequestCallback | undefined;
  let nextId = 0;
  return {
    request: vi.fn((next: FrameRequestCallback) => {
      callback = next;
      nextId += 1;
      return nextId;
    }),
    cancel: vi.fn(() => {
      callback = undefined;
    }),
    now: vi.fn(() => 0),
    runFrame(timestamp: number) {
      const current = callback;
      callback = undefined;
      current?.(timestamp);
    },
  };
}

function createThreeHarness() {
  const geometries: Array<{ dispose: ReturnType<typeof vi.fn> }> = [];
  const materials: Array<{ dispose: ReturnType<typeof vi.fn>; uniforms: Record<string, { value: unknown }> }> = [];
  const meshes: unknown[] = [];
  const renderer = {
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
  }
  class Scene { add = vi.fn(); }
  class Group {
    position = { x: 0, y: 0, z: 0 };
    add = vi.fn();
  }
  class PerspectiveCamera {
    aspect = 1;
    position = { set: vi.fn() };
    updateProjectionMatrix = vi.fn();
  }
  class PlaneGeometry {
    dispose = vi.fn();
    constructor() { geometries.push(this); }
  }
  class ShaderMaterial {
    dispose = vi.fn();
    uniforms: Record<string, { value: unknown }>;
    constructor(input: { uniforms: Record<string, { value: unknown }> }) {
      this.uniforms = input.uniforms;
      materials.push(this);
    }
  }
  class Mesh {
    position = { set: vi.fn() };
    rotation = { z: 0 };
    renderOrder = 0;
    constructor() { meshes.push(this); }
  }
  class Color { constructor(public value: string) {} }

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
    geometries,
    materials,
    meshes,
    renderer,
  };
}
```

```ts
it('creates three ribbons, advances uniforms, resizes, and disposes every GPU resource', () => {
  const firstFrame = vi.fn();
  const contextLost = vi.fn();
  const harness = createThreeHarness();
  const scheduler = createSchedulerHarness();
  const canvas = document.createElement('canvas');

  const scene = createRibbonScene(
    canvas,
    { compact: false, onFirstFrame: firstFrame, onContextLost: contextLost },
    { three: harness.three, scheduler },
  );

  expect(harness.meshes).toHaveLength(3);
  scene.resize(1440, 800, 3);
  expect(harness.renderer.setPixelRatio).toHaveBeenCalledWith(1.5);
  scene.start();
  scheduler.runFrame(1000);
  scheduler.runFrame(2000);
  expect(firstFrame).toHaveBeenCalledTimes(1);
  expect(harness.renderer.render).toHaveBeenCalledTimes(2);

  canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
  expect(contextLost).toHaveBeenCalledTimes(1);

  scene.dispose();
  harness.geometries.forEach((geometry) => expect(geometry.dispose).toHaveBeenCalledTimes(1));
  harness.materials.forEach((material) => expect(material.dispose).toHaveBeenCalledTimes(1));
  expect(harness.renderer.dispose).toHaveBeenCalledTimes(1);
});
```

The harness must expose only the methods used by `ribbonScene.ts`; do not emulate an entire WebGL implementation.

- [ ] **Step 2: Run the renderer test and verify RED**

```powershell
& 'C:\Users\JoshBreault\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' node_modules\vitest\vitest.mjs run src\components\hero\ribbonScene.test.ts --maxWorkers=1 --minWorkers=1
```

Expected: FAIL because `createRibbonScene` does not exist.

- [ ] **Step 3: Implement the vertex and fragment shaders**

Use these shader contracts inside `ribbonScene.ts`:

```ts
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
  varying vec2 vUv;
  varying float vLift;

  void main() {
    float sideFade = smoothstep(0.0, 0.12, vUv.x) * (1.0 - smoothstep(0.88, 1.0, vUv.x));
    float widthFade = smoothstep(0.0, 0.18, vUv.y) * (1.0 - smoothstep(0.82, 1.0, vUv.y));
    float edgeDistance = min(vUv.y, 1.0 - vUv.y);
    float edgeHighlight = 1.0 - smoothstep(0.02, 0.14, edgeDistance);
    float liftLight = 0.88 + clamp(vLift * 0.22, -0.08, 0.12);
    vec3 color = uColor * liftLight + edgeHighlight * 0.08;
    float alpha = sideFade * (0.12 + widthFade * 0.88) * uOpacity;
    gl_FragColor = vec4(color, alpha);
  }
`;
```

- [ ] **Step 4: Implement `createRibbonScene`**

Define the injected dependency boundary before the factory:

```ts
type FrameScheduler = {
  request: (callback: FrameRequestCallback) => number;
  cancel: (handle: number) => void;
  now: () => number;
};

type RibbonSceneDependencies = {
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
```

The implementation must:

```ts
export function createRibbonScene(
  canvas: HTMLCanvasElement,
  options: RibbonSceneOptions,
  dependencies: RibbonSceneDependencies = defaultDependencies,
): RibbonSceneController
```

- Construct one alpha-enabled `WebGLRenderer`, one `Scene`, and one `PerspectiveCamera(42, 1, 0.1, 100)` at `z = 8`.
- Create exactly three `PlaneGeometry(14, 2.2, segmentsX, segmentsY)` meshes from `RIBBON_LAYERS`.
- Use transparent double-sided `ShaderMaterial` instances with `depthWrite: false`, `depthTest: true`, and normal blending.
- Set each mesh's `position`, `rotation.z`, and `renderOrder` from its layer index; offset the group toward center-right with `group.position.x = compact ? 1.0 : 2.2`.
- Advance accumulated time from scheduler deltas capped at `0.05` seconds so resume never jumps.
- Convert each cycle to angular speed with `(Math.PI * 2) / cycleSeconds` before assigning `uTime`.
- Call `onFirstFrame` once after the first successful `renderer.render(scene, camera)`.
- Implement idempotent `start`, `stop`, and `dispose` methods.
- On `webglcontextlost`, prevent the default event, stop the loop, and call `onContextLost` once.
- Remove the context-loss listener and dispose geometries, materials, and renderer on cleanup.

- [ ] **Step 5: Run RED/GREEN renderer checks**

Run the Step 2 command until the lifecycle test passes, then run:

```powershell
& 'C:\Users\JoshBreault\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' node_modules\vitest\vitest.mjs run src\components\hero\ribbonSceneConfig.test.ts src\components\hero\ribbonScene.test.ts --maxWorkers=1 --minWorkers=1
```

Expected: both files PASS with no leaked animation callbacks.

- [ ] **Step 6: Review the scoped diff**

```powershell
git diff --check -- src/components/hero/ribbonScene.ts src/components/hero/ribbonScene.test.ts
```

---

### Task 3: Add The React Canvas Lifecycle And Dynamic Import Boundary

**Files:**
- Create: `src/components/hero/HeroRibbonField.test.tsx`
- Create: `src/components/hero/HeroRibbonField.tsx`

**Interfaces:**
- Consumes: `RibbonSceneFactory` and `RibbonSceneController` from Task 1; dynamically imports `createRibbonScene` from Task 2.
- Produces: `HeroRibbonField({ disabled, onReady, onFailure, loadScene? })`.
- Consumed by: Task 4.

- [ ] **Step 1: Write failing component lifecycle tests**

Use injected `loadScene` and controllable `IntersectionObserver`/`ResizeObserver` fakes. Cover these exact cases:

```ts
let intersectionCallback: IntersectionObserverCallback = () => undefined;
let resizeCallback: ResizeObserverCallback = () => undefined;

class IntersectionObserverHarness {
  constructor(callback: IntersectionObserverCallback) { intersectionCallback = callback; }
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  root = null;
  rootMargin = '0px';
  thresholds = [0.05];
  takeRecords = () => [];
}

class ResizeObserverHarness {
  constructor(callback: ResizeObserverCallback) { resizeCallback = callback; }
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

function createControllerHarness() {
  return {
    resize: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    dispose: vi.fn(),
  };
}

function emitIntersection(isIntersecting: boolean) {
  intersectionCallback(
    [{ isIntersecting } as IntersectionObserverEntry],
    {} as IntersectionObserver,
  );
}

function emitResize(width: number, height: number) {
  resizeCallback(
    [{ contentRect: { width, height } } as ResizeObserverEntry],
    {} as ResizeObserver,
  );
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', IntersectionObserverHarness);
  vi.stubGlobal('ResizeObserver', ResizeObserverHarness);
});

afterEach(() => vi.unstubAllGlobals());
```

```tsx
it('loads the scene, sizes it, pauses offscreen, resumes onscreen, and disposes on unmount', async () => {
  const controller = createControllerHarness();
  const loadScene = vi.fn(async () => vi.fn(() => controller));
  const ready = vi.fn();
  const { unmount } = render(
    <HeroRibbonField disabled={false} onReady={ready} onFailure={vi.fn()} loadScene={loadScene} />,
  );

  expect(screen.getByTestId('hero-ribbon-canvas')).toHaveAttribute('aria-hidden', 'true');
  await waitFor(() => expect(loadScene).toHaveBeenCalledTimes(1));
  emitResize(1440, 800);
  expect(controller.resize).toHaveBeenCalledWith(1440, 800, window.devicePixelRatio);
  emitIntersection(false);
  expect(controller.stop).toHaveBeenCalled();
  emitIntersection(true);
  expect(controller.start).toHaveBeenCalled();
  unmount();
  expect(controller.dispose).toHaveBeenCalledTimes(1);
});

it('does not load Three.js when disabled', () => {
  const loadScene = vi.fn();
  render(<HeroRibbonField disabled onReady={vi.fn()} onFailure={vi.fn()} loadScene={loadScene} />);
  expect(screen.queryByTestId('hero-ribbon-canvas')).not.toBeInTheDocument();
  expect(loadScene).not.toHaveBeenCalled();
});

it('reports initialization failure without removing the static fallback', async () => {
  const failure = vi.fn();
  render(
    <HeroRibbonField
      disabled={false}
      onReady={vi.fn()}
      onFailure={failure}
      loadScene={async () => { throw new Error('WebGL unavailable'); }}
    />,
  );
  await waitFor(() => expect(failure).toHaveBeenCalledTimes(1));
});
```

- [ ] **Step 2: Run the component test and verify RED**

```powershell
& 'C:\Users\JoshBreault\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' node_modules\vitest\vitest.mjs run src\components\hero\HeroRibbonField.test.tsx --maxWorkers=1 --minWorkers=1
```

Expected: FAIL because `HeroRibbonField` does not exist.

- [ ] **Step 3: Implement `HeroRibbonField`**

The component must render only this stable decorative surface when enabled:

```tsx
<div ref={containerRef} data-role="hero-ribbon-field" className="pointer-events-none absolute inset-0">
  <canvas
    ref={canvasRef}
    data-testid="hero-ribbon-canvas"
    aria-hidden="true"
    className="block h-full w-full"
  />
</div>
```

Its effect must dynamically load the scene factory with:

```ts
type SceneLoader = () => Promise<RibbonSceneFactory>;

const defaultLoadScene: SceneLoader = async () => {
  const module = await import('./ribbonScene');
  return module.createRibbonScene;
};
```

Read the container width before construction and call the factory with `compact: container.clientWidth < 640`. After creation, register a `ResizeObserver`, an `IntersectionObserver` with threshold `0.05`, and a `visibilitychange` listener. Start only when intersecting and visible; stop otherwise. Catch import, initialization, and resize failures, dispose any partial controller, and call `onFailure` once. Cleanup all observers, listeners, and the controller without setting React state after unmount.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the Step 2 command. Expected: all lifecycle tests PASS.

- [ ] **Step 5: Confirm the import boundary is truly dynamic**

```powershell
rg -n "import\('\\./ribbonScene'\)|from 'three'" src/components/hero
```

Expected: `HeroRibbonField.tsx` dynamically imports `./ribbonScene`; only `ribbonScene.ts` statically imports `three`.

- [ ] **Step 6: Review the scoped diff**

```powershell
git diff --check -- src/components/hero/HeroRibbonField.tsx src/components/hero/HeroRibbonField.test.tsx
```

---

### Task 4: Integrate The Ribbons Without Changing Hero Behavior

**Files:**
- Create: `src/components/Hero.test.tsx`
- Modify: `src/components/Hero.tsx`

**Interfaces:**
- Consumes: `HeroRibbonField` from Task 3 and the existing `CurrentField`, `useContent`, navigation, and motion APIs.
- Produces: first-frame fallback fade and failure restoration inside the existing home hero.

- [ ] **Step 1: Write the failing hero integration test**

Mock `HeroRibbonField` with controls that invoke `onReady` and `onFailure`. Preserve real `CurrentField` rendering. Assert:

```tsx
const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate };
});

vi.mock('../lib/useContent', () => ({ useContent: () => ({}) }));

vi.mock('./hero/HeroRibbonField', () => ({
  default: ({ onReady, onFailure }: { onReady: () => void; onFailure: () => void }) => (
    <div data-testid="mock-ribbon-field">
      <button type="button" onClick={onReady}>Signal first WebGL frame</button>
      <button type="button" onClick={onFailure}>Signal WebGL failure</button>
    </div>
  ),
}));
```

```tsx
expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Technology that keeps business moving.');
expect(screen.getByRole('button', { name: 'Request an assessment' })).toBeInTheDocument();
expect(screen.getByRole('button', { name: 'Get support' })).toBeInTheDocument();

const fallback = screen.getByTestId('hero-current-fallback');
expect(fallback).toHaveClass('opacity-80');
fireEvent.click(screen.getByRole('button', { name: 'Signal first WebGL frame' }));
expect(fallback).toHaveClass('opacity-0');
fireEvent.click(screen.getByRole('button', { name: 'Signal WebGL failure' }));
expect(fallback).toHaveClass('opacity-80');
expect(screen.getByTestId('hero-readability-veil')).toBeInTheDocument();
```

Render `Hero` inside `MemoryRouter`, click the primary and secondary buttons, and assert `navigate` receives `/contact` and `/support` respectively.

- [ ] **Step 2: Run the hero test and verify RED**

```powershell
& 'C:\Users\JoshBreault\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' node_modules\vitest\vitest.mjs run src\components\Hero.test.tsx --maxWorkers=1 --minWorkers=1
```

Expected: FAIL because the WebGL layer, fallback state, and readability veil are absent.

- [ ] **Step 3: Make the minimal hero integration**

Add memoized readiness callbacks and one hero-level reduced-motion value:

```ts
const reducedMotion = Boolean(useReducedMotion());
const [ribbonsReady, setRibbonsReady] = useState(false);
const handleRibbonsReady = useCallback(() => setRibbonsReady(true), []);
const handleRibbonsFailure = useCallback(() => setRibbonsReady(false), []);
```

Replace only the current background placement with this layer order:

```tsx
<div
  data-testid="hero-current-fallback"
  aria-hidden="true"
  className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ${
    ribbonsReady ? 'opacity-0' : 'opacity-80'
  }`}
>
  <CurrentField density="highImpact" tone="dark" className="h-full w-full" />
</div>

<HeroRibbonField
  disabled={reducedMotion}
  onReady={handleRibbonsReady}
  onFailure={handleRibbonsFailure}
/>

<div
  data-testid="hero-readability-veil"
  aria-hidden="true"
  className="pointer-events-none absolute inset-0"
  style={{
    background:
      'linear-gradient(90deg, rgba(9,19,29,0.96) 0%, rgba(9,19,29,0.78) 44%, rgba(9,19,29,0.18) 78%, rgba(9,19,29,0.08) 100%)',
  }}
/>
```

Give the existing content wrapper an explicit higher z-index. Do not alter hero text, action handlers, statistics, spacing, height classes, or CMS parsing.

- [ ] **Step 4: Prevent stale ready state when reduced motion changes**

Add an effect that restores the static fallback when `reducedMotion` becomes true:

```ts
useEffect(() => {
  if (reducedMotion) setRibbonsReady(false);
}, [reducedMotion]);
```

- [ ] **Step 5: Run hero and brand regression tests**

```powershell
& 'C:\Users\JoshBreault\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' node_modules\vitest\vitest.mjs run src\components\Hero.test.tsx src\components\brand\CurrentField.test.tsx --maxWorkers=1 --minWorkers=1
```

Expected: all tests PASS; the canonical static current component remains unchanged.

- [ ] **Step 6: Review the scoped diff**

```powershell
git diff --check -- src/components/Hero.tsx src/components/Hero.test.tsx
git diff -- src/components/Hero.tsx
```

Confirm the diff changes only background integration and required imports/state.

---

### Task 5: Verify Motion, Pixels, Accessibility, And Production Output

**Files:**
- Modify: `design-qa.md`
- Inspect only: `src/components/Hero.tsx`, `src/components/hero/*`, `dist/*`

**Interfaces:**
- Consumes: the completed hero implementation.
- Produces: reproducible automated and rendered verification evidence.

- [ ] **Step 1: Run all automated checks**

```powershell
& 'C:\Users\JoshBreault\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' node_modules\vitest\vitest.mjs run --maxWorkers=1 --minWorkers=1
& 'C:\Users\JoshBreault\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' node_modules\eslint\bin\eslint.js src\components\Hero.tsx src\components\Hero.test.tsx src\components\hero
& 'C:\Users\JoshBreault\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' node_modules\typescript\bin\tsc --noEmit -p tsconfig.app.json
& 'C:\Users\JoshBreault\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' node_modules\vite\bin\vite.js build
```

Expected: all tests pass, ESLint and TypeScript return zero, and Vite emits a separate Three.js/ribbon chunk rather than folding it into the initial application chunk.

- [ ] **Step 2: Verify the preview is live**

```powershell
(Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:4173/' -TimeoutSec 10).StatusCode
```

Expected: `200`.

- [ ] **Step 3: Inspect desktop rendering in the selected in-app browser**

At a desktop viewport, capture the hero and verify:

- the canvas is full-bleed and nonblank;
- all three brand-color ribbons are visible with translucent depth;
- the left readability veil protects the headline and controls;
- hero copy, controls, statistics, and height have not shifted;
- no canvas overlaps navigation or the following section.

- [ ] **Step 4: Prove autonomous animation with canvas pixels**

Capture the same hero state twice at least one second apart. Compare a canvas-only crop or canvas pixel sample and confirm a nonzero pixel difference. Compare stable hero text/control bounding boxes and confirm no layout movement. Do not use pointer movement between captures.

- [ ] **Step 5: Inspect mobile and reduced-motion states**

At a compact mobile viewport, confirm the canvas is nonblank, properly framed, and does not crop or occlude content. Enable reduced motion, reload, and confirm `hero-ribbon-canvas` is absent while `hero-current-fallback` remains visible.

- [ ] **Step 6: Check browser diagnostics**

Inspect console logs for runtime errors, shader compilation failures, WebGL context warnings, and resize-loop errors. Any such error blocks completion.

- [ ] **Step 7: Handle selected-browser unavailability correctly**

If the in-app browser runtime cannot attach, record rendered QA as blocked in `design-qa.md`. Do not use standalone Playwright or another browser unless the user explicitly authorizes it.

- [ ] **Step 8: Record evidence and final source guard**

Update `design-qa.md` with viewport sizes, screenshot paths, frame-difference evidence, reduced-motion result, and console result. Then run:

```powershell
git diff --check -- package.json pnpm-lock.yaml src/components/Hero.tsx src/components/Hero.test.tsx src/components/hero design-qa.md
git status --short
```

Confirm unrelated working-tree changes remain untouched and no commit, stage, push, publication, or deployment occurred.
