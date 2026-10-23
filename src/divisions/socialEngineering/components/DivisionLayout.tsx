import type { ReactNode } from 'react';
import '../division.css';
import '../type.css';
import '../../../../public/brand/social-engineering/04_Fonts/fonts.css';
import '../../../groundswell/brand.css';
import '../groundswell-division.css';
import { useDivisionIcons, useParentJsonLdHidden } from '../useDivisionMeta';
import { DIVISION_HEADER_OFFSET_CLASS, DivisionHeader } from './DivisionHeader';
import { DivisionFooter } from './DivisionFooter';

/** Chrome for every /social-engineering page, in place of the parent's navbar and footer. */
export function DivisionLayout({ children }: { children: ReactNode }) {
  useDivisionIcons();
  useParentJsonLdHidden();
  return (
    <div className={`nwse-root gs-branding gs-division min-h-screen ${DIVISION_HEADER_OFFSET_CLASS}`} data-division="social-engineering">
      <DivisionHeader />
      <main id="main">{children}</main>
      <DivisionFooter />
    </div>
  );
}
