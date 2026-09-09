import { useEffect, useRef, useState } from 'react';
import {
  COLLAGE_COLUMNS,
  COMPACT_CLIP_COUNT,
  HERO_COLLAGE_CLIPS,
  type HeroCollageClip,
} from './heroCollageClips';

type HeroVideoCollageProps = {
  /** Skip the videos entirely (reduced motion, or after a failure). */
  disabled: boolean;
  /** Fired once, when the first clip starts playing. */
  onReady: () => void;
  /** Fired once if no clip can play, so the hero can restore its static field. */
  onFailure: () => void;
  clips?: readonly HeroCollageClip[];
};

const COMPACT_QUERY = '(max-width: 639px)';

function prefersReducedData(): boolean {
  if (typeof navigator === 'undefined') return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return Boolean(connection?.saveData);
}

function isCompactViewport(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(COMPACT_QUERY).matches;
}

function playSilently(video: HTMLVideoElement) {
  try {
    const result = video.play();
    if (result && typeof result.catch === 'function') result.catch(() => undefined);
  } catch {
    // Autoplay rejections are expected before user interaction; the poster stays.
  }
}

const layoutClass: Record<HeroCollageClip['layout'], string> = {
  tall: 'col-span-2 row-span-2',
  wide: 'col-span-2 row-span-1',
};

export function HeroVideoCollage({
  disabled,
  onReady,
  onFailure,
  clips = HERO_COLLAGE_CLIPS,
}: HeroVideoCollageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  const onFailureRef = useRef(onFailure);
  const readyRef = useRef(false);
  const failedIds = useRef(new Set<number>());
  const [compact] = useState(isCompactViewport);
  const [reducedData] = useState(prefersReducedData);

  onReadyRef.current = onReady;
  onFailureRef.current = onFailure;

  const visibleClips = compact ? clips.slice(0, COMPACT_CLIP_COUNT) : clips;

  // Data Saver: treat as a failure so the hero falls back to the static field.
  useEffect(() => {
    if (disabled || !reducedData) return;
    onFailureRef.current();
  }, [disabled, reducedData]);

  // Pause the loops while the hero is scrolled away or the tab is hidden.
  useEffect(() => {
    if (disabled || reducedData) return;
    const container = containerRef.current;
    if (!container) return;

    let inView = true;
    const videos = () => Array.from(container.querySelectorAll('video'));
    const sync = () => {
      const shouldPlay = inView && document.visibilityState !== 'hidden';
      videos().forEach((video) => {
        if (shouldPlay) playSilently(video);
        else video.pause();
      });
    };

    let observer: IntersectionObserver | undefined;
    if (typeof IntersectionObserver === 'function') {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;
          inView = entry.isIntersecting;
          sync();
        },
        { threshold: 0.05 },
      );
      observer.observe(container);
    }
    document.addEventListener('visibilitychange', sync);
    sync();

    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [disabled, reducedData]);

  if (disabled || reducedData) return null;

  const handlePlaying = () => {
    if (readyRef.current) return;
    readyRef.current = true;
    onReadyRef.current();
  };

  const handleError = (clip: HeroCollageClip) => {
    failedIds.current.add(clip.id);
    if (failedIds.current.size >= visibleClips.length && !readyRef.current) {
      onFailureRef.current();
    }
  };

  return (
    <div
      ref={containerRef}
      data-role="hero-video-collage"
      data-testid="hero-video-collage"
      className="pointer-events-none absolute inset-0"
    >
      <div
        className="grid h-full w-full gap-[3px] bg-[var(--nw-deep-current)]"
        style={{
          gridTemplateColumns: `repeat(${compact ? COLLAGE_COLUMNS.compact : COLLAGE_COLUMNS.full}, minmax(0, 1fr))`,
          gridTemplateRows: 'repeat(3, minmax(0, 1fr))',
          gridAutoFlow: 'dense',
        }}
      >
        {visibleClips.map((clip, index) => (
          <figure
            key={clip.id}
            data-testid="hero-collage-tile"
            data-theme={clip.theme}
            className={`relative m-0 overflow-hidden ${layoutClass[clip.layout]}`}
          >
            <video
              className="h-full w-full object-cover motion-safe:animate-collage-drift"
              style={{ animationDelay: `${(index % 4) * -6}s` }}
              src={clip.src}
              poster={clip.poster}
              aria-label={clip.title}
              muted
              autoPlay
              loop
              playsInline
              disablePictureInPicture
              preload={index < COMPACT_CLIP_COUNT ? 'auto' : 'metadata'}
              onPlaying={handlePlaying}
              onError={() => handleError(clip)}
            />
          </figure>
        ))}
      </div>

      {/* Brand tint keeps the footage in the deep-current palette. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: 'rgba(9,19,29,0.42)' }}
      />
    </div>
  );
}
