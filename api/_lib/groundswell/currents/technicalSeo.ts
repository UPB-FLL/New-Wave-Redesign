/** Evidence from the fetched HTML response. This does not execute JavaScript or measure Google indexing. */
export interface TechnicalSeoFinding {
  code: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  evidence: string;
  recommendation: string;
}

export interface TechnicalSeo {
  scope: 'raw_http';
  limitation: string;
  body_h1_count: number;
  body_word_count: number;
  app_shell: boolean;
  robots: string[];
  x_robots_tag: string | null;
  canonical_url: string | null;
  json_ld: { blocks: number; invalid_blocks: number };
  images: { total: number; missing_alt: number; empty_alt: number };
  findings: TechnicalSeoFinding[];
}

export const RAW_HTTP_LIMITATION =
  'Initial HTML from a raw HTTP fetch; JavaScript was not rendered. Head, comments, scripts, styles, templates and noscript are excluded from body counts. Confirm rendered content and indexing with Search Console; these checks do not measure rankings, robots.txt access, or rich-result eligibility.';

const unique = <T>(values: T[]) => [...new Set(values)];
const decode = (value: string) => value
  .replace(/&#(x[0-9a-f]+|\d+);/gi, (match, number: string) => {
    const code = number[0].toLowerCase() === 'x' ? parseInt(number.slice(1), 16) : Number(number);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
  })
  .replace(/&quot;/gi, '"').replace(/&apos;|&#0?39;/gi, "'")
  .replace(/&nbsp;/gi, ' ').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ').trim();
const text = (value: string) => decode(value.replace(/<[^>]+>/g, ' '));
const withoutComments = (html: string) => html.replace(/<!--[\s\S]*?(?:-->|$)/g, ' ');
const withoutInert = (html: string) => withoutComments(html)
  .replace(/<(script|style|noscript|template)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi, ' ');

/** Quoted values may contain the opposite quote or greater-than signs; unquoted HTML attributes are supported too. */
function tags(html: string, name: string): string[] {
  return html.match(new RegExp(`<${name}\\b(?:[^"'<>]|"[^"]*"|'[^']*')*>`, 'gi')) ?? [];
}

function attributes(tag: string): Record<string, string> {
  const out: Record<string, string> = Object.create(null) as Record<string, string>;
  const rest = tag.replace(/^<\/?[\w:-]+/, '').replace(/\/?\s*>$/, '');
  for (const match of rest.matchAll(/([^\s=<>`"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    const key = match[1].toLowerCase();
    if (!(key in out)) out[key] = decode(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return out;
}

function jsonLd(html: string) {
  const types: string[] = [];
  let blocks = 0;
  let invalid = 0;
  const walk = (value: unknown, depth = 0) => {
    if (depth > 30 || !value || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach(item => walk(item, depth + 1)); return; }
    const object = value as Record<string, unknown>;
    const type = object['@type'];
    types.push(...(Array.isArray(type) ? type : [type]).filter((item): item is string => typeof item === 'string'));
    Object.values(object).forEach(item => walk(item, depth + 1));
  };
  for (const match of withoutComments(html).matchAll(/(<script\b(?:[^"'<>]|"[^"]*"|'[^']*')*>)([\s\S]*?)<\/script\s*>/gi)) {
    if (attributes(match[1]).type?.split(';')[0].trim().toLowerCase() !== 'application/ld+json') continue;
    blocks++;
    try {
      const value: unknown = JSON.parse(match[2]);
      if (!value || typeof value !== 'object') invalid++;
      else walk(value);
    } catch { invalid++; }
  }
  return { types: unique(types), blocks, invalid_blocks: invalid };
}

/** Respect user-agent-scoped headers instead of applying another crawler's instructions to Googlebot. */
function headerNoindex(header: string | null): boolean {
  const parameterDirectives = new Set(['max-snippet', 'max-image-preview', 'max-video-preview', 'unavailable_after']);
  let agent = '';
  for (const part of header?.split(',') ?? []) {
    const prefix = part.trim().match(/^([a-z][a-z_-]*)\s*:\s*(.*)$/i);
    const scoped = prefix && !parameterDirectives.has(prefix[1].toLowerCase()) ? prefix : null;
    if (scoped) agent = scoped[1].toLowerCase();
    const directive = scoped ? scoped[2] : part;
    if ((!agent || agent === 'googlebot') && /(?:^|[\s;])(?:noindex|none)(?:$|[\s;])/i.test(directive.trim())) return true;
  }
  return false;
}

export function inspectTechnicalSeo(html: string, finalUrl: string, status: number, xRobotsTag: string | null = null) {
  const markup = withoutInert(html);
  const rawBody = markup.match(/<body\b[^>]*>([\s\S]*?)(?:<\/body\s*>|$)/i)?.[1]
    ?? markup.replace(/<head\b[^>]*>[\s\S]*?<\/head\s*>/gi, ' ');
  const body = withoutInert(rawBody).replace(/<title\b[^>]*>[\s\S]*?<\/title\s*>/gi, ' ');
  const bodyText = text(body);
  const h1 = [...body.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/gi)]
    .map(match => text(match[1])).filter(Boolean);
  const words = bodyText ? bodyText.split(' ').length : 0;
  const scripts = tags(withoutComments(html), 'script').map(attributes);
  const emptyMount = [...body.matchAll(/<(div|main)\b([^>]*)>\s*<\/\1\s*>/gi)]
    .some(match => /^(root|app|__next|__nuxt)$/i.test(attributes(`<${match[1]} ${match[2]}>`).id ?? ''));
  // This is a rendering-dependency signal, not a minimum word count or an indexing verdict.
  const appShell = emptyMount && !h1.length && words < 40 && scripts.some(script => script.src);
  const meta = tags(markup, 'meta').map(attributes);
  const robots = meta.filter(tag => /^(robots|googlebot)$/i.test(tag.name ?? '')).map(tag => tag.content ?? '');
  const canonicals = tags(markup, 'link').map(attributes)
    .filter(tag => tag.rel?.toLowerCase().split(/\s+/).includes('canonical'));
  const canonicalUrls = canonicals.map(tag => {
    try {
      if (!tag.href) return null;
      const url = new URL(tag.href, finalUrl);
      return /^https?:$/.test(url.protocol) ? url.toString() : null;
    } catch { return null; }
  });
  const structured = jsonLd(html);
  const images = tags(body, 'img').map(attributes);
  const missingAlt = images.filter(image => !('alt' in image)
    && image['aria-hidden'] !== 'true' && !/^(none|presentation)$/i.test(image.role ?? '')
    && !(Number(image.width) === 1 && Number(image.height) === 1));
  const findings: TechnicalSeoFinding[] = [];
  const add = (code: string, severity: TechnicalSeoFinding['severity'], title: string, evidence: string, recommendation: string) =>
    findings.push({ code, severity, title, evidence, recommendation });

  if (status >= 400) {
    add('http_error', 'high', 'The page returned an HTTP error', `The fetched URL returned HTTP ${status}.`,
      'Check the public URL and response status. If the page should be available, fix the response and verify it with Search Console.');
  } else if (status >= 200 && status < 300) {
    if (robots.some(value => /(?:^|[\s,;])(?:noindex|none)(?:$|[\s,;])/i.test(value)) || headerNoindex(xRobotsTag)) {
      add('noindex', 'high', 'A noindex instruction is present',
        `Initial response instructions: ${[...robots, xRobotsTag].filter(Boolean).join(' · ').slice(0, 400)}.`,
        'Confirm whether exclusion is intentional. For a public page intended for search, remove the applicable noindex instruction and verify the live URL in Search Console.');
    }
    if (structured.invalid_blocks) add('invalid_json_ld', 'medium', 'Structured data could not be parsed',
      `${structured.invalid_blocks} of ${structured.blocks} JSON-LD blocks in the initial HTML are invalid JSON or not objects or arrays.`,
      'Repair the JSON-LD syntax and validate the page with the Rich Results Test. Valid JSON alone does not establish rich-result eligibility.');
    if (canonicals.some((_, index) => !canonicalUrls[index] || new URL(canonicalUrls[index]!).hash)) {
      add('invalid_canonical', 'medium', 'A canonical target needs correction',
        `Canonical href values in the initial HTML: ${canonicals.map(tag => tag.href || '(empty)').join(' · ').slice(0, 400)}.`,
        'Use an HTTP or HTTPS canonical URL without a fragment, pointing to the intended preferred page. Verify that target separately.');
    }
    if (canonicals.length > 1) add('multiple_canonicals', 'medium', 'More than one canonical link is present',
      `${canonicals.length} canonical link elements were found in the initial HTML.`,
      'Keep one consistent canonical target. Compare the initial and rendered HTML so JavaScript does not introduce a conflicting target.');
    if (!/<title\b[^>]*>\s*[^<\s][\s\S]*?<\/title\s*>/i.test(markup)) add('missing_title', 'medium', 'The initial HTML has no page title',
      'No non-empty title element was found in the fetched markup.',
      'Give the page a descriptive title and confirm it remains correct after JavaScript renders.');
    if (appShell) add('app_shell', 'medium', 'Main content may depend on JavaScript rendering',
      `An empty app mount and external scripts were found; the initial body contains ${words} words and ${h1.length} main headings.`,
      'Compare the rendered page with this response and use Search Console URL Inspection. If essential copy exists only after JavaScript, consider server rendering or prerendering. This observation does not establish whether Google can index the page.');
    if (!h1.length) add('missing_body_h1', 'low', 'No main heading was found in the initial body',
      'No non-empty h1 was found outside head, comments, scripts, templates and noscript.',
      'Check the rendered page for a clear main heading. If it is absent there too, add one that describes the page; do not treat this raw-response observation as a ranking score.');
    if (!canonicals.length) add('missing_canonical', 'low', 'No canonical link was found in the initial HTML',
      'The fetched markup contains no canonical link element.',
      'Review duplicate URL variants and declare the intended preferred URL when appropriate. A missing canonical does not by itself prevent indexing.');
    if (!meta.some(tag => tag.name?.toLowerCase() === 'description' && tag.content)) add('missing_description', 'low', 'No meta description was found in the initial HTML',
      'No non-empty description meta tag was found in the fetched markup.',
      'Provide a useful page description and verify it in rendered HTML. Search engines may choose a different search snippet.');
    if (missingAlt.length) add('missing_image_alt', 'low', 'Some images have no alt attribute',
      `${missingAlt.length} of ${images.length} image elements lack alt attributes, excluding explicitly hidden images and tiny tracking pixels.`,
      'Describe informative images in context. Use an empty alt attribute for decorative images; an intentionally empty alternative is not an error.');
  }

  const technicalSeo: TechnicalSeo = {
    scope: 'raw_http', limitation: RAW_HTTP_LIMITATION, body_h1_count: h1.length, body_word_count: words,
    app_shell: appShell, robots, x_robots_tag: xRobotsTag, canonical_url: canonicalUrls[0] ?? null,
    json_ld: { blocks: structured.blocks, invalid_blocks: structured.invalid_blocks },
    images: { total: images.length, missing_alt: missingAlt.length, empty_alt: images.filter(image => 'alt' in image && !image.alt).length },
    findings,
  };
  return { technicalSeo, h1, wordCount: words, schemaTypes: structured.types };
}
