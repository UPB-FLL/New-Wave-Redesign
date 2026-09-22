import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronDown, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { divisionServices } from '../content';
import { DIVISION_BASE_PATH, DIVISION_CONTACT_PATH, DIVISION_ENDORSEMENT, PARENT_NAME, divisionServicePath } from '../site';
import { DivisionLogo } from './DivisionLogo';
import { ServiceIcon } from './ServiceIcon';

const navLinkClass =
  'text-sm font-medium text-[var(--nw-current-navy)] transition-colors hover:text-[var(--nwse-lure-amber-deep)]';

/** Division masthead: a parent endorsement bar over the division's own navigation. */
export function DivisionHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef<number | undefined>();
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  // Close menus whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
    setServicesOpen(false);
  }, [pathname]);

  const openServices = () => {
    window.clearTimeout(closeTimer.current);
    setServicesOpen(true);
  };
  const closeServicesSoon = () => {
    closeTimer.current = window.setTimeout(() => setServicesOpen(false), 180);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* Endorsement bar: the parent leads, the division follows (guidelines page 10). */}
      <div className="nwse-dark" style={{ background: 'var(--nw-deep-current)' }}>
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <p className="nwse-label truncate" style={{ color: 'var(--nw-mist-gray)' }}>
            {DIVISION_ENDORSEMENT}
          </p>
          <Link
            to="/"
            className="flex shrink-0 items-center gap-1 text-xs font-medium text-[var(--nw-cloud-white)] transition-colors hover:text-[var(--nwse-lure-amber)]"
          >
            <span className="hidden sm:inline">Managed IT &amp; cybersecurity at</span> {PARENT_NAME}
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <nav
        aria-label="New Wave: Social Engineering"
        className="border-b transition-shadow duration-200"
        style={{
          background: 'var(--nw-cloud-white)',
          borderColor: 'var(--nw-mist-gray)',
          boxShadow: scrolled ? '0 3px 14px rgba(9, 19, 29, 0.1)' : 'none',
        }}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
          <Link to={DIVISION_BASE_PATH} className="flex shrink-0 items-center py-2" aria-label="New Wave: Social Engineering home">
            <DivisionLogo lockup="primary" ground="light" width={184} decorative />
          </Link>

          <div className="hidden items-center gap-6 lg:flex">
            <Link to={DIVISION_BASE_PATH} className={navLinkClass}>
              Overview
            </Link>

            <div className="relative" onMouseEnter={openServices} onMouseLeave={closeServicesSoon}>
              <button
                type="button"
                className={`${navLinkClass} flex items-center gap-1`}
                onClick={() => setServicesOpen((open) => !open)}
                aria-expanded={servicesOpen}
                aria-controls="nwse-services-menu"
              >
                Services
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className={`transition-transform duration-200 ${servicesOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {servicesOpen ? (
                <div className="absolute left-1/2 top-full z-50 w-[340px] -translate-x-1/2 pt-3">
                  <ul id="nwse-services-menu" className="nwse-card overflow-hidden p-2 shadow-xl">
                    {divisionServices.map((service) => (
                      <li key={service.slug}>
                        <Link
                          to={divisionServicePath(service.slug)}
                          className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-[var(--nw-cloud-white)]"
                        >
                          <span className="nwse-icon h-8 w-8 shrink-0">
                            <ServiceIcon icon={service.icon} size={16} />
                          </span>
                          <span className="text-sm font-medium text-[var(--nw-current-navy)]">{service.navLabel}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <Link to={DIVISION_CONTACT_PATH} className="nwse-btn nwse-btn-amber-deep min-h-10 px-4 py-2 text-sm">
              Scope an assessment
            </Link>
          </div>

          <button
            type="button"
            className="rounded-md p-2 text-[var(--nw-current-navy)] transition-colors hover:bg-[var(--nw-mist-gray)] lg:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="nwse-mobile-menu"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {menuOpen ? (
          <div id="nwse-mobile-menu" className="border-t lg:hidden" style={{ borderColor: 'var(--nw-mist-gray)' }}>
            <div className="flex flex-col gap-3 px-5 py-5">
              <Link to={DIVISION_BASE_PATH} className={navLinkClass}>
                Overview
              </Link>
              <p className="nwse-kicker mt-1">Services</p>
              <ul className="flex flex-col gap-2 border-l pl-3" style={{ borderColor: 'var(--nw-mist-gray)' }}>
                {divisionServices.map((service) => (
                  <li key={service.slug}>
                    <Link to={divisionServicePath(service.slug)} className={navLinkClass}>
                      {service.navLabel}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link to={DIVISION_CONTACT_PATH} className="nwse-btn nwse-btn-amber-deep mt-2 text-sm">
                Scope an assessment
              </Link>
            </div>
          </div>
        ) : null}
      </nav>
    </header>
  );
}

/** Space the fixed endorsement bar (h-9) + nav (h-20) occupies. */
export const DIVISION_HEADER_OFFSET_CLASS = 'pt-[116px]';
