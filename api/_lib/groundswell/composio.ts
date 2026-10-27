import { createHash } from 'node:crypto';
import { executeConsumerTool, isConsumerConfigured } from './composioConsumer.js';
import { PermanentStepError } from './types.js';
import { assertPublicReadBudget, isProviderCreditFailure, pausePublicReadsForCredits } from './providerBudget.js';

/**
 * Composio REST client (v3.1) for Groundswell's Currents: Ahrefs, Google Ads,
 * ScrapeCreators and Google Drive, all through the connections in New Wave's
 * own Composio Platform project.
 *
 * - COMPOSIO_API_KEY: that project's API key (`ak_…`), sent as `x-api-key`.
 * - The Composio user id is fixed (COMPOSIO_USER_ID below; no environment
 *   variable overrides it). Before each call the client lists the project's
 *   active connections for the tool's toolkit and names one
 *   (`connected_account_id`), preferring that user id and otherwise the
 *   newest.
 *
 * Connections made through Composio's MCP in Claude live in Composio's consumer
 * account, which this key cannot reach. When COMPOSIO_CONSUMER_API_KEY is set,
 * the shared lookups (executeTool: a business's public data, phases 1 and 2)
 * run there instead (composioConsumer.ts); a client's own accounts
 * (executeToolAs, phase 3) always run in the project.
 */

const BASE = (process.env.COMPOSIO_BASE_URL || 'https://backend.composio.dev/api/v3.1').replace(/\/+$/, '');

/** The Platform project is set up: a client's linked accounts (and the shared lookups when there is no consumer key). */
export function isComposioConfigured(): boolean {
  return Boolean(process.env.COMPOSIO_API_KEY);
}

/** A business's public data can be read: through the consumer account, or the project when there is none. */
export const isSharedLookupConfigured = (): boolean => isConsumerConfigured() || isComposioConfigured();

/** Where the shared lookups run, for the readiness checks and the overview. */
export const sharedLookupSource = (): 'consumer' | 'project' | null => (isConsumerConfigured() ? 'consumer' : isComposioConfigured() ? 'project' : null);

function apiKey(): string {
  const key = process.env.COMPOSIO_API_KEY;
  if (!key) throw new PermanentStepError('Composio is not set up: COMPOSIO_API_KEY is missing in Vercel.');
  return key;
}

/** The user id New Wave's Composio project tags its connections with (the owner's choice). */
export const COMPOSIO_USER_ID = 'pg-test-0ff14d6b-e58a-45f1-a053-db132130d54f';
const userId = () => COMPOSIO_USER_ID;

interface ExecuteResponse {
  data?: unknown;
  successful?: boolean;
  error?: unknown;
}

function describeError(err: unknown): string {
  if (!err) return 'unknown error';
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && err && 'message' in err) {
    const { message, suggested_fix } = err as { message: unknown; suggested_fix?: unknown };
    return typeof suggested_fix === 'string' && suggested_fix ? `${String(message)} ${suggested_fix}` : String(message);
  }
  return JSON.stringify(err).slice(0, 300);
}

/** What was sent, without the key itself: its length and whether it looks like a project key. */
export function keyShape(key: string): string {
  const trimmed = key.trim();
  const note = trimmed.length !== key.length ? ', with surrounding whitespace' : '';
  return `${key.length} characters, ${trimmed.startsWith('ak_') ? 'starts with ak_' : 'does not start with ak_'}${note}`;
}

/** Toolkits whose slug carries an underscore, so the tool slug's prefix is read against them first. */
const TOOLKITS = ['google_maps', 'google_analytics', 'google_search_console', 'ahrefs_mcp', 'fal_ai'];

/** The toolkit a tool slug belongs to: `GOOGLE_MAPS_TEXT_SEARCH` → `google_maps`, `AHREFS_…` → `ahrefs`, `AHREFS_MCP_…` → `ahrefs_mcp`. */
export function toolkitOf(slug: string): string {
  const upper = slug.toUpperCase();
  return TOOLKITS.find((t) => upper.startsWith(`${t.toUpperCase()}_`)) ?? slug.split('_')[0].toLowerCase();
}

interface ConnectedAccount {
  id: string;
  status?: string;
  user_id?: string;
  created_at?: string;
  toolkit?: { slug?: string };
}

/**
 * A client's own accounts (api/groundswell/partner-accounts.ts) are tagged
 * `client:<customer id>`, so the shared lookups below never pick one for a
 * prospect's scrape, and a client's run finds its own by that id.
 */
export const CLIENT_USER_PREFIX = 'client:';
export const clientUserId = (customerId: string) => `${CLIENT_USER_PREFIX}${customerId}`;
const isClientAccount = (a: ConnectedAccount) => (a.user_id ?? '').startsWith(CLIENT_USER_PREFIX);

async function composioJson<T>(path: string, init: RequestInit = {}, timeoutMs = 30_000): Promise<{ status: number; ok: boolean; body: T & ExecuteResponse }> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'x-api-key': apiKey(), 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = (await response.json().catch(() => ({}))) as T & ExecuteResponse;
  if (response.status === 401 || response.status === 403) {
    throw new PermanentStepError(`Composio refused the API key (${response.status}): ${describeError(body.error).replace(/\.?$/, '.')} COMPOSIO_API_KEY as read: ${keyShape(apiKey())}.`);
  }
  return { status: response.status, ok: response.ok, body };
}

/** Every active connection in the project for a toolkit (all user ids). */
async function listActive(toolkit: string, userId?: string, timeoutMs = 30_000): Promise<ConnectedAccount[]> {
  const query = `toolkit_slugs=${encodeURIComponent(toolkit)}&statuses=ACTIVE&limit=50${userId ? `&user_ids=${encodeURIComponent(userId)}` : ''}`;
  const { status, ok, body } = await composioJson<{ items?: ConnectedAccount[] }>(`/connected_accounts?${query}`, {}, timeoutMs);
  if (!ok) throw new Error(`Composio could not list the ${toolkit} connections (${status}).`);
  return (body.items ?? []).filter((a) => a.id && (a.status ?? 'ACTIVE') === 'ACTIVE' && (a.toolkit?.slug ?? toolkit) === toolkit && (!userId || a.user_id === userId));
}

export interface AuthConfig {
  id: string;
  status?: string;
  toolkit?: { slug?: string };
  is_composio_managed?: boolean;
  auth_scheme?: string;
}

/** The project's enabled auth config for a toolkit (what a client signs in through), or null when the project has none. */
export async function authConfigFor(toolkit: string): Promise<AuthConfig | null> {
  const { status, ok, body } = await composioJson<{ items?: AuthConfig[] }>(`/auth_configs?toolkit_slug=${encodeURIComponent(toolkit)}&limit=50`);
  if (!ok) throw new Error(`Composio could not list the ${toolkit} auth configs (${status}).`);
  const enabled = (body.items ?? []).filter((c) => c.id && (c.status ?? 'ENABLED') === 'ENABLED' && (c.toolkit?.slug ?? toolkit) === toolkit);
  return enabled.find((c) => c.is_composio_managed) ?? enabled[0] ?? null;
}

export interface ConnectionLink {
  redirect_url: string;
  connected_account_id: string;
  expires_at?: string;
}

/** Starts Composio's hosted connect flow: the user signs in at `redirect_url`, and the account lands under `userId`. */
export async function createConnectionLink(authConfigId: string, userId: string, callbackUrl: string): Promise<ConnectionLink> {
  const { status, ok, body } = await composioJson<ConnectionLink>('/connected_accounts/link', {
    method: 'POST',
    body: JSON.stringify({ auth_config_id: authConfigId, user_id: userId, callback_url: callbackUrl }),
  });
  if (!ok || !body.redirect_url || !body.connected_account_id) {
    throw new Error(`Composio could not start the connection (${status}): ${describeError(body.error)}`);
  }
  return { redirect_url: body.redirect_url, connected_account_id: body.connected_account_id, expires_at: body.expires_at };
}

export interface ConnectedAccountState {
  id: string;
  status: string;
  status_reason: string | null;
  is_disabled: boolean;
}

/** One connected account's state; null when Composio no longer has it. */
export async function getConnectedAccount(id: string): Promise<ConnectedAccountState | null> {
  const { status, ok, body } = await composioJson<{ id?: string; status?: string; status_reason?: string | null; is_disabled?: boolean }>(`/connected_accounts/${encodeURIComponent(id)}`);
  if (status === 404) return null;
  if (!ok) throw new Error(`Composio could not read the connection (${status}): ${describeError(body.error)}`);
  return { id: body.id ?? id, status: body.status ?? 'INITIATED', status_reason: body.status_reason ?? null, is_disabled: Boolean(body.is_disabled) };
}

/** Removes a connected account from the project, revoking it at the provider; a missing account counts as removed. */
export async function deleteConnectedAccount(id: string): Promise<void> {
  const { status, ok, body } = await composioJson<unknown>(`/connected_accounts/${encodeURIComponent(id)}?revoke_on_delete=true`, { method: 'DELETE' });
  if (!ok && status !== 404) throw new Error(`Composio could not remove the connection (${status}): ${describeError(body.error)}`);
}

/** A client's own active connection for a toolkit (tagged with its user id), or null. */
export async function clientConnection(customerId: string, toolkit: string): Promise<ConnectedAccount | null> {
  const mine = await listActive(toolkit, clientUserId(customerId));
  mine.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
  return mine[0] ?? null;
}

/** The connection to use for each toolkit, looked up once per function instance; `null` means none is active. */
const connections = new Map<string, Promise<ConnectedAccount | null>>();
export const forgetConnections = () => connections.clear();

/**
 * Lists the project's active connections for a toolkit and picks the shared
 * one: the preferred user id's, else the newest. A client's own account
 * (`client:` user id) is never picked here.
 */
async function lookupConnection(toolkit: string, timeoutMs = 30_000): Promise<ConnectedAccount | null> {
  const active = (await listActive(toolkit, undefined, timeoutMs)).filter((a) => !isClientAccount(a));
  const preferred = active.filter((a) => a.user_id === userId());
  const pool = preferred.length ? preferred : active;
  pool.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
  return pool[0] ?? null;
}

/** The project's active connection for a toolkit, asked for afresh (the readiness checks); null when none. */
export const activeConnection = (toolkit: string): Promise<ConnectedAccount | null> => lookupConnection(toolkit);

/** The connected account a tool runs as, cached per toolkit; a failed lookup is not cached. */
export async function connectionFor(slug: string, timeoutMs = 30_000): Promise<ConnectedAccount | null> {
  const toolkit = toolkitOf(slug);
  let pending = connections.get(toolkit);
  if (!pending) {
    pending = lookupConnection(toolkit, Math.min(timeoutMs, 30_000));
    connections.set(toolkit, pending);
    const current = pending;
    pending.catch(() => { if (connections.get(toolkit) === current) connections.delete(toolkit); });
  }
  // A cached lookup may belong to a worker with a longer budget than intake.
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([pending, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Composio connection lookup timed out.')), timeoutMs);
    })]);
  } finally { clearTimeout(timer); }
}

/**
 * Runs one Composio tool for a business's public data and returns its `data`:
 * through the consumer account when COMPOSIO_CONSUMER_API_KEY is set, else as
 * the project's shared connection for its toolkit.
 */
export async function executeTool(slug: string, args: Record<string, unknown>, timeoutMs = 90_000): Promise<unknown> {
  assertPublicReadBudget(slug);
  if (timeoutMs <= 0) throw new Error('Composio public lookup timed out.');
  if (isConsumerConfigured()) return executeConsumerTool(slug, args, timeoutMs);
  const deadline = Date.now() + timeoutMs;
  const account = await connectionFor(slug, timeoutMs);
  if (!account) {
    throw new PermanentStepError(`Composio has no active connection for ${toolkitOf(slug)} in this project (any user id). Connect it under Auth Configs in the Composio project COMPOSIO_API_KEY belongs to.`);
  }
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new Error('Composio public lookup timed out.');
  try { return await executeToolAs(slug, args, account, remaining); }
  catch (err) {
    const why = err instanceof Error ? err.message : String(err);
    if (isProviderCreditFailure(why)) pausePublicReadsForCredits(why, slug);
    throw err;
  }
}

/**
 * Runs one Composio tool as a named connected account (a client's own,
 * api/_lib/groundswell/currents/linked.ts) and returns its `data`. The
 * shared lookup is never consulted, so a client's read can never land on New
 * Wave's connection by mistake.
 */
export async function executeToolAs(slug: string, args: Record<string, unknown>, account: { id: string; user_id?: string }, timeoutMs = 60_000): Promise<unknown> {
  const response = await fetch(`${BASE}/tools/execute/${encodeURIComponent(slug)}`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ arguments: args, connected_account_id: account.id, user_id: account.user_id ?? userId(), version: 'latest' }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = (await response.json().catch(() => ({}))) as ExecuteResponse;
  const why = describeError(body.error);
  if (response.status === 401 || response.status === 403) {
    // Composio's own reason (an unknown key, a key without tool-execution rights) and the key's shape, never the key.
    throw new PermanentStepError(`Composio refused the API key (${response.status}): ${why.replace(/\.?$/, ".")} COMPOSIO_API_KEY as read: ${keyShape(apiKey())}.`);
  }
  if (!response.ok || body.successful === false) {
    if (/no (active )?connect|connected account|not connected/i.test(why)) {
      throw new PermanentStepError(`Composio has no active connection for ${slug.split('_')[0].toLowerCase()}: ${why}`);
    }
    throw new Error(`${slug} failed (${response.status}): ${why}`);
  }
  return body.data;
}

/**
 * Stages a file for a Composio tool's file input (e.g. GOOGLEDRIVE_UPLOAD_FILE):
 * asks for a presigned URL, PUTs the bytes, and returns the key the tool takes as `s3key`.
 */
export async function stageFile(
  toolkitSlug: string,
  toolSlug: string,
  filename: string,
  mimetype: string,
  bytes: Uint8Array
): Promise<string> {
  const md5 = createHash('md5').update(bytes).digest('hex');
  const request = await fetch(`${BASE}/files/upload/request`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ toolkit_slug: toolkitSlug, tool_slug: toolSlug, filename, mimetype, md5 }),
    signal: AbortSignal.timeout(30_000),
  });
  const staged = (await request.json().catch(() => ({}))) as {
    key?: string;
    new_presigned_url?: string;
    metadata?: { storage_backend?: string };
    error?: unknown;
  };
  if (!request.ok || !staged.key || !staged.new_presigned_url) {
    throw new Error(`Composio file staging failed (${request.status}): ${describeError(staged.error)}`);
  }
  const headers: Record<string, string> = { 'Content-Type': mimetype };
  if (staged.metadata?.storage_backend === 'azure_blob_storage') headers['x-ms-blob-type'] = 'BlockBlob';
  const put = await fetch(staged.new_presigned_url, {
    method: 'PUT',
    headers,
    body: bytes,
    signal: AbortSignal.timeout(60_000),
  });
  if (!put.ok) throw new Error(`Uploading ${filename} to Composio storage failed (${put.status}).`);
  return staged.key;
}

/**
 * Tool responses nest the provider's payload at varying depths
 * (`data`, `data.data`, `response_data`). Returns the first object that has `key`.
 */
export function findKey<T = unknown>(value: unknown, key: string, depth = 0): T | undefined {
  if (!value || typeof value !== 'object' || depth > 6) return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const hit = findKey<T>(item, key, depth + 1);
      if (hit !== undefined) return hit;
    }
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (key in record && record[key] !== undefined && record[key] !== null) return record[key] as T;
  for (const child of Object.values(record)) {
    const hit = findKey<T>(child, key, depth + 1);
    if (hit !== undefined) return hit;
  }
  return undefined;
}
