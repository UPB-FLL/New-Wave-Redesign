import Anthropic from '@anthropic-ai/sdk';

/**
 * The agent's advisor: Claude, through the official SDK. One call per pass
 * with the open issues, the resolutions the code allows for each, the
 * lessons, and the log of what Claude advised before and how it turned out
 * (propose.ts builds that question; store.ts keeps the log). The answer is
 * JSON held to a schema; the agent still checks every field against the
 * registry before anything is proposed.
 *
 * Setup: ANTHROPIC_API_KEY in Vercel. GROUNDSWELL_AGENT_MODEL overrides the
 * model (default claude-opus-5-5); GROUNDSWELL_AGENT_EFFORT the effort.
 */

export const DEFAULT_AGENT_MODEL = 'claude-opus-5-5';
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
type Effort = (typeof EFFORTS)[number];

export const agentModel = () => (process.env.GROUNDSWELL_AGENT_MODEL || DEFAULT_AGENT_MODEL).trim();
export const agentEffort = (): Effort => {
  const v = (process.env.GROUNDSWELL_AGENT_EFFORT || 'high').trim().toLowerCase() as Effort;
  return EFFORTS.includes(v) ? v : 'high';
};
export const isClaudeConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

export interface Consultation {
  model: string;
  /** The answer as text, before parsing: logged whole. */
  text: string;
  /** The answer parsed, or null when it was not the JSON asked for. */
  parsed: Record<string, unknown> | null;
  usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens: number | null };
  latency_ms: number;
  stop_reason: string | null;
  /** When the request itself failed: the SDK's error, in words. */
  error: string | null;
}

/** The shape every proposal answer is held to. */
export const PROPOSALS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['proposals'],
  properties: {
    proposals: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'summary', 'cause', 'resolver', 'rationale', 'confidence'],
        properties: {
          id: { type: 'string' },
          summary: { type: 'string' },
          cause: { type: 'string' },
          resolver: { type: 'string' },
          rationale: { type: 'string' },
          confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
          brief: { type: 'string' },
        },
      },
    },
  },
} as const;

/**
 * One consultation. The system prompt is cached (it is the same every pass);
 * the question carries everything that changes. A safety decline falls back
 * server-side to another model inside the same call; if the whole chain
 * declines, `error` says so and the agent's own rule proposes instead.
 */
export async function consultClaude(system: string, question: string, opts: { client?: Anthropic; timeoutMs?: number } = {}): Promise<Consultation> {
  const model = agentModel();
  const started = Date.now();
  const blank: Consultation = { model, text: '', parsed: null, usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: null }, latency_ms: 0, stop_reason: null, error: null };
  if (!isClaudeConfigured() && !opts.client) return { ...blank, error: 'ANTHROPIC_API_KEY is not set in Vercel, so Claude could not be asked.' };
  const client = opts.client ?? new Anthropic({ timeout: opts.timeoutMs ?? 120_000, maxRetries: 2 });
  try {
    const response = await client.beta.messages.create({
      model,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: agentEffort(), format: { type: 'json_schema', schema: PROPOSALS_SCHEMA } },
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: question }],
    });
    const latency_ms = Date.now() - started;
    const usage = { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens, cache_read_input_tokens: response.usage.cache_read_input_tokens ?? null };
    if (response.stop_reason === 'refusal') {
      return { ...blank, latency_ms, usage, stop_reason: 'refusal', error: `Claude declined the question${response.stop_details?.category ? ` (${response.stop_details.category})` : ''}.` };
    }
    const text = response.content
      .filter((b): b is Extract<(typeof response.content)[number], { type: 'text' }> => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    let parsed: Record<string, unknown> | null = null;
    try {
      const value: unknown = JSON.parse(text);
      parsed = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
    } catch {
      parsed = null;
    }
    return { model: response.model ?? model, text, parsed, usage, latency_ms, stop_reason: response.stop_reason ?? null, error: parsed ? null : response.stop_reason === 'max_tokens' ? 'The answer was cut off before it was complete.' : 'The answer was not the JSON asked for.' };
  } catch (err) {
    const latency_ms = Date.now() - started;
    if (err instanceof Anthropic.AuthenticationError) return { ...blank, latency_ms, error: 'Claude refused the API key (ANTHROPIC_API_KEY).' };
    if (err instanceof Anthropic.RateLimitError) return { ...blank, latency_ms, error: 'Claude is rate-limited right now; the next pass asks again.' };
    if (err instanceof Anthropic.APIError) return { ...blank, latency_ms, error: `Claude answered ${err.status ?? 'an error'}: ${err.message}` };
    return { ...blank, latency_ms, error: err instanceof Error ? err.message : String(err) };
  }
}
