import { Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { NewWaveLogo } from '../../../components/brand/NewWaveLogo';
import { useContent } from '../../../lib/useContent';
import { divisionServices } from '../content';
import {
  DIVISION_BASE_PATH,
  DIVISION_CONTACT_PATH,
  DIVISION_DESCRIPTOR,
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
const headingClass = 'nwse-kicker nwse-kicker-on-dark mb-4';

export function DivisionFooter() {
  // Same CMS source and fallbacks as the parent footer: one company, one inbox.
  const content = useContent('footer');
  const phone = content.phone || '(954) 555-0100';
  const email = content.email || 'support@newwaveitfl.com';
  const address = content.address || '710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311';

  return (
    <footer className="nwse-dark relative overflow-hidden" style={{ background: 'var(--nw-deep-current)' }}>
      <DivisionCurrents className="pointer-events-none absolute inset-0 h-full w-full" opacity={0.18} />
      <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        {/* Family lockup: parent leads, division to its right at equal height (guidelines page 10). */}
        <div
          className="mb-10 flex flex-col gap-6 border-b pb-10 sm:flex-row sm:items-center sm:gap-10"
          style={{ borderColor: 'color-mix(in srgb, var(--nw-slate) 60%, transparent)' }}
        >
          <Link to="/" aria-label={`${PARENT_NAME} home`} className="shrink-0">
            <div style={{ marginLeft: -PARENT_INSET_CORRECTION_PX }}>
              <NewWaveLogo tone="onDark" size={FAMILY_PARENT_WIDTH} decorative />
            </div>
          </Link>
          <span className="hidden h-12 w-px sm:block" style={{ background: 'var(--nw-slate)' }} aria-hidden="true" />
          <Link to={DIVISION_BASE_PATH} aria-label={`${DIVISION_NAME} home`} className="shrink-0">
            <DivisionLogo lockup="primary" ground="dark" width={FAMILY_DIVISION_WIDTH} decorative />
          </Link>
          <p className="max-w-sm text-sm leading-relaxed text-[var(--nw-mist-gray)] sm:ml-auto">
            {DIVISION_NAME} is the social media, brand, web, and marketing division of {PARENT_NAME}, serving Fort Lauderdale and
            South Florida.
            <span className="nwse-label mt-3 block" style={{ color: 'var(--nwse-lure-amber)' }}>{DIVISION_DESCRIPTOR}</span>
          </p>
        </div>

        <div className="mb-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h2 className={headingClass}>Services</h2>
            <ul className="flex flex-col gap-3">
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
            <h2 className={headingClass}>{DIVISION_SHORT_NAME}</h2>
            <ul className="flex flex-col gap-3">
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
            <h2 className={headingClass}>{PARENT_NAME}</h2>
            <ul className="flex flex-col gap-3">
              {parentLinks.map(({ label, href }) => (
                <li key={href}>
                  <Link to={href} className={linkClass}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className={headingClass}>Get in touch</h2>
            <div className="flex flex-col gap-4 text-[var(--nw-mist-gray)]">
              <a href={`tel:${phone.replace(/\D/g, '')}`} className="flex items-start gap-3 text-sm transition-colors hover:text-[var(--nw-cloud-white)]">
                <Phone size={16} className="mt-0.5 shrink-0 text-[var(--nwse-lure-amber)]" aria-hidden="true" />
                <span>{phone}</span>
              </a>
              <a href={`mailto:${email}`} className="flex items-start gap-3 text-sm transition-colors hover:text-[var(--nw-cloud-white)]">
                <Mail size={16} className="mt-0.5 shrink-0 text-[var(--nwse-lure-amber)]" aria-hidden="true" />
                <span>{email}</span>
              </a>
              <div className="flex items-start gap-3 text-sm">
                <MapPin size={16} className="mt-0.5 shrink-0 text-[var(--nw-tide-blue)]" aria-hidden="true" />
                <span>{address}</span>
              </div>
            </div>
          </div>
        </div>

        <div
          className="flex flex-col items-center justify-between gap-4 border-t pt-7 sm:flex-row"
          style={{ borderColor: 'color-mix(in srgb, var(--nw-slate) 60%, transparent)' }}
        >
          <p className="text-sm text-[var(--nw-mist-gray)]">
            &copy; {new Date().getFullYear()} {PARENT_NAME}. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
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
