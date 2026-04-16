import { callOpenAI, safeJsonParse } from './_openai';

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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { location, keyword, limit = 8 } = (req.body || {}) as RequestBody;

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
    "website": string,        // best-guess canonical homepage URL (https://...)
    "location": string,       // city, state
    "strengths": string,      // 1 sentence on what they are known for
    "notes": string           // 1-2 sentences on differentiation, services, or weaknesses
  }>,
  "suggestedAngles": string[],   // 3-6 SEO content angles to outrank them
  "localSignals": string[]       // 3-6 local signals / neighborhoods / industries to reference
}

Rules:
- Return up to ${limit} real, well-known MSPs / IT service providers in or near "${location}".
- Prefer independent regional providers over national chains.
- If uncertain about a URL, still return a best-guess canonical URL — never fabricate tracking links.
- No markdown, no backticks, no commentary. JSON only.`;

  try {
    const raw = await callOpenAI({
      messages: [
        {
          role: 'system',
          content:
            'You are a meticulous local SEO researcher. You only return strict JSON that matches the requested schema.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      maxTokens: 2000,
      jsonMode: true,
    });

    const parsed = safeJsonParse<ResearchResponse>(raw);

    return res.status(200).json({
      competitors: Array.isArray(parsed.competitors) ? parsed.competitors : [],
      suggestedAngles: Array.isArray(parsed.suggestedAngles) ? parsed.suggestedAngles : [],
      localSignals: Array.isArray(parsed.localSignals) ? parsed.localSignals : [],
    });
  } catch (err: any) {
    console.error('research-competitors error:', err);
    return res.status(500).json({ error: err?.message || 'Research failed.' });
  }
}
