import { NewWaveLogo } from '../../../components/brand/NewWaveLogo';
import { DivisionLogo } from './DivisionLogo';

// "When both appear together, the parent leads and the division sits to its
// right or below, at equal height" (guidelines page 10). These widths give both
// "NEW WAVE" wordmarks the same cap height: the parent's is 26.1/360 of its
// width, the division primary's 29.8/310.65 — 232px and 176px both land on
// ~16.8px.
export const FAMILY_PARENT_WIDTH = 232;
export const FAMILY_DIVISION_WIDTH = 176;
/** The parent SVG's mark starts ~16.4px in at 232px wide vs ~2.3px for the division's; shift so edges align. */
export const PARENT_INSET_CORRECTION_PX = 14;

export function FamilyLockup({
  ground,
  direction = 'row',
  labelled = false,
}: {
  ground: 'light' | 'dark';
  direction?: 'row' | 'column';
  labelled?: boolean;
}) {
  const rule = ground === 'dark' ? 'var(--nw-slate)' : 'var(--nw-mist-gray)';
  const labelColor = ground === 'dark' ? 'var(--nw-mist-gray)' : 'var(--nw-slate)';
  // Lure Amber Deep is for light grounds only; on dark, the division uses Lure Amber.
  const divisionLabelColor = ground === 'dark' ? 'var(--nwse-lure-amber)' : 'var(--nwse-lure-amber-deep)';
  return (
    <div
      className={`flex ${direction === 'row' ? 'flex-col gap-6 sm:flex-row sm:items-center sm:gap-8' : 'flex-col gap-6'}`}
      data-role="family-lockup"
    >
      <div className="flex flex-col gap-2">
        {labelled ? (
          <span className="nwse-label" style={{ color: labelColor }}>
            Parent · New Wave IT
          </span>
        ) : null}
        <div style={{ marginLeft: -PARENT_INSET_CORRECTION_PX }}>
          <NewWaveLogo tone={ground === 'dark' ? 'onDark' : 'onLight'} size={FAMILY_PARENT_WIDTH} decorative />
        </div>
      </div>
      <span
        aria-hidden="true"
        className={direction === 'row' ? 'hidden h-12 w-px sm:block' : 'h-px w-full max-w-[232px]'}
        style={{ background: rule }}
      />
      <div className="flex flex-col gap-2">
        {labelled ? (
          <span className="nwse-label" style={{ color: divisionLabelColor }}>
            Division · New Wave: Social Engineering
          </span>
        ) : null}
        <DivisionLogo lockup="primary" ground={ground} width={FAMILY_DIVISION_WIDTH} decorative />
      </div>
    </div>
  );
}
