import { executeTool, findKey } from '../composio.js';
import { PermanentStepError, type StepContext } from '../types.js';
import { timeBudget } from './social.js';

/**
 * AI answers Current (Search): what Google's AI Mode answers, live, when
 * someone asks for the business's category in its city, and what it says
 * about the business by name. The ai_search step measures whether the
 * assistants can read and cite the site (and Ahrefs' prompt set); this one
 * records the answers themselves: who is named, in what order, how the
 * business is described, and which sources are cited.
 *
 * Three questions at most (SerpApi bills each fresh answer): the category in
 * the city, the measured search with the most demand phrased for the city,
 * and the business by name. SerpApi's `google_ai_mode` engine first; Google's
 * own answer changes by the hour, so each answer carries its time.
 */

export interface AiAnswer {
  prompt: string;
  purpose: 'category' | 'search' | 'brand';
  provider: string | null;
  named: boolean;
  /** Its place among the businesses the answer lists (1 = first), when it lists any. */
  position: number | null;
  /** The business the answer leads with. */
  top: string | null;
  businesses_named: string[];
  competitors_named: string[];
  /** The answer's own words about the business. */
  description: string | null;
  rating: number | null;
  reviews: number | null;
  references: { title: string; link: string | null; source: string | null }[];
  answered_at: string | null;
  error: string | null;
}

export interface AiAnswersOutput {
  source: string;
  fetched_at: string;
  answers: AiAnswer[];
  summary: { asked: number; answered: number; named: number; led: number };
  note: string;
}

export const isAiAnswersOutput = (x: unknown): x is AiAnswersOutput => Boolean(x && typeof x === 'object' && Array.isArray((x as AiAnswersOutput).answers) && (x as AiAnswersOutput).summary);

const s = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const message = (err: unknown) => (err instanceof Error ? err.message : String(err));
const fold = (t: string) => t.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').replace(/\b(the|llc|inc|co)\b/g, ' ').replace(/\s+/g, ' ').trim();
const sameName = (a: string, b: string) => {
  const x = fold(a);
  const y = fold(b);
  return Boolean(x && y) && (x === y || x.includes(y) || y.includes(x));
};

interface Block {
  type?: string;
  snippet?: string;
  list?: Block[];
  local_result?: { title?: string; rating?: number; reviews?: number };
  formatted?: Record<string, unknown>[];
  table?: unknown[][];
}

/** The businesses an AI Mode answer lists, in its order: its local results, then the names in its tables. */
function listed(blocks: Block[]): { name: string; rating: number | null; reviews: number | null; text: string }[] {
  const out: { name: string; rating: number | null; reviews: number | null; text: string }[] = [];
  const add = (name: string | null, rating: number | null, reviews: number | null, text: string) => {
    if (!name) return;
    const known = out.find((o) => sameName(o.name, name));
    if (!known) return void out.push({ name, rating, reviews, text });
    // A table row names it first; its local result, further down, carries the rating and the description.
    known.rating ??= rating;
    known.reviews ??= reviews;
    if (text && (!known.text || /^Address:|^What to expect:/i.test(text))) known.text = text;
  };
  const walk = (list: Block[]) => {
    for (const b of list) {
      if (b.local_result?.title) {
        const text = (b.list ?? []).map((x) => s(x.snippet)).filter(Boolean).join(' ');
        add(b.local_result.title, n(b.local_result.rating), n(b.local_result.reviews), text);
      }
      if (Array.isArray(b.formatted)) for (const row of b.formatted) add(s(row.name), null, null, Object.values(row).filter((v) => typeof v === 'string').join(' · '));
      if (Array.isArray(b.list)) walk(b.list);
    }
  };
  walk(blocks);
  return out;
}

/** One AI Mode answer (SerpApi's shape) read for the business and its competitors. */
export function readAiModeAnswer(payload: unknown, business: string, competitors: string[]): Omit<AiAnswer, 'prompt' | 'purpose' | 'provider' | 'error'> {
  const blocks = (findKey<Block[]>(payload, 'text_blocks') ?? []) as Block[];
  const markdown = s(findKey(payload, 'reconstructed_markdown')) ?? blocks.map((b) => s(b.snippet) ?? '').join('\n');
  const refs = (findKey<Record<string, unknown>[]>(payload, 'references') ?? []).map((r) => ({ title: s(r.title) ?? '', link: s(r.link), source: s(r.source) })).filter((r) => r.title);
  const people = listed(blocks);
  const names = [...people.map((p) => p.name), ...refs.map((r) => r.title).filter((t) => !people.some((p) => sameName(p.name, t)))];
  const mine = people.find((p) => sameName(p.name, business));
  const lead = blocks.find((b) => b.type === 'paragraph' && s(b.snippet));
  const top = lead ? (people.find((p) => fold(lead.snippet!).includes(fold(p.name)))?.name ?? null) : people[0]?.name ?? null;
  const index = people.findIndex((p) => sameName(p.name, business));
  const named = Boolean(mine) || fold(markdown).includes(fold(business)) || refs.some((r) => sameName(r.title, business));
  const at = s(findKey(findKey(payload, 'search_metadata'), 'created_at'));
  return {
    named,
    position: index >= 0 ? index + 1 : null,
    top,
    businesses_named: names.slice(0, 10),
    competitors_named: competitors.filter((c) => names.some((x) => sameName(x, c)) || fold(markdown).includes(fold(c))),
    description: mine?.text ? mine.text.replace(/^Address:[^.]*?(?=What|$)/i, '').replace(/\s+/g, ' ').trim().slice(0, 300) || null : null,
    rating: mine?.rating ?? null,
    reviews: mine?.reviews ?? null,
    references: refs.slice(0, 6),
    answered_at: at,
  };
}

/** The questions to ask: the category in the city, the busiest measured search for the city, the business by name. */
export function aiPrompts(business: string, city: string | null, category: string | null, topSearch: string | null): { prompt: string; purpose: AiAnswer['purpose'] }[] {
  const town = city ? city.split(',')[0].trim() : null;
  const out: { prompt: string; purpose: AiAnswer['purpose'] }[] = [];
  if (category && town) out.push({ prompt: `best ${category.toLowerCase()} in ${town}`, purpose: 'category' });
  if (topSearch && town) {
    const q = /near me/i.test(topSearch) ? topSearch.replace(/\s*near me\s*/i, ` in ${town} `).trim() : fold(topSearch).includes(fold(town)) ? topSearch : `${topSearch} in ${town}`;
    if (!out.some((o) => fold(o.prompt) === fold(q))) out.push({ prompt: q, purpose: 'search' });
  }
  out.push({ prompt: town ? `${business} ${town}` : business, purpose: 'brand' });
  return out.slice(0, 3);
}

const READ_MS = 60_000;

export async function runAiAnswers(ctx: StepContext): Promise<AiAnswersOutput> {
  const { audit } = ctx;
  const profile = (ctx.outputs.competitors as { profile?: { category?: string | null } } | undefined)?.profile;
  const listing = (ctx.outputs.maps as { business?: { category?: string | null } | null } | undefined)?.business;
  const ideas = ((ctx.outputs.keywords as { ideas?: { keyword: string; monthly_searches: number | null }[] } | undefined)?.ideas ?? []).filter((k) => typeof k.monthly_searches === 'number');
  const topSearch = ideas.sort((a, b) => (b.monthly_searches ?? 0) - (a.monthly_searches ?? 0))[0]?.keyword ?? null;
  const category = (profile?.category ?? listing?.category ?? null)?.split(/[,/(]/)[0].trim() ?? null;
  const prompts = aiPrompts(audit.business_name, audit.city, category, topSearch);
  const competitors = audit.competitors.map((c) => c.name);
  const location = audit.city ? `${audit.city}, United States` : undefined;

  const answers = await Promise.all(
    prompts.map(async (p): Promise<AiAnswer> => {
      const base = { prompt: p.prompt, purpose: p.purpose };
      const ask = (args: Record<string, unknown>) => executeTool('SERPAPI_QUERY_GOOGLE_AI_MODE', { query: p.prompt, country_code: 'us', ...args }, timeBudget(ctx, READ_MS));
      try {
        let payload: unknown;
        try {
          payload = await ask(location ? { location } : {});
        } catch (err) {
          if (err instanceof PermanentStepError || !location || !/location/i.test(message(err))) throw err;
          payload = await ask({});
        }
        return { ...base, provider: 'SerpApi (Google AI Mode)', ...readAiModeAnswer(payload, audit.business_name, competitors), error: null };
      } catch (err) {
        if (err instanceof PermanentStepError) throw err;
        return { ...base, provider: null, named: false, position: null, top: null, businesses_named: [], competitors_named: [], description: null, rating: null, reviews: null, references: [], answered_at: null, error: message(err).slice(0, 200) };
      }
    })
  );
  const answered = answers.filter((a) => !a.error);
  if (!answered.length) throw new Error(`Google AI Mode could not be read: ${answers[0]?.error ?? 'no questions'}`);
  return {
    source: 'Google AI Mode answers, via SerpApi through Composio',
    fetched_at: new Date().toISOString(),
    answers,
    summary: { asked: answers.length, answered: answered.length, named: answered.filter((a) => a.named).length, led: answered.filter((a) => a.top && sameName(a.top, audit.business_name)).length },
    note: 'Each answer is Google AI Mode’s at the time shown, for the location given; the same question can be answered differently an hour later. Being named is not a ranking, and no traffic figure follows from it.',
  };
}
