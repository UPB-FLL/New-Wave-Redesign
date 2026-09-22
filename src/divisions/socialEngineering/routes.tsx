import { Component, Suspense, lazy, type ReactNode } from 'react';

// Division pages load on demand so New Wave IT pages ship no division code.
const HubPage = lazy(() => import('./pages/SocialEngineeringHubPage'));
const ServicePage = lazy(() => import('./pages/SocialEngineeringServicePage'));
const CustomersPage = lazy(() => import('./pages/SocialEngineeringCustomersPage'));
const ContactUsPage = lazy(() => import('./pages/SocialEngineeringContactUsPage'));
const ContactPage = lazy(() => import('./pages/SocialEngineeringContactPage'));

/**
 * If a division chunk still fails to load (main.tsx already reloads once for
 * stale deploys), show a way forward instead of letting the error unmount the
 * whole app.
 */
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
      <Suspense fallback={<div className="min-h-screen" style={{ background: 'var(--nw-deep-current)' }} aria-busy="true" />}>
        {children}
      </Suspense>
    </ChunkErrorBoundary>
  );
}

export function SocialEngineeringHubRoute() {
  return (
    <Deferred>
      <HubPage />
    </Deferred>
  );
}

export function SocialEngineeringServiceRoute({ slug }: { slug: string }) {
  return (
    <Deferred>
      <ServicePage slug={slug} />
    </Deferred>
  );
}

export function SocialEngineeringCustomersRoute() {
  return (
    <Deferred>
      <CustomersPage />
    </Deferred>
  );
}

export function SocialEngineeringContactUsRoute() {
  return (
    <Deferred>
      <ContactUsPage />
    </Deferred>
  );
}

export function SocialEngineeringContactRoute() {
  return (
    <Deferred>
      <ContactPage />
    </Deferred>
  );
}
