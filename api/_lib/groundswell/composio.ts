import { createHash } from 'node:crypto';
import { PermanentStepError } from './types.js';

/**
 * Composio REST client (v3.1) for Groundswell's Currents: Ahrefs, Google Ads,
 * ScrapeCreators and Google Drive, all through the connections in New Wave's
 * own Composio Platform project.
 *
 * - COMPOSIO_API_KEY: that project's API key (`ak_…`), sent as `x-api-key`.
 * - COMPOSIO_USER_ID: the user id the connections were made under (default "groundswell").
 *
 * Connections made through Composio's MCP in Claude live in a separate consumer
 * project that this key cannot reach; they have to be connected again in the
 * Platform project.
 */

const BASE = (process.env.COMPOSIO_BASE_URL || 'https://backend.composio.dev/api/v3.1').replace(/\/+$/, '');

export function isComposioConfigured(): boolean {
  return Boolean(process.env.COMPOSIO_API_KEY);
}

function apiKey(): string {
  const key = process.env.COMPOSIO_API_KEY;
  if (!key) throw new PermanentStepError('Composio is not set up: COMPOSIO_API_KEY is missing in Vercel.');
  return key;
}

const userId = () => process.env.COMPOSIO_USER_ID || 'groundswell';

interface ExecuteResponse {
  data?: unknown;
  successful?: boolean;
  error?: unknown;
}

function describeError(err: unknown): string {
  if (!err) return 'unknown error';
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && err && 'message' in err) return String((err as { message: unknown }).message);
  return JSON.stringify(err).slice(0, 300);
}

/** Runs one Composio tool and returns its `data`. */
export async function executeTool(slug: string, args: Record<string, unknown>, timeoutMs = 60_000): Promise<unknown> {
  const response = await fetch(`${BASE}/tools/execute/${encodeURIComponent(slug)}`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ arguments: args, user_id: userId(), version: 'latest' }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = (await response.json().catch(() => ({}))) as ExecuteResponse;
  const why = describeError(body.error);
  if (response.status === 401 || response.status === 403) {
    throw new PermanentStepError(`Composio refused the API key (${response.status}).`);
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
