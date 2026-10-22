import type { SupabaseClient } from '@supabase/supabase-js';
import { CLIENT_SERVICES, type ClientAccountStatus, type ClientService } from '../../../src/lib/groundswellValidation.js';
import { getConnectedAccount, type ConnectedAccountState } from './composio.js';

/**
 * A client's linked accounts (groundswell_client_accounts, migration
 * 20261028120000): one row per service a partner connected through Composio's
 * hosted flow. Composio holds the credentials; the row remembers which
 * connected account is the client's and what Composio last said about it.
 */

export interface ClientAccountRow {
  id: string;
  customer_id: string;
  service: ClientService;
  composio_account_id: string;
  auth_config_id: string;
  user_id: string;
  status: ClientAccountStatus;
  status_reason: string | null;
  linked_by: string | null;
  linked_at: string | null;
  checked_at: string | null;
  created_at: string;
  updated_at: string;
}

/** What the portal shows for each service, linked or not. */
export interface ClientAccountView {
  service: ClientService;
  label: string;
  brings: string;
  status: ClientAccountStatus | 'none';
  linked_at: string | null;
  /** A plain sentence for a failed or expired link; never Composio's own text. */
  reason: string | null;
}

/** An active account is asked about again after this long, so an expired or revoked one is noticed. */
export const RECHECK_MS = 10 * 60_000;

/** Composio's account status as the portal's. A missing account (removed in Composio) reads as disabled. */
export function statusFrom(state: ConnectedAccountState | null): { status: ClientAccountStatus; reason: string | null } {
  if (!state) return { status: 'disabled', reason: 'The connection was removed. Link the account again.' };
  if (state.is_disabled) return { status: 'disabled', reason: 'The connection was turned off. Link the account again.' };
  switch ((state.status ?? '').toUpperCase()) {
    case 'ACTIVE':
      return { status: 'active', reason: null };
    case 'FAILED':
      return { status: 'failed', reason: 'The sign-in did not finish. Try linking the account again.' };
    case 'EXPIRED':
      return { status: 'expired', reason: 'The sign-in link expired before it was used. Try linking the account again.' };
    case 'INACTIVE':
      return { status: 'disabled', reason: 'The connection was turned off. Link the account again.' };
    default:
      return { status: 'pending', reason: null };
  }
}

const due = (row: ClientAccountRow, now: number) =>
  row.status === 'pending' || (row.status === 'active' && (!row.checked_at || now - Date.parse(row.checked_at) > RECHECK_MS));

/**
 * Asks Composio about every account that is pending, or active and not
 * checked lately, and saves what it says. A Composio outage leaves the rows
 * as they were (the page shows the last known state).
 */
export async function refreshClientAccounts(db: SupabaseClient, rows: ClientAccountRow[], now = Date.now()): Promise<ClientAccountRow[]> {
  return Promise.all(
    rows.map(async (row) => {
      if (!due(row, now)) return row;
      let state: ConnectedAccountState | null;
      try {
        state = await getConnectedAccount(row.composio_account_id);
      } catch {
        return row;
      }
      const next = statusFrom(state);
      const patch = {
        status: next.status,
        status_reason: state?.status_reason ?? null,
        checked_at: new Date(now).toISOString(),
        linked_at: next.status === 'active' ? (row.linked_at ?? new Date(now).toISOString()) : row.linked_at,
      };
      if (patch.status === row.status && row.checked_at && patch.linked_at === row.linked_at && row.status !== 'pending') return row;
      const { error } = await db.from('groundswell_client_accounts').update(patch).eq('id', row.id);
      if (error) console.error('Client account refresh failed:', error.message);
      return { ...row, ...patch };
    })
  );
}

/** The plain sentence a stored status reads as (statusFrom's wording, without asking Composio again). */
const REASONS: Record<ClientAccountStatus, string | null> = {
  pending: null,
  active: null,
  failed: statusFrom({ id: '', status: 'FAILED', status_reason: null, is_disabled: false }).reason,
  expired: statusFrom({ id: '', status: 'EXPIRED', status_reason: null, is_disabled: false }).reason,
  disabled: statusFrom({ id: '', status: 'INACTIVE', status_reason: null, is_disabled: true }).reason,
};

/** Every service in catalogue order, with the client's row where there is one. */
export function accountsView(rows: ClientAccountRow[]): ClientAccountView[] {
  return CLIENT_SERVICES.map((s) => {
    const row = rows.find((r) => r.service === s.key);
    return {
      service: s.key,
      label: s.label,
      brings: s.brings,
      status: row?.status ?? 'none',
      linked_at: row?.linked_at ?? null,
      reason: row ? REASONS[row.status] : null,
    };
  });
}

export const serviceOf = (key: ClientService) => CLIENT_SERVICES.find((s) => s.key === key)!;
