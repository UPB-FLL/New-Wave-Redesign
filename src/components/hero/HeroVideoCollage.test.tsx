import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HeroVideoCollage } from './HeroVideoCollage';
import { COMPACT_CLIP_COUNT, HERO_COLLAGE_CLIPS } from './heroCollageClips';

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

function renderCollage(overrides: Partial<React.ComponentProps<typeof HeroVideoCollage>> = {}) {
  const onReady = vi.fn();
  const onFailure = vi.fn();
  const view = render(
    <HeroVideoCollage disabled={false} onReady={onReady} onFailure={onFailure} {...overrides} />,
  );
  return { ...view, onReady, onFailure };
}

describe('HeroVideoCollage', () => {
  beforeEach(() => {
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
  });

  it('renders every curated clip as a muted, looping, inline video with a poster', () => {
    renderCollage();

    const tiles = screen.getAllByTestId('hero-collage-tile');
    expect(tiles).toHaveLength(HERO_COLLAGE_CLIPS.length);

    HERO_COLLAGE_CLIPS.forEach((clip, index) => {
      const video = tiles[index].querySelector('video');
      if (!video) throw new Error(`Tile ${clip.id} has no video`);
      expect(video).toHaveAttribute('src', clip.src);
      expect(video).toHaveAttribute('poster', clip.poster);
      expect(video).toHaveAttribute('aria-label', clip.title);
      expect(video).toHaveAttribute('loop');
      expect(video).toHaveAttribute('autoplay');
      expect(video).toHaveAttribute('playsinline');
      expect(video.muted).toBe(true);
      expect(video).toHaveClass('object-cover');
      expect(tiles[index]).toHaveClass(
        'col-span-2',
        clip.layout === 'tall' ? 'row-span-2' : 'row-span-1',
      );
      expect(clip.src).toMatch(/^https:\/\/videos\.pexels\.com\/video-files\/\d+\/.+\.mp4$/);
      expect(clip.poster).toMatch(/^https:\/\/images\.pexels\.com\/videos\/\d+\//);
    });

    const grid = tiles[0].parentElement;
    expect(grid?.getAttribute('style')).toContain('repeat(6, minmax(0, 1fr))');
    expect(screen.getByRole('link', { name: 'Footage via Pexels' })).toHaveAttribute('href', 'https://www.pexels.com');
  });

  it('covers a balanced mix of IT services, managed services, and help desk footage', () => {
    const themes = new Set(HERO_COLLAGE_CLIPS.map((clip) => clip.theme));
    expect(themes).toEqual(new Set(['it-services', 'managed-services', 'helpdesk']));

    const cells = (clips: typeof HERO_COLLAGE_CLIPS) =>
      clips.reduce((sum, clip) => sum + (clip.layout === 'tall' ? 4 : 2), 0);
    expect(cells(HERO_COLLAGE_CLIPS)).toBe(6 * 3);
    expect(cells(HERO_COLLAGE_CLIPS.slice(0, COMPACT_CLIP_COUNT))).toBe(4 * 3);
  });

  it('only loads the leading clips in a four-column grid on small screens', () => {
    mockViewport(true);
    renderCollage();

    const tiles = screen.getAllByTestId('hero-collage-tile');
    expect(tiles).toHaveLength(COMPACT_CLIP_COUNT);
    expect(tiles[0].parentElement?.getAttribute('style')).toContain('repeat(4, minmax(0, 1fr))');
  });

  it('reports ready once on the first playing clip and failure only when every clip errors', () => {
    const { onReady, onFailure } = renderCollage();
    const videos = screen.getAllByTestId('hero-collage-tile').map((tile) => tile.querySelector('video')!);

    fireEvent.error(videos[0]);
    expect(onFailure).not.toHaveBeenCalled();

    fireEvent.playing(videos[1]);
    fireEvent.playing(videos[2]);
    expect(onReady).toHaveBeenCalledTimes(1);

    videos.forEach((video) => fireEvent.error(video));
    expect(onFailure).not.toHaveBeenCalled();
  });

  it('falls back when no clip can play', () => {
    const { onReady, onFailure } = renderCollage();
    const videos = screen.getAllByTestId('hero-collage-tile').map((tile) => tile.querySelector('video')!);

    videos.forEach((video) => fireEvent.error(video));
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(onReady).not.toHaveBeenCalled();
  });

  it('renders nothing when disabled', () => {
    const { onReady, onFailure } = renderCollage({ disabled: true });

    expect(screen.queryByTestId('hero-video-collage')).not.toBeInTheDocument();
    expect(onReady).not.toHaveBeenCalled();
    expect(onFailure).not.toHaveBeenCalled();
    expect(IntersectionObserverHarness.instances).toHaveLength(0);
  });

  it('skips the footage and reports failure when the browser asks to save data', () => {
    mockSaveData(true);
    const { onFailure } = renderCollage();

    expect(screen.queryByTestId('hero-video-collage')).not.toBeInTheDocument();
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(play).not.toHaveBeenCalled();
  });

  it('pauses the loops while scrolled out of view or hidden and resumes them after', () => {
    const { unmount } = renderCollage();
    const total = HERO_COLLAGE_CLIPS.length;
    const observer = IntersectionObserverHarness.instances[0];

    expect(observer.observe).toHaveBeenCalledWith(screen.getByTestId('hero-video-collage'));
    expect(play).toHaveBeenCalledTimes(total);

    act(() => {
      intersectionCallback?.([{ isIntersecting: false } as IntersectionObserverEntry], observer as unknown as IntersectionObserver);
    });
    expect(pause).toHaveBeenCalledTimes(total);

    act(() => {
      intersectionCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], observer as unknown as IntersectionObserver);
    });
    expect(play).toHaveBeenCalledTimes(total * 2);

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(pause).toHaveBeenCalledTimes(total * 2);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });

    unmount();
    expect(observer.disconnect).toHaveBeenCalledTimes(1);
  });
});
