import { lazy, Suspense } from 'react';
import { IT_PAGE_META } from '../lib/routeMeta';
import { usePageMeta } from '../lib/usePageMeta';

// Groundswell's sign-in is a static New Wave IT route (prerendered head from
// IT_PAGE_META, like /pricing), but its code loads on demand so public pages
// ship none of the portal.
const SignIn = lazy(() => import('../groundswell/pages/GroundswellSignInPage'));

export default function GroundswellSignInPage() {
  usePageMeta(IT_PAGE_META['/groundswell']);
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: 'var(--nw-cloud-white)' }} aria-busy="true" />}>
      <SignIn />
    </Suspense>
  );
}
