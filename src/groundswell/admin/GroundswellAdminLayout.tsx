import { Suspense } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AdminGuard from '../../admin/AdminGuard';
import { supabase } from '../../lib/supabase';
import { usePageMeta } from '../../lib/usePageMeta';
import { GroundswellAdminShell } from './GroundswellAdminShell';
import { GROUNDSWELL_ADMIN_PATH, GROUNDSWELL_NAME } from '../site';

/**
 * The staff side of Groundswell (/groundswell/admin): the same Supabase
 * sign-in as the content admin (any signed-in user is staff), in the
 * Groundswell shell rather than the content admin's sidebar. Partners never
 * reach it: their sessions are not Supabase sessions.
 */

export default function GroundswellAdminLayout() {
  usePageMeta({ title: `Staff | ${GROUNDSWELL_NAME}`, includeSiteName: false, noindex: true });
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate(GROUNDSWELL_ADMIN_PATH);
  };

  return (
    <AdminGuard title={GROUNDSWELL_NAME} subtitle="New Wave staff sign-in">
      <GroundswellAdminShell onSignOut={() => void signOut()}>
        <Suspense
          fallback={
            <p className="gs-admin-loading" aria-busy="true">
              Loading workspace…
            </p>
          }
        >
          <Outlet />
        </Suspense>
      </GroundswellAdminShell>
    </AdminGuard>
  );
}
