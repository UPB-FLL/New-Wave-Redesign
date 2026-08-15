import { NEW_WAVE_COLORS } from '../../brand/tokens';
import { MICRO_CURRENT_STROKES, STANDARD_CURRENT_STROKES } from '../../brand/logoPaths';

export type BrandTone = 'onLight' | 'onDark' | 'oneColorNavy' | 'oneColorWhite';
export type BrandMarkOpticalSize = 'standard' | 'micro';

type CurrentStrokesProps = {
  opticalSize?: BrandMarkOpticalSize;
  tone?: BrandTone;
};

type BrandMarkProps = CurrentStrokesProps & {
  size?: number;
  className?: string;
  decorative?: boolean;
  /** Enables isolated oversized micro-mark tests without weakening the production guard. */
  allowMicroOversizeForTesting?: boolean;
};

const multicolorStrokes = [
  NEW_WAVE_COLORS.signalCyan,
  NEW_WAVE_COLORS.continuityGreen,
  NEW_WAVE_COLORS.tideBlue,
] as const;

function brandMarkColors(tone: BrandTone): readonly string[] {
  if (tone === 'oneColorNavy') return [NEW_WAVE_COLORS.currentNavy];
  if (tone === 'oneColorWhite') return [NEW_WAVE_COLORS.cloudWhite];
  return multicolorStrokes;
}

export function CurrentStrokes({ opticalSize = 'standard', tone = 'onLight' }: CurrentStrokesProps) {
  const paths = opticalSize === 'micro' ? MICRO_CURRENT_STROKES : STANDARD_CURRENT_STROKES;
  const colors = brandMarkColors(tone);

  return (
    <g data-role="three-current-mark">
      {paths.map((d, index) => (
        <path
          key={d}
          data-role="current-stroke"
          d={d}
          fill="none"
          stroke={colors[index % colors.length]}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
        />
      ))}
    </g>
  );
}

export function BrandMark({
  opticalSize = 'standard',
  tone = 'onLight',
  size = 64,
  className,
  decorative = false,
  allowMicroOversizeForTesting = false,
}: BrandMarkProps) {
  if (opticalSize === 'micro' && size > 24 && !allowMicroOversizeForTesting) {
    throw new RangeError('Micro BrandMark instances are limited to 24px');
  }

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : 'New Wave IT mark'}
      role={decorative ? undefined : 'img'}
    >
      <CurrentStrokes opticalSize={opticalSize} tone={tone} />
    </svg>
  );
}
