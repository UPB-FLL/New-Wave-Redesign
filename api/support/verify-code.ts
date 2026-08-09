import {
  clientIp,
  isValidEmail,
  methodGuard,
  rateLimit,
  readJsonBody,
  sweepRateLimits,
} from '../_lib/http.js';
import { getSupabaseAdmin, isSupabaseConfigured } from '../_lib/supabaseAdmin.js';
import { constantTimeEquals, hashToken } from '../_lib/tokens.js';
import { createPortalSession } from '../_lib/portalSession.js';

/**
 * Step 2 of the customer portal sign-in: redeem the one-time code for a
 * session token. The token is what /api/support/tickets trusts, so a caller
 * can only ever see the tickets of an address they can read mail for.
 */

const MAX_ATTEMPTS = 5;

export default async function handler(req: any, res: any) {
  if (!methodGuard(req, res, ['POST'])) return;

  const { email = '', code = '' } = readJsonBody(req) as { email?: string; code?: string };
  const normalized = String(email).trim().toLowerCase();
  const submitted = String(code).replace(/\D/g, '');

  if (!normalized || !isValidEmail(normalized)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (submitted.length !== 6) {
    return res.status(400).json({ error: 'Enter the 6-digit code from your email.' });
  }

  sweepRateLimits();
  if (!rateLimit(`verify-code:${clientIp(req)}`, 15, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many attempts. Please request a new code.' });
  }

  if (!isSupabaseConfigured()) {
    console.error('support/verify-code: Supabase is not configured');
    return res.status(503).json({ error: 'Sign-in is temporarily unavailable.' });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: record, error } = await supabase
      .from('support_login_codes')
      .select('id, code_hash, expires_at, attempts')
      .eq('email', normalized)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (!record) {
      return res.status(400).json({ error: 'That code is no longer valid. Request a new one.' });
    }

    if (new Date(record.expires_at).getTime() <= Date.now()) {
      await supabase
        .from('support_login_codes')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', record.id);
      return res.status(400).json({ error: 'That code has expired. Request a new one.' });
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      await supabase
        .from('support_login_codes')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', record.id);
      return res.status(429).json({ error: 'Too many incorrect attempts. Request a new code.' });
    }

    if (!constantTimeEquals(hashToken(submitted), record.code_hash)) {
      await supabase
        .from('support_login_codes')
        .update({ attempts: record.attempts + 1 })
        .eq('id', record.id);
      const remaining = MAX_ATTEMPTS - (record.attempts + 1);
      return res.status(400).json({
        error:
          remaining > 0
            ? `That code is not right. ${remaining} attempt${remaining === 1 ? '' : 's'} left.`
            : 'That code is not right. Request a new one.',
      });
    }

    await supabase
      .from('support_login_codes')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', record.id);

    const { token, session } = await createPortalSession(normalized);

    return res.status(200).json({
      success: true,
      token,
      email: session.email,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error('support/verify-code: unexpected failure', error);
    return res.status(500).json({ error: 'We could not verify that code. Please try again.' });
  }
}
