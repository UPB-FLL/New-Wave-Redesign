import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Who an audit's reports are from, and any override of the business's own
 * look. An audit a partner submitted is white-labelled: its reports carry the
 * partner's name (its display name, else its company) and logo, never New
 * Wave's. Read with the service role when a step is claimed.
 *
 * The columns come from migration 20261023120000; where they do not exist yet
 * the audit reads as before (partner_id itself is older, from 20261021140000).
 * Any other read error throws, so the step retries: printing a partner's
 * report under New Wave's name would be worse than a late one.
 */

export interface AuditBranding {
  /** The partner that submitted the audit; null when an admin queued it. */
  partner: { id: string; company: string; name: string; logo: string | null } | null;
  /** The business's logo link and main colour, set when it was queued; null means the website's. */
  logo: string | null;
  color: string | null;
}

export const NO_BRANDING: AuditBranding = { partner: null, logo: null, color: null };

const missingColumn = (message: string | undefined) => /column .* does not exist|42703/i.test(message ?? '');
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** Selects `columns`, or `fallback` when the database does not have them yet; throws on any other error. */
async function readOne(db: SupabaseClient, table: string, id: string, columns: string, fallback: string): Promise<Record<string, unknown>> {
  let result = await db.from(table).select(columns).eq('id', id).single();
  if (result.error && missingColumn(result.error.message)) result = await db.from(table).select(fallback).eq('id', id).single();
  if (result.error || !result.data) throw new Error(`Could not read the branding for ${table} ${id}: ${result.error?.message ?? 'no row'}`);
  return result.data as unknown as Record<string, unknown>;
}

export async function loadBranding(db: SupabaseClient, auditId: string): Promise<AuditBranding> {
  const a = await readOne(db, 'marketing_audits', auditId, 'partner_id,brand_logo_url,brand_color', 'partner_id');
  const partnerId = str(a.partner_id);
  let partner: AuditBranding['partner'] = null;
  if (partnerId) {
    const p = await readOne(db, 'groundswell_partners', partnerId, 'id,company,display_name,logo_url', 'id,company');
    const company = str(p.company) ?? 'Your agency';
    partner = { id: partnerId, company, name: str(p.display_name) ?? company, logo: str(p.logo_url) };
  }
  return { partner, logo: str(a.brand_logo_url), color: str(a.brand_color) };
}
