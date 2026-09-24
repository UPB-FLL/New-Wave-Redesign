import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Anon-key Supabase client for public reads from API routes: blog_posts and
 * site_content allow anon SELECT under RLS, so these routes need no
 * service-role key. It reads the same VITE_ variables the frontend build
 * uses, which Vercel also exposes to functions; SUPABASE_* names win if set.
 * Writes go through supabaseAdmin.ts instead.
 */

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let cached: SupabaseClient | null = null;

export function isSupabasePublicConfigured(): boolean {
  return Boolean(url && anonKey);
}

/** Names of the missing variables, for logs (never their values). */
export function missingSupabasePublicEnv(): string[] {
  return [!url && 'VITE_SUPABASE_URL', !anonKey && 'VITE_SUPABASE_ANON_KEY'].filter((name): name is string => Boolean(name));
}

export function getSupabasePublic(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  if (!cached) {
    cached = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
