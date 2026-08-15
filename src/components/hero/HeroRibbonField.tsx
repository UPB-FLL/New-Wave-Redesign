import { useEffect, useRef } from 'react';
import type { RibbonSceneController, RibbonSceneFactory } from './ribbonSceneConfig';

type SceneLoader = () => Promise<RibbonSceneFactory>;

type HeroRibbonFieldProps = {
  disabled: boolean;
  onReady: () => void;
  onFailure: () => void;
  loadScene?: SceneLoader;
};

const defaultLoadScene: SceneLoader = async () => {
  const module = await import('./ribbonScene');
  return module.createRibbonScene;
};

export function HeroRibbonField({
  disabled,
  onReady,
  onFailure,
  loadScene = defaultLoadScene,
}: HeroRibbonFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onReadyRef = useRef(onReady);
  const onFailureRef = useRef(onFailure);

  onReadyRef.current = onReady;
  onFailureRef.current = onFailure;

  useEffect(() => {
    if (disabled) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let active = true;
    let cleanedUp = false;
    let failed = false;
    let ready = false;
    let running = false;
    let controller: RibbonSceneController | undefined;
    let controllerDisposed = false;
    let resizeObserver: ResizeObserver | undefined;
    let intersectionObserver: IntersectionObserver | undefined;
    let visibilityListenerRegistered = false;
    let isIntersecting = false;

    const disposeController = () => {
      if (!controller || controllerDisposed) return;

      controllerDisposed = true;
      try {
        controller.dispose();
      } catch {
        // Teardown remains best-effort if a renderer is already unavailable.
      }
    };

    const cleanup = () => {
      if (cleanedUp) return;

      cleanedUp = true;
      try {
        resizeObserver?.disconnect();
      } catch {
        // Continue releasing the remaining resources.
      }
      try {
        intersectionObserver?.disconnect();
      } catch {
        // Continue releasing the remaining resources.
      }
      if (visibilityListenerRegistered) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      disposeController();
    };

    const fail = () => {
      if (!active || failed) return;

      failed = true;
      cleanup();
      onFailureRef.current();
    };

    const syncPlayback = () => {
      if (!active || failed || !controller) return;

      try {
        if (isIntersecting && document.visibilityState === 'visible') {
          if (!running) {
            controller.start();
            running = true;
          }
        } else {
          controller.stop();
          running = false;
        }
      } catch {
        fail();
      }
    };

    const handleResize: ResizeObserverCallback = (entries) => {
      const entry = entries[0];
      if (!entry || !active || failed || !controller) return;

      try {
        controller.resize(entry.contentRect.width, entry.contentRect.height, window.devicePixelRatio);
      } catch {
        fail();
      }
    };

    const handleIntersection: IntersectionObserverCallback = (entries) => {
      const entry = entries[0];
      if (!entry || !active || failed) return;

      isIntersecting = entry.isIntersecting;
      syncPlayback();
    };

    function handleVisibilityChange() {
      syncPlayback();
    }

    const initialize = async () => {
      let factory: RibbonSceneFactory;
      try {
        factory = await loadScene();
      } catch {
        fail();
        return;
      }

      if (!active || cleanedUp || failed) return;

      try {
        controller = factory(canvas, {
          compact: container.clientWidth < 640,
          onFirstFrame: () => {
            if (!active || failed || ready) return;

            ready = true;
            onReadyRef.current();
          },
          onContextLost: fail,
        });

        if (!active || cleanedUp || failed) {
          disposeController();
          return;
        }

        resizeObserver = new ResizeObserver(handleResize);
        intersectionObserver = new IntersectionObserver(handleIntersection, { threshold: 0.05 });
        document.addEventListener('visibilitychange', handleVisibilityChange);
        visibilityListenerRegistered = true;
        resizeObserver.observe(container);
        intersectionObserver.observe(container);
      } catch {
        fail();
      }
    };

    void initialize();

    return () => {
      active = false;
      cleanup();
    };
  }, [disabled, loadScene]);

  if (disabled) return null;

  return (
    <div ref={containerRef} data-role="hero-ribbon-field" className="pointer-events-none absolute inset-0">
      <canvas
        ref={canvasRef}
        data-testid="hero-ribbon-canvas"
        aria-hidden="true"
        className="block h-full w-full"
      />
    </div>
  );
}
