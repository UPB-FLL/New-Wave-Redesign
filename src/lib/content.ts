import { supabase } from './supabase';

export type ContentMap = Record<string, string>;

export async function fetchSectionContent(section: string): Promise<ContentMap> {
  const { data, error } = await supabase
    .from('site_content')
    .select('key, value')
    .eq('section', section);

  if (error || !data) return {};
  return Object.fromEntries(data.map((row) => [row.key, row.value]));
}

export async function upsertContent(section: string, key: string, value: string): Promise<void> {
  await supabase
    .from('site_content')
    .upsert({ section, key, value, updated_at: new Date().toISOString() }, { onConflict: 'section,key' });
}

export async function upsertManyContent(section: string, entries: Record<string, string>): Promise<void> {
  const rows = Object.entries(entries).map(([key, value]) => ({
    section,
    key,
    value,
    updated_at: new Date().toISOString(),
  }));
  await supabase
    .from('site_content')
    .upsert(rows, { onConflict: 'section,key' });
}
