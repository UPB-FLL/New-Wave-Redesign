import type { ListItem } from '../components/ListRows';

/** Helpers shared by the section editor and the sidebar search. */

export const FIELD_PARAM = 'field';

export function fieldInputId(section: string, key: string): string {
  return `field-${section}-${key}`;
}

/** One stored list, or the reason it could not be read. */
export function parseList(raw: string | undefined): { items: ListItem[]; error?: string } {
  if (raw === undefined || raw.trim() === '') return { items: [] };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { items: [], error: 'The stored value is not a list.' };
    if (!parsed.every((x) => x && typeof x === 'object' && !Array.isArray(x))) return { items: [], error: 'An entry in the stored list is not an object.' };
    return { items: parsed as ListItem[] };
  } catch (err) {
    return { items: [], error: err instanceof Error ? err.message : 'Invalid JSON' };
  }
}
