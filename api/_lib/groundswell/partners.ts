import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { Resend } from 'resend';
import type { ApiRequest, ApiResponse } from '../http.js';
import { escapeHtml } from '../http.js';
import { bearerToken } from '../portalSession.js';
import { getSupabaseAdmin } from '../supabaseAdmin.js';
import { hashToken, randomToken } from '../tokens.js';

/**
 * Groundswell partner accounts: outside agencies and resellers who submit
 * businesses for audits and see the audits they submitted.
 *
 * They are deliberately NOT Supabase Auth users. Any signed-in Supabase user is
 * an admin on this site (requireAdmin, and the `authenticated` RLS policies on
 * content, blog and audits), so a partner with a Supabase account would be an
 * admin. Instead: scrypt password hashes in groundswell_partners, and opaque
 * bearer sessions and one-time links stored only as SHA-256 digests
 * (migration 20261021140000).
 */

const scrypt = promisify(crypto.scrypt) as (password: string, salt: Buffer, keylen: number, options: crypto.ScryptOptions) => Promise<Buffer>;

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 200;
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const RESET_TTL_MS = 60 * 60 * 1000;

export const SITE_URL = 'https://www.newwaveitfl.com';
export const PARTNER_BASE_PATH = '/social-engineering/croissance/partners';
export const setPasswordUrl = (token: string) => `${SITE_URL}${PARTNER_BASE_PATH}/set-password?token=${encodeURIComponent(token)}`;

export const normalizeEmail = (email: unknown) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

export function passwordProblem(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password.normalize('NFKC'), salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), hash.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  const parts = (stored ?? '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, salt, hash] = parts;
  const expected = Buffer.from(hash, 'base64');
  const actual = await scrypt(password.normalize('NFKC'), Buffer.from(salt, 'base64'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

/** A dummy hash to compare against when the email is unknown, so timing does not reveal accounts. */
let dummyHash: Promise<string> | null = null;
export const dummyPasswordHash = () => (dummyHash ??= hashPassword(randomToken()));

export interface PartnerProfile {
  id: string;
  company: string;
  contact_name: string | null;
  email: string;
  status: 'invited' | 'active' | 'disabled';
}

const PROFILE_COLUMNS = 'id,company,contact_name,email,status';

export async function createPartnerSession(partnerId: string): Promise<string> {
  const token = randomToken();
  const { error } = await getSupabaseAdmin()
    .from('groundswell_partner_sessions')
    .insert({ partner_id: partnerId, token_hash: hashToken(token), expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString() });
  if (error) throw new Error(`Could not create a partner session: ${error.message}`);
  return token;
}

/** The active partner behind a bearer token, or null (missing, expired, or the partner is not active). */
export async function resolvePartner(token: string | null): Promise<PartnerProfile | null> {
  if (!token) return null;
  const db = getSupabaseAdmin();
  const { data: session } = await db
    .from('groundswell_partner_sessions')
    .select('id,partner_id,expires_at')
    .eq('token_hash', hashToken(token))
    .maybeSingle();
  if (!session) return null;
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await db.from('groundswell_partner_sessions').delete().eq('id', session.id);
    return null;
  }
  const { data: partner } = await db.from('groundswell_partners').select(PROFILE_COLUMNS).eq('id', session.partner_id).maybeSingle();
  if (!partner || partner.status !== 'active') return null;
  await db.from('groundswell_partner_sessions').update({ last_seen_at: new Date().toISOString() }).eq('id', session.id);
  return partner as PartnerProfile;
}

/** Answers 401 and returns null unless the request carries an active partner's session. */
export async function requirePartner(req: ApiRequest, res: ApiResponse): Promise<PartnerProfile | null> {
  const partner = await resolvePartner(bearerToken(req));
  if (!partner) {
    res.status(401).json({ error: 'Your session has ended. Sign in again.' });
    return null;
  }
  return partner;
}

export async function destroyPartnerSession(token: string | null): Promise<void> {
  if (!token) return;
  await getSupabaseAdmin().from('groundswell_partner_sessions').delete().eq('token_hash', hashToken(token));
}

export async function destroyAllPartnerSessions(partnerId: string): Promise<void> {
  await getSupabaseAdmin().from('groundswell_partner_sessions').delete().eq('partner_id', partnerId);
}

/** Issues a one-time link token (invalidating the partner's earlier unused ones). */
export async function issuePartnerToken(partnerId: string, purpose: 'invite' | 'reset'): Promise<string> {
  const db = getSupabaseAdmin();
  await db.from('groundswell_partner_tokens').delete().eq('partner_id', partnerId).is('used_at', null);
  const token = randomToken();
  const ttl = purpose === 'invite' ? INVITE_TTL_MS : RESET_TTL_MS;
  const { error } = await db
    .from('groundswell_partner_tokens')
    .insert({ partner_id: partnerId, purpose, token_hash: hashToken(token), expires_at: new Date(Date.now() + ttl).toISOString() });
  if (error) throw new Error(`Could not create the link: ${error.message}`);
  return token;
}

/** Marks a link used and returns its partner id, or null if it is unknown, used or expired. */
export async function consumePartnerToken(token: string): Promise<string | null> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from('groundswell_partner_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token_hash', hashToken(token))
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .select('partner_id')
    .maybeSingle();
  return data?.partner_id ?? null;
}

// ---------------------------------------------------------------------------
// Email

const FROM = 'support@newwaveitfl.com';

function emailHtml(heading: string, body: string, link: string, action: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#152232">
<h2 style="border-bottom:2px solid #39CCCC;padding-bottom:10px">${escapeHtml(heading)}</h2>
<p>${body}</p>
<p style="margin:28px 0"><a href="${escapeHtml(link)}" style="background:#152232;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none">${escapeHtml(action)}</a></p>
<p style="font-size:13px;color:#555">If the button does not work, copy this address into your browser:<br>${escapeHtml(link)}</p>
<p style="font-size:13px;color:#555">New Wave: Social Engineering · Croissance partner program</p>
</div>`;
}

/** Sends an invite or reset email. Returns false (and logs) when email is not set up or fails. */
export async function sendPartnerEmail(kind: 'invite' | 'reset', to: string, company: string, token: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error('Groundswell partner email skipped: RESEND_API_KEY is not set.');
    return false;
  }
  const link = setPasswordUrl(token);
  const message =
    kind === 'invite'
      ? {
          subject: 'Your Croissance partner account',
          html: emailHtml(
            'You are invited to the Croissance partner portal',
            `New Wave: Social Engineering set up a partner account for ${escapeHtml(company)}. Choose a password to submit businesses for Croissance audits and see their reports. This link works for 7 days.`,
            link,
            'Choose your password'
          ),
        }
      : {
          subject: 'Reset your Croissance partner password',
          html: emailHtml(
            'Reset your password',
            'Someone asked to reset the password for this Croissance partner account. If it was you, choose a new password below; the link works for one hour. If not, ignore this email.',
            link,
            'Choose a new password'
          ),
        };
  try {
    const result = await new Resend(key).emails.send({ from: FROM, to, ...message });
    if (result.error) {
      console.error('Groundswell partner email failed:', result.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Groundswell partner email failed:', err);
    return false;
  }
}

/** Tells the team a partner submitted a business. Best effort. */
export async function notifyNewPartnerAudit(partner: PartnerProfile, businessName: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  try {
    await new Resend(key).emails.send({
      from: FROM,
      to: 'contact@newwaveitfl.com',
      subject: `[Groundswell] ${partner.company} queued an audit: ${businessName}`,
      html: `<p>${escapeHtml(partner.company)} (${escapeHtml(partner.email)}) queued a Croissance audit for <strong>${escapeHtml(businessName)}</strong>.</p><p>Run it from the admin portal: ${SITE_URL}/admin/groundswell/audits</p>`,
    });
  } catch (err) {
    console.error('Groundswell partner notification failed:', err);
  }
}
