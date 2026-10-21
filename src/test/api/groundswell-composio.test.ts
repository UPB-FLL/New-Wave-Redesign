import { afterEach, describe, expect, it, vi } from 'vitest';
import { executeTool, keyShape } from '../../../api/_lib/groundswell/composio';
import { PermanentStepError } from '../../../api/_lib/groundswell/types';

/** The Composio client's error reporting: a refused key names Composio's reason and the key's shape, never the key. */

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('Composio client', () => {
  it('describes the key without revealing it', () => {
    expect(keyShape('ak_1234567890')).toBe('13 characters, starts with ak_');
    expect(keyShape(' ak_1234567890\n')).toBe('15 characters, starts with ak_, with surrounding whitespace');
    expect(keyShape('sk-other')).toBe('8 characters, does not start with ak_');
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
    vi.stubGlobal('fetch', vi.fn(async () => ({ status: 400, ok: false, json: async () => ({ successful: false, error: 'No connected account found for toolkit google_maps' }) })));
    await expect(executeTool('GOOGLE_MAPS_TEXT_SEARCH', {})).rejects.toBeInstanceOf(PermanentStepError);
    vi.stubGlobal('fetch', vi.fn(async () => ({ status: 500, ok: false, json: async () => ({ error: { message: 'upstream down' } }) })));
    const err = await executeTool('GOOGLE_MAPS_TEXT_SEARCH', {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(PermanentStepError);
    expect((err as Error).message).toBe('GOOGLE_MAPS_TEXT_SEARCH failed (500): upstream down');
  });
});
