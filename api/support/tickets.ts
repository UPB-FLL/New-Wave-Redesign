import { methodGuard, readJsonBody } from '../_lib/http.js';
import { bearerToken, resolvePortalSession } from '../_lib/portalSession.js';
import { isSupabaseConfigured } from '../_lib/supabaseAdmin.js';
import {
  SuperOpsNotConfiguredError,
  SuperOpsRequestError,
  getTicketsForRequester,
  isSuperOpsConfigured,
} from '../_lib/superops.js';

/**
 * Returns the signed-in customer's SuperOps tickets.
 *
 * The email is taken from the verified portal session, never from the request
 * body — otherwise anyone could read anyone else's tickets by typing their
 * address.
 */
export default async function handler(req: any, res: any) {
  if (!methodGuard(req, res, ['POST'])) return;

  if (!isSupabaseConfigured()) {
    console.error('support/tickets: Supabase is not configured');
    return res.status(503).json({ error: 'The customer portal is temporarily unavailable.' });
  }

  const session = await resolvePortalSession(bearerToken(req));
  if (!session) {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }

  if (!isSuperOpsConfigured()) {
    console.error('support/tickets: SUPEROPS_API_TOKEN / SUPEROPS_SUBDOMAIN are not configured');
    return res.status(503).json({
      error: 'Ticket sync is not configured yet. Please use the portal link or email support.',
    });
  }

  const { page = 1, pageSize = 50 } = readJsonBody(req) as { page?: number; pageSize?: number };

  try {
    const result = await getTicketsForRequester(session.email, {
      page: Number(page) > 0 ? Number(page) : 1,
      pageSize: Number(pageSize) > 0 ? Number(pageSize) : 50,
    });

    return res.status(200).json({
      success: true,
      email: session.email,
      tickets: result.tickets,
      count: result.tickets.length,
      totalCount: result.totalCount,
      hasMore: result.hasMore,
    });
  } catch (error) {
    if (error instanceof SuperOpsNotConfiguredError) {
      return res.status(503).json({ error: 'Ticket sync is not configured yet.' });
    }
    if (error instanceof SuperOpsRequestError) {
      console.error('support/tickets: SuperOps request failed', error.message);
      return res.status(502).json({
        error: 'We could not reach the ticketing system. Please try again in a moment.',
      });
    }
    console.error('support/tickets: unexpected failure', error);
    return res.status(500).json({ error: 'We could not load your tickets. Please try again.' });
  }
}
