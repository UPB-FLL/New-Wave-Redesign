import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { executeTool, forgetConnections, isSharedLookupConfigured, sharedLookupSource } from '../../../api/_lib/groundswell/composio';
import { callConsumerTool, consumerConnections, consumerKeyShape, executeConsumerTool, forgetConsumerSession, messageFromStream, prunerCode, decodeWorkbenchJson } from '../../../api/_lib/groundswell/composioConsumer';
import { runKeywords } from '../../../api/_lib/groundswell/currents/search';
import { ProviderCreditError, resetPublicReadBudget } from '../../../api/_lib/groundswell/providerBudget';
import { PermanentStepError } from '../../../api/_lib/groundswell/types';

vi.mock('../../../api/_lib/groundswell/keywordsGeography', () => ({ resolveKeywordGeography: async () => ({ constants: ['geoTargetConstants/12345'], label: 'North Miami Beach, Florida, United States', error: null }) }));

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
  resetPublicReadBudget();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

interface Sent {
  url: string;
  headers: Record<string, string>;
  signal?: AbortSignal;
  body: { id?: number; method: string; params?: { name?: string; arguments?: Record<string, unknown> } };
}

type Answer = { status?: number; body?: unknown; stream?: boolean; session?: string };

/** A fetch standing in for the MCP endpoint: `answer` decides each reply from the request. */
function endpoint(answer: (req: Sent) => Answer) {
  const sent: Sent[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: { headers: Record<string, string>; body: string; signal?: AbortSignal }) => {
      const req = { url, headers: init.headers, signal: init.signal, body: JSON.parse(init.body) } as Sent;
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

  it('a toolkit with several linked accounts: the default is chosen once and every later call names it', async () => {
    vi.stubEnv('COMPOSIO_CONSUMER_API_KEY', 'ck_consumer_secret');
    const serp = { organic_results: [{ position: 1, link: 'https://example.com', title: 'Example' }] };
    const sent = mcp((req) => {
      const { name, arguments: args } = req.body.params as { name: string; arguments: Record<string, unknown> };
      if (name === 'COMPOSIO_MANAGE_CONNECTIONS') {
        return {
          body: {
            jsonrpc: '2.0',
            id: req.body.id,
            result: toolResult({
              successful: true,
              data: {
                results: {
                  serpapi: {
                    toolkit: 'serpapi',
                    status: 'active',
                    accounts: [
                      { id: 'serpapi_cove-still', status: 'active', is_default: false },
                      { id: 'serpapi_boyd-weism', status: 'active', is_default: true },
                    ],
                  },
                },
              },
            }),
          },
        };
      }
      const tool = (args.tools as { account?: string }[])[0];
      // Composio refuses a call that names no account while two are linked.
      const body = tool.account
        ? multi({ successful: true, data: serp }, 'SERPAPI_GOOGLE_LIGHT_SEARCH')
        : {
            successful: false,
            data: {
              results: [{ error: 'Multiple serpapi accounts connected. Specify which to use via the \'account\' field:\n- "serpapi_boyd-weism"\n- "serpapi_cove-still"', tool_slug: 'SERPAPI_GOOGLE_LIGHT_SEARCH', index: 0 }],
              total_count: 1,
              success_count: 0,
              error_count: 1,
            },
            error: '1 out of 1 tools failed',
          };
      return { body: { jsonrpc: '2.0', id: req.body.id, result: toolResult(body) } };
    });

    expect(await executeConsumerTool('SERPAPI_GOOGLE_LIGHT_SEARCH', { q: 'brewery' })).toEqual(serp);
    expect(await executeConsumerTool('SERPAPI_GOOGLE_MAPS_SEARCH', { q: 'brewery' })).toEqual(serp);
    const calls = sent.filter((s) => s.body.method === 'tools/call').map((s) => s.body.params!);
    expect(calls.map((c) => c.name)).toEqual(['COMPOSIO_MULTI_EXECUTE_TOOL', 'COMPOSIO_MANAGE_CONNECTIONS', 'COMPOSIO_MULTI_EXECUTE_TOOL', 'COMPOSIO_MULTI_EXECUTE_TOOL']);
    expect(calls[1].arguments).toEqual({ toolkits: [{ name: 'serpapi', action: 'list' }] });
    // The default account, not the first listed, and remembered for the next SerpApi call.
    expect((calls[2].arguments!.tools as { account?: string }[])[0].account).toBe('serpapi_boyd-weism');
    expect((calls[3].arguments!.tools as { account?: string }[])[0].account).toBe('serpapi_boyd-weism');
  });

  it('reads a failed tool\'s reason out of an answer the endpoint flags as an error', async () => {
    vi.stubEnv('COMPOSIO_CONSUMER_API_KEY', 'ck_consumer_secret');
    // As the live endpoint answers a blocked Instagram read: the MCP result is an error, the reason is inside.
    const blocked = {
      successful: false,
      data: { results: [{ response: { successful: false, data: { message: 'Instagram blocked access to this user\'s public posts.', status_code: 403 }, error: 'Instagram blocked access to this user\'s public posts.' }, tool_slug: 'SCRAPECREATORS_LIST_INSTAGRAM_USER_POSTS', index: 0 }] },
      error: '1 out of 1 tools failed',
    };
    mcp((req) => ({ body: { jsonrpc: '2.0', id: req.body.id, result: { content: [{ type: 'text', text: JSON.stringify(blocked) }], isError: true } } }));
    await expect(executeConsumerTool('SCRAPECREATORS_LIST_INSTAGRAM_USER_POSTS', { handle: 'x' })).rejects.toThrow(/failed \(consumer account\): Instagram blocked access/);
  });

  it('an answer too large to send inline is read back from the consumer sandbox, pruned', async () => {
    vi.stubEnv('COMPOSIO_CONSUMER_API_KEY', 'ck_consumer_secret');
    const posts = { items: [{ code: 'DeuOR', like_count: 12, image_versions2: { candidates: [{ url: 'https://cdn.example/orig.jpg' }] } }] };
    const sent = mcp((req) => {
      if (req.body.params?.name === 'COMPOSIO_REMOTE_WORKBENCH') {
        return { body: { jsonrpc: '2.0', id: req.body.id, result: toolResult({ successful: true, data: { results: '', stdout: `${JSON.stringify(posts)}\n`, stderr: '', error: '' } }) } };
      }
      // As the live endpoint answers a 200,000-token Instagram page: a preview, and the full answer saved in its sandbox.
      return {
        body: {
          jsonrpc: '2.0',
          id: req.body.id,
          result: toolResult({
            successful: true,
            data: {
              results: [{ response: { successful: true, data_preview: { items: ['...12 more items'] } }, tool_slug: 'SCRAPECREATORS_LIST_INSTAGRAM_USER_POSTS', index: 0 }],
              remote_file_info: { message: 'Complete response was large (200783 tokens).', file_path: '/mnt/files/mex/talk.json' },
            },
          }),
        },
      };
    });
    expect(await executeConsumerTool('SCRAPECREATORS_LIST_INSTAGRAM_USER_POSTS', { handle: 'x' })).toEqual(posts);
    const code = sent.find((s) => s.body.params?.name === 'COMPOSIO_REMOTE_WORKBENCH')?.body.params?.arguments?.code_to_execute as string;
    expect(code).toContain('json.load(open("/mnt/files/mex/talk.json"))');
    expect(code).toContain('GROUNDSWELL_JSON_START');
  });

  it('never reads a saved answer from an unexpected place', async () => {
    vi.stubEnv('COMPOSIO_CONSUMER_API_KEY', 'ck_consumer_secret');
    mcp((req) => ({
      body: {
        jsonrpc: '2.0',
        id: req.body.id,
        result: toolResult({ successful: true, data: { results: [{ response: { successful: true, data_preview: {} } }], remote_file_info: { file_path: '/etc/passwd"); import os; os.system("x' } } }),
      },
    }));
    await expect(executeConsumerTool('AHREFS_RETRIEVE_ORGANIC_KEYWORDS', {})).rejects.toThrow(/saved its answer somewhere unexpected/);
  });

  it.each(['/mnt/files/../secret.json', '/mnt/files/mex/./a.json', '/mnt/files/mex/../../secret.json', '/mnt/files//a.json'])(
    'rejects unexpected sandbox path segments before running Workbench: %s', async (path) => {
      vi.stubEnv('COMPOSIO_CONSUMER_API_KEY', 'ck_consumer_secret');
      const sent = mcp((req) => ({ body: { jsonrpc: '2.0', id: req.body.id, result: toolResult({ successful: true, data: { results: [{ response: { successful: true, data_preview: {} } }], remote_file_info: { file_path: path } } }) } }));
      await expect(executeConsumerTool('SCRAPECREATORS_GET_INSTAGRAM_PROFILE', {})).rejects.toThrow(/somewhere unexpected/);
      expect(sent.filter((s) => s.body.params?.name === 'COMPOSIO_REMOTE_WORKBENCH')).toHaveLength(0);
    }
  );

  it.each([false, true])('reads complete marked JSON from %s direct Workbench stdout', async (direct) => {
    vi.stubEnv('COMPOSIO_CONSUMER_API_KEY', 'ck_consumer_secret');
    const stdout = 'Loading file\nGROUNDSWELL_JSON_START\n{"data":{"user":{"follower_count":450}}}\nGROUNDSWELL_JSON_END\nDone';
    mcp((req) => ({ body: { jsonrpc: '2.0', id: req.body.id, result: toolResult(req.body.params?.name === 'COMPOSIO_REMOTE_WORKBENCH' ? (direct ? { stdout, stderr: '', error: '' } : { successful: true, data: { stdout, stderr: '', error: '' } }) : { successful: true, data: { results: [{ response: { successful: true, data_preview: {} } }], remote_file_info: { file_path: '/mnt/files/mex/profile.json' } } }) } }));
    await expect(executeConsumerTool('SCRAPECREATORS_GET_INSTAGRAM_PROFILE', {})).resolves.toEqual({ data: { user: { follower_count: 450 } } });
  });

  it.each(['envelope', 'mcp', 'http'])('pauses subsequent public reads on actionable credit failures from %s', async (surface) => {
    vi.stubEnv('COMPOSIO_CONSUMER_API_KEY', 'ck_consumer_secret');
    vi.useFakeTimers({ toFake: ['Date'] });
    const credit = 'Your Composio wallet is out of credits. Instant tool calls are paused.';
    const sent = mcp((req) => surface === 'http' ? { status: 402, body: { error: credit } } : { body: { jsonrpc: '2.0', id: req.body.id, result: surface === 'mcp' ? { content: [{ type: 'text', text: credit }], isError: true } : toolResult(multi({ successful: false, error: credit })) } });
    await expect(executeConsumerTool('SERPAPI_GOOGLE_LIGHT_SEARCH', {})).rejects.toBeInstanceOf(ProviderCreditError);
    const afterFirst = sent.length;
    forgetConsumerSession();
    await expect(executeTool('GOOGLE_MAPS_TEXT_SEARCH', {})).rejects.toThrow(/Add credits in Composio, then retry/);
    expect(sent).toHaveLength(afterFirst);
    vi.setSystemTime(Date.now() + 30_001);
    await expect(executeConsumerTool('SERPAPI_GOOGLE_LIGHT_SEARCH', {})).rejects.toBeInstanceOf(ProviderCreditError);
    expect(sent.length).toBeGreaterThan(afterFirst);
  });

  it('also pauses when reading a saved answer encounters the wallet failure', async () => {
    vi.stubEnv('COMPOSIO_CONSUMER_API_KEY', 'ck_consumer_secret');
    const sent = mcp((req) => ({ body: { jsonrpc: '2.0', id: req.body.id, result: req.body.params?.name === 'COMPOSIO_REMOTE_WORKBENCH' ? { content: [{ type: 'text', text: 'Composio wallet credits are empty' }], isError: true } : toolResult({ successful: true, data: { results: [{ response: { successful: true, data_preview: {} } }], remote_file_info: { file_path: '/mnt/files/mex/profile.json' } } }) } }));
    await expect(executeConsumerTool('SCRAPECREATORS_GET_INSTAGRAM_PROFILE', {})).rejects.toBeInstanceOf(ProviderCreditError);
    const afterFirst = sent.length;
    await expect(executeConsumerTool('GOOGLE_MAPS_TEXT_SEARCH', {})).rejects.toBeInstanceOf(ProviderCreditError);
    expect(sent).toHaveLength(afterFirst);
  });

  it('preserves a short public-read timeout through session setup and execution', async () => {
    vi.stubEnv('COMPOSIO_CONSUMER_API_KEY', 'ck_consumer_secret');
    const timeouts = vi.spyOn(AbortSignal, 'timeout');
    mcp((req) => ({ body: { jsonrpc: '2.0', id: req.body.id, result: toolResult(multi({ successful: true, data: { places: [] } })) } }));
    await executeTool('GOOGLE_MAPS_TEXT_SEARCH', {}, 1500);
    expect(timeouts.mock.calls.every(([ms]) => ms > 0 && ms <= 1500)).toBe(true);
    timeouts.mockRestore();
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


describe('saved Workbench provider data', () => {
  it.each([
    ['{"items":[{"code":"C1"}]}', { items: [{ code: 'C1' }] }],
    ['[INFO] Loaded profile\n{"items":[]}\nFinished', { items: [] }],
    ['Loaded profile\n{"data":{"user":{"follower_count":450}}}\nFinished', { data: { user: { follower_count: 450 } } }],
    ['Diagnostic\nGROUNDSWELL_JSON_START\n{"items":[]}\nGROUNDSWELL_JSON_END\nFinished', { items: [] }],
    ['Diagnostic\n```json\n{"items":[]}\n```\nFinished', { items: [] }],
  ])('decodes complete payloads with known stdout wrappers: %s', (stdout, want) => {
    expect(decodeWorkbenchJson(stdout)).toEqual(want);
  });

  it.each([
    '{"data":{"user":{"follower_count":450}',
    'Loaded\n{"data":\n{"user":{"follower_count":450}}',
    'GROUNDSWELL_JSON_START\n{"data":{"user":{"follower_count":450}}',
    '```json\n{"data":{"user":{"follower_count":450}}',
    'Diagnostic {"user":{"follower_count":450}}',
    '{"data":\nGROUNDSWELL_JSON_START\n{"user":{"follower_count":450}}\nGROUNDSWELL_JSON_END',
    '{"data":\n```json\n{"user":{"follower_count":450}}\n```',
  ])('rejects truncated or ambiguous output instead of accepting a nested fragment: %s', (stdout) => {
    expect(() => decodeWorkbenchJson(stdout)).toThrow();
  });

  it.each([false, true])('executes the generated pruner on a %s wrapped envelope, bounds stdout and retains nested user figures', (wrapped) => {
    const dir = mkdtempSync(join(tmpdir(), 'groundswell-pruner-'));
    try {
      const path = join(dir, 'profile.json');
      const payload = { data: Object.fromEntries([...Array.from({ length: 100 }, (_, i) => [`noise${i}`, { text: 'x'.repeat(5000), rows: Array.from({ length: 20 }, () => ({ huge: 'y'.repeat(2000) })) }]), ['user', { username: 'wildlyprimal', follower_count: 450, media_count: 80 }], ['x'.repeat(5000), 'y'.repeat(5000)]]) };
      const envelope = { results: [{ response: { successful: true, data: payload } }] };
      writeFileSync(path, JSON.stringify(wrapped ? { successful: true, data: envelope } : envelope));
      const stdout = execFileSync('python3', ['-c', prunerCode(path)], { encoding: 'utf8', maxBuffer: 50_000 });
      expect(Buffer.byteLength(stdout)).toBeLessThanOrEqual(20_000);
      expect(decodeWorkbenchJson(stdout)).toMatchObject({ data: { user: { username: 'wildlyprimal', follower_count: 450, media_count: 80 } } });
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
