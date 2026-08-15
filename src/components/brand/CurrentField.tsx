import { NEW_WAVE_COLORS } from '../../brand/tokens';
import { STANDARD_CURRENT_STROKES } from '../../brand/logoPaths';

type CurrentFieldProps = {
  density?: 'subtle' | 'standard' | 'highImpact';
  tone?: 'light' | 'dark';
  className?: string;
  decorative?: boolean;
  strokeColor?: string;
};

const densityGroups = {
  subtle: ['translate(-90 70) scale(25 9)'],
  standard: ['translate(-90 70) scale(25 9)', 'translate(260 300) scale(22 8)'],
  highImpact: [
    'translate(-90 70) scale(25 9)',
    'translate(260 300) scale(22 8)',
    'translate(780 520) scale(20 7)',
  ],
} as const;

function colorsFor(tone: NonNullable<CurrentFieldProps['tone']>) {
  return tone === 'dark'
    ? [NEW_WAVE_COLORS.signalCyan, NEW_WAVE_COLORS.continuityGreen, NEW_WAVE_COLORS.tideBlue]
    : [NEW_WAVE_COLORS.tideBlue, NEW_WAVE_COLORS.currentNavy, NEW_WAVE_COLORS.slate];
}

export function CurrentField({
  density = 'subtle',
  tone = 'dark',
  className,
  decorative = true,
  strokeColor,
}: CurrentFieldProps) {
  const colors = colorsFor(tone);

  return (
    <svg
      data-role="current-field"
      viewBox="0 0 1440 800"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden={decorative || undefined}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : 'New Wave IT current field'}
    >
      {densityGroups[density].map((transform) => (
        <g key={transform} transform={transform} opacity={tone === 'dark' ? 0.23 : 0.18}>
          {STANDARD_CURRENT_STROKES.map((d, index) => (
            <path
              key={d}
              data-role="current-field-stroke"
              d={d}
              fill="none"
              stroke={strokeColor ?? colors[index]}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.6"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      ))}
    </svg>
  );
}
