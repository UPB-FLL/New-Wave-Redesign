import { Suspense } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { ClipboardList, Gauge, Handshake } from 'lucide-react';
import AdminGuard from '../../admin/AdminGuard';
import { supabase } from '../../lib/supabase';
import { usePageMeta } from '../../lib/usePageMeta';
import { GroundswellShell, type ShellNavItem } from '../GroundswellShell';
import { GROUNDSWELL_ADMIN_AUDITS_PATH, GROUNDSWELL_ADMIN_PARTNERS_PATH, GROUNDSWELL_ADMIN_PATH, GROUNDSWELL_NAME } from '../site';

/**
 * The staff side of Groundswell (/groundswell/admin): the same Supabase
 * sign-in as the content admin (any signed-in user is staff), in the
 * Groundswell shell rather than the content admin's sidebar. Partners never
 * reach it: their sessions are not Supabase sessions.
 */

const ADMIN_NAV: ShellNavItem[] = [
  { label: 'Overview', path: GROUNDSWELL_ADMIN_PATH, icon: Gauge, end: true },
  { label: 'Audits', path: GROUNDSWELL_ADMIN_AUDITS_PATH, icon: ClipboardList },
  { label: 'Partners', path: GROUNDSWELL_ADMIN_PARTNERS_PATH, icon: Handshake },
];

export default function GroundswellAdminLayout() {
  usePageMeta({ title: `Staff | ${GROUNDSWELL_NAME}`, includeSiteName: false, noindex: true });
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate(GROUNDSWELL_ADMIN_PATH);
  };

  return (
    <AdminGuard title={GROUNDSWELL_NAME} subtitle="New Wave staff sign-in">
      <GroundswellShell
        who="New Wave staff"
        role="Staff"
        nav={ADMIN_NAV}
        navLabel="Staff pages"
        onSignOut={() => void signOut()}
        aside={
          <Link to="/admin" className="gs-muted underline-offset-4 hover:underline">
            Website content admin →
          </Link>
        }
      >
        <Suspense fallback={<div aria-busy="true" />}>
          <Outlet />
        </Suspense>
      </GroundswellShell>
    </AdminGuard>
  );
}
