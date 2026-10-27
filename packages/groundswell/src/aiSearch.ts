/**
 * AI search (generative engine optimization): the rules in code for whether a
 * website can be read and cited by the assistants that answer questions
 * (ChatGPT, Perplexity, Gemini and Google's AI Overviews, Copilot, Claude).
 *
 * Everything here is pure: the app's step (api/_lib/groundswell/currents/
 * aiSearch.ts) fetches robots.txt, the llms files, the sitemap and the
 * homepage as an AI crawler would, reads Ahrefs Brand Radar, and hands the
 * evidence to these functions. The score is a transparent rubric (every check
 * is listed with its points and what was observed), never a verdict on
 * rankings; a check the evidence cannot answer is named as unknown and left
 * out of the denominator rather than guessed.
 */

/** The crawlers that feed AI answers, with what each one is for. Googlebot and Bingbot stay listed: AI Overviews and Copilot read through them. */
export const AI_CRAWLERS = [
  { agent: 'GPTBot', vendor: 'OpenAI', purpose: 'the index behind ChatGPT’s answers and model training' },
  { agent: 'OAI-SearchBot', vendor: 'OpenAI', purpose: 'ChatGPT search results (citations and links)' },
  { agent: 'ChatGPT-User', vendor: 'OpenAI', purpose: 'a page ChatGPT opens while answering one person' },
  { agent: 'ClaudeBot', vendor: 'Anthropic', purpose: 'Claude’s index' },
  { agent: 'PerplexityBot', vendor: 'Perplexity', purpose: 'Perplexity’s index and citations' },
  { agent: 'Google-Extended', vendor: 'Google', purpose: 'Gemini and Google’s AI products beyond Search' },
  { agent: 'Googlebot', vendor: 'Google', purpose: 'Google Search and AI Overviews' },
  { agent: 'Bingbot', vendor: 'Microsoft', purpose: 'Bing and Copilot' },
  { agent: 'CCBot', vendor: 'Common Crawl', purpose: 'the open crawl many models are trained on' },
] as const;
export type AiCrawler = (typeof AI_CRAWLERS)[number]['agent'];

export type RobotsVerdict = 'allowed' | 'blocked' | 'restricted' | 'no_robots';

export interface RobotsAccess {
  agent: string;
  /** The user-agent line the crawler's rules came from ("*" for the default group; null without robots.txt). */
  group: string | null;
  verdict: RobotsVerdict;
  /** The group's Disallow paths, as written. */
  disallows: string[];
}

interface RobotsGroup {
  agents: string[];
  allows: string[];
  disallows: string[];
}

/** The groups of a robots.txt file (RFC 9309 reading: a run of User-agent lines shares the rules that follow). */
export function parseRobots(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let collectingAgents = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const field = m[1].toLowerCase();
    const value = m[2].trim();
    if (field === 'user-agent') {
      if (!current || !collectingAgents) {
        current = { agents: [], allows: [], disallows: [] };
        groups.push(current);
        collectingAgents = true;
      }
      current.agents.push(value.toLowerCase());
    } else if (field === 'allow' || field === 'disallow') {
      if (!current) continue;
      collectingAgents = false;
      if (field === 'allow') current.allows.push(value);
      else current.disallows.push(value);
    } else {
      // Sitemap, Crawl-delay and the like end the agent run but keep the group.
      collectingAgents = false;
    }
  }
  return groups;
}

const matchesPath = (rule: string, path: string) => {
  if (rule === '') return false;
  const anchored = rule.endsWith('$');
  const body = anchored ? rule.slice(0, -1) : rule;
  const pattern = body.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${pattern}${anchored ? '$' : ''}`).test(path);
};

/**
 * What robots.txt says to one crawler about one path (the homepage by
 * default): the most specific user-agent group wins (the crawler's own name
 * over "*"), and within it the longest matching rule, allow over disallow at
 * equal length. "restricted" means the crawler may read this path but the
 * group keeps it out of others.
 */
export function robotsAccess(text: string | null, agent: string, path = '/'): RobotsAccess {
  if (text === null) return { agent, group: null, verdict: 'no_robots', disallows: [] };
  const groups = parseRobots(text);
  const name = agent.toLowerCase();
  // A group's token matches the crawler whose name starts with it ("google" covers Google-Extended), never the other way round.
  const own = groups.filter((g) => g.agents.some((a) => a !== '*' && (name === a || name.startsWith(a))));
  const star = groups.filter((g) => g.agents.includes('*'));
  const chosen = own.length ? own : star;
  if (!chosen.length) return { agent, group: null, verdict: 'allowed', disallows: [] };
  const allows = chosen.flatMap((g) => g.allows);
  const disallows = chosen.flatMap((g) => g.disallows);
  const group = own.length ? (chosen[0].agents.find((a) => a !== '*') ?? '*') : '*';
  const longest = (rules: string[]) => rules.filter((r) => matchesPath(r, path)).reduce((best, r) => (r.length > best.length ? r : best), '');
  const allow = longest(allows);
  const disallow = longest(disallows);
  const blocked = disallow.length > allow.length;
  return { agent, group, verdict: blocked ? 'blocked' : disallows.some((d) => d !== '') ? 'restricted' : 'allowed', disallows: disallows.filter((d) => d !== '') };
}

/** Security headers an AI crawler and a browser both benefit from; absent ones are named, never scored. */
export const SECURITY_HEADERS = ['strict-transport-security', 'content-security-policy', 'content-security-policy-report-only', 'x-content-type-options', 'referrer-policy', 'permissions-policy'] as const;

// ---------------------------------------------------------------------------
// Citability

/** What a page offers an assistant that is choosing a source; null means the evidence did not say. */
export interface PageSignals {
  url: string;
  path: string;
  title: string | null;
  description: string | null;
  h1: string | null;
  headings: string[];
  word_count: number | null;
  /** The opening of the main content, as read. */
  excerpt: string | null;
  /** Prices or figures as written on the page. */
  facts: string[];
  ctas: number | null;
  /** Whether the page carries JSON-LD; null for pages read as text only. */
  json_ld: boolean | null;
  /** Whether the initial HTML carries the content without JavaScript; null when not fetched raw. */
  readable_without_js: boolean | null;
  /** Whether the page declares a canonical URL; null when unknown. */
  canonical: boolean | null;
}

export interface CitabilityCheck {
  key: string;
  label: string;
  points: number;
  earned: number;
  /** What was observed, in words a developer can act on. */
  note: string;
}

export interface PageScore {
  url: string;
  path: string;
  /** 0–100 over the checks the evidence could answer. */
  score: number;
  /** The points available on this page (the unknown checks are left out). */
  available: number;
  checks: CitabilityCheck[];
  /** Checks the evidence could not answer for this page. */
  unknown: string[];
}

const QUESTION_WORD = /^(?:how|what|where|when|why|which|who|can|do|does|is|are|should|will)\b/i;
const isQuestion = (h: string) => /\?\s*$/.test(h) || QUESTION_WORD.test(h.trim());
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);
const firstSentence = (s: string) => (s.replace(/\s+/g, ' ').match(/^[^.!?]+[.!?]/)?.[0] ?? s.replace(/\s+/g, ' ').slice(0, 300)).trim();

/** The rubric, in the order the report prints it: 100 points when every check can be answered. */
export const CITABILITY_RUBRIC = [
  { key: 'answer_first', label: 'Answer-first opening', points: 15 },
  { key: 'questions', label: 'Question-style headings', points: 10 },
  { key: 'depth', label: 'Enough words to quote', points: 15 },
  { key: 'facts', label: 'Specific facts and figures', points: 10 },
  { key: 'faq', label: 'Questions answered on the page', points: 10 },
  { key: 'title', label: 'Title and description', points: 10 },
  { key: 'cta', label: 'A next step', points: 5 },
  { key: 'json_ld', label: 'Structured data (JSON-LD)', points: 10 },
  { key: 'no_js', label: 'Readable without JavaScript', points: 10 },
  { key: 'canonical', label: 'A canonical URL', points: 5 },
] as const;

/** One page scored against the rubric; checks the signals cannot answer are listed as unknown. */
export function scorePage(p: PageSignals): PageScore {
  const checks: CitabilityCheck[] = [];
  const unknown: string[] = [];
  const add = (key: (typeof CITABILITY_RUBRIC)[number]['key'], earned: number | null, note: string) => {
    const rule = CITABILITY_RUBRIC.find((r) => r.key === key)!;
    if (earned === null) unknown.push(rule.label);
    else checks.push({ key, label: rule.label, points: rule.points, earned: Math.max(0, Math.min(rule.points, Math.round(earned))), note });
  };

  if (p.excerpt === null) add('answer_first', null, 'The opening was not read.');
  else {
    const opening = firstSentence(p.excerpt);
    const n = words(opening).length;
    const names = p.h1 ? words(p.h1).some((w) => w.length > 3 && opening.toLowerCase().includes(w.toLowerCase())) : false;
    const ok = n >= 8 && n <= 45;
    add('answer_first', ok ? (names ? 15 : 10) : n > 45 ? 5 : 0, `The first sentence has ${n} words${names ? ' and names the page’s subject' : ''}: “${opening.slice(0, 140)}${opening.length > 140 ? '…' : ''}”`);
  }

  const questions = p.headings.filter(isQuestion);
  add('questions', questions.length >= 2 ? 10 : questions.length === 1 ? 6 : 0, questions.length ? `${questions.length} heading${questions.length === 1 ? '' : 's'} asks a question (“${questions[0]}”).` : `${p.headings.length} headings, none phrased as a question.`);

  if (p.word_count === null) add('depth', null, 'The word count was not read.');
  else add('depth', p.word_count >= 300 ? 15 : p.word_count >= 150 ? 8 : p.word_count >= 60 ? 3 : 0, `${p.word_count} words of main content.`);

  const inText = p.excerpt ? (p.excerpt.match(/\$\s?\d|\b\d{1,2}(?::\d{2})?\s?(?:am|pm)\b|\b\d{4}\b|\b\d+\s?(?:%|minutes?|hours?|days?|years?|miles?|taps?|seats?)\b/gi) ?? []).length : 0;
  const figures = p.facts.length + inText;
  add('facts', figures >= 3 ? 10 : figures > 0 ? 6 : 0, figures ? `${figures} figure${figures === 1 ? '' : 's'} on the page${p.facts.length ? ` (${p.facts.slice(0, 3).join(', ')})` : ''}.` : 'No prices, times or counts in the content read.');

  const faq = p.headings.some((h) => /\bfaq|frequently asked|questions\b/i.test(h)) || questions.length >= 2;
  add('faq', faq ? 10 : questions.length === 1 ? 4 : 0, faq ? 'The page answers questions in its own headings.' : 'No FAQ or question-and-answer block was found.');

  add('title', (p.title ? 5 : 0) + (p.description ? 5 : 0), `${p.title ? 'Title present' : 'No title'}; ${p.description ? 'description present' : 'no meta description'}.`);

  if (p.ctas === null) add('cta', null, 'Calls to action were not read.');
  else add('cta', p.ctas > 0 ? 5 : 0, p.ctas ? `${p.ctas} call${p.ctas === 1 ? '' : 's'} to action.` : 'No call to action in the content read.');

  if (p.json_ld === null) add('json_ld', null, 'JSON-LD was not read for this page.');
  else add('json_ld', p.json_ld ? 10 : 0, p.json_ld ? 'JSON-LD present in the initial HTML.' : 'No JSON-LD in the initial HTML.');

  if (p.readable_without_js === null) add('no_js', null, 'The raw HTML was not fetched for this page.');
  else add('no_js', p.readable_without_js ? 10 : 0, p.readable_without_js ? 'The initial HTML carries the content.' : 'The initial HTML is an app shell: the content arrives with JavaScript, which most AI crawlers do not run.');

  if (p.canonical === null) add('canonical', null, 'The canonical link was not read for this page.');
  else add('canonical', p.canonical ? 5 : 0, p.canonical ? 'A canonical URL is declared.' : 'No canonical link.');

  const available = checks.reduce((a, c) => a + c.points, 0);
  const earned = checks.reduce((a, c) => a + c.earned, 0);
  return { url: p.url, path: p.path, score: available ? Math.round((earned / available) * 100) : 0, available, checks, unknown };
}

// ---------------------------------------------------------------------------
// The site-level evidence and the improvements drawn from it

export interface EntityEvidence {
  /** Every @type in the homepage's JSON-LD. */
  types: string[];
  has_organization: boolean;
  has_local_business: boolean;
  has_id: boolean;
  same_as: string[];
  has_address: boolean;
  telephone: string | null;
  has_opening_hours: boolean;
  has_faq: boolean;
}

export interface AiVisibilitySummary {
  source: string;
  assistants: string[];
  business: { name: string; mentions: number | null; share_of_voice: number | null };
  competitors: { name: string; mentions: number | null; share_of_voice: number | null }[];
  /** Questions where the business or a competitor was named, with who was cited. */
  prompts: { question: string; assistant: string; volume: number | null; names_business: boolean; cited: string[] }[];
  /** The domains the assistants cite in those answers, most cited first. */
  cited_domains: { domain: string; responses: number; pages: number }[];
  /** How often each platform cites the business's own site (Ahrefs Site Explorer). */
  citations: { platform: string; citations: number; pages: number }[];
  error: string | null;
}

export interface AiSearchEvidence {
  website: string | null;
  /** The homepage's technical reading: null when the site was not fetched. */
  crawlers: {
    robots_found: boolean;
    agents: RobotsAccess[];
    /** The homepage fetched as GPTBot: status and whether it differed from the ordinary fetch. */
    gptbot_fetch: { status: number | null; blocked: boolean; note: string } | null;
  };
  files: {
    /** bytes is null when the file exists but is larger than the read cap. */
    llms_txt: { url: string; found: boolean; bytes: number | null };
    llms_full_txt: { url: string; found: boolean; bytes: number | null };
    sitemap: { url: string; found: boolean; urls: number };
  } | null;
  entity: EntityEvidence | null;
  /** Name, address and phone as the site and the Google listing state them. */
  nap: { site_phones: string[]; listing_phone: string | null; listing_name: string | null; site_name: string | null; consistent: boolean | null };
  headers: { present: string[]; missing: string[] } | null;
  pages: PageScore[];
  /** Words on the pages that assert something the sources did not confirm ("award-winning", "voted best", "#1"). */
  claims: { path: string; phrase: string }[];
  visibility: AiVisibilitySummary | null;
}

export interface Improvement {
  priority: 'high' | 'medium' | 'low';
  area: 'crawlers' | 'files' | 'entity' | 'content' | 'headers' | 'visibility';
  title: string;
  evidence: string;
  action: string;
}

const CLAIM_WORDS = /\baward[- ]winning\b|\bvoted (?:the )?best\b|#\s?1\b|\bnumber one\b|\bbest in (?:town|the (?:city|state|area|country))\b|\btop[- ]rated\b|\b5[- ]star rated\b|\bhighest[- ]rated\b|\bofficially licensed partner\b/gi;

/** Phrases on a page that assert a rating, award or ranking the fact sheet would need to back. */
export function unsupportedClaims(path: string, text: string | null): { path: string; phrase: string }[] {
  if (!text) return [];
  return [...new Set((text.match(CLAIM_WORDS) ?? []).map((m) => m.trim()))].map((phrase) => ({ path, phrase }));
}

/** The improvements the evidence supports, highest priority first; each names what was seen and what to do. */
export function improvementsFrom(e: AiSearchEvidence): Improvement[] {
  const out: Improvement[] = [];
  const blocked = e.crawlers.agents.filter((a) => a.verdict === 'blocked');
  if (blocked.length) {
    out.push({ priority: 'high', area: 'crawlers', title: `robots.txt blocks ${blocked.map((a) => a.agent).join(', ')}`, evidence: blocked.map((a) => `${a.agent}: group “${a.group}” disallows ${a.disallows.join(', ') || '/'}`).join('; '), action: 'Allow the AI crawlers in robots.txt (keep any private paths disallowed), unless the owner chooses to stay out of AI answers.' });
  }
  if (e.crawlers.gptbot_fetch?.blocked) {
    out.push({ priority: 'high', area: 'crawlers', title: 'The homepage answers an AI crawler differently', evidence: e.crawlers.gptbot_fetch.note, action: 'Check the host, CDN or firewall rules for user-agent blocking and let the listed AI crawlers through.' });
  }
  if (e.files) {
    if (!e.files.llms_txt.found) out.push({ priority: 'medium', area: 'files', title: 'No llms.txt', evidence: `${e.files.llms_txt.url} was not found.`, action: 'Generate /llms.txt and /llms-full.txt from the same source as the pages: what the business is, where it is, its hours, its services, and links to the pages that answer each question.' });
    else if (!e.files.llms_full_txt.found) out.push({ priority: 'low', area: 'files', title: 'No llms-full.txt', evidence: `${e.files.llms_txt.url} exists; ${e.files.llms_full_txt.url} was not found.`, action: 'Add /llms-full.txt with the full text of the pages llms.txt links to, generated from the same source.' });
    if (!e.files.sitemap.found) out.push({ priority: 'medium', area: 'files', title: 'No sitemap found', evidence: `${e.files.sitemap.url} was not found or had no URLs.`, action: 'Publish a sitemap of the live, canonical pages only (no redirected or disabled URLs) and list it in robots.txt.' });
  }
  const pageMissingSchema = e.pages.filter((p) => p.checks.some((c) => c.key === 'json_ld' && c.earned === 0));
  if (e.entity) {
    if (!e.entity.has_local_business && !e.entity.has_organization) out.push({ priority: 'high', area: 'entity', title: 'No Organization or LocalBusiness schema', evidence: e.entity.types.length ? `JSON-LD types seen: ${e.entity.types.join(', ')}.` : 'The homepage carries no JSON-LD.', action: 'Add one entity graph with the right LocalBusiness subtype and a stable @id, with name, address, telephone, URL and the hours from the source of truth.' });
    else {
      if (!e.entity.has_id) out.push({ priority: 'medium', area: 'entity', title: 'The entity has no stable @id', evidence: `Schema types: ${e.entity.types.join(', ')}; no @id on the organization node.`, action: 'Give the Organization or LocalBusiness node a stable @id (the site’s URL with #organization) and reference it from every page’s WebPage and BreadcrumbList.' });
      if (!e.entity.has_address || !e.entity.telephone) out.push({ priority: 'medium', area: 'entity', title: 'The entity lacks address or telephone', evidence: `${e.entity.has_address ? 'Address present' : 'No address'}; ${e.entity.telephone ? `telephone ${e.entity.telephone}` : 'no telephone'}.`, action: 'Add the postal address and telephone exactly as the Google Business Profile states them.' });
      if (!e.entity.has_opening_hours) out.push({ priority: 'medium', area: 'entity', title: 'No openingHoursSpecification', evidence: 'The entity schema has no opening hours.', action: 'Add the hours from the source of truth (the Google Business Profile or the system the owner keeps them in), generated, never typed twice.' });
      if (!e.entity.same_as.length) out.push({ priority: 'low', area: 'entity', title: 'No sameAs profile links', evidence: 'The entity schema lists no profiles.', action: 'Add sameAs for the profiles the owner confirms it owns (Google Business Profile, Instagram, Facebook, Yelp and the like); never a profile that is not theirs.' });
    }
  } else if (pageMissingSchema.length) {
    out.push({ priority: 'high', area: 'entity', title: 'No structured data on the homepage', evidence: 'The homepage’s initial HTML has no JSON-LD.', action: 'Add an entity graph (LocalBusiness subtype, @id, address, telephone, hours, sameAs) and a WebPage node per page.' });
  }
  if (e.nap.consistent === false) {
    out.push({ priority: 'high', area: 'entity', title: 'The site and the Google listing disagree on the phone number', evidence: `Site: ${e.nap.site_phones.join(', ') || 'none'}; Google listing: ${e.nap.listing_phone ?? 'none'}.`, action: 'Settle one number with the owner and use it everywhere: the site, the schema, the Google Business Profile and every directory.' });
  }
  const shells = e.pages.filter((p) => p.checks.some((c) => c.key === 'no_js' && c.earned === 0));
  if (shells.length) out.push({ priority: 'high', area: 'content', title: 'The page is an app shell without JavaScript', evidence: `${shells.map((p) => p.path).join(', ')}: the initial HTML has no content.`, action: 'Prerender or server-render the public pages so the core facts are in the HTML a non-JavaScript crawler receives.' });
  const thin = e.pages.filter((p) => p.checks.some((c) => c.key === 'depth' && c.earned < 8));
  if (thin.length) out.push({ priority: 'medium', area: 'content', title: `${thin.length} page${thin.length === 1 ? '' : 's'} too thin to quote`, evidence: thin.slice(0, 6).map((p) => `${p.path} (${p.checks.find((c) => c.key === 'depth')?.note ?? ''})`).join('; '), action: 'Rewrite each with an answer-first opening, question-style headings, the facts from the fact sheet, and self-contained blocks of 130 to 170 words.' });
  const noQuestions = e.pages.filter((p) => p.checks.some((c) => c.key === 'questions' && c.earned === 0));
  if (noQuestions.length && noQuestions.length >= Math.ceil(e.pages.length / 2)) out.push({ priority: 'medium', area: 'content', title: 'Headings do not match how people ask', evidence: `${noQuestions.length} of ${e.pages.length} pages read have no question-style heading.`, action: 'Add headings in the words people use when they ask an assistant (“How much does … cost?”, “Where is …?”), each followed by a direct answer, and an FAQ that matches the visible content.' });
  if (e.claims.length) out.push({ priority: 'high', area: 'content', title: 'Claims the fact sheet must back or the copy must drop', evidence: e.claims.slice(0, 8).map((c) => `${c.path}: “${c.phrase}”`).join('; '), action: 'Trace each to a source (the award, the review platform, the ranking). What has no source comes out of the copy, the schema and the meta tags.' });
  if (e.headers && e.headers.missing.length) out.push({ priority: 'low', area: 'headers', title: `Security headers missing: ${e.headers.missing.join(', ')}`, evidence: `Present: ${e.headers.present.join(', ') || 'none'}.`, action: 'Add HSTS, X-Content-Type-Options and Referrer-Policy; start a Content-Security-Policy in report-only mode built from the sources the live site loads, with a collector that aggregates and never stores IPs or user agents. Never turn enforcement on from an audit.' });
  const v = e.visibility;
  if (v && !v.error) {
    const own = v.citations.find((c) => c.platform === 'all_platforms');
    if ((v.business.mentions ?? 0) === 0 && (!own || own.citations === 0)) {
      const leaders = v.competitors.filter((c) => (c.mentions ?? 0) > 0).sort((a, b) => (b.mentions ?? 0) - (a.mentions ?? 0)).slice(0, 3);
      out.push({ priority: 'high', area: 'visibility', title: 'The assistants do not name or cite the business today', evidence: `${v.business.mentions ?? 0} mentions and ${own?.citations ?? 0} citations across ${v.assistants.join(', ')}${leaders.length ? `; ${leaders.map((c) => `${c.name} ${c.mentions}`).join(', ')} mentions` : ''}.`, action: 'Make the business citable where the answers come from: the pages the assistants cite for the category (below) and the business’s own pages written to answer those questions.' });
    }
    const directories = v.cited_domains.filter((d) => e.website && !d.domain.includes(new URL(e.website).hostname.replace(/^www\./, ''))).slice(0, 6);
    if (directories.length) out.push({ priority: 'medium', area: 'visibility', title: 'Be present on the sources the assistants cite', evidence: `Most cited for these questions: ${directories.map((d) => `${d.domain} (${d.responses} answers)`).join(', ')}.`, action: 'Claim or complete the business’s listing on each of these that applies, with the same name, address, phone and hours as the site.' });
  }
  const rank = { high: 0, medium: 1, low: 2 };
  return out.sort((a, b) => rank[a.priority] - rank[b.priority]);
}

/** The owner’s question list: every fact the copy asserts without a source, the profiles to confirm, the review source. */
export function ownerQuestions(e: AiSearchEvidence, profiles: string[]): string[] {
  const q: string[] = [];
  for (const c of e.claims) q.push(`On ${c.path} the copy says “${c.phrase}”. What is the source (the award, the platform, the ranking)? Without one it comes out.`);
  if (e.nap.consistent === false) q.push(`The site shows ${e.nap.site_phones.join(' and ')} and the Google listing shows ${e.nap.listing_phone}. Which phone number is right?`);
  if (e.nap.listing_name && e.nap.site_name && e.nap.listing_name.trim().toLowerCase() !== e.nap.site_name.trim().toLowerCase()) q.push(`The site names the business “${e.nap.site_name}” and the Google listing “${e.nap.listing_name}”. Which exact name goes in the schema?`);
  for (const p of profiles) q.push(`Is ${p} your profile? (Only profiles you own go in sameAs.)`);
  q.push('Which source should hours come from: the Google Business Profile, the booking system, or a facts file in the repo?');
  q.push('Reviews on the site: a weekly Google Places snapshot (its terms limit what may be stored), the Business Profile API, or no ratings at all? With no source there is no AggregateRating.');
  q.push('Which areas are off limits for the developer (payroll, billing, legal pages, auth, checkout)?');
  return q;
}

// ---------------------------------------------------------------------------
// The developer brief

export interface GeoBriefInput {
  business: { name: string; city: string | null; website: string | null };
  date: string;
  evidence: AiSearchEvidence;
  improvements: Improvement[];
  questions: string[];
  /** The profile URLs found on the site and the listing. */
  profiles: string[];
  /** The Google listing's facts, where read. */
  listing: { name: string | null; address: string | null; phone: string | null; hours: string | null; rating: number | null; reviews: number | null; url: string | null } | null;
  /** What the business does, from its own site. */
  profile: { category: string | null; services: string[] } | null;
  /** Who prepared the audit. */
  preparer: string;
}

const md = (s: string | null | undefined) => (s ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
const cell = (s: string | null | undefined) => md(s) || '–';
const row = (cells: (string | number | null | undefined)[]) => `| ${cells.map((c) => (typeof c === 'number' ? String(c) : cell(c))).join(' | ')} |`;
const tableMd = (head: string[], rows: (string | number | null | undefined)[][]) => [row(head), `|${head.map(() => ' --- ').join('|')}|`, ...rows.map(row)].join('\n');
const yes = (b: boolean | null | undefined) => (b === null || b === undefined ? 'not read' : b ? 'yes' : 'no');

/**
 * The developer file: a Markdown brief a developer (or an agent in the
 * site's repository) applies, with the baseline this run measured, the
 * improvements it supports, the owner's question list, and the phases and
 * rules of the work. Nothing in it is invented: every figure is from the
 * evidence, and every fact the copy would need is on the question list.
 */
export function buildGeoBrief(i: GeoBriefInput): string {
  const e = i.evidence;
  const site = i.business.website ?? '{{SITE_URL}}';
  const name = i.business.name;
  const v = e.visibility;
  const own = v?.citations.find((c) => c.platform === 'all_platforms');
  const lines: string[] = [];
  const h = (level: number, text: string) => lines.push('', `${'#'.repeat(level)} ${text}`, '');
  const p = (text: string) => lines.push(text, '');
  const list = (items: string[]) => lines.push(...items.map((x) => `- ${x}`), '');

  lines.push(`# GEO audit and factual site improvements: ${name} (${site})`, '', `Prepared by ${i.preparer} from the ${name} audit of ${i.date}. Hand this file to the developer or the agent that works in the site’s repository. It is a brief, not a verdict: every number below is what the audit measured on that date, and the sources are named.`, '');

  h(2, 'Inputs (the owner fills these in before the work starts)');
  list([
    `Site: ${site}`,
    'Code: {{OWNER/REPO}}, or "no repo, CMS = {{WordPress / Shopify / Squarespace / Webflow / other}}"',
    `Sources of truth the owner trusts: {{for example the Google Business Profile for hours, the booking or menu system, a facts JSON in the repo}}${i.listing?.url ? ` (the Google listing read by this audit: ${i.listing.url})` : ''}`,
    `Official profiles the owner confirms: ${i.profiles.length ? i.profiles.join(', ') : '{{Google Business Profile, Instagram, Facebook, …}}'} (confirm each; see the question list)`,
    'Off-limits areas: {{for example payroll, billing, legal pages, auth, checkout}}',
    'Who approves merges and production data writes: the owner',
  ]);

  h(2, 'Goal');
  p(`Make ${name} accurately visible and citable in AI answers (ChatGPT, Perplexity, Google AI Overviews, Claude, Copilot) and in classic search. Fix what crawlers actually receive, and never state anything that is not true.`);

  h(2, 'Ground rules');
  list([
    'Truth beats score. Every claim in copy, schema, llms.txt and meta tags traces to a source in the fact sheet. Never invent ratings, review counts or quotes; awards, "voted best" or partnerships; amenities, events, hours or prices.',
    'Unconfirmed facts stay out of the copy and go on the owner’s question list.',
    'No third-party audit code runs. The scoring rubric below is ported into the repo, reviewed, then run.',
    'Read the repo’s CLAUDE.md, CI and deploy configuration first, and find out whether merging deploys.',
    'Never: merge, turn on CSP enforcement, write to a production database directly, touch the off-limits areas.',
    'Draft PRs only; the owner merges. Content changes go through PRs (data migrations for database content; CMS revisions without a repo), never live writes.',
    'Report with [verified] and [assumed] tags, a baseline before the first change and the delta after each step, the rollback before any outward action, and unrelated findings parked as one-line follow-ups.',
  ]);

  h(2, `Baseline measured on ${i.date}`);
  h(3, 'AI crawler access (robots.txt)');
  p(e.crawlers.robots_found ? `robots.txt was read at ${site.replace(/\/$/, '')}/robots.txt.` : 'No robots.txt was found: every crawler is allowed by default.');
  lines.push(tableMd(['Crawler', 'Vendor', 'Verdict', 'Rules from', 'Disallowed paths'], e.crawlers.agents.map((a) => [a.agent, AI_CRAWLERS.find((c) => c.agent === a.agent)?.vendor ?? '', a.verdict.replace('_', ' '), a.group ?? '–', a.disallows.join(', ') || '–'])), '');
  if (e.crawlers.gptbot_fetch) p(`Homepage fetched as GPTBot: HTTP ${e.crawlers.gptbot_fetch.status ?? 'no answer'}. ${e.crawlers.gptbot_fetch.note}`);

  h(3, 'Files for assistants');
  if (e.files) lines.push(tableMd(['File', 'Found', 'Detail'], [
    ['/llms.txt', yes(e.files.llms_txt.found), e.files.llms_txt.found ? (e.files.llms_txt.bytes === null ? 'present, larger than the 1.5 MB read' : `${e.files.llms_txt.bytes} bytes`) : 'absent'],
    ['/llms-full.txt', yes(e.files.llms_full_txt.found), e.files.llms_full_txt.found ? (e.files.llms_full_txt.bytes === null ? 'present, larger than the 1.5 MB read' : `${e.files.llms_full_txt.bytes} bytes`) : 'absent'],
    ['/sitemap.xml', yes(e.files.sitemap.found), e.files.sitemap.found ? `${e.files.sitemap.urls} URLs listed` : 'absent'],
  ]), '');
  else p('The site’s files were not read (no website on the audit, or the site did not answer).');

  h(3, 'Entity, name, address and phone');
  if (e.entity) lines.push(tableMd(['Check', 'Observed'], [
    ['JSON-LD types on the homepage', e.entity.types.join(', ') || 'none'],
    ['Organization or LocalBusiness node', yes(e.entity.has_organization || e.entity.has_local_business)],
    ['Stable @id on the entity', yes(e.entity.has_id)],
    ['Postal address', yes(e.entity.has_address)],
    ['Telephone in schema', e.entity.telephone ?? 'none'],
    ['Opening hours in schema', yes(e.entity.has_opening_hours)],
    ['sameAs profiles', e.entity.same_as.join(', ') || 'none'],
    ['FAQPage schema', yes(e.entity.has_faq)],
  ]), '');
  lines.push(tableMd(['Source', 'Name', 'Phone'], [
    ['Website', e.nap.site_name, e.nap.site_phones.join(', ') || 'none found'],
    ['Google listing', e.nap.listing_name, e.nap.listing_phone ?? 'not read'],
  ]), '', `Phone consistent across the two: ${e.nap.consistent === null ? 'could not be compared' : e.nap.consistent ? 'yes' : 'no'}.`, '');
  if (i.listing) p(`Google listing as read: ${[i.listing.name, i.listing.address, i.listing.phone, i.listing.hours ? `hours ${i.listing.hours}` : null, i.listing.rating !== null ? `rating ${i.listing.rating} on ${i.listing.reviews ?? '?'} reviews` : null].filter(Boolean).join(' · ')}. Ratings are shown here as a reading, never to be hard-coded into the site.`);

  h(3, 'Security headers');
  p(e.headers ? `Present: ${e.headers.present.join(', ') || 'none'}. Missing: ${e.headers.missing.join(', ') || 'none'}.` : 'Not read.');

  h(3, 'Citability score per page');
  p(`The rubric (100 points when every check can be answered; a check the evidence could not answer is left out of that page’s denominator): ${CITABILITY_RUBRIC.map((r) => `${r.label} ${r.points}`).join(' · ')}.`);
  lines.push(tableMd(['Page', 'Score', 'Of', 'Lowest checks', 'Not answerable'], e.pages.map((pg) => [pg.path, pg.score, pg.available, pg.checks.filter((c) => c.earned < c.points).sort((a, b) => a.earned / a.points - b.earned / b.points).slice(0, 3).map((c) => `${c.label} (${c.earned}/${c.points})`).join('; ') || 'none', pg.unknown.join(', ') || '–'])), '');
  if (e.claims.length) { h(3, 'Claims on the pages that need a source'); list(e.claims.map((c) => `${c.path}: “${c.phrase}”`)); }

  h(3, 'AI visibility (Ahrefs Brand Radar)');
  if (!v) p('Not read this time: Brand Radar was not available to this run.');
  else if (v.error && !v.business.mentions && !v.citations.length) p(`Not read this time: ${v.error}`);
  else {
    lines.push(tableMd(['Brand', 'Mentions', 'Share of voice'], [[v.business.name, v.business.mentions ?? 'not read', v.business.share_of_voice === null ? 'not read' : `${Math.round(v.business.share_of_voice * 100) / 100}%`], ...v.competitors.map((c) => [c.name, c.mentions ?? 'not read', c.share_of_voice === null ? 'not read' : `${Math.round(c.share_of_voice * 100) / 100}%`])]), '', `Assistants read: ${v.assistants.join(', ')}. ${v.source}.`, '');
    if (v.citations.length) lines.push(tableMd(['Platform', 'Citations of the site', 'Pages cited'], v.citations.map((c) => [c.platform, c.citations, c.pages])), '');
    else p(`Citations of ${site} by the assistants: ${own ? own.citations : 'not read'}.`);
    if (v.prompts.length) lines.push(tableMd(['Question', 'Assistant', 'Monthly searches', 'Names the business', 'Cited sources'], v.prompts.slice(0, 15).map((q) => [q.question, q.assistant, q.volume ?? '–', q.names_business ? 'yes' : 'no', q.cited.slice(0, 4).join(', ') || '–'])), '');
    if (v.cited_domains.length) lines.push(tableMd(['Cited domain', 'Answers citing it', 'Pages'], v.cited_domains.slice(0, 12).map((d) => [d.domain, d.responses, d.pages])), '');
    if (v.error) p(`Partly read: ${v.error}`);
  }

  h(2, 'Improvements this audit supports');
  if (!i.improvements.length) p('Nothing the evidence calls for beyond the weekly checks below.');
  else lines.push(tableMd(['Priority', 'Area', 'Improvement', 'Evidence', 'Action'], i.improvements.map((x) => [x.priority, x.area, x.title, x.evidence, x.action])), '');

  h(2, 'Questions for the owner (answer before any copy changes)');
  lines.push(...i.questions.map((q, n) => `${n + 1}. ${q}`), '');

  h(2, 'Phases');
  h(3, 'Phase 0: recon (read-only; report before changing anything)');
  list([
    'Where content lives: code, CMS, database tables, generated files (sitemap, llms.txt, prerendered HTML), and the automations that rewrite content (crons, AI jobs). Change an automation’s source, never fight it.',
    'What crawlers get: fetch the key pages without JavaScript with curl and with an AI-crawler user agent (GPTBot); report what a non-JavaScript crawler can and cannot see.',
    `Baseline scores: the citability score per page across the live sitemap (this file’s table is the starting point), robots.txt access for ${AI_CRAWLERS.map((c) => c.agent).join(', ')}, llms.txt and llms-full.txt, sitemap accuracy, canonicals, structured-data validity, security headers, Core Web Vitals basics.`,
    'Entity: LocalBusiness or Organization schema with a stable @id, name-address-phone consistency across the site and the profiles, sameAs links, the Google Business Profile, and where ratings come from today (flag anything hard-coded).',
    'AI-visibility baseline from the tools connected (Ahrefs Brand Radar, Search Console); this file carries the audit’s reading.',
    'Save every baseline number to docs/geo/baseline-YYYY-MM-DD.md.',
  ]);
  h(3, 'Phase 1: fact sheet and owner questions (stop and ask)');
  list([
    'Build docs/geo/fact-sheet.md from the sources of truth, citing the file or table behind every fact.',
    'List every contradiction in the live copy: hours, event days and times, prices, capacities, menu items, amenities.',
    'Ask the owner one batched list (start from the questions above): every fact the copy asserts without a source, ownership of each sameAs profile, the review source, and what to do with pages built around a false claim (301 to the nearest true page, or rewrite).',
    'Make no copy changes until the owner answers; record the answers in the fact sheet as "owner-confirmed, date".',
  ]);
  h(3, 'Phase 2: code fixes (one draft PR)');
  list([
    'Schema: one entity graph with a stable @id and the right LocalBusiness subtype; hours from the source of truth; sameAs from owner-confirmed profiles only; AboutPage and ContactPage; BlogPosting author as an Organization for brand bylines; Event schema with the correct UTC offset per date, DST included, with a test that proves it; AggregateRating or Review only from a live snapshot (no snapshot, no rating).',
    'Crawlers: robots.txt allows the AI crawlers unless the owner says otherwise; llms.txt and llms-full.txt generated from the same sources as the pages; the sitemap excludes redirected and disabled URLs; the static HTML carries the core facts for non-JavaScript crawlers.',
    'Reviews, if the owner chooses a source: a weekly job stores a snapshot and the page reads the newest one; it redeploys only when what is shown changes; a failed redeploy fails the run; verbatim five-star text with real author names only.',
    'CSP: report-only, built from the sources observed on the live site; a collector endpoint that aggregates, stores no IPs or user agents, is size-capped and always returns 204.',
    'Redirects: 301 pages that exist only for a false claim to the nearest true page, and remove them from the sitemap and the llms files. Remove wrong or dead profile links.',
    'Gate: tests for every new pure function; typecheck, lint and tests against a HEAD baseline (diff against HEAD, not against zero errors); a fresh-context review of the diff.',
  ]);
  h(3, 'Phase 3: copy (factual rewrites)');
  list([
    'Fix every contradiction from phase 1, in code JSON and in the database.',
    `Rewrite the lowest-scoring pages (this audit’s lowest: ${[...e.pages].sort((a, b) => a.score - b.score).slice(0, 5).map((pg) => `${pg.path} at ${pg.score}`).join(', ') || 'none scored'}): answer-first opening paragraphs, question-style headings, the fact sheet’s specific facts and numbers, self-contained 130–170-word blocks, FAQs that match the visible content.`,
    'Give each rewrite to an independent fact-check with the fact sheet and the rewrite only; fix everything it flags. Re-score and report before and after per page. Never hand-edit fields an automation owns.',
  ]);
  h(3, 'Phase 4: database content changes, safely');
  list([
    'Rollback first: fetch byte-exact originals and write exact-restore SQL outside any auto-applied migrations folder.',
    'Guarded data migrations: each span edit replaces one exact span only while it is still present (strpos > 0); each whole-field rewrite is guarded on the md5 of the original; everything idempotent, with no raise; JSON columns edited as text with JSON-escaped strings, and the result must still parse.',
    'Order whole-field rewrites before span edits when two migrations touch one row.',
    'Before the PR: simulate every migration in order against the snapshot (expect 0 misses); prove the live rows still equal the snapshot with a read-only md5 aggregate; read the current state of every row flipped (status, enabled) so a rollback cannot publish a draft; check the migration version numbers are unused.',
    'After the merge: confirm the migrations were applied and recorded; SELECT for leftover false claims; redeploy once if the build ran before the data landed; curl production for headers, schema, redirects and llms-full.txt.',
  ]);
  h(3, 'Phase 5: weekly follow-up');
  list([
    'Write docs/GEO_WEEKLY_RUNBOOK.md: each week re-score the sitemap, scan for fact drift against the fact sheet, make at most five factual rewrites, review CSP reports and tune the report-only rules, log to docs/geo/weekly-log.md, open a draft PR.',
    'It never merges, never enforces CSP, never touches the off-limits areas, and carries the owner-confirmed facts so it never re-asserts a false claim.',
    'Schedule it as a recurring session; for any connector it lacks (database, Ahrefs, Search Console) the runbook says which steps to skip.',
  ]);
  h(2, 'At the end of each phase, report');
  list(['What changed, with evidence (commands and their output).', '[verified] and [assumed] claims.', 'The rollback.', 'Parked follow-ups.', 'Anything waiting on the owner.']);
  h(2, 'Without a repo (CMS only)');
  list(['Phase 2 becomes theme or plugin settings plus a schema/SEO plugin.', 'Phase 4 becomes CMS edits: export or keep a revision of every page before editing; that is the rollback.', 'Everything else applies as written.']);
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
