import { Suspense } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AdminGuard from '../../admin/AdminGuard';
import { supabase } from '../../lib/supabase';
import { usePageMeta } from '../../lib/usePageMeta';
import { GroundswellAdminShell } from './GroundswellAdminShell';
import { GROUNDSWELL_ADMIN_PATH } from '../site';
import { GROUNDSWELL_BRAND } from './brand';
import { useGroundswellBrand } from './useGroundswellBrand';

/**
 * The staff side of Groundswell (/groundswell/admin): the same Supabase
 * sign-in as the content admin (any signed-in user is staff), in the
 * Groundswell shell rather than the content admin's sidebar. Partners never
 * reach it: their sessions are not Supabase sessions.
 */

export default function GroundswellAdminLayout() {
  useGroundswellBrand();
  usePageMeta({ title: `Staff | ${GROUNDSWELL_BRAND.name}`, includeSiteName: false, noindex: true });
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate(GROUNDSWELL_ADMIN_PATH);
  };

  return (
    <AdminGuard
      title={GROUNDSWELL_BRAND.name}
      subtitle="New Wave staff sign-in"
      loginBrand={{
        className: 'gs-admin-branding gs-admin-login',
        logo: <img src={GROUNDSWELL_BRAND.logoReverse} alt="GroundSwell" width={220} height={31.125} />,
      }}
    >
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
