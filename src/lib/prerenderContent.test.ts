import { describe, expect, it, vi } from 'vitest';
import { readCmsContentForBuild } from './prerenderContent';

const rows = [
  { section: 'footer', key: 'phone', value: '(561) 564-1846' },
  { section: 'footer', key: 'email', value: 'support@newwaveitfl.com' },
  { section: 'hero', key: 'badge', value: '24/7' },
];

describe('readCmsContentForBuild', () => {
  it('answers null without credentials and never fetches', async () => {
    const fetchImpl = vi.fn();
    expect(await readCmsContentForBuild({ url: '', key: '', fetchImpl })).toBeNull();
    expect(await readCmsContentForBuild({ url: 'https://x.supabase.co', fetchImpl })).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('reads site_content with the anon key and groups rows by section', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => rows }));
    const content = await readCmsContentForBuild({ url: 'https://x.supabase.co/', key: 'anon', fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(content).toEqual({
      footer: { phone: '(561) 564-1846', email: 'support@newwaveitfl.com' },
      hero: { badge: '24/7' },
    });
    const [endpoint, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(endpoint).toBe('https://x.supabase.co/rest/v1/site_content?select=section,key,value');
    expect((init.headers as Record<string, string>).apikey).toBe('anon');
  });

  it('fails loudly when the read is refused, so a build never silently ships stale copy', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) }));
    await expect(readCmsContentForBuild({ url: 'https://x.supabase.co', key: 'bad', fetchImpl: fetchImpl as unknown as typeof fetch })).rejects.toThrow(/HTTP 401/);
  });
});
