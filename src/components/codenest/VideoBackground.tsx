import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

const HLS_SRC = 'https://stream.mux.com/tLkHO1qZoaaQOUeVWo8hEBeGQfySP02EPS02BmnNFyXys.m3u8';

/**
 * Full-screen background video driven by an HLS stream.
 *
 * Browsers with native HLS (Safari / iOS) get the source assigned directly;
 * everywhere else we attach hls.js with `enableWorker: false`, which keeps the
 * player stable inside sandboxed / cross-origin iframe previews.
 */
export default function VideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tryPlay = () => {
      // Autoplay can reject before the user interacts; that's fine for a muted
      // decorative loop, so we swallow the rejection.
      video.play().catch(() => {});
    };

    // Native HLS (Safari, iOS) — no library required.
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = HLS_SRC;
      video.addEventListener('loadedmetadata', tryPlay);
      return () => video.removeEventListener('loadedmetadata', tryPlay);
    }

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: false });
      hls.loadSource(HLS_SRC);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, tryPlay);
      return () => hls.destroy();
    }

    // No HLS support at all — leave the dark background in place.
    return undefined;
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ opacity: 0.6 }}
      />

      {/* Left-to-right darkening for headline legibility. */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(90deg, #070b0a 0%, rgba(7,11,10,0.55) 35%, transparent 100%)' }}
      />

      {/* Bottom-up fade so content sitting low on the hero stays readable. */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(0deg, #070b0a 0%, rgba(7,11,10,0.4) 28%, transparent 60%)' }}
      />
    </div>
  );
}
