import { afterEach, describe, expect, it, vi } from 'vitest';
import { authConfigFor, clientConnection, clientUserId, COMPOSIO_USER_ID, connectionFor, createConnectionLink, deleteConnectedAccount, executeTool, executeToolAs, forgetConnections, getConnectedAccount, keyShape, toolkitOf } from '../../../api/_lib/groundswell/composio';
import { PermanentStepError } from '../../../api/_lib/groundswell/types';

/** The Composio client's error reporting: a refused key names Composio's reason and the key's shape, never the key. */

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  forgetConnections();
});

/** A fetch that answers the connection listing with `accounts` and the execute call with `execute`. */
function fetchWith(accounts: unknown[], execute: { status: number; body: unknown }) {
  const calls: { url: string; body: unknown }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: { body?: string }) => {
      calls.push({ url, body: init?.body ? JSON.parse(init.body) : null });
      if (url.includes('/connected_accounts')) return { status: 200, ok: true, json: async () => ({ items: accounts }) };
      return { status: execute.status, ok: execute.status < 400, json: async () => execute.body };
    })
  );
  return calls;
}

const maps = (id: string, user_id: string, created_at: string) => ({ id, status: 'ACTIVE', user_id, created_at, toolkit: { slug: 'google_maps' } });

describe('Composio client', () => {
  it('describes the key without revealing it', () => {
    expect(keyShape('ak_1234567890')).toBe('13 characters, starts with ak_');
    expect(keyShape(' ak_1234567890\n')).toBe('15 characters, starts with ak_, with surrounding whitespace');
    expect(keyShape('sk-other')).toBe('8 characters, does not start with ak_');
  });

  it('reads the toolkit off a tool slug', () => {
    expect(toolkitOf('GOOGLE_MAPS_TEXT_SEARCH')).toBe('google_maps');
    expect(toolkitOf('GOOGLEDRIVE_CREATE_FOLDER')).toBe('googledrive');
    expect(toolkitOf('GOOGLEADS_GENERATE_KEYWORD_IDEAS')).toBe('googleads');
    expect(toolkitOf('SCRAPECREATORS_LIST_INSTAGRAM_USER_POSTS')).toBe('scrapecreators');
    expect(toolkitOf('AHREFS_RETRIEVE_SITE_EXPLORER_METRICS')).toBe('ahrefs');
  });

  it('runs a tool as the project\'s active connection for its toolkit, whatever user id it carries', async () => {
    vi.stubEnv('COMPOSIO_API_KEY', 'ak_1234567890');
    const calls = fetchWith(
      [maps('ca_old', 'pg-test-0ff14d6b', '2026-10-21T23:01:22Z'), maps('ca_new', 'pg-test-0ff14d6b', '2026-10-21T23:01:45Z'), { id: 'ca_off', status: 'INACTIVE', user_id: 'x', created_at: '2026-10-22T00:00:00Z', toolkit: { slug: 'google_maps' } }],
      { status: 200, body: { successful: true, data: { places: [] } } }
    );
    expect(await executeTool('GOOGLE_MAPS_TEXT_SEARCH', { textQuery: 'x' })).toEqual({ places: [] });
    expect(calls[0].url).toContain('/connected_accounts?toolkit_slugs=google_maps&statuses=ACTIVE');
    // The newest active account, named outright, so Composio never has to guess among several.
    expect(calls[1].body).toMatchObject({ connected_account_id: 'ca_new', user_id: 'pg-test-0ff14d6b', arguments: { textQuery: 'x' } });
    // The lookup is cached per toolkit.
    await executeTool('GOOGLE_MAPS_GET_PLACE_DETAILS', { name: 'places/x' });
    expect(calls.filter((c) => c.url.includes('/connected_accounts'))).toHaveLength(1);
  });

  it('prefers the connection under the fixed user id, whatever COMPOSIO_USER_ID says', async () => {
    vi.stubEnv('COMPOSIO_API_KEY', 'ak_1234567890');
    vi.stubEnv('COMPOSIO_USER_ID', 'groundswell');
    fetchWith([maps('ca_new', 'groundswell', '2026-10-21T23:01:45Z'), maps('ca_mine', COMPOSIO_USER_ID, '2026-10-01T00:00:00Z')], { status: 200, body: { data: {} } });
    expect(COMPOSIO_USER_ID).toBe('pg-test-0ff14d6b-e58a-45f1-a053-db132130d54f');
    expect((await connectionFor('GOOGLE_MAPS_TEXT_SEARCH'))?.id).toBe('ca_mine');
  });

  it('stops for good, naming the toolkit, when the project has no active connection for it', async () => {
    vi.stubEnv('COMPOSIO_API_KEY', 'ak_1234567890');
    fetchWith([], { status: 200, body: { data: {} } });
    const err = await executeTool('GOOGLEADS_GENERATE_KEYWORD_IDEAS', {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PermanentStepError);
    expect((err as Error).message).toMatch(/no active connection for googleads in this project/);
  });

  it('surfaces Composio\'s reason for a 401 as a permanent error', async () => {
    vi.stubEnv('COMPOSIO_API_KEY', 'ak_1234567890');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        status: 401,
        ok: false,
        json: async () => ({ error: { message: 'Invalid API key format. Please provide a valid API key.', slug: 'Auth_Unauthorized', status: 401, suggested_fix: 'Check your dashboard for a valid key.' } }),
      }))
    );
    const err = await executeTool('GOOGLE_MAPS_TEXT_SEARCH', { textQuery: 'x' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PermanentStepError);
    expect((err as Error).message).toBe(
      'Composio refused the API key (401): Invalid API key format. Please provide a valid API key. Check your dashboard for a valid key. COMPOSIO_API_KEY as read: 13 characters, starts with ak_.'
    );
    expect((err as Error).message).not.toContain('ak_1234567890');
  });

  it('reports a missing connection as permanent and other failures as retryable', async () => {
    vi.stubEnv('COMPOSIO_API_KEY', 'ak_1234567890');
    fetchWith([maps('ca_1', 'u', '2026-10-21T00:00:00Z')], { status: 400, body: { successful: false, error: 'No connected account found for toolkit google_maps' } });
    await expect(executeTool('GOOGLE_MAPS_TEXT_SEARCH', {})).rejects.toBeInstanceOf(PermanentStepError);
    fetchWith([maps('ca_1', 'u', '2026-10-21T00:00:00Z')], { status: 500, body: { error: { message: 'upstream down' } } });
    const err = await executeTool('GOOGLE_MAPS_TEXT_SEARCH', {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(PermanentStepError);
    expect((err as Error).message).toBe('GOOGLE_MAPS_TEXT_SEARCH failed (500): upstream down');
  });

  it('never runs a shared scrape as a client\'s own account, and finds a client\'s account by its user id', async () => {
    vi.stubEnv('COMPOSIO_API_KEY', 'ak_1234567890');
    vi.stubEnv('COMPOSIO_USER_ID', 'groundswell');
    const calls = fetchWith(
      [maps('ca_client', clientUserId('c-1'), '2026-10-22T00:00:00Z'), maps('ca_shared', 'pg-test', '2026-10-01T00:00:00Z')],
      { status: 200, body: { data: {} } }
    );
    // The client's is the newest, but a shared scrape never picks a client: user id.
    expect((await connectionFor('GOOGLE_MAPS_TEXT_SEARCH'))?.id).toBe('ca_shared');
    forgetConnections();
    expect((await clientConnection('c-1', 'google_maps'))?.id).toBe('ca_client');
    expect(calls[calls.length - 1]?.url).toContain(`user_ids=${encodeURIComponent('client:c-1')}`);
    expect(await clientConnection('c-2', 'google_maps')).toBeNull();
  });

  it('runs a tool as a named account (a client\'s own) without consulting the shared lookup', async () => {
    vi.stubEnv('COMPOSIO_API_KEY', 'ak_1234567890');
    const calls = fetchWith([maps('ca_shared', COMPOSIO_USER_ID, '2026-01-01')], { status: 200, body: { successful: true, data: { rows: [] } } });
    expect(await executeToolAs('GOOGLE_ANALYTICS_RUN_REPORT', { property: 'properties/1' }, { id: 'ca_client', user_id: 'client:c1' })).toEqual({ rows: [] });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain('/tools/execute/GOOGLE_ANALYTICS_RUN_REPORT');
    expect(calls[0].body).toMatchObject({ connected_account_id: 'ca_client', user_id: 'client:c1', arguments: { property: 'properties/1' } });
    fetchWith([], { status: 200, body: { successful: false, error: { message: 'Connected account ca_client is EXPIRED' } } });
    const err = await executeToolAs('GOOGLE_ANALYTICS_RUN_REPORT', {}, { id: 'ca_client' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PermanentStepError);
    expect((err as Error).message).toMatch(/no active connection for google: Connected account ca_client is EXPIRED/);
  });

  it('finds an enabled auth config for a toolkit, preferring a Composio-managed one', async () => {
    vi.stubEnv('COMPOSIO_API_KEY', 'ak_1234567890');
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        calls.push(url);
        return {
          status: 200,
          ok: true,
          json: async () => ({
            items: [
              { id: 'ac_custom', status: 'ENABLED', toolkit: { slug: 'googleads' }, is_composio_managed: false },
              { id: 'ac_off', status: 'DISABLED', toolkit: { slug: 'googleads' }, is_composio_managed: true },
              { id: 'ac_managed', status: 'ENABLED', toolkit: { slug: 'googleads' }, is_composio_managed: true },
            ],
          }),
        };
      })
    );
    expect((await authConfigFor('googleads'))?.id).toBe('ac_managed');
    expect(calls[0]).toContain('/auth_configs?toolkit_slug=googleads');
  });

  it('starts the hosted sign-in, reads an account back, and removes one (a missing one counts as removed)', async () => {
    vi.stubEnv('COMPOSIO_API_KEY', 'ak_1234567890');
    const calls: { url: string; method?: string; body: unknown }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
        calls.push({ url, method: init?.method, body: init?.body ? JSON.parse(init.body) : null });
        if (url.endsWith('/connected_accounts/link')) return { status: 201, ok: true, json: async () => ({ redirect_url: 'https://connect.example/x', connected_account_id: 'ca_new', expires_at: '2026-10-22T01:00:00Z' }) };
        if (url.endsWith('/connected_accounts/ca_new')) return { status: 200, ok: true, json: async () => ({ id: 'ca_new', status: 'ACTIVE', status_reason: null, is_disabled: false }) };
        if (url.endsWith('/connected_accounts/ca_gone')) return { status: 404, ok: false, json: async () => ({ error: { message: 'not found' } }) };
        if (url.includes('/connected_accounts/ca_new?revoke_on_delete=true')) return { status: 200, ok: true, json: async () => ({ success: true }) };
        if (url.includes('/connected_accounts/ca_gone?revoke_on_delete=true')) return { status: 404, ok: false, json: async () => ({}) };
        return { status: 500, ok: false, json: async () => ({ error: { message: 'unexpected' } }) };
      })
    );
    const link = await createConnectionLink('ac_managed', clientUserId('c-1'), 'https://www.newwaveitfl.com/groundswell/customers/c-1?linked=googleads');
    expect(link).toMatchObject({ redirect_url: 'https://connect.example/x', connected_account_id: 'ca_new' });
    expect(calls[0]).toMatchObject({ method: 'POST', body: { auth_config_id: 'ac_managed', user_id: 'client:c-1', callback_url: 'https://www.newwaveitfl.com/groundswell/customers/c-1?linked=googleads' } });
    expect(await getConnectedAccount('ca_new')).toMatchObject({ status: 'ACTIVE', is_disabled: false });
    expect(await getConnectedAccount('ca_gone')).toBeNull();
    await expect(deleteConnectedAccount('ca_new')).resolves.toBeUndefined();
    await expect(deleteConnectedAccount('ca_gone')).resolves.toBeUndefined();
    expect(calls[calls.length - 1]).toMatchObject({ method: 'DELETE' });
  });
});
