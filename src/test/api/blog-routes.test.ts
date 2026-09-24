import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Result = { data: unknown; error: unknown; count?: number };
type Call = [method: string, args: unknown[]];

/** A chainable, awaitable stand-in for a Supabase query builder that records every call. */
function fakeClient() {
  const state = { calls: [] as Call[], result: { data: null, error: null } as Result };
  const builder: Record<string, unknown> = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          return (resolve: (v: Result) => unknown, reject: (e: unknown) => unknown) =>
            Promise.resolve(state.result).then(resolve, reject);
        }
        return (...args: unknown[]) => {
          state.calls.push([String(prop), args]);
          return builder;
        };
      },
    },
  );
  return {
    state,
    client: {
      from: (table: string) => {
        state.calls.push(['from', [table]]);
        return builder;
      },
      auth: { getUser: vi.fn(async () => ({ data: { user: null }, error: { message: 'invalid JWT' } })) },
    },
  };
}

const db = vi.hoisted(() => ({
  publicConfigured: true,
  adminConfigured: true,
  public: null as unknown as ReturnType<typeof fakeClient>,
  admin: null as unknown as ReturnType<typeof fakeClient>,
}));

vi.mock('../../../api/_lib/supabasePublic', () => ({
  isSupabasePublicConfigured: () => db.publicConfigured,
  missingSupabasePublicEnv: () => (db.publicConfigured ? [] : ['VITE_SUPABASE_URL']),
  getSupabasePublic: () => db.public.client,
}));
vi.mock('../../../api/_lib/supabaseAdmin', () => ({
  isSupabaseConfigured: () => db.adminConfigured,
  getSupabaseAdmin: () => db.admin.client,
}));

import listHandler from '../../../api/blog/list';
import idHandler from '../../../api/blog/[id]';
import generateHandler from '../../../api/blog/generate-post';

function makeRes() {
  return {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    send(payload: string) {
      this.body = payload;
      return this;
    },
  };
}

const POST_ID = '3f2b8c1e-9a4d-4e7b-8c21-5d6f7a8b9c0d';
const KEY = 'test-admin-key';
const call = (client: ReturnType<typeof fakeClient>, method: string) =>
  client.state.calls.find(([name]) => name === method)?.[1];

beforeEach(() => {
  db.publicConfigured = true;
  db.adminConfigured = true;
  db.public = fakeClient();
  db.admin = fakeClient();
  vi.stubEnv('ADMIN_API_KEY', KEY);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('GET /api/blog/list', () => {
  it('pages newest-first posts through the anon client, capping the page size', async () => {
    db.public.state.result = { data: [{ id: POST_ID, title: 'Hello' }], error: null, count: 61 };
    const res = makeRes();
    await listHandler({ method: 'GET', query: { page: '2', limit: '1000', category: 'Cybersecurity' } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ posts: [{ id: POST_ID, title: 'Hello' }], total: 61, page: 2, limit: 50 });
    expect(call(db.public, 'from')).toEqual(['blog_posts']);
    expect(call(db.public, 'range')).toEqual([50, 99]);
    expect(call(db.public, 'eq')).toEqual(['category', 'Cybersecurity']);
    expect(db.admin.state.calls).toEqual([]);
  });

  it('keeps search a plain substring (no extra or() conditions)', async () => {
    db.public.state.result = { data: [], error: null, count: 0 };
    await listHandler({ method: 'GET', query: { search: 'ransomware,id.eq.1)' } }, makeRes());
    expect(call(db.public, 'or')).toEqual(['title.ilike.%ransomware id.eq.1%,excerpt.ilike.%ransomware id.eq.1%']);
  });

  it('answers 500 without leaking the database error, 503 when unconfigured, 405 for other methods', async () => {
    db.public.state.result = { data: null, error: { message: 'relation secret_table does not exist' } };
    const failed = makeRes();
    await listHandler({ method: 'GET', query: {} }, failed);
    expect(failed.statusCode).toBe(500);
    expect(JSON.stringify(failed.body)).not.toContain('secret_table');

    db.publicConfigured = false;
    const unconfigured = makeRes();
    await listHandler({ method: 'GET', query: {} }, unconfigured);
    expect(unconfigured.statusCode).toBe(503);

    const post = makeRes();
    await listHandler({ method: 'POST', query: {} }, post);
    expect(post.statusCode).toBe(405);
  });
});

describe('/api/blog/:id', () => {
  const req = (method: string, extra: Record<string, unknown> = {}) => ({ method, query: { id: POST_ID }, headers: {}, ...extra });

  it('GET returns a post, 404 for an unknown id, and 404 for a malformed id without querying', async () => {
    db.public.state.result = { data: { id: POST_ID, title: 'Hello' }, error: null };
    const found = makeRes();
    await idHandler(req('GET'), found);
    expect(found.statusCode).toBe(200);
    expect(found.body).toEqual({ id: POST_ID, title: 'Hello' });

    db.public.state.result = { data: null, error: null };
    const missing = makeRes();
    await idHandler(req('GET'), missing);
    expect(missing.statusCode).toBe(404);

    db.public = fakeClient();
    const malformed = makeRes();
    await idHandler(req('GET', { query: { id: '1 or 1=1' } }), malformed);
    expect(malformed.statusCode).toBe(404);
    expect(db.public.state.calls).toEqual([]);
  });

  it('refuses writes when ADMIN_API_KEY is unset (it used to allow them) or the key is wrong', async () => {
    vi.stubEnv('ADMIN_API_KEY', '');
    const unset = makeRes();
    await idHandler(req('DELETE', { headers: {} }), unset);
    expect(unset.statusCode).toBe(503);

    vi.stubEnv('ADMIN_API_KEY', KEY);
    const wrong = makeRes();
    await idHandler(req('DELETE', { headers: { 'x-admin-key': 'nope' } }), wrong);
    expect(wrong.statusCode).toBe(401);

    const none = makeRes();
    await idHandler(req('PUT', { body: { title: 'x' } }), none);
    expect(none.statusCode).toBe(401);
    expect(db.admin.state.calls).toEqual([]);
  });

  it('PUT updates only editable fields through the service role', async () => {
    db.admin.state.result = { data: { id: POST_ID, title: 'New title' }, error: null };
    const res = makeRes();
    await idHandler(
      req('PUT', { headers: { 'x-admin-key': KEY }, body: { title: 'New title', id: 'other-id', created_at: '2000-01-01' } }),
      res,
    );
    expect(res.statusCode).toBe(200);
    expect(call(db.admin, 'update')).toEqual([{ title: 'New title' }]);
    expect(call(db.admin, 'eq')).toEqual(['id', POST_ID]);

    const empty = makeRes();
    await idHandler(req('PUT', { headers: { 'x-admin-key': KEY }, body: { id: 'x' } }), empty);
    expect(empty.statusCode).toBe(400);
  });

  it('DELETE removes the post, answers 404 when nothing matched, and 503 without the service role', async () => {
    db.admin.state.result = { data: [{ id: POST_ID }], error: null };
    const deleted = makeRes();
    await idHandler(req('DELETE', { headers: { 'x-admin-key': KEY } }), deleted);
    expect(deleted.statusCode).toBe(200);
    expect(call(db.admin, 'delete')).toEqual([]);

    db.admin.state.result = { data: [], error: null };
    const missing = makeRes();
    await idHandler(req('DELETE', { headers: { 'x-admin-key': KEY } }), missing);
    expect(missing.statusCode).toBe(404);

    db.adminConfigured = false;
    const unconfigured = makeRes();
    await idHandler(req('DELETE', { headers: { 'x-admin-key': KEY } }), unconfigured);
    expect(unconfigured.statusCode).toBe(503);

    const patch = makeRes();
    await idHandler(req('PATCH'), patch);
    expect(patch.statusCode).toBe(405);
  });
});

describe('/api/blog/generate-post', () => {
  const generated = {
    title: 'Managed IT in Fort Lauderdale: 2026 Guide',
    slug: 'managed-it-fort-lauderdale-2026',
    excerpt: 'What to expect.',
    content: '## Intro\n\nBody.',
    featured_image_query: 'server room',
    category: 'Managed IT Services',
    tags: ['msp'],
    meta_title: 'Managed IT in Fort Lauderdale',
    meta_description: 'A guide.',
  };
  const openAiReply = (content: object) =>
    new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }), { status: 200 });

  it('refuses without a configured, matching key before calling OpenAI', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');

    vi.stubEnv('ADMIN_API_KEY', '');
    const unset = makeRes();
    await generateHandler({ method: 'POST', headers: {}, body: {} }, unset);
    expect(unset.statusCode).toBe(503);

    vi.stubEnv('ADMIN_API_KEY', KEY);
    const wrong = makeRes();
    await generateHandler({ method: 'POST', headers: { 'x-admin-key': 'nope' }, body: {} }, wrong);
    expect(wrong.statusCode).toBe(401);

    const status = makeRes();
    await generateHandler({ method: 'GET', headers: {} }, status);
    expect(status.statusCode).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('lets a signed-in admin run it from the admin screen, and refuses an invalid session', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');
    const rejected = makeRes();
    await generateHandler({ method: 'GET', headers: { authorization: 'Bearer bad' } }, rejected);
    expect(rejected.statusCode).toBe(401);

    db.public.client.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'admin' } }, error: null } as never);
    const allowed = makeRes();
    await generateHandler({ method: 'GET', headers: { authorization: 'Bearer good' } }, allowed);
    expect(allowed.statusCode).toBe(200);
  });

  it('does not spend OpenAI tokens when the post could not be saved', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');
    db.adminConfigured = false;
    const res = makeRes();
    await generateHandler({ method: 'POST', headers: { 'x-admin-key': KEY }, body: {} }, res);
    expect(res.statusCode).toBe(503);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('writes a post with OpenAI and saves it through the service role', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');
    vi.stubEnv('PEXELS_API_KEY', '');
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(openAiReply({ topics: [{ name: 'Co-managed IT', relevance: 'Now', keyPoints: ['a', 'b'] }] }))
      .mockResolvedValueOnce(openAiReply(generated));
    vi.stubGlobal('fetch', fetchSpy);
    db.admin.state.result = { data: { id: POST_ID, ...generated, published_at: '2026-09-27T02:00:00Z' }, error: null };

    const res = makeRes();
    // pg_net sends a JSON string body; the route must parse it.
    await generateHandler({ method: 'POST', headers: { 'x-admin-key': KEY }, body: '{}' }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ id: POST_ID, slug: generated.slug });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(String(fetchSpy.mock.calls[0][0])).toBe('https://api.openai.com/v1/chat/completions');
    expect(call(db.admin, 'from')).toEqual(['blog_posts']);
    expect(call(db.admin, 'insert')?.[0]).toMatchObject({
      title: generated.title,
      slug: generated.slug,
      category: generated.category,
      featured_image: expect.stringContaining('picsum.photos'),
    });
    expect(db.public.state.calls).toEqual([]);
  });

  it('reports its configuration to an authorised GET', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');
    const res = makeRes();
    await generateHandler({ method: 'GET', headers: { 'x-admin-key': KEY } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ ok: true, hasKey: true, hasSupabaseWrite: true });
  });
});

describe('API modules load as Node ESM on Vercel', () => {
  const root = path.resolve(__dirname, '../../..');
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      return statSync(full).isDirectory() ? files(full) : full.endsWith('.ts') ? [full] : [];
    });
  const apiFiles = files(path.join(root, 'api'));

  it.each(apiFiles.map((file) => [path.relative(root, file), file]))(
    '%s gives every relative runtime import a .js extension and never loads the browser Supabase client',
    (_name, file) => {
      const source = readFileSync(file, 'utf8');
      // package.json is "type": "module", so Node resolves these literally: an
      // extensionless specifier is ERR_MODULE_NOT_FOUND (how api/blog/* broke).
      const runtimeImports = [...source.matchAll(/^import\s+(?!type\s)[^;]*?from\s+'(\.{1,2}\/[^']+)'/gm)].map((m) => m[1]);
      runtimeImports.forEach((specifier) => expect(specifier, specifier).toMatch(/\.js$/));
      // src/lib/supabase.ts reads import.meta.env, which is undefined in a function.
      expect(source).not.toMatch(/from\s+'[^']*src\/lib\/(supabase|blog|content|blogGeneration)(\.js)?'/);
    },
  );
});
