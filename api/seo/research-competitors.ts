interface RequestBody {
  location?: string;
  keyword?: string;
  limit?: number;
}

interface CompetitorResult {
  name: string;
  website?: string;
  location?: string;
  strengths?: string;
  notes?: string;
}

interface ResearchResponse {
  competitors: CompetitorResult[];
  suggestedAngles?: string[];
  localSignals?: string[];
}

function safeJsonParse<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error('Failed to parse JSON response from OpenAI.');
  }
}

async function callOpenAI(messages: Array<{ role: string; content: string }>, apiKey: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.4,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  });

  const rawText = await response.text();
  if (!response.ok) {
    throw new Error(`OpenAI ${response.status}: ${rawText.slice(0, 500)}`);
  }
  const data = JSON.parse(rawText) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned an empty response.');
  return content;
}

function parseBody(body: any): RequestBody {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as RequestBody;
    } catch {
      return {};
    }
  }
  return body as RequestBody;
}

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      hasKey: Boolean(process.env.OPENAI_API_KEY),
      name: 'research-competitors',
    });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'OPENAI_API_KEY is not configured. Add it in Vercel > Project Settings > Environment Variables and redeploy.',
      });
    }

    const { location, keyword, limit = 8 } = parseBody(req.body);
    if (!location || !keyword) {
      return res.status(400).json({ error: 'location and keyword are required.' });
    }

    const prompt = `You are an expert local-SEO researcher for a managed service provider (MSP) that wants to build local backlink and comparison landing pages.

Location: "${location}"
Primary keyword / service: "${keyword}"

Return ONLY valid JSON (no prose) matching this TypeScript type:
{
  "competitors": Array<{
    "name": string,
    "website": string,
    "location": string,
    "strengths": string,
    "notes": string
  }>,
  "suggestedAngles": string[],
  "localSignals": string[]
}

Rules:
- Return up to ${limit} real, well-known MSPs / IT service providers in or near "${location}".
- Prefer independent regional providers over national chains.
- If uncertain about a URL, return a best-guess canonical URL.
- No markdown, no backticks, no commentary. JSON only.`;

    const raw = await callOpenAI(
      [
        {
          role: 'system',
          content:
            'You are a meticulous local SEO researcher. You only return strict JSON that matches the requested schema.',
        },
        { role: 'user', content: prompt },
      ],
      apiKey,
    );

    const parsed = safeJsonParse<ResearchResponse>(raw);

    return res.status(200).json({
      competitors: Array.isArray(parsed.competitors) ? parsed.competitors : [],
      suggestedAngles: Array.isArray(parsed.suggestedAngles) ? parsed.suggestedAngles : [],
      localSignals: Array.isArray(parsed.localSignals) ? parsed.localSignals : [],
    });
  } catch (err: any) {
    console.error('research-competitors error:', err);
    return res.status(500).json({
      error: err?.message || 'Research failed.',
      stack: process.env.NODE_ENV !== 'production' ? err?.stack : undefined,
    });
  }
}
