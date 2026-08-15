import { describe, expect, it } from 'vitest';
import { createUnconfiguredSupabaseClient } from './supabase';

describe('unconfigured Supabase client', () => {
  it('supports the query chains used by public content and pricing pages', async () => {
    const client = createUnconfiguredSupabaseClient();

    await expect(
      client.from('pricing_units').select('*').eq('active', true).order('sort_order', { ascending: true }),
    ).resolves.toEqual({ data: [], error: null });

    await expect(
      client.from('seo_pages').select('*').eq('slug', 'managed-it').maybeSingle(),
    ).resolves.toEqual({ data: null, error: null });
  });

  it('keeps write queries awaitable without pretending that a record was created', async () => {
    const client = createUnconfiguredSupabaseClient();

    await expect(client.from('contact_submissions').insert([{ name: 'Pat' }])).resolves.toEqual({ data: [], error: null });
    await expect(client.from('seo_pages').insert({ slug: 'managed-it' }).select('*').single()).resolves.toEqual({ data: null, error: null });
  });
});
