interface Competitor {
  name: string;
  website?: string;
  location?: string;
  strengths?: string;
  notes?: string;
}

interface RequestBody {
  location?: string;
  keyword?: string;
  businessName?: string;
  competitors?: Competitor[];
  angles?: string[];
  localSignals?: string[];
  pageType?: 'local-landing' | 'comparison' | 'backlink';
}

interface GeneratedPage {
  slug: string;
  title: string;
  meta_description: string;
  meta_keywords: string;
  h1: string;
  intro: string;
  content: string;
  sections: Array<{ heading: string; body: string; image?: string }>;
  faq: Array<{ question: string; answer: string }>;
  images: Array<{ url: string; alt: string; caption?: string }>;
  backlinks: Array<{ url: string; anchor: string; note?: string }>;
  target_location: string;
  target_keyword: string;
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
      temperature: 0.75,
      max_tokens: 4000,
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

function buildUnsplashImage(query: string, width = 1200, height = 630): string {
  const q = encodeURIComponent(query);
  return `https://source.unsplash.com/${width}x${height}/?${q}`;
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
      name: 'generate-page',
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

    const {
      location,
      keyword,
      businessName = 'New Wave IT',
      competitors = [],
      angles = [],
      localSignals = [],
      pageType = 'local-landing',
    } = parseBody(req.body);

    if (!location || !keyword) {
      return res.status(400).json({ error: 'location and keyword are required.' });
    }

    const competitorList =
      competitors.length > 0
        ? competitors
            .map(
              (c, i) =>
                `${i + 1}. ${c.name}${c.website ? ` (${c.website})` : ''} — ${c.strengths || ''} ${c.notes || ''}`,
            )
            .join('\n')
        : 'No competitor data provided.';

    const prompt = `You are a senior SEO content strategist writing a ${pageType} page for "${businessName}".

TARGET LOCATION: ${location}
PRIMARY KEYWORD: ${keyword}
PAGE TYPE: ${pageType}

COMPETITORS RESEARCHED:
${competitorList}

SEO ANGLES: ${angles.length ? angles.join(' | ') : 'none provided'}
LOCAL SIGNALS: ${localSignals.length ? localSignals.join(' | ') : 'none provided'}

Write a genuinely useful, high-quality local SEO landing page. Naturally include the primary keyword and location in the title, H1, intro, and at least one section heading. Do NOT stuff keywords.

Return ONLY valid JSON matching this TypeScript type — no markdown, no code fences:
{
  "slug": string,
  "title": string,
  "meta_description": string,
  "meta_keywords": string,
  "h1": string,
  "intro": string,
  "content": string,
  "sections": Array<{ "heading": string, "body": string, "image": string }>,
  "faq": Array<{ "question": string, "answer": string }>,
  "images": Array<{ "url": string, "alt": string, "caption": string }>,
  "backlinks": Array<{ "url": string, "anchor": string, "note": string }>,
  "target_location": string,
  "target_keyword": string
}

Rules:
- "sections[].image" and "images[].url" must be short 2-4 word image search queries (the server turns them into real image URLs).
- Title 55-60 chars. Description 150-160 chars. Keywords comma-separated, 6-12 keywords.
- 4-6 sections of 100-180 words each. 6-10 FAQ covering pricing, services, local concerns, security, response time, onboarding.
- For every competitor, include one backlinks row (url=competitor website, anchor=branded keyword phrase, note=why useful).
- All content must be original prose.`;

    const raw = await callOpenAI(
      [
        {
          role: 'system',
          content:
            'You are an elite SEO content writer. You ALWAYS return strict, valid JSON matching the requested schema. No markdown, no prose, no code fences.',
        },
        { role: 'user', content: prompt },
      ],
      apiKey,
    );

    const parsed = safeJsonParse<GeneratedPage>(raw);

    const sections = (parsed.sections || []).map((s) => ({
      heading: s.heading || '',
      body: s.body || '',
      image: s.image ? buildUnsplashImage(s.image) : '',
    }));

    const images = (parsed.images || []).map((img, i) => ({
      url:
        img.url && !img.url.startsWith('http')
          ? buildUnsplashImage(img.url, 1200, 800)
          : img.url || buildUnsplashImage(`${keyword} ${location}`, 1200, 800),
      alt: img.alt || `${keyword} in ${location} ${i + 1}`,
      caption: img.caption || '',
    }));

    const heroImage = buildUnsplashImage(`${keyword} office ${location}`, 1600, 900);
    const ogImage = buildUnsplashImage(`${keyword} ${location}`, 1200, 630);

    return res.status(200).json({
      slug: parsed.slug || '',
      title: parsed.title || '',
      meta_description: parsed.meta_description || '',
      meta_keywords: parsed.meta_keywords || '',
      canonical_url: '',
      og_image: ogImage,
      hero_image: heroImage,
      h1: parsed.h1 || '',
      intro: parsed.intro || '',
      content: parsed.content || '',
      sections,
      faq: Array.isArray(parsed.faq) ? parsed.faq : [],
      images,
      competitors,
      backlinks: Array.isArray(parsed.backlinks) ? parsed.backlinks : [],
      target_location: parsed.target_location || location,
      target_keyword: parsed.target_keyword || keyword,
    });
  } catch (err: any) {
    console.error('generate-page error:', err);
    return res.status(500).json({
      error: err?.message || 'Page generation failed.',
      stack: process.env.NODE_ENV !== 'production' ? err?.stack : undefined,
    });
  }
}
