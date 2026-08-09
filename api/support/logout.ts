import { methodGuard } from '../_lib/http.js';
import { bearerToken, destroyPortalSession } from '../_lib/portalSession.js';
import { isSupabaseConfigured } from '../_lib/supabaseAdmin.js';

/** Revokes a customer portal session server-side. */
export default async function handler(req: any, res: any) {
  if (!methodGuard(req, res, ['POST'])) return;

  if (isSupabaseConfigured()) {
    try {
      await destroyPortalSession(bearerToken(req));
    } catch (error) {
      // The client clears its token regardless; a failure here is not
      // something the customer can act on.
      console.error('support/logout: could not revoke session', error);
    }
  }

  return res.status(200).json({ success: true });
}
