import { supabase } from './supabase';

export type ContentMap = Record<string, string>;

const CACHE_PREFIX = 'nw_content_v1:';

export function readContentCache(section: string): ContentMap | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + section);
    return raw ? (JSON.parse(raw) as ContentMap) : null;
  } catch {
    return null;
  }
}

export function writeContentCache(section: string, value: ContentMap): void {
  try {
    localStorage.setItem(CACHE_PREFIX + section, JSON.stringify(value));
  } catch {
    /* ignore quota / private mode */
  }
}

export async function fetchSectionContent(section: string): Promise<ContentMap> {
  const { data, error } = await supabase
    .from('site_content')
    .select('key, value')
    .eq('section', section);

  if (error || !data) return {};
  return Object.fromEntries(data.map((row) => [row.key, row.value]));
}

export async function upsertContent(section: string, key: string, value: string): Promise<void> {
  const { error } = await supabase
    .from('site_content')
    .upsert({ section, key, value, updated_at: new Date().toISOString() }, { onConflict: 'section,key' });
  if (error) throw error;

  const cached = readContentCache(section) ?? {};
  writeContentCache(section, { ...cached, [key]: value });
}

export async function upsertManyContent(section: string, entries: Record<string, string>): Promise<void> {
  const rows = Object.entries(entries).map(([key, value]) => ({
    section,
    key,
    value,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase
    .from('site_content')
    .upsert(rows, { onConflict: 'section,key' });
  if (error) throw error;

  const cached = readContentCache(section) ?? {};
  writeContentCache(section, { ...cached, ...entries });
}
