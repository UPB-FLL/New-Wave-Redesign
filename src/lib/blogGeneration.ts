// Client-side blog generation for development
// In production, this should use the serverless API endpoint

import { createBlogPost, generateSlug, validateSlug } from './blog';
import type { BlogCategory } from '../../types/blog';

interface GenerateOptions {
  category?: string;
  trendFocus?: number;
}

interface GeneratedBlogPost {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image_query: string;
  category: string;
  tags: string[];
  meta_title: string;
  meta_description: string;
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

async function callOpenAI(messages: Array<{ role: string; content: string }>, apiKey: string): Promise<string> {
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

function picsumFallback(query: string, width: number, height: number): string {
  const seed = encodeURIComponent(
    (query || 'new wave it')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'nw'
  );
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

async function searchImage(query: string, width: number, height: number): Promise<string> {
  const apiKey = import.meta.env.VITE_PEXELS_API_KEY;
  const cleaned = (query || '').trim();
  if (!apiKey || !cleaned) {
    return picsumFallback(cleaned, width, height);
  }

  try {
    const orientation = height >= width ? 'portrait' : width > height * 1.2 ? 'landscape' : 'square';
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(cleaned)}&per_page=1&orientation=${orientation}`;
    const res = await fetch(url, { headers: { Authorization: apiKey } });
    if (!res.ok) {
      return picsumFallback(cleaned, width, height);
    }
    const data = await res.json() as { photos?: Array<{ src?: { large2x?: string; landscape?: string; large?: string } }> };
    const photo = data.photos?.[0];
    const src = photo?.src;
    return src?.large2x || src?.landscape || src?.large || picsumFallback(cleaned, width, height);
  } catch {
    return picsumFallback(cleaned, width, height);
  }
}

function getCategoryForWeek(): BlogCategory {
  const categories = ['Managed IT Services', 'Cybersecurity', 'Cloud Solutions', 'Network Infrastructure', 'Microsoft 365', 'IT Support', 'Backup & Disaster Recovery'] as const;
  const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  return categories[weekNumber % categories.length];
}

export async function generateBlogPost(options: GenerateOptions = {}): Promise<GeneratedBlogPost> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured. Please add VITE_OPENAI_API_KEY to your environment variables.');
  }

  const { category, trendFocus = 0.4 } = options;
  const selectedCategory = (category || getCategoryForWeek()) as BlogCategory;

  // Step 1: Use GPT-4o-mini to identify trending topics
  const trendPrompt = `You are an IT industry analyst. Based on your knowledge of current trends through early 2026, identify 3-5 trending topics in "${selectedCategory}" that would be relevant for South Florida businesses.

For each topic, provide:
- Topic name
- Why it's relevant now (1-2 sentences)
- Key points to cover (3-4 bullet points)

Return ONLY valid JSON matching this format:
{
  "topics": [
    {
      "name": "string",
      "relevance": "string",
      "keyPoints": ["string", "string", "string"]
    }
  ]
}`;

  let trendResponse: string;
  try {
    trendResponse = await callOpenAI(
      [
        {
          role: 'system',
          content: 'You are a meticulous IT industry analyst. You only return strict JSON that matches the requested schema.',
        },
        { role: 'user', content: trendPrompt },
      ],
      apiKey
    );
  } catch (err) {
    // Fallback to service-focused if trend analysis fails
    console.warn('Trend analysis failed, falling back to service-focused:', err);
    trendResponse = JSON.stringify({
      topics: [{
        name: `${selectedCategory} Best Practices for 2026`,
        relevance: 'Essential guidance for South Florida businesses',
        keyPoints: ['Key benefits', 'Implementation tips', 'Common pitfalls', 'ROI considerations']
      }]
    });
  }

  const trendData = safeJsonParse<{ topics: Array<{ name: string; relevance: string; keyPoints: string[] }> }>(trendResponse);
  const selectedTopic = trendData.topics?.[0] || {
    name: `${selectedCategory} Best Practices for 2026`,
    relevance: 'Essential guidance for South Florida businesses',
    keyPoints: ['Key benefits', 'Implementation tips', 'Common pitfalls']
  };

  // Step 2: Generate blog post with GPT-4o-mini
  const contentPrompt = `You are a senior IT content writer for New Wave IT, a managed service provider in Fort Lauderdale, Florida.

Write a comprehensive, SEO-optimized blog post about: "${selectedTopic.name}"

CONTEXT:
${selectedTopic.relevance}

KEY POINTS TO COVER:
${selectedTopic.keyPoints.map(p => `- ${p}`).join('\n')}

REQUIREMENTS:
- 1500-2000 words
- Professional but accessible tone for business decision makers
- Target: South Florida businesses
- Include practical tips and actionable advice
- Use statistics and data where relevant (use plausible 2026 figures)
- Natural keyword usage for SEO (don't keyword stuff)
- Markdown format with proper heading hierarchy (## H2, ### H3)
- Short paragraphs (2-4 sentences) for readability
- Include bullet points and numbered lists where appropriate
- Add a call-to-action at the end directing to New Wave IT services

CATEGORY: ${selectedCategory}

Return ONLY valid JSON matching this exact format:
{
  "title": "string (50-60 characters, includes location and keyword)",
  "slug": "string (URL-friendly, kebab-case)",
  "excerpt": "string (150-160 characters for meta description)",
  "content": "string (full blog post in Markdown format)",
  "featured_image_query": "string (2-4 words for image search)",
  "tags": ["array of 4-6 relevant tags"],
  "meta_title": "string (55-60 characters, SEO optimized)",
  "meta_description": "string (150-160 characters, includes benefit and location)",
  "category": "${selectedCategory}"
}`;

  const contentResponse = await callOpenAI(
    [
      {
        role: 'system',
        content: 'You are an elite SEO content writer. You ALWAYS return strict, valid JSON matching the requested schema. No markdown, no prose, no code fences.',
      },
      { role: 'user', content: contentPrompt },
    ],
    apiKey
  );

  const generated = safeJsonParse<GeneratedBlogPost>(contentResponse);

  // Resolve featured image
  const featuredImage = await searchImage(
    generated.featured_image_query || `${selectedCategory} Fort Lauderdale business`,
    1200,
    630
  );

  // Validate and fix slug
  let slug = generated.slug;
  if (!validateSlug(slug)) {
    slug = generateSlug(generated.title);
  }

  // Create the blog post
  const post = await createBlogPost({
    title: generated.title,
    slug,
    excerpt: generated.excerpt,
    content: generated.content,
    featured_image: featuredImage,
    category: generated.category,
    tags: generated.tags,
    meta_title: generated.meta_title,
    meta_description: generated.meta_description,
  });

  return {
    ...generated,
    slug,
    featured_image_query: featuredImage,
  };
}