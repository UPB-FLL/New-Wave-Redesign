import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { currentPartner, partnerSignOut, type PartnerSummary } from '../lib/groundswellPartner';
import { GroundswellShell, type ShellNavItem } from './GroundswellShell';
import { GROUNDSWELL_CUSTOMERS_PATH, GROUNDSWELL_PATH } from './site';

/**
 * The signed-in partner app: checks the partner session, sends a signed-out
 * visitor to sign in, and frames every partner page in the shell with the
 * partner's navigation. Pages get the partner through `children(partner)`.
 */

const PARTNER_NAV: ShellNavItem[] = [{ label: 'Customers', path: GROUNDSWELL_CUSTOMERS_PATH, icon: Building2 }];

export function PartnerApp({ children }: { children: (partner: PartnerSummary) => ReactNode }) {
  const navigate = useNavigate();
  const [partner, setPartner] = useState<PartnerSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    currentPartner()
      .then((p) => {
        if (!live) return;
        if (!p) navigate(GROUNDSWELL_PATH, { replace: true });
        else setPartner(p);
      })
      .catch((err) => live && setError(err instanceof Error ? err.message : 'Could not load your account.'));
    return () => {
      live = false;
    };
  }, [navigate]);

  const signOut = async () => {
    await partnerSignOut();
    navigate(GROUNDSWELL_PATH);
  };

  return (
    <GroundswellShell who={partner?.company ?? 'Partner'} role="Partner" nav={PARTNER_NAV} navLabel="Partner pages" onSignOut={() => void signOut()}>
      {error ? (
        <p className="gs-alert" role="alert">
          {error}
        </p>
      ) : partner ? (
        children(partner)
      ) : (
        <p aria-busy="true" className="text-sm gs-muted">
          Loading…
        </p>
      )}
    </GroundswellShell>
  );
}
