import { afterEach, describe, expect, it, vi } from 'vitest';
import { executeTool, forgetConnections, isSharedLookupConfigured, sharedLookupSource } from '../../../api/_lib/groundswell/composio';
import { callConsumerTool, consumerConnections, consumerKeyShape, executeConsumerTool, forgetConsumerSession, messageFromStream } from '../../../api/_lib/groundswell/composioConsumer';
import { runKeywords } from '../../../api/_lib/groundswell/currents/search';
import { PermanentStepError } from '../../../api/_lib/groundswell/types';

/**
 * The consumer account (phases 1 and 2): Composio's MCP endpoint with a ck_
 * key, the same tools New Wave runs from Composio's MCP in Claude. Answers are
 * shaped like the live endpoint's (COMPOSIO_MULTI_EXECUTE_TOOL wraps each
 * tool's answer in data.results[].response).
 */

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  forgetConsumerSession();
  forgetConnections();
});

interface Sent {
  url: string;
  headers: Record<string, string>;
  body: { id?: number; method: string; params?: { name?: string; arguments?: Record<string, unknown> } };
}

type Answer = { status?: number; body?: unknown; stream?: boolean; session?: string };

/** A fetch standing in for the MCP endpoint: `answer` decides each reply from the request. */
function endpoint(answer: (req: Sent) => Answer) {
  const sent: Sent[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: { headers: Record<string, string>; body: string }) => {
      const req = { url, headers: init.headers, body: JSON.parse(init.body) } as Sent;
      sent.push(req);
      const a = answer(req);
      const status = a.status ?? 200;
      const json = a.body === undefined ? '' : JSON.stringify(a.body);
      const text = a.stream ? `event: message\ndata: ${json}\n\n` : json;
      const headers = new Map<string, string>([
        ['content-type', a.stream ? 'text/event-stream' : 'application/json'],
        ...(a.session ? [['mcp-session-id', a.session] as [string, string]] : []),
      ]);
      return { status, ok: status < 400, text: async () => text, headers: { get: (k: string) => headers.get(k.toLowerCase()) ?? null } };
    })
  );
  return sent;
}

/** The live endpoint's envelope around one tool's answer. */
const multi = (response: Record<string, unknown>, slug = 'GOOGLE_MAPS_TEXT_SEARCH') => ({
  successful: true,
  data: { results: [{ response, tool_slug: slug, index: 0 }], total_count: 1, success_count: response.successful === false ? 0 : 1, error_count: response.successful === false ? 1 : 0 },
  error: null,
  log_id: 'log_x',
});

const toolResult = (payload: unknown) => ({ content: [{ type: 'text', text: JSON.stringify(payload) }], isError: false });

/** Handshake, then `onCall` answers each tools/call. */
function mcp(onCall: (req: Sent) => Answer) {
  return endpoint((req) => {
    if (req.body.method === 'initialize') return { body: { jsonrpc: '2.0', id: req.body.id, result: { protocolVersion: '2025-06-18', capabilities: {} } }, session: 'sess-1' };
    if (req.body.method === 'notifications/initialized') return { status: 202 };
    return onCall(req);
  });
}

describe('Composio consumer account', () => {
  it('shakes hands once, sends the ck_ key and session, and unwraps the tool\'s data', async () => {
    vi.stubEnv('COMPOSIO_CONSUMER_API_KEY', 'ck_consumer_secret');
    const places = { places: [{ id: 'ChIJ', displayName: { text: 'Transmissions Unlimited' }, rating: 4.8, userRatingCount: 291 }] };
    const sent = mcp((req) => ({ body: { jsonrpc: '2.0', id: req.body.id, result: toolResult(multi({ successful: true, data: places })) } }));

    expect(await executeConsumerTool('GOOGLE_MAPS_TEXT_SEARCH', { textQuery: 'x' })).toEqual(places);
    expect(await executeConsumerTool('GOOGLE_MAPS_TEXT_SEARCH', { textQuery: 'y' })).toEqual(places);

    expect(sent.map((s) => s.body.method)).toEqual(['initialize', 'notifications/initialized', 'tools/call', 'tools/call']);
    expect(sent[0].url).toBe('https://connect.composio.dev/mcp');
    expect(sent[0].headers['x-consumer-api-key']).toBe('ck_consumer_secret');
    expect(sent[0].headers.Accept).toBe('application/json, text/event-stream');
    expect(sent[2].headers['mcp-session-id']).toBe('sess-1');
    expect(sent[2].body.params).toMatchObject({
      name: 'COMPOSIO_MULTI_EXECUTE_TOOL',
      arguments: { tools: [{ tool_slug: 'GOOGLE_MAPS_TEXT_SEARCH', arguments: { textQuery: 'x' } }], sync_response_to_workbench: false },
    });
  });

  it('reads an answer sent as an event stream', async () => {
    vi.stubEnv('COMPOSIO_CONSUMER_API_KEY', 'ck_consumer_secret');
    mcp((req) => ({ stream: true, body: { jsonrpc: '2.0', id: req.body.id, result: toolResult(multi({ successful: true, data: { ok: 1 } })) } }));
    expect(await executeConsumerTool('AHREFS_RETRIEVE_SITE_EXPLORER_METRICS', {})).toEqual({ ok: 1 });
    expect(messageFromStream(': ping\n\nevent: message\ndata: {"jsonrpc":"2.0","id":7,"result":1}\n\n', 7)).toEqual({ jsonrpc: '2.0', id: 7, result: 1 });
    expect(messageFromStream('data: {"id":3}\n\n', 7)).toBeNull();
  });

  it('a refused key stops for good, names the key\'s shape and never the key', async () => {
    vi.stubEnv('COMPOSIO_CONSUMER_API_KEY', 'ak_project_key_by_mistake');
    endpoint(() => ({ status: 401, body: { error: 'Invalid consumer API key' } }));
    const err = await executeConsumerTool('GOOGLE_MAPS_TEXT_SEARCH', {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PermanentStepError);
    expect((err as Error).message).toMatch(/Composio refused the consumer API key \(401\): Invalid consumer API key/);
    expect((err as Error).message).toMatch(/starts with ak_ \(a Platform project key, not a consumer key\)/);
    expect((err as Error).message).not.toContain('ak_project_key_by_mistake');
    expect(consumerKeyShape('ck_123')).toBe('6 characters, starts with ck_');
  });

  it('a toolkit with nothing linked stops for good; any other failure is retried by the engine', async () => {
    vi.stubEnv('COMPOSIO_CONSUMER_API_KEY', 'ck_consumer_secret');
    let error = 'No active connection found for toolkit googleads';
    mcp((req) => ({ body: { jsonrpc: '2.0', id: req.body.id, result: toolResult(multi({ successful: false, data: {}, error })) } }));
    const missing = await executeConsumerTool('GOOGLEADS_GENERATE_KEYWORD_IDEAS', {}).catch((e: unknown) => e);
    expect(missing).toBeInstanceOf(PermanentStepError);
    expect((missing as Error).message).toMatch(/consumer account has no active connection for googleads/);
    error = 'Upstream timed out';
    const flaky = await executeConsumerTool('GOOGLEADS_GENERATE_KEYWORD_IDEAS', {}).catch((e: unknown) => e);
    expect(flaky).toBeInstanceOf(Error);
    expect(flaky).not.toBeInstanceOf(PermanentStepError);
    expect((flaky as Error).message).toMatch(/GOOGLEADS_GENERATE_KEYWORD_IDEAS failed \(consumer account\): Upstream timed out/);
  });

  it('a session the server forgot is opened again once', async () => {
    vi.stubEnv('COMPOSIO_CONSUMER_API_KEY', 'ck_consumer_secret');
    let calls = 0;
    const sent = mcp((req) => (++calls === 1 ? { status: 404, body: { error: 'Session not found' } } : { body: { jsonrpc: '2.0', id: req.body.id, result: toolResult({ fine: true }) } }));
    expect(await callConsumerTool('COMPOSIO_MANAGE_CONNECTIONS', { toolkits: [] })).toEqual({ fine: true });
    expect(sent.filter((s) => s.body.method === 'initialize')).toHaveLength(2);
  });

  it('a tools/call error or isError result is an error, not data', async () => {
    vi.stubEnv('COMPOSIO_CONSUMER_API_KEY', 'ck_consumer_secret');
    mcp((req) => ({ body: { jsonrpc: '2.0', id: req.body.id, result: { content: [{ type: 'text', text: 'Tool not allowed' }], isError: true } } }));
    await expect(callConsumerTool('COMPOSIO_MULTI_EXECUTE_TOOL', {})).rejects.toThrow(/COMPOSIO_MULTI_EXECUTE_TOOL failed: Tool not allowed/);
  });

  it('routes the shared lookups through the consumer account when its key is set, never the project\'s connections', async () => {
    vi.stubEnv('COMPOSIO_API_KEY', 'ak_project');
    expect(sharedLookupSource()).toBe('project');
    vi.stubEnv('COMPOSIO_CONSUMER_API_KEY', 'ck_consumer_secret');
    expect(isSharedLookupConfigured()).toBe(true);
    expect(sharedLookupSource()).toBe('consumer');
    const sent = mcp((req) => ({ body: { jsonrpc: '2.0', id: req.body.id, result: toolResult(multi({ successful: true, data: { metrics: { org_traffic: 10 } } })) } }));
    expect(await executeTool('AHREFS_RETRIEVE_SITE_EXPLORER_METRICS', { target: 'example.com' })).toEqual({ metrics: { org_traffic: 10 } });
    expect(sent.every((s) => s.url === 'https://connect.composio.dev/mcp')).toBe(true);
    expect(sent.some((s) => s.url.includes('/connected_accounts'))).toBe(false);
  });

  it('lists what the consumer account can run: linked, Composio\'s instant account, or nothing', async () => {
    vi.stubEnv('COMPOSIO_CONSUMER_API_KEY', 'ck_consumer_secret');
    // The live endpoint's answer for a mix of linked and instant toolkits.
    mcp((req) => ({
      body: {
        jsonrpc: '2.0',
        id: req.body.id,
        result: toolResult({
          successful: true,
          data: {
            results: {
              google_maps: { toolkit: 'google_maps', status: 'active', accounts: [{ id: 'google_maps_a', status: 'active' }, { id: 'google_maps_b', status: 'active' }] },
              ahrefs: { toolkit: 'ahrefs', status: 'initiated', accounts: [] },
              googleads: { toolkit: 'googleads', status: 'initiated', accounts: [] },
            },
          },
        }),
      },
    }));
    expect(await consumerConnections(['google_maps', 'ahrefs', 'googleads'], ['ahrefs'])).toEqual([
      { toolkit: 'google_maps', state: 'active', accounts: 2 },
      { toolkit: 'ahrefs', state: 'instant', accounts: 0 },
      { toolkit: 'googleads', state: 'missing', accounts: 0 },
    ]);
  });

  it('Keyword Planner falls back to the consumer login\'s own customer when the project\'s customer id is out of its reach', async () => {
    vi.stubEnv('COMPOSIO_CONSUMER_API_KEY', 'ck_consumer_secret');
    vi.stubEnv('GOOGLE_ADS_CUSTOMER_ID', '2194990200');
    const ideas = { results: [{ text: 'transmission repair', keyword_idea_metrics: { avg_monthly_searches: 1900, competition: 'HIGH', low_top_of_page_bid_micros: 3200000, high_top_of_page_bid_micros: 8300000 } }] };
    const sent = mcp((req) => {
      const args = (req.body.params?.arguments?.tools as { arguments: Record<string, unknown> }[])[0].arguments;
      return args.customer_id
        ? { body: { jsonrpc: '2.0', id: req.body.id, result: toolResult(multi({ successful: false, error: 'USER_PERMISSION_DENIED: the caller does not have permission' }, 'GOOGLEADS_GENERATE_KEYWORD_IDEAS')) } }
        : { body: { jsonrpc: '2.0', id: req.body.id, result: toolResult(multi({ successful: true, data: ideas }, 'GOOGLEADS_GENERATE_KEYWORD_IDEAS')) } };
    });
    const audit = { id: 'a', business_name: 'Transmissions Unlimited', city: 'North Miami Beach, FL', website: 'https://transmissionsunlimitedfl.com', instagram: null, competitors: [], notes: null };
    const out = await runKeywords({ audit, outputs: {}, deadline: Date.now() + 60_000, attempt: 1 });
    expect(out.ideas).toEqual([{ keyword: 'transmission repair', monthly_searches: 1900, competition: 'HIGH', low_bid_usd: 3.2, high_bid_usd: 8.3 }]);
    expect(sent.filter((s) => s.body.method === 'tools/call')).toHaveLength(2);
  });
});
