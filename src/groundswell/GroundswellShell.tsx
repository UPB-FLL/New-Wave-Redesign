import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { LogOut, Waves, type LucideIcon } from 'lucide-react';
import './groundswell.css';
import { GROUNDSWELL_NAME, GROUNDSWELL_PATH } from './site';

/**
 * The chrome every signed-in Groundswell page shares, partner and staff alike:
 * a slim top bar (mark, who is signed in, sign out) and a short navigation
 * that sits beside the content on wide screens and becomes a row of tabs
 * under the bar on phones. Light surfaces, the division's amber accent; no
 * marketing header or footer, and none of the content admin's sidebar.
 */

export interface ShellNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Match the path exactly (for a section's index page). */
  end?: boolean;
}

interface Props {
  /** The partner's company, or "New Wave staff". */
  who: string;
  /** Under the name: "Partner" or the staff role. */
  role?: string;
  nav: ShellNavItem[];
  navLabel: string;
  onSignOut: () => void;
  /** A link to another area, under the navigation (the content admin, for staff). */
  aside?: ReactNode;
  children: ReactNode;
}

export function GroundswellShell({ who, role, nav, navLabel, onSignOut, aside, children }: Props) {
  return (
    <div className="gs-root flex min-h-screen flex-col">
      <a href="#gs-main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="gs-chrome sticky top-0 z-30 border-b border-[var(--nw-mist-gray)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to={GROUNDSWELL_PATH} className="flex items-center gap-2.5" aria-label={`${GROUNDSWELL_NAME} home`}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'rgba(242,163,58,0.18)' }} aria-hidden="true">
              <Waves size={16} style={{ color: 'var(--gs-accent-deep)' }} />
            </span>
            <span className="text-sm font-bold leading-tight text-[var(--nw-current-navy)]">{GROUNDSWELL_NAME}</span>
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0 text-right">
              <div className="truncate text-sm font-semibold text-[var(--nw-current-navy)]">{who}</div>
              {role ? <div className="truncate text-xs gs-muted">{role}</div> : null}
            </div>
            <button type="button" onClick={onSignOut} className="gs-btn gs-btn-ghost px-3" aria-label="Sign out">
              <LogOut size={16} aria-hidden="true" />
              <span className="max-sm:sr-only">Sign out</span>
            </button>
          </div>
        </div>
        <nav aria-label={navLabel} className="gs-chrome mx-auto max-w-7xl px-4 sm:px-6 lg:hidden">
          <ul className="-mb-px flex gap-1 overflow-x-auto py-1.5">
            {nav.map((item) => (
              <li key={item.path}>
                <NavLink to={item.path} end={item.end} className="gs-nav-link">
                  <item.icon size={16} aria-hidden="true" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 py-6 sm:px-6 lg:py-8">
        <nav aria-label={navLabel} className="gs-chrome hidden w-52 shrink-0 lg:block">
          <ul className="sticky top-20 space-y-0.5">
            {nav.map((item) => (
              <li key={item.path}>
                <NavLink to={item.path} end={item.end} className="gs-nav-link w-full">
                  <item.icon size={16} aria-hidden="true" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
          {aside ? <div className="mt-6 border-t border-[var(--nw-mist-gray)] pt-4 text-sm">{aside}</div> : null}
        </nav>
        <main id="gs-main" className="min-w-0 flex-1">
          {children}
          {aside ? <div className="mt-10 border-t border-[var(--nw-mist-gray)] pt-4 text-sm lg:hidden">{aside}</div> : null}
        </main>
      </div>
    </div>
  );
}

/** The frame around pages shown before sign-in (the sign-in page, choose a password). */
export function GroundswellFrame({ children }: { children: ReactNode }) {
  return (
    <div className="gs-root flex min-h-screen flex-col">
      <header className="gs-chrome border-b border-[var(--nw-mist-gray)] bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to={GROUNDSWELL_PATH} className="flex items-center gap-2.5" aria-label={`${GROUNDSWELL_NAME} home`}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'rgba(242,163,58,0.18)' }} aria-hidden="true">
              <Waves size={16} style={{ color: 'var(--gs-accent-deep)' }} />
            </span>
            <span className="text-sm font-bold text-[var(--nw-current-navy)]">{GROUNDSWELL_NAME}</span>
          </Link>
          <a href="https://www.newwaveitfl.com" className="text-xs font-medium gs-muted hover:text-[var(--nw-current-navy)]">
            A New Wave IT product
          </a>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:py-12">
        {children}
      </main>
      <footer className="gs-chrome border-t border-[var(--nw-mist-gray)] py-4 text-center text-xs gs-muted">
        <Link to="/privacy-policy" className="hover:underline">
          Privacy Policy
        </Link>
        {' · '}
        <Link to="/terms-and-conditions" className="hover:underline">
          Terms and Conditions
        </Link>
      </footer>
    </div>
  );
}
