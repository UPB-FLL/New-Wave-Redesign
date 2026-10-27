import { useEffect, useRef, useState, type FocusEvent, type PointerEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { divisionServices } from '../content';
import { GROUNDSWELL_BRAND } from '../../../groundswell/brand';
import { HEADWAY_BRAND } from '../../../groundswell/headwayBrand';
import { GROUNDSWELL_PATH } from '../../../groundswell/site';
import { HEADWAY_NAME } from '../../../lib/headway';
import './division-navigation.css';
import {
  DIVISION_BASE_PATH,
  DIVISION_CONTACT_PATH,
  DIVISION_CONTACT_US_PATH,
  DIVISION_GROUNDSWELL_PATH,
  DIVISION_HEADWAY_PATH,
  DIVISION_CUSTOMERS_PATH,
  DIVISION_ENDORSEMENT,
  DIVISION_PRIMARY_CTA,
  PARENT_NAME,
  divisionServicePath,
} from '../site';
import { NwseIcon } from '../icons/NwseIcon';
import { DivisionLogo } from './DivisionLogo';
import { ServiceIcon } from './ServiceIcon';

const navLinkClass =
  'gs-division-nav-link text-sm font-medium text-[var(--nw-current-navy)] transition-colors hover:text-[var(--nwse-lure-amber-deep)]';

// Mobile-menu rows: 44px targets, the current page in Lure Amber Deep.
const menuRowClass =
  'gs-division-menu-link -mx-2 flex min-h-11 items-center gap-3 rounded-md px-2 text-base font-medium text-[var(--nw-current-navy)] transition-colors hover:bg-[var(--nw-pure-white)] active:bg-[var(--nw-pure-white)] aria-[current=page]:text-[var(--nwse-lure-amber-deep)]';

/** The router may report a trailing slash (prerendered URLs end in one). */
const samePath = (pathname: string, path: string) => pathname.replace(/\/+$/, '') === path;

/**
 * The desktop link row replaces the menu from 64em: 1024px at the default text
 * size (the same point as lg). The named container query in division-navigation.css
 * also measures this threshold in the header's actual text size, so text-only
 * enlargement keeps the compact menu. Keep the media classes in step below.
 */
const DESKTOP_NAV_QUERY = '(min-width: 64em)';

/** Page links: after the Headway menu on desktop, beside Overview in the phone and tablet sheet. */
const pageLinks = [
  { label: 'GroundSwell', path: DIVISION_GROUNDSWELL_PATH },
  { label: 'Customers', path: DIVISION_CUSTOMERS_PATH },
  { label: 'Contact us', path: DIVISION_CONTACT_US_PATH },
];

/** Division masthead: a parent endorsement bar over the division's own navigation. */
export function DivisionHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef<number | undefined>();
  const servicesButton = useRef<HTMLButtonElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
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

  // The open menu covers the page (a full-height sheet on phones, a panel over
  // the dimmed page on tablets), so everything behind it is inert: Tab and a
  // screen reader's swipe stay in the header instead of reaching content the
  // menu hides. The page itself does not scroll
  // while the menu is open, so closing it returns the reader to where they
  // were. The menu exists only below DESKTOP_NAV_QUERY, so it closes if the
  // window widens to desktop, where its toggle is gone.
  useEffect(() => {
    if (!menuOpen) return;
    const header = headerRef.current;
    const behind = header?.parentElement ? [...header.parentElement.children].filter((element) => element !== header) : [];
    const inerted = behind;
    inerted.forEach((element) => element.setAttribute('inert', ''));
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    const desktop = typeof window.matchMedia === 'function' ? window.matchMedia(DESKTOP_NAV_QUERY) : null;
    const closeOnDesktop = () => {
      const toggle = menuButton.current;
      if (toggle && window.getComputedStyle(toggle).display === 'none') setMenuOpen(false);
    };
    // Container queries also keep the compact menu when only text is enlarged.
    // Observe the toggle so hiding it releases inert/scroll locking immediately.
    const toggleObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(closeOnDesktop) : null;
    if (menuButton.current) toggleObserver?.observe(menuButton.current);
    desktop?.addEventListener('change', closeOnDesktop);
    window.addEventListener('resize', closeOnDesktop);
    return () => {
      inerted.forEach((element) => element.removeAttribute('inert'));
      root.style.overflow = previousOverflow;
      desktop?.removeEventListener('change', closeOnDesktop);
      window.removeEventListener('resize', closeOnDesktop);
      toggleObserver?.disconnect();
    };
  }, [menuOpen]);

  // Escape dismisses whichever menu is open and returns focus to its button (WCAG 1.4.13).
  useEffect(() => {
    if (!menuOpen && !servicesOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (servicesOpen) servicesButton.current?.focus();
      else menuButton.current?.focus();
      setServicesOpen(false);
      setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen, servicesOpen]);

  // Hover opens the dropdown for mouse pointers only. Touch devices emulate
  // mouseenter before the click, which would open and then instantly re-close it.
  const openServices = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    window.clearTimeout(closeTimer.current);
    setServicesOpen(true);
  };
  const closeServicesSoon = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    closeTimer.current = window.setTimeout(() => setServicesOpen(false), 180);
  };
  const closeServicesOnFocusOut = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setServicesOpen(false);
  };
  const closeMenus = () => {
    setServicesOpen(false);
    setMenuOpen(false);
  };
  // Focus moving out of the header closes the menu, so it never stays open over
  // the element that has focus. A tap on the menu's blank area blurs to nothing
  // (no relatedTarget) and leaves it open.
  const closeMenuOnFocusOut = (event: FocusEvent<HTMLElement>) => {
    const next = event.relatedTarget as Node | null;
    if (menuOpen && next && !event.currentTarget.contains(next)) setMenuOpen(false);
  };

  return (
    <header ref={headerRef} className="gs-division-header fixed inset-x-0 top-0 z-50" onBlur={closeMenuOnFocusOut}>
      {/* Endorsement bar: the parent leads, the division follows (guidelines page 10).
          Tablets and desktop only; on phones, and on landscape phones (tablet
          widths no more than 500px tall), the endorsement closes the menu instead. */}
      <div
        className="nwse-dark hidden sm:block max-lg:[@media(max-height:500px)]:hidden"
        style={{ background: 'var(--nw-deep-current)' }}
        data-role="endorsement-bar"
      >
        <div className="mx-auto flex h-[32px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-[36px] lg:px-8">
          <div className="gs-division-endorsement">
            <p className="nwse-type-label">{DIVISION_ENDORSEMENT}</p>
            <Link to={DIVISION_GROUNDSWELL_PATH} className="gs-division-powered-link" onClick={closeMenus}>
              <img src={GROUNDSWELL_BRAND.mark} width={21} height={21} alt="" aria-hidden="true" />
              <span>Powered by <strong>GroundSwell</strong></span>
            </Link>
          </div>
          <div className="gs-division-utility-links">
            <Link to={GROUNDSWELL_PATH} className="gs-division-workspace-link" onClick={closeMenus}>
              Partner workspace
              <NwseIcon name="arrow-up-right" size={13} />
            </Link>
            <Link
              to="/"
              aria-label={`Managed IT & cybersecurity at ${PARENT_NAME}`}
              className="gs-division-parent-link"
            >
              <span className="hidden xl:inline">Managed IT &amp; cybersecurity at </span>{PARENT_NAME}
              <NwseIcon name="arrow-up-right" size={13} />
            </Link>
          </div>
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
        {/* Rows use px because --nwse-header-height is a px value. Enlarged
            text changes the navigation mode, while fixed offsets stay exact. */}
        <div
          className="mx-auto flex h-[56px] max-w-7xl items-center justify-between gap-5 px-4 sm:h-[64px] sm:px-6 lg:h-[80px] lg:px-8 max-lg:[@media(max-height:500px)]:h-[56px]"
          data-role="nav-row"
        >
          <Link onClick={closeMenus} to={DIVISION_BASE_PATH} className="flex shrink-0 items-center py-2" aria-label="New Wave: Social Engineering home">
            {/* 160px (the brand minimum) on phones, 184px from sm; px, not rem, so
                enlarged text can never push the menu toggle off-screen. */}
            <DivisionLogo lockup="primary" ground="light" width={184} decorative className="max-sm:h-auto max-sm:w-[160px]" />
          </Link>

          <div className="gs-division-desktop-links hidden items-center gap-4 [@media(min-width:64em)]:flex" data-role="desktop-links">
            <Link
              to={DIVISION_BASE_PATH}
              onClick={closeMenus}
              className={navLinkClass}
              aria-current={samePath(pathname, DIVISION_BASE_PATH) ? 'page' : undefined}
            >
              Overview
            </Link>

            <div
              className="relative"
              onPointerEnter={openServices}
              onPointerLeave={closeServicesSoon}
              onBlur={closeServicesOnFocusOut}
            >
              <button
                ref={servicesButton}
                type="button"
                className={`${navLinkClass} flex items-center gap-1`}
                onClick={() => setServicesOpen((open) => !open)}
                aria-expanded={servicesOpen}
                aria-controls="nwse-services-menu"
              >
                {HEADWAY_NAME}
                <NwseIcon
                  name="chevron-down"
                  size={16}
                  className={`transition-transform duration-200 ${servicesOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {servicesOpen ? (
                <div className="gs-division-services-dropdown absolute top-full z-50 pt-3">
                  <div id="nwse-services-menu" className="gs-division-services-panel">
                    {/* Headway, the one service the division sells; the six kinds of work are listed under it. */}
                    <Link to={DIVISION_HEADWAY_PATH} onClick={closeMenus} className="gs-division-services-intro gs-division-headway-intro" aria-current={samePath(pathname, DIVISION_HEADWAY_PATH) ? 'page' : undefined}>
                      <img src={HEADWAY_BRAND.mark} width={34} height={34} alt="" aria-hidden="true" />
                      <span>
                        <span className="gs-division-nav-eyebrow">{HEADWAY_NAME} · the implementation service</span>
                        <span>The plan, carried out through your own accounts, every action approved. Six kinds of work under it:</span>
                      </span>
                      <NwseIcon name="arrow-right" size={18} />
                    </Link>
                    <ul className="gs-division-service-grid">
                      {divisionServices.map((service) => (
                        <li key={service.slug}>
                          <Link
                            to={divisionServicePath(service.slug)}
                            onClick={closeMenus}
                            className="gs-division-service-link"
                            aria-label={service.navLabel}
                            aria-describedby={`nwse-nav-${service.slug}-summary`}
                            aria-current={samePath(pathname, divisionServicePath(service.slug)) ? 'page' : undefined}
                          >
                            <span className="gs-division-service-symbol" data-pillar={service.pillar}>
                              <ServiceIcon icon={service.icon} size={25} />
                            </span>
                            <span>
                              <span className="gs-division-service-title">{service.navLabel}</span>
                              <span id={`nwse-nav-${service.slug}-summary`} className="gs-division-service-summary">{service.cardSummary}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <Link to={DIVISION_GROUNDSWELL_PATH} onClick={closeMenus} className="gs-division-services-engine">
                      <img src={GROUNDSWELL_BRAND.favicon} width={28} height={28} alt="" aria-hidden="true" />
                      <span>GroundSwell finds and plans; {HEADWAY_NAME} carries it out</span>
                      <NwseIcon name="arrow-right" size={18} />
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>

            {pageLinks.map(({ label, path }) => (
              <Link
                key={path}
                to={path}
                onClick={closeMenus}
                className={`${navLinkClass}${path === DIVISION_GROUNDSWELL_PATH ? ' gs-division-engine-link' : ''}`}
                aria-current={samePath(pathname, path) ? 'page' : undefined}
              >
                {path === DIVISION_GROUNDSWELL_PATH ? <img src={GROUNDSWELL_BRAND.favicon} width={23} height={23} alt="" aria-hidden="true" /> : null}
                {label}
              </Link>
            ))}

            <Link onClick={closeMenus} to={DIVISION_CONTACT_PATH} className="nwse-btn nwse-btn-amber-deep gs-division-primary-cta min-h-10 px-4 py-2 text-sm">
              {DIVISION_PRIMARY_CTA}
            </Link>
          </div>

          <button
            type="button"
            ref={menuButton}
            className="gs-division-menu-toggle -mr-2.5 rounded-md p-[10px] text-[var(--nw-current-navy)] transition-colors [@media(min-width:64em)]:hidden [@media(hover:hover)]:hover:bg-[var(--nw-mist-gray)]"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="nwse-mobile-menu"
          >
            <NwseIcon name={menuOpen ? 'close' : 'menu'} size={24} />
          </button>
        </div>

        {menuOpen ? (
          // Phones: a full-height sheet with the endorsement at its foot.
          // Tablets: a panel over the dimmed page (the backdrop below).
          <div
            id="nwse-mobile-menu"
            className="flex max-h-[calc(100dvh-var(--nwse-header-height))] flex-col overflow-y-auto overscroll-contain border-t max-sm:min-h-[calc(100dvh-var(--nwse-header-height))] [@media(min-width:64em)]:hidden"
            style={{ borderColor: 'var(--nw-mist-gray)' }}
          >
            <div className="flex flex-col px-4 pb-4 pt-2 sm:px-6">
              {/* Overview, GroundSwell, Customers, and Contact us share one wrapping
                  row. On a 320x568 phone it takes two lines (88px): the discovery-call
                  button still fits the first screen, and the endorsement at the foot
                  sits just below it (the sheet scrolls). */}
              <div className="flex flex-wrap gap-x-5" data-role="menu-pages">
                {[{ label: 'Overview', path: DIVISION_BASE_PATH }, ...pageLinks].map(({ label, path }) => (
                  <Link
                    key={path}
                    to={path}
                    onClick={closeMenus}
                    className={`${menuRowClass}${path === DIVISION_GROUNDSWELL_PATH ? ' gs-division-menu-engine' : ''}`}
                    aria-current={samePath(pathname, path) ? 'page' : undefined}
                  >
                    {path === DIVISION_GROUNDSWELL_PATH ? <img src={GROUNDSWELL_BRAND.favicon} width={23} height={23} alt="" aria-hidden="true" /> : null}
                    {label}
                  </Link>
                ))}
              </div>
              <Link to={DIVISION_HEADWAY_PATH} onClick={closeMenus} className={`${menuRowClass} mt-3 gs-division-menu-engine`} aria-current={samePath(pathname, DIVISION_HEADWAY_PATH) ? 'page' : undefined}>
                <img src={HEADWAY_BRAND.mark} width={23} height={23} alt="" aria-hidden="true" />
                {HEADWAY_NAME}
              </Link>
              <p className="nwse-type-kicker nwse-kicker mb-1 mt-1">Services under {HEADWAY_NAME}</p>
              {/* Landscape phones: two columns (row by row, in reading order), so the
                  call to action fits the short screen without scrolling the menu. */}
              <ul className="flex flex-col max-lg:[@media(max-height:500px)]:grid max-lg:[@media(max-height:500px)]:grid-cols-2 max-lg:[@media(max-height:500px)]:gap-x-6">
                {divisionServices.map((service) => {
                  const path = divisionServicePath(service.slug);
                  return (
                    <li key={service.slug}>
                      <Link
                        onClick={closeMenus}
                        to={path}
                        className={menuRowClass}
                        aria-current={samePath(pathname, path) ? 'page' : undefined}
                      >
                        <span className="nwse-icon h-8 w-8 shrink-0">
                          <ServiceIcon icon={service.icon} size={16} />
                        </span>
                        {service.navLabel}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <Link onClick={closeMenus} to={DIVISION_CONTACT_PATH} className="nwse-btn nwse-btn-amber-deep gs-division-primary-cta mt-4 min-h-12 w-full">
                {DIVISION_PRIMARY_CTA}
              </Link>
              <Link to={GROUNDSWELL_PATH} onClick={closeMenus} className="gs-division-mobile-workspace min-h-11">
                <span>Existing partner workspace</span>
                <NwseIcon name="arrow-up-right" size={17} />
              </Link>
            </div>
            {/* Phones and landscape phones: the endorsement bar's content, which the
                slim header leaves out. */}
            <div
              className="nwse-dark mt-auto sm:hidden max-lg:[@media(max-height:500px)]:block"
              style={{ background: 'var(--nw-deep-current)' }}
              data-role="menu-endorsement"
            >
              <div className="flex flex-col px-4 pb-2 pt-3 sm:px-6">
                <p className="nwse-type-label" style={{ color: 'var(--nw-mist-gray)' }}>
                  {DIVISION_ENDORSEMENT}
                </p>
                <Link
                  to="/"
                  onClick={closeMenus}
                  className="flex min-h-11 items-center text-sm font-medium text-[var(--nw-cloud-white)] transition-colors hover:text-[var(--nwse-lure-amber)]"
                >
                  {/* One inline run; the parent's name and the arrow wrap as a unit. */}
                  <span>
                    Managed IT &amp; cybersecurity at{' '}
                    <span className="whitespace-nowrap">
                      {PARENT_NAME}
                      <NwseIcon name="arrow-up-right" size={14} className="ml-1 inline-block align-[-2px]" />
                    </span>
                  </span>
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </nav>
      {menuOpen ? (
        // Tablets: dims the page under the menu panel; a tap outside closes it.
        <div
          aria-hidden="true"
          className="gs-division-menu-backdrop fixed inset-x-0 bottom-0 top-[var(--nwse-header-height)] -z-10 hidden sm:block [@media(min-width:64em)]:hidden"
          style={{ background: 'color-mix(in srgb, var(--nw-deep-current) 40%, transparent)' }}
          onClick={closeMenus}
        />
      ) : null}
    </header>
  );
}

/**
 * Space the fixed header occupies: --nwse-header-height (division.css), which
 * follows the rows above: nav 56px + border on phones; endorsement bar 32px +
 * nav 64px + border on tablets; bar 36px + nav 80px + border on desktop.
 */
export const DIVISION_HEADER_OFFSET_CLASS = 'pt-[var(--nwse-header-height)]';
