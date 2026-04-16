import { callOpenAI, safeJsonParse } from './_openai';

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

function buildUnsplashImage(query: string, width = 1200, height = 630): string {
  const q = encodeURIComponent(query);
  return `https://source.unsplash.com/${width}x${height}/?${q}`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    location,
    keyword,
    businessName = 'New Wave IT',
    competitors = [],
    angles = [],
    localSignals = [],
    pageType = 'local-landing',
  } = (req.body || {}) as RequestBody;

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

Return ONLY valid JSON matching this TypeScript type — no markdown, no code fences, no prose:
{
  "slug": string,                 // url-safe slug like "msp-services-boston"
  "title": string,                // <title> 55-60 chars ideal
  "meta_description": string,     // 150-160 chars
  "meta_keywords": string,        // comma-separated, 6-12 keywords
  "h1": string,                   // visible H1
  "intro": string,                // 2-3 sentence intro paragraph
  "content": string,              // optional longer body in plain text (can be empty string if sections cover it)
  "sections": Array<{ "heading": string, "body": string, "image": string }>, // 4-6 sections, each 100-180 words; "image" is a short 2-4 word image search query
  "faq": Array<{ "question": string, "answer": string }>,                     // 6-10 Q&A covering pricing, services, local concerns, security, response time, onboarding
  "images": Array<{ "url": string, "alt": string, "caption": string }>,       // 3-5 images; "url" must be a 2-4 word image search query (NOT a real URL)
  "backlinks": Array<{ "url": string, "anchor": string, "note": string }>,    // For each competitor provided, include one row where url = competitor website, anchor = branded keyword-rich phrase, note = why linking/comparing is useful
  "target_location": string,
  "target_keyword": string
}

Rules:
- For "sections[].image" and "images[].url" return just the short image search query (2-4 words) — the server converts those into real image URLs.
- Keep tone confident, helpful, local, and specific — reference neighborhoods or industries where appropriate.
- All content must be original prose.`;

  try {
    const raw = await callOpenAI({
      messages: [
        {
          role: 'system',
          content:
            'You are an elite SEO content writer. You ALWAYS return strict, valid JSON matching the requested schema. No markdown, no prose, no code fences.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.75,
      maxTokens: 4000,
      jsonMode: true,
    });

    const parsed = safeJsonParse<GeneratedPage>(raw);

    const sections = (parsed.sections || []).map((s) => ({
      heading: s.heading || '',
      body: s.body || '',
      image: s.image ? buildUnsplashImage(s.image) : '',
    }));

    const images = (parsed.images || []).map((img, i) => ({
      url: img.url && !img.url.startsWith('http') ? buildUnsplashImage(img.url, 1200, 800) : img.url || buildUnsplashImage(`${keyword} ${location}`, 1200, 800),
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
    return res.status(500).json({ error: err?.message || 'Page generation failed.' });
  }
}
