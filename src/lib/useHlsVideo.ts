import { useEffect, type RefObject } from 'react';
import Hls from 'hls.js';

/** Shared Mux HLS stream used for the cinematic hero background. */
export const MUX_HLS_SRC =
  'https://stream.mux.com/tLkHO1qZoaaQOUeVWo8hEBeGQfySP02EPS02BmnNFyXys.m3u8';

/**
 * Attaches an HLS stream to a <video> element.
 *
 * Browsers with native HLS (Safari / iOS) get the source assigned directly;
 * everywhere else we attach hls.js with `enableWorker: false`, which keeps the
 * player stable inside sandboxed / cross-origin iframe previews. The hls.js
 * instance is destroyed on cleanup.
 */
export function useHlsVideo(ref: RefObject<HTMLVideoElement>, src: string = MUX_HLS_SRC) {
  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    // Autoplay can reject before the user interacts; that's fine for a muted
    // decorative loop, so we swallow the rejection.
    const tryPlay = () => {
      video.play().catch(() => {});
    };

    // Native HLS (Safari, iOS) — no library required.
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.addEventListener('loadedmetadata', tryPlay);
      return () => video.removeEventListener('loadedmetadata', tryPlay);
    }

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: false });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, tryPlay);
      return () => hls.destroy();
    }

    // No HLS support at all — leave the dark background in place.
    return undefined;
  }, [ref, src]);
}
