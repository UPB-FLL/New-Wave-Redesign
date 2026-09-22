import { DIVISION_ASSETS, DIVISION_LOGO_MIN_WIDTH, DIVISION_NAME } from '../site';

type Lockup = 'primary' | 'endorsed' | 'inline' | 'mark';
type Ground = 'light' | 'dark';

// Intrinsic aspect ratios of the kit's outlined SVGs (width / height).
const ASPECT: Record<Lockup, number> = {
  primary: 310.65 / 63.52,
  endorsed: 310.65 / 85.2,
  inline: 629.71 / 59.68,
  mark: 56 / 57,
};

const SOURCES: Record<Lockup, Record<Ground, string>> = {
  primary: { light: DIVISION_ASSETS.logoPrimaryOnLight, dark: DIVISION_ASSETS.logoPrimaryOnDark },
  endorsed: { light: DIVISION_ASSETS.logoEndorsedOnLight, dark: DIVISION_ASSETS.logoEndorsedOnDark },
  inline: { light: DIVISION_ASSETS.logoInlineOnLight, dark: DIVISION_ASSETS.logoInlineOnDark },
  mark: { light: DIVISION_ASSETS.markOnLight, dark: DIVISION_ASSETS.markOnDark },
};

/**
 * The division's master artwork, never retyped (guidelines page 08). "dark"
 * is the reversed treatment — only for Current Navy / Deep Current grounds.
 * Widths below the brand minimum are clamped up to it.
 */
export function DivisionLogo({
  lockup = 'primary',
  ground = 'light',
  width,
  className,
  decorative = false,
}: {
  lockup?: Lockup;
  ground?: Ground;
  width: number;
  className?: string;
  decorative?: boolean;
}) {
  const renderedWidth = Math.max(width, DIVISION_LOGO_MIN_WIDTH[lockup]);
  return (
    <img
      src={SOURCES[lockup][ground]}
      width={renderedWidth}
      height={Math.round(renderedWidth / ASPECT[lockup])}
      alt={decorative ? '' : DIVISION_NAME}
      className={className}
      decoding="async"
      data-lockup={lockup}
    />
  );
}
