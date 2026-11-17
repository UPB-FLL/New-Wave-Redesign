// Settings for the Intercom Messenger (src/components/IntercomMessenger.tsx).
//
// The App ID is public by design: every page that loads the Messenger shows it.
import { isDivisionPath } from '../divisions/socialEngineering/site';
import { isGroundswellPath } from '../groundswell/site';

export const INTERCOM_APP_ID = 'eep3rzlx';
/** The US workspace's API host (the SDK's default region). */
export const INTERCOM_API_BASE = 'https://api-iam.intercom.io';

/** False on the division, the Groundswell portal and the admin. */
export function intercomAllowedOn(pathname: string): boolean {
  if (isDivisionPath(pathname) || isGroundswellPath(pathname)) return false;
  return !(pathname === '/admin' || pathname.startsWith('/admin/'));
}
