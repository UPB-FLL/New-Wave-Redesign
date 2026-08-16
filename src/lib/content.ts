import { supabase } from './supabase';

export type ContentMap = Record<string, string>;

const CACHE_PREFIX = 'nw_content_v2:';

export interface ContentChange {
  section: string;
  key: string;
  value: string;
  timestamp: string;
}

const CONTENT_CHANNEL = 'newwave_content_updates';

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

let channel: BroadcastChannel | null = null;
export function broadcastContentChange(section: string, key: string, value: string): void {
  try {
    if (!channel) channel = new BroadcastChannel(CONTENT_CHANNEL);
    channel.postMessage({
      section,
      key,
      value,
      timestamp: new Date().toISOString(),
    } as ContentChange);
  } catch (e) {
    // BroadcastChannel not supported (some older browsers)
    console.warn('BroadcastChannel not supported:', e);
  }
}

export async function upsertContent(section: string, key: string, value: string): Promise<void> {
  const { error } = await supabase
    .from('site_content')
    .upsert({ section, key, value, updated_at: new Date().toISOString() }, { onConflict: 'section,key' });
  if (error) throw error;

  const cached = readContentCache(section) ?? {};
  writeContentCache(section, { ...cached, [key]: value });

  // NEW: Broadcast change to other tabs
  broadcastContentChange(section, key, value);
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

  // NEW: Broadcast all changes to other tabs
  Object.entries(entries).forEach(([key, value]) => {
    broadcastContentChange(section, key, value);
  });
}

export function setupContentListener(
  section: string,
  onContentChange: (key: string, value: string) => void
): () => void {
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CONTENT_CHANNEL);
    channel.addEventListener('message', (event: MessageEvent<ContentChange>) => {
      if (event.data.section === section) {
        // Invalidate cache for this section
        writeContentCache(section, {
          ...(readContentCache(section) ?? {}),
          [event.data.key]: event.data.value,
        });
        onContentChange(event.data.key, event.data.value);
      }
    });
  } catch (e) {
    console.warn('BroadcastChannel not supported:', e);
  }

  // Return cleanup function
  return () => {
    if (channel) {
      channel.close();
    }
  };
}

export function setupContentPolling(
  section: string,
  onContentChange: (newContent: ContentMap) => void,
  intervalMs: number = 30000
): () => void {
  let lastKnownHash = JSON.stringify(readContentCache(section) ?? {});
  const intervalId = setInterval(async () => {
    try {
      const fresh = await fetchSectionContent(section);
      const freshHash = JSON.stringify(fresh);
      if (freshHash !== lastKnownHash) {
        lastKnownHash = freshHash;
        writeContentCache(section, fresh);
        onContentChange(fresh);
      }
    } catch (e) {
      console.warn('Content polling failed:', e);
    }
  }, intervalMs);

  // Return cleanup function
  return () => clearInterval(intervalId);
}
