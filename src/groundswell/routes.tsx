import { Component, Suspense, lazy, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { GROUNDSWELL_ADMIN_PATH, GROUNDSWELL_CUSTOMERS_PATH, GROUNDSWELL_PATH, GROUNDSWELL_SET_PASSWORD_PATH, LEGACY_ADMIN_PATH } from './site';

// Groundswell loads on demand: public New Wave IT pages ship none of the portal.
const SetPasswordPage = lazy(() => import('./pages/GroundswellSetPasswordPage'));
const ProspectsPage = lazy(() => import('./pages/GroundswellCustomersPage').then((m) => ({ default: m.GroundswellProspectsPage })));
const ClientsPage = lazy(() => import('./pages/GroundswellCustomersPage').then((m) => ({ default: m.GroundswellClientsPage })));
const CustomerPage = lazy(() => import('./pages/GroundswellCustomerPage'));
const AdminLayout = lazy(() => import('./admin/GroundswellAdminLayout'));
const AdminOverview = lazy(() => import('./admin/GroundswellOverview'));
const AdminAudits = lazy(() => import('./admin/GroundswellAudits'));
const AdminPartners = lazy(() => import('./admin/GroundswellPartners'));
const AdminCustomers = lazy(() => import('./admin/GroundswellCustomers'));
const AdminCustomer = lazy(() => import('./admin/GroundswellCustomer'));

/** If a chunk still fails to load (main.tsx already reloads once for stale deploys), offer a way forward. */
class ChunkErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-semibold text-[var(--nw-current-navy)]">This page didn’t load.</p>
        <a href={window.location.pathname} className="btn-dark">
          Reload the page
        </a>
      </div>
    );
  }
}

function Deferred({ children }: { children: ReactNode }) {
  return (
    <ChunkErrorBoundary>
      <Suspense fallback={<div className="min-h-screen" style={{ background: 'var(--nw-cloud-white)' }} aria-busy="true" />}>{children}</Suspense>
    </ChunkErrorBoundary>
  );
}

export function GroundswellSetPasswordRoute() {
  return (
    <Deferred>
      <SetPasswordPage />
    </Deferred>
  );
}

export function GroundswellProspectsRoute() {
  return (
    <Deferred>
      <ProspectsPage />
    </Deferred>
  );
}

export function GroundswellClientsRoute() {
  return (
    <Deferred>
      <ClientsPage />
    </Deferred>
  );
}

export function GroundswellCustomerRoute() {
  return (
    <Deferred>
      <CustomerPage />
    </Deferred>
  );
}

/** The staff layout; its pages are nested routes rendered through its <Outlet />. */
export function GroundswellAdminRoute() {
  return (
    <Deferred>
      <AdminLayout />
    </Deferred>
  );
}

export {
  AdminOverview as GroundswellAdminOverview,
  AdminAudits as GroundswellAdminAudits,
  AdminPartners as GroundswellAdminPartners,
  AdminCustomers as GroundswellAdminCustomers,
  AdminCustomer as GroundswellAdminCustomer,
};

/**
 * Client-side redirects from the old addresses (vercel.json redirects them
 * on a cold load; these cover links inside the app). The query string stays,
 * so an old invite link still carries its token.
 */
export function LegacyPartnerRedirect({ to }: { to: 'sign-in' | 'customers' | 'set-password' }) {
  const { search } = useLocation();
  const target = to === 'sign-in' ? GROUNDSWELL_PATH : to === 'customers' ? GROUNDSWELL_CUSTOMERS_PATH : GROUNDSWELL_SET_PASSWORD_PATH;
  return <Navigate to={{ pathname: target, search }} replace />;
}

export function LegacyAdminRedirect() {
  const { pathname } = useLocation();
  return <Navigate to={pathname.replace(LEGACY_ADMIN_PATH, GROUNDSWELL_ADMIN_PATH)} replace />;
}
