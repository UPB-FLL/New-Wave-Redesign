import { requireAdmin } from '../_lib/adminKey.js';
import {
  applyPatch,
  assembleContent,
  countWords,
  LINKABLE_PAGES,
  normalizeDraft,
  reviewDraft,
  shortenSlug,
  WORDS,
  META_TITLE_MAX,
  type BlogDraft,
  type DraftPatch,
  type QualityIssue,
} from '../_lib/blogQuality.js';
import { availableSlug, createPost, recentTitles } from '../_lib/blogStore.js';
import { methodGuard, readJsonBody, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { isSupabaseConfigured } from '../_lib/supabaseAdmin.js';
import { generateSlug, getCategoryForWeek, validateSlug } from '../../src/lib/blogUtils.js';
import { BLOG_CATEGORIES } from '../../types/blog.js';

/*
 * POST /api/blog/generate-post (admin auth): writes one SEO-ready post with
 * OpenAI and publishes it. The weekly pg_cron job calls it (migration
 * 20260924120000); the admin "generate" buttons call it with a session.
 * GET reports which keys are configured.
 *
 * One structured draft, reviewed by api/_lib/blogQuality.ts; if it misses
 * the bar, one repair call rewrites only the failing parts (time permitting).
 * A draft that still has a blocking issue (invented statistics, too short)
 * is not published: the route answers 422 and nothing is saved.
 */

/** Must equal vercel.json's maxDuration for this function (a test checks). */
export const MAX_DURATION_SECONDS = 120;
const BUDGET_MS = (MAX_DURATION_SECONDS - 10) * 1000;
const MODEL = process.env.BLOG_OPENAI_MODEL || 'gpt-4o-mini';

function parseJson<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error('Failed to parse JSON response from OpenAI.');
  }
}

async function callOpenAI(messages: { role: string; content: string }[], apiKey: string, timeoutMs: number): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 6000,
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const rawText = await response.text();
  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${rawText.slice(0, 500)}`);
  const data = JSON.parse(rawText) as { choices?: { message?: { content?: string } }[] };
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
      .slice(0, 48) || 'nw',
  );
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

async function searchImage(query: string, width: number, height: number): Promise<string> {
  const apiKey = process.env.PEXELS_API_KEY;
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

const SYSTEM_PROMPT =
  'You are a senior B2B technology writer for New Wave IT, a managed IT services provider in Fort Lauderdale, Florida. ' +
  'You write accurate, practical, people-first articles for business owners, and you never invent facts, figures, or sources. ' +
  'You always return strict JSON matching the requested shape, with no Markdown fences.';

function draftPrompt(category: string, existingTitles: string[]): string {
  const avoid = existingTitles.length ? existingTitles.map((title) => `- ${title}`).join('\n') : '- (none yet)';
  const pages = LINKABLE_PAGES.map((page) => `- ${page.path} (${page.about})`).join('\n');
  return `Write one blog article for New Wave IT.

Category: ${category}
Audience: owners and operations managers of small and mid-sized businesses in Fort Lauderdale and South Florida (Broward, Miami-Dade, and Palm Beach counties).
Choose one specific, practical topic in this category that a business decision-maker is actively searching for. Do not repeat or closely overlap these existing articles:
${avoid}

Requirements:
- primary_keyword: the 2-4 word search phrase the article targets.
- title (shown as the page H1): 45-60 characters; contains the primary keyword and "Fort Lauderdale" or "South Florida".
- meta_title: at most ${META_TITLE_MAX} characters; contains the primary keyword (the site appends " | New Wave IT").
- meta_description: 140-155 characters; contains the primary keyword, a location, and a concrete benefit.
- slug: lowercase words joined by hyphens, at most 60 characters, containing the primary keyword.
- excerpt: 1-2 sentences, at most 160 characters.
- intro: two short paragraphs, 120-180 words in total; use the exact primary keyword in the first two sentences.
- sections: 5-6 sections. Each has a specific, descriptive heading (never "Introduction", "Overview", "Conclusion", or "Call to Action") and a body of 220-300 words. At least one heading contains the primary keyword. Use short paragraphs of 2-4 sentences; at least two bodies include a bulleted or numbered list. Bodies may use "### " sub-headings but never "#" or "##".
- faqs: 4 questions a buyer would search for, each answered directly in 40-80 words.
- conclusion: a descriptive heading and a 100-150 word body that sums up and invites the reader to talk to New Wave IT.
- The intro, sections, FAQs, and conclusion together must total ${WORDS.target[0]}-${WORDS.target[1]} words.
- Internal links: where they fit naturally, link to at most three of these pages with Markdown links and descriptive anchor text. Link to no other URL and add no external links.
${pages}
- Accuracy: do not include statistics, percentages, dollar figures, or references to studies, surveys, reports, or named research. Explain benefits and risks qualitatively, from general industry knowledge.
- Style: plain, confident American English. Avoid filler such as "in today's digital landscape", "delve", "in this blog post", or "game-changer".
- tags: 4-6 lowercase tags.
- featured_image_query: 2-4 words for a stock photo search, no brand names.

Return JSON in exactly this shape:
{"primary_keyword":"","title":"","meta_title":"","meta_description":"","slug":"","excerpt":"","featured_image_query":"","tags":[],"intro":"","sections":[{"heading":"","body":""}],"faqs":[{"question":"","answer":""}],"conclusion":{"heading":"","body":""}}`;
}

function repairPrompt(draft: BlogDraft, issues: QualityIssue[]): string {
  return `Revise this blog draft to fix these problems:
${issues.map((issue) => `- ${issue.message} (parts: ${issue.targets.join(', ') || 'whole article'})`).join('\n')}

Rewrite only the parts named above ("section:N" is sections[N], zero-based; "meta" means title, meta_title, and meta_description). Keep every other rule from the original brief: no statistics, percentages, dollar figures, or cited studies; no links except the site pages already used; no "#" or "##" inside bodies.

Return JSON containing only the parts you changed, in this shape:
{"title":"","meta_title":"","meta_description":"","intro":"","sections":[{"index":0,"heading":"","body":""}],"faqs":[{"question":"","answer":""}],"conclusion":{"heading":"","body":""}}

Current draft:
${JSON.stringify(draft)}`;
}

interface GenerateRequestBody {
  category?: string;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!methodGuard(req, res, ['GET', 'POST'])) return;
  if (!(await requireAdmin(req, res))) return;

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      hasKey: Boolean(process.env.OPENAI_API_KEY),
      hasPexels: Boolean(process.env.PEXELS_API_KEY),
      hasSupabaseWrite: isSupabaseConfigured(),
      model: MODEL,
      name: 'generate-post',
    });
  }

  const started = Date.now();
  const remaining = () => BUDGET_MS - (Date.now() - started);

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not configured.' });
    }
    // Checked before spending OpenAI tokens on a post that could not be saved.
    if (!isSupabaseConfigured()) {
      return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured.' });
    }

    const { category: requested } = readJsonBody(req) as GenerateRequestBody;
    const category: string = requested && (BLOG_CATEGORIES as readonly string[]).includes(requested) ? requested : getCategoryForWeek();
    const existing = await recentTitles().catch(() => [] as string[]);

    const system = { role: 'system', content: SYSTEM_PROMPT };
    let draft = normalizeDraft(
      parseJson<BlogDraft>(await callOpenAI([system, { role: 'user', content: draftPrompt(category, existing) }], apiKey, Math.min(80_000, remaining()))),
    );
    let report = reviewDraft(draft, category);
    let repaired = false;

    // One targeted repair when something misses the bar and there is time for it.
    if (report.issues.length && remaining() > 30_000) {
      try {
        const patch = parseJson<DraftPatch>(
          await callOpenAI([system, { role: 'user', content: repairPrompt(draft, report.issues) }], apiKey, Math.min(60_000, remaining() - 5_000)),
        );
        draft = applyPatch(draft, patch);
        report = reviewDraft(draft, category);
        repaired = true;
      } catch (err) {
        console.warn('blog/generate-post repair failed:', err);
      }
    }

    if (!report.publishable) {
      console.error('blog/generate-post: draft not published', { words: report.words, issues: report.issues.map((issue) => issue.code) });
      return res.status(422).json({
        error: 'The generated draft did not meet the publishing bar; nothing was published.',
        words: report.words,
        issues: report.issues.map((issue) => ({ code: issue.code, message: issue.message, blocking: issue.blocking })),
      });
    }

    const content = assembleContent(draft, category);
    const baseSlug = shortenSlug(validateSlug(draft.slug) ? draft.slug : generateSlug(draft.title));
    const slug = await availableSlug(baseSlug);
    const featuredImage = await searchImage(draft.featured_image_query || `${category} small business office`, 1200, 630);

    const post = await createPost({
      title: draft.title,
      slug,
      excerpt: draft.excerpt,
      content,
      featured_image: featuredImage,
      category,
      tags: draft.tags,
      meta_title: draft.meta_title,
      meta_description: draft.meta_description,
    });

    return res.status(200).json({
      id: post.id,
      title: post.title,
      slug: post.slug,
      category: post.category,
      published_at: post.published_at,
      words: countWords(content),
      repaired,
      // Soft issues that remain (e.g. a meta title a few characters long); nothing blocking.
      notes: report.issues.map((issue) => issue.code),
    });
  } catch (err) {
    console.error('blog/generate-post error:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Blog post generation failed',
    });
  }
}
