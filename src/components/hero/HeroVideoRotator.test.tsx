import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HeroVideoRotator } from './HeroVideoRotator';
import { CLIP_PLAY_SECONDS, HERO_VIDEO_CLIPS } from './heroVideoClips';

let intersectionCallback: IntersectionObserverCallback | undefined;

class IntersectionObserverHarness {
  static instances: IntersectionObserverHarness[] = [];
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  takeRecords = () => [];
  root = null;
  rootMargin = '0px';
  thresholds = [0.05];

  constructor(callback: IntersectionObserverCallback) {
    intersectionCallback = callback;
    IntersectionObserverHarness.instances.push(this);
  }
}

const play = vi.fn(() => Promise.resolve());
const pause = vi.fn();

function mockViewport(compact: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => ({
      matches: compact && query === '(max-width: 639px)',
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function mockSaveData(saveData: boolean | undefined) {
  Object.defineProperty(navigator, 'connection', {
    configurable: true,
    value: saveData === undefined ? undefined : { saveData },
  });
}

function videos() {
  return screen.queryAllByTestId('hero-rotator-video') as HTMLVideoElement[];
}

function activeVideo() {
  const video = videos().find((element) => element.dataset.active === 'true');
  if (!video) throw new Error('No active hero video');
  return video;
}

function last<T>(items: T[]): T | undefined {
  return items[items.length - 1];
}

function clipIds() {
  return videos().map((video) => Number(video.dataset.clipId));
}

function renderRotator(overrides: Partial<React.ComponentProps<typeof HeroVideoRotator>> = {}) {
  const onReady = vi.fn();
  const onFailure = vi.fn();
  const view = render(
    <HeroVideoRotator disabled={false} onReady={onReady} onFailure={onFailure} {...overrides} />,
  );
  return { ...view, onReady, onFailure };
}

const [first, second, third] = HERO_VIDEO_CLIPS;

describe('HeroVideoRotator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    play.mockClear();
    pause.mockClear();
    intersectionCallback = undefined;
    IntersectionObserverHarness.instances = [];
    vi.stubGlobal('IntersectionObserver', IntersectionObserverHarness);
    Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: play });
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', { configurable: true, value: pause });
    mockViewport(false);
    mockSaveData(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('plays the first clip full-bleed and preloads the next one underneath', () => {
    renderRotator();

    expect(clipIds()).toEqual([first.id, second.id]);
    const current = activeVideo();
    expect(current).toHaveAttribute('src', first.src);
    expect(current).toHaveAttribute('poster', first.poster);
    expect(current).toHaveAttribute('aria-label', first.title);
    expect(current).toHaveAttribute('playsinline');
    expect(current).toHaveAttribute('preload', 'auto');
    expect(current).not.toHaveAttribute('loop');
    expect(current.muted).toBe(true);
    expect(current).toHaveClass('absolute', 'inset-0', 'object-cover', 'opacity-100');

    const upcoming = videos()[1];
    expect(upcoming).toHaveAttribute('src', second.src);
    expect(upcoming).toHaveClass('opacity-0');

    expect(play).toHaveBeenCalledTimes(1);
    expect(play.mock.instances[0]).toBe(current);
    expect(pause.mock.instances).toContain(upcoming);
  });

  it('uses the lighter renditions on small screens', () => {
    mockViewport(true);
    renderRotator();

    expect(activeVideo()).toHaveAttribute('src', first.srcCompact);
    expect(videos()[1]).toHaveAttribute('src', second.srcCompact);
  });

  it('keeps every clip on Pexels and covers all three service lines', () => {
    HERO_VIDEO_CLIPS.forEach((clip) => {
      expect(clip.src).toMatch(/^https:\/\/videos\.pexels\.com\/video-files\/\d+\/.+\.mp4$/);
      expect(clip.srcCompact).toMatch(/^https:\/\/videos\.pexels\.com\/video-files\/\d+\/.+\.mp4$/);
      expect(clip.poster).toMatch(/^https:\/\/images\.pexels\.com\/videos\/\d+\//);
    });
    expect(new Set(HERO_VIDEO_CLIPS.map((clip) => clip.theme))).toEqual(
      new Set(['it-services', 'managed-services', 'helpdesk']),
    );
  });

  it('reports ready once and rotates to the next clip after the play window', () => {
    const { onReady } = renderRotator();

    fireEvent.playing(activeVideo());
    expect(onReady).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(CLIP_PLAY_SECONDS * 1000 - 1);
    });
    expect(activeVideo().dataset.clipId).toBe(String(first.id));

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(activeVideo().dataset.clipId).toBe(String(second.id));
    // The finished clip stays mounted (faded out) for the crossfade, the
    // next clip is queued up behind the new current one.
    expect(clipIds()).toEqual([first.id, second.id, third.id]);
    expect(videos()[0]).toHaveClass('opacity-0');
    expect(last(play.mock.instances)).toBe(activeVideo());

    fireEvent.playing(activeVideo());
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('rotates when the current clip ends', () => {
    renderRotator();

    fireEvent.ended(activeVideo());
    expect(activeVideo().dataset.clipId).toBe(String(second.id));
  });

  it('wraps around to the first clip after the last one', () => {
    renderRotator();

    for (let i = 0; i < HERO_VIDEO_CLIPS.length; i += 1) {
      fireEvent.ended(activeVideo());
    }
    expect(activeVideo().dataset.clipId).toBe(String(first.id));
  });

  it('skips a clip that fails to load without giving up', () => {
    const { onFailure } = renderRotator();

    fireEvent.error(activeVideo());
    expect(activeVideo().dataset.clipId).toBe(String(second.id));
    expect(onFailure).not.toHaveBeenCalled();

    // A failure while preloading is skipped once its turn comes up.
    fireEvent.error(videos().find((video) => Number(video.dataset.clipId) === third.id)!);
    fireEvent.ended(activeVideo());
    expect(activeVideo().dataset.clipId).toBe(String(HERO_VIDEO_CLIPS[3].id));
    expect(onFailure).not.toHaveBeenCalled();
  });

  it('falls back only when every clip has failed before anything played', () => {
    const { onReady, onFailure } = renderRotator();

    for (let i = 0; i < HERO_VIDEO_CLIPS.length; i += 1) {
      fireEvent.error(activeVideo());
    }
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(onReady).not.toHaveBeenCalled();
  });

  it('renders nothing when disabled', () => {
    const { onReady, onFailure } = renderRotator({ disabled: true });

    expect(screen.queryByTestId('hero-video-rotator')).not.toBeInTheDocument();
    expect(onReady).not.toHaveBeenCalled();
    expect(onFailure).not.toHaveBeenCalled();
    expect(IntersectionObserverHarness.instances).toHaveLength(0);
  });

  it('skips the footage and reports failure when the browser asks to save data', () => {
    mockSaveData(true);
    const { onFailure } = renderRotator();

    expect(screen.queryByTestId('hero-video-rotator')).not.toBeInTheDocument();
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(play).not.toHaveBeenCalled();
  });

  it('pauses while scrolled out of view or hidden and resumes afterwards', () => {
    const { unmount } = renderRotator();
    const observer = IntersectionObserverHarness.instances[0];
    expect(observer.observe).toHaveBeenCalledWith(screen.getByTestId('hero-video-rotator'));
    const current = activeVideo();
    pause.mockClear();
    play.mockClear();

    act(() => {
      intersectionCallback?.([{ isIntersecting: false } as IntersectionObserverEntry], observer as unknown as IntersectionObserver);
    });
    expect(pause.mock.instances).toContain(current);
    expect(play).not.toHaveBeenCalled();

    act(() => {
      intersectionCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], observer as unknown as IntersectionObserver);
    });
    expect(last(play.mock.instances)).toBe(current);

    play.mockClear();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(pause.mock.instances).toContain(current);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(last(play.mock.instances)).toBe(current);

    unmount();
    expect(observer.disconnect).toHaveBeenCalledTimes(1);
  });
});
