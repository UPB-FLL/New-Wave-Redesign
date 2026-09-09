import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CLIP_PLAY_SECONDS,
  CROSSFADE_MS,
  HERO_VIDEO_CLIPS,
  type HeroVideoClip,
} from './heroVideoClips';

type HeroVideoRotatorProps = {
  /** Skip the videos entirely (reduced motion, or after a failure). */
  disabled: boolean;
  /** Fired once, when the first clip starts playing. */
  onReady: () => void;
  /** Fired once if no clip can play, so the hero can restore its static field. */
  onFailure: () => void;
  clips?: readonly HeroVideoClip[];
  /** Seconds each clip plays before rotating to the next. */
  playSeconds?: number;
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

/**
 * Full-bleed background video that rotates through the curated clips.
 *
 * At most three <video> elements are mounted: the clip that just finished
 * (fading out), the current clip, and the next clip preloading underneath
 * so the crossfade never waits on the network.
 */
export function HeroVideoRotator({
  disabled,
  onReady,
  onFailure,
  clips = HERO_VIDEO_CLIPS,
  playSeconds = CLIP_PLAY_SECONDS,
}: HeroVideoRotatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  const onFailureRef = useRef(onFailure);
  const readyRef = useRef(false);
  const failedIds = useRef(new Set<number>());
  const timerRef = useRef<number | undefined>(undefined);
  const startedIdRef = useRef<number | undefined>(undefined);
  const [current, setCurrent] = useState(0);
  const [previous, setPrevious] = useState<number | undefined>(undefined);
  const [suspended, setSuspended] = useState(false);
  const [compact] = useState(isCompactViewport);
  const [reducedData] = useState(prefersReducedData);

  onReadyRef.current = onReady;
  onFailureRef.current = onFailure;

  const count = clips.length;
  const inactive = disabled || reducedData || count === 0;
  const currentClip = clips[current];

  const clearTimer = () => {
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  };

  const advance = useCallback(() => {
    clearTimer();
    setCurrent((index) => {
      setPrevious(index);
      return (index + 1) % count;
    });
  }, [count]);

  // Data Saver or an empty clip list: treat as a failure so the hero falls
  // back to the static field.
  useEffect(() => {
    if (disabled) return;
    if (reducedData || count === 0) onFailureRef.current();
  }, [disabled, reducedData, count]);

  // Pause playback while the hero is scrolled away or the tab is hidden.
  useEffect(() => {
    if (inactive) return;
    const container = containerRef.current;
    if (!container) return;

    let inView = true;
    const sync = () => setSuspended(!inView || document.visibilityState === 'hidden');

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
  }, [inactive]);

  // Play the current clip from the top and keep every other clip paused.
  useEffect(() => {
    if (inactive) return;
    const container = containerRef.current;
    if (!container || !currentClip) return;

    if (failedIds.current.has(currentClip.id) && failedIds.current.size < count) {
      advance();
      return;
    }

    container.querySelectorAll('video').forEach((video) => {
      if (Number(video.dataset.clipId) !== currentClip.id) {
        video.pause();
        return;
      }
      if (startedIdRef.current !== currentClip.id) {
        startedIdRef.current = currentClip.id;
        try {
          video.currentTime = 0;
        } catch {
          // Media not yet seekable; it starts from the top anyway.
        }
      }
      if (suspended) {
        video.pause();
        clearTimer();
      } else {
        playSilently(video);
      }
    });
  }, [inactive, advance, count, currentClip, suspended]);

  useEffect(() => clearTimer, []);

  if (inactive) return null;

  const handlePlaying = () => {
    if (!readyRef.current) {
      readyRef.current = true;
      onReadyRef.current();
    }
    clearTimer();
    timerRef.current = window.setTimeout(advance, playSeconds * 1000);
  };

  const handleError = (clip: HeroVideoClip) => {
    failedIds.current.add(clip.id);
    if (failedIds.current.size >= count) {
      clearTimer();
      if (!readyRef.current) onFailureRef.current();
      return;
    }
    if (clip.id === currentClip?.id) advance();
  };

  const next = count > 1 ? (current + 1) % count : undefined;
  const slots: Array<{ clip: HeroVideoClip; isCurrent: boolean }> = [];
  const seen = new Set<number>();
  [previous, current, next].forEach((index) => {
    if (index === undefined) return;
    const clip = clips[index];
    if (!clip || seen.has(clip.id)) return;
    seen.add(clip.id);
    slots.push({ clip, isCurrent: index === current });
  });

  return (
    <div
      ref={containerRef}
      data-role="hero-video-rotator"
      data-testid="hero-video-rotator"
      className="pointer-events-none absolute inset-0 overflow-hidden bg-[var(--nw-deep-current)]"
    >
      {slots.map(({ clip, isCurrent }) => (
        <video
          key={clip.id}
          data-testid="hero-rotator-video"
          data-clip-id={clip.id}
          data-active={isCurrent ? 'true' : 'false'}
          data-theme={clip.theme}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out ${
            isCurrent ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ transitionDuration: `${CROSSFADE_MS}ms` }}
          src={compact ? clip.srcCompact : clip.src}
          poster={clip.poster}
          aria-label={clip.title}
          muted
          playsInline
          disablePictureInPicture
          preload="auto"
          onPlaying={isCurrent ? handlePlaying : undefined}
          onEnded={isCurrent ? advance : undefined}
          onError={() => handleError(clip)}
        />
      ))}

      {/* Brand tint keeps the footage in the deep-current palette. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: 'rgba(9,19,29,0.42)' }}
      />
    </div>
  );
}
