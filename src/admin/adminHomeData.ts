import { supabase } from '../lib/supabase';

/** The newest `site_content.updated_at` per section. */
export async function fetchSectionEdits(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('site_content').select('section, updated_at');
  if (error) throw new Error(error.message);
  const latest: Record<string, string> = {};
  for (const row of (data ?? []) as Array<{ section: string | null; updated_at: string | null }>) {
    if (!row.section || !row.updated_at) continue;
    if (!latest[row.section] || row.updated_at > latest[row.section]) latest[row.section] = row.updated_at;
  }
  return latest;
}

export function formatEdited(iso: string | undefined, now = new Date()): string {
  if (!iso) return 'Not edited yet';
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return 'Not edited yet';
  const days = Math.floor((now.getTime() - then.getTime()) / 86_400_000);
  if (days <= 0) return 'Edited today';
  if (days === 1) return 'Edited yesterday';
  if (days < 30) return `Edited ${days} days ago`;
  return `Edited ${then.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}
