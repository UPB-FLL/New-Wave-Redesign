import { researchWithSearch } from '../openai.js';
import { consultClaude, isClaudeConfigured, parseJsonObject, type Consultation } from './consult.js';
import { sourceKind, sourcedConfidence, sourceNote } from './learningSources.js';
import { readLearnings, recordConsultation, recordLearnings } from './store.js';
import type { Db, LearningRow } from './types.js';

/**
 * The research half of the 4-hour pass: what is new in the fields the
 * division works in. One ask per topic, with the advisor's web search turned
 * on: Claude when ANTHROPIC_API_KEY is set, else OpenAI's Responses API with
 * its web search tool on the OPENAI_API_KEY the site already has;
 * the question carries what the agent already knows (the newest learnings
 * on that topic), so only what is new comes back. Every learning needs a
 * real source link; duplicates by link or by title are dropped; a page that
 * is neither the company's own nor a known publication's is kept as an
 * unconfirmed source, at low confidence (learningSources.ts); what is
 * kept goes in `groundswell_agent_learnings` and the report's "What the
 * agent learned" section. The ask itself is logged like every other
 * consultation, with purpose `research` and a verdict for every learning the
 * answer held: kept, or dropped and why.
 *
 * GROUNDSWELL_AGENT_TOPICS overrides the topics: `key=what to look for;
 * key=…`. Without either key the research is skipped and the report says so.
 */

export interface Topic {
  key: string;
  label: string;
  /** What to look for, in the words the question carries. */
  brief: string;
}

export const DEFAULT_TOPICS: Topic[] = [
  {
    key: 'ai-agent-marketing',
    label: 'AI agent marketing',
    brief: 'How businesses and agencies use AI agents in marketing: autonomous campaign management, agents that write and schedule content, AI-driven ad buying and bidding, agents that answer customers and qualify leads, new tools and platform features (Google, Meta, TikTok, HubSpot, OpenAI, Anthropic and others), what measurably worked or failed, pricing and policy changes, and how small businesses are adopting it.',
  },
  {
    key: 'social-media-marketing',
    label: 'Social media marketing',
    brief: 'What is changing in social media marketing for small businesses: platform algorithm and feature changes (Instagram, Facebook, TikTok, LinkedIn, YouTube, Threads, Pinterest), formats that are gaining or losing reach, posting cadence and creative findings backed by data, paid social changes (Meta Ads, TikTok Ads), AI search and AI answers citing social content, creator and UGC trends, and measurement changes.',
  },
];

/** How many learnings a topic may return per pass, and how many web searches one ask may run. */
export const LEARNINGS_PER_TOPIC = 5;
export const SEARCHES_PER_TOPIC = 8;
/** How many known learnings the question carries, so what comes back is new. */
const KNOWN_LIMIT = 30;
const MAX_TOPICS = 6;

export function topicsFromEnv(value = process.env.GROUNDSWELL_AGENT_TOPICS): Topic[] {
  const text = (value ?? '').trim();
  if (!text) return DEFAULT_TOPICS;
  const out: Topic[] = [];
  for (const part of text.split(';')) {
    const [rawKey, ...rest] = part.split('=');
    const key = rawKey?.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') ?? '';
    const brief = rest.join('=').trim();
    if (!key || !brief) continue;
    out.push({ key, label: key.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase()), brief: brief.slice(0, 1000) });
    if (out.length >= MAX_TOPICS) break;
  }
  return out.length ? out : DEFAULT_TOPICS;
}

export const RESEARCH_SYSTEM = `You are the research assistant of GroundSwell's operations agent. GroundSwell is a marketing-audit and growth engine run by New Wave, a small IT and growth company in Florida that serves small businesses nationwide with data, integrations and smart advertising (Google, Meta, TikTok, LinkedIn), social media work, brand development and websites. Every 4 hours the agent asks you what is new in one field, and reports your findings to the owner.

Rules:
- Search the web and read what you find. Report only things published or changed recently (the question says how far back), that the agent does not already know (the question lists what it knows), and that a small growth agency could act on or should watch.
- Every learning needs the link of the page you read it on. Never report a learning without a source you actually opened; never invent a figure, a date, a product or a result. If you found nothing new, say so with an empty list.
- A learning is an article, a study or an announcement dated inside the window, with its date given (an undated page is not reported). Never a vendor's product page, homepage or event listing, and never a vendor's own claims about its results: a figure must come from the article's own reporting.
- Link the primary source: the company's own announcement (its newsroom, blog or help pages) when there is one, otherwise the article of an established news, trade or research publication. Never a page that repeats someone else's news (an aggregator, a repost of a press release, a newsletter, a marketing tool's blog, an affiliate or money-making site), and never a post on a platform anyone can post on (a YouTube video; a post on X, LinkedIn, Facebook or Reddit). "source" is the publisher of the page you link, not the outlet it credits. The agent reads who published each link: a page that is neither the company's own nor an established publication's is reported as unconfirmed, at low confidence.
- Plain words for a business owner: what it is, why it matters for an agency like this one, and what to do about it if anything.
- Answer with JSON only, as the last thing you write: { "learnings": [ { "title": "...", "summary": "...", "why_it_matters": "...", "action": "...", "url": "https://...", "source": "the site or publisher", "published": "YYYY-MM-DD or null", "confidence": "low|medium|high" } ] }.`;

interface RawLearning {
  title?: unknown;
  summary?: unknown;
  why_it_matters?: unknown;
  action?: unknown;
  url?: unknown;
  source?: unknown;
  published?: unknown;
  confidence?: unknown;
}

const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

/** A link as it is compared: lower-case host, no tracking parameters, no trailing slash. */
export function normalizeUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    for (const key of [...u.searchParams.keys()]) if (/^(utm_|fbclid|gclid|ref$|source$)/i.test(key)) u.searchParams.delete(key);
    u.hash = '';
    const s = u.toString().replace(/\/+$/, '');
    return s.toLowerCase().startsWith('https://') || s.toLowerCase().startsWith('http://') ? s : null;
  } catch {
    return null;
  }
}

/** A title as it is compared: lower case, letters and digits only. */
export const titleKey = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 80);

/** Days of slack on the window: a piece dated just before `since` may still be what the window asked for. */
export const WINDOW_SLACK_DAYS = 2;

/** What the rules made of one learning in an answer: kept, or dropped and why ("<title>: <reason>"). A kept one from an unconfirmed source says so too. */
export interface LearningVerdict {
  kept: boolean;
  reason: string | null;
}

/**
 * The learnings an answer holds that pass the rules and are not already
 * known, and a verdict for every learning it held, in the answer's order. A
 * learning needs a publication date (an undated one is a landing, event or
 * product page, not an article); with `since` (YYYY-MM-DD), one dated before
 * the window (less the slack) is dropped. One whose page is neither the
 * company's own nor a known publication's is kept at low confidence.
 */
export function checkLearnings(raw: unknown, topic: string, known: Pick<LearningRow, 'url' | 'title'>[], opts: { since?: string } = {}): { kept: Omit<LearningRow, 'id' | 'found_at' | 'status' | 'consultation_id'>[]; dropped: string[]; verdicts: LearningVerdict[] } {
  const floor = opts.since && /^\d{4}-\d{2}-\d{2}$/.test(opts.since) ? new Date(Date.parse(opts.since) - WINDOW_SLACK_DAYS * 24 * 60 * 60_000).toISOString().slice(0, 10) : null;
  const kept: Omit<LearningRow, 'id' | 'found_at' | 'status' | 'consultation_id'>[] = [];
  const verdicts: LearningVerdict[] = [];
  const seenUrls = new Set(known.map((k) => normalizeUrl(k.url) ?? k.url));
  const seenTitles = new Set(known.map((k) => titleKey(k.title)));
  const list = Array.isArray((raw as { learnings?: unknown })?.learnings) ? ((raw as { learnings: unknown[] }).learnings as RawLearning[]) : [];
  for (const item of list) {
    const title = clip(item?.title, 200);
    const drop = (why: string) => verdicts.push({ kept: false, reason: `${title || '(no title)'}: ${why}` });
    if (kept.length >= LEARNINGS_PER_TOPIC) {
      drop(`more than ${LEARNINGS_PER_TOPIC} in one answer.`);
      continue;
    }
    const url = normalizeUrl(clip(item?.url, 500));
    const summary = clip(item?.summary, 800);
    if (!title || !summary) {
      drop('no title or summary.');
      continue;
    }
    if (!url) {
      drop('no usable source link.');
      continue;
    }
    if (seenUrls.has(url) || seenTitles.has(titleKey(title))) {
      drop('already known.');
      continue;
    }
    const published = /^\d{4}-\d{2}-\d{2}$/.test(clip(item?.published, 10)) ? clip(item?.published, 10) : null;
    if (!published) {
      drop('no publication date.');
      continue;
    }
    if (floor && published < floor) {
      drop(`published ${published}, before ${opts.since}.`);
      continue;
    }
    seenUrls.add(url);
    seenTitles.add(titleKey(title));
    const claimed = ['low', 'medium', 'high'].includes(clip(item?.confidence, 10)) ? (clip(item?.confidence, 10) as LearningRow['confidence']) : 'low';
    const kind = sourceKind({ url, title, summary });
    kept.push({ topic, title, summary, why_it_matters: clip(item?.why_it_matters, 600) || null, action: clip(item?.action, 400) || null, url, source: clip(item?.source, 120) || new URL(url).hostname, published_at: published, confidence: sourcedConfidence(kind, claimed) });
    verdicts.push({ kept: true, reason: kind === 'unconfirmed' ? `${title}: kept as an ${sourceNote(kind, url)}, at low confidence.` : null });
  }
  return { kept, dropped: verdicts.filter((v) => !v.kept).map((v) => v.reason ?? ''), verdicts };
}

export interface ResearchOptions {
  now: Date;
  deadline: number;
  topics?: Topic[];
  /** A stand-in for the Claude call (tests). */
  consult?: (system: string, question: string, opts: { webSearch: { maxUses: number } }) => Promise<Consultation>;
  /** A stand-in for the OpenAI web-search call (tests). */
  search?: typeof researchWithSearch;
  /** How far back a learning may date; the question says so. */
  sinceDays?: number;
}

/** The OpenAI research call in the advisor's answer shape, so the rest of the step reads either the same. */
async function openaiResearch(system: string, question: string, search: typeof researchWithSearch): Promise<Consultation> {
  const started = Date.now();
  try {
    const answer = await search(system, question, { maxUses: SEARCHES_PER_TOPIC });
    const parsed = parseJsonObject(answer.text);
    return { model: answer.model, text: answer.text, parsed, usage: { input_tokens: answer.usage.input_tokens, output_tokens: answer.usage.output_tokens, cache_read_input_tokens: null, web_searches: answer.usage.web_searches }, latency_ms: Date.now() - started, stop_reason: null, error: parsed ? null : 'The answer was not the JSON asked for.' };
  } catch (err) {
    return { model: process.env.GROUNDSWELL_OPENAI_MODEL || 'gpt-4o', text: '', parsed: null, usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: null }, latency_ms: Date.now() - started, stop_reason: null, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface ResearchReport {
  /** The learnings kept this pass, by topic key. */
  learned: LearningRow[];
  /** What was dropped, for the log. */
  dropped: Record<string, string[]>;
  /** Topics not researched, and why. */
  skipped: Record<string, string>;
}

/** The research step: one ask per topic, within the deadline; what is new is stored and returned. */
export async function researchTopics(db: Db, opts: ResearchOptions): Promise<ResearchReport> {
  const report: ResearchReport = { learned: [], dropped: {}, skipped: {} };
  const topics = opts.topics ?? topicsFromEnv();
  const viaClaude = isClaudeConfigured() || Boolean(opts.consult);
  const viaOpenAI = !viaClaude && (Boolean(process.env.OPENAI_API_KEY) || Boolean(opts.search));
  if (!viaClaude && !viaOpenAI) {
    for (const t of topics) report.skipped[t.key] = 'Neither ANTHROPIC_API_KEY nor OPENAI_API_KEY is set, so nothing was researched.';
    return report;
  }
  const advisor = viaClaude ? 'claude' : 'openai';
  const sinceDays = opts.sinceDays ?? 7;
  for (const topic of topics) {
    if (Date.now() > opts.deadline - 60_000) {
      report.skipped[topic.key] = 'The pass ran out of time before this topic.';
      continue;
    }
    const known = await readLearnings(db, { topic: topic.key, limit: KNOWN_LIMIT });
    const since = new Date(opts.now.getTime() - sinceDays * 24 * 60 * 60_000).toISOString().slice(0, 10);
    const question = JSON.stringify({
      topic: topic.label,
      look_for: topic.brief,
      today: opts.now.toISOString().slice(0, 10),
      since,
      at_most: LEARNINGS_PER_TOPIC,
      already_known: known.map((k) => ({ title: k.title, url: k.url, found: k.found_at.slice(0, 10) })),
    });
    const result = viaClaude ? await (opts.consult ?? consultClaude)(RESEARCH_SYSTEM, question, { webSearch: { maxUses: SEARCHES_PER_TOPIC } }) : await openaiResearch(RESEARCH_SYSTEM, question, opts.search ?? researchWithSearch);
    const { kept, dropped, verdicts } = result.parsed ? checkLearnings(result.parsed, topic.key, known, { since }) : { kept: [], dropped: [] as string[], verdicts: [] as LearningVerdict[] };
    // JSON without the list drops every learning it may hold: say so, rather than log an empty answer as nothing new.
    const error = result.error ?? (result.parsed && !Array.isArray((result.parsed as { learnings?: unknown }).learnings) ? 'The answer had no "learnings" list.' : null);
    if (error) report.skipped[topic.key] = error;
    report.dropped[topic.key] = dropped;
    let consultationId: string | null = null;
    try {
      // learning-1, learning-2, … in the answer's order, so each verdict lines up with the learning it judged.
      consultationId = await recordConsultation(db, { advisor, purpose: 'research', model: result.model, issue_ids: [], question: { topic: topic.key, since_days: sinceDays, known: known.length }, answer_text: result.text, answer: result.parsed, kept: Object.fromEntries(verdicts.map((v, i) => [`learning-${i + 1}`, { kept: v.kept, resolver: null, reason: v.reason }])), usage: result.usage, latency_ms: result.latency_ms, error });
    } catch (err) {
      console.error('Agent research log failed:', err instanceof Error ? err.message : err);
    }
    if (kept.length) {
      const rows = await recordLearnings(db, kept.map((k) => ({ ...k, consultation_id: consultationId, found_at: opts.now.toISOString(), status: 'new' as const })));
      report.learned.push(...rows);
    }
  }
  return report;
}
