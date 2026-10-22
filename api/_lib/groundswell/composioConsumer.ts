import { PermanentStepError } from './types.js';

/**
 * Composio's consumer account (Composio "For You" / Connect), reached through
 * its MCP endpoint: the same tools and linked accounts New Wave uses from
 * Composio's MCP in Claude, outside any Platform project. Groundswell reads a
 * business's public data here in phases 1 and 2 (the audit, and the plan
 * against competitors): Ahrefs, Keyword Planner, Google Places, ScrapeCreators
 * and Apify. Phase 3 reads a client's own accounts in the Platform project
 * (composio.ts, executeToolAs), never here.
 *
 * - COMPOSIO_CONSUMER_API_KEY: the consumer key (`ck_…`) from Composio's For
 *   You dashboard ("Your API Key"), sent as `x-consumer-api-key`.
 * - COMPOSIO_CONSUMER_MCP_URL: optional; defaults to Connect's endpoint.
 *
 * The protocol is MCP's streamable HTTP: an `initialize` handshake (the
 * server may answer with an `mcp-session-id` to send back), then
 * `tools/call` of COMPOSIO_MULTI_EXECUTE_TOOL with one tool per call. The
 * server answers in JSON or as an event stream; both are read.
 */

const DEFAULT_URL = 'https://connect.composio.dev/mcp';
const PROTOCOL_VERSION = '2025-06-18';

export const isConsumerConfigured = (): boolean => Boolean(process.env.COMPOSIO_CONSUMER_API_KEY?.trim());

const endpoint = () => (process.env.COMPOSIO_CONSUMER_MCP_URL || DEFAULT_URL).trim();

function consumerKey(): string {
  const key = process.env.COMPOSIO_CONSUMER_API_KEY?.trim();
  if (!key) throw new PermanentStepError('Composio\'s consumer account is not set up: COMPOSIO_CONSUMER_API_KEY is missing in Vercel.');
  return key;
}

/** What was sent, without the key itself: its length and whether it looks like a consumer key. */
export function consumerKeyShape(key: string): string {
  const trimmed = key.trim();
  const note = trimmed.length !== key.length ? ', with surrounding whitespace' : '';
  const prefix = trimmed.startsWith('ck_') ? 'starts with ck_' : trimmed.startsWith('ak_') ? 'starts with ak_ (a Platform project key, not a consumer key)' : 'does not start with ck_';
  return `${key.length} characters, ${prefix}${note}`;
}

interface RpcMessage {
  jsonrpc?: string;
  id?: number | string | null;
  result?: unknown;
  error?: { code?: number; message?: string };
}

/** The JSON-RPC message answering `id` in an event-stream body (`data:` lines, events split by a blank line). */
export function messageFromStream(text: string, id: number): RpcMessage | null {
  for (const event of text.split(/\r?\n\r?\n/)) {
    const data = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');
    if (!data) continue;
    try {
      const msg = JSON.parse(data) as RpcMessage | RpcMessage[];
      for (const m of Array.isArray(msg) ? msg : [msg]) if (m && m.id === id) return m;
    } catch {
      // A keep-alive or a partial line; the answer is in another event.
    }
  }
  return null;
}

class SessionExpired extends Error {}

let nextId = 1;
/** The handshake's session id, once per function instance; `null` when the server keeps no sessions. */
let session: Promise<string | null> | null = null;
export const forgetConsumerSession = () => {
  session = null;
};

async function post(body: Record<string, unknown>, sessionId: string | null, timeoutMs: number): Promise<{ status: number; sessionId: string | null; message: RpcMessage | null }> {
  const key = consumerKey();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'x-consumer-api-key': key,
    'MCP-Protocol-Version': PROTOCOL_VERSION,
  };
  if (sessionId) headers['mcp-session-id'] = sessionId;
  const response = await fetch(endpoint(), { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
  const text = await response.text().catch(() => '');
  if (response.status === 401 || response.status === 403) {
    let why = text.slice(0, 200);
    try {
      const parsed = JSON.parse(text) as { error?: unknown };
      why = typeof parsed.error === 'string' ? parsed.error : (parsed.error as { message?: string })?.message ?? why;
    } catch {
      // Not JSON: the text itself is the reason.
    }
    throw new PermanentStepError(
      `Composio refused the consumer API key (${response.status}): ${why.trim() || 'no reason given'}. COMPOSIO_CONSUMER_API_KEY as read: ${consumerKeyShape(key)}.`
    );
  }
  if (response.status === 404 && sessionId) throw new SessionExpired();
  const returned = response.headers?.get?.('mcp-session-id') ?? null;
  if (typeof body.id !== 'number') return { status: response.status, sessionId: returned, message: null };
  const type = response.headers?.get?.('content-type') ?? '';
  let message: RpcMessage | null = null;
  if (/text\/event-stream/i.test(type)) message = messageFromStream(text, body.id);
  else if (text) {
    try {
      const parsed = JSON.parse(text) as RpcMessage | RpcMessage[];
      message = Array.isArray(parsed) ? parsed.find((m) => m.id === body.id) ?? null : parsed;
    } catch {
      message = messageFromStream(text, body.id);
    }
  }
  if (!response.ok && !message) throw new Error(`Composio's consumer endpoint answered ${response.status}: ${text.slice(0, 200)}`);
  return { status: response.status, sessionId: returned, message };
}

async function handshake(): Promise<string | null> {
  const id = nextId++;
  const { sessionId, message } = await post(
    { jsonrpc: '2.0', id, method: 'initialize', params: { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: 'groundswell', version: '1.0.0' } } },
    null,
    30_000
  );
  if (message?.error) throw new Error(`Composio's consumer endpoint refused the handshake: ${message.error.message ?? 'no reason given'}`);
  await post({ jsonrpc: '2.0', method: 'notifications/initialized' }, sessionId, 15_000);
  return sessionId;
}

function sessionId(): Promise<string | null> {
  if (!session) {
    session = handshake();
    session.catch(() => {
      session = null;
    });
  }
  return session;
}

/** The text of a tools/call result: `structuredContent` when given, else its text parts. */
function resultPayload(result: unknown): { payload: unknown; isError: boolean } {
  const r = (result ?? {}) as { content?: { type?: string; text?: string }[]; structuredContent?: unknown; isError?: boolean };
  if (r.structuredContent !== undefined && r.structuredContent !== null) return { payload: r.structuredContent, isError: Boolean(r.isError) };
  const text = (r.content ?? [])
    .filter((c) => c?.type === 'text' && typeof c.text === 'string')
    .map((c) => c.text)
    .join('');
  try {
    return { payload: JSON.parse(text), isError: Boolean(r.isError) };
  } catch {
    return { payload: text, isError: Boolean(r.isError) };
  }
}

/** Calls one tool of the consumer MCP server (a Composio meta tool) and returns its parsed answer. */
export async function callConsumerTool(name: string, args: Record<string, unknown>, timeoutMs = 90_000): Promise<unknown> {
  for (let attempt = 1; ; attempt++) {
    const sid = await sessionId();
    const id = nextId++;
    try {
      const { message } = await post({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } }, sid, timeoutMs);
      if (!message) throw new Error(`Composio's consumer endpoint gave no answer to ${name}.`);
      if (message.error) throw new Error(`${name} failed: ${message.error.message ?? `error ${message.error.code ?? ''}`}`);
      const { payload, isError } = resultPayload(message.result);
      if (isError) throw new Error(`${name} failed: ${typeof payload === 'string' ? payload.slice(0, 300) : JSON.stringify(payload).slice(0, 300)}`);
      return payload;
    } catch (err) {
      // A session the server forgot (a redeploy on its side): shake hands again, once.
      if (err instanceof SessionExpired && attempt === 1) {
        forgetConsumerSession();
        continue;
      }
      if (err instanceof SessionExpired) throw new Error('Composio\'s consumer endpoint keeps dropping the session.');
      throw err;
    }
  }
}

const describeError = (err: unknown): string => {
  if (!err) return 'unknown error';
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && 'message' in (err as object)) return String((err as { message: unknown }).message);
  return JSON.stringify(err).slice(0, 300);
};

const NO_CONNECTION = /no (active )?connect|not connected|connection (is )?required|connect (an|the) account|initiate a (new )?connection/i;

/**
 * Runs one Composio tool through the consumer account and returns its `data`,
 * like executeTool does through the project. COMPOSIO_MULTI_EXECUTE_TOOL wraps
 * each answer: `{ data: { results: [{ response: { successful, data, error } }] } }`.
 */
export async function executeConsumerTool(slug: string, args: Record<string, unknown>, timeoutMs = 90_000): Promise<unknown> {
  const raw = (await callConsumerTool(
    'COMPOSIO_MULTI_EXECUTE_TOOL',
    {
      tools: [{ tool_slug: slug, arguments: args }],
      sync_response_to_workbench: false,
      thought: 'Groundswell reads public data for a marketing audit.',
      current_step: 'GROUNDSWELL_READ',
    },
    timeoutMs
  )) as { successful?: boolean; data?: { results?: { response?: { successful?: boolean; data?: unknown; error?: unknown }; error?: unknown }[] }; error?: unknown };
  const item = raw?.data?.results?.[0];
  const response = item?.response;
  const why = describeError(response?.error ?? item?.error ?? raw?.error);
  if (!response || response.successful === false || (raw?.successful === false && !response.data)) {
    if (NO_CONNECTION.test(why)) {
      throw new PermanentStepError(`Composio's consumer account has no active connection for ${slug.split('_')[0].toLowerCase()}: ${why}`);
    }
    throw new Error(`${slug} failed (consumer account): ${why}`);
  }
  return response.data;
}

export interface ConsumerToolkitState {
  toolkit: string;
  /** active: an account is linked; instant: Composio's instant account answers (billed per call); missing: nothing linked. */
  state: 'active' | 'instant' | 'missing';
  accounts: number;
}

/**
 * Which toolkits the consumer account can run, for the readiness checks:
 * COMPOSIO_MANAGE_CONNECTIONS with `list` (no side effects). Toolkits served
 * by Composio's instant account (Ahrefs) list no account of their own.
 */
export async function consumerConnections(toolkits: string[], instant: string[] = []): Promise<ConsumerToolkitState[]> {
  const raw = (await callConsumerTool('COMPOSIO_MANAGE_CONNECTIONS', { toolkits: toolkits.map((name) => ({ name, action: 'list' })) }, 30_000)) as {
    data?: { results?: Record<string, { status?: string; accounts?: { status?: string }[] }> };
  };
  const results = raw?.data?.results ?? {};
  return toolkits.map((toolkit) => {
    const r = results[toolkit];
    const active = (r?.accounts ?? []).filter((a) => (a.status ?? 'active').toLowerCase() === 'active').length;
    const state: ConsumerToolkitState['state'] = active || r?.status === 'active' ? 'active' : instant.includes(toolkit) ? 'instant' : 'missing';
    return { toolkit, state, accounts: active };
  });
}
