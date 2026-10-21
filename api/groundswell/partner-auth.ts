import { clientIp, methodGuard, readJsonBody, rateLimit, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import {
  consumePartnerToken,
  createPartnerSession,
  destroyAllPartnerSessions,
  destroyPartnerSession,
  dummyPasswordHash,
  hashPassword,
  issuePartnerToken,
  normalizeEmail,
  passwordProblem,
  requirePartner,
  sendPartnerEmail,
  verifyPassword,
} from '../_lib/groundswell/partners.js';
import { bearerToken } from '../_lib/portalSession.js';
import { getSupabaseAdmin, isSupabaseConfigured } from '../_lib/supabaseAdmin.js';

/**
 * /api/groundswell/partner-auth — sign-in for Croissance partners
 * (api/_lib/groundswell/partners.ts explains why this is not Supabase Auth).
 *
 * GET with a partner bearer token: the signed-in partner's profile.
 * POST { action }:
 * - sign-in { email, password } → { token, partner }
 * - sign-out (bearer)
 * - set-password { token, password }: an invite or reset link's token; ends
 *   every other session of that partner.
 * - forgot-password { email }: emails a reset link; the answer never says
 *   whether the account exists.
 */

const BAD_SIGN_IN = 'That email and password do not match an active partner account.';
const FORGOT_REPLY = 'If that email belongs to a partner account, a reset link is on its way.';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!methodGuard(req, res, ['GET', 'POST'])) return;
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Partner sign-in is not available right now.' });

  if (req.method === 'GET') {
    const partner = await requirePartner(req, res);
    if (!partner) return;
    return res.status(200).json({ partner: { company: partner.company, contact_name: partner.contact_name, email: partner.email } });
  }

  const body = readJsonBody(req);
  const ip = clientIp(req);
  const db = getSupabaseAdmin();

  switch (body.action) {
    case 'sign-in': {
      const email = normalizeEmail(body.email);
      const password = typeof body.password === 'string' ? body.password : '';
      if (!rateLimit(`gs-signin-ip:${ip}`, 20, 15 * 60_000) || !rateLimit(`gs-signin-email:${email}`, 8, 15 * 60_000)) {
        return res.status(429).json({ error: 'Too many attempts. Wait a few minutes and try again.' });
      }
      if (!email || !password) return res.status(400).json({ error: 'Enter your email and password.' });
      const { data: partner } = await db
        .from('groundswell_partners')
        .select('id,company,contact_name,email,status,password_hash')
        .eq('email', email)
        .maybeSingle();
      // Always run one scrypt comparison, so a missing account takes as long as a wrong password.
      const ok = await verifyPassword(password, partner?.password_hash ?? (await dummyPasswordHash()));
      if (!partner || !ok || partner.status !== 'active') return res.status(401).json({ error: BAD_SIGN_IN });
      const token = await createPartnerSession(partner.id);
      await db.from('groundswell_partners').update({ last_sign_in_at: new Date().toISOString() }).eq('id', partner.id);
      return res.status(200).json({ token, partner: { company: partner.company, contact_name: partner.contact_name, email: partner.email } });
    }

    case 'sign-out':
      try {
        await destroyPartnerSession(bearerToken(req));
      } catch (err) {
        console.error('Groundswell partner sign-out failed:', err);
      }
      return res.status(200).json({ ok: true });

    case 'set-password': {
      if (!rateLimit(`gs-setpw-ip:${ip}`, 10, 15 * 60_000)) {
        return res.status(429).json({ error: 'Too many attempts. Wait a few minutes and try again.' });
      }
      const problem = passwordProblem(body.password);
      if (problem) return res.status(400).json({ error: problem });
      const raw = typeof body.token === 'string' ? body.token.trim() : '';
      const partnerId = raw ? await consumePartnerToken(raw) : null;
      if (!partnerId) return res.status(400).json({ error: 'This link has expired or was already used. Ask for a new one.' });
      const { data: partner } = await db.from('groundswell_partners').select('id,status').eq('id', partnerId).maybeSingle();
      if (!partner || partner.status === 'disabled') return res.status(403).json({ error: 'This partner account is turned off.' });
      const { error } = await db
        .from('groundswell_partners')
        .update({ password_hash: await hashPassword(body.password), status: 'active' })
        .eq('id', partnerId);
      if (error) {
        console.error('Groundswell set-password failed:', error.message);
        return res.status(500).json({ error: 'Could not save the password; try again.' });
      }
      await destroyAllPartnerSessions(partnerId);
      return res.status(200).json({ ok: true });
    }

    case 'forgot-password': {
      const email = normalizeEmail(body.email);
      if (!rateLimit(`gs-forgot-ip:${ip}`, 5, 15 * 60_000) || !rateLimit(`gs-forgot-email:${email}`, 3, 60 * 60_000)) {
        return res.status(429).json({ error: 'Too many requests. Wait a while and try again.' });
      }
      if (email) {
        const { data: partner } = await db.from('groundswell_partners').select('id,company,status').eq('email', email).maybeSingle();
        if (partner && partner.status !== 'disabled') {
          const purpose = partner.status === 'invited' ? 'invite' : 'reset';
          const token = await issuePartnerToken(partner.id, purpose);
          await sendPartnerEmail(purpose, email, partner.company, token);
        }
      }
      return res.status(200).json({ ok: true, message: FORGOT_REPLY });
    }

    default:
      return res.status(400).json({ error: 'Unknown action.' });
  }
}
