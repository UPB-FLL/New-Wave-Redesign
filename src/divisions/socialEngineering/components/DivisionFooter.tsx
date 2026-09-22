import { Link } from 'react-router-dom';
import { NewWaveLogo } from '../../../components/brand/NewWaveLogo';
import { useContent } from '../../../lib/useContent';
import { divisionServices } from '../content';
import { NwseIcon } from '../icons/NwseIcon';
import {
  DIVISION_BASE_PATH,
  DIVISION_CONTACT_PATH,
  DIVISION_DESCRIPTOR,
  DIVISION_LOGO_MIN_WIDTH,
  DIVISION_NAME,
  DIVISION_PRIMARY_CTA,
  DIVISION_SHORT_NAME,
  PARENT_NAME,
  divisionServicePath,
} from '../site';

import { DivisionCurrents } from './DivisionCurrents';
import { DivisionLogo } from './DivisionLogo';
import { FAMILY_DIVISION_WIDTH, FAMILY_PARENT_WIDTH, PARENT_INSET_CORRECTION_PX } from './FamilyLockup';

const parentLinks = [
  { label: 'Managed IT services', href: '/service-category/managed-it-services' },
  { label: 'Cybersecurity', href: '/service-category/cybersecurity' },
  { label: 'Live IT support', href: '/service-category/live-it-support' },
  { label: 'About New Wave IT', href: '/about' },
  { label: 'Customer support', href: '/support' },
];

const linkClass = 'text-sm text-[var(--nw-mist-gray)] transition-colors hover:text-[var(--nwse-lure-amber)]';
const headingClass = 'nwse-type-kicker nwse-kicker-on-dark mb-3';
const listClass = 'flex flex-col gap-2 text-sm';

// The family lockup at the smallest size the guidelines allow: the division's
// primary lockup at its 160px minimum, the parent scaled by the same factor so
// both "NEW WAVE" wordmarks keep the same cap height (see FamilyLockup).
const LOCKUP_SCALE = DIVISION_LOGO_MIN_WIDTH.primary / FAMILY_DIVISION_WIDTH;
const FOOTER_DIVISION_WIDTH = DIVISION_LOGO_MIN_WIDTH.primary;
const FOOTER_PARENT_WIDTH = Math.round(FAMILY_PARENT_WIDTH * LOCKUP_SCALE);
const FOOTER_PARENT_INSET_PX = Math.round(PARENT_INSET_CORRECTION_PX * LOCKUP_SCALE);
// The parent SVG (360x120 viewBox) carries empty space above and below its
// artwork: ~22px and ~26px at 211px wide. Trim most of it so the wordmark lines
// up with the column headings and the rule sits midway between the two logos.
const FOOTER_PARENT_PAD_TOP_PX = 18;
const FOOTER_PARENT_PAD_BOTTOM_PX = 20;

export function DivisionFooter() {
  // Same CMS source and fallbacks as the parent footer: one company, one inbox.
  const content = useContent('footer');
  const phone = content.phone || '(954) 555-0100';
  const email = content.email || 'support@newwaveitfl.com';
  const address = content.address || '710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311';

  return (
    <footer className="nwse-dark relative overflow-hidden" style={{ background: 'var(--nw-deep-current)' }}>
      <DivisionCurrents className="pointer-events-none absolute inset-0 h-full w-full" opacity={0.18} />
      <div className="relative mx-auto max-w-7xl px-4 pb-6 pt-8 sm:px-6 lg:px-8 lg:pt-10">
        <div className="grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-[fit-content(280px)_repeat(2,minmax(0,1fr))] md:gap-x-8 lg:grid-cols-[fit-content(280px)_repeat(3,minmax(0,1fr))] lg:gap-y-8 xl:grid-cols-[fit-content(280px)_repeat(3,minmax(0,1fr))_minmax(0,1.25fr)]">
          {/* Family lockup: parent leads, division below at equal height (guidelines page 10). */}
          <div className="col-span-2 flex flex-col items-start gap-3 md:col-span-1 md:row-span-2 lg:row-span-1">
            <Link to="/" aria-label={`${PARENT_NAME} home`} className="shrink-0">
              <div style={{ marginLeft: -FOOTER_PARENT_INSET_PX, marginTop: -FOOTER_PARENT_PAD_TOP_PX, marginBottom: -FOOTER_PARENT_PAD_BOTTOM_PX }}>
                <NewWaveLogo tone="onDark" size={FOOTER_PARENT_WIDTH} decorative />
              </div>
            </Link>
            <span className="h-px w-full max-w-[160px]" style={{ background: 'var(--nw-slate)' }} aria-hidden="true" />
            <Link to={DIVISION_BASE_PATH} aria-label={`${DIVISION_NAME} home`} className="mt-1 shrink-0">
              <DivisionLogo lockup="primary" ground="dark" width={FOOTER_DIVISION_WIDTH} decorative />
            </Link>
            <p className="nwse-type-label mt-1" style={{ color: 'var(--nwse-lure-amber)' }}>
              {DIVISION_DESCRIPTOR}
            </p>
          </div>

          <div className="col-span-2 lg:col-span-1">
            <h2 className={headingClass}>{DIVISION_SHORT_NAME}</h2>
            <ul className="flex flex-row flex-wrap gap-x-5 gap-y-2 text-sm lg:flex-col lg:gap-2">
              <li>
                <Link to={DIVISION_BASE_PATH} className={linkClass}>
                  Division overview
                </Link>
              </li>
              <li>
                <Link to={DIVISION_CONTACT_PATH} className={linkClass}>
                  {DIVISION_PRIMARY_CTA}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className={headingClass}>Services</h2>
            <ul className={listClass}>
              {divisionServices.map((service) => (
                <li key={service.slug}>
                  <Link to={divisionServicePath(service.slug)} className={linkClass}>
                    {service.navLabel}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className={headingClass}>{PARENT_NAME}</h2>
            <ul className={listClass}>
              {parentLinks.map(({ label, href }) => (
                <li key={href}>
                  <Link to={href} className={linkClass}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-2 md:col-span-3 lg:col-span-4 xl:col-span-1">
            <h2 className={headingClass}>Get in touch</h2>
            <div className="flex flex-row flex-wrap gap-x-5 gap-y-2 text-[var(--nw-mist-gray)] xl:flex-col xl:flex-nowrap">
              <a href={`tel:${phone.replace(/\D/g, '')}`} className="flex items-start gap-2.5 text-sm transition-colors hover:text-[var(--nw-cloud-white)]">
                <NwseIcon name="phone" size={16} className="mt-0.5 shrink-0 text-[var(--nwse-lure-amber)]" />
                <span>{phone}</span>
              </a>
              <a href={`mailto:${email}`} className="flex items-start gap-2.5 text-sm transition-colors hover:text-[var(--nw-cloud-white)]">
                <NwseIcon name="mail" size={16} className="mt-0.5 shrink-0 text-[var(--nwse-lure-amber)]" />
                <span className="min-w-0 [overflow-wrap:anywhere]">{email}</span>
              </a>
              <div className="flex basis-full items-start gap-2.5 text-sm md:basis-auto">
                <NwseIcon name="map-pin" size={16} className="mt-0.5 shrink-0 text-[var(--nw-tide-blue)]" />
                <span>{address}</span>
              </div>
            </div>
          </div>
        </div>

        <div
          className="mt-6 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between lg:mt-8"
          style={{ borderColor: 'color-mix(in srgb, var(--nw-slate) 60%, transparent)' }}
        >
          <p className="text-sm text-[var(--nw-mist-gray)]">
            &copy; {new Date().getFullYear()} {PARENT_NAME}. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {[
              { label: 'Privacy Policy', to: '/privacy-policy' },
              { label: 'Terms and Conditions', to: '/terms-and-conditions' },
              { label: 'Cookie Policy', to: '/cookie-policy' },
            ].map(({ label, to }) => (
              <Link key={to} to={to} className={linkClass}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
