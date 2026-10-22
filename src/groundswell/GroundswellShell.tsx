import type { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowUpRight, LogOut, type LucideIcon } from 'lucide-react';
import { GROUNDSWELL_BRAND } from './brand';
import { useGroundswellBrand } from './useGroundswellBrand';
import { GROUNDSWELL_PATH, GROUNDSWELL_PROSPECTS_PATH } from './site';
import './groundswell.css';
import './portal.css';

export interface ShellNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  end?: boolean;
}

interface Props {
  who: string;
  role?: string;
  nav: ShellNavItem[];
  navLabel: string;
  onSignOut: () => void;
  aside?: ReactNode;
  children: ReactNode;
}

function Brand({ home }: { home: string }) {
  return (
    <Link to={home} className="gs-portal-brand" aria-label="GroundSwell home">
      <img src={GROUNDSWELL_BRAND.logo} alt="GroundSwell" width={220} height={31.125} />
      <span>by New Wave</span>
    </Link>
  );
}

/** Partner chrome: two persistent sections and a wide, focused customer workspace. */
export function GroundswellShell({ who, role, nav, navLabel, onSignOut, aside, children }: Props) {
  useGroundswellBrand();
  const { pathname } = useLocation();
  const customer = pathname.includes('/customers/');
  return (
    <div className="gs-root gs-branding gs-portal">
      <a href="#gs-main" className="gs-portal-skip">
        Skip to content
      </a>
      <header className="gs-chrome gs-portal-header">
        <div className="gs-portal-header-inner">
          <Brand home={GROUNDSWELL_PROSPECTS_PATH} />
          <div className="gs-portal-account">
            <div>
              <strong>{who}</strong>
              <span>{role ?? 'Partner'} workspace</span>
            </div>
            <button type="button" onClick={onSignOut} className="gs-btn gs-btn-secondary" aria-label="Sign out">
              <LogOut size={16} aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
        <div className="gs-portal-nav-row">
          <nav aria-label={navLabel}>
            <ul>
              {nav.map((item) => (
                <li key={item.path}>
                  <NavLink to={item.path} end={item.end} className="gs-portal-nav-link">
                    <item.icon size={17} aria-hidden="true" />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <span className="gs-portal-nav-note">{customer ? 'Customer workspace' : 'Your business pipeline'}</span>
        </div>
      </header>
      <main id="gs-main" className="gs-portal-main" tabIndex={-1}>
        <p className="gs-portal-eyebrow gs-portal-company">
          Partner workspace <span>/</span> {who}
        </p>
        {children}
        {aside ? <div className="gs-portal-aside">{aside}</div> : null}
      </main>
      <footer className="gs-chrome gs-portal-footer">
        <span>
          GroundSwell <span>by New Wave</span>
        </span>
        <span>{GROUNDSWELL_BRAND.tagline}</span>
      </footer>
    </div>
  );
}

/** Invitation, password reset, and public partner entry share the same brand frame. */
export function GroundswellFrame({ children }: { children: ReactNode }) {
  useGroundswellBrand();
  return (
    <div className="gs-root gs-branding gs-portal gs-portal-entry">
      <a href="#gs-entry-main" className="gs-portal-skip">
        Skip to content
      </a>
      <header className="gs-chrome gs-portal-entry-header">
        <Brand home={GROUNDSWELL_PATH} />
        <span className="gs-portal-eyebrow">Partner portal</span>
      </header>
      <main id="gs-entry-main" className="gs-portal-entry-main" tabIndex={-1}>
        {children}
      </main>
      <footer className="gs-chrome gs-portal-entry-footer">
        <a href="https://www.newwaveitfl.com">
          New Wave <ArrowUpRight size={13} aria-hidden="true" />
        </a>
        <div>
          <Link to="/privacy-policy">Privacy Policy</Link>
          <Link to="/terms-and-conditions">Terms and Conditions</Link>
        </div>
      </footer>
    </div>
  );
}
