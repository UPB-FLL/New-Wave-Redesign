import { PermanentStepError } from './types.js';

/**
 * JSON-only chat completion for Groundswell's model step. Uses the OPENAI_API_KEY
 * the blog generator already has; GROUNDSWELL_OPENAI_MODEL overrides the model.
 */

export const GROUNDSWELL_MODEL = () => process.env.GROUNDSWELL_OPENAI_MODEL || 'gpt-4o';

export async function chatJson<T>(system: string, user: string, timeoutMs = 120_000): Promise<T> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new PermanentStepError('OpenAI is not set up: OPENAI_API_KEY is missing in Vercel.');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: GROUNDSWELL_MODEL(),
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = (await response.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  if (response.status === 401) throw new PermanentStepError('OpenAI refused the API key (401).');
  if (!response.ok) throw new Error(`OpenAI failed (${response.status}): ${body.error?.message ?? 'no detail'}`);
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned an empty answer.');
  try {
    return JSON.parse(content) as T;
  } catch {
    throw new Error('OpenAI returned text that is not JSON.');
  }
}
