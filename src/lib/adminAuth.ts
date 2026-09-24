import { supabase } from './supabase';

/**
 * Authorization for calls from the admin screens to the /api admin routes:
 * the signed-in admin's Supabase session, which the routes verify
 * (api/_lib/adminKey.ts). Never a secret compiled into the bundle: anything
 * read through a VITE_ variable ships to every visitor.
 */
export async function adminAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}
