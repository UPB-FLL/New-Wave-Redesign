import { Resend } from 'resend';
import {
  clientIp,
  escapeHtml,
  isValidEmail,
  methodGuard,
  rateLimit,
  readJsonBody,
  sweepRateLimits,
} from '../_lib/http.js';
import { getSupabaseAdmin, isSupabaseConfigured } from '../_lib/supabaseAdmin.js';
import { hashToken, randomLoginCode } from '../_lib/tokens.js';

/**
 * Step 1 of the customer portal sign-in: email a one-time code.
 *
 * The response is deliberately identical whether or not the address is known
 * to us, so the endpoint cannot be used to enumerate customers.
 */

const CODE_TTL_MS = 10 * 60 * 1000;
const FROM_ADDRESS = process.env.SUPPORT_FROM_EMAIL || 'New Wave IT Support <support@newwaveitfl.com>';

export default async function handler(req: any, res: any) {
  if (!methodGuard(req, res, ['POST'])) return;

  const { email = '' } = readJsonBody(req) as { email?: string };
  const normalized = String(email).trim().toLowerCase();

  if (!normalized || !isValidEmail(normalized) || normalized.length > 254) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  sweepRateLimits();
  const ip = clientIp(req);
  if (!rateLimit(`login-code-ip:${ip}`, 10, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many requests. Please try again in a few minutes.' });
  }
  if (!rateLimit(`login-code-email:${normalized}`, 4, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many codes requested for this address. Try again shortly.' });
  }

  if (!isSupabaseConfigured() || !process.env.RESEND_API_KEY) {
    console.error('support/request-code: Supabase or Resend is not configured');
    return res.status(503).json({ error: 'Sign-in is temporarily unavailable. Please email or call us.' });
  }

  const code = randomLoginCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  try {
    const supabase = getSupabaseAdmin();

    // Invalidate any code still outstanding for this address so only the
    // newest one works.
    await supabase
      .from('support_login_codes')
      .update({ consumed_at: new Date().toISOString() })
      .eq('email', normalized)
      .is('consumed_at', null);

    const { error: insertError } = await supabase.from('support_login_codes').insert({
      email: normalized,
      code_hash: hashToken(code),
      expires_at: expiresAt.toISOString(),
      ip,
    });

    if (insertError) throw new Error(insertError.message);

    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to: normalized,
      subject: `${code} is your New Wave IT sign-in code`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; color: #152232;">
          <h2 style="border-bottom: 2px solid #39CCCC; padding-bottom: 10px;">Your sign-in code</h2>
          <p style="color: #555; line-height: 1.6;">
            Use this code to open your support tickets on newwaveitfl.com. It expires in 10 minutes.
          </p>
          <p style="font-size: 34px; letter-spacing: 10px; font-weight: bold; text-align: center;
                    background: #f8fafb; border-radius: 10px; padding: 20px; margin: 24px 0; color: #152232;">
            ${escapeHtml(code)}
          </p>
          <p style="color: #777; font-size: 13px; line-height: 1.6;">
            If you did not request this, you can ignore this email — nobody can sign in without the code.
          </p>
        </div>
      `,
    });

    if (result.error) {
      console.error('support/request-code: delivery failed', result.error);
      return res.status(502).json({ error: 'We could not send the code. Please try again.' });
    }

    // Opportunistic housekeeping; cheap and keeps the table small.
    await supabase
      .from('support_login_codes')
      .delete()
      .lt('expires_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    return res.status(200).json({ success: true, expiresInSeconds: CODE_TTL_MS / 1000 });
  } catch (error) {
    console.error('support/request-code: unexpected failure', error);
    return res.status(500).json({ error: 'We could not send the code. Please try again.' });
  }
}
