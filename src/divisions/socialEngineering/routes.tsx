import { Suspense, lazy, type ReactNode } from 'react';

// Division pages load on demand so New Wave IT pages ship no division code.
const HubPage = lazy(() => import('./pages/SocialEngineeringHubPage'));
const ServicePage = lazy(() => import('./pages/SocialEngineeringServicePage'));
const ContactPage = lazy(() => import('./pages/SocialEngineeringContactPage'));

function Deferred({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: 'var(--nw-deep-current)' }} aria-busy="true" />}>
      {children}
    </Suspense>
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

export function SocialEngineeringContactRoute() {
  return (
    <Deferred>
      <ContactPage />
    </Deferred>
  );
}
