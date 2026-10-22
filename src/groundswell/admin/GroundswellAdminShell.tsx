import { useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowUpRight, ChevronRight, ClipboardList, Gauge, Handshake, LogOut, Menu, Users, X } from 'lucide-react';
import { GROUNDSWELL_BRAND } from './brand';
import {
  GROUNDSWELL_ADMIN_AUDITS_PATH,
  GROUNDSWELL_ADMIN_CUSTOMERS_PATH,
  GROUNDSWELL_ADMIN_PARTNERS_PATH,
  GROUNDSWELL_ADMIN_PATH,
  GROUNDSWELL_PATH,
} from '../site';
import '../groundswell.css';
import './admin.css';

const NAV = [
  { label: 'Overview', path: GROUNDSWELL_ADMIN_PATH, icon: Gauge, end: true },
  { label: 'Customers', path: GROUNDSWELL_ADMIN_CUSTOMERS_PATH, icon: Users, end: false },
  { label: 'Run queue', path: GROUNDSWELL_ADMIN_AUDITS_PATH, icon: ClipboardList, end: false },
  { label: 'Partners', path: GROUNDSWELL_ADMIN_PARTNERS_PATH, icon: Handshake, end: false },
];

/** Staff-only chrome. Partner pages continue to use GroundswellShell. */
export function GroundswellAdminShell({ onSignOut, children }: { onSignOut: () => void; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const page = NAV.find((item) => (item.end ? pathname === item.path : pathname.startsWith(item.path))) ?? NAV[0];
  const isCustomer = pathname.startsWith(`${GROUNDSWELL_ADMIN_CUSTOMERS_PATH}/`);

  return (
    <div className="gs-root gs-admin-branding gs-admin">
      <a href="#gs-admin-main" className="gs-admin-skip">
        Skip to content
      </a>
      <aside className="gs-admin-sidebar gs-chrome">
        <div className="gs-admin-brand-row">
          <Link to={GROUNDSWELL_ADMIN_PATH} className="gs-admin-brand" aria-label="GroundSwell home">
            <img src={GROUNDSWELL_BRAND.logo} alt="GroundSwell" width={220} height={31.125} />
            <small>by New Wave</small>
          </Link>
          <button
            type="button"
            className="gs-btn gs-btn-ghost gs-admin-menu"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
            aria-controls="gs-admin-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <div id="gs-admin-navigation" className={`gs-admin-navigation${menuOpen ? ' is-open' : ''}`}>
          <nav aria-label="Staff pages">
            <p className="gs-admin-eyebrow">Workspace</p>
            <ul>
              {NAV.map((item) => (
                <li key={item.path}>
                  <NavLink to={item.path} end={item.end} className="gs-admin-nav-link" onClick={() => setMenuOpen(false)}>
                    <item.icon size={18} aria-hidden="true" />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="gs-admin-sidebar-bottom">
            <Link to="/admin" className="gs-admin-nav-link">
              <ArrowUpRight size={17} aria-hidden="true" />
              Website admin
            </Link>
            <div className="gs-admin-account">
              <span className="gs-admin-avatar" aria-hidden="true">
                NW
              </span>
              <div>
                <strong>New Wave staff</strong>
                <span>GroundSwell admin</span>
              </div>
              <button type="button" onClick={onSignOut} className="gs-btn gs-btn-ghost gs-admin-signout" aria-label="Sign out">
                <LogOut size={17} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </aside>
      <div className="gs-admin-body">
        <header className="gs-admin-topbar gs-chrome">
          <nav aria-label="Breadcrumb" className="gs-admin-breadcrumb">
            <Link to={GROUNDSWELL_ADMIN_PATH}>Workspace</Link>
            <ChevronRight size={13} aria-hidden="true" />
            {isCustomer ? (
              <>
                <Link to={page.path}>{page.label}</Link>
                <ChevronRight size={13} aria-hidden="true" />
                <span aria-current="page">Customer</span>
              </>
            ) : (
              <span aria-current="page">{page.label}</span>
            )}
          </nav>
          <div className="gs-admin-topbar-actions">
            <span className="gs-admin-staff-label">
              <span />
              Staff
            </span>
            <a href={GROUNDSWELL_PATH} target="_blank" rel="noreferrer">
              Partner portal
              <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
        </header>
        <main id="gs-admin-main" className="gs-admin-main" tabIndex={-1}>
          {children}
        </main>
        <footer className="gs-admin-footer gs-chrome">
          <span>{GROUNDSWELL_BRAND.name}</span>
          <span>{GROUNDSWELL_BRAND.tagline}</span>
        </footer>
      </div>
    </div>
  );
}
