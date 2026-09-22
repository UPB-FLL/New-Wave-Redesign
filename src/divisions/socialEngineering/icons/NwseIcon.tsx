import { useId } from 'react';
import { DIVISION_ICONS, type DivisionIconName } from './iconData';

export interface NwseIconProps {
  name: DivisionIconName;
  /** Rendered width and height in px. The drawing grid is always 24 x 24. */
  size?: number;
  /** Accessible name. Without one the icon is decorative and hidden from assistive tech. */
  title?: string;
  className?: string;
  /** Stroke for the brand-wave accent. Defaults to var(--nwse-icon-accent, currentColor). */
  accentColor?: string;
}

const DEFAULT_ACCENT = 'var(--nwse-icon-accent, currentColor)';

/**
 * One icon from the division's set. The base strokes use currentColor, so set
 * the colour with a text-* class; the accent (the brand wave) follows
 * --nwse-icon-accent, which .nwse-root sets to Lure Amber.
 */
export function NwseIcon({ name, size = 24, title, className, accentColor }: NwseIconProps) {
  const titleId = useId();
  const { paths } = DIVISION_ICONS[name];
  const accentStyle = { stroke: accentColor ?? DEFAULT_ACCENT };
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
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      focusable="false"
      data-icon={name}
      {...a11y}
    >
      {title ? <title id={titleId}>{title}</title> : null}
      {paths.map((path, index) =>
        path.accent ? (
          <path key={index} d={path.d} data-accent="true" style={accentStyle} />
        ) : (
          <path key={index} d={path.d} />
        ),
      )}
    </svg>
  );
}
