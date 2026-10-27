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

/**
 * A research ask through OpenAI's Responses API with its web search tool, so
 * the agent's research (api/_lib/groundswell/agent/research.ts) runs on the
 * OPENAI_API_KEY the site already has. The answer is the text the model wrote
 * last (its JSON, as the system prompt asks); `web_searches` counts the
 * searches it ran. The tool type is `web_search_preview`, and `web_search`
 * when the API says the first is unknown.
 */
export interface SearchAnswer {
  model: string;
  text: string;
  usage: { input_tokens: number; output_tokens: number; web_searches: number };
}

const SEARCH_TOOL_TYPES = ['web_search_preview', 'web_search'] as const;

export async function researchWithSearch(system: string, question: string, opts: { maxUses?: number; timeoutMs?: number; fetchImpl?: typeof fetch } = {}): Promise<SearchAnswer> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new PermanentStepError('OpenAI is not set up: OPENAI_API_KEY is missing in Vercel.');
  const model = GROUNDSWELL_MODEL();
  const fetchImpl = opts.fetchImpl ?? fetch;
  let lastError = '';
  for (const toolType of SEARCH_TOOL_TYPES) {
    const response = await fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        instructions: system,
        input: `${question}\n\nUse the web search tool (at most ${opts.maxUses ?? 8} searches) before answering.`,
        tools: [{ type: toolType }],
        tool_choice: 'auto',
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 240_000),
    });
    const body = (await response.json().catch(() => ({}))) as {
      model?: string;
      output?: { type?: string; content?: { type?: string; text?: string }[] }[];
      usage?: { input_tokens?: number; output_tokens?: number };
      error?: { message?: string };
    };
    if (response.status === 401) throw new PermanentStepError('OpenAI refused the API key (401).');
    if (!response.ok) {
      lastError = `OpenAI failed (${response.status}): ${body.error?.message ?? 'no detail'}`;
      // An unknown tool type: try the other name once.
      if (response.status === 400 && /tool|web_search/i.test(body.error?.message ?? '')) continue;
      throw new Error(lastError);
    }
    const output = body.output ?? [];
    const texts = output.filter((o) => o.type === 'message').flatMap((o) => (o.content ?? []).filter((c) => c.type === 'output_text').map((c) => c.text ?? ''));
    return {
      model: body.model ?? model,
      text: texts.join('\n').trim(),
      usage: { input_tokens: body.usage?.input_tokens ?? 0, output_tokens: body.usage?.output_tokens ?? 0, web_searches: output.filter((o) => o.type === 'web_search_call').length },
    };
  }
  throw new Error(lastError || 'OpenAI web search is not available.');
}
