import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { HeroRibbonField } from './HeroRibbonField';
import type { RibbonSceneOptions } from './ribbonSceneConfig';

let intersectionCallback: IntersectionObserverCallback = () => undefined;
let resizeCallback: ResizeObserverCallback = () => undefined;

class IntersectionObserverHarness {
  static instances: IntersectionObserverHarness[] = [];
  callback: IntersectionObserverCallback;
  options: IntersectionObserverInit | undefined;
  thresholds: number[];

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    intersectionCallback = callback;
    this.callback = callback;
    this.options = options;
    this.thresholds = options?.threshold === undefined
      ? []
      : Array.isArray(options.threshold)
        ? options.threshold
        : [options.threshold];
    IntersectionObserverHarness.instances.push(this);
  }

  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  root = null;
  rootMargin = '0px';
  takeRecords = () => [];
}

class ResizeObserverHarness {
  static instances: ResizeObserverHarness[] = [];
  static throwOnObserve = false;
  callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    resizeCallback = callback;
    this.callback = callback;
    ResizeObserverHarness.instances.push(this);
  }

  observe = vi.fn(() => {
    if (ResizeObserverHarness.throwOnObserve) {
      throw new Error('Resize observer registration failed');
    }
  });
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

function emitIntersectionFrom(observer: IntersectionObserverHarness, isIntersecting: boolean) {
  observer.callback(
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

function setDocumentVisibility(visibilityState: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: visibilityState,
  });
}

function createFactory(controller: ReturnType<typeof createControllerHarness>) {
  return vi.fn<(canvas: HTMLCanvasElement, options: RibbonSceneOptions) => typeof controller>(() => controller);
}

function getFieldContainer() {
  const field = document.querySelector('[data-role="hero-ribbon-field"]');
  if (!(field instanceof HTMLDivElement)) throw new Error('Ribbon field container was not rendered');
  return field;
}

describe('HeroRibbonField', () => {
  beforeEach(() => {
    intersectionCallback = () => undefined;
    resizeCallback = () => undefined;
    IntersectionObserverHarness.instances = [];
    ResizeObserverHarness.instances = [];
    ResizeObserverHarness.throwOnObserve = false;
    setDocumentVisibility('visible');
    vi.stubGlobal('IntersectionObserver', IntersectionObserverHarness);
    vi.stubGlobal('ResizeObserver', ResizeObserverHarness);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('loads the scene, sizes it, pauses offscreen, resumes onscreen, and disposes on unmount', async () => {
    const controller = createControllerHarness();
    const factory = createFactory(controller);
    const loadScene = vi.fn(async () => factory);
    const { unmount } = render(
      <HeroRibbonField disabled={false} onReady={vi.fn()} onFailure={vi.fn()} loadScene={loadScene} />,
    );

    expect(screen.getByTestId('hero-ribbon-canvas')).toHaveAttribute('aria-hidden', 'true');
    await waitFor(() => expect(loadScene).toHaveBeenCalledTimes(1));
    expect(factory.mock.calls[0][1].compact).toBe(true);
    expect(IntersectionObserverHarness.instances[0].options).toEqual({ threshold: 0.05 });
    expect(ResizeObserverHarness.instances[0].observe).toHaveBeenCalledWith(getFieldContainer());
    expect(IntersectionObserverHarness.instances[0].observe).toHaveBeenCalledWith(getFieldContainer());

    emitResize(1440, 800);
    expect(controller.resize).toHaveBeenCalledWith(1440, 800, window.devicePixelRatio);
    emitIntersection(true);
    expect(controller.start).toHaveBeenCalledTimes(1);
    emitIntersection(false);
    expect(controller.stop).toHaveBeenCalledTimes(1);
    emitIntersection(true);
    expect(controller.start).toHaveBeenCalledTimes(2);

    unmount();
    expect(controller.dispose).toHaveBeenCalledTimes(1);
  });

  it('uses the desktop scene when the container is at least 640 pixels wide', async () => {
    const controller = createControllerHarness();
    const factory = createFactory(controller);
    let resolveLoader: ((sceneFactory: ReturnType<typeof createFactory>) => void) | undefined;
    const loadScene = vi.fn(() => new Promise<ReturnType<typeof createFactory>>((resolve) => {
      resolveLoader = resolve;
    }));
    render(
      <HeroRibbonField disabled={false} onReady={vi.fn()} onFailure={vi.fn()} loadScene={loadScene} />,
    );

    Object.defineProperty(getFieldContainer(), 'clientWidth', { configurable: true, value: 1440 });
    resolveLoader?.(factory);

    await waitFor(() => expect(factory).toHaveBeenCalledTimes(1));
    expect(factory.mock.calls[0][1].compact).toBe(false);
  });

  it('retains its scene across callback changes and calls the latest callbacks', async () => {
    const controller = createControllerHarness();
    const factory = createFactory(controller);
    const loadScene = vi.fn(async () => factory);
    const firstReady = vi.fn();
    const firstFailure = vi.fn();
    const latestReady = vi.fn();
    const latestFailure = vi.fn();
    const { rerender } = render(
      <HeroRibbonField disabled={false} onReady={firstReady} onFailure={firstFailure} loadScene={loadScene} />,
    );

    await waitFor(() => expect(factory).toHaveBeenCalledTimes(1));
    rerender(
      <HeroRibbonField disabled={false} onReady={latestReady} onFailure={latestFailure} loadScene={loadScene} />,
    );
    const options = factory.mock.calls[0][1];
    options.onFirstFrame();
    options.onContextLost();

    expect(loadScene).toHaveBeenCalledTimes(1);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(controller.dispose).toHaveBeenCalledTimes(1);
    expect(firstReady).not.toHaveBeenCalled();
    expect(firstFailure).not.toHaveBeenCalled();
    expect(latestReady).toHaveBeenCalledTimes(1);
    expect(latestFailure).toHaveBeenCalledTimes(1);
  });

  it('does not load Three.js when disabled', () => {
    const loadScene = vi.fn();
    render(<HeroRibbonField disabled onReady={vi.fn()} onFailure={vi.fn()} loadScene={loadScene} />);

    expect(screen.queryByTestId('hero-ribbon-canvas')).not.toBeInTheDocument();
    expect(loadScene).not.toHaveBeenCalled();
  });

  it('reports initialization failure without removing the static fallback surface', async () => {
    const failure = vi.fn();
    render(
      <HeroRibbonField
        disabled={false}
        onReady={vi.fn()}
        onFailure={failure}
        loadScene={async () => {
          throw new Error('WebGL unavailable');
        }}
      />,
    );

    await waitFor(() => expect(failure).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('hero-ribbon-canvas')).toBeInTheDocument();
  });

  it('reports a factory throw and leaves no controller to dispose', async () => {
    const failure = vi.fn();
    render(
      <HeroRibbonField
        disabled={false}
        onReady={vi.fn()}
        onFailure={failure}
        loadScene={async () => {
          throw new Error('Factory import unavailable');
        }}
      />,
    );

    await waitFor(() => expect(failure).toHaveBeenCalledTimes(1));
  });

  it('disposes the controller when the scene factory throws', async () => {
    const failure = vi.fn();
    const factory = vi.fn<(canvas: HTMLCanvasElement, options: RibbonSceneOptions) => never>(() => {
      throw new Error('WebGL construction failed');
    });
    render(
      <HeroRibbonField disabled={false} onReady={vi.fn()} onFailure={failure} loadScene={async () => factory} />,
    );

    await waitFor(() => expect(failure).toHaveBeenCalledTimes(1));
  });

  it('disposes the controller when observer construction fails', async () => {
    const controller = createControllerHarness();
    const failure = vi.fn();
    vi.stubGlobal('ResizeObserver', class {
      constructor() {
        throw new Error('Resize observer unavailable');
      }
    });
    render(
      <HeroRibbonField
        disabled={false}
        onReady={vi.fn()}
        onFailure={failure}
        loadScene={async () => createFactory(controller)}
      />,
    );

    await waitFor(() => expect(failure).toHaveBeenCalledTimes(1));
    expect(controller.dispose).toHaveBeenCalledTimes(1);
  });

  it('disposes the controller when observer registration fails', async () => {
    const controller = createControllerHarness();
    const failure = vi.fn();
    ResizeObserverHarness.throwOnObserve = true;
    render(
      <HeroRibbonField
        disabled={false}
        onReady={vi.fn()}
        onFailure={failure}
        loadScene={async () => createFactory(controller)}
      />,
    );

    await waitFor(() => expect(failure).toHaveBeenCalledTimes(1));
    expect(ResizeObserverHarness.instances[0].disconnect).toHaveBeenCalledTimes(1);
    expect(IntersectionObserverHarness.instances[0].disconnect).toHaveBeenCalledTimes(1);
    expect(controller.dispose).toHaveBeenCalledTimes(1);
  });

  it('does not construct a scene when loading resolves after unmount', async () => {
    const controller = createControllerHarness();
    const factory = createFactory(controller);
    let resolveScene: ((sceneFactory: typeof factory) => void) | undefined;
    const loadScene = vi.fn(
      () => new Promise<typeof factory>((resolve) => {
        resolveScene = resolve;
      }),
    );
    const ready = vi.fn();
    const failure = vi.fn();
    const { unmount } = render(
      <HeroRibbonField disabled={false} onReady={ready} onFailure={failure} loadScene={loadScene} />,
    );

    await waitFor(() => expect(loadScene).toHaveBeenCalledTimes(1));
    unmount();
    await act(async () => {
      resolveScene?.(factory);
      await Promise.resolve();
    });

    expect(factory).not.toHaveBeenCalled();
    expect(controller.dispose).not.toHaveBeenCalled();
    expect(ready).not.toHaveBeenCalled();
    expect(failure).not.toHaveBeenCalled();
  });

  it('does not construct a scene when disabled while loading is pending', async () => {
    const controller = createControllerHarness();
    const factory = createFactory(controller);
    let resolveScene: ((sceneFactory: typeof factory) => void) | undefined;
    const loadScene = vi.fn(
      () => new Promise<typeof factory>((resolve) => {
        resolveScene = resolve;
      }),
    );
    const ready = vi.fn();
    const failure = vi.fn();
    const { rerender } = render(
      <HeroRibbonField disabled={false} onReady={ready} onFailure={failure} loadScene={loadScene} />,
    );

    await waitFor(() => expect(loadScene).toHaveBeenCalledTimes(1));
    rerender(<HeroRibbonField disabled onReady={ready} onFailure={failure} loadScene={loadScene} />);
    expect(screen.queryByTestId('hero-ribbon-canvas')).not.toBeInTheDocument();
    await act(async () => {
      resolveScene?.(factory);
      await Promise.resolve();
    });

    expect(factory).not.toHaveBeenCalled();
    expect(controller.dispose).not.toHaveBeenCalled();
    expect(ready).not.toHaveBeenCalled();
    expect(failure).not.toHaveBeenCalled();
  });

  it('disposes a controller returned after cleanup begins during factory construction', async () => {
    const controller = createControllerHarness();
    let resolveScene: ((sceneFactory: ReturnType<typeof createFactory>) => void) | undefined;
    const loadScene = vi.fn(
      () => new Promise<ReturnType<typeof createFactory>>((resolve) => {
        resolveScene = resolve;
      }),
    );
    let unmount: () => void = () => undefined;
    const factory = vi.fn<(canvas: HTMLCanvasElement, options: RibbonSceneOptions) => typeof controller>(() => {
      unmount();
      return controller;
    });
    const rendered = render(
      <HeroRibbonField disabled={false} onReady={vi.fn()} onFailure={vi.fn()} loadScene={loadScene} />,
    );
    unmount = rendered.unmount;

    await waitFor(() => expect(loadScene).toHaveBeenCalledTimes(1));
    await act(async () => {
      resolveScene?.(factory);
      await Promise.resolve();
    });

    expect(factory).toHaveBeenCalledTimes(1);
    expect(controller.dispose).toHaveBeenCalledTimes(1);
  });

  it('pauses when the document is hidden and resumes when it becomes visible', async () => {
    const controller = createControllerHarness();
    render(
      <HeroRibbonField
        disabled={false}
        onReady={vi.fn()}
        onFailure={vi.fn()}
        loadScene={async () => () => controller}
      />,
    );

    await waitFor(() => expect(IntersectionObserverHarness.instances).toHaveLength(1));
    emitIntersection(true);
    expect(controller.start).toHaveBeenCalledTimes(1);

    setDocumentVisibility('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(controller.stop).toHaveBeenCalledTimes(1);

    setDocumentVisibility('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(controller.start).toHaveBeenCalledTimes(2);
  });

  it('forwards the first rendered frame to onReady only once', async () => {
    const controller = createControllerHarness();
    const factory = createFactory(controller);
    const ready = vi.fn();
    render(
      <HeroRibbonField
        disabled={false}
        onReady={ready}
        onFailure={vi.fn()}
        loadScene={async () => factory}
      />,
    );

    await waitFor(() => expect(factory).toHaveBeenCalledTimes(1));
    const options = factory.mock.calls[0][1];
    options.onFirstFrame();
    options.onFirstFrame();

    expect(ready).toHaveBeenCalledTimes(1);
  });

  it('reports context loss once and disposes the controller', async () => {
    const controller = createControllerHarness();
    const factory = createFactory(controller);
    const failure = vi.fn();
    render(
      <HeroRibbonField
        disabled={false}
        onReady={vi.fn()}
        onFailure={failure}
        loadScene={async () => factory}
      />,
    );

    await waitFor(() => expect(factory).toHaveBeenCalledTimes(1));
    const options = factory.mock.calls[0][1];
    options.onContextLost();
    options.onContextLost();

    expect(failure).toHaveBeenCalledTimes(1);
    expect(controller.dispose).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['resize', (controller: ReturnType<typeof createControllerHarness>) => {
      controller.resize.mockImplementation(() => {
        throw new Error('Resize failed');
      });
    }, () => emitResize(1440, 800)],
    ['start', (controller: ReturnType<typeof createControllerHarness>) => {
      controller.start.mockImplementation(() => {
        throw new Error('Start failed');
      });
    }, () => emitIntersection(true)],
    ['stop', (controller: ReturnType<typeof createControllerHarness>) => {
      controller.stop.mockImplementation(() => {
        throw new Error('Stop failed');
      });
    }, () => emitIntersection(false)],
  ])('reports and cleans up when %s throws', async (_operation, configure, trigger) => {
    const controller = createControllerHarness();
    const failure = vi.fn();
    render(
      <HeroRibbonField
        disabled={false}
        onReady={vi.fn()}
        onFailure={failure}
        loadScene={async () => createFactory(controller)}
      />,
    );

    await waitFor(() => expect(IntersectionObserverHarness.instances).toHaveLength(1));
    configure(controller);
    trigger();

    expect(failure).toHaveBeenCalledTimes(1);
    expect(controller.dispose).toHaveBeenCalledTimes(1);
  });

  it('ignores stale scene callbacks after failure and cleans up only once', async () => {
    const controller = createControllerHarness();
    controller.resize.mockImplementation(() => {
      throw new Error('Resize failed');
    });
    const factory = createFactory(controller);
    const ready = vi.fn();
    const failure = vi.fn();
    const { unmount } = render(
      <HeroRibbonField
        disabled={false}
        onReady={ready}
        onFailure={failure}
        loadScene={async () => factory}
      />,
    );

    await waitFor(() => expect(factory).toHaveBeenCalledTimes(1));
    const options = factory.mock.calls[0][1];
    const observer = IntersectionObserverHarness.instances[0];
    emitResize(1440, 800);
    options.onFirstFrame();
    options.onContextLost();
    emitIntersectionFrom(observer, true);
    unmount();

    expect(ready).not.toHaveBeenCalled();
    expect(failure).toHaveBeenCalledTimes(1);
    expect(controller.start).not.toHaveBeenCalled();
    expect(controller.dispose).toHaveBeenCalledTimes(1);
    expect(ResizeObserverHarness.instances[0].disconnect).toHaveBeenCalledTimes(1);
    expect(observer.disconnect).toHaveBeenCalledTimes(1);
  });

  it('disconnects observers, removes the visibility listener, and disposes once', async () => {
    const controller = createControllerHarness();
    const removeEventListener = vi.spyOn(document, 'removeEventListener');
    const { unmount } = render(
      <HeroRibbonField
        disabled={false}
        onReady={vi.fn()}
        onFailure={vi.fn()}
        loadScene={async () => () => controller}
      />,
    );

    await waitFor(() => expect(ResizeObserverHarness.instances).toHaveLength(1));
    unmount();

    expect(ResizeObserverHarness.instances[0].disconnect).toHaveBeenCalledTimes(1);
    expect(IntersectionObserverHarness.instances[0].disconnect).toHaveBeenCalledTimes(1);
    expect(removeEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(controller.dispose).toHaveBeenCalledTimes(1);
  });
});
