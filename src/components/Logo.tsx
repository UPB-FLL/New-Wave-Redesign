import { useId } from 'react';

type Tone = 'onLight' | 'onDark';

/**
 * New Wave IT brand lockup: the three-wave gradient mark + "NEW WAVE IT"
 * wordmark and the "Don't get lost in the current" tagline.
 *
 * tone controls the wordmark/tagline colors so it reads on either a light
 * surface (navbar) or a dark surface (footer). The wave mark keeps its
 * cyan→green gradient on both.
 */
export default function Logo({
  tone = 'onLight',
  showTag = true,
  className = '',
}: {
  tone?: Tone;
  showTag?: boolean;
  className?: string;
}) {
  const gradientId = useId();
  const wordColor = tone === 'onLight' ? '#152232' : '#ffffff';
  const tagColor = tone === 'onLight' ? '#1AA6B2' : 'rgba(57,204,204,0.9)';

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 48 48" fill="none" className="h-10 w-10 shrink-0" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#14b8c4" />
            <stop offset="0.5" stopColor="#21c8d8" />
            <stop offset="1" stopColor="#4ade80" />
          </linearGradient>
        </defs>
        <path
          d="M2 30c6-10 12-10 18 0s12 10 18 0M2 20c6-10 12-10 18 0s12 10 18 0M6 40c5-7 10-7 15 0s10 7 15 0"
          stroke={`url(#${gradientId})`}
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span className="flex flex-col leading-none text-left">
        <span className="text-lg sm:text-xl font-extrabold tracking-tight" style={{ color: wordColor }}>
          NEW WAVE IT
        </span>
        {showTag && (
          <span className="text-[10px] sm:text-[11px] font-medium tracking-wide mt-1" style={{ color: tagColor }}>
            {"Don't get lost in the current"}
          </span>
        )}
      </span>
    </span>
  );
}
