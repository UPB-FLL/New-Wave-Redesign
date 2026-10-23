import { useId } from 'react';
import { DIVISION_ICONS, type DivisionIconName } from './iconData';

export interface NwseIconProps {
  name: DivisionIconName;
  /** Rendered width and height in px. The drawing grid is always 24 x 24. */
  size?: number;
  /** Accessible name. Without one the icon is decorative and hidden from assistive tech. */
  title?: string;
  className?: string;
  /** Override the supplied icon's primary cyan detail. */
  accentColor?: string;
}

const TONES = {
  signal: 'var(--nwse-signal-cyan, #31C6CF)',
  tide: 'var(--nwse-tide-blue, #317B92)',
  highlight: 'var(--nwse-lure-amber, #F2A33A)',
} as const;

/**
 * Supplied GroundSwell subjects and companion UI glyphs share a 24-unit grid.
 * At 24px and above the subjects retain the original cyan, tide, and amber
 * details. Compact icons use one color as directed by the supplied guide.
 * A visible label is still required wherever an icon conveys an action.
 */
export function NwseIcon({ name, size = 24, title, className, accentColor }: NwseIconProps) {
  const titleId = useId();
  const { paths, strokeWidth = 1.75, source } = DIVISION_ICONS[name];
  const compact = size < 24;
  const monochrome = compact || paths.every((path) => !path.tone);
  const a11y = title
    ? ({ role: 'img', 'aria-labelledby': titleId } as const)
    : ({ 'aria-hidden': true } as const);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={compact ? Math.max(strokeWidth, 1.65) : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      focusable="false"
      data-icon={name}
      data-icon-family="groundswell"
      data-icon-source={source}
      data-icon-color={monochrome ? 'mono' : 'brand'}
      {...a11y}
    >
      {title ? <title id={titleId}>{title}</title> : null}
      {paths.map((path, index) => {
        const color = compact
          ? 'currentColor'
          : path.accent && accentColor
            ? accentColor
            : path.tone ? TONES[path.tone] : 'currentColor';
        return (
          <path
            key={index}
            d={path.d}
            data-accent={path.accent ? 'true' : undefined}
            data-tone={path.tone}
            fill={path.fill ? color : 'none'}
            stroke={path.fill ? 'none' : color}
          />
        );
      })}
    </svg>
  );
}
