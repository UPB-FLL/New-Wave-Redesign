// /llms.txt and /llms-full.txt: the business's facts and its pages as plain
// Markdown, for assistants and crawlers that read text rather than render a
// page (the llmstxt.org shape). The build writes both (vite.config.ts) from
// the sources the pages are built from, so no fact is typed here a second
// time: the entity graph in index.html, the route registry
// (src/lib/routeMeta.ts), the division's page list, the price list read at
// build time, and the page bodies the build has already rendered.
//
// Pure: no React, no DOM, no fs. vite.config.ts imports it at build time.

import { publishedRateFor, usd, type PricedUnit } from './publishedRates.js';

/** The two files, by the names the build writes them under at the root of the site. */
export const LLMS_FILE = 'llms.txt';
export const LLMS_FULL_FILE = 'llms-full.txt';

/**
 * The partners the business names: exactly these three (docs/geo/fact-sheet.md,
 * section 6, owner-confirmed). The schema carries no partner list, so this is
 * the one fact the file keeps for itself.
 */
export const LLMS_PARTNERS = ['Huntress', 'Microsoft', 'Cisco'] as const;

/** One opening-hours entry of the graph: 'Monday'…'Sunday', and 24-hour 'HH:MM' times. */
export interface LlmsHours {
  days: string[];
  opens: string;
  closes: string;
}

/** What the shell's entity graph (index.html) says about the business. */
export interface LlmsBusiness {
  name: string;
  /** The site's address, without a trailing slash. */
  url: string;
  /** The sentence saying what the business is; '' when the graph has none. */
  description: string;
  /** As the graph writes it, e.g. '+15615641846'. */
  telephone: string;
  email: string;
  address: { street: string; locality: string; region: string; postalCode: string };
  /** Office hours. */
  hours: LlmsHours[];
  /** The contact point of type "emergency"; null when the graph has none. */
  emergency: { telephone: string; hours: LlmsHours | null } | null;
  /** The names under areaServed, in the graph's order. */
  areaServed: string[];
  /** Organization.foundingDate; null when the graph has none. */
  foundingDate: string | null;
}

type JsonNode = Record<string, unknown>;

const isNode = (value: unknown): value is JsonNode => typeof value === 'object' && value !== null && !Array.isArray(value);
const listOf = (value: unknown): unknown[] => (Array.isArray(value) ? value : value === undefined || value === null ? [] : [value]);
const textOf = (value: unknown): string => (typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '');

/** Every JSON-LD node in the page: arrays and @graph lists are opened. */
function jsonLdNodes(html: string): JsonNode[] {
  const nodes: JsonNode[] = [];
  const add = (value: unknown) => {
    for (const item of listOf(value)) {
      if (!isNode(item)) continue;
      if (Array.isArray(item['@graph'])) add(item['@graph']);
      else nodes.push(item);
    }
  };
  for (const match of html.matchAll(/<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      add(JSON.parse(match[1]));
    } catch {
      // Not this module's block to judge; a fact it needed is reported as missing below.
    }
  }
  return nodes;
}

function hoursOf(value: unknown): LlmsHours | null {
  if (!isNode(value)) return null;
  // schema.org also allows the day as a URL ("https://schema.org/Monday").
  const days = listOf(value.dayOfWeek).map((day) => textOf(day).replace(/^https?:\/\/schema\.org\//, '')).filter(Boolean);
  const opens = textOf(value.opens);
  const closes = textOf(value.closes);
  return days.length && opens && closes ? { days, opens, closes } : null;
}

/**
 * Reads the business's facts from the entity graph in the shell (index.html).
 * Throws, naming the fact, when one the files state is missing: the build then
 * fails instead of publishing "undefined" as a phone number.
 */
export function businessFromShell(shellHtml: string): LlmsBusiness {
  const nodes = jsonLdNodes(shellHtml);
  const ofType = (type: string) => nodes.find((node) => listOf(node['@type']).includes(type));
  const business = ofType('LocalBusiness');
  if (!business) throw new Error('llms.txt: the shell has no LocalBusiness JSON-LD node to read the facts from.');
  const organization = ofType('Organization');
  const need = (fact: string, value: unknown): string => {
    const text = textOf(value);
    if (!text) throw new Error(`llms.txt: the shell's LocalBusiness node has no ${fact}. Update index.html or src/lib/llmsTxt.ts.`);
    return text;
  };
  const address = isNode(business.address) ? business.address : {};
  const hours = listOf(business.openingHoursSpecification).map(hoursOf).filter((entry): entry is LlmsHours => entry !== null);
  if (!hours.length) need('openingHoursSpecification', '');
  const emergency = listOf(business.contactPoint).filter(isNode).find((point) => textOf(point.contactType).toLowerCase() === 'emergency');
  return {
    name: need('name', business.name),
    url: need('url', business.url).replace(/\/+$/, ''),
    // The Organization's description is written as a sentence about the business; the LocalBusiness one is a tagline.
    description: textOf(organization?.description) || textOf(business.description),
    telephone: need('telephone', business.telephone),
    email: need('email', business.email),
    address: {
      street: need('streetAddress', address.streetAddress),
      locality: need('addressLocality', address.addressLocality),
      region: need('addressRegion', address.addressRegion),
      postalCode: need('postalCode', address.postalCode),
    },
    hours,
    emergency: emergency
      ? { telephone: textOf(emergency.telephone) || need('telephone', business.telephone), hours: listOf(emergency.hoursAvailable).map(hoursOf).find((entry) => entry !== null) ?? null }
      : null,
    areaServed: listOf(business.areaServed).map((area) => (isNode(area) ? textOf(area.name) : textOf(area))).filter(Boolean),
    foundingDate: textOf(organization?.foundingDate) || textOf(business.foundingDate) || null,
  };
}

// --- Wording the facts ---

/** 'a', 'a and b', 'a, b and c'. */
export function listInWords(items: readonly string[]): string {
  if (items.length < 2) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** '+15615641846' as '(561) 564-1846'; a number of another shape is returned as written. */
export function formatPhone(telephone: string): string {
  const digits = telephone.replace(/\D/g, '');
  const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  return national.length === 10 ? `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}` : telephone.trim();
}

const formatAddress = ({ street, locality, region, postalCode }: LlmsBusiness['address']) => `${street}, ${locality}, ${region} ${postalCode}`;

const WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function daysInWords(days: readonly string[]): string {
  const order = [...new Set(days.map((day) => WEEK.indexOf(day)))].sort((a, b) => a - b);
  if (order.includes(-1)) return listInWords(days);
  if (order.length === WEEK.length) return 'every day';
  const run = order.length > 2 && order.every((day, index) => index === 0 || day === order[index - 1] + 1);
  return run ? `${WEEK[order[0]]} to ${WEEK[order[order.length - 1]]}` : listInWords(order.map((day) => WEEK[day]));
}

/** '08:00' as '8am', '18:30' as '6:30pm'. */
function clock(time: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!match) return time;
  const hour = Number(match[1]) % 24;
  return `${hour % 12 || 12}${match[2] === '00' ? '' : `:${match[2]}`}${hour < 12 ? 'am' : 'pm'}`;
}

const aroundTheClock = (hours: LlmsHours) =>
  new Set(hours.days).size === WEEK.length && hours.opens === '00:00' && ['23:59', '24:00', '00:00'].includes(hours.closes);

/** 'Monday to Friday, 8am to 6pm'; '24/7' for every day, all day. */
export function hoursInWords(hours: LlmsHours): string {
  return aroundTheClock(hours) ? '24/7' : `${daysInWords(hours.days)}, ${clock(hours.opens)} to ${clock(hours.closes)}`;
}

// --- Pages and their sections ---

/** One page of the site as the files list it. */
export interface LlmsPage {
  /** Site-relative path, e.g. '/pricing'. */
  path: string;
  title: string;
  description?: string;
  /** Absolute address; the site's address plus `path` when left out. */
  url?: string;
  /** The page's rendered markup, for llms-full.txt. */
  bodyHtml?: string;
}

/** A row of the route registry (prerenderedItRoutes(), or HOME_PAGE_META with its path) as a page, with its rendered body when the build has one. */
export function llmsPage(route: { path: string; meta: { title: string; description?: string; canonical?: string } }, bodyHtml?: string): LlmsPage {
  return { path: route.path, title: route.meta.title, description: route.meta.description, url: route.meta.canonical, bodyHtml };
}

export type LlmsSection = 'services' | 'areas' | 'guides' | 'company' | 'optional';

const SECTION_TITLES: Record<LlmsSection, string> = {
  services: 'Services',
  areas: 'Service areas',
  guides: 'Guides',
  company: 'Company',
  optional: 'Optional',
};

/** The order of the sections; the division's sits before "Optional", which llmstxt.org reads as the part a reader may skip. */
const SECTION_ORDER: readonly LlmsSection[] = ['services', 'areas', 'guides', 'company', 'optional'];

/**
 * Left out of both files: /groundswell is a sign-in page, and /codenest is a
 * separate programme the fact sheet has no confirmation for (section 10).
 */
const OMITTED_PATHS: readonly string[] = ['/groundswell', '/codenest'];
const COMPANY_PATHS: readonly string[] = ['/about', '/why-us', '/pricing', '/contact', '/support', '/blog'];
const LEGAL_PATHS: readonly string[] = ['/privacy-policy', '/terms-and-conditions', '/cookie-policy'];
/** Optional reading: the provider status links, then the legal pages. */
const OPTIONAL_PATHS: readonly string[] = ['/status', ...LEGAL_PATHS];
/** The services overview and the threat centre; every /service-category/ page joins them. */
const SERVICE_PATHS: readonly string[] = ['/services', '/cybersecurity'];
const SERVICE_CATEGORY_PREFIX = '/service-category/';
const GUIDE_PREFIX = '/l/';

const slugOf = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** The places the graph names: the office's city, then each area served. */
export function placesOf(business: LlmsBusiness): string[] {
  return [...new Set([business.address.locality, ...business.areaServed])];
}

/** The words of a slug before the first place it names ('' when it opens with one); null when it names none. */
function servicePart(slug: string, placeSlugs: readonly string[]): string | null {
  const starts = placeSlugs.map((place) => `-${slug}-`.indexOf(`-${place}-`)).filter((at) => at >= 0);
  return starts.length ? slug.slice(0, Math.min(...starts)).replace(/-$/, '') : null;
}

/**
 * Which section of llms.txt each static route belongs to; a route left out of
 * the files has no entry. In order:
 *
 * 1. /groundswell and /codenest are left out.
 * 2. /services, /cybersecurity and every /service-category/ page: Services.
 * 3. /l/ pages: Guides.
 * 4. /status and the legal pages: Optional.
 * 5. About, why us, pricing, contact, support and the blog: Company.
 * 6. Any other one-segment route is a local landing page (Service areas) when
 *    its path names a place: it holds, as whole words, a place from `places`
 *    (the graph's office city and areas served; a county also without
 *    "County"), as /managed-it-services-miami does. A route that starts with
 *    the service part of such a page is its sibling for another place, so
 *    /managed-it-services-west-palm-beach is local beside
 *    /managed-it-services-fort-lauderdale even before the graph lists the city.
 * 7. Whatever is left names no place: Company.
 */
export function llmsSectionsFor(paths: readonly string[], places: readonly string[]): Map<string, LlmsSection> {
  const sections = new Map<string, LlmsSection>();
  const candidates: string[] = [];
  for (const path of paths) {
    if (OMITTED_PATHS.includes(path)) continue;
    if (SERVICE_PATHS.includes(path) || path.startsWith(SERVICE_CATEGORY_PREFIX)) sections.set(path, 'services');
    else if (path.startsWith(GUIDE_PREFIX)) sections.set(path, 'guides');
    else if (OPTIONAL_PATHS.includes(path)) sections.set(path, 'optional');
    else if (COMPANY_PATHS.includes(path)) sections.set(path, 'company');
    else if (/^\/[^/]+$/.test(path)) candidates.push(path);
    else sections.set(path, 'company');
  }
  const placeSlugs = [...new Set(places.flatMap((place) => [slugOf(place), slugOf(place).replace(/-county$/, '')]))].filter(Boolean);
  const serviceParts = new Set(candidates.map((path) => servicePart(path.slice(1), placeSlugs)).filter((part): part is string => Boolean(part)));
  for (const path of candidates) {
    const slug = path.slice(1);
    const local = servicePart(slug, placeSlugs) !== null || [...serviceParts].some((part) => slug.startsWith(`${part}-`));
    sections.set(path, local ? 'areas' : 'company');
  }
  return sections;
}

/** Where a page sits inside its section; pages of one rank keep the registry's order. */
function rankIn(section: LlmsSection, path: string): number {
  if (section === 'services') return path === '/services' ? 0 : path.startsWith(SERVICE_CATEGORY_PREFIX) ? 1 : 2;
  const fixed = section === 'company' ? COMPANY_PATHS : section === 'optional' ? OPTIONAL_PATHS : [];
  const at = fixed.indexOf(path);
  return at < 0 ? fixed.length : at;
}

/** Everything the two files are built from. */
export interface LlmsSources {
  business: LlmsBusiness;
  /** Every static New Wave IT route but the homepage, in the registry's order. */
  routes: readonly LlmsPage[];
  /** The homepage; llms-full.txt opens its pages with it. */
  home?: LlmsPage;
  /** The division, by its own name, and its pages with their own titles and descriptions. */
  division?: { name: string; pages: readonly LlmsPage[] };
  /** The price list read at build time (cost_per_unit in cents); the rates are left out without it. */
  priceUnits?: readonly PricedUnit[] | null;
}

const urlOf = (page: LlmsPage, business: LlmsBusiness) => page.url ?? `${business.url}${page.path}`;

function pagesBySection({ business, routes }: LlmsSources): Map<LlmsSection, LlmsPage[]> {
  const sections = llmsSectionsFor(routes.map((route) => route.path), placesOf(business));
  const grouped = new Map<LlmsSection, LlmsPage[]>();
  for (const section of SECTION_ORDER) {
    const pages = routes.filter((route) => sections.get(route.path) === section);
    // Array.prototype.sort is stable: equal ranks stay in the registry's order.
    grouped.set(section, [...pages].sort((a, b) => rankIn(section, a.path) - rankIn(section, b.path)));
  }
  return grouped;
}

/** '# name', the summary as a block quote, and the key facts: the head of both files. */
function fileHeader({ business, routes, priceUnits }: LlmsSources): string {
  const summary = [
    business.description && (/[.!?]$/.test(business.description) ? business.description : `${business.description}.`),
    `Its office is at ${formatAddress(business.address)}.`,
    business.areaServed.length ? `It serves ${listInWords(business.areaServed)}.` : '',
  ].filter(Boolean);
  const facts = [
    `Website: ${business.url}`,
    `Address: ${formatAddress(business.address)}`,
    `Phone: ${formatPhone(business.telephone)}`,
    `Email: ${business.email}`,
    `Office hours: ${business.hours.map(hoursInWords).join('; ')}`,
  ];
  if (business.emergency) {
    const availability = business.emergency.hours ? `, ${hoursInWords(business.emergency.hours)}` : '';
    facts.push(`Emergency line: ${formatPhone(business.emergency.telephone)}${availability}`);
  }
  if (business.foundingDate) facts.push(`Founded: ${business.foundingDate}`);
  facts.push(`Partners: ${listInWords(LLMS_PARTNERS)}`);
  const lines = facts.map((fact) => `- ${fact}`);
  if (priceUnits?.length) {
    const pricing = routes.find((route) => route.path === '/pricing');
    const source = pricing ? `the [published price list](${urlOf(pricing, business)})` : 'the published price list';
    lines.push(`- Monthly rates from ${source}, each for one unit:`);
    for (const unit of priceUnits) {
      const per = publishedRateFor(unit.name)?.per;
      lines.push(`  - ${unit.name.trim()}: ${usd(Number(unit.cost_per_unit) / 100)}${per ? ` per ${per}` : ''}`);
    }
  }
  return [`# ${business.name}`, `> ${summary.join(' ')}`, 'Key facts:', lines.join('\n')].join('\n\n');
}

// A "]" in a title would end the link text early.
const linkText = (title: string) => title.replace(/[[\]]/g, '\\$&');

const linkLine = (page: LlmsPage, business: LlmsBusiness) =>
  `- [${linkText(page.title)}](${urlOf(page, business)})${page.description ? `: ${page.description}` : ''}`;

/**
 * llms.txt: the header, then one section of links per kind of page. A
 * division page's title and description go in exactly as the division wrote
 * them: the division works nationally, so nothing local is added beside them.
 */
export function buildLlmsTxt(sources: LlmsSources): string {
  const { business, division } = sources;
  const grouped = pagesBySection(sources);
  const section = (title: string, pages: readonly LlmsPage[]) =>
    pages.length ? [`## ${title}\n\n${pages.map((page) => linkLine(page, business)).join('\n')}`] : [];
  const parts = [
    fileHeader(sources),
    ...SECTION_ORDER.filter((key) => key !== 'optional').flatMap((key) => section(SECTION_TITLES[key], grouped.get(key) ?? [])),
    ...(division ? section(division.name, division.pages) : []),
    ...section(SECTION_TITLES.optional, grouped.get('optional') ?? []),
  ];
  return `${parts.join('\n\n')}\n`;
}

/** Markdown level of a page's own top heading in llms-full.txt: one below the page's "##" heading. */
const PAGE_HEADING_LEVEL = 3;

/**
 * llms-full.txt: the header, then one "## title" block per page with its
 * address and its text. The homepage and each static page llms.txt lists
 * carry the text of their rendered body, except:
 *
 * - the legal pages, which are left out;
 * - the guides, which carry their description only. They are general
 *   industry guidance with figures the fact sheet has no source for (section
 *   10), and this file is read as what the business says about itself;
 * - the division's pages, whose bodies the build does not render: their own
 *   description, unchanged.
 */
export function buildLlmsFullTxt(sources: LlmsSources): string {
  const { business, home, division } = sources;
  const grouped = pagesBySection(sources);
  const block = (page: LlmsPage, withBody: boolean) => {
    const text = (withBody && page.bodyHtml ? htmlToText(page.bodyHtml, { headingLevel: PAGE_HEADING_LEVEL }) : '') || page.description || '';
    return [`## ${page.title}`, `URL: ${urlOf(page, business)}`, text].filter(Boolean).join('\n\n');
  };
  const parts = [fileHeader(sources)];
  if (home) parts.push(block(home, true));
  for (const key of SECTION_ORDER) {
    for (const page of grouped.get(key) ?? []) {
      if (LEGAL_PATHS.includes(page.path)) continue;
      parts.push(block(page, key !== 'guides'));
    }
  }
  for (const page of division?.pages ?? []) parts.push(block(page, false));
  return `${parts.join('\n\n')}\n`;
}

// --- HTML to text ---

type HtmlElement = {
  tag: string;
  attrs: Record<string, string>;
  children: HtmlNode[];
  /** Line breaks in its text are shown as written (white-space: pre-line and the like), here or on an ancestor. */
  keepsBreaks: boolean;
};
type HtmlNode = HtmlElement | string;

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
/** Elements whose content is not markup: skipped to their closing tag. */
const RAW_TEXT_TAGS = new Set(['script', 'style']);
/** Site chrome, controls and media: nothing inside them is the page's copy. */
const DROPPED_TAGS = new Set([
  'nav', 'footer', 'form', 'svg', 'script', 'style', 'noscript', 'template', 'iframe', 'video', 'audio', 'canvas', 'object', 'input', 'select',
  'textarea', 'dialog', 'hr',
]);
const INLINE_TAGS = new Set([
  'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'button', 'cite', 'code', 'data', 'del', 'dfn', 'em', 'i', 'img', 'ins', 'kbd', 'label', 'mark', 'q', 's',
  'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr',
]);
const HEADING = /^h([1-6])$/;
/** Blocks whose links are content, not a row of actions: a list item or a cell that is one link keeps it. */
const KEEPS_LINKS = new Set(['li', 'td', 'th', 'dt', 'dd', 'caption', 'summary', 'figcaption']);

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  copy: '©', reg: '®', trade: '™', middot: '·', bull: '•', times: '×',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (whole, body: string) => {
    if (body[0] !== '#') return ENTITIES[body] ?? ENTITIES[body.toLowerCase()] ?? whole;
    const code = /^#x/i.test(body) ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
  });
}

/** The attributes of a start tag by lower-case name, entities decoded; one written without a value is ''. */
function parseAttributes(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const match of source.matchAll(/([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    attrs[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attrs;
}

/** A <pre>, a white-space style, or one of Tailwind's whitespace-pre classes (the address block uses whitespace-pre-line). */
const keepsBreaks = (tag: string, attrs: Record<string, string>) =>
  tag === 'pre' || /white-space:\s*pre/i.test(attrs.style ?? '') || /(?:^|\s)whitespace-pre(?:-line|-wrap)?(?:\s|$)/.test(attrs.class ?? '');

/** A light tree of the markup: enough structure to tell a heading from a list item, nothing more. */
function parseHtml(html: string): HtmlElement {
  const root: HtmlElement = { tag: '#root', attrs: {}, children: [], keepsBreaks: false };
  const open = [root];
  const token = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  let last = 0;
  for (let match = token.exec(html); match; match = token.exec(html)) {
    const parent = open[open.length - 1];
    if (match.index > last) parent.children.push(html.slice(last, match.index));
    last = token.lastIndex;
    if (match[1]) {
      // A closing tag closes its nearest open element; one that matches nothing is ignored.
      const at = open.map((element) => element.tag).lastIndexOf(match[1].toLowerCase());
      if (at > 0) open.length = at;
    } else if (match[2]) {
      const tag = match[2].toLowerCase();
      const attrs = parseAttributes(match[3]);
      const element: HtmlElement = { tag, attrs, children: [], keepsBreaks: parent.keepsBreaks || keepsBreaks(tag, attrs) };
      parent.children.push(element);
      if (RAW_TEXT_TAGS.has(element.tag)) {
        const close = new RegExp(`</${element.tag}\\s*>`, 'gi');
        close.lastIndex = last;
        last = token.lastIndex = close.exec(html) ? close.lastIndex : html.length;
      } else if (!VOID_TAGS.has(element.tag) && !/\/\s*$/.test(match[3])) {
        open.push(element);
      }
    }
  }
  if (last < html.length) open[open.length - 1].children.push(html.slice(last));
  return root;
}

const hasHeading = (element: HtmlElement): boolean =>
  element.children.some((child) => typeof child !== 'string' && (HEADING.test(child.tag) || hasHeading(child)));

function isDropped(element: HtmlElement): boolean {
  if (DROPPED_TAGS.has(element.tag)) return true;
  // The hidden attribute, not a class of that name: a class may hide an element at one screen width only.
  if (element.attrs['aria-hidden'] === 'true' || element.attrs.hidden !== undefined) return true;
  // A header without a heading is the site's bar, not a page's opening.
  return element.tag === 'header' && !hasHeading(element);
}

/** Inline by tag, unless it wraps a block (a card that is one link around a heading and a paragraph). */
const isInline = (node: HtmlNode): boolean =>
  typeof node === 'string' || isDropped(node) || (INLINE_TAGS.has(node.tag) && node.children.every(isInline));

/**
 * Whether a link is a way to move on rather than a statement: a link to
 * another page of the site (or one without an address), and a phone or email
 * link whose text is a label ("Call us now") instead of the number or the
 * address. A link out of the site is the name of what it points at.
 */
function isAction(link: HtmlElement, text: string): boolean {
  const target = (link.attrs.href ?? '').trim();
  if (/^tel:/i.test(target)) return !/\d{3}/.test(text);
  if (/^mailto:/i.test(target)) return !text.includes('@');
  return target === '' || target.startsWith('#') || (target.startsWith('/') && !target.startsWith('//'));
}

type Piece = { kind: 'text' | 'link' | 'action' | 'button' | 'gap'; text: string };

function inlinePieces(nodes: readonly HtmlNode[], breaksKept: boolean, pieces: Piece[] = []): Piece[] {
  let afterElement = false;
  for (const node of nodes) {
    if (typeof node === 'string') {
      // A line break in the source is only a space, unless the element shows it; a <br> always breaks.
      pieces.push({ kind: 'text', text: decodeEntities(node).replace(breaksKept ? /[^\S\n]+/g : /\s+/g, ' ') });
      afterElement = false;
      continue;
    }
    // Two elements side by side (a label and its value in two spans) are separate words.
    if (afterElement) pieces.push({ kind: 'gap', text: ' ' });
    afterElement = true;
    if (isDropped(node)) continue;
    if (node.tag === 'br') pieces.push({ kind: 'text', text: '\n' });
    // An image says what its alt text says (a logo's name); a decorative one has none.
    else if (node.tag === 'img') pieces.push({ kind: 'text', text: node.attrs.alt ?? '' });
    else if (node.tag === 'a' || node.tag === 'button') {
      const text = inlinePieces(node.children, node.keepsBreaks).map((piece) => piece.text).join('');
      pieces.push({ kind: node.tag === 'button' ? 'button' : isAction(node, text) ? 'action' : 'link', text });
    } else inlinePieces(node.children, node.keepsBreaks, pieces);
  }
  return pieces;
}

/** Collapses the whitespace of one paragraph; a <br> stays a line break. */
const tidy = (text: string) =>
  text.split('\n').map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');

/**
 * The text of a run of inline nodes inside `container`. A heading keeps
 * everything in it. Elsewhere a button is a control and is dropped, and a run
 * that is nothing but links and buttons (a row of calls to action) drops its
 * action links too: a phone number, an email address or a link out of the
 * site is information and stays.
 */
function runText(nodes: readonly HtmlNode[], container: HtmlElement): string {
  const pieces = inlinePieces(nodes, container.keepsBreaks);
  if (HEADING.test(container.tag)) return tidy(pieces.map((piece) => piece.text).join(''));
  const ownWords = pieces.some((piece) => piece.kind === 'text' && piece.text.trim());
  const kept = pieces.filter((piece) => piece.kind !== 'button' && (piece.kind !== 'action' || ownWords || KEEPS_LINKS.has(container.tag)));
  return tidy(kept.map((piece) => piece.text).join(''));
}

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'item'; depth: number; text: string }
  | { kind: 'row'; text: string };

const oneLine = (text: string) => text.replace(/\s*\n\s*/g, ' ');

/** The text of a list item or a cell on one line: a heading inside it leads into what follows. */
function flatText(blocks: readonly Block[]): string {
  return blocks
    .map((block, index) => (block.kind === 'heading' && index < blocks.length - 1 && /[\p{L}\p{N})]$/u.test(block.text) ? `${block.text}:` : block.text))
    .map(oneLine)
    .join(' ');
}

/** The blocks inside `container`: each run of inline content is a paragraph, each block child is rendered in turn. */
function renderChildren(container: HtmlElement, depth: number, out: Block[]): void {
  let run: HtmlNode[] = [];
  const flush = () => {
    const text = runText(run, container);
    if (text) out.push({ kind: 'paragraph', text });
    run = [];
  };
  for (const node of container.children) {
    if (typeof node === 'string' || isInline(node)) run.push(node);
    else {
      flush();
      renderElement(node, depth, out);
    }
  }
  flush();
}

function renderElement(element: HtmlElement, depth: number, out: Block[]): void {
  const heading = HEADING.exec(element.tag);
  if (heading) {
    const text = oneLine(runText(element.children, element));
    if (text) out.push({ kind: 'heading', level: Number(heading[1]), text });
  } else if (element.tag === 'li') {
    const inner: Block[] = [];
    renderChildren(element, depth + 1, inner);
    const text = flatText(inner.filter((block) => block.kind !== 'item'));
    if (text) out.push({ kind: 'item', depth, text });
    out.push(...inner.filter((block) => block.kind === 'item'));
  } else if (element.tag === 'tr') {
    const cells = element.children
      .filter((child): child is HtmlElement => typeof child !== 'string' && (child.tag === 'td' || child.tag === 'th'))
      .map((cell) => {
        const inner: Block[] = [];
        renderChildren(cell, depth, inner);
        return flatText(inner);
      });
    if (cells.some(Boolean)) out.push({ kind: 'row', text: cells.join(' | ') });
  } else {
    renderChildren(element, depth, out);
  }
}

/** A heading with nothing under it (its links and buttons were dropped) says nothing: it goes too. */
function withoutEmptyHeadings(blocks: readonly Block[]): Block[] {
  const kept: Block[] = [];
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const block = blocks[index];
    const next = kept[0];
    if (block.kind === 'heading' && (!next || (next.kind === 'heading' && next.level <= block.level))) continue;
    kept.unshift(block);
  }
  return kept;
}

export interface HtmlToTextOptions {
  /** The Markdown level an <h1> gets; an <h2> gets the next, and so on down to level 6. Default 1. */
  headingLevel?: number;
}

/**
 * The readable text of rendered page markup, as Markdown-flavoured plain text:
 *
 * - a heading becomes a "#" heading, `headingLevel` deep for an <h1>;
 * - a list item becomes a "- " line (a nested one is indented);
 * - a table row becomes its cells joined by " | ";
 * - a link keeps its text and an image is its alt text; everything else is
 *   text, one paragraph per block;
 * - nav, footer, form, a header without a heading, buttons, rows of
 *   calls to action, svg, script, video and hidden elements are dropped;
 * - entities are decoded and whitespace is collapsed.
 */
export function htmlToText(html: string, { headingLevel = 1 }: HtmlToTextOptions = {}): string {
  const blocks: Block[] = [];
  renderChildren(parseHtml(html), 0, blocks);
  let text = '';
  let previous: Block | undefined;
  for (const block of withoutEmptyHeadings(blocks)) {
    const line =
      block.kind === 'heading'
        ? `${'#'.repeat(Math.min(6, Math.max(1, headingLevel + block.level - 1)))} ${block.text}`
        : block.kind === 'item'
          ? `${'  '.repeat(block.depth)}- ${block.text}`
          : block.text;
    // List items and table rows sit on consecutive lines; everything else is a paragraph apart.
    const tight = previous?.kind === block.kind && (block.kind === 'item' || block.kind === 'row');
    text += `${previous ? (tight ? '\n' : '\n\n') : ''}${line}`;
    previous = block;
  }
  return text;
}
