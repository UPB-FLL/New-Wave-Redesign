import { NEW_WAVE_COLORS } from '../../brand/tokens';
import { HERITAGE_PATH, NEW_WAVE_LOGO_GEOMETRY, WORDMARK_PATH } from '../../brand/logoPaths';
import { BrandTone, CurrentStrokes } from './BrandMark';

export type NewWaveLogoProps = {
  tone?: BrandTone;
  layout?: 'horizontal' | 'stacked';
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg' | number;
  className?: string;
  decorative?: boolean;
};

const sizeWidths = {
  sm: 140,
  md: 180,
  lg: 240,
} as const;

function wordmarkColor(tone: BrandTone): string {
  if (tone === 'onDark' || tone === 'oneColorWhite') return NEW_WAVE_COLORS.cloudWhite;
  return NEW_WAVE_COLORS.currentNavy;
}

function taglineColor(tone: BrandTone): string {
  if (tone === 'oneColorNavy') return NEW_WAVE_COLORS.currentNavy;
  if (tone === 'oneColorWhite') return NEW_WAVE_COLORS.cloudWhite;
  return tone === 'onDark' ? NEW_WAVE_COLORS.signalCyan : NEW_WAVE_COLORS.tideBlue;
}

function requestedWidth(size: NewWaveLogoProps['size']): number {
  if (typeof size === 'number') return size;
  return sizeWidths[size ?? 'md'];
}

function pathTransform(x: number, baseline: number, path: { unitsPerEm: number }, height: number): string {
  return `translate(${x} ${baseline}) scale(${height / path.unitsPerEm})`;
}

export function NewWaveLogo({
  tone = 'onLight',
  layout = 'horizontal',
  showTagline = false,
  size = 'md',
  className,
  decorative = false,
}: NewWaveLogoProps) {
  const minimumWidth = showTagline
    ? NEW_WAVE_LOGO_GEOMETRY.minimumDigitalWidth.with_heritage_line
    : NEW_WAVE_LOGO_GEOMETRY.minimumDigitalWidth.horizontal;
  const width = Math.max(requestedWidth(size), minimumWidth);
  const isHorizontal = layout === 'horizontal';
  const wordmarkHeight = isHorizontal ? 35 : 31;
  const wordmarkScale = wordmarkHeight / WORDMARK_PATH.unitsPerEm;
  const wordmarkX = isHorizontal
    ? 96
    : (NEW_WAVE_LOGO_GEOMETRY.viewBox.width - WORDMARK_PATH.advance * wordmarkScale) / 2;
  const heritageHeight = isHorizontal ? 12 : 10;
  const heritageScale = heritageHeight / HERITAGE_PATH.unitsPerEm;
  const heritageX = isHorizontal
    ? 98
    : (NEW_WAVE_LOGO_GEOMETRY.viewBox.width - HERITAGE_PATH.advance * heritageScale) / 2;

  return (
    <svg
      viewBox={`0 0 ${NEW_WAVE_LOGO_GEOMETRY.viewBox.width} ${NEW_WAVE_LOGO_GEOMETRY.viewBox.height}`}
      width={width}
      className={className}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : 'New Wave IT'}
      role={decorative ? undefined : 'img'}
    >
      <g transform={isHorizontal ? 'translate(20 28) scale(0.92)' : 'translate(148 12) scale(0.92)'}>
        <CurrentStrokes tone={tone} />
      </g>
      <path
        data-role="wordmark-path"
        d={WORDMARK_PATH.d}
        fill={wordmarkColor(tone)}
        transform={pathTransform(wordmarkX, isHorizontal ? 69 : 98, WORDMARK_PATH, wordmarkHeight)}
      />
      {showTagline ? (
        <path
          data-role="heritage-path"
          d={HERITAGE_PATH.d}
          fill={taglineColor(tone)}
          transform={pathTransform(heritageX, isHorizontal ? 96 : 116, HERITAGE_PATH, heritageHeight)}
        />
      ) : null}
    </svg>
  );
}
