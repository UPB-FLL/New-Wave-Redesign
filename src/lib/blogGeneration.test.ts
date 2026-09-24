import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./supabase', () => ({
  supabase: { auth: { getSession: vi.fn(async () => ({ data: { session: { access_token: 'session-token' } } })) } },
}));

import { generateBlogPost } from './blogGeneration';

afterEach(() => vi.unstubAllGlobals());

describe('generateBlogPost (admin button)', () => {
  it('asks the server route with the admin session, never OpenAI from the browser', async () => {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ id: 'p1', title: 'Hi', slug: 'hi' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    await expect(generateBlogPost({ category: 'Cybersecurity' })).resolves.toEqual({ id: 'p1', title: 'Hi', slug: 'hi' });
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/blog/generate-post');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer session-token' });
    expect(JSON.parse(String(init.body))).toEqual({ category: 'Cybersecurity' });
  });

  it('surfaces the server error message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'OPENAI_API_KEY is not configured.' }), { status: 500 })));
    await expect(generateBlogPost()).rejects.toThrow('OPENAI_API_KEY is not configured.');
  });
});
