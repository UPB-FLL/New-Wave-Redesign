import { useRef } from 'react';
import { useHlsVideo } from '../../lib/useHlsVideo';

/**
 * Full-screen background video driven by the shared Mux HLS stream.
 * HLS attachment (native + hls.js fallback) lives in the useHlsVideo hook.
 */
export default function VideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  useHlsVideo(videoRef);

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
