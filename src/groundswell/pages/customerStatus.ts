import type { AuditStatus } from '../../lib/groundswellValidation';

/**
 * How a customer's newest audit reads to a partner: a plain label and the
 * shell's colour for it. Partners never see error text; a failed audit says
 * the team will follow up.
 */

export const AUDIT_STATUS: Record<AuditStatus, { label: string; color: string }> = {
  queued: { label: 'Waiting to start', color: 'var(--gs-wait)' },
  running: { label: 'Running', color: 'var(--gs-accent-deep)' },
  done: { label: 'Reports ready', color: 'var(--gs-ok)' },
  failed: { label: 'Needs attention', color: 'var(--gs-bad)' },
  // Held before delivery while a person checks the figures; no reason is shown to a partner.
  review: { label: 'In review', color: 'var(--gs-accent-deep)' },
};

export const NOT_STARTED = { label: 'Not started', color: 'var(--nw-slate)' };

export function customerStatus(latest: { status: AuditStatus } | null) {
  return latest ? (AUDIT_STATUS[latest.status] ?? NOT_STARTED) : NOT_STARTED;
}
