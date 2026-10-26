import { HEADWAY_SERVICE_INFO, SETUP_ITEMS, type ChecklistItem, type HeadwayService, type SetupStatus } from '../../../../src/lib/headway.js';
import type { ClientAccountRow } from '../clientAccounts.js';
import type { SetupRow } from './store.js';

/**
 * The setup checklist: what Headway needs from this customer for the services
 * switched on, with where each item stands. A `link` item reads the
 * client-accounts table; the rest read groundswell_setup_items. An item is
 * satisfied when it, or its alternative (a login instead of a link), is in
 * place. Required items come first, then the optional ones; an item no
 * enabled service needs is left out.
 */
export function buildChecklist(enabled: HeadwayService[], accounts: ClientAccountRow[], setup: SetupRow[]): ChecklistItem[] {
  const needed = new Map<string, HeadwayService[]>();
  for (const service of enabled) for (const key of HEADWAY_SERVICE_INFO[service].needs) needed.set(key, [...(needed.get(key) ?? []), service]);
  const statusOf = (key: string): { status: SetupStatus; row: SetupRow | null } => {
    const def = SETUP_ITEMS.find((i) => i.key === key)!;
    if (def.kind === 'link') {
      const account = accounts.find((a) => a.service === def.service);
      return { status: account?.status === 'active' ? 'linked' : account?.status === 'pending' ? 'pending' : 'needed', row: null };
    }
    const row = setup.find((r) => r.key === key) ?? null;
    return { status: row?.status === 'provided' ? 'provided' : row?.status === 'waived' ? 'waived' : 'needed', row };
  };
  const inPlace = (status: SetupStatus) => status === 'linked' || status === 'provided' || status === 'waived';
  const items: ChecklistItem[] = [];
  for (const def of SETUP_ITEMS) {
    const services = needed.get(def.key);
    if (!services) continue;
    const { status, row } = statusOf(def.key);
    const alternative = def.alternative ? statusOf(def.alternative).status : null;
    const alternativeOf = SETUP_ITEMS.find((i) => i.alternative === def.key);
    const asAlternative = alternativeOf ? statusOf(alternativeOf.key).status : null;
    items.push({
      ...def,
      status,
      satisfied: inPlace(status) || (alternative !== null && inPlace(alternative)) || (asAlternative !== null && inPlace(asAlternative)),
      for: services,
      value_hint: row?.value_hint ?? null,
      provided_at: row?.provided_at ?? null,
      notes: row?.notes ?? null,
    });
  }
  return items.sort((a, b) => Number(b.required) - Number(a.required));
}

/** The setup keys, among those listed, that are not in place: what an action waits on. */
export const missingAmong = (checklist: ChecklistItem[], keys: string[]): string[] => keys.filter((k) => !checklist.some((i) => i.key === k && i.satisfied));
