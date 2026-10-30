import { researchWithSearch } from '../openai.js';
import { consultClaude, isClaudeConfigured, parseJsonObject, type Consultation } from './consult.js';
import { sourceKind, sourcedConfidence, sourceNote, type SourceKind } from './learningSources.js';
import { readConsultations, readLearnings, recordConsultation, recordLearnings } from './store.js';
import type { ConsultationRow, Db, LearningRow } from './types.js';

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
 * The six default topics (owner's ask, 2026-10-28) are the trends that help
 * GroundSwell's customers: AI agent marketing, social media marketing,
 * marketing and advertising, SEO and AI search, metadata and structured data,
 * and the Social Engineering division's own field (brand, websites,
 * integrations and data; the division's name, never security testing). The
 * least recently researched topics go first and up to RESEARCH_CONCURRENCY
 * run at once, so a pass that runs out of time skips different topics each
 * time rather than the same ones for ever.
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
  {
    key: 'marketing',
    label: 'Marketing and advertising',
    brief: 'What is changing in digital marketing and paid advertising for small and local businesses: Google Ads, Performance Max and Local Services Ads changes, Meta and TikTok ad products, cost-per-click and cost-per-lead movements reported by credible benchmarks, email and SMS marketing, reviews and reputation, privacy and consent rules that change targeting or tracking (cookies, consent mode, state privacy laws), measurement and attribution, and offers or campaign approaches with published results.',
  },
  {
    key: 'seo',
    label: 'SEO and AI search',
    brief: 'What is changing in search for small and local businesses: Google core and spam updates, Google Business Profile and local pack changes, AI Overviews, AI Mode and answer engines (ChatGPT search, Perplexity, Gemini, Copilot) and how they choose and cite sources, crawler access (robots.txt, llms.txt, AI crawlers), Search Console changes, ranking studies with published data, and what site owners should change.',
  },
  {
    key: 'metadata',
    label: 'Metadata and structured data',
    brief: 'What is changing in the metadata search engines, AI answers and social platforms read: schema.org and Google structured data (LocalBusiness, Product, FAQ, Review, Organization and others, including rich results added, changed or retired), title and meta description handling, Open Graph and social preview tags, canonical and hreflang guidance, sitemaps, image and video metadata, and validation tools, with what a small business site should add or fix.',
  },
  {
    key: 'social-engineering',
    label: 'Social Engineering: brand, websites and growth',
    brief: 'The field New Wave: Social Engineering works in for small businesses (a growth division; the name is a brand, not security testing, so do not research phishing or security): brand development, website design and conversion, website builders and platforms, integrations and data between marketing tools (CRMs, booking, analytics, ad platforms), analytics and reporting practice, and growth programs that combine data, integrations and smart advertising, with findings that small businesses can act on.',
  },
];

/** How many topics are researched at once; the rest wait for a free slot (or the next pass). */
export const RESEARCH_CONCURRENCY = 3;

/** How many learnings a topic may return per pass, and how many web searches one ask may run. */
export const LEARNINGS_PER_TOPIC = 5;
export const SEARCHES_PER_TOPIC = 8;
/** How many known learnings the question carries, so what comes back is new. */
const KNOWN_LIMIT = 30;
/** What a pass compares every topic's answer with: the learnings found in this many days, under any topic, at most HELD_LIMIT (the date window keeps anything older from coming back). */
export const HELD_DAYS = 30;
const HELD_LIMIT = 1000;
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

export const RESEARCH_SYSTEM = `You are the research assistant of GroundSwell's operations agent. GroundSwell is a marketing-audit and growth engine run by New Wave, a small IT and growth company in Florida that serves small businesses nationwide with data, integrations and smart advertising (Google, Meta, TikTok, LinkedIn), social media work, brand development and websites. Every 4 hours the agent asks you what is new in one field, and reports your findings to the owner, who passes what helps on to GroundSwell's customers: small and local businesses.

Rules:
- Search the web and read what you find. Report only things published or changed recently (the question says how far back), that the agent does not already know (the question lists what it knows), and that a small growth agency or the small businesses it serves could act on or should watch.
- Every learning needs the link of the page you read it on. Never report a learning without a source you actually opened; never invent a figure, a date, a product or a result. If you found nothing new, say so with an empty list.
- A learning is an article, a study or an announcement dated inside the window, with its date given (an undated page is not reported). Never a vendor's product page, homepage or event listing, and never a vendor's own claims about its results: a figure must come from the article's own reporting.
- Link the primary source: the company's own announcement (its newsroom, blog or help pages) when there is one, otherwise the article of an established news, trade or research publication. Never a page that repeats someone else's news (an aggregator, a repost of a press release, a newsletter, a marketing tool's blog, an affiliate or money-making site), and never a post on a platform anyone can post on (a YouTube video; a post on X, LinkedIn, Facebook or Reddit). "source" is the publisher of the page you link, not the outlet it credits. The agent reads who published each link: a page that is neither the company's own nor an established publication's is reported as unconfirmed, at low confidence.
- Plain words for a business owner: what it is, why it matters for an agency like this one and its small-business customers, and what to do about it if anything.
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

/** Words a headline says nothing with: filler, and the verbs any announcement uses ("Meta Introduces X" and "Meta Announces X" are one story). */
const FILLER_WORDS = new Set('a an the and or for to of in on at by with as its it is are be was were from into over after before about this that these those now new more how what why when who you your our their can will not no all any up out vs via'.split(' '));
const ANNOUNCING_WORDS = new Set('announce announces announced introduce introduces introduced launch launches launched unveil unveils unveiled debut debuts debuted release releases released reveal reveals revealed roll rolls rolled bring brings add adds added begin begins'.split(' '));

/** The words a title is compared on: lower case, without filler or announcing verbs, possessives dropped and plurals folded ("Ads" and "Ad" are one word). */
export function titleWords(title: string): Set<string> {
  const out = new Set<string>();
  for (const raw of title.toLowerCase().replace(/[’']s\b/g, '').split(/[^a-z0-9]+/)) {
    if (raw.length < 2 || FILLER_WORDS.has(raw) || ANNOUNCING_WORDS.has(raw)) continue;
    const word = raw.length >= 3 && raw.endsWith('s') && !/(ss|us|is)$/.test(raw) ? raw.slice(0, -1) : raw;
    if (!FILLER_WORDS.has(word) && !ANNOUNCING_WORDS.has(word)) out.add(word);
  }
  return out;
}

/** How much of the shorter title's words the other must share, and how many words the shorter needs, to be the same story. */
export const SAME_STORY_SHARE = 0.8;
export const SAME_STORY_MIN_WORDS = 4;

/**
 * Whether two titles tell one story. On the 74 learnings stored by
 * 2026-10-30 it paired 9 titles, every pair a repeat (one launch from two
 * sites, a headline and its shortened form), and joined no two different
 * stories; a rule needing near-identical titles found 4 of those 9. Two
 * repeats whose headlines share fewer words still got through.
 */
export function sameStory(a: Set<string>, b: Set<string>): boolean {
  const shorter = a.size <= b.size ? a : b;
  const longer = shorter === a ? b : a;
  if (shorter.size < SAME_STORY_MIN_WORDS) return false;
  let shared = 0;
  for (const word of shorter) if (longer.has(word)) shared += 1;
  return shared / shorter.size >= SAME_STORY_SHARE;
}

/** What the agent already holds, as the checks compare it. A pass shares one across its topics, so two topics cannot both keep one story. */
export interface KnownLearnings {
  urls: Set<string>;
  titles: Set<string>;
  stories: { title: string; words: Set<string>; kind: SourceKind }[];
}

/** Adds a learning to what is known: its link, its title and its story, with who published it. */
export function rememberLearning(known: KnownLearnings, learning: Pick<LearningRow, 'url' | 'title'> & { summary?: string | null }): void {
  known.urls.add(normalizeUrl(learning.url) ?? learning.url);
  known.titles.add(titleKey(learning.title));
  known.stories.push({ title: learning.title, words: titleWords(learning.title), kind: sourceKind(learning) });
}

export function knownFrom(rows: readonly (Pick<LearningRow, 'url' | 'title'> & { summary?: string | null })[]): KnownLearnings {
  const known: KnownLearnings = { urls: new Set(), titles: new Set(), stories: [] };
  for (const row of rows) rememberLearning(known, row);
  return known;
}

/**
 * The learnings an answer holds that pass the rules and are not already
 * known, and a verdict for every learning it held, in the answer's order. A
 * learning needs a publication date (an undated one is a landing, event or
 * product page, not an article); with `since` (YYYY-MM-DD), one dated before
 * the window (less the slack) is dropped. One whose page is neither the
 * company's own nor a known publication's is kept at low confidence. One
 * telling a story already held (`sameStory`) is dropped, unless it is the
 * first page vouching for a story held only from unconfirmed sources: that
 * one is kept, and its summary says what it confirms (owner's call,
 * 2026-10-30). Given a `KnownLearnings`, what is kept is added to it.
 */
export function checkLearnings(raw: unknown, topic: string, known: readonly (Pick<LearningRow, 'url' | 'title'> & { summary?: string | null })[] | KnownLearnings, opts: { since?: string } = {}): { kept: Omit<LearningRow, 'id' | 'found_at' | 'status' | 'consultation_id'>[]; dropped: string[]; verdicts: LearningVerdict[] } {
  const floor = opts.since && /^\d{4}-\d{2}-\d{2}$/.test(opts.since) ? new Date(Date.parse(opts.since) - WINDOW_SLACK_DAYS * 24 * 60 * 60_000).toISOString().slice(0, 10) : null;
  const kept: Omit<LearningRow, 'id' | 'found_at' | 'status' | 'consultation_id'>[] = [];
  const verdicts: LearningVerdict[] = [];
  const held: KnownLearnings = 'urls' in known ? known : knownFrom(known);
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
    if (held.urls.has(url) || held.titles.has(titleKey(title))) {
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
    const kind = sourceKind({ url, title, summary });
    const words = titleWords(title);
    const sameAs = held.stories.filter((s) => sameStory(words, s.words));
    const confirms = sameAs.length && kind !== 'unconfirmed' && sameAs.every((s) => s.kind === 'unconfirmed') ? sameAs[0] : null;
    if (sameAs.length && !confirms) {
      // Its page tells a story held, so that page is known now too, whatever title it comes back under.
      held.urls.add(url);
      held.titles.add(titleKey(title));
      drop(`same story as "${sameAs[0].title}".`);
      continue;
    }
    rememberLearning(held, { url, title, summary });
    const claimed = ['low', 'medium', 'high'].includes(clip(item?.confidence, 10)) ? (clip(item?.confidence, 10) as LearningRow['confidence']) : 'low';
    kept.push({ topic, title, summary: confirms ? `Confirms "${confirms.title}", reported earlier by an unconfirmed source. ${summary}` : summary, why_it_matters: clip(item?.why_it_matters, 600) || null, action: clip(item?.action, 400) || null, url, source: clip(item?.source, 120) || new URL(url).hostname, published_at: published, confidence: sourcedConfidence(kind, claimed) });
    verdicts.push({ kept: true, reason: confirms ? `${title}: kept as confirming "${confirms.title}", which came from an unconfirmed source.` : kind === 'unconfirmed' ? `${title}: kept as an ${sourceNote(kind, url)}, at low confidence.` : null });
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
  /** How many topics at once (default RESEARCH_CONCURRENCY). */
  concurrency?: number;
}

/** The topics, least recently researched first (never researched before any): the log's research asks give the dates. */
export function researchOrder(topics: readonly Topic[], consultations: readonly Pick<ConsultationRow, 'purpose' | 'question' | 'created_at'>[]): Topic[] {
  const last = new Map<string, string>();
  for (const c of consultations) {
    const key = c.purpose === 'research' ? (c.question as { topic?: unknown }).topic : undefined;
    if (typeof key === 'string' && (last.get(key) ?? '') < c.created_at) last.set(key, c.created_at);
  }
  // Array.prototype.sort is stable: topics never asked keep their listed order.
  return [...topics].sort((a, b) => (last.get(a.key) ?? '').localeCompare(last.get(b.key) ?? ''));
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
  let asked: ConsultationRow[] = [];
  try {
    asked = await readConsultations(db, 60);
  } catch (err) {
    console.error('Agent research order: could not read the log, using the topics as listed:', err instanceof Error ? err.message : err);
  }
  const queue = researchOrder(topics, asked);
  // One record of what is held for the whole pass: every topic's answer is checked against every
  // topic's learnings, and against what the other topics keep this pass (checkLearnings adds those).
  let recent: LearningRow[] = [];
  try {
    recent = await readLearnings(db, { since: new Date(opts.now.getTime() - HELD_DAYS * 24 * 60 * 60_000).toISOString(), limit: HELD_LIMIT });
  } catch (err) {
    console.error('Agent research: could not read the learnings held, so each topic is checked against its own only:', err instanceof Error ? err.message : err);
  }
  const held = knownFrom(recent);
  const researchOne = async (topic: Topic) => {
    if (Date.now() > opts.deadline - 60_000) {
      report.skipped[topic.key] = 'The pass ran out of time before this topic.';
      return;
    }
    const known = await readLearnings(db, { topic: topic.key, limit: KNOWN_LIMIT });
    for (const k of known) rememberLearning(held, k);
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
    const { kept, dropped, verdicts } = result.parsed ? checkLearnings(result.parsed, topic.key, held, { since }) : { kept: [], dropped: [] as string[], verdicts: [] as LearningVerdict[] };
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
  };
  const workers = Array.from({ length: Math.min(opts.concurrency ?? RESEARCH_CONCURRENCY, queue.length) }, async () => {
    for (let topic = queue.shift(); topic; topic = queue.shift()) {
      try {
        await researchOne(topic);
      } catch (err) {
        report.skipped[topic.key] = err instanceof Error ? err.message : String(err);
      }
    }
  });
  await Promise.all(workers);
  return report;
}
