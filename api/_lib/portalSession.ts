import { getSupabaseAdmin } from './supabaseAdmin';
import { hashToken, randomToken } from './tokens';

/** How long a customer stays signed in to the ticket portal. */
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export interface PortalSession {
  id: string;
  email: string;
  expiresAt: string;
}

export function bearerToken(req: any): string | null {
  const header = req.headers?.authorization;
  if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim() || null;
  }
  return null;
}

export async function createPortalSession(
  email: string
): Promise<{ token: string; session: PortalSession }> {
  const supabase = getSupabaseAdmin();
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  const { data, error } = await supabase
    .from('support_portal_sessions')
    .insert({ email, token_hash: hashToken(token), expires_at: expiresAt })
    .select('id, email, expires_at')
    .single();

  if (error || !data) {
    throw new Error(`Could not create portal session: ${error?.message ?? 'no row returned'}`);
  }

  return { token, session: { id: data.id, email: data.email, expiresAt: data.expires_at } };
}

/** Returns the session for a raw bearer token, or null when missing/expired. */
export async function resolvePortalSession(token: string | null): Promise<PortalSession | null> {
  if (!token) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('support_portal_sessions')
    .select('id, email, expires_at')
    .eq('token_hash', hashToken(token))
    .maybeSingle();

  if (error || !data) return null;

  if (new Date(data.expires_at).getTime() <= Date.now()) {
    await supabase.from('support_portal_sessions').delete().eq('id', data.id);
    return null;
  }

  await supabase
    .from('support_portal_sessions')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', data.id);

  return { id: data.id, email: data.email, expiresAt: data.expires_at };
}

export async function destroyPortalSession(token: string | null): Promise<void> {
  if (!token) return;
  const supabase = getSupabaseAdmin();
  await supabase.from('support_portal_sessions').delete().eq('token_hash', hashToken(token));
}
