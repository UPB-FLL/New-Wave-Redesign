import { PermanentStepError } from './types.js';
import { assertPublicReadBudget, isProviderCreditFailure, pausePublicReadsForCredits } from './providerBudget.js';

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
  error?: { code?: number; message?: string } | string;
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
  chosenAccounts.clear();
};

/**
 * The account each toolkit's calls name, once Composio has asked for one: a
 * toolkit with several linked accounts (SerpApi after a key was replaced,
 * say) refuses a call that names none. Picked once per function instance.
 */
const chosenAccounts = new Map<string, string>();
const MULTIPLE_ACCOUNTS = /multiple (\w+) accounts connected/i;

/** The toolkit's default linked account, else its first active one; null when the list says nothing. */
async function defaultAccount(toolkit: string, timeoutMs: number): Promise<string | null> {
  const raw = (await callConsumerTool('COMPOSIO_MANAGE_CONNECTIONS', { toolkits: [{ name: toolkit, action: 'list' }] }, timeoutMs)) as {
    data?: { results?: Record<string, { accounts?: { id?: string; status?: string; is_default?: boolean }[] }> };
  };
  const accounts = (raw?.data?.results?.[toolkit]?.accounts ?? []).filter((a) => a.id && (a.status ?? 'active').toLowerCase() === 'active');
  return accounts.find((a) => a.is_default)?.id ?? accounts[0]?.id ?? null;
}

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

async function handshake(timeoutMs: number): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  const remaining = (cap: number) => {
    const ms = Math.min(cap, deadline - Date.now());
    if (ms <= 0) throw new Error('Composio session setup exceeded the public-read time limit.');
    return Math.ceil(ms);
  };
  const id = nextId++;
  const { sessionId, message } = await post(
    { jsonrpc: '2.0', id, method: 'initialize', params: { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: 'groundswell', version: '1.0.0' } } },
    null,
    remaining(30_000)
  );
  if (message?.error) throw new Error(`Composio's consumer endpoint refused the handshake: ${describeError(message.error)}`);
  await post({ jsonrpc: '2.0', method: 'notifications/initialized' }, sessionId, remaining(15_000));
  return sessionId;
}

async function sessionId(timeoutMs: number): Promise<string | null> {
  if (!session) {
    session = handshake(timeoutMs);
    session.catch(() => {
      session = null;
    });
  }
  const pending = session;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      pending,
      new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error('Composio session setup exceeded the public-read time limit.')), timeoutMs); }),
    ]);
  } finally { clearTimeout(timer); }
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

/**
 * Calls one tool of the consumer MCP server (a Composio meta tool) and returns
 * its parsed answer. A result flagged as an error is thrown, unless
 * `envelope` is set and the answer is JSON: COMPOSIO_MULTI_EXECUTE_TOOL flags
 * a failed tool that way, and its reason is inside the envelope.
 */
export async function callConsumerTool(name: string, args: Record<string, unknown>, timeoutMs = 90_000, { envelope = false } = {}): Promise<unknown> {
  const deadline = Date.now() + timeoutMs;
  const remaining = () => {
    const ms = deadline - Date.now();
    if (ms <= 0) throw new Error(`${name} exceeded the public-read time limit.`);
    return Math.ceil(ms);
  };
  for (let attempt = 1; ; attempt++) {
    const sid = await sessionId(remaining());
    const id = nextId++;
    try {
      const { message } = await post({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } }, sid, remaining());
      if (!message) throw new Error(`Composio's consumer endpoint gave no answer to ${name}.`);
      if (message.error) throw new Error(`${name} failed: ${describeError(message.error)}`);
      const { payload, isError } = resultPayload(message.result);
      if (isError && !(envelope && payload && typeof payload === 'object')) {
        throw new Error(`${name} failed: ${typeof payload === 'string' ? payload.slice(0, 300) : JSON.stringify(payload).slice(0, 300)}`);
      }
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

/** Where the consumer sandbox keeps an answer too large to return inline. */
const SANDBOX_PATH = /^\/mnt\/files\/[\w./-]+\.json$/;

/**
 * Python for COMPOSIO_REMOTE_WORKBENCH: loads a saved answer and prints it
 * without what the Currents never read (the poster's profile on every post,
 * video renditions, every image size but the original). Structural budgets
 * keep the complete encoded answer and its markers below 20 KB.
 */
export function prunerCode(path: string, index = 0): string {
  return [
    'import json',
    'DROP = {"owner","polaris_ordered_timeline_connection","video_versions","additional_candidates","usertags","tagged_users","biography_with_entities","has_translation","friendship_status","clips_metadata","music_metadata","hd_profile_pic_url_info","profile_pic_genai_tool_info","meta_verified_benefits_info","regulated_news_in_locations","account_badges","bio_links"}',
    'NESTED_DROP = {"user"}',
    'PRIORITY = {"data", "items", "posts", "reels", "edges", "user", "profile", "graphql", "edge_followed_by", "edge_follow", "edge_owner_to_timeline_media", "count", "follower_count", "following_count", "media_count", "followersCount", "followsCount", "postsCount", "username", "full_name", "biography", "external_url", "is_business", "is_private", "code", "shortcode", "caption", "like_count", "comment_count", "play_count", "taken_at", "media_type", "product_type", "display_uri", "display_url", "image_versions2", "candidates", "url"}',
    'def prune(x, budget, depth=0, limit=12):',
    '    if depth > 12 or budget[0] <= 0: return None',
    '    budget[0] -= 1',
    '    if isinstance(x, dict):',
    '        out = {}',
    '        ordered = sorted(x.items(), key=lambda kv: kv[0] not in PRIORITY)',
    '        for k, v in ordered[:max(12, limit * 4)]:',
    '            if len(k) > 128: continue',
    '            if k in DROP and depth > 0: continue',
    '            if k in NESTED_DROP and depth > 1: continue',
    '            if budget[0] <= 0: break',
    '            if k == "candidates" and isinstance(v, list): out[k] = [prune(c, budget, depth + 1, limit) for c in v[:1]]; continue',
    '            out[k] = prune(v, budget, depth + 1, limit)',
    '        return out',
    '    if isinstance(x, list): return [prune(v, budget, depth + 1, limit) for v in x[:limit] if budget[0] > 0]',
    '    if isinstance(x, str) and len(x) > limit * 100: return x[:limit * 100]',
    '    return x',
    `f = json.load(open(${JSON.stringify(path)}))`,
    `payload = f.get("data", f).get("results", [])[${index}]["response"]["data"]`,
    'for limit in [12, 6, 3, 1]:',
    '    encoded = json.dumps(prune(payload, [max(80, limit * 200)], limit=limit), ensure_ascii=True, separators=(",", ":"), allow_nan=False)',
    '    if len(encoded) <= 19000: break',
    'else: raise ValueError("Saved provider data could not fit within the output budget")',
    'print("GROUNDSWELL_JSON_START\\n" + encoded + "\\nGROUNDSWELL_JSON_END")',
  ].join('\n');
}

/** Workbench may surround stdout with diagnostics; only complete JSON is accepted. */
export function decodeWorkbenchJson(stdout: string): unknown {
  const text = stdout.trim();
  if (text.length > 250_000) throw new Error('The saved provider answer exceeded the output budget.');
  try { return JSON.parse(text); } catch { /* Try the delimited data below. */ }
  const candidate = /^[ \t]*(?:\{|\[(?!(?:INFO|WARN|WARNING|DEBUG|ERROR|TRACE)\](?:[ \t]|$)))/m.exec(text);
  const markerStart = /^GROUNDSWELL_JSON_START[ \t]*\r?$/m.exec(text);
  if (markerStart) {
    if (candidate && candidate.index < markerStart.index) throw new Error('The saved provider answer contained an incomplete outer JSON response.');
    const marker = text.match(/^GROUNDSWELL_JSON_START[ \t]*\r?\n([\s\S]*?)\r?\nGROUNDSWELL_JSON_END[ \t]*(?:\r?\n|$)/m);
    if (!marker) throw new Error('The saved provider answer has incomplete JSON markers.');
    return JSON.parse(marker[1]);
  }
  const fenceStart = /^```(?:json)?[ \t]*\r?$/m.exec(text);
  if (fenceStart) {
    if (candidate && candidate.index < fenceStart.index) throw new Error('The saved provider answer contained an incomplete outer JSON response.');
    const fenced = text.match(/^```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*(?:\r?\n|$)/m);
    if (!fenced) throw new Error('The saved provider answer has an incomplete JSON fence.');
    return JSON.parse(fenced[1]);
  }
  // Inspect only the first root on its own line. Never retry inside a
  // truncated object: a valid nested fragment is not a complete response.
  if (!candidate) throw new Error('The saved provider answer did not contain complete JSON.');
  const start = candidate.index + candidate[0].length - 1;
  const stack: string[] = [];
  let quoted = false, escaped = false;
  for (let end = start; end < text.length; end += 1) {
    const character = text[end];
    if (quoted) { if (escaped) escaped = false; else if (character === '\\') escaped = true; else if (character === '"') quoted = false; continue; }
    if (character === '"') quoted = true;
    else if (character === '{' || character === '[') stack.push(character);
    else if (character === '}' || character === ']') {
      if (stack.pop() !== (character === '}' ? '{' : '[')) break;
      if (!stack.length) {
        const trailing = text.slice(end + 1);
        if (/^[^\r\n]*\S/.test(trailing) || /^[ \t]*(?:\{|\[)/m.test(trailing)) break;
        return JSON.parse(text.slice(start, end + 1));
      }
    }
  }
  throw new Error('The saved provider answer did not contain complete JSON.');
}

/** Reads an answer the endpoint cut to a preview back from the consumer sandbox, pruned to what the Currents read. */
async function readSaved(path: string, slug: string, timeoutMs: number): Promise<unknown> {
  if (!SANDBOX_PATH.test(path) || path.split('/').slice(1).some(part => !part || part === '..' || part === '.')) throw new Error(`${slug}: the consumer endpoint saved its answer somewhere unexpected.`);
  const out = (await callConsumerTool(
    'COMPOSIO_REMOTE_WORKBENCH',
    { code_to_execute: prunerCode(path), thought: 'Groundswell reads a large answer back, pruned.', current_step: 'GROUNDSWELL_READ_LARGE' },
    timeoutMs
  )) as { data?: unknown; stdout?: unknown; error?: unknown; stderr?: unknown; successful?: boolean };
  let result = out;
  for (let depth = 0; depth < 4 && typeof result?.stdout !== 'string' && result?.data && typeof result.data === 'object'; depth += 1) {
    if (result.error || result.successful === false) throw new Error(`${slug}: the saved provider answer could not be read back (${describeError(result.error)}).`);
    result = result.data as typeof out;
  }
  const stdout = typeof result?.stdout === 'string' ? result.stdout : '';
  if (result?.error || result?.successful === false || !stdout.trim()) throw new Error(`${slug}: the large answer could not be read back (${describeError(result?.error || result?.stderr || 'no output')}).`);
  try {
    return decodeWorkbenchJson(stdout);
  } catch {
    throw new Error(`${slug}: the large answer came back unreadable.`);
  }
}

/**
 * Runs one Composio tool through the consumer account and returns its `data`,
 * like executeTool does through the project. COMPOSIO_MULTI_EXECUTE_TOOL wraps
 * each answer: `{ data: { results: [{ response: { successful, data, error } }] } }`.
 */
export async function executeConsumerTool(slug: string, args: Record<string, unknown>, timeoutMs = 90_000): Promise<unknown> {
  assertPublicReadBudget(slug);
  const deadline = Date.now() + timeoutMs;
  type Envelope = {
    successful?: boolean;
    data?: {
      results?: { response?: { successful?: boolean; data?: unknown; data_preview?: unknown; error?: unknown }; error?: unknown }[];
      remote_file_info?: { file_path?: string };
    };
    error?: unknown;
  };
  const run = (account: string | undefined) =>
    callConsumerTool(
      'COMPOSIO_MULTI_EXECUTE_TOOL',
      {
        tools: [{ tool_slug: slug, arguments: args, ...(account ? { account } : {}) }],
        sync_response_to_workbench: false,
        thought: 'Groundswell reads public data for a marketing audit.',
        current_step: 'GROUNDSWELL_READ',
      },
      Math.max(1, deadline - Date.now()),
      { envelope: true }
    ).catch((err: unknown) => {
      const why = err instanceof Error ? err.message : String(err);
      if (isProviderCreditFailure(why)) pausePublicReadsForCredits(why, slug);
      throw err;
    }) as Promise<Envelope>;
  const failure = (raw: Envelope) => {
    const item = raw?.data?.results?.[0];
    return describeError(item?.response?.error ?? item?.error ?? raw?.error);
  };
  const toolkitOf = (why: string) => MULTIPLE_ACCOUNTS.exec(why)?.[1]?.toLowerCase() ?? null;
  const known = [...chosenAccounts.entries()].find(([toolkit]) => slug.toLowerCase().startsWith(`${toolkit.replace(/_/g, '')}_`) || slug.toLowerCase().startsWith(`${toolkit}_`));
  let raw = await run(known?.[1]);
  // Several accounts on the toolkit and none named: choose its default once and run again.
  const several = toolkitOf(failure(raw));
  if (several && !known) {
    const account = await defaultAccount(several, Math.max(1, deadline - Date.now())).catch(() => null);
    if (account) {
      chosenAccounts.set(several, account);
      raw = await run(account);
    }
  }
  const item = raw?.data?.results?.[0];
  const response = item?.response;
  const why = failure(raw);
  if (isProviderCreditFailure(why)) pausePublicReadsForCredits(why, slug);
  if (!response || response.successful === false || (raw?.successful === false && response.data === undefined && response.data_preview === undefined)) {
    if (NO_CONNECTION.test(why)) {
      throw new PermanentStepError(`Composio's consumer account has no active connection for ${slug.split('_')[0].toLowerCase()}: ${why}`);
    }
    throw new Error(`${slug} failed (consumer account): ${why}`);
  }
  if (response.data !== undefined) return response.data;
  // Too large to return inline: the endpoint sent a preview and saved the answer in the consumer sandbox.
  const path = raw?.data?.remote_file_info?.file_path;
  if (!path) throw new Error(`${slug}: the consumer endpoint sent only a preview of its answer.`);
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new Error(`${slug}: no time remained to read the saved provider answer.`);
  return readSaved(path, slug, remaining).catch((err: unknown) => {
    const why = err instanceof Error ? err.message : String(err);
    if (isProviderCreditFailure(why)) pausePublicReadsForCredits(why, slug);
    throw err;
  });
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
