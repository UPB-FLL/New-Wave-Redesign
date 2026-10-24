import { useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { NwseIcon } from '../icons/NwseIcon';
import { GROUNDSWELL_BRAND } from '../../../groundswell/brand';
import { GROUNDSWELL_PATH } from '../../../groundswell/site';
import { useGroundswellBrand } from '../../../groundswell/useGroundswellBrand';
import { useParentJsonLdHidden } from '../useDivisionMeta';
import { DIVISION_BASE_PATH, DIVISION_CONTACT_PATH, DIVISION_GROUNDSWELL_PATH } from '../site';
import '../division.css';
import '../type.css';
import '../../../groundswell/brand.css';
import '../groundswell.css';

/**
 * The GroundSwell marketing shell. `sectionsAt` is where the header's section
 * links lead: nothing on the GroundSwell page itself (they jump within it),
 * the GroundSwell page's path on its metric pages (they lead back to it).
 */
export function GroundswellMarketingLayout({ children, sectionsAt = '' }: { children: ReactNode; sectionsAt?: string }) {
  useGroundswellBrand();
  useParentJsonLdHidden();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const section = (anchor: string) => `${sectionsAt}#${anchor}`;
  return (
    <div className="nwse-root gs-branding gs-marketing" data-division="social-engineering">
      <a href="#main" className="gs-marketing-skip">
        Skip to content
      </a>
      <header
        className="gs-marketing-header"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && menuOpen) {
            setMenuOpen(false);
            menuButton.current?.focus();
          }
        }}
      >
        <div className="gs-marketing-header-inner">
          <Link to={DIVISION_GROUNDSWELL_PATH} className="gs-marketing-logo" aria-label="GroundSwell home">
            <img src={GROUNDSWELL_BRAND.logo} alt="GroundSwell" width={220} height={31.125} />
            <span>by New Wave</span>
          </Link>
          <button
            ref={menuButton}
            className="gs-marketing-menu"
            type="button"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
            aria-controls="gs-marketing-nav"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <NwseIcon name="close" size={22} /> : <NwseIcon name="menu" size={22} />}
          </button>
          <nav
            id="gs-marketing-nav"
            aria-label="GroundSwell navigation"
            className={menuOpen ? 'is-open' : ''}
            onClick={() => setMenuOpen(false)}
          >
            <a href={section('metrics')}>What it measures</a>
            <a href={section('how-it-works')}>How it works</a>
            <a href={section('sample')}>Sample audit</a>
            <Link to={GROUNDSWELL_PATH}>
              Partner sign-in <NwseIcon name="arrow-up-right" size={14} aria-hidden="true" />
            </Link>
            <Link to={DIVISION_CONTACT_PATH} className="gs-marketing-button">
              Book a discovery call
            </Link>
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <footer className="gs-marketing-footer">
        <div>
          <img src={GROUNDSWELL_BRAND.logoReverse} alt="GroundSwell by New Wave" width={220} height={31.125} />
          <p>{GROUNDSWELL_BRAND.tagline}</p>
        </div>
        <nav aria-label="GroundSwell footer">
          <Link to={GROUNDSWELL_PATH}>Partner portal</Link>
          <Link to={DIVISION_BASE_PATH}>New Wave services</Link>
          <Link to={DIVISION_CONTACT_PATH}>Book a discovery call</Link>
          <Link to="/privacy-policy">Privacy Policy</Link>
          <Link to="/terms-and-conditions">Terms and Conditions</Link>
        </nav>
      </footer>
    </div>
  );
}
