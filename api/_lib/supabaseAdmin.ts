import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client for the support API routes.
 *
 * The support tables have RLS enabled with no public policies, so every read
 * and write has to come through here — the anon key used by the browser
 * cannot touch login codes, portal sessions, or chat transcripts.
 */

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let cached: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && serviceRoleKey);
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }
  if (!cached) {
    cached = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
